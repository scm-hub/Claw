/**
 * 安全库存水位快照 + 全类型预警定时任务
 *
 * 每日凌晨 2:00 执行：
 *   1. 重算标准 → 写水位快照
 *   2. 缺货预警(YELLOW/RED/CRITICAL) + 在途计算
 *   3. 积压预警(ORANGE_80/DEEP_RED)
 *   4. 临期效期预警(YELLOW_EXPIRY/RED_EXPIRY)
 *   5. 自动恢复 + 升级检查
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { recalculateAll } from './stock-standard.calculator.js';

const prisma = new PrismaClient();

/**
 * 计算在途库存：所有 ORDERED/SHIPPING/IN_TRANSIT 采购单的未收数量
 */
async function calcInTransitQty(materialId, warehouseId) {
  const items = await prisma.purchaseOrderItem.findMany({
    where: {
      materialId,
      purchaseOrder: {
        warehouseId,
        status: { in: ['ORDERED', 'SHIPPING', 'IN_TRANSIT'] },
        receiptStatus: 'PENDING',
      },
    },
    select: { qty: true, receivedQty: true },
  });
  return items.reduce((sum, i) => sum + (i.qty || 0) - (i.receivedQty || 0), 0);
}

/**
 * 计算锁定/预留量
 */
async function calcLockedQty(materialId, warehouseId) {
  const locks = await prisma.stockLock.findMany({
    where: {
      materialId,
      warehouseId,
      status: 'ACTIVE',
      expireAt: { gt: new Date() },
    },
    select: { qty: true },
  });
  return locks.reduce((sum, l) => sum + (l.qty || 0), 0);
}

/**
 * 生成截止时间
 */
function calcDeadline(alertSubType) {
  const now = new Date();
  switch (alertSubType) {
    case 'CRITICAL': return now; // 立即
    case 'RED_LOW': return new Date(now.getTime() + 1 * 3600000); // 1小时
    case 'YELLOW_LOW': return new Date(now.getTime() + 24 * 3600000); // 24小时
    case 'DEEP_RED': return new Date(now.getTime() + 3 * 86400000); // 3天
    default: return null;
  }
}

/**
 * 检查是否存在同物料×仓库×子类型的活跃预警
 */
async function alertExists(materialId, warehouseId, alertSubType) {
  const c = await prisma.stockAlert.count({
    where: {
      materialId, warehouseId,
      alertSubType,
      status: { in: ['ACTIVE', 'PROCESSING'] },
    },
  });
  return c > 0;
}

async function runDailySnapshot() {
  console.log('[StockLevel] === 每日水位快照开始 ===');
  const snapshotTime = new Date();
  let levelsCreated = 0;
  let alertsCreated = 0;

  try {
    // Step 1: 重算所有标准
    const calcResults = await recalculateAll();
    console.log(`[StockLevel] 标准重算：成功${calcResults.success}，失败${calcResults.fail}`);

    // Step 2: 水位快照 + 缺货/积压预警
    const standards = await prisma.stockStandard.findMany({
      where: { status: 'ACTIVE', safetyStock: { not: null } },
      include: {
        material: { select: { id: true, name: true, shelfLifeDays: true } },
        warehouse: { select: { id: true, name: true } },
      },
    });

    for (const std of standards) {
      const inventory = await prisma.inventory.findFirst({
        where: { materialId: std.materialId, warehouseId: std.warehouseId },
        select: { qty: true },
      });
      const currentQty = inventory ? Number(inventory.qty) : 0;
      const safetyStock = Number(std.safetyStock) || 0;
      const warnStock = Number(std.warnStock) || 0;
      const maxStock = Number(std.maxStock) || 0;

      // 水位等级
      let level = 'GREEN';
      if (safetyStock > 0 && currentQty <= safetyStock) level = 'RED';
      else if (maxStock > 0 && currentQty >= maxStock) level = 'ORANGE';
      else if (warnStock > 0 && currentQty <= warnStock) level = 'YELLOW';

      // 写入快照
      await prisma.stockLevel.create({
        data: {
          materialId: std.materialId, warehouseId: std.warehouseId,
          snapshotDate: snapshotTime, currentQty, safetyStock, warnStock, maxStock, level,
        },
      });
      levelsCreated++;

      // --- 缺货预警 ---
      if (level === 'RED' && !(await alertExists(std.materialId, std.warehouseId, 'RED_LOW'))) {
        const inTransit = await calcInTransitQty(std.materialId, std.warehouseId);
        const locked = await calcLockedQty(std.materialId, std.warehouseId);

        // 特级红：库存≈0 且无在途
        const isCritical = currentQty <= 0 && inTransit <= 0;
        const subType = isCritical ? 'CRITICAL' : 'RED_LOW';

        await prisma.stockAlert.create({
          data: {
            materialId: std.materialId, warehouseId: std.warehouseId,
            alertType: 'LOW_STOCK', alertSubType: subType,
            level: isCritical ? 'CRITICAL' : 'RED',
            currentQty, thresholdQty: safetyStock,
            inTransitQty: inTransit, lockedQty: locked,
            deadline: calcDeadline(subType),
          },
        });
        alertsCreated++;
        console.log(`[Alert] ${isCritical ? '🔴特级' : '🔴红色'} 缺货: ${std.material?.name} @ ${std.warehouse?.name} 库存${currentQty} 在途${inTransit}`);
      } else if (level === 'YELLOW' && !(await alertExists(std.materialId, std.warehouseId, 'YELLOW_LOW'))) {
        await prisma.stockAlert.create({
          data: {
            materialId: std.materialId, warehouseId: std.warehouseId,
            alertType: 'LOW_STOCK', alertSubType: 'YELLOW_LOW', level: 'YELLOW',
            currentQty, thresholdQty: warnStock,
            deadline: calcDeadline('YELLOW_LOW'),
          },
        });
        alertsCreated++;
        console.log(`[Alert] 🟡 缺货预警: ${std.material?.name} @ ${std.warehouse?.name} 库存${currentQty}`);
      }

      // --- 积压预警 ---
      if (maxStock > 0 && currentQty >= maxStock * 0.8) {
        const subType = currentQty >= maxStock ? 'DEEP_RED' : 'ORANGE_80';
        if (!(await alertExists(std.materialId, std.warehouseId, subType))) {
          await prisma.stockAlert.create({
            data: {
              materialId: std.materialId, warehouseId: std.warehouseId,
              alertType: 'HIGH_STOCK', alertSubType: subType,
              level: currentQty >= maxStock ? 'DEEP_RED' : 'ORANGE',
              currentQty, thresholdQty: maxStock,
              deadline: calcDeadline(subType),
            },
          });
          alertsCreated++;
          console.log(`[Alert] ${currentQty >= maxStock ? '🔴深红' : '🟠橙色'} 积压: ${std.material?.name} @ ${std.warehouse?.name} 库存${currentQty}/${maxStock}`);
        }
      }

      // 自动恢复
      if (level === 'GREEN') {
        await prisma.stockAlert.updateMany({
          where: {
            materialId: std.materialId, warehouseId: std.warehouseId,
            status: { in: ['ACTIVE', 'PROCESSING'] },
          },
          data: {
            status: 'RESOLVED',
            resolution: `系统自动恢复：当前库存${currentQty}，水位正常`,
            processedAt: new Date(),
          },
        });
      }
    }

    // Step 3: 临期效期预警
    const alertsExpiry = await generateExpiryAlerts();
    alertsCreated += alertsExpiry;

    // Step 4: 预警升级检查
    await checkEscalations();

    console.log(`[StockLevel] === 完成：快照${levelsCreated}，预警${alertsCreated} ===`);
  } catch (err) {
    console.error('[StockLevel] 执行失败:', err.message);
  }
}

/**
 * 临期效期预警
 */
async function generateExpiryAlerts() {
  let created = 0;
  const now = new Date();

  // 查询有库存的批次
  const batches = await prisma.batch.findMany({
    where: {
      remainingQty: { gt: 0 },
      expiryDate: { not: null },
      status: 'ACTIVE',
    },
    include: {
      material: { select: { id: true, name: true, shelfLifeDays: true } },
    },
  });

  for (const b of batches) {
    if (!b.expiryDate || !b.material?.shelfLifeDays) continue;

    const remainingDays = Math.ceil((new Date(b.expiryDate).getTime() - now.getTime()) / 86400000);
    const shelfLife = b.material.shelfLifeDays;
    if (remainingDays <= 0) continue; // 已过期的不管

    const ratio = remainingDays / shelfLife;

    // 找到批次对应的仓库（从 stock_movements 取收货记录）
    const move = await prisma.stockMovement.findFirst({
      where: { batchId: b.id, direction: 'IN' },
      select: { warehouseId: true, warehouse: { select: { name: true } } },
    });
    if (!move) continue;

    const warehouseId = move.warehouseId;

    if (ratio <= 0.3) {
      if (!(await alertExists(b.materialId, warehouseId, 'RED_EXPIRY'))) {
        await prisma.stockAlert.create({
          data: {
            materialId: b.materialId, warehouseId,
            alertType: 'EXPIRY', alertSubType: 'RED_EXPIRY', level: 'RED',
            currentQty: b.remainingQty, thresholdQty: shelfLife * 0.3,
            batchId: b.id, expiryDate: b.expiryDate, remainingDays,
            deadline: new Date(now.getTime() + 1 * 86400000), // 24h
          },
        });
        created++;
        console.log(`[Alert] 🔴 临期红: ${b.material?.name} 批次${b.batchNo} 剩余${remainingDays}天`);
      }
    } else if (ratio <= 0.5) {
      if (!(await alertExists(b.materialId, warehouseId, 'YELLOW_EXPIRY'))) {
        await prisma.stockAlert.create({
          data: {
            materialId: b.materialId, warehouseId,
            alertType: 'EXPIRY', alertSubType: 'YELLOW_EXPIRY', level: 'YELLOW',
            currentQty: b.remainingQty, thresholdQty: shelfLife * 0.5,
            batchId: b.id, expiryDate: b.expiryDate, remainingDays,
          },
        });
        created++;
        console.log(`[Alert] 🟡 临期黄: ${b.material?.name} 批次${b.batchNo} 剩余${remainingDays}天`);
      }
    }
  }

  return created;
}

/**
 * 预警升级：超时未处理自动升级
 */
async function checkEscalations() {
  const now = new Date();
  const overdue = await prisma.stockAlert.findMany({
    where: {
      status: { in: ['ACTIVE', 'PROCESSING'] },
      deadline: { lt: now },
      escalatedAt: null,
    },
  });

  for (const alert of overdue) {
    // YELLOW → RED, RED → CRITICAL（留原预警不变，创建新的升级预警）
    const upgradeMap = { YELLOW: 'RED', RED: 'CRITICAL', ORANGE: 'DEEP_RED' };
    const newLevel = upgradeMap[alert.level];
    if (!newLevel) continue;

    await prisma.stockAlert.update({
      where: { id: alert.id },
      data: { escalatedAt: now },
    });

    await prisma.stockAlert.create({
      data: {
        materialId: alert.materialId, warehouseId: alert.warehouseId,
        alertType: alert.alertType, alertSubType: alert.alertSubType,
        level: newLevel,
        currentQty: alert.currentQty, thresholdQty: alert.thresholdQty,
        inTransitQty: alert.inTransitQty, lockedQty: alert.lockedQty,
        batchId: alert.batchId, expiryDate: alert.expiryDate, remainingDays: alert.remainingDays,
        escalatedFrom: alert.id,
        deadline: new Date(now.getTime() + 1 * 3600000), // 再给1小时
      },
    });
    console.log(`[Escalation] ⬆️ ${alert.materialId} 预警升级: ${alert.level} → ${newLevel}`);
  }
}

export function startStockLevelScheduler() {
  cron.schedule('0 2 * * *', runDailySnapshot, { timezone: 'Asia/Shanghai' });
  // 每小时检查升级
  cron.schedule('0 * * * *', checkEscalations, { timezone: 'Asia/Shanghai' });
  console.log('[StockLevel] 定时任务已注册：快照02:00 + 升级每小时 (Asia/Shanghai)');
}

export async function triggerSnapshot() {
  await runDailySnapshot();
}
