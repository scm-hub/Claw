import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../prisma.js';
import { getKingdeeAdapter } from '../services/kingdee-adapter.js';
import {
  pullCustomersFromKingdee,
  pullSuppliersFromKingdee,
  pullMaterialsFromKingdee,
  pushDepartmentsToKingdee,
  pushEmployeesToKingdee,
  updateKingdeeSyncTime,
} from '../services/kingdee-sync.js';

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
  const status = result.failed > 0 ? 'PARTIAL' : 'SUCCESS';
  await prisma.syncLog.update({
    where: { id: logId },
    data: {
      status,
      totalRecords: totalRecords || result.total,
      successCount: (result.created || 0) + (result.updated || 0),
      failedCount: result.failed || 0,
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
    const result = await pullCustomersFromKingdee();
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
 * POST /api/kingdee/pull-suppliers — 从金蝶拉取供应商
 */
router.post('/pull-suppliers', authenticate, async (req, res) => {
  const log = await createSyncLog('KINGDEE_PULL', 'SUPPLIER');
  try {
    const result = await pullSuppliersFromKingdee();
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
 * POST /api/kingdee/pull-materials — 从金蝶拉取物料
 */
router.post('/pull-materials', authenticate, async (req, res) => {
  const log = await createSyncLog('KINGDEE_PULL', 'MATERIAL');
  try {
    const result = await pullMaterialsFromKingdee();
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
 * POST /api/kingdee/pull-all — 从金蝶拉取全部基础资料
 */
router.post('/pull-all', authenticate, async (req, res) => {
  const log = await createSyncLog('KINGDEE_PULL', 'ALL');
  const results = {};

  try {
    results.customers = await pullCustomersFromKingdee();
    results.suppliers = await pullSuppliersFromKingdee();
    results.materials = await pullMaterialsFromKingdee();

    const totalRecords =
      (results.customers.total || 0) +
      (results.suppliers.total || 0) +
      (results.materials.total || 0);
    const successCount =
      results.customers.created +
      results.customers.updated +
      (results.suppliers.created + results.suppliers.updated) +
      (results.materials.created + results.materials.updated);
    const failedCount =
      (results.customers.failed || 0) +
      (results.suppliers.failed || 0) +
      (results.materials.failed || 0);

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

    await updateKingdeeSyncTime();
    res.json({ success: true, data: results, logId: log.id });
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', details: err.message, finishedAt: new Date() },
    });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// 推送（MDM → 金蝶）
// ========================

/**
 * POST /api/kingdee/push-departments — 推送部门到金蝶
 */
router.post('/push-departments', authenticate, async (req, res) => {
  const log = await createSyncLog('KINGDEE_PUSH', 'DEPARTMENT');
  try {
    const result = await pushDepartmentsToKingdee();
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
 */
router.post('/push-all', authenticate, async (req, res) => {
  const log = await createSyncLog('KINGDEE_PUSH', 'ALL');
  try {
    const deptResult = await pushDepartmentsToKingdee();
    const empResult = await pushEmployeesToKingdee();

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
    const { entityType, page = 1, pageSize = 20, keyword = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where = {};
    if (entityType) where.entityType = entityType;
    if (keyword) {
      where.OR = [{ name: { contains: keyword } }, { code: { contains: keyword } }];
    }

    const [records, total] = await Promise.all([
      prisma.kingdeeMasterData.findMany({
        where,
        skip,
        take,
        orderBy: { lastSyncAt: 'desc' },
      }),
      prisma.kingdeeMasterData.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        records: records.map((r) => ({
          ...r,
          extra: r.extra ? JSON.parse(r.extra) : {},
        })),
        total,
        page: parseInt(page),
        pageSize: take,
      },
    });
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
