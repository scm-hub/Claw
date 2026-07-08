/**
 * 安全库存水位快照定时任务
 *
 * 每日凌晨 2 点执行：
 *   1. 重算所有启用标准 → 更新 StockStandard.safetyStock/warnStock/maxStock
 *   2. 快照当前库存 → 写入 StockLevel
 *   3. 低于安全库存或超上限 → 生成 StockAlert 预警
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { recalculateAll } from './stock-standard.calculator.js';

const prisma = new PrismaClient();

async function runDailySnapshot() {
  console.log('[StockLevel] 开始每日水位快照...');
  const snapshotTime = new Date();
  let levelsCreated = 0;
  let alertsCreated = 0;

  try {
    // Step 1: 重算所有标准
    const calcResults = await recalculateAll();
    console.log(`[StockLevel] 标准重算完成：成功${calcResults.success}，失败${calcResults.fail}`);

    // Step 2: 获取所有启用标准及其当前库存
    const standards = await prisma.stockStandard.findMany({
      where: { status: 'ACTIVE', safetyStock: { not: null } },
      include: {
        material: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
      },
    });

    for (const std of standards) {
      // 查询当前库存
      const inventory = await prisma.inventory.findFirst({
        where: { materialId: std.materialId, warehouseId: std.warehouseId },
        select: { qty: true },
      });

      const currentQty = inventory ? Number(inventory.qty) : 0;
      const safetyStock = Number(std.safetyStock) || 0;
      const warnStock = Number(std.warnStock) || 0;
      const maxStock = Number(std.maxStock) || 0;

      // 判断水位等级
      let level = 'GREEN';
      if (safetyStock > 0 && currentQty <= safetyStock) level = 'RED';
      else if (maxStock > 0 && currentQty >= maxStock) level = 'ORANGE';
      else if (warnStock > 0 && currentQty <= warnStock) level = 'YELLOW';

      // 写入快照
      await prisma.stockLevel.create({
        data: {
          materialId: std.materialId,
          warehouseId: std.warehouseId,
          snapshotDate: snapshotTime,
          currentQty,
          safetyStock,
          warnStock,
          maxStock,
          level,
        },
      });
      levelsCreated++;

      // Step 3: 生成预警
      if (level === 'RED') {
        // 检查是否已有未处理的同类型预警
        const existing = await prisma.stockAlert.findFirst({
          where: {
            materialId: std.materialId,
            warehouseId: std.warehouseId,
            alertType: 'LOW_STOCK',
            status: { in: ['ACTIVE', 'PROCESSING'] },
          },
        });

        if (!existing) {
          await prisma.stockAlert.create({
            data: {
              materialId: std.materialId,
              warehouseId: std.warehouseId,
              alertType: 'LOW_STOCK',
              level: 'RED',
              currentQty,
              thresholdQty: safetyStock,
            },
          });
          alertsCreated++;
          console.log(`[StockAlert] 🔴 ${std.material?.name} @ ${std.warehouse?.name}：库存${currentQty} ≤ 安全库存${safetyStock}`);
        }
      } else if (level === 'ORANGE') {
        const existing = await prisma.stockAlert.findFirst({
          where: {
            materialId: std.materialId,
            warehouseId: std.warehouseId,
            alertType: 'HIGH_STOCK',
            status: { in: ['ACTIVE', 'PROCESSING'] },
          },
        });

        if (!existing) {
          await prisma.stockAlert.create({
            data: {
              materialId: std.materialId,
              warehouseId: std.warehouseId,
              alertType: 'HIGH_STOCK',
              level: 'ORANGE',
              currentQty,
              thresholdQty: maxStock,
            },
          });
          alertsCreated++;
          console.log(`[StockAlert] 🟠 ${std.material?.name} @ ${std.warehouse?.name}：库存${currentQty} ≥ 最高库存${maxStock}`);
        }
      } else if (level === 'YELLOW') {
        const existing = await prisma.stockAlert.findFirst({
          where: {
            materialId: std.materialId,
            warehouseId: std.warehouseId,
            alertType: 'APPROACHING',
            status: { in: ['ACTIVE'] },
          },
        });

        if (!existing) {
          await prisma.stockAlert.create({
            data: {
              materialId: std.materialId,
              warehouseId: std.warehouseId,
              alertType: 'APPROACHING',
              level: 'YELLOW',
              currentQty,
              thresholdQty: warnStock,
            },
          });
          alertsCreated++;
        }
      }

      // 如果之前有 RED/ORANGE 预警但现在恢复正常，自动标记为 RESOLVED
      if (level === 'GREEN') {
        await prisma.stockAlert.updateMany({
          where: {
            materialId: std.materialId,
            warehouseId: std.warehouseId,
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

    console.log(`[StockLevel] 完成：快照${levelsCreated}条，预警${alertsCreated}条`);
  } catch (err) {
    console.error('[StockLevel] 执行失败:', err.message);
  }
}

/**
 * 启动定时任务
 */
export function startStockLevelScheduler() {
  // 每日凌晨 2 点（Asia/Shanghai）
  cron.schedule('0 2 * * *', runDailySnapshot, {
    timezone: 'Asia/Shanghai',
  });
  console.log('[StockLevel] 定时任务已注册：每天 02:00 (Asia/Shanghai)');
}

/**
 * 手动触发一次快照（供 API 调用）
 */
export async function triggerSnapshot() {
  await runDailySnapshot();
}
