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
// 成本配置
// ============================================================
router.get('/config', async (req, res, next) => {
  try {
    const list = await prisma.costConfig.findMany({
      orderBy: { effectiveDate: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});

router.post('/config', authorize(ROLES.SUPER_ADMIN, ROLES.FINANCE_STAFF), async (req, res, next) => {
  try {
    const { configKey, configName, configValue, unit, effectiveDate } = req.body;
    if (!configKey || !configName) return res.status(400).json({ success: false, message: '配置Key和名称必填' });
    const existing = await prisma.costConfig.findUnique({ where: { configKey } });
    if (existing) return res.status(400).json({ success: false, message: '配置Key已存在' });
    const cfg = await prisma.costConfig.create({
      data: { configKey, configName, configValue: configValue || 0, unit: unit || null, effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date() },
    });
    res.json({ success: true, data: cfg });
  } catch (err) { next(err); }
});

router.put('/config/:id', authorize(ROLES.SUPER_ADMIN, ROLES.FINANCE_STAFF), async (req, res, next) => {
  try {
    const { configName, configValue, unit, effectiveDate, status } = req.body;
    const cfg = await prisma.costConfig.update({
      where: { id: req.params.id },
      data: { configName, configValue, unit, effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined, status: status || undefined },
    });
    res.json({ success: true, data: cfg });
  } catch (err) { next(err); }
});

router.delete('/config/:id', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    await prisma.costConfig.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// ============================================================
// 标准成本
// ============================================================
router.get('/standard', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', materialId = '' } = req.query;
    const where = {};
    if (materialId) where.materialId = materialId;
    if (keyword) {
      const mats = await prisma.material.findMany({ where: { name: { contains: keyword } }, select: { id: true } });
      where.materialId = { in: mats.map(m => m.id) };
    }
    const [list, total] = await Promise.all([
      prisma.standardCost.findMany({
        where,
        include: { material: { select: { id: true, code: true, name: true, unit: true } } },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { calcDate: 'desc' },
      }),
      prisma.standardCost.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 计算标准成本（采购成本+运输分摊+包装+运输 = 总成本）
router.post('/standard/calculate', authorize(ROLES.SUPER_ADMIN, ROLES.FINANCE_STAFF), async (req, res, next) => {
  try {
    const { materialId, purchaseCost, transportAllocCost, packagingCost, transportCost } = req.body;
    if (!materialId) return res.status(400).json({ success: false, message: '物料必填' });

    const material = await prisma.material.findUnique({ where: { id: materialId } });
    if (!material) return res.status(400).json({ success: false, message: '物料不存在' });

    // 如果未提供采购成本，优先用最近入库价，其次用采购期初价
    const _purchaseCost = purchaseCost ?? Number(material.latestReceiptPrice || material.initialPurchasePrice || 0);
    const _transportAllocCost = transportAllocCost || 0;
    const _packagingCost = packagingCost || 0;
    const _transportCost = transportCost || 0;
    const totalCost = _purchaseCost + _transportAllocCost + _packagingCost + _transportCost;

    // 停用旧记录
    await prisma.standardCost.updateMany({
      where: { materialId, status: 'ACTIVE' },
      data: { status: 'HISTORICAL' },
    });

    // 创建新标准成本
    const std = await prisma.standardCost.create({
      data: {
        materialId,
        purchaseCost: _purchaseCost,
        purchaseCostSource: material.latestReceiptPrice ? 'LATEST_RECEIPT' : (material.initialPurchasePrice ? 'INITIAL_PURCHASE' : 'MANUAL'),
        transportAllocCost: _transportAllocCost,
        transportAllocSource: _transportAllocCost > 0 ? 'MANUAL' : null,
        packagingCost: _packagingCost,
        transportCost: _transportCost,
        totalCost,
        calcDate: new Date(),
        status: 'ACTIVE',
      },
      include: { material: { select: { id: true, code: true, name: true, unit: true } } },
    });

    // 同时创建快照
    await prisma.costSnapshot.create({
      data: { materialId, totalCost, snapshotDate: new Date() },
    });

    res.json({ success: true, data: std });
  } catch (err) { next(err); }
});

// 成本快照历史
router.get('/snapshots', async (req, res, next) => {
  try {
    const { materialId, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (materialId) where.materialId = materialId;
    const [list, total] = await Promise.all([
      prisma.costSnapshot.findMany({
        where,
        include: { material: { select: { id: true, code: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { snapshotDate: 'desc' },
      }),
      prisma.costSnapshot.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

export default router;
