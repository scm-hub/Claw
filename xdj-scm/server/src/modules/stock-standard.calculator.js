/**
 * 安全库存计算引擎
 *
 * 公式：
 *   安全库存 = 日均销量 × 采购提前期 × 波动系数 × 外仓系数
 *   预警库存 = 安全库存 × 1.8
 *   最高库存 = 日均销量 × 最大存储天数
 *
 * 品类差异化：
 *   A类（流通鲜菌）：近30天日均销量
 *   B类（珍稀菌）：近15天日均销量，无稳定订单→安全库存=0
 *   C类（预制冻/水煮菇）：近30天日均销量，冷冻品最高库存可放宽
 *   D类（包装耗材）：安全库存=15天固定使用量，最高库存=90天
 */

import { PrismaClient } from '@prisma/client';

/**
 * 计算单个物料×仓库的安全库存
 * @param {object} standard - StockStandard（含 material, warehouse, seasonConfig）
 * @param {object} options - { avgDailySales: 外部传入的日均销量（可选，不传则内部查询） }
 * @returns {object} { safetyStock, warnStock, maxStock, avgDailySales }
 */
export async function calculateStockStandard(standard, options = {}) {
  const prisma = new PrismaClient();

  try {
    const { material, warehouse, seasonConfig } = standard;
    const stockCategory = material?.group?.stockCategory || 'A';
    const procurementDays = standard.procurementDays;
    const maxStorageDays = standard.maxStorageDays;
    const coefficient = seasonConfig?.coefficient ?? 1.0;
    const remoteAdjust = standard.remoteAdjust ?? 1.0;

    // 1. 计算日均销量
    const avgDailySales = options.avgDailySales ?? await computeAvgDailySales(
      prisma,
      standard.materialId,
      standard.warehouseId,
      stockCategory,
    );

    // 2. 品类特殊规则
    let safetyStock = 0;
    let maxStock = 0;

    if (stockCategory === 'D') {
      // D类耗材：安全库存=15天使用量，最高库存=90天
      safetyStock = avgDailySales * 15;
      maxStock = avgDailySales * 90;
    } else if (stockCategory === 'B' && avgDailySales <= 0) {
      // B类无稳定订单：以销定采，安全库存=0
      safetyStock = 0;
      maxStock = avgDailySales * maxStorageDays;
    } else {
      // A/C类 标准公式
      safetyStock = avgDailySales * procurementDays * coefficient * remoteAdjust;
      // C类冷冻品最高库存可放宽至最大存储天数
      maxStock = avgDailySales * maxStorageDays;
    }

    // 3. 预警库存
    const warnStock = safetyStock * 1.8;

    // 4. 夏季/高温修正（A类鲜品最高库存下调20%）
    // 可通过外部传入或后续扩展

    return {
      avgDailySales: Math.round(avgDailySales * 100) / 100,
      safetyStock: Math.round(safetyStock * 100) / 100,
      warnStock: Math.round(warnStock * 100) / 100,
      maxStock: Math.round(maxStock * 100) / 100,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 计算日均销量
 * @returns {number} 日均销量
 */
async function computeAvgDailySales(prisma, materialId, warehouseId, stockCategory) {
  // B类用近15天，其余用近30天
  const days = stockCategory === 'B' ? 15 : 30;
  const sinceDate = new Date(Date.now() - days * 86400000);

  // 查询销售出库记录
  const movements = await prisma.stockMovement.findMany({
    where: {
      materialId,
      warehouseId,
      movementType: 'SALES_OUTBOUND',
      direction: 'OUT',
      movementDate: { gte: sinceDate },
    },
    select: { qty: true },
  });

  if (movements.length === 0) return 0;

  const totalQty = movements.reduce((sum, m) => sum + Number(m.qty), 0);

  // 以实际数据天数计算（不超过设定的天数）
  return totalQty / days;
}

/**
 * 批量重算所有启用的安全库存标准
 */
export async function recalculateAll() {
  const prisma = new PrismaClient();

  try {
    const standards = await prisma.stockStandard.findMany({
      where: { status: 'ACTIVE' },
      include: {
        material: { select: { id: true, name: true, shelfLifeDays: true, purchaseLeadTime: true, group: { select: { stockCategory: true } } } },
        warehouse: { select: { id: true, name: true, isRemote: true } },
        seasonConfig: true,
      },
    });

    const results = { success: 0, fail: 0, details: [] };

    for (const std of standards) {
      try {
        const calc = await calculateStockStandard(std);

        // 回写计算结果
        await prisma.stockStandard.update({
          where: { id: std.id },
          data: {
            avgDailySales: calc.avgDailySales,
            safetyStock: calc.safetyStock,
            warnStock: calc.warnStock,
            maxStock: calc.maxStock,
            lastCalcTime: new Date(),
          },
        });

        results.success++;
        results.details.push({
          materialId: std.materialId,
          materialName: std.material?.name,
          warehouseName: std.warehouse?.name,
          ...calc,
        });
      } catch (err) {
        results.fail++;
        results.details.push({
          materialId: std.materialId,
          error: err.message,
        });
      }
    }

    return results;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 重算单条标准
 */
export async function recalculateOne(standardId) {
  const prisma = new PrismaClient();

  try {
    const std = await prisma.stockStandard.findUnique({
      where: { id: standardId },
      include: {
        material: { select: { id: true, name: true, shelfLifeDays: true, purchaseLeadTime: true, group: { select: { stockCategory: true } } } },
        warehouse: { select: { id: true, name: true } },
        seasonConfig: true,
      },
    });

    if (!std) throw new Error('标准不存在');

    const calc = await calculateStockStandard(std);

    await prisma.stockStandard.update({
      where: { id: standardId },
      data: {
        avgDailySales: calc.avgDailySales,
        safetyStock: calc.safetyStock,
        warnStock: calc.warnStock,
        maxStock: calc.maxStock,
        lastCalcTime: new Date(),
      },
    });

    return calc;
  } finally {
    await prisma.$disconnect();
  }
}
