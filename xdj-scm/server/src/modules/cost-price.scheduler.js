import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { purchaseUnitPriceToBase } from '../shared/unitConversion.js';

const prisma = new PrismaClient();

/**
 * 获取最近一个定时任务时间（cron: 00:00 和 12:00）
 * 用于无历史记录时作为 periodStart
 */
function getLastScheduledTime(now) {
  const d = new Date(now);
  if (d.getHours() >= 12) {
    d.setHours(12, 0, 0, 0);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

/**
 * 计算单个物料+等级组合的成本价
 */
async function calculateOne(mat, gradeId, gradeName, now, feesTotal, feesDetail, fullRecalc = false) {
  // === 1. 期初数据 ===
  let beginningQty = 0;
  let beginningPrice = 0;
  let periodStart = null;

  if (fullRecalc) {
    // 全量重算模式：忽略历史记录，从0开始统计所有 StockMovement
    beginningQty = 0;
    beginningPrice = 0;
    periodStart = null; // null 表示查询所有历史数据
  } else {
    const lastRecord = await prisma.costPriceRecord.findFirst({
      where: { materialId: mat.id, gradeId: gradeId },
      orderBy: { calculatedAt: 'desc' },
    });

    if (lastRecord) {
      beginningQty = Number(lastRecord.endingQty) || 0;
      beginningPrice = Number(lastRecord.costPrice) || 0;
      periodStart = lastRecord.calculatedAt;
    } else {
      periodStart = getLastScheduledTime(now);
    }
  }

  if (beginningPrice === 0 && Number(mat.initialPurchasePrice) > 0) {
    // initialPurchasePrice 是采购单位单价，需折算为基准单位单价
    beginningPrice = Number(purchaseUnitPriceToBase(Number(mat.initialPurchasePrice), mat));
  }

  const beginningAmount = beginningQty * beginningPrice;

  // === 2. 入库数据 ===
  const inboundWhere = {
    materialId: mat.id,
    direction: 'IN',
    movementType: { not: 'STOCK_TAKE_ADJUST' },
  };
  if (gradeId) {
    inboundWhere.gradeId = gradeId;
  } else {
    inboundWhere.gradeId = null;
  }
  if (periodStart) {
    inboundWhere.movementDate = { gte: periodStart, lt: now };
  } else {
    inboundWhere.movementDate = { lt: now };
  }

  const inboundMovements = await prisma.stockMovement.findMany({
    where: inboundWhere,
    select: {
      id: true, movementNo: true, qty: true,
      movementDate: true, movementType: true,
      refType: true, refId: true,
      batch: { select: { batchNo: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: { movementDate: 'asc' },
  });

  const receiptIds = inboundMovements
    .filter(m => m.refType === 'PURCHASE_RECEIPT' && m.refId)
    .map(m => m.refId);

  let receiptPriceMap = {};
  if (receiptIds.length > 0) {
    const receiptItems = await prisma.purchaseReceiptItem.findMany({
      where: {
        receiptId: { in: receiptIds },
        materialId: mat.id,
      },
      select: { receiptId: true, unitPrice: true, gradeId: true },
    });
    // 如果有 gradeId，过滤匹配等级的明细
    const filtered = gradeId
      ? receiptItems.filter(ri => ri.gradeId === gradeId)
      : receiptItems.filter(ri => !ri.gradeId);
    receiptPriceMap = filtered.reduce((map, ri) => {
      const purchaseUnitPrice = Number(ri.unitPrice) || 0;
      const baseUnitPrice = Number(purchaseUnitPriceToBase(purchaseUnitPrice, mat));
      map[ri.receiptId] = baseUnitPrice;
      return map;
    }, {});
    // 如果没有匹配等级的，fallback 到所有明细
    if (Object.keys(receiptPriceMap).length === 0) {
      receiptPriceMap = receiptItems.reduce((map, ri) => {
        const purchaseUnitPrice = Number(ri.unitPrice) || 0;
        const baseUnitPrice = Number(purchaseUnitPriceToBase(purchaseUnitPrice, mat));
        map[ri.receiptId] = baseUnitPrice;
        return map;
      }, {});
    }
  }

  let inboundQty = 0;
  let inboundAmount = 0;
  for (const m of inboundMovements) {
    // PURCHASE_RECEIPT 的 qty 已在写入时通过 purchaseQtyToBase 转换为基准单位
    const qty = Number(m.qty) || 0;
    let unitPrice = 0;
    if (m.refType === 'PURCHASE_RECEIPT' && m.refId && receiptPriceMap[m.refId]) {
      unitPrice = receiptPriceMap[m.refId];
    } else if (Number(mat.initialPurchasePrice) > 0) {
      // initialPurchasePrice 是采购单位单价，需折算为基准单位单价
      unitPrice = Number(purchaseUnitPriceToBase(Number(mat.initialPurchasePrice), mat));
    }
    inboundQty += qty;
    inboundAmount += qty * unitPrice;
  }

  // === 3. 销售成本价 ===
  const totalAmountForCost = beginningAmount + inboundAmount;
  const totalQtyForCost = beginningQty + inboundQty;
  let salesCostPrice = beginningPrice;
  if (totalQtyForCost > 0) {
    salesCostPrice = totalAmountForCost / totalQtyForCost;
  }

  // === 4. 出库数据 ===
  const outboundWhere = {
    materialId: mat.id,
    direction: 'OUT',
    movementType: { not: 'STOCK_TAKE_ADJUST' },
  };
  if (gradeId) {
    outboundWhere.gradeId = gradeId;
  } else {
    outboundWhere.gradeId = null;
  }
  if (periodStart) {
    outboundWhere.movementDate = { gte: periodStart, lt: now };
  } else {
    outboundWhere.movementDate = { lt: now };
  }

  const outboundMovements = await prisma.stockMovement.findMany({
    where: outboundWhere,
    select: {
      id: true, movementNo: true, qty: true,
      movementDate: true, movementType: true, remark: true, refType: true,
      warehouse: { select: { name: true } },
    },
    orderBy: { movementDate: 'asc' },
  });

  let outboundQty = 0;
  let outboundAmount = 0;
  for (const m of outboundMovements) {
    // StockMovement.qty 已统一存储为基准单位（采购入库/销售出库/发货出库均在写入时转换）
    const baseOutQty = Number(m.qty) || 0;
    outboundQty += baseOutQty;
    outboundAmount += baseOutQty * salesCostPrice;
  }

  // === 5. 损耗（StockTakeItem无等级字段，按物料整体计算） ===
  // diffQty 来源于库存数量差（bookQty - actualQty），库存以基准单位存储，无需额外转换
  const stockTakeWhere = {
    materialId: mat.id,
    diffQty: { lt: 0 },
    costPriceCalculated: false,
    stockTake: { status: 'COMPLETED' },
  };
  if (periodStart) {
    stockTakeWhere.stockTake = { status: 'COMPLETED', completedDate: { gte: periodStart, lt: now } };
  } else {
    stockTakeWhere.stockTake = { status: 'COMPLETED', completedDate: { lt: now } };
  }

  const stockTakeItems = await prisma.stockTakeItem.findMany({
    where: stockTakeWhere,
    select: { id: true, diffQty: true },
  });
  let lossQty = 0;
  const usedStockTakeItemIds = [];
  for (const item of stockTakeItems) {
    if (Number(item.diffQty) < 0) {
      lossQty += Math.abs(Number(item.diffQty));
      usedStockTakeItemIds.push(item.id);
    }
  }

  // === 6. 结存 ===
  const endingQty = beginningQty + inboundQty - outboundQty - lossQty;
  const endingAmount = beginningAmount + inboundAmount - outboundAmount;

  // === 7. 成本价 ===
  let weightedAvgPrice = beginningPrice;
  if (endingQty > 0) {
    weightedAvgPrice = endingAmount / endingQty;
  } else if (endingQty === 0 && inboundQty > 0) {
    weightedAvgPrice = salesCostPrice;
  }
  const costPrice = weightedAvgPrice;

  // 写入计算记录
  const newRecord = await prisma.costPriceRecord.create({
    data: {
      materialId: mat.id,
      materialName: mat.name,
      gradeId: gradeId || null,
      gradeName: gradeName || null,
      beginningQty,
      beginningPrice,
      beginningAmount,
      inboundQty,
      inboundAmount,
      salesCostPrice,
      outboundQty,
      outboundAmount,
      lossQty,
      endingQty,
      endingAmount,
      weightedAvgPrice,
      costPrice,
      feesTotal,
      feesDetail,
      periodStart,
      periodEnd: now,
      calculatedAt: now,
    },
  });

  // 标记盘点项
  if (usedStockTakeItemIds.length > 0) {
    await prisma.stockTakeItem.updateMany({
      where: { id: { in: usedStockTakeItemIds } },
      data: {
        costPriceCalculated: true,
        costPriceRecordId: newRecord.id,
      },
    });
  }

  const label = gradeName ? `${mat.name}(${gradeName})` : mat.name;
  console.log(`[CostPrice] ${label}: 期初(${beginningQty}×${beginningPrice.toFixed(2)}=${beginningAmount.toFixed(2)}) + 入库(${inboundQty},${inboundAmount.toFixed(2)}) - 出库(${outboundQty},${outboundAmount.toFixed(2)}) - 损耗(${lossQty}) = 结存(${endingQty},${endingAmount.toFixed(2)}) → 加权平均价=${weightedAvgPrice.toFixed(4)} = 成本价=${costPrice.toFixed(4)}`);
  return newRecord;
}

/**
 * 加权平均法成本价计算（按物料+等级粒度）
 *
 * 以每个物料的每种等级为一个计算单位：
 * - 有等级的物料：按每个等级分别计算成本价
 * - 无等级的物料：按物料整体计算（gradeId=null）
 */
export async function calculateAllCostPrices(options = {}) {
  const { onlyNew = false, fullRecalc = false } = options;
  const now = new Date();
  console.log(`[CostPrice] 开始批量计算成本价(加权平均法/按等级粒度)${onlyNew ? ' [仅新物料]' : ''}${fullRecalc ? ' [全量重算]' : ''}...`, now.toISOString());

  // 获取所有启用的费用（按物料分组）
  const feeRecords = await prisma.feeRecord.findMany({
    where: { isActive: true },
    select: { feeName: true, amount: true, materialId: true },
  });
  // 构建按物料分组的费用映射
  const feeMap = {};
  for (const f of feeRecords) {
    if (!feeMap[f.materialId]) feeMap[f.materialId] = [];
    feeMap[f.materialId].push({ feeName: f.feeName, amount: Number(f.amount) || 0 });
  }

  // 获取所有物料
  const materials = await prisma.material.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, initialPurchasePrice: true, purchaseConversionFactor: true, purchaseUnit: true, unit: true, salesUnit: true, salesConversionFactor: true },
  });
  console.log(`[CostPrice] 共 ${materials.length} 个物料需计算`);

  let calculated = 0, skipped = 0;
  let totalGroups = 0;

  for (const mat of materials) {
    try {
      // 获取该物料的所有等级
      const materialGrades = await prisma.materialGradeMapping.findMany({
        where: { materialId: mat.id },
        include: { grade: { select: { id: true, name: true } } },
      });

      // 构建等级组合列表：每个等级 + 无等级（兜底）
      const gradeGroups = [];
      for (const mg of materialGrades) {
        gradeGroups.push({ gradeId: mg.grade.id, gradeName: mg.grade.name });
      }
      // 始终包含无等级分组（兜底）
      gradeGroups.push({ gradeId: null, gradeName: null });

      // 全量重算模式：跳过 onlyNew 过滤，计算所有分组
      let filteredGroups = gradeGroups;
      if (onlyNew && !fullRecalc) {
        const existingKeys = new Set(
          (await prisma.costPriceRecord.findMany({
            where: { materialId: mat.id },
            select: { gradeId: true },
            distinct: ['materialId', 'gradeId'],
          })).map(r => `${mat.id}_${r.gradeId || '__NULL__'}`)
        );
        filteredGroups = gradeGroups.filter(g => !existingKeys.has(`${mat.id}_${g.gradeId || '__NULL__'}`));
      }

      totalGroups += filteredGroups.length;

      for (const group of filteredGroups) {
        try {
          const matFees = feeMap[mat.id] || [];
          const matFeesTotal = matFees.reduce((sum, f) => sum + f.amount, 0);
          await calculateOne(mat, group.gradeId, group.gradeName, now, matFeesTotal, matFees, fullRecalc);
          calculated++;
        } catch (err) {
          const label = group.gradeName ? `${mat.name}(${group.gradeName})` : mat.name;
          console.error(`[CostPrice] ${label} 计算失败:`, err.message);
          skipped++;
        }
      }
    } catch (err) {
      console.error(`[CostPrice] 物料 ${mat.name}(${mat.id}) 处理失败:`, err.message);
      skipped++;
    }
  }

  console.log(`[CostPrice] 计算完成: 共 ${totalGroups} 个分组, 成功 ${calculated}, 失败 ${skipped}`);
  return { calculated, skipped, total: totalGroups, newCount: totalGroups };
}

/**
 * 获取某物料+等级的最新成本价
 * @param {string} materialId - 物料ID
 * @param {string|null} [gradeId] - 等级ID（可选，不传则返回无等级的成本价）
 */
export async function getLatestCostPrice(materialId, gradeId = null) {
  const record = await prisma.costPriceRecord.findFirst({
    where: { materialId, gradeId: gradeId },
    orderBy: { calculatedAt: 'desc' },
  });
  if (!record) return null;
  return {
    costPrice: Number(record.costPrice),
    endingQty: Number(record.endingQty),
    beginningQty: Number(record.beginningQty),
    beginningPrice: Number(record.beginningPrice),
    inboundQty: Number(record.inboundQty),
    inboundAmount: Number(record.inboundAmount),
    outboundQty: Number(record.outboundQty),
    outboundAmount: Number(record.outboundAmount),
    lossQty: Number(record.lossQty || 0),
    salesCostPrice: Number(record.salesCostPrice),
    calculatedAt: record.calculatedAt,
  };
}

/**
 * 启动定时任务：每天 0:00 和 12:00 执行
 */
export function startCostPriceScheduler() {
  const task = cron.schedule('0 0,12 * * *', async () => {
    console.log('[CostPrice] 定时任务触发:', new Date().toISOString());
    try {
      await calculateAllCostPrices();
    } catch (err) {
      console.error('[CostPrice] 定时任务执行失败:', err.message);
    }
  }, {
    timezone: 'Asia/Shanghai',
  });
  console.log('[CostPrice] 定时任务已启动: 每天 00:00 和 12:00 自动计算成本价(加权平均法/按等级粒度)');
  return task;
}
