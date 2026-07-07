import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import prisma from '../../shared/prisma.js';

const router = Router();
router.use(authenticate);

function genNo(prefix) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${ymd}${rand}`;
}

// ============================================================
// 数据分析看板
// ============================================================
router.get('/analytics', async (req, res, next) => {
  try {
    // 采购统计
    const purchaseStats = await prisma.purchaseOrder.aggregate({
      _sum: { grandTotal: true },
      _count: true,
      where: { status: { not: 'CANCELLED' } },
    });
    const purchaseCount = await prisma.purchaseOrder.count({ where: { status: { not: 'CANCELLED' } } });

    // 销售统计
    const salesStats = await prisma.salesOrder.aggregate({
      _sum: { grandTotal: true },
      _count: true,
      where: { status: { not: 'CANCELLED' } },
    });
    const salesCount = await prisma.salesOrder.count({ where: { status: { not: 'CANCELLED' } } });

    // 库存统计
    const inventoryStats = await prisma.inventory.aggregate({
      _sum: { qty: true },
      _count: true,
    });

    // 应收应付
    const arStats = await prisma.accountsReceivable.aggregate({
      _sum: { balance: true },
      _count: true,
      where: { status: { in: ['PENDING', 'PARTIAL'] } },
    });
    const apStats = await prisma.accountsPayable.aggregate({
      _sum: { balance: true },
      _count: true,
      where: { status: { in: ['PENDING', 'PARTIAL'] } },
    });

    // 批次统计
    const batchCount = await prisma.batch.count({ where: { status: 'ACTIVE' } });
    const expiringBatches = await prisma.batch.count({
      where: {
        status: 'ACTIVE',
        expiryDate: { lte: new Date(Date.now() + 30 * 86400000) },
      },
    });

    // 供应商/客户数
    const supplierCount = await prisma.supplier.count({ where: { status: 'ACTIVE' } });
    const customerCount = await prisma.customer.count({ where: { status: 'ACTIVE' } });

    // 近30天采购/销售趋势
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const recentPurchases = await prisma.purchaseOrder.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } },
      select: { createdAt: true, grandTotal: true },
      orderBy: { createdAt: 'asc' },
    });
    const recentSales = await prisma.salesOrder.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } },
      select: { createdAt: true, grandTotal: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: {
        purchase: { totalAmount: purchaseStats._sum.grandTotal || 0, count: purchaseCount },
        sales: { totalAmount: salesStats._sum.grandTotal || 0, count: salesCount },
        inventory: { totalQty: inventoryStats._sum.qty || 0, skuCount: inventoryStats._count },
        receivable: { totalBalance: arStats._sum.balance || 0, count: arStats._count },
        payable: { totalBalance: apStats._sum.balance || 0, count: apStats._count },
        batch: { activeCount: batchCount, expiringCount: expiringBatches },
        master: { supplierCount, customerCount },
        trend: {
          purchases: recentPurchases.map(p => ({ date: p.createdAt, amount: p.grandTotal })),
          sales: recentSales.map(s => ({ date: s.createdAt, amount: s.grandTotal })),
        },
      },
    });
  } catch (err) { next(err); }
});

// ============================================================
// 预警中心
// ============================================================
// 告警规则列表
router.get('/alert-rules', async (req, res, next) => {
  try {
    const list = await prisma.alertRule.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});

router.post('/alert-rules', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { ruleName, ruleType, targetType, conditionConfig, notifyRoles } = req.body;
    const rule = await prisma.alertRule.create({
      data: { ruleName, ruleType, targetType: targetType || null, conditionConfig: conditionConfig || null, notifyRoles: notifyRoles || null },
    });
    res.json({ success: true, data: rule });
  } catch (err) { next(err); }
});

// 告警记录列表
router.get('/alerts', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, status = '', alertType = '', severity = '' } = req.query;
    const where = {};
    if (status) where.status = status;
    if (alertType) where.alertType = alertType;
    if (severity) where.severity = severity;
    const [list, total] = await Promise.all([
      prisma.alertRecord.findMany({
        where,
        include: {
          rule: { select: { id: true, ruleName: true } },
          targetUser: { select: { id: true, username: true } },
          resolver: { select: { id: true, username: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.alertRecord.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 创建告警
router.post('/alerts', async (req, res, next) => {
  try {
    const { ruleId, alertType, severity, title, content, refType, refId, targetUserId } = req.body;
    const alert = await prisma.alertRecord.create({
      data: {
        ruleId: ruleId || null,
        alertType: alertType || 'SYSTEM',
        severity: severity || 'WARNING',
        title,
        content: content || null,
        refType: refType || null,
        refId: refId || null,
        targetUserId: targetUserId || null,
        status: 'ACTIVE',
      },
    });
    res.json({ success: true, data: alert });
  } catch (err) { next(err); }
});

// 解决告警
router.put('/alerts/:id/resolve', async (req, res, next) => {
  try {
    const alert = await prisma.alertRecord.update({
      where: { id: req.params.id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: req.user.userId,
      },
    });
    res.json({ success: true, data: alert });
  } catch (err) { next(err); }
});

// ============================================================
// 供应商评估
// ============================================================
router.get('/supplier-evals', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, supplierId = '', evalPeriod = '', sort = 'totalScore', order = 'desc' } = req.query;
    const where = {};
    if (supplierId) where.supplierId = supplierId;
    if (evalPeriod) where.evalPeriod = evalPeriod;
    const validSorts = ['totalScore', 'deliveryOnTimeRate', 'qualityPassRate', 'priceCompetitiveness', 'serviceResponse', 'createdAt'];
    const sortField = validSorts.includes(sort) ? sort : 'totalScore';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';
    const [list, total] = await Promise.all([
      prisma.supplierEvaluation.findMany({
        where,
        include: {
          supplier: { select: { id: true, code: true, name: true } },
          evaluator: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { [sortField]: sortOrder },
      }),
      prisma.supplierEvaluation.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

router.post('/supplier-evals', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const { supplierId, evalPeriod, deliveryOnTimeRate, qualityPassRate, priceCompetitiveness, serviceResponse, evalRemark } = req.body;
    if (!supplierId || !evalPeriod) return res.status(400).json({ success: false, message: '供应商和评估周期必填' });

    // 计算总分（加权平均）40/30/20/10
    const totalScore = (
      (deliveryOnTimeRate || 0) * 0.4 +
      (qualityPassRate || 0) * 0.3 +
      (priceCompetitiveness || 0) * 0.2 +
      (serviceResponse || 0) * 0.1
    );

    const eval_ = await prisma.supplierEvaluation.create({
      data: {
        supplierId,
        evalPeriod,
        deliveryOnTimeRate: deliveryOnTimeRate || 0,
        qualityPassRate: qualityPassRate || 0,
        priceCompetitiveness: priceCompetitiveness || 0,
        serviceResponse: serviceResponse || 0,
        totalScore,
        evalRemark: evalRemark || null,
        evaluatorId: req.user.employeeId || null,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: eval_ });
  } catch (err) { next(err); }
});

// ============================================================
// 供应商自动评估 — 按月自动取数计算
// ============================================================
router.post('/supplier-evals/auto-calculate', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const { evalPeriod } = req.body; // 如 "2026-06"
    if (!evalPeriod || !/^\d{4}-\d{2}$/.test(evalPeriod)) {
      return res.status(400).json({ success: false, message: '评估周期格式应为 YYYY-MM，如 2026-06' });
    }

    // 解析月份范围
    const [year, month] = evalPeriod.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1); // 下月1号

    // 查所有活跃供应商
    const suppliers = await prisma.supplier.findMany({ where: { status: 'ACTIVE' } });
    const results = [];

    for (const supplier of suppliers) {
      // ===== 1. 准时交付率 (40%) =====
      // 查该供应商在评估周期内的所有采购订单（含收货单）
      // 注意：不能用 receiptStatus 过滤，因为该字段可能未及时更新
      const orders = await prisma.purchaseOrder.findMany({
        where: {
          supplierId: supplier.id,
          createdAt: { gte: startDate, lt: endDate },
        },
        include: { receipts: { select: { receiptDate: true }, orderBy: { receiptDate: 'asc' } } },
      });

      // 只统计有实际收货日期的订单（已交付的）
      const deliveredOrders = orders.filter(o => o.receipts.some(r => r.receiptDate));
      let deliveryScore = 0;
      let deliveryDetail = null;
      if (deliveredOrders.length > 0) {
        let onTimeCount = 0;
        const orderDetails = [];
        for (const order of deliveredOrders) {
          // 取最早的收货日期作为实际交付日期
          const actualDate = order.receipts.find(r => r.receiptDate)?.receiptDate;
          const expectedDate = order.expectedDate;
          let isOnTime = false;
          if (actualDate && expectedDate) {
            isOnTime = new Date(actualDate) <= new Date(expectedDate);
          }
          if (isOnTime) onTimeCount++;
          orderDetails.push({
            orderNo: order.orderNo,
            expectedDate: expectedDate ? new Date(expectedDate).toISOString().slice(0, 10) : null,
            actualDate: actualDate ? new Date(actualDate).toISOString().slice(0, 10) : null,
            onTime: isOnTime,
          });
        }
        deliveryScore = (onTimeCount / deliveredOrders.length) * 100;
        deliveryDetail = {
          totalOrders: deliveredOrders.length,
          onTimeOrders: onTimeCount,
          rate: deliveryScore.toFixed(1) + '%',
          orders: orderDetails,
        };
      }

      // ===== 2. 质量合格率 (30%) =====
      // 按收货明细行 PurchaseReceiptItem 计算
      // PASS / INSPECTED → 合格；FAIL → 不合格；PENDING → 跳过（未质检）
      const receiptItems = await prisma.purchaseReceiptItem.findMany({
        where: {
          receipt: {
            purchaseOrder: { supplierId: supplier.id },
            createdAt: { gte: startDate, lt: endDate },
          },
        },
        include: { material: { select: { name: true } } },
      });

      let qualityScore = 0;
      let qualityDetail = null;
      const evaluatedItems = receiptItems.filter(r => r.qcResult && r.qcResult !== 'PENDING');
      if (evaluatedItems.length > 0) {
        const passCount = evaluatedItems.filter(r => ['PASS', 'INSPECTED'].includes(r.qcResult)).length;
        const failCount = evaluatedItems.filter(r => r.qcResult === 'FAIL').length;
        qualityScore = (passCount / evaluatedItems.length) * 100;
        const itemDetails = evaluatedItems.map(r => ({
          materialName: r.material?.name || '未知物料',
          receivedQty: r.receivedQty,
          qcResult: r.qcResult,
          pass: ['PASS', 'INSPECTED'].includes(r.qcResult),
        }));
        qualityDetail = {
          totalChecks: evaluatedItems.length,
          passCount,
          failCount,
          pendingCount: receiptItems.length - evaluatedItems.length,
          rate: qualityScore.toFixed(1) + '%',
          items: itemDetails,
        };
      }

      // ===== 3. 价格竞争力 (20%) — 精确版 =====
      // 取该供应商供应的物料，与同期其他供应商同物料价格对比
      const myItems = await prisma.purchaseOrderItem.findMany({
        where: {
          order: {
            supplierId: supplier.id,
            createdAt: { gte: startDate, lt: endDate },
          },
        },
        select: { materialId: true, unitPrice: true, order: { select: { supplierId: true } } },
      });

      let priceScore = 0;
      let priceDetail = null;
      if (myItems.length > 0) {
        // 按物料分组，算该供应商的均价
        const myMaterialPrices = {};
        for (const item of myItems) {
          if (!myMaterialPrices[item.materialId]) myMaterialPrices[item.materialId] = [];
          myMaterialPrices[item.materialId].push(Number(item.unitPrice));
        }

        // 取同期所有供应商的同类物料价格
        const allItems = await prisma.purchaseOrderItem.findMany({
          where: {
            materialId: { in: Object.keys(myMaterialPrices) },
            order: { createdAt: { gte: startDate, lt: endDate } },
          },
          select: { materialId: true, unitPrice: true, order: { select: { supplierId: true } } },
        });

        // 按物料分组，算市场均价/最低/最高
        const marketPrices = {};
        for (const item of allItems) {
          if (!marketPrices[item.materialId]) marketPrices[item.materialId] = [];
          marketPrices[item.materialId].push(Number(item.unitPrice));
        }

        let totalScoreSum = 0;
        let materialCount = 0;
        const materialDetails = [];
        for (const [materialId, myPrices] of Object.entries(myMaterialPrices)) {
          const myAvg = myPrices.reduce((a, b) => a + b, 0) / myPrices.length;
          const marketAll = marketPrices[materialId] || [];
          if (marketAll.length === 0) continue;
          const marketMin = Math.min(...marketAll);
          const marketMax = Math.max(...marketAll);
          const marketAvg = marketAll.reduce((a, b) => a + b, 0) / marketAll.length;

          // 精确版：线性打分
          // 如果 myAvg <= marketMin → 100 分
          // 如果 myAvg >= marketMax → 0 分
          // 中间线性插值
          let matScore;
          if (marketMax === marketMin) {
            matScore = myAvg <= marketAvg ? 100 : 50;
          } else {
            matScore = ((marketMax - myAvg) / (marketMax - marketMin)) * 100;
            matScore = Math.max(0, Math.min(100, matScore));
          }
          totalScoreSum += matScore;
          materialCount++;
          materialDetails.push({
            materialId,
            myAvgPrice: myAvg.toFixed(2),
            marketMin: marketMin.toFixed(2),
            marketMax: marketMax.toFixed(2),
            marketAvg: marketAvg.toFixed(2),
            score: matScore.toFixed(1),
          });
        }
        if (materialCount > 0) {
          priceScore = totalScoreSum / materialCount;
        }
        // 批量查物料名称，补入明细
        const materialIds = materialDetails.map(m => m.materialId);
        const materials = await prisma.material.findMany({
          where: { id: { in: materialIds } },
          select: { id: true, name: true },
        });
        const matNameMap = {};
        for (const m of materials) matNameMap[m.id] = m.name;
        for (const md of materialDetails) {
          md.materialName = matNameMap[md.materialId] || '未知物料';
        }
        priceDetail = {
          materialCount,
          avgScore: priceScore.toFixed(1),
          materials: materialDetails,
        };
      }

      // ===== 4. 服务响应 (10%) — 平均收货天数 =====
      // 基准天数7天，实际天数 ≤ 7 → 100分，> 7 → 7/actual × 100
      // 使用有收货日期的订单计算
      const BASELINE_DAYS = 7;
      let serviceScore = 0;
      let serviceDetail = null;
      if (deliveredOrders.length > 0) {
        const responseDays = [];
        for (const order of deliveredOrders) {
          const actualDate = order.receipts.find(r => r.receiptDate)?.receiptDate;
          if (actualDate) {
            const days = (new Date(actualDate) - new Date(order.createdAt)) / (1000 * 60 * 60 * 24);
            responseDays.push(Math.max(0, days));
          }
        }
        if (responseDays.length > 0) {
          const avgDays = responseDays.reduce((a, b) => a + b, 0) / responseDays.length;
          serviceScore = avgDays <= BASELINE_DAYS ? 100 : (BASELINE_DAYS / avgDays) * 100;
          serviceScore = Math.max(0, Math.min(100, serviceScore));
          serviceDetail = {
            avgResponseDays: avgDays.toFixed(1),
            baselineDays: BASELINE_DAYS,
            scoredOrders: responseDays.length,
            score: serviceScore.toFixed(1),
          };
        }
      }

      // 如果该供应商在评估周期内没有任何数据，跳过
      if (orders.length === 0 && receiptItems.length === 0 && myItems.length === 0) continue;

      const totalScore = (
        deliveryScore * 0.4 +
        qualityScore * 0.3 +
        priceScore * 0.2 +
        serviceScore * 0.1
      );

      // upsert（同供应商+同周期唯一）
      const eval_ = await prisma.supplierEvaluation.upsert({
        where: { supplierId_evalPeriod: { supplierId: supplier.id, evalPeriod } },
        update: {
          deliveryOnTimeRate: deliveryScore,
          qualityPassRate: qualityScore,
          priceCompetitiveness: priceScore,
          serviceResponse: serviceScore,
          totalScore,
          deliveryDetail,
          qualityDetail,
          priceDetail,
          serviceDetail,
          evaluatorId: req.user.employeeId || null,
        },
        create: {
          supplierId: supplier.id,
          evalPeriod,
          deliveryOnTimeRate: deliveryScore,
          qualityPassRate: qualityScore,
          priceCompetitiveness: priceScore,
          serviceResponse: serviceScore,
          totalScore,
          deliveryDetail,
          qualityDetail,
          priceDetail,
          serviceDetail,
          evaluatorId: req.user.employeeId || null,
        },
      });

      results.push({
        supplierName: supplier.name,
        supplierCode: supplier.code,
        deliveryScore: deliveryScore.toFixed(1),
        qualityScore: qualityScore.toFixed(1),
        priceScore: priceScore.toFixed(1),
        serviceScore: serviceScore.toFixed(1),
        totalScore: totalScore.toFixed(1),
      });
    }

    res.json({
      success: true,
      data: { evalPeriod, evaluatedCount: results.length, results },
      message: `评估完成，共评估 ${results.length} 家供应商`,
    });
  } catch (err) { next(err); }
});

// ============================================================
// 供应商评估导出 Excel
// ============================================================
router.get('/supplier-evals/export', async (req, res, next) => {
  try {
    const { evalPeriod = '' } = req.query;
    const where = {};
    if (evalPeriod) where.evalPeriod = evalPeriod;
    const list = await prisma.supplierEvaluation.findMany({
      where,
      include: { supplier: { select: { code: true, name: true } } },
      orderBy: { totalScore: 'desc' },
    });

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('供应商评估');
    ws.columns = [
      { header: '排名', key: 'rank', width: 8 },
      { header: '供应商编码', key: 'code', width: 15 },
      { header: '供应商名称', key: 'name', width: 25 },
      { header: '评估周期', key: 'evalPeriod', width: 12 },
      { header: '准时交付率(40%)', key: 'delivery', width: 18 },
      { header: '质量合格率(30%)', key: 'quality', width: 18 },
      { header: '价格竞争力(20%)', key: 'price', width: 18 },
      { header: '服务响应(10%)', key: 'service', width: 18 },
      { header: '总分', key: 'total', width: 10 },
      { header: '等级', key: 'grade', width: 10 },
    ];
    ws.getRow(1).font = { bold: true };

    list.forEach((row, idx) => {
      const score = Number(row.totalScore);
      const grade = score >= 85 ? '优秀' : score >= 70 ? '良好' : '不合格';
      ws.addRow({
        rank: idx + 1,
        code: row.supplier?.code || '',
        name: row.supplier?.name || '',
        evalPeriod: row.evalPeriod,
        delivery: Number(row.deliveryOnTimeRate).toFixed(1),
        quality: Number(row.qualityPassRate).toFixed(1),
        price: Number(row.priceCompetitiveness).toFixed(1),
        service: Number(row.serviceResponse).toFixed(1),
        total: score.toFixed(1),
        grade,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=supplier-eval-${evalPeriod || 'all'}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

export default router;
