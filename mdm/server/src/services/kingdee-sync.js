/**
 * 金蝶云星空数据同步服务
 *
 * 功能：
 *   1. 从金蝶拉取客户、供应商、物料到 MDM 主数据
 *   2. 【已禁用】推送 MDM 中的部门、员工到金蝶
 *   3. 记录同步日志和数据映射
 *
 * 注意：根据业务要求，只从金蝶拉取数据，不推送数据到金蝶
 */
import prisma from '../prisma.js';
import { getKingdeeAdapter } from './kingdee-adapter.js';

const SYSTEM_CODE = 'KINGDEE';

// ========================
// 拉取：金蝶 → MDM
// ========================

/**
 * 从金蝶拉取客户数据到 MDM
 */
export async function pullCustomersFromKingdee() {
  const adapter = getKingdeeAdapter();
  const lastSync = await getLastSyncTime('customer');

  let result;
  try {
    result = await adapter.pullCustomers(lastSync);
  } catch (err) {
    throw new Error(`拉取金蝶客户数据失败: ${err.message}`);
  }

  let created = 0,
    updated = 0,
    failed = 0;
  const details = [];

  for (const record of result.records) {
    try {
      const code = record.FNumber || record.code || '';
      const existing = await prisma.kingdeeMasterData.findFirst({
        where: { code, entityType: 'customer' },
      });

      const data = {
        entityType: 'customer',
        kingdeeId: code,
        code,
        name: record.FName || record.name || '',
        extra: JSON.stringify({
          shortName: record.FShortName || '',
          currency: record.FTRADINGCURRID || '',
        }),
        lastSyncAt: new Date(),
      };

      if (existing) {
        await prisma.kingdeeMasterData.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.kingdeeMasterData.create({ data });
        created++;
      }
    } catch (err) {
      failed++;
      details.push({ record: record.FName || record.name, error: err.message });
    }
  }

  return { entityType: 'customer', total: result.total, created, updated, failed, details };
}

/**
 * 从金蝶拉取供应商数据到 MDM
 */
export async function pullSuppliersFromKingdee() {
  const adapter = getKingdeeAdapter();
  const lastSync = await getLastSyncTime('supplier');

  let result;
  try {
    result = await adapter.pullSuppliers(lastSync);
  } catch (err) {
    throw new Error(`拉取金蝶供应商数据失败: ${err.message}`);
  }

  let created = 0,
    updated = 0,
    failed = 0;
  const details = [];

  for (const record of result.records) {
    try {
      const code = record.FNumber || record.code || '';
      const existing = await prisma.kingdeeMasterData.findFirst({
        where: { code, entityType: 'supplier' },
      });

      const data = {
        entityType: 'supplier',
        kingdeeId: code,
        code,
        name: record.FName || record.name || '',
        extra: JSON.stringify({
          shortName: record.FShortName || '',
        }),
        lastSyncAt: new Date(),
      };

      if (existing) {
        await prisma.kingdeeMasterData.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.kingdeeMasterData.create({ data });
        created++;
      }
    } catch (err) {
      failed++;
      details.push({ record: record.FName || record.name, error: err.message });
    }
  }

  return { entityType: 'supplier', total: result.total, created, updated, failed, details };
}

/**
 * 从金蝶拉取物料/产品数据到 MDM
 */
export async function pullMaterialsFromKingdee() {
  const adapter = getKingdeeAdapter();
  const lastSync = await getLastSyncTime('material');

  let result;
  try {
    result = await adapter.pullMaterials(lastSync);
  } catch (err) {
    throw new Error(`拉取金蝶物料数据失败: ${err.message}`);
  }

  let created = 0,
    updated = 0,
    failed = 0;
  const details = [];

  for (const record of result.records) {
    try {
      const code = record.FNumber || record.code || '';
      const existing = await prisma.kingdeeMasterData.findFirst({
        where: { code, entityType: 'material' },
      });

      const data = {
        entityType: 'material',
        kingdeeId: code,
        code,
        name: record.FName || record.name || '',
        extra: JSON.stringify({
          spec: record.FSpecification || '',
          baseUnit: record.FBaseUnitId || '',
          purchaseUnit: record.FPurchaseUnitId || '',
          salesUnit: record.FSaleUnitId || '',
          materialGroup: record.FMaterialGroup || '',
          auxProperty: record.FAuxPropertyId || '',
        }),
        lastSyncAt: new Date(),
      };

      if (existing) {
        await prisma.kingdeeMasterData.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.kingdeeMasterData.create({ data });
        created++;
      }
    } catch (err) {
      failed++;
      details.push({ record: record.FName || record.name, error: err.message });
    }
  }

  return { entityType: 'material', total: result.total, created, updated, failed, details };
}

// ========================
// 推送：MDM → 金蝶
// ========================

/**
 * 推送部门数据到金蝶
 */
export async function pushDepartmentsToKingdee() {
  const adapter = getKingdeeAdapter();
  const departments = await prisma.masterDepartment.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { sortOrder: 'asc' },
  });

  const results = await adapter.pushDepartments(departments);
  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;

  // 更新数据映射
  for (const r of results) {
    if (r.success) {
      const dept = departments.find((d) => d.name === r.dept);
      if (dept) {
        await prisma.dataMapping.upsert({
          where: {
            entityType_systemCode_masterId: {
              entityType: 'department',
              masterId: dept.id,
              systemCode: SYSTEM_CODE,
            },
          },
          create: {
            entityType: 'department',
            masterId: dept.id,
            systemCode: SYSTEM_CODE,
            systemEntityId: r.result,
            syncStatus: 'SYNCED',
            lastSyncAt: new Date(),
          },
          update: {
            systemEntityId: r.result,
            syncStatus: 'SYNCED',
            lastSyncAt: new Date(),
          },
        });
      }
    }
  }

  return {
    entityType: 'department',
    total: results.length,
    successCount,
    failedCount,
    details: results,
  };
}

/**
 * 推送员工数据到金蝶
 */
export async function pushEmployeesToKingdee() {
  const adapter = getKingdeeAdapter();
  const employees = await prisma.masterEmployee.findMany({
    where: { status: 'ACTIVE' },
  });

  const results = await adapter.pushEmployees(employees);
  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;

  // 更新数据映射
  for (const r of results) {
    if (r.success) {
      const emp = employees.find((e) => e.employeeNo === r.empNo);
      if (emp) {
        await prisma.dataMapping.upsert({
          where: {
            entityType_systemCode_masterId: {
              entityType: 'employee',
              masterId: emp.id,
              systemCode: SYSTEM_CODE,
            },
          },
          create: {
            entityType: 'employee',
            masterId: emp.id,
            systemCode: SYSTEM_CODE,
            systemEntityId: r.result,
            syncStatus: 'SYNCED',
            lastSyncAt: new Date(),
          },
          update: {
            systemEntityId: r.result,
            syncStatus: 'SYNCED',
            lastSyncAt: new Date(),
          },
        });
      }
    }
  }

  return {
    entityType: 'employee',
    total: results.length,
    successCount,
    failedCount,
    details: results,
  };
}

// ========================
// 工具方法
// ========================

async function getLastSyncTime(entityType) {
  const log = await prisma.syncLog.findFirst({
    where: {
      syncType: { startsWith: 'KINGDEE_PULL' },
      entityType: entityType.toUpperCase(),
      status: 'SUCCESS',
    },
    orderBy: { finishedAt: 'desc' },
  });
  return log?.finishedAt?.toISOString() || null;
}

/**
 * 获取金蝶同步配置
 */
export async function getKingdeeConfig() {
  return prisma.syncConfig.findUnique({ where: { systemCode: SYSTEM_CODE } });
}

/**
 * 更新金蝶同步时间
 */
export async function updateKingdeeSyncTime() {
  return prisma.syncConfig.upsert({
    where: { systemCode: SYSTEM_CODE },
    create: {
      systemCode: SYSTEM_CODE,
      systemName: '金蝶云星空',
      autoSync: true,
      syncInterval: 86400, // 24小时
      lastSyncAt: new Date(),
    },
    update: {
      lastSyncAt: new Date(),
    },
  });
}
