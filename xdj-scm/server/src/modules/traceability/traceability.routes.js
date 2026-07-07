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
// 批次管理
// ============================================================

// 批次列表
router.get('/batches', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 50, keyword = '', status = '', materialId = '', supplierId = '', expiringDays = '' } = req.query;
    const where = {};
    if (keyword) where.OR = [{ batchNo: { contains: keyword } }];
    if (status) where.status = status;
    if (materialId) where.materialId = materialId;
    if (supplierId) where.supplierId = supplierId;

    // 临期预警
    if (expiringDays) {
      const days = Number(expiringDays);
      const future = new Date(Date.now() + days * 86400000);
      where.expiryDate = { lte: future, gte: new Date() };
    }

    const [list, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        include: {
          material: { select: { id: true, code: true, name: true, spec: true, unit: true, shelfLifeDays: true } },
          supplier: { select: { id: true, code: true, name: true } },
          _count: { select: { trackings: true, stockMovements: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.batch.count({ where }),
    ]);

    // 计算临期状态
    const now = new Date();
    const enriched = list.map((b) => {
      let expiryStatus = 'NORMAL';
      if (b.expiryDate) {
        const daysLeft = Math.ceil((new Date(b.expiryDate) - now) / 86400000);
        if (daysLeft < 0) expiryStatus = 'EXPIRED';
        else if (daysLeft <= 7) expiryStatus = 'CRITICAL';
        else if (daysLeft <= 30) expiryStatus = 'WARNING';
      }
      return { ...b, daysLeft: b.expiryDate ? Math.ceil((new Date(b.expiryDate) - now) / 86400000) : null, expiryStatus };
    });

    res.json({ success: true, data: { list: enriched, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 批次详情（含完整追溯链）
router.get('/batches/:id', async (req, res, next) => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: {
        material: true,
        supplier: { select: { id: true, code: true, name: true, contactPerson: true, contactPhone: true } },
        purchaseReceipt: {
          include: {
            purchaseOrder: { include: { supplier: true } },
            warehouse: true,
          },
        },
        trackings: {
          include: {
            operator: { select: { id: true, name: true } },
            customer: { select: { id: true, code: true, name: true, contactPerson: true, contactPhone: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        stockMovements: {
          include: {
            warehouse: { select: { id: true, name: true } },
            location: { select: { id: true, code: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        recallOrders: true,
      },
    });
    if (!batch) return res.status(404).json({ success: false, message: '批次不存在' });
    res.json({ success: true, data: batch });
  } catch (err) { next(err); }
});

// 更新批次状态
router.put('/batches/:id/status', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_STAFF, ROLES.QUALITY_STAFF), async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ['ACTIVE', 'FROZEN', 'EXPIRED', 'RECALLED', 'CONSUMED'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: '无效状态' });
    const batch = await prisma.batch.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ success: true, data: batch });
  } catch (err) { next(err); }
});

// ============================================================
// 批次追溯
// ============================================================

// 正向追溯：批次 → 流向（库存移动+销售出库+客户）
router.get('/trace/:batchId/forward', async (req, res, next) => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.batchId },
      include: {
        material: { select: { id: true, code: true, name: true, spec: true, unit: true } },
        supplier: { select: { id: true, code: true, name: true } },
      },
    });
    if (!batch) return res.status(404).json({ success: false, message: '批次不存在' });

    // 获取所有追溯记录
    const trackings = await prisma.batchTracking.findMany({
      where: { batchId: req.params.batchId },
      include: {
        operator: { select: { id: true, name: true } },
        customer: { select: { id: true, code: true, name: true, contactPerson: true, contactPhone: true, address: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 获取库存移动记录
    const movements = await prisma.stockMovement.findMany({
      where: { batchId: req.params.batchId },
      include: {
        warehouse: { select: { id: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 获取采购入库来源
    const receipt = await prisma.purchaseReceipt.findUnique({
      where: { batchId: req.params.batchId },
      include: {
        purchaseOrder: {
          include: { supplier: true },
        },
        warehouse: true,
      },
    });

    // 受影响的客户列表
    const affectedCustomers = trackings
      .filter((t) => t.customerId)
      .map((t) => t.customer)
      .filter((c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx);

    res.json({
      success: true,
      data: {
        batch,
        source: receipt ? {
          type: 'PURCHASE_RECEIPT',
          receiptNo: receipt.receiptNo,
          receiptDate: receipt.receiptDate,
          supplier: receipt.purchaseOrder?.supplier,
          warehouse: receipt.warehouse,
          receivedQty: receipt.receivedQty,
        } : null,
        movements,
        trackings,
        affectedCustomers,
      },
    });
  } catch (err) { next(err); }
});

// 反向追溯：客户 → 批次 → 供应商
router.get('/trace/reverse', async (req, res, next) => {
  try {
    const { customerId, batchNo } = req.query;
    const where = {};
    if (customerId) where.customerId = customerId;
    if (batchNo) where.batch = { batchNo: { contains: batchNo } };

    const trackings = await prisma.batchTracking.findMany({
      where,
      include: {
        batch: {
          include: {
            material: { select: { id: true, code: true, name: true, spec: true, unit: true } },
            supplier: { select: { id: true, code: true, name: true, contactPerson: true, contactPhone: true } },
            purchaseReceipt: {
              include: {
                purchaseOrder: { include: { supplier: true } },
              },
            },
          },
        },
        customer: { select: { id: true, code: true, name: true, contactPerson: true, contactPhone: true } },
        operator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: trackings });
  } catch (err) { next(err); }
});

// ============================================================
// 召回管理
// ============================================================

// 召回列表
router.get('/recalls', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '' } = req.query;
    const where = {};
    if (keyword) where.OR = [{ recallNo: { contains: keyword } }];
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      prisma.recallOrder.findMany({
        where,
        include: {
          batch: {
            include: {
              material: { select: { id: true, code: true, name: true } },
              supplier: { select: { id: true, code: true, name: true } },
            },
          },
          initiator: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.recallOrder.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 召回详情
router.get('/recalls/:id', async (req, res, next) => {
  try {
    const recall = await prisma.recallOrder.findUnique({
      where: { id: req.params.id },
      include: {
        batch: {
          include: {
            material: true,
            supplier: true,
            trackings: {
              include: {
                customer: true,
              },
            },
          },
        },
        initiator: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });
    if (!recall) return res.status(404).json({ success: false, message: '召回单不存在' });
    res.json({ success: true, data: recall });
  } catch (err) { next(err); }
});

// 创建召回
router.post('/recalls', authorize(ROLES.SUPER_ADMIN, ROLES.QUALITY_STAFF, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const { batchId, reason, remark } = req.body;
    if (!batchId || !reason) return res.status(400).json({ success: false, message: '批次和召回原因必填' });

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        trackings: {
          where: { customerId: { not: null } },
          include: { customer: true },
        },
      },
    });
    if (!batch) return res.status(400).json({ success: false, message: '批次不存在' });

    // 收集受影响客户
    const affectedCustomers = batch.trackings
      .map((t) => ({ id: t.customer.id, code: t.customer.code, name: t.customer.name, contactPerson: t.customer.contactPerson, contactPhone: t.customer.contactPhone }))
      .filter((c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx);

    const recallNo = genNo('RC');
    const recall = await prisma.recallOrder.create({
      data: {
        recallNo,
        batchId,
        reason,
        affectedCustomers: affectedCustomers,
        status: 'PENDING',
        initiatorId: req.user.employeeId || null,
        remark: remark || null,
      },
    });

    // 冻结批次
    await prisma.batch.update({
      where: { id: batchId },
      data: { status: 'RECALLED' },
    });

    res.json({ success: true, data: { recall, affectedCustomers } });
  } catch (err) { next(err); }
});

// 审批召回
router.put('/recalls/:id/approve', authorize(ROLES.SUPER_ADMIN, ROLES.QUALITY_STAFF), async (req, res, next) => {
  try {
    const recall = await prisma.recallOrder.findUnique({ where: { id: req.params.id } });
    if (!recall) return res.status(404).json({ success: false, message: '召回单不存在' });
    if (recall.status !== 'PENDING') return res.status(400).json({ success: false, message: '仅待审批状态可操作' });

    const updated = await prisma.recallOrder.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approverId: req.user.employeeId,
        approvedAt: new Date(),
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// 完成召回
router.put('/recalls/:id/complete', authorize(ROLES.SUPER_ADMIN, ROLES.QUALITY_STAFF), async (req, res, next) => {
  try {
    const recall = await prisma.recallOrder.findUnique({ where: { id: req.params.id } });
    if (!recall) return res.status(404).json({ success: false, message: '召回单不存在' });
    if (recall.status !== 'APPROVED') return res.status(400).json({ success: false, message: '仅已审批状态可完成' });

    const updated = await prisma.recallOrder.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// ============================================================
// 库龄分析 (P1-9)
// ============================================================

// 库龄分析总览 + 明细列表
router.get('/stock-age', async (req, res, next) => {
  try {
    const { materialId = '', warehouseId = '', groupBy = 'material' } = req.query;

    // 查询所有在库批次（remainingQty > 0 且 status=ACTIVE）
    const where = { remainingQty: { gt: 0 }, status: 'ACTIVE' };
    if (materialId) where.materialId = materialId;

    const batches = await prisma.batch.findMany({
      where,
      include: {
        material: { select: { id: true, code: true, name: true, spec: true, unit: true, shelfLifeDays: true, category: true } },
        supplier: { select: { id: true, code: true, name: true } },
        stockMovements: {
          where: { direction: 'IN' },
          include: { warehouse: { select: { id: true, name: true, code: true } } },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();
    let enriched = batches.map((b) => {
      const inDate = b.stockMovements[0]?.createdAt || b.createdAt;
      const stockAgeDays = Math.floor((now - new Date(inDate)) / 86400000);
      const daysLeft = b.expiryDate ? Math.ceil((new Date(b.expiryDate) - now) / 86400000) : null;
      const totalShelfLife = b.material?.shelfLifeDays || 0;
      const ageRatio = totalShelfLife > 0 ? (stockAgeDays / totalShelfLife) * 100 : 0;

      let ageStatus = 'NORMAL';
      if (daysLeft !== null) {
        if (daysLeft < 0) ageStatus = 'EXPIRED';
        else if (daysLeft <= 7) ageStatus = 'CRITICAL';
        else if (daysLeft <= 30) ageStatus = 'WARNING';
      }
      if (ageRatio > 80 && ageStatus === 'NORMAL') ageStatus = 'AGING';

      return {
        batchId: b.id,
        batchNo: b.batchNo,
        materialId: b.materialId,
        materialCode: b.material?.code,
        materialName: b.material?.name,
        spec: b.material?.spec,
        unit: b.material?.unit,
        category: b.material?.category,
        supplierName: b.supplier?.name,
        remainingQty: b.remainingQty,
        inDate,
        stockAgeDays,
        productionDate: b.productionDate,
        expiryDate: b.expiryDate,
        daysLeft,
        totalShelfLife,
        ageRatio: Math.round(ageRatio * 100) / 100,
        ageStatus,
        warehouseName: b.stockMovements[0]?.warehouse?.name || '-',
      };
    });

    // 按仓库过滤
    if (warehouseId) {
      enriched = enriched.filter((b) => b.stockMovements?.[0]?.warehouse?.id === warehouseId);
    }

    // 统计摘要
    const summary = {
      totalBatches: enriched.length,
      totalQty: enriched.reduce((s, b) => s + b.remainingQty, 0),
      expired: enriched.filter((b) => b.ageStatus === 'EXPIRED'),
      critical: enriched.filter((b) => b.ageStatus === 'CRITICAL'),
      warning: enriched.filter((b) => b.ageStatus === 'WARNING'),
      aging: enriched.filter((b) => b.ageStatus === 'AGING'),
      normal: enriched.filter((b) => b.ageStatus === 'NORMAL'),
    };

    summary.expiredCount = summary.expired.length;
    summary.expiredQty = summary.expired.reduce((s, b) => s + b.remainingQty, 0);
    summary.criticalCount = summary.critical.length;
    summary.criticalQty = summary.critical.reduce((s, b) => s + b.remainingQty, 0);
    summary.warningCount = summary.warning.length;
    summary.warningQty = summary.warning.reduce((s, b) => s + b.remainingQty, 0);

    // 按物料分组汇总
    if (groupBy === 'material') {
      const materialMap = {};
      for (const b of enriched) {
        if (!materialMap[b.materialId]) {
          materialMap[b.materialId] = {
            materialId: b.materialId,
            materialCode: b.materialCode,
            materialName: b.materialName,
            spec: b.spec,
            unit: b.unit,
            category: b.category,
            batchCount: 0,
            totalQty: 0,
            avgAgeDays: 0,
            maxAgeDays: 0,
            expiredQty: 0,
            warningQty: 0,
            batches: [],
          };
        }
        const m = materialMap[b.materialId];
        m.batchCount++;
        m.totalQty += b.remainingQty;
        m.avgAgeDays += b.stockAgeDays * b.remainingQty;
        m.maxAgeDays = Math.max(m.maxAgeDays, b.stockAgeDays);
        if (b.ageStatus === 'EXPIRED') m.expiredQty += b.remainingQty;
        if (b.ageStatus === 'WARNING' || b.ageStatus === 'CRITICAL') m.warningQty += b.remainingQty;
        m.batches.push(b);
      }
      const grouped = Object.values(materialMap).map((m) => ({
        ...m,
        avgAgeDays: m.totalQty > 0 ? Math.round(m.avgAgeDays / m.totalQty) : 0,
      }));
      res.json({ success: true, data: { summary, list: enriched, grouped } });
    } else {
      res.json({ success: true, data: { summary, list: enriched } });
    }
  } catch (err) { next(err); }
});

export default router;
