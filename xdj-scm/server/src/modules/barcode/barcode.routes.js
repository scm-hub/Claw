import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import prisma from '../../shared/prisma.js';

const router = Router();
router.use(authenticate);

// 扫码记录列表
router.get('/records', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 50, keyword = '', actionType = '', barcodeType = '' } = req.query;
    const where = {};
    if (keyword) where.barcode = { contains: keyword };
    if (actionType) where.actionType = actionType;
    if (barcodeType) where.barcodeType = barcodeType;
    const [list, total] = await Promise.all([
      prisma.barcodeRecord.findMany({
        where,
        include: {
          material: { select: { id: true, code: true, name: true, unit: true } },
          batch: { select: { id: true, batchNo: true } },
          location: { select: { id: true, code: true, name: true } },
          operator: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.barcodeRecord.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 扫码作业（扫码 + 自动操作）
router.post('/scan', async (req, res, next) => {
  try {
    const { barcode, barcodeType, actionType, materialId, batchId, locationId, warehouseId, qty, refType, refId, deviceInfo } = req.body;
    if (!barcode || !actionType) return res.status(400).json({ success: false, message: '条码和操作类型必填' });

    // 如果扫码入库/出库，自动联动库存
    let result = {};

    if (actionType === 'INBOUND' && materialId && warehouseId) {
      await prisma.inventory.upsert({
        where: { materialId_warehouseId: { materialId, warehouseId } },
        create: { materialId, warehouseId, qty: qty || 1, lockedQty: 0 },
        update: { qty: { increment: qty || 1 } },
      });
      result.inventoryUpdated = true;
    } else if (actionType === 'OUTBOUND' && materialId && warehouseId) {
      const inv = await prisma.inventory.findUnique({
        where: { materialId_warehouseId: { materialId, warehouseId } },
      });
      if (!inv || inv.qty < (qty || 1)) {
        return res.status(400).json({ success: false, message: '库存不足' });
      }
      await prisma.inventory.update({
        where: { materialId_warehouseId: { materialId, warehouseId } },
        data: { qty: { decrement: qty || 1 } },
      });
      result.inventoryUpdated = true;
    }

    // 记录扫码操作
    const record = await prisma.barcodeRecord.create({
      data: {
        barcode,
        barcodeType: barcodeType || 'MATERIAL',
        materialId: materialId || null,
        batchId: batchId || null,
        locationId: locationId || null,
        actionType,
        refType: refType || null,
        refId: refId || null,
        qty: qty || 0,
        operatorId: req.user.employeeId || null,
        deviceInfo: deviceInfo || null,
      },
      include: {
        material: { select: { id: true, code: true, name: true, unit: true } },
        batch: { select: { id: true, batchNo: true } },
      },
    });

    res.json({ success: true, data: { record, ...result } });
  } catch (err) { next(err); }
});

// 生成条码
router.post('/generate', async (req, res, next) => {
  try {
    const { materialId, batchId, qty } = req.body;
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
    const barcode = `SCM${ymd}${rand}`;

    const record = await prisma.barcodeRecord.create({
      data: {
        barcode,
        barcodeType: materialId ? 'MATERIAL' : 'BATCH',
        materialId: materialId || null,
        batchId: batchId || null,
        actionType: 'GENERATE',
        qty: qty || 0,
        operatorId: req.user.employeeId || null,
      },
    });
    res.json({ success: true, data: { barcode, record } });
  } catch (err) { next(err); }
});

export default router;
