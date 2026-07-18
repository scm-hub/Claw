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
export async function pullCustomersFromKingdee(forceFull = false) {
  const adapter = getKingdeeAdapter();
  const lastSync = forceFull ? null : await getLastSyncTime('customer');

  let result;
  try {
    result = await adapter.pullCustomers(lastSync);
  } catch (err) {
    throw new Error(`拉取金蝶客户数据失败: ${err.message}`);
  }

  let created = 0,
    updated = 0,
    failed = 0,
    cleaned = 0;
  const details = [];
  const pulledCodes = new Set();

  for (const record of result.records) {
    try {
      const code = record.FNumber || record.code || '';
      pulledCodes.add(code);
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
          currency: record['FTRADINGCURRID.FName'] || '',
          useOrgNumber: record['FUseOrgId.FNumber'] || '',
          useOrgName: record['FUseOrgId.FName'] || '',
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

  if (forceFull) {
    const cleanWhere = { entityType: 'customer' };
    if (pulledCodes.size > 0) cleanWhere.code = { notIn: Array.from(pulledCodes) };
    const toDelete = await prisma.kingdeeMasterData.findMany({
      where: cleanWhere, select: { id: true },
    });
    if (toDelete.length > 0) {
      await prisma.kingdeeMasterData.deleteMany({
        where: { id: { in: toDelete.map(r => r.id) } },
      });
      cleaned = toDelete.length;
    }
  }

  return { entityType: 'customer', total: result.total, created, updated, failed, cleaned, details };
}

/**
 * 从金蝶拉取供应商数据到 MDM
 */
export async function pullSuppliersFromKingdee(forceFull = false) {
  const adapter = getKingdeeAdapter();
  const lastSync = forceFull ? null : await getLastSyncTime('supplier');

  let result;
  try {
    result = await adapter.pullSuppliers(lastSync);
  } catch (err) {
    throw new Error(`拉取金蝶供应商数据失败: ${err.message}`);
  }

  let created = 0,
    updated = 0,
    failed = 0,
    cleaned = 0;
  const details = [];
  const pulledCodes = new Set();

  for (const record of result.records) {
    try {
      const code = record.FNumber || record.code || '';
      pulledCodes.add(code);
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
          useOrgNumber: record['FUseOrgId.FNumber'] || '',
          useOrgName: record['FUseOrgId.FName'] || '',
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

  if (forceFull) {
    const cleanWhere = { entityType: 'supplier' };
    if (pulledCodes.size > 0) cleanWhere.code = { notIn: Array.from(pulledCodes) };
    const toDelete = await prisma.kingdeeMasterData.findMany({
      where: cleanWhere, select: { id: true },
    });
    if (toDelete.length > 0) {
      await prisma.kingdeeMasterData.deleteMany({
        where: { id: { in: toDelete.map(r => r.id) } },
      });
      cleaned = toDelete.length;
    }
  }

  return { entityType: 'supplier', total: result.total, created, updated, failed, cleaned, details };
}

/**
 * 从金蝶拉取物料/产品数据到 MDM
 */
export async function pullMaterialsFromKingdee(forceFull = false) {
  const adapter = getKingdeeAdapter();
  const lastSync = forceFull ? null : await getLastSyncTime('material');

  let result;
  try {
    result = await adapter.pullMaterialsWithGrades(lastSync);
  } catch (err) {
    throw new Error(`拉取金蝶物料数据失败: ${err.message}`);
  }

  let created = 0,
    updated = 0,
    failed = 0,
    cleaned = 0;
  const details = [];
  const pulledCodes = new Set();

  for (const record of result.records) {
    try {
      const code = record.FNumber || record.code || '';
      pulledCodes.add(code);
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
          baseUnitName: record['FBaseUnitId.FName'] || '',
          purchaseUnit: record.FPurchaseUnitId || '',
          purchaseUnitName: record['FPurchaseUnitId.FName'] || '',
          salesUnit: record.FSaleUnitId || '',
          salesUnitName: record['FSaleUnitId.FName'] || '',
          storeUnit: record.FStoreUnitID || '',
          storeUnitName: record['FStoreUnitID.FName'] || '',
          materialGroup: record.FMaterialGroup || '',
          materialGroupName: record['FMaterialGroup.FName'] || '',
          auxProperty: record.FAuxPropertyId || '',
          auxPropertyName: record['FAuxPropertyId.FName'] || '',
          useOrgNumber: record['FUseOrgId.FNumber'] || '',
          useOrgName: record['FUseOrgId.FName'] || '',
          grades: record.grades || [],
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

  if (forceFull) {
    const cleanWhere = { entityType: 'material' };
    if (pulledCodes.size > 0) cleanWhere.code = { notIn: Array.from(pulledCodes) };
    const toDelete = await prisma.kingdeeMasterData.findMany({
      where: cleanWhere, select: { id: true },
    });
    if (toDelete.length > 0) {
      await prisma.kingdeeMasterData.deleteMany({
        where: { id: { in: toDelete.map(r => r.id) } },
      });
      cleaned = toDelete.length;
    }
  }

  return { entityType: 'material', total: result.total, created, updated, failed, cleaned, details };
}

/**
 * 从金蝶拉取仓库数据到 MDM
 */
export async function pullWarehousesFromKingdee(forceFull = false) {
  const adapter = getKingdeeAdapter();
  const lastSync = forceFull ? null : await getLastSyncTime('warehouse');

  let result;
  try {
    result = await adapter.pullWarehouses(lastSync);
  } catch (err) {
    throw new Error(`拉取金蝶仓库数据失败: ${err.message}`);
  }

  let created = 0,
    updated = 0,
    failed = 0,
    cleaned = 0;
  const details = [];
  const pulledCodes = new Set();

  for (const record of result.records) {
    try {
      const code = record.FNumber || record.code || '';
      pulledCodes.add(code);
      const existing = await prisma.kingdeeMasterData.findFirst({
        where: { code, entityType: 'warehouse' },
      });

      const data = {
        entityType: 'warehouse',
        kingdeeId: code,
        code,
        name: record.FName || record.name || '',
        extra: JSON.stringify({
          description: record.FDescription || '',
          groupNumber: record.FGroupNumber || '',
          groupName: record.FGroupName || '',
          address: record.FAddress || '',
          stockPropertyCode: record.FStockProperty || '',
          stockProperty: { '1': '普通仓库', '2': '其他' }[record.FStockProperty] || record.FStockProperty || '',
          tel: record.FTel || '',
          useOrgNumber: record['FUseOrgId.FNumber'] || '',
          useOrgName: record['FUseOrgId.FName'] || '',
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

  // 全量拉取后清理金蝶已删除的数据
  if (forceFull) {
    const cleanWhere = { entityType: 'warehouse' };
    if (pulledCodes.size > 0) cleanWhere.code = { notIn: Array.from(pulledCodes) };
    const toDelete = await prisma.kingdeeMasterData.findMany({
      where: cleanWhere, select: { id: true },
    });
    if (toDelete.length > 0) {
      await prisma.kingdeeMasterData.deleteMany({
        where: { id: { in: toDelete.map(r => r.id) } },
      });
      cleaned = toDelete.length;
    }
  }

  return { entityType: 'warehouse', total: result.total, created, updated, failed, cleaned, details };
}

/**
 * 从金蝶拉取收发类别数据
 */
export async function pullReceiveSendTypesFromKingdee(forceFull = false) {
  const adapter = getKingdeeAdapter();
  const lastSync = forceFull ? null : await getLastSyncTime('receiveSendType');

  let result;
  try {
    result = await adapter.pullReceiveSendTypes(lastSync);
  } catch (err) {
    throw new Error(`拉取金蝶收发类别数据失败: ${err.message}`);
  }

  let created = 0,
    updated = 0,
    failed = 0;
  const details = [];

  const typeMap = { '1': '收', '2': '发' };

  for (const record of result.records) {
    try {
      const code = record.FNumber || record.code || '';
      const existing = await prisma.kingdeeMasterData.findFirst({
        where: { code, entityType: 'receiveSendType' },
      });

      const data = {
        entityType: 'receiveSendType',
        kingdeeId: code,
        code,
        name: record.FName || record.name || '',
        extra: JSON.stringify({
          description: record.FDescription || '',
          ftype: record.FType || '',
          ftypeName: typeMap[record.FType] || record.FType || '',
          useOrgNumber: record.orgNumbers || '',
          useOrgName: record.orgNames || '',
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

  return { entityType: 'receiveSendType', total: result.total, created, updated, failed, details };
}

/**
 * 从金蝶拉取物料等级（辅助资料 BOS_ASSISTANTDATA_DETAIL，FID='DJ'）
 */
export async function pullMaterialGradesFromKingdee(forceFull = false) {
  console.log('[Kingdee Sync] 拉取物料等级...');
  const adapter = getKingdeeAdapter();
  const result = await adapter.pullMaterialGrades();
  const entityType = 'materialGrade';

  let created = 0;
  let updated = 0;
  let failed = 0;
  const details = [];

  for (const record of result.records) {
    try {
      const code = record.FNumber;
      const name = record.FName || '';
      const existing = await prisma.kingdeeMasterData.findFirst({
        where: { entityType, code },
      });

      const data = {
        entityType,
        kingdeeId: code,
        code,
        name,
        extra: JSON.stringify({}),
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
      details.push({ record: record.FName, error: err.message });
    }
  }

  return { entityType, total: result.total, created, updated, failed, details };
}

// ========================
// 推送：MDM → 金蝶
// ========================

/**
 * 推送部门数据到金蝶
 * 策略：仅以编码为准，不尝试名称匹配
 *   1. 从 DataMapping 加载已推送过的部门映射
 *   2. 无映射的部门 → 生成新编码推送到金蝶
 *   3. 失败即失败，不做名称冲突恢复
 */
export async function pushDepartmentsToKingdee(force = false) {
  const adapter = getKingdeeAdapter();
  const allDepartments = await prisma.masterDepartment.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { sortOrder: 'asc' },
  });

  // force 模式下清除所有已有映射
  if (force) {
    await prisma.dataMapping.deleteMany({
      where: { entityType: 'department', systemCode: SYSTEM_CODE },
    });
  }

  // 从 DataMapping 加载已有映射（仅信任我们自己推送过的）
  const existingMappings = await prisma.dataMapping.findMany({
    where: { entityType: 'department', systemCode: SYSTEM_CODE },
  });
  const deptFNumberMap = {};
  for (const m of existingMappings) {
    const dept = allDepartments.find((d) => d.id === m.masterId);
    if (dept) deptFNumberMap[dept.hrmsId] = m.systemEntityId;
  }

  // 找出需要新建的部门（无 DataMapping 的）
  const newDepts = allDepartments.filter((d) => !deptFNumberMap[d.hrmsId]);
  let results = [];

  if (newDepts.length > 0) {
    // 按层级排序
    const roots = newDepts.filter((d) => !d.parentId);
    const children = newDepts.filter((d) => d.parentId);
    const sorted = [...roots, ...children];
    results = await adapter.pushDepartments(sorted, deptFNumberMap);

    // 新建成功的记录到映射
    for (const r of results) {
      if (r.success) deptFNumberMap[r.hrmsId] = r.fNumber;
    }
  }

  // 为所有已映射的部门保存 DataMapping（成功的）
  const allResults = [];
  for (const dept of allDepartments) {
    const kdNumber = deptFNumberMap[dept.hrmsId];
    if (!kdNumber) {
      // 查找是否在 results 中有失败记录
      const failedResult = results.find((r) => r.hrmsId === dept.hrmsId && !r.success);
      if (failedResult) {
        allResults.push(failedResult);
      }
      continue;
    }
    await prisma.dataMapping.upsert({
      where: {
        entityType_masterId_systemCode: {
          entityType: 'department', masterId: dept.id, systemCode: SYSTEM_CODE,
        },
      },
      create: {
        entityType: 'department', masterId: dept.id, systemCode: SYSTEM_CODE,
        systemEntityId: kdNumber, syncStatus: 'SYNCED', lastSyncAt: new Date(),
      },
      update: {
        systemEntityId: kdNumber, syncStatus: 'SYNCED', lastSyncAt: new Date(),
      },
    });
    allResults.push({ dept: dept.name, hrmsId: dept.hrmsId, fNumber: kdNumber, success: true, result: kdNumber });
  }
  const failedCount = allResults.filter((r) => !r.success).length;

  return {
    entityType: 'department',
    total: allDepartments.length,
    successCount: allDepartments.length - failedCount,
    failedCount,
    details: allResults,
    deptFNumberMap,
  };
}


/**
 * 推送员工数据到金蝶
 * 需要先推送部门，确保 deptFNumberMap 可用
 * 策略：查询金蝶已有员工，按 FStaffNumber 匹配，存在则跳过并记录映射
 */
export async function pushEmployeesToKingdee(deptFNumberMap = null) {
  const adapter = getKingdeeAdapter();

  // 如果没有传入映射，从 DataMapping 构建
  if (!deptFNumberMap) {
    deptFNumberMap = {};
    const allDepts = await prisma.masterDepartment.findMany();
    const allMappings = await prisma.dataMapping.findMany({
      where: { entityType: 'department', systemCode: SYSTEM_CODE },
    });
    for (const m of allMappings) {
      const dept = allDepts.find((d) => d.id === m.masterId);
      if (dept) deptFNumberMap[dept.hrmsId] = m.systemEntityId;
    }
  }

  // 查询金蝶已有员工
  let existingKdEmps = [];
  try {
    const kdResult = await adapter._executeBillQuery(
      'BD_Empinfo', 'FStaffNumber,FName', '', 5000,
    );
    existingKdEmps = kdResult.filter((e) => e.FStaffNumber && !e.FStaffNumber.Result);
  } catch (e) { /* ignore */ }

  const employees = await prisma.masterEmployee.findMany({
    where: { status: 'ACTIVE' },
  });

  // 筛选需要推送的员工（金蝶中不存在的）
  const existingNos = new Set(existingKdEmps.map((e) => e.FStaffNumber));
  const newEmps = employees.filter((e) => !existingNos.has(e.employeeNo));
  const existingEmps = employees.filter((e) => existingNos.has(e.employeeNo));

  let results = [];
  if (newEmps.length > 0) {
    results = await adapter.pushEmployees(newEmps, deptFNumberMap);
  }

  // 为已存在的员工保存 DataMapping
  for (const emp of existingEmps) {
    await prisma.dataMapping.upsert({
      where: {
        entityType_masterId_systemCode: {
          entityType: 'employee', masterId: emp.id, systemCode: SYSTEM_CODE,
        },
      },
      create: {
        entityType: 'employee', masterId: emp.id, systemCode: SYSTEM_CODE,
        systemEntityId: emp.employeeNo, syncStatus: 'SYNCED', lastSyncAt: new Date(),
      },
      update: {
        systemEntityId: emp.employeeNo, syncStatus: 'SYNCED', lastSyncAt: new Date(),
      },
    });
  }

  // 为新推送的员工保存 DataMapping
  for (const r of results) {
    if (r.success) {
      const emp = newEmps.find((e) => e.employeeNo === r.empNo);
      if (emp) {
        await prisma.dataMapping.upsert({
          where: {
            entityType_masterId_systemCode: {
              entityType: 'employee', masterId: emp.id, systemCode: SYSTEM_CODE,
            },
          },
          create: {
            entityType: 'employee', masterId: emp.id, systemCode: SYSTEM_CODE,
            systemEntityId: r.result, syncStatus: 'SYNCED', lastSyncAt: new Date(),
          },
          update: {
            systemEntityId: r.result, syncStatus: 'SYNCED', lastSyncAt: new Date(),
          },
        });
      }
    }
  }

  const totalDetails = [
    ...existingEmps.map((e) => ({ emp: e.name, empNo: e.employeeNo, success: true, result: e.employeeNo })),
    ...results,
  ];
  const successCount = existingEmps.length + results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;

  return {
    entityType: 'employee',
    total: employees.length,
    successCount,
    failedCount,
    details: totalDetails,
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
