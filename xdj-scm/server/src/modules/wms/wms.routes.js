import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import prisma from '../../shared/prisma.js';
import { calculateAllCostPrices, getLatestCostPrice } from '../cost-price.scheduler.js';

const router = Router();
router.use(authenticate);

function genNo(prefix) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${ymd}${rand}`;
}

// ============================================================
// 库存查询
// ============================================================

router.get('/inventory', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 50, keyword = '', warehouseId = '', materialId = '', gradeId = '' } = req.query;
    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (materialId) where.materialId = materialId;
    if (keyword) {
      where.material = {
        OR: [{ code: { contains: keyword } }, { name: { contains: keyword } }],
      };
    }

    const [list, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          material: { select: { id: true, code: true, name: true, spec: true, unit: true, category: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, code: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.inventory.count({ where }),
    ]);

    // 计算可用库存（如果指定了 gradeId，则计算该等级的库存）
    const listWithAvailable = [];
    for (const inv of list) {
      let qty = Number(inv.qty);
      let lockedQty = Number(inv.lockedQty);

      if (gradeId && materialId) {
        // 按等级从 StockMovement 计算物理库存
        const [inAgg, outAgg] = await Promise.all([
          prisma.stockMovement.aggregate({
            where: { materialId, gradeId, warehouseId: inv.warehouseId, direction: 'IN' },
            _sum: { qty: true },
          }),
          prisma.stockMovement.aggregate({
            where: { materialId, gradeId, warehouseId: inv.warehouseId, direction: 'OUT' },
            _sum: { qty: true },
          }),
        ]);
        qty = Number(inAgg._sum.qty || 0) - Number(outAgg._sum.qty || 0);
        // lockedQty 按比例分配（gradeQty / materialQty * materialLockedQty）
        const materialQty = Number(inv.qty);
        if (materialQty > 0) {
          lockedQty = Number(inv.lockedQty) * (qty / materialQty);
        } else {
          lockedQty = 0;
        }
      }

      listWithAvailable.push({
        ...inv,
        qty,
        lockedQty,
        availableQty: Math.max(0, qty - lockedQty),
      });
    }

    res.json({ success: true, data: { list: listWithAvailable, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 库存看板统计
router.get('/inventory/stats', async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        _count: { select: { inventory: true } },
      },
    });
    const totalSKUs = await prisma.inventory.count();
    const lowStock = await prisma.inventory.count({ where: { qty: { lte: 10 } } });
    const totalBatches = await prisma.batch.count({ where: { status: 'ACTIVE' } });
    res.json({
      success: true,
      data: { warehouses, totalSKUs, lowStock, totalBatches },
    });
  } catch (err) { next(err); }
});

// ============================================================
// 平均成本价（近12小时入库记录的采购单价均值，无数据则为0）
// ============================================================
router.get('/movements/avg-cost', async (req, res, next) => {
  try {
    const { materialId } = req.query;
    if (!materialId) {
      return res.json({ success: true, data: { avgPrice: 0, count: 0 } });
    }
    // 直接取最新成本价计算结果
    const latest = await getLatestCostPrice(materialId);
    if (!latest) {
      return res.json({ success: true, data: { avgPrice: 0, count: 0, basePrice: 0 } });
    }
    res.json({ success: true, data: {
      avgPrice: Number(latest.costPrice.toFixed(4)),
      count: 1,
      basePrice: Number(latest.costPrice.toFixed(4)),
      beginningQty: latest.endingQty,
      beginningPrice: latest.costPrice,
      salesCostPrice: latest.salesCostPrice,
    } });
  } catch (err) { next(err); }
});

// ============================================================
// 成本价管理（预计算 + 历史记录）
// ============================================================

// 获取某物料+等级的最新预计算成本价
router.get('/cost-price/latest', async (req, res, next) => {
  try {
    const { materialId, gradeId } = req.query;
    if (!materialId) {
      return res.json({ success: true, data: null });
    }
    const result = await getLatestCostPrice(materialId, gradeId || null);
    if (!result) {
      // 即使没有成本价记录，也要返回损耗和费用数据
      const lossRecord = await prisma.productLossRecord.findFirst({
        where: { materialId },
        orderBy: { calculatedAt: 'desc' },
      });
      // 按物料查询三类费用合计（PACKAGING + BOX_COST + FREIGHT）
      const materialFees = await prisma.feeRecord.aggregate({
        where: { materialId, feeType: { in: ['PACKAGING', 'BOX_COST', 'FREIGHT'] }, isActive: true },
        _sum: { amount: true },
      });
      const feesTotalAmount = Number(materialFees._sum.amount) || 0;
      return res.json({
        success: true,
        data: {
          costPrice: 0,
          lossAmount: lossRecord ? Number(lossRecord.lossAmount) : 0,
          feesTotal: feesTotalAmount,
          combinedCostPrice: feesTotalAmount,
        },
      });
    }
    // 同时获取该物料的最新损耗金额
    const lossRecord = await prisma.productLossRecord.findFirst({
      where: { materialId },
      orderBy: { calculatedAt: 'desc' },
    });
    const lossAmount = lossRecord ? Number(lossRecord.lossAmount) : 0;
    // 按物料查询三类费用合计（PACKAGING + BOX_COST + FREIGHT）
    const materialFees = await prisma.feeRecord.aggregate({
      where: { materialId, feeType: { in: ['PACKAGING', 'BOX_COST', 'FREIGHT'] }, isActive: true },
      _sum: { amount: true },
    });
    const feesTotalAmount = Number(materialFees._sum.amount) || 0;
    // 新成本价 = 加权平均价 + 费用合计
    const combinedCostPrice = result.costPrice + feesTotalAmount;
    res.json({
      success: true,
      data: {
        ...result,
        lossAmount,
        feesTotal: feesTotalAmount,
        combinedCostPrice,
      },
    });
  } catch (err) { next(err); }
});

// 获取成本价计算历史记录
router.get('/cost-price/history', async (req, res, next) => {
  try {
    const { materialId, page = 1, pageSize = 20, latestOnly, startDate, endDate } = req.query;
    const where = {};
    if (materialId) where.materialId = materialId;
    if (startDate) where.calculatedAt = { ...where.calculatedAt, gte: new Date(startDate) };
    if (endDate) where.calculatedAt = { ...where.calculatedAt, lte: new Date(endDate + 'T23:59:59') };

    if (latestOnly === 'true') {
      // 每个物料+级��取最新一条记录
      const rows = await prisma.$queryRawUnsafe(`
        SELECT cp.* FROM cost_price_records cp
        INNER JOIN (
          SELECT materialId, grade_id, MAX(calculatedAt) AS maxDate
          FROM cost_price_records
          ${materialId ? 'WHERE materialId = ?' : ''}
          GROUP BY materialId, grade_id
        ) latest ON cp.materialId = latest.materialId AND (cp.grade_id = latest.grade_id OR (cp.grade_id IS NULL AND latest.grade_id IS NULL)) AND cp.calculatedAt = latest.maxDate
        ORDER BY cp.calculatedAt DESC
        LIMIT ? OFFSET ?
      `, ...(materialId ? [materialId] : []), Number(pageSize), (Number(page) - 1) * Number(pageSize));

      const countRows = materialId
        ? await prisma.$queryRawUnsafe(`SELECT COUNT(DISTINCT CONCAT(materialId, COALESCE(grade_id, ''))) AS cnt FROM cost_price_records WHERE materialId = ?`, materialId)
        : await prisma.$queryRawUnsafe(`SELECT COUNT(DISTINCT CONCAT(materialId, COALESCE(grade_id, ''))) AS cnt FROM cost_price_records`);
      const total = Number(countRows[0]?.cnt || 0);

      return res.json({ success: true, data: { list: rows, total, page: Number(page), pageSize: Number(pageSize) } });
    }

    const [list, total] = await Promise.all([
      prisma.costPriceRecord.findMany({
        where,
        orderBy: { calculatedAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      prisma.costPriceRecord.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 手动触发成本价计算
router.post('/cost-price/recalculate', authorize(ROLES.SUPER_ADMIN, ROLES.SALES_MANAGER), async (req, res, next) => {
  try {
    const fullRecalc = req.query.fullRecalc === 'true' || req.body?.fullRecalc === true;
    // 手动触发：全量增量计算（对所有物料，以上次calculatedAt为起点，计算到现在）
    // fullRecalc=true: 忽略历史期初，从 StockMovement 全量重算
    const result = await calculateAllCostPrices({ onlyNew: false, fullRecalc });
    res.json({ success: true, data: result, message: `成本价计算完成${fullRecalc ? '(全量重算)' : ''}: 成功 ${result.calculated} 个, 出错 ${result.skipped || 0} 个` });
  } catch (err) { next(err); }
});

// 获取某条成本价记录对应的计算明细（入库+出库）
router.get('/cost-price/:id/movements', async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await prisma.costPriceRecord.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const periodStart = record.periodStart;
    const calculatedAt = record.calculatedAt;

    // 入库明细 - 查询该物料+等级在当前成本价计算周期内的入库记录
    // 时间范围需与 cost-price.scheduler.js 中 calculateOne 的汇总逻辑保持一致
    const inboundWhere = {
      materialId: record.materialId,
      direction: 'IN',
    };
    if (periodStart) {
      inboundWhere.movementDate = { gte: periodStart, lte: calculatedAt };
    } else {
      inboundWhere.movementDate = { lte: calculatedAt };
    }
    if (record.gradeId) {
      inboundWhere.gradeId = record.gradeId;
    } else {
      inboundWhere.gradeId = null;
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

    // 批量查入库单价
    const receiptIds = inboundMovements
      .filter(m => m.refType === 'PURCHASE_RECEIPT' && m.refId)
      .map(m => m.refId);
    let receiptPriceMap = {};
    if (receiptIds.length > 0) {
      const receiptItems = await prisma.purchaseReceiptItem.findMany({
        where: { receiptId: { in: receiptIds }, materialId: record.materialId },
        select: { receiptId: true, unitPrice: true },
      });
      receiptPriceMap = receiptItems.reduce((map, ri) => { map[ri.receiptId] = Number(ri.unitPrice) || 0; return map; }, {});
    }

    const inbound = inboundMovements.map(m => {
      const qty = Number(m.qty) || 0;
      let unitPrice = 0;
      if (m.refType === 'PURCHASE_RECEIPT' && m.refId && receiptPriceMap[m.refId]) {
        unitPrice = receiptPriceMap[m.refId];
      }
      return {
        id: m.id, movementNo: m.movementNo, movementType: m.movementType,
        warehouseName: m.warehouse?.name || '-', batchNo: m.batch?.batchNo || '-',
        qty, unitPrice, lineAmount: qty * unitPrice, movementDate: m.movementDate,
      };
    });

    // 出库明细（排除盘点调整，盘点损耗单独展示）- 查询当前成本价计算周期内的出库记录
    // 时间范围需与 cost-price.scheduler.js 中 calculateOne 的汇总逻辑保持一致
    const outboundWhere = {
      materialId: record.materialId,
      direction: 'OUT',
      movementType: { not: 'STOCK_TAKE_ADJUST' },
    };
    if (periodStart) {
      outboundWhere.movementDate = { gte: periodStart, lte: calculatedAt };
    } else {
      outboundWhere.movementDate = { lte: calculatedAt };
    }
    if (record.gradeId) {
      outboundWhere.gradeId = record.gradeId;
    } else {
      outboundWhere.gradeId = null;
    }

    const outboundMovements = await prisma.stockMovement.findMany({
      where: outboundWhere,
      select: {
        id: true, movementNo: true, qty: true, movementDate: true,
        movementType: true, remark: true,
        warehouse: { select: { name: true } },
      },
      orderBy: { movementDate: 'asc' },
    });

    const salesCostPrice = Number(record.salesCostPrice) || 0;
    const outbound = outboundMovements.map(m => {
      const qty = Number(m.qty) || 0;
      return {
        id: m.id, movementNo: m.movementNo, movementType: m.movementType,
        warehouseName: m.warehouse?.name || '-', qty,
        salesCostPrice, lineAmount: qty * salesCostPrice,
        movementDate: m.movementDate, remark: m.remark || '-',
      };
    });

    // 盘点损耗明细（通过 costPriceRecordId 关联查询，旧记录回退到时间范围匹配）
    let stockTakeItems = await prisma.stockTakeItem.findMany({
      where: { costPriceRecordId: id },
      select: {
        id: true, diffQty: true, bookQty: true, actualQty: true,
        diffReason: true, countedAt: true, costPriceCalculated: true,
        stockTake: { select: { takeNo: true, warehouse: { select: { name: true } } } },
        material: { select: { name: true } },
      },
      orderBy: { countedAt: 'desc' },
    });

    // 回退：旧计算记录没有 costPriceRecordId 关联，通过时间范围匹配已标记的盘点数据
    if (stockTakeItems.length === 0) {
      const fallbackWhere = {
        materialId: record.materialId,
        diffQty: { lt: 0 },
        costPriceCalculated: true,
        stockTake: { status: 'COMPLETED' },
      };
      if (record.periodStart) {
        fallbackWhere.stockTake = {
          status: 'COMPLETED',
          completedDate: { gte: record.periodStart, lte: record.calculatedAt },
        };
      } else {
        fallbackWhere.stockTake = {
          status: 'COMPLETED',
          completedDate: { lte: record.calculatedAt },
        };
      }
      stockTakeItems = await prisma.stockTakeItem.findMany({
        where: fallbackWhere,
        select: {
          id: true, diffQty: true, bookQty: true, actualQty: true,
          diffReason: true, countedAt: true, costPriceCalculated: true,
          stockTake: { select: { takeNo: true, warehouse: { select: { name: true } } } },
          material: { select: { name: true } },
        },
        orderBy: { countedAt: 'desc' },
      });
    }
    const stockTakeLoss = stockTakeItems.map(item => ({
      id: item.id,
      takeNo: item.stockTake?.takeNo || '-',
      warehouseName: item.stockTake?.warehouse?.name || '-',
      bookQty: Number(item.bookQty) || 0,
      actualQty: Number(item.actualQty) || 0,
      diffQty: Number(item.diffQty) || 0,
      lossQty: Number(item.diffQty) < 0 ? Math.abs(Number(item.diffQty)) : 0,
      diffReason: item.diffReason || '-',
      countedAt: item.countedAt,
      costPriceCalculated: true,
    }));

    res.json({ success: true, data: { inbound, outbound, stockTakeLoss, summary: {
      beginningQty: Number(record.beginningQty),
      beginningPrice: Number(record.beginningPrice),
      beginningAmount: Number(record.beginningAmount),
      inboundQty: Number(record.inboundQty),
      inboundAmount: Number(record.inboundAmount),
      salesCostPrice: Number(record.salesCostPrice),
      outboundQty: Number(record.outboundQty),
      outboundAmount: Number(record.outboundAmount),
      lossQty: Number(record.lossQty || 0),
      endingQty: Number(record.endingQty),
      endingAmount: Number(record.endingAmount),
      weightedAvgPrice: Number(record.weightedAvgPrice),
      feesTotal: Number(record.feesTotal),
      costPrice: Number(record.costPrice),
    }}});
  } catch (err) { next(err); }
});

// ============================================================
// 产品损耗计算历史
// ============================================================

// 查询产品损耗历史
router.get('/product-loss/history', async (req, res, next) => {
  try {
    const { materialId, page = 1, pageSize = 20, startDate, endDate, latestOnly } = req.query;
    const where = {};
    if (materialId) where.materialId = materialId;
    if (startDate) where.calculatedAt = { ...where.calculatedAt, gte: new Date(startDate) };
    if (endDate) where.calculatedAt = { ...where.calculatedAt, lte: new Date(endDate + 'T23:59:59') };

    // 默认只展示最新一次计算批次的结果
    if (latestOnly !== 'false' && !startDate && !endDate) {
      const latestBatch = await prisma.productLossRecord.findFirst({
        where: materialId ? { materialId } : {},
        orderBy: { calculatedAt: 'desc' },
        select: { calculatedAt: true },
      });
      if (latestBatch) {
        where.calculatedAt = latestBatch.calculatedAt;
      }
    }

    const [list, total] = await Promise.all([
      prisma.productLossRecord.findMany({
        where,
        orderBy: { calculatedAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      prisma.productLossRecord.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 查询产品损耗明细（某物料的全量出入库记录）
router.get('/product-loss/:id/detail', async (req, res, next) => {
  try {
    const record = await prisma.productLossRecord.findUnique({ where: { id: req.params.id } });
    if (!record) return res.status(404).json({ success: false, message: '记录不存在' });

    // 入库明细
    const inbound = await prisma.stockMovement.findMany({
      where: { materialId: record.materialId, direction: 'IN' },
      orderBy: { movementDate: 'asc' },
      include: { warehouse: { select: { id: true, name: true } }, batch: { select: { batchNo: true } } },
    });
    const inboundList = inbound.map(m => ({
      ...m,
      warehouseName: m.warehouse?.name || '-',
      batchNo: m.batch?.batchNo || '-',
      warehouse: undefined, batch: undefined,
    }));

    // 业务出库明细（排除盘点调整）
    const outbound = await prisma.stockMovement.findMany({
      where: { materialId: record.materialId, direction: 'OUT', movementType: { not: 'STOCK_TAKE_ADJUST' } },
      orderBy: { movementDate: 'asc' },
      include: { warehouse: { select: { id: true, name: true } } },
    });
    const outboundList = outbound.map(m => ({
      ...m,
      warehouseName: m.warehouse?.name || '-',
      warehouse: undefined,
    }));

    // 盘点调整明细（计算每条的调整后库存）
    const adjustments = await prisma.stockMovement.findMany({
      where: { materialId: record.materialId, movementType: 'STOCK_TAKE_ADJUST' },
      orderBy: { movementDate: 'asc' },
      include: { warehouse: { select: { id: true, name: true } } },
    });
    // 计算每条盘点调整的调整后库存：从当前实存倒推
    // 调整后库存 = 前一条调整后库存 - 本条调整数量（因为adjust是出库，qty>0表示盘亏减少库存）
    const actualQty = Number(record.actualQty || 0);
    let runningBalance = actualQty;
    const adjustmentsList = adjustments.reverse().map(m => {
      // 倒序处理：当前余额就是这条调整"之后"的库存
      const afterQty = runningBalance;
      // 这条调整之前的库存 = 之后库存 + 调整数量（出库qty>0表示减了多少就加回来）
      runningBalance = Number((runningBalance + Number(m.qty || 0)).toFixed(2));
      return {
        ...m,
        warehouseName: m.warehouse?.name || '-',
        afterQty,
        warehouse: undefined,
      };
    }).reverse(); // 恢复正序

    res.json({
      success: true,
      data: {
        summary: {
          materialName: record.materialName,
          expectedQty: Number(record.expectedQty),
          actualQty: Number(record.actualQty),
          lossQty: Number(record.lossQty),
          lossRate: Number(record.lossRate),
          cumulativeLossRate: Number(record.cumulativeLossRate),
          lossAmount: Number(record.lossAmount),
          weightedAvgPrice: Number(record.weightedAvgPrice),
          inboundQty: Number(record.inboundQty),
          outboundQty: Number(record.outboundQty),
        },
        inbound: inboundList,
        outbound: outboundList,
        adjustments: adjustmentsList,
      },
    });
  } catch (err) { next(err); }
});

// 手动触发产品损耗计算
router.post('/product-loss/recalculate', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_MANAGER, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    // 获取所有物料库存（包括 qty=0 的也要算，否则看不到有损耗的物料）
    const inventories = await prisma.inventory.findMany({
      include: { material: true },
    });

    // 获取最新成本价记录以获取加权平均价
    const latestCostPrices = await prisma.$queryRawUnsafe(`
      SELECT cp.materialId, cp.weightedAvgPrice
      FROM cost_price_records cp
      INNER JOIN (
        SELECT materialId, MAX(calculatedAt) AS maxDate
        FROM cost_price_records
        GROUP BY materialId
      ) latest ON cp.materialId = latest.materialId AND cp.calculatedAt = latest.maxDate
    `);
    const priceMap = {};
    for (const r of latestCostPrices) {
      priceMap[r.materialId] = Number(r.weightedAvgPrice) || 0;
    }

    // 全量汇总：所有入库、所有出库（排除盘点调整）
    // 账面数量 = 总入库 - 业务出库(不含盘点调整)
    // 实存数量 = 当前库存qty（已包含盘点调整后的值）
    // 损耗 = 账面 - 实存
    const now = new Date();
    let calculated = 0;

    // 确定当前月周期：每月29号到次月28号
    // 如果now的日期>=29，当前周期起点是本月29号；否则是上月29号
    const currentDay = now.getDate();
    let periodStart, periodEnd;
    if (currentDay >= 29) {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 29);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 28);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 29);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 28);
    }

    for (const inv of inventories) {
      // 全量入库汇总（所有时间、所有类型）
      const totalInboundResult = await prisma.stockMovement.aggregate({
        where: { materialId: inv.materialId, direction: 'IN' },
        _sum: { qty: true },
      });
      const inboundQty = Number(totalInboundResult._sum.qty || 0);

      // 全量出库汇总（排除盘点调整，因为盘点差异本身就是损耗）
      const totalOutboundResult = await prisma.stockMovement.aggregate({
        where: { materialId: inv.materialId, direction: 'OUT', movementType: { not: 'STOCK_TAKE_ADJUST' } },
        _sum: { qty: true },
      });
      const outboundQty = Number(totalOutboundResult._sum.qty || 0);

      // 账面数量 = 入库 - 出库（假设期初为0，系统上线后纯增量模式）
      const expectedQty = Number((inboundQty - outboundQty).toFixed(2));
      const actualQty = Number(Number(inv.qty || 0).toFixed(2));
      const lossQty = Number((expectedQty - actualQty).toFixed(2));
      // 损耗率：从最新盘点记录直接取（|diffQty| / bookQty × 100）
      // 查找该物料最新一条已完成的盘点记录
      const latestStockTakeItem = await prisma.stockTakeItem.findFirst({
        where: {
          materialId: inv.materialId,
          stockTake: { status: 'COMPLETED' },
        },
        orderBy: { countedAt: 'desc' },
        select: { bookQty: true, actualQty: true, diffQty: true },
      });
      const latestLossQty = Number(latestStockTakeItem?.diffQty || 0);
      const latestBookQty = Number(latestStockTakeItem?.bookQty || 0);
      const lossRate = latestBookQty > 0
        ? Number((Math.abs(latestLossQty) / latestBookQty * 100).toFixed(2))
        : (latestLossQty > 0 ? 999 : 0);

      // 累计损耗率：全量累计（损耗数量 / 账面数量 × 100）
      const cumulativeLossRate = expectedQty > 0
        ? Number((lossQty / expectedQty * 100).toFixed(2))
        : (lossQty > 0 ? 999 : 0);

      await prisma.productLossRecord.create({
        data: {
          materialId: inv.materialId,
          materialName: inv.material?.name || '-',
          beginningQty: 0,
          inboundQty,
          outboundQty,
          expectedQty,
          actualQty,
          lossQty,
          lossRate,
          cumulativeLossRate,
          lossAmount: 0,
          weightedAvgPrice: 0,
          periodStart,
          periodEnd,
          calculatedAt: now,
        },
      });
      calculated++;
    }

    res.json({ success: true, message: `产品损耗计算完成: 计算 ${calculated} 个物料` });
  } catch (err) { next(err); }
});

// ============================================================
// 出入库记录
// ============================================================

router.get('/movements', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 50, keyword = '', warehouseId = '', movementType = '', direction = '' } = req.query;
    const where = {};
    if (keyword) where.OR = [{ movementNo: { contains: keyword } }];
    if (warehouseId) where.warehouseId = warehouseId;
    if (movementType) where.movementType = movementType;
    if (direction) where.direction = direction;

    const [list, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, code: true, name: true } },
          material: { select: { id: true, code: true, name: true, unit: true, spec: true, salesUnit: true, salesConversionFactor: true, purchaseUnit: true } },
          batch: { select: { id: true, batchNo: true } },
          grade: { select: { id: true, code: true, name: true } },
          operator: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { movementDate: 'desc' },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    // 对于采购入库记录，关联查询采购单价和采购金额
    const receiptIds = list.filter(m => m.refType === 'PURCHASE_RECEIPT' && m.refId).map(m => m.refId);
    if (receiptIds.length) {
      const receiptItems = await prisma.purchaseReceiptItem.findMany({
        where: { receiptId: { in: receiptIds } },
        select: { receiptId: true, materialId: true, unitPrice: true, totalAmount: true },
      });
      const itemMap = {};
      receiptItems.forEach(ri => {
        itemMap[`${ri.receiptId}_${ri.materialId}`] = { unitPrice: Number(ri.unitPrice), totalAmount: Number(ri.totalAmount) };
      });
      list.forEach(m => {
        if (m.refType === 'PURCHASE_RECEIPT' && m.refId) {
          const match = itemMap[`${m.refId}_${m.materialId}`];
          if (match) {
            m.unitPrice = match.unitPrice;
            m.totalAmount = match.totalAmount;
          }
        }
      });
    }
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 手动出入库
router.post('/movements', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const { warehouseId, locationId, materialId, batchId, gradeId, movementType, direction, qty, remark } = req.body;
    if (!warehouseId || !materialId || !direction || !qty) {
      return res.status(400).json({ success: false, message: '仓库、物料、方向、数量必填' });
    }

    const movementNo = genNo('SM');

    // 更新库存
    const invWhere = { materialId_warehouseId: { materialId, warehouseId } };
    if (direction === 'IN') {
      await prisma.inventory.upsert({
        where: invWhere,
        create: { materialId, warehouseId, locationId: locationId || null, qty, lockedQty: 0 },
        update: { qty: { increment: qty } },
      });
    } else {
      // OUT: 检查库存是否足够
      const inv = await prisma.inventory.findUnique({ where: invWhere });
      if (!inv || inv.qty < qty) {
        return res.status(400).json({ success: false, message: '库存不足' });
      }
      await prisma.inventory.update({
        where: invWhere,
        data: { qty: { decrement: qty } },
      });
    }

    // 创建移动记录
    const movement = await prisma.stockMovement.create({
      data: {
        movementNo,
        warehouseId,
        locationId: locationId || null,
        materialId,
        batchId: batchId || null,
        gradeId: gradeId || null,
        movementType: movementType || (direction === 'IN' ? 'MANUAL_IN' : 'MANUAL_OUT'),
        direction,
        qty,
        movementDate: new Date(),
        refType: 'MANUAL',
        operatorId: req.user.employeeId || null,
        remark: remark || null,
      },
    });

    // 如果有批次，更新批次剩余数量 + 创建追溯记录
    if (batchId) {
      if (direction === 'OUT') {
        await prisma.batch.update({
          where: { id: batchId },
          data: { remainingQty: { decrement: qty } },
        });
      }
      await prisma.batchTracking.create({
        data: {
          batchId,
          movementType: movementType || (direction === 'IN' ? 'MANUAL_IN' : 'MANUAL_OUT'),
          refType: 'STOCK_MOVEMENT',
          refId: movement.id,
          fromLocation: direction === 'OUT' ? (locationId || null) : null,
          toLocation: direction === 'IN' ? (locationId || null) : null,
          qty,
          operatorId: req.user.employeeId || null,
          remark: remark || null,
        },
      });
    }

    res.json({ success: true, data: movement });
  } catch (err) { next(err); }
});

// ============================================================
// 盘点管理
// ============================================================

// 盘点列表
router.get('/stock-takes', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '', warehouseId = '' } = req.query;
    const where = {};
    if (keyword) where.OR = [{ takeNo: { contains: keyword } }];
    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;

    const [list, total] = await Promise.all([
      prisma.stockTake.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          zone: { select: { id: true, name: true, code: true } },
          creator: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockTake.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 盘点详情
router.get('/stock-takes/:id', async (req, res, next) => {
  try {
    const stockTake = await prisma.stockTake.findUnique({
      where: { id: req.params.id },
      include: {
        warehouse: true,
        zone: true,
        creator: { select: { id: true, name: true } },
        items: {
          include: {
            material: { select: { id: true, code: true, name: true, unit: true } },
            batch: { select: { id: true, batchNo: true } },
            location: { select: { id: true, code: true, name: true } },
            counter: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!stockTake) return res.status(404).json({ success: false, message: '盘点单不存在' });
    res.json({ success: true, data: stockTake });
  } catch (err) { next(err); }
});

// 创建盘点单（自动生成明细项：根据仓库当前库存）
router.post('/stock-takes', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const { warehouseId, zoneId, takeType, planDate, remark } = req.body;
    if (!warehouseId) return res.status(400).json({ success: false, message: '仓库必填' });

    const takeNo = genNo('ST');

    // 获取仓库当前库存作为账面数量
    const inventory = await prisma.inventory.findMany({
      where: { warehouseId, ...(zoneId ? { location: { zoneId } } : {}) },
      include: { material: true, location: true },
    });

    const stockTake = await prisma.stockTake.create({
      data: {
        takeNo,
        warehouseId,
        zoneId: zoneId || null,
        takeType: takeType || 'FULL',
        status: 'DRAFT',
        planDate: planDate ? new Date(planDate) : null,
        creatorId: req.user.employeeId || null,
        totalItems: inventory.length,
        remark: remark || null,
        items: {
          create: inventory.map((inv) => ({
            materialId: inv.materialId,
            locationId: inv.locationId,
            bookQty: inv.qty,
            actualQty: inv.qty,
            diffQty: 0,
            status: 'PENDING',
          })),
        },
      },
      include: { items: true },
    });
    res.json({ success: true, data: stockTake });
  } catch (err) { next(err); }
});

// 提交盘点单（变为COUNTING状态）
router.put('/stock-takes/:id/submit', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const st = await prisma.stockTake.findUnique({ where: { id: req.params.id } });
    if (!st) return res.status(404).json({ success: false, message: '盘点单不存在' });
    if (st.status !== 'DRAFT') return res.status(400).json({ success: false, message: '仅草稿状态可提交' });
    const updated = await prisma.stockTake.update({
      where: { id: req.params.id },
      data: { status: 'COUNTING' },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// 录入盘点结果（批量更新明细）
router.put('/stock-takes/:id/count', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!items || !items.length) return res.status(400).json({ success: false, message: '至少一条明细' });

    let diffCount = 0;
    for (const it of items) {
      const actualQty = Number(it.actualQty) || 0;
      const bookQty = Number(it.bookQty) || 0;
      const diffQty = actualQty - bookQty;
      if (diffQty !== 0) diffCount++;
      await prisma.stockTakeItem.update({
        where: { id: it.id },
        data: {
          actualQty,
          diffQty,
          diffReason: it.diffReason || null,
          status: 'COUNTED',
          counterId: req.user.employeeId || null,
          countedAt: new Date(),
        },
      });
    }

    await prisma.stockTake.update({
      where: { id: req.params.id },
      data: { diffItems: diffCount },
    });
    res.json({ success: true, message: `录入完成，差异项 ${diffCount} 条` });
  } catch (err) { next(err); }
});

// 完成盘点（审批+调整库存）
router.put('/stock-takes/:id/complete', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const st = await prisma.stockTake.findUnique({
      where: { id: req.params.id },
      include: { items: true, warehouse: true },
    });
    if (!st) return res.status(404).json({ success: false, message: '盘点单不存在' });
    if (st.status !== 'COUNTING') return res.status(400).json({ success: false, message: '仅盘点中状态可完成' });

    // 调整库存
    for (const item of st.items) {
      if (item.diffQty !== 0) {
        const invWhere = { materialId_warehouseId: { materialId: item.materialId, warehouseId: st.warehouseId } };
        const inv = await prisma.inventory.findUnique({ where: invWhere });
        if (inv) {
          await prisma.inventory.update({
            where: invWhere,
            data: { qty: item.actualQty },
          });
          // 记录调整移动
          await prisma.stockMovement.create({
            data: {
              movementNo: genNo('SM'),
              warehouseId: st.warehouseId,
              locationId: item.locationId,
              materialId: item.materialId,
              batchId: item.batchId,
              movementType: 'STOCK_TAKE_ADJUST',
              direction: item.diffQty > 0 ? 'IN' : 'OUT',
              qty: Math.abs(item.diffQty),
              movementDate: new Date(),
              refType: 'STOCK_TAKE',
              refId: st.id,
              operatorId: req.user.employeeId || null,
              remark: `盘点调整 ${st.takeNo}`,
            },
          });
        }
      }
      // 更新明细状态
      await prisma.stockTakeItem.update({
        where: { id: item.id },
        data: { status: 'ADJUSTED' },
      });
    }

    const updated = await prisma.stockTake.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED', completedDate: new Date() },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// 删除盘点单（仅DRAFT）
router.delete('/stock-takes/:id', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const st = await prisma.stockTake.findUnique({ where: { id: req.params.id } });
    if (!st) return res.status(404).json({ success: false, message: '盘点单不存在' });
    if (st.status !== 'DRAFT') return res.status(400).json({ success: false, message: '仅草稿状态可删除' });
    await prisma.stockTake.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

export default router;
