import { Router } from 'express';
import mysql from 'mysql2/promise';
import { authenticate } from '../middleware/auth.js';
import prisma from '../prisma.js';
import { getKingdeeAdapter } from '../services/kingdee-adapter.js';

// 创建一个原生 MySQL 连接用于 JSON 字段搜索
const mysqlConn = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'Scm@2025!',
  database: (process.env.DATABASE_URL || '').match(/\/([^/?]+)(?:\?|$)/)?.[1] || 'mdm_db',
  timezone: '+00:00',
  connectionLimit: 5,
});

/**
 * 通过原生 SQL 搜索金蝶主数据（按 entityType + 关键字 + 组织过滤）
 * 解决 Prisma take 限制漏掉高编码记录的问题
 * @param {string} entityType - material | customer | supplier
 * @param {string} keyword - 搜索关键字（模糊匹配 name/code）
 * @param {string} orgCode - 组织编号，逗号分隔支持多组织（如 "20001,30001"）
 * @param {number} limit - 最大返回数
 * @returns {Promise<Array>}
 */
async function searchBySql(entityType, keyword, orgCode, limit = 200) {
  const params = [entityType];
  let where = 'entity_type = ?';
  if (keyword) {
    where += ' AND (name LIKE ? OR code LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (orgCode) {
    // useOrgNumber 可能是逗号分隔的多组织，需用 FIND_IN_SET 或 LIKE IN
    const orgCodes = orgCode.split(',').map(s => s.trim()).filter(Boolean);
    if (orgCodes.length === 1) {
      // 单组织：精确匹配（考虑逗号分隔多组织场景，如 "30001,10001"）
      where += " AND (JSON_UNQUOTE(JSON_EXTRACT(extra, '$.useOrgNumber')) = ? OR JSON_UNQUOTE(JSON_EXTRACT(extra, '$.useOrgNumber')) LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(extra, '$.useOrgNumber')) LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(extra, '$.useOrgNumber')) LIKE ?)";
      params.push(orgCodes[0], `${orgCodes[0]},%`, `%,${orgCodes[0]},%`, `%,${orgCodes[0]}`);
    } else {
      const placeholders = orgCodes.map(() => '?').join(',');
      where += ` AND (JSON_UNQUOTE(JSON_EXTRACT(extra, '$.useOrgNumber')) IN (${placeholders}) OR JSON_UNQUOTE(JSON_EXTRACT(extra, '$.useOrgNumber')) LIKE ?)`;
      params.push(...orgCodes, '%' + orgCodes[0] + '%'); // 简化处理多组织
    }
  }
  const sql = `SELECT code, name, extra FROM kingdee_master_data WHERE ${where} ORDER BY code ASC LIMIT ${parseInt(limit) || 200}`;
  const [rows] = await mysqlConn.query(sql, params);
  return rows.map(r => {
    const extra = r.extra ? (typeof r.extra === 'string' ? JSON.parse(r.extra) : r.extra) : {};
    return { code: r.code, name: r.name, extra };
  });
}
import {
  pullCustomersFromKingdee,
  pullSuppliersFromKingdee,
  pullMaterialsFromKingdee,
  pullWarehousesFromKingdee,
  pullReceiveSendTypesFromKingdee,
  pullMaterialGradesFromKingdee,
  pushDepartmentsToKingdee,
  pushEmployeesToKingdee,
  updateKingdeeSyncTime,
} from '../services/kingdee-sync.js';
import {
  createTask,
  startTask,
  updateTask,
  finishTask,
  failTask,
  getTask,
  getTasks,
} from '../services/sync-task-manager.js';

const router = Router();

// ========================
// 连接测试
// ========================

/**
 * POST /api/kingdee/test-connection — 测试金蝶连接
 */
router.post('/test-connection', authenticate, async (req, res) => {
  try {
    const adapter = getKingdeeAdapter();
    const result = await adapter.testConnection();
    res.json({ success: result.success, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// 拉取（金蝶 → MDM）
// ========================

async function createSyncLog(syncType, entityType) {
  return prisma.syncLog.create({
    data: {
      syncType,
      entityType,
      status: 'RUNNING',
    },
  });
}

async function finishSyncLog(logId, result, totalRecords) {
  const status = (result.failedCount || result.failed || 0) > 0 ? 'PARTIAL' : 'SUCCESS';
  await prisma.syncLog.update({
    where: { id: logId },
    data: {
      status,
      totalRecords: totalRecords || result.total || 0,
      successCount: result.successCount ?? (result.created || 0) + (result.updated || 0),
      failedCount: result.failedCount || result.failed || 0,
      details: JSON.stringify(result),
      finishedAt: new Date(),
    },
  });
}

/**
 * POST /api/kingdee/pull-customers — 从金蝶拉取客户
 */
router.post('/pull-customers', authenticate, async (req, res) => {
  const log = await createSyncLog('KINGDEE_PULL', 'CUSTOMER');
  try {
    const forceFull = req.query.full === 'true';
    const result = await pullCustomersFromKingdee(forceFull);
    await finishSyncLog(log.id, result);
    if (!forceFull) await updateKingdeeSyncTime();
    res.json({ success: true, data: result, logId: log.id, fullSync: forceFull });
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', details: err.message, finishedAt: new Date() },
    });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/kingdee/pull-suppliers — 从金蝶拉取供应商
 */
router.post('/pull-suppliers', authenticate, async (req, res) => {
  const log = await createSyncLog('KINGDEE_PULL', 'SUPPLIER');
  try {
    const forceFull = req.query.full === 'true';
    const result = await pullSuppliersFromKingdee(forceFull);
    await finishSyncLog(log.id, result);
    if (!forceFull) await updateKingdeeSyncTime();
    res.json({ success: true, data: result, logId: log.id, fullSync: forceFull });
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', details: err.message, finishedAt: new Date() },
    });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/kingdee/pull-materials — 从金蝶拉取物料
 */
router.post('/pull-materials', authenticate, async (req, res) => {
  const log = await createSyncLog('KINGDEE_PULL', 'MATERIAL');
  try {
    const forceFull = req.query.full === 'true';
    const result = await pullMaterialsFromKingdee(forceFull);
    await finishSyncLog(log.id, result);
    if (!forceFull) await updateKingdeeSyncTime();
    res.json({ success: true, data: result, logId: log.id, fullSync: forceFull });
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', details: err.message, finishedAt: new Date() },
    });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/kingdee/pull-warehouses — 从金蝶拉取仓库
 */
router.post('/pull-warehouses', authenticate, async (req, res) => {
  const log = await createSyncLog('KINGDEE_PULL', 'WAREHOUSE');
  try {
    const forceFull = req.query.full === 'true';
    const { pullWarehousesFromKingdee } = await import('../services/kingdee-sync.js');
    const result = await pullWarehousesFromKingdee(forceFull);
    await finishSyncLog(log.id, result);
    if (!forceFull) await updateKingdeeSyncTime();
    res.json({ success: true, data: result, logId: log.id, fullSync: forceFull });
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', details: err.message, finishedAt: new Date() },
    });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/kingdee/pull-all — 从金蝶拉取全部基础资料
 */
router.post('/pull-all', authenticate, async (req, res) => {
  const log = await createSyncLog('KINGDEE_PULL', 'ALL');
  const results = {};
  const forceFull = req.query.full === 'true';

  try {
    results.customers = await pullCustomersFromKingdee(forceFull);
    results.suppliers = await pullSuppliersFromKingdee(forceFull);
    results.materials = await pullMaterialsFromKingdee(forceFull);
    results.warehouses = await pullWarehousesFromKingdee(forceFull);
    results.receiveSendTypes = await pullReceiveSendTypesFromKingdee(forceFull);

    const totalRecords =
      (results.customers.total || 0) +
      (results.suppliers.total || 0) +
      (results.materials.total || 0) +
      (results.warehouses.total || 0) +
      (results.receiveSendTypes.total || 0);
    const successCount =
      results.customers.created +
      results.customers.updated +
      (results.suppliers.created + results.suppliers.updated) +
      (results.materials.created + results.materials.updated) +
      (results.warehouses.created + results.warehouses.updated) +
      (results.receiveSendTypes.created + results.receiveSendTypes.updated);
    const failedCount =
      (results.customers.failed || 0) +
      (results.suppliers.failed || 0) +
      (results.materials.failed || 0) +
      (results.warehouses.failed || 0) +
      (results.receiveSendTypes.failed || 0);

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: failedCount > 0 ? 'PARTIAL' : 'SUCCESS',
        totalRecords,
        successCount,
        failedCount,
        details: JSON.stringify(results),
        finishedAt: new Date(),
      },
    });

    if (!forceFull) await updateKingdeeSyncTime();
    res.json({ success: true, data: results, logId: log.id, fullSync: forceFull });
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', details: err.message, finishedAt: new Date() },
    });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// 异步全量同步任务
// ========================

async function runAsyncPullTask(taskId, entityType, forceFull) {
  await startTask(taskId);
  try {
    let result;

    if (entityType === 'all') {
      const customers = await pullCustomersFromKingdee(forceFull);
      const suppliers = await pullSuppliersFromKingdee(forceFull);
      const materials = await pullMaterialsFromKingdee(forceFull);
      const warehouses = await pullWarehousesFromKingdee(forceFull);
      const receiveSendTypes = await pullReceiveSendTypesFromKingdee(forceFull);
      result = { customers, suppliers, materials, warehouses, receiveSendTypes };

      const totalRecords =
        (customers.total || 0) + (suppliers.total || 0) + (materials.total || 0) +
        (warehouses.total || 0) + (receiveSendTypes.total || 0);
      const successCount =
        (customers.created + customers.updated) +
        (suppliers.created + suppliers.updated) +
        (materials.created + materials.updated) +
        (warehouses.created + warehouses.updated) +
        (receiveSendTypes.created + receiveSendTypes.updated);
      const failedCount =
        (customers.failed || 0) + (suppliers.failed || 0) + (materials.failed || 0) +
        (warehouses.failed || 0) + (receiveSendTypes.failed || 0);

      await prisma.syncLog.update({
        where: { id: taskId },
        data: {
          status: failedCount > 0 ? 'PARTIAL' : 'SUCCESS',
          totalRecords,
          successCount,
          failedCount,
          details: JSON.stringify(result),
          finishedAt: new Date(),
        },
      });
    } else if (entityType === 'customer') {
      result = await pullCustomersFromKingdee(forceFull);
      await finishSyncLog(taskId, result);
    } else if (entityType === 'supplier') {
      result = await pullSuppliersFromKingdee(forceFull);
      await finishSyncLog(taskId, result);
    } else if (entityType === 'material') {
      result = await pullMaterialsFromKingdee(forceFull);
      await finishSyncLog(taskId, result);
    } else if (entityType === 'warehouse') {
      result = await pullWarehousesFromKingdee(forceFull);
      await finishSyncLog(taskId, result);
    } else if (entityType === 'receiveSendType') {
      result = await pullReceiveSendTypesFromKingdee(forceFull);
      await finishSyncLog(taskId, result);
    } else if (entityType === 'materialGrade') {
      result = await pullMaterialGradesFromKingdee(forceFull);
      await finishSyncLog(taskId, result);
    } else {
      throw new Error('未知实体类型');
    }

    await updateTask(taskId, {
      total: result.total || 0,
      created: result.created || 0,
      updated: result.updated || 0,
      failed: result.failed || 0,
      processed: (result.created || 0) + (result.updated || 0) + (result.failed || 0),
    });

    await finishTask(taskId, result, result.failed > 0 ? 'PARTIAL' : 'SUCCESS');
    if (!forceFull) await updateKingdeeSyncTime();
  } catch (err) {
    await failTask(taskId, err);
  }
}

/**
 * POST /api/kingdee/sync-tasks — 启动异步金蝶拉取任务
 * Body: { entityType: 'customer'|'supplier'|'material'|'all', full?: boolean }
 */
router.post('/sync-tasks', authenticate, async (req, res) => {
  try {
    const { entityType, full } = req.body;
    const validTypes = ['customer', 'supplier', 'material', 'warehouse', 'receiveSendType', 'materialGrade', 'all'];
    if (!validTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'entityType 必须是 customer/supplier/material/warehouse/all 之一',
      });
    }
    const task = await createTask('KINGDEE_PULL', entityType);
    runAsyncPullTask(task.id, entityType, full === true);
    res.json({ success: true, data: { taskId: task.id, status: task.status } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/kingdee/sync-tasks/:taskId — 查询异步任务状态
 */
router.get('/sync-tasks/:taskId', authenticate, async (req, res) => {
  try {
    const task = await getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/kingdee/sync-tasks — 查询最近异步任务列表
 */
router.get('/sync-tasks', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await getTasks() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// 推送（MDM → 金蝶）
// ========================

/**
 * POST /api/kingdee/push-departments — 推送部门到金蝶
 * Query: ?force=true 清除已有映射，强制全量重新推送
 */
router.post('/push-departments', authenticate, async (req, res) => {
  const log = await createSyncLog('KINGDEE_PUSH', 'DEPARTMENT');
  const force = req.query.force === 'true';
  try {
    const result = await pushDepartmentsToKingdee(force);
    await finishSyncLog(log.id, result);
    await updateKingdeeSyncTime();
    res.json({ success: true, data: result, logId: log.id });
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', details: err.message, finishedAt: new Date() },
    });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/kingdee/push-employees — 推送员工到金蝶
 */
router.post('/push-employees', authenticate, async (req, res) => {
  const log = await createSyncLog('KINGDEE_PUSH', 'EMPLOYEE');
  try {
    const result = await pushEmployeesToKingdee();
    await finishSyncLog(log.id, result);
    await updateKingdeeSyncTime();
    res.json({ success: true, data: result, logId: log.id });
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', details: err.message, finishedAt: new Date() },
    });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/kingdee/push-all — 推送全部到金蝶
 * Query: ?force=true 清除已有映射，强制全量重新推送
 */
router.post('/push-all', authenticate, async (req, res) => {
  const log = await createSyncLog('KINGDEE_PUSH', 'ALL');
  const force = req.query.force === 'true';
  try {
    const deptResult = await pushDepartmentsToKingdee(force);
    // 将部门推送结果中的映射传给员工推送（部门→金蝶编码）
    const empResult = await pushEmployeesToKingdee(deptResult.deptFNumberMap || null);

    const totalRecords = deptResult.total + empResult.total;
    const successCount = deptResult.successCount + empResult.successCount;
    const failedCount = deptResult.failedCount + empResult.failedCount;

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: failedCount > 0 ? 'PARTIAL' : 'SUCCESS',
        totalRecords,
        successCount,
        failedCount,
        details: JSON.stringify({ departments: deptResult, employees: empResult }),
        finishedAt: new Date(),
      },
    });

    await updateKingdeeSyncTime();
    res.json({
      success: true,
      data: { departments: deptResult, employees: empResult },
      logId: log.id,
    });
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', details: err.message, finishedAt: new Date() },
    });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// 查询接口
// ========================

/**
 * GET /api/kingdee/data — 查询金蝶主数据
 * Query: entityType=customer|supplier|material, page, pageSize, keyword
 */
router.get('/data', authenticate, async (req, res) => {
  try {
    const { entityType, page = 1, pageSize = 20, keyword = '', orgName = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);
    const trimmedKeyword = (keyword || '').trim();

    const where = {};
    if (entityType) where.entityType = entityType;
    if (trimmedKeyword) {
      where.OR = [
        { name: { contains: trimmedKeyword } },
        { code: { contains: trimmedKeyword } },
      ];
    }

    // 组织筛选：用原始 SQL 查询 extra JSON 中的 useOrgName
    // 因为 Prisma 无法直接对 TEXT/JSON 字段做 contains 查询
    let orgFilter = '';
    if (orgName) {
      orgFilter = ` AND JSON_EXTRACT(extra, '$.useOrgName') = '${orgName.replace(/'/g, "''")}'`;
    }

    const countSql = `SELECT COUNT(*) as cnt FROM kingdee_master_data WHERE entity_type = ?${trimmedKeyword ? " AND (name LIKE ? OR code LIKE ?)" : ''}${orgFilter}`;
    const countParams = [entityType];
    if (trimmedKeyword) {
      countParams.push(`%${trimmedKeyword}%`, `%${trimmedKeyword}%`);
    }

    // 直接用 mysql2 做带 JSON 过滤的查询
    // 从 DATABASE_URL 解析库名，避免硬编码
    const mdmDb = (process.env.DATABASE_URL || '').match(/\/([^/?]+)(?:\?|$)/)?.[1] || 'mdm_db';
    const conn = await mysql.createConnection({
      host: 'localhost', port: 3306, user: 'root', password: 'Scm@2025!', database: mdmDb,
      timezone: '+00:00',
    });
    const [countRows] = await conn.query(countSql, countParams);
    const total = countRows[0].cnt;

    const selectSql = `SELECT * FROM kingdee_master_data WHERE entity_type = ?${trimmedKeyword ? " AND (name LIKE ? OR code LIKE ?)" : ''}${orgFilter} ORDER BY code ASC LIMIT ? OFFSET ?`;
    const selectParams = [entityType];
    if (trimmedKeyword) {
      selectParams.push(`%${trimmedKeyword}%`, `%${trimmedKeyword}%`);
    }
    selectParams.push(take, skip);
    const [rows] = await conn.query(selectSql, selectParams);
    await conn.end();

    const records = rows.map((r) => ({
      id: r.id,
      entityType: r.entity_type || r.entityType,
      kingdeeId: r.kingdee_id || r.kingdeeId,
      code: r.code,
      name: r.name,
      extra: typeof r.extra === 'string' ? JSON.parse(r.extra) : (r.extra || {}),
      lastSyncAt: r.last_sync_at || r.lastSyncAt || null,
      createdAt: r.created_at || r.createdAt || null,
      updatedAt: r.updated_at || r.updatedAt || null,
    }));

    res.json({
      success: true,
      data: { records, total, page: parseInt(page), pageSize: take },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/kingdee/search-materials — 金蝶物料快速搜索（供 SCM 产品名称下拉）
 * Query: keyword (编码/名称), limit (默认50)
 * 返回：扁平列表 { code, name, spec, baseUnit, baseUnitName, purchaseUnit, purchaseUnitName, salesUnit, salesUnitName, storeUnit, storeUnitName, materialGroup, materialGroupName }
 */
router.get('/search-materials', async (req, res) => {
  try {
    const { keyword = '', limit = 50, orgCode = '' } = req.query;
    const rows = await searchBySql('material', keyword, orgCode, Math.min(parseInt(limit) || 200, 50000));
    const items = rows.map(({ code, name, extra }) => ({
      code,
      name,
      spec: extra.spec || '',
      baseUnit: extra.baseUnit || '',
      baseUnitName: extra.baseUnitName || '',
      purchaseUnit: extra.purchaseUnit || '',
      purchaseUnitName: extra.purchaseUnitName || '',
      salesUnit: extra.salesUnit || '',
      salesUnitName: extra.salesUnitName || '',
      storeUnit: extra.storeUnit || '',
      storeUnitName: extra.storeUnitName || '',
      materialGroup: extra.materialGroup || '',
      materialGroupName: extra.materialGroupName || '',
      grades: extra.grades || [],
    }));
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/kingdee/search-customers — 金蝶客户快速搜索（供 SCM 客户名称下拉）
 * Query: keyword (编码/名称), limit (默认50)
 * 返回：{ code, name, shortName, currency }
 */
router.get('/search-customers', async (req, res) => {
  try {
    const { keyword = '', limit = 50, orgCode = '' } = req.query;
    const rows = await searchBySql('customer', keyword, orgCode, Math.min(parseInt(limit) || 200, 500));
    const items = rows.map(({ code, name, extra }) => ({
      code,
      name,
      shortName: extra.shortName || '',
      currency: extra.currency || null,
    }));
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/kingdee/search-suppliers — 金蝶供应商快速搜索（供 SCM 供应商名称下拉）
 * Query: keyword (编码/名称), limit (默认50)
 * 返回：{ code, name }
 */
router.get('/search-suppliers', async (req, res) => {
  try {
    const { keyword = '', limit = 50, orgCode = '' } = req.query;
    const rows = await searchBySql('supplier', keyword, orgCode, Math.min(parseInt(limit) || 200, 500));
    const items = rows.map(({ code, name }) => ({ code, name }));
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/kingdee/search-warehouses — 金蝶仓库快速搜索（供 SCM 仓库名称下拉）
 * Query: keyword (编码/名称), limit (默认50)
 * 返回：{ code, name, address, groupName, useOrgName }
 */
router.get('/search-warehouses', async (req, res) => {
  try {
    const { keyword = '', limit = 50, orgCode = '' } = req.query;
    const records = await searchBySql('warehouse', keyword || '', orgCode, limit);
    const items = records.map((r) => ({
      code: r.code,
      name: r.name,
      address: r.extra.address || '',
      groupName: r.extra.groupName || '',
      useOrgName: r.extra.useOrgName || '',
    }));
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/kingdee/pull-receive-send-types — 从金蝶拉取收发类别
 */
router.post('/pull-receive-send-types', authenticate, async (req, res) => {
  const log = await createSyncLog('KINGDEE_PULL', 'RECEIVE_SEND_TYPE');
  try {
    const forceFull = req.query.full === 'true';
    const { pullReceiveSendTypesFromKingdee } = await import('../services/kingdee-sync.js');
    const result = await pullReceiveSendTypesFromKingdee(forceFull);
    await finishSyncLog(log.id, result);
    if (!forceFull) await updateKingdeeSyncTime();
    res.json({ success: true, data: result });
  } catch (err) {
    await finishSyncLog(log.id, { failed: 1, error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/kingdee/pull-material-grades — 拉取金蝶物料等级
 */
router.post('/pull-material-grades', authenticate, async (req, res) => {
  const log = await createSyncLog('KINGDEE_PULL', 'MATERIAL_GRADE');
  try {
    const forceFull = req.query.full === 'true';
    const result = await pullMaterialGradesFromKingdee(forceFull);
    await finishSyncLog(log.id, result);
    if (!forceFull) await updateKingdeeSyncTime();
    res.json({ success: true, data: result });
  } catch (err) {
    await finishSyncLog(log.id, { failed: 1, error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/kingdee/search-receive-send-types — 金蝶收发类别搜索
 * Query: keyword (编码/名称), limit (默认50)
 */
router.get('/search-receive-send-types', async (req, res) => {
  try {
    const { keyword = '', limit = 50 } = req.query;
    const where = { entityType: 'receiveSendType' };
    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { name: { contains: keyword } },
        { extra: { contains: keyword } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.kingdeeMasterData.findMany({ where, take: parseInt(limit), orderBy: { code: 'asc' } }),
      prisma.kingdeeMasterData.count({ where }),
    ]);
    const parsed = items.map((r) => {
      let extra = {};
      try { extra = JSON.parse(r.extra || '{}'); } catch {}
      return {
        code: r.code,
        name: r.name,
        ftypeName: extra.ftypeName || '',
        useOrgName: extra.useOrgName || '',
        extra,
      };
    });
    res.json({ success: true, data: { total, items: parsed } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/kingdee/organizations — 获取金蝶数据中所有不重复的组织（供筛选下拉）
 * Query: entityType
 */
router.get('/organizations', authenticate, async (req, res) => {
  try {
    const { entityType } = req.query;
    const where = entityType ? `WHERE entity_type = '${entityType.replace(/'/g, "''")}'` : '';

    const mdmDb = (process.env.DATABASE_URL || '').match(/\/([^/?]+)(?:\?|$)/)?.[1] || 'mdm_db';
    const conn = await mysql.createConnection({
      host: 'localhost', port: 3306, user: 'root', password: 'Scm@2025!', database: mdmDb,
      timezone: '+00:00',
    });
    const sql = `SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(extra, '$.useOrgName')) as orgName FROM kingdee_master_data ${where} ORDER BY orgName`;
    const [rows] = await conn.query(sql);
    await conn.end();

    const orgs = rows.map(r => r.orgName).filter(Boolean);
    res.json({ success: true, data: orgs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/kingdee/status — 金蝶同步状态
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const [config, lastLog, dataCounts] = await Promise.all([
      prisma.syncConfig.findUnique({ where: { systemCode: 'KINGDEE' } }),
      prisma.syncLog.findFirst({
        where: { syncType: { startsWith: 'KINGDEE' } },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.kingdeeMasterData.groupBy({
        by: ['entityType'],
        _count: { id: true },
      }),
    ]);

    const counts = {};
    for (const item of dataCounts) {
      counts[item.entityType] = item._count.id;
    }

    res.json({
      success: true,
      data: {
        config,
        lastSync: lastLog,
        counts,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
