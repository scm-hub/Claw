import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import prisma from '../../shared/prisma.js';
import { salesQtyToBase } from '../../shared/unitConversion.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
router.use(authenticate);

// 承运商营业执照上传配置（磁盘存储，10MB 限制）
const carrierUploadsDir = path.join(process.cwd(), 'uploads', 'carrier');
if (!fs.existsSync(carrierUploadsDir)) fs.mkdirSync(carrierUploadsDir, { recursive: true });
const licenseUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, carrierUploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `license_${uniqueSuffix}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    }
  },
});

// OCR 用的内存存储（不落盘，识别完即丢弃）
const ocrUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`OCR 仅支持图片格式: ${file.mimetype}`), false);
    }
  },
});

// ============================================================
// 营业执照 OCR 识别
// ============================================================
router.post('/providers/ocr-license', ocrUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '请上传图片' });

    // 使用 tesseract.js 静态 recognize 方法（v7 兼容）
    const Tesseract = await import('tesseract.js');
    const result = await Tesseract.recognize(req.file.buffer, 'chi_sim', { logger: () => {} });
    const rawText = result.data.text || '';
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    // 解析统一社会信用代码（18位大写字母+数字）
    let socialCreditCode = '';
    for (const line of lines) {
      const m = line.match(/([0-9A-Z]{18})/);
      if (m) { socialCreditCode = m[1]; break; }
    }

    // 解析公司名称（含"公司"关键词的行）
    let name = '';
    for (const line of lines) {
      if (/公司/.test(line) && line.length >= 4 && line.length <= 50) {
        name = line.replace(/^[^一-龥A-Za-z]+/, '').trim();
        break;
      }
    }

    // 解析法定代表人
    let legalPerson = '';
    for (const line of lines) {
      const m = line.match(/法定代表人[：:\s]*([一-龥]{2,4})/);
      if (m) { legalPerson = m[1]; break; }
    }

    res.json({
      success: true,
      data: { name, legalPerson, socialCreditCode, rawText: rawText.substring(0, 500) },
    });
  } catch (err) {
    console.error('[OCR ERROR]', err.message, err.stack);
    res.status(500).json({ success: false, message: 'OCR识别失败: ' + err.message });
  }
});

function genNo(prefix) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${ymd}${rand}`;
}

// ============================================================
// 物流商管理
// ============================================================
router.get('/providers', async (req, res, next) => {
  try {
    const { keyword = '', status = '', type = '' } = req.query;
    const where = {};
    if (keyword) where.OR = [{ name: { contains: keyword } }, { code: { contains: keyword } }];
    if (status) where.status = status;
    if (type) where.type = type;
    const list = await prisma.logisticsProvider.findMany({
      where,
      include: { _count: { select: { waybills: true, shippingOrders: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});

router.post('/providers', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF), licenseUpload.single('file'), async (req, res, next) => {
  try {
    const { name, code, type, contactPerson, contactPhone, socialCreditCode, serviceArea, contractNo, rateConfig } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '承运商名称必填' });
    // 自动生成编码：CYS-001 格式
    let finalCode = code;
    if (!finalCode) {
      const count = await prisma.logisticsProvider.count();
      finalCode = `CYS-${String(count + 1).padStart(3, '0')}`;
    }
    const businessLicenseUrl = req.file ? `/uploads/carrier/${req.file.filename}` : null;
    const provider = await prisma.logisticsProvider.create({
      data: { name, code: finalCode, type: type || 'EXPRESS', contactPerson, contactPhone, socialCreditCode, serviceArea, contractNo, businessLicenseUrl, rateConfig: rateConfig || null },
    });
    res.json({ success: true, data: provider });
  } catch (err) { next(err); }
});

router.put('/providers/:id', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF), licenseUpload.single('file'), async (req, res, next) => {
  try {
    const { name, code, type, contactPerson, contactPhone, socialCreditCode, serviceArea, contractNo, rateConfig, status } = req.body;
    const data = { name, code, type, contactPerson, contactPhone, socialCreditCode, serviceArea, contractNo, rateConfig, status };
    // 如果上传了新营业执照，更新路径
    if (req.file) {
      // 删除旧文件
      const existing = await prisma.logisticsProvider.findUnique({ where: { id: req.params.id }, select: { businessLicenseUrl: true } });
      if (existing?.businessLicenseUrl) {
        const oldPath = path.join(process.cwd(), existing.businessLicenseUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      data.businessLicenseUrl = `/uploads/carrier/${req.file.filename}`;
    }
    const provider = await prisma.logisticsProvider.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: provider });
  } catch (err) { next(err); }
});

router.delete('/providers/:id', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { id } = req.params;
    const refs = [];
    const MAX_ITEMS = 5;

    // 1. 发货单引用（logisticsProviderId）
    const shippingOrders = await prisma.shippingOrder.findMany({
      where: { logisticsProviderId: id },
      select: { shippingNo: true, status: true },
    });
    if (shippingOrders.length > 0) {
      refs.push({ type: '发货单', count: shippingOrders.length, items: shippingOrders.slice(0, MAX_ITEMS).map(s => ({ code: s.shippingNo, status: s.status })), more: shippingOrders.length > MAX_ITEMS ? shippingOrders.length - MAX_ITEMS : 0 });
    }

    // 2. 运单引用（logisticsProviderId）
    const waybills = await prisma.waybill.findMany({
      where: { logisticsProviderId: id },
      select: { waybillNo: true, status: true },
    });
    if (waybills.length > 0) {
      refs.push({ type: '运单', count: waybills.length, items: waybills.slice(0, MAX_ITEMS).map(w => ({ code: w.waybillNo, status: w.status })), more: waybills.length > MAX_ITEMS ? waybills.length - MAX_ITEMS : 0 });
    }

    // 3. 配送路线引用（logisticsProviderId）
    const deliveryRoutes = await prisma.deliveryRoute.findMany({
      where: { logisticsProviderId: id },
      select: { routeNo: true, status: true },
    });
    if (deliveryRoutes.length > 0) {
      refs.push({ type: '配送路线', count: deliveryRoutes.length, items: deliveryRoutes.slice(0, MAX_ITEMS).map(r => ({ code: r.routeNo, status: r.status })), more: deliveryRoutes.length > MAX_ITEMS ? deliveryRoutes.length - MAX_ITEMS : 0 });
    }

    // 4. 运费结算引用（logisticsProviderId）
    const freightSettlements = await prisma.freightSettlement.findMany({
      where: { logisticsProviderId: id },
      select: { settlementNo: true, status: true },
    });
    if (freightSettlements.length > 0) {
      refs.push({ type: '运费结算', count: freightSettlements.length, items: freightSettlements.slice(0, MAX_ITEMS).map(f => ({ code: f.settlementNo, status: f.status })), more: freightSettlements.length > MAX_ITEMS ? freightSettlements.length - MAX_ITEMS : 0 });
    }

    // 5. 合同引用（logisticsId — 注意字段名不是 logisticsProviderId）
    const contracts = await prisma.contract.findMany({
      where: { logisticsId: id },
      select: { contractNo: true, status: true },
    });
    if (contracts.length > 0) {
      refs.push({ type: '合同', count: contracts.length, items: contracts.slice(0, MAX_ITEMS).map(c => ({ code: c.contractNo, status: c.status })), more: contracts.length > MAX_ITEMS ? contracts.length - MAX_ITEMS : 0 });
    }

    if (refs.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该承运商已被业务单据引用，无法删除',
        references: refs,
      });
    }

    // 无引用 → 允许删除（Vehicle 会级联删除）
    await prisma.logisticsProvider.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// ============================================================
// 车辆管理（承运商下）
// ============================================================
router.get('/providers/:id/vehicles', async (req, res, next) => {
  try {
    const list = await prisma.vehicle.findMany({
      where: { logisticsProviderId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});

router.post('/providers/:id/vehicles', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF), async (req, res, next) => {
  try {
    const { driverName, driverPhone, plateNo, vehicleType, specifications, status } = req.body;
    if (!driverName || !plateNo) return res.status(400).json({ success: false, message: '司机姓名和车牌号必填' });
    const vehicle = await prisma.vehicle.create({
      data: {
        logisticsProviderId: req.params.id,
        driverName,
        driverPhone: driverPhone || null,
        plateNo,
        vehicleType: vehicleType || '厢式货车',
        specifications: specifications || null,
        status: status || 'ACTIVE',
      },
    });
    res.json({ success: true, data: vehicle });
  } catch (err) { next(err); }
});

router.put('/vehicles/:id', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF), async (req, res, next) => {
  try {
    const { driverName, driverPhone, plateNo, vehicleType, specifications, status } = req.body;
    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: { driverName, driverPhone, plateNo, vehicleType, specifications, status },
    });
    res.json({ success: true, data: vehicle });
  } catch (err) { next(err); }
});

router.delete('/vehicles/:id', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF), async (req, res, next) => {
  try {
    await prisma.vehicle.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// ============================================================
// 发货单管理
// ============================================================
router.get('/shipping-orders', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '', customerId = '', warehouseId = '', logisticsProviderId = '', dateStart = '', dateEnd = '' } = req.query;
    const where = {};
    if (keyword) {
      where.OR = [
        { shippingNo: { contains: keyword } },
        { salesOrder: { orderNo: { contains: keyword } } },
        { customer: { name: { contains: keyword } } },
      ];
    }
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (logisticsProviderId) where.logisticsProviderId = logisticsProviderId;
    if (dateStart || dateEnd) {
      where.shippingDate = {};
      if (dateStart) where.shippingDate.gte = new Date(dateStart + 'T00:00:00');
      if (dateEnd) where.shippingDate.lte = new Date(dateEnd + 'T23:59:59');
    }
    const [list, total] = await Promise.all([
      prisma.shippingOrder.findMany({
        where,
        include: {
          salesOrder: { select: { id: true, orderNo: true } },
          customer: { select: { id: true, name: true, contactPhone: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          logisticsProvider: { select: { id: true, name: true } },
          vehicle: { select: { id: true, driverName: true, driverPhone: true, plateNo: true, vehicleType: true } },
          waybill: { select: { id: true, waybillNo: true, status: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.shippingOrder.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

router.post('/shipping-orders', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF, ROLES.SALES_STAFF), async (req, res, next) => {
  try {
    const { salesOrderId, customerId, addressId, warehouseId, logisticsProviderId, carrier, transportCost, notes } = req.body;
    if (!salesOrderId || !customerId || !warehouseId) return res.status(400).json({ success: false, message: '销售订单、客户、仓库必填' });

    // 检查是否已有非合并的发货单
    const existing = await prisma.shippingOrder.findFirst({ where: { salesOrderId, isMerged: false } });
    if (existing) return res.status(400).json({ success: false, message: '该销售订单已有发货单' });

    const shippingNo = genNo('SH');
    const shipping = await prisma.shippingOrder.create({
      data: {
        shippingNo,
        salesOrderId,
        customerId,
        addressId: addressId || null,
        warehouseId,
        logisticsProviderId: logisticsProviderId || null,
        carrier: carrier || null,
        transportCost: transportCost || 0,
        notes: notes || null,
        status: 'PENDING',
      },
      include: { customer: { select: { id: true, name: true } }, warehouse: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: shipping });
  } catch (err) { next(err); }
});

// 发货单状态流转
router.put('/shipping-orders/:id/status', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF), async (req, res, next) => {
  try {
    const { status, trackingNo, logisticsProviderId, shippingDate } = req.body;
    const validTransitions = {
      PENDING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED', 'RETURNED'],
      DELIVERED: [],
      RETURNED: [],
      CANCELLED: [],
    };
    const shipping = await prisma.shippingOrder.findUnique({ where: { id: req.params.id } });
    if (!shipping) return res.status(404).json({ success: false, message: '发货单不存在' });
    if (!validTransitions[shipping.status]?.includes(status)) {
      return res.status(400).json({ success: false, message: `状态不可从 ${shipping.status} 变更为 ${status}` });
    }
    const updateData = { status };
    if (status === 'SHIPPED') {
      updateData.shippingDate = shippingDate ? new Date(shippingDate) : new Date();
      if (trackingNo) updateData.trackingNo = trackingNo;
      if (logisticsProviderId) updateData.logisticsProviderId = logisticsProviderId;
    }
    const updated = await prisma.shippingOrder.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// 备货状态流转
router.put('/shipping-orders/:id/stocking-status', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const { stockingStatus } = req.body;
    const valid = ['PENDING', 'READY'];
    if (!valid.includes(stockingStatus)) return res.status(400).json({ success: false, message: '无效的备货状态' });
    const updated = await prisma.shippingOrder.update({ where: { id: req.params.id }, data: { stockingStatus } });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// 发货状态流转
router.put('/shipping-orders/:id/shipping-status', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF), async (req, res, next) => {
  try {
    const { shippingStatus } = req.body;
    const valid = ['PENDING', 'SHIPPED'];
    if (!valid.includes(shippingStatus)) return res.status(400).json({ success: false, message: '无效的发货状态' });
    const updateData = { shippingStatus };
    if (shippingStatus === 'SHIPPED') updateData.shippingDate = new Date();
    const updated = await prisma.shippingOrder.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// ===== 获取发货单明细（含实际装车数量） =====
router.get('/shipping-orders/:id/shipping-items', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF, ROLES.WAREHOUSE_STAFF, ROLES.SALES_STAFF), async (req, res, next) => {
  try {
    const shipping = await prisma.shippingOrder.findUnique({
      where: { id: req.params.id },
      include: {
        salesOrder: { include: { items: { include: { material: true } } } },
        shippingItems: { include: { material: true } },
      },
    });
    if (!shipping) return res.status(404).json({ success: false, message: '发货单不存在' });

    // 如果已有 ShippingOrderItem 记录，直接返回
    if (shipping.shippingItems.length > 0) {
      const items = shipping.shippingItems.map(si => ({
        id: si.id,
        salesOrderItemId: si.salesOrderItemId,
        materialId: si.materialId,
        materialName: si.material?.name || '-',
        materialSpec: si.material?.spec || '-',
        materialUnit: si.material?.unit || '-',
        materialSalesUnit: si.material?.salesUnit || si.material?.unit || '-',
        orderQty: si.orderQty,
        actualQty: si.actualQty,
      }));
      return res.json({ success: true, data: { items, shippingNo: shipping.shippingNo } });
    }

    // 如果没有 ShippingOrderItem，从 SalesOrderItem 生成（actualQty 默认 = orderQty）
    const soItems = shipping.salesOrder?.items || [];
    const items = soItems.map(soi => ({
      salesOrderItemId: soi.id,
      materialId: soi.materialId,
      materialName: soi.material?.name || '-',
      materialSpec: soi.material?.spec || '-',
      materialUnit: soi.material?.unit || '-',
      materialSalesUnit: soi.material?.salesUnit || soi.material?.unit || '-',
      orderQty: soi.qty,
      actualQty: soi.qty, // 默认实际装车数 = 订单数量
    }));
    return res.json({ success: true, data: { items, shippingNo: shipping.shippingNo } });
  } catch (err) { next(err); }
});

// ===== 确认发货（保存实际装车数量 + 出库） =====
router.put('/shipping-orders/:id/confirm-shipment', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const { items } = req.body; // [{ salesOrderItemId, materialId, actualQty, orderQty }]
    if (!items || !items.length) return res.status(400).json({ success: false, message: '请填写实际装车数量' });

    // 检查实际装车数量不能全为0
    const allZero = items.every(it => Number(it.actualQty) === 0);
    if (allZero) return res.status(400).json({ success: false, message: '实际装车数量不能全部为0' });

    const shipping = await prisma.shippingOrder.findUnique({
      where: { id: req.params.id },
      include: {
        salesOrder: { include: { items: { include: { material: true, batch: true } } } },
        shippingItems: true,
      },
    });
    if (!shipping) return res.status(404).json({ success: false, message: '发货单不存在' });
    if (shipping.logisticsStatus !== 'ARRANGED') return res.status(400).json({ success: false, message: '请先安排物流后再发货' });
    if (shipping.stockingStatus !== 'READY') return res.status(400).json({ success: false, message: '请先完成备货后再发货' });

    const warehouseId = shipping.warehouseId;

    // 1. 保存/更新 ShippingOrderItem
    for (const it of items) {
      const actualQty = Number(it.actualQty) || 0;
      const orderQty = Number(it.orderQty) || 0;
      const existing = shipping.shippingItems.find(si => si.salesOrderItemId === it.salesOrderItemId);
      if (existing) {
        await prisma.shippingOrderItem.update({
          where: { id: existing.id },
          data: { actualQty },
        });
      } else {
        await prisma.shippingOrderItem.create({
          data: {
            shippingOrderId: shipping.id,
            salesOrderItemId: it.salesOrderItemId,
            materialId: it.materialId,
            orderQty,
            actualQty,
          },
        });
      }
    }

    // 2. 更新发货状态为已发货
    await prisma.shippingOrder.update({
      where: { id: shipping.id },
      data: { shippingStatus: 'SHIPPED', shippingDate: new Date() },
    });

    // 3. 出库入库记录由最终确认按钮触发（/final-confirm）
    res.json({ success: true, message: '发货状态已更新', data: { shippingNo: shipping.shippingNo } });
  } catch (err) { next(err); }
});

// 最终确认：三个状态都完成后，推送出入库记录到仓储WMS
router.put('/shipping-orders/:id/final-confirm', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const shipping = await prisma.shippingOrder.findUnique({
      where: { id: req.params.id },
      include: {
        salesOrder: { include: { items: { include: { material: true, batch: true } } } },
        shippingItems: true,
      },
    });
    if (!shipping) return res.status(404).json({ success: false, message: '发货单不存在' });

    // 三个条件必须全部满足
    if (shipping.logisticsStatus !== 'ARRANGED') return res.status(400).json({ success: false, message: '请先安排物流' });
    if (shipping.stockingStatus !== 'READY') return res.status(400).json({ success: false, message: '请先完成备货' });
    if (shipping.shippingStatus !== 'SHIPPED') return res.status(400).json({ success: false, message: '请先确认发货' });

    if (!shipping.shippingItems || shipping.shippingItems.length === 0) {
      return res.status(400).json({ success: false, message: '发货单没有装车数据' });
    }

    const warehouseId = shipping.warehouseId;
    const soItems = shipping.salesOrder?.items || [];

    // 按实际装车数量出库并创建出入库记录
    for (const sItem of shipping.shippingItems) {
      const actualQty = Number(sItem.actualQty) || 0;
      if (actualQty <= 0) continue;

      const soItem = soItems.find(soi => soi.id === sItem.salesOrderItemId);
      if (!soItem) continue;

      const mat = soItem.material;
      if (!mat) continue;
      const baseQty = Number(salesQtyToBase(actualQty, mat));

      // 扣减库存
      const inv = await prisma.inventory.findFirst({
        where: { materialId: sItem.materialId, warehouseId },
      });
      if (!inv || inv.qty < baseQty) {
        console.warn(`[出库警告] 发货单 ${shipping.shippingNo} 物料 ${mat.name} 库存不足（当前${inv?.qty || 0}，需${baseQty}${mat.unit}）`);
      }
      if (inv) {
        await prisma.inventory.update({
          where: { id: inv.id },
          data: {
            qty: { decrement: Math.min(baseQty, inv.qty) },
            lockedQty: { decrement: Math.min(baseQty, inv.lockedQty) },
          },
        });
      } else {
        await prisma.inventory.create({
          data: { materialId: sItem.materialId, warehouseId, qty: -baseQty, lockedQty: 0 },
        });
      }

      // 创建出库记录
      await prisma.stockMovement.create({
        data: {
          movementNo: genNo('OUT'),
          warehouseId,
          materialId: sItem.materialId,
          batchId: soItem.batchId || null,
          gradeId: soItem.gradeId || null,
          movementType: 'SALES_OUTBOUND',
          direction: 'OUT',
          qty: baseQty,
          movementDate: new Date(),
          refType: 'SHIPPING_ORDER',
          refId: shipping.id,
          operatorId: req.user?.employeeId || null,
          remark: `发货单 - ${shipping.shippingNo}（销售订单 ${shipping.salesOrder?.orderNo || '-'}，${actualQty}${mat.salesUnit || ''}→${baseQty}${mat.unit}）`,
        },
      });

      // 批次追溯
      if (soItem.batchId) {
        await prisma.batch.update({
          where: { id: soItem.batchId },
          data: { remainingQty: { decrement: baseQty } },
        });
        await prisma.batchTracking.create({
          data: {
            batchId: soItem.batchId,
            trackingType: 'OUTBOUND',
            refType: 'SHIPPING_ORDER',
            refId: shipping.id,
            qty: baseQty,
            operatorId: req.user?.employeeId || null,
            remark: `发货出库 ${shipping.shippingNo}`,
          },
        });
      }
    }

    // 更新状态为已送达
    await prisma.shippingOrder.update({
      where: { id: shipping.id },
      data: { status: 'DELIVERED' },
    });
    // 同步更新销售订单状态
    if (shipping.salesOrderId) {
      await prisma.salesOrder.update({
        where: { id: shipping.salesOrderId },
        data: { status: 'DELIVERED' },
      });
    }

    res.json({ success: true, message: '最终确认完成，出入库记录已推送至仓储WMS' });
  } catch (err) { next(err); }
});

// 物流状态流转
router.put('/shipping-orders/:id/logistics-status', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF), async (req, res, next) => {
  try {
    const { logisticsStatus, origin, destination, transportCost, shippingDate, kilometers, logisticsNotes, logisticsProviderId, vehicleId, waypoints } = req.body;
    const valid = ['PENDING', 'ARRANGED'];
    if (!valid.includes(logisticsStatus)) return res.status(400).json({ success: false, message: '无效的物流状态' });
    const updateData = { logisticsStatus };
    if (logisticsStatus === 'ARRANGED') {
      if (origin !== undefined) updateData.origin = origin;
      if (destination !== undefined) updateData.destination = destination;
      if (transportCost !== undefined) updateData.transportCost = Number(transportCost) || 0;
      if (shippingDate) updateData.shippingDate = new Date(shippingDate);
      if (kilometers !== undefined && kilometers !== '') updateData.kilometers = Number(kilometers);
      if (logisticsNotes !== undefined) updateData.logisticsNotes = logisticsNotes;
      if (logisticsProviderId) updateData.logisticsProviderId = logisticsProviderId;
      if (vehicleId) updateData.vehicleId = vehicleId;
      if (waypoints !== undefined) updateData.waypoints = waypoints;
    }
    const updated = await prisma.shippingOrder.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// ============================================================
// 运单管理
// ============================================================
router.get('/waybills', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '', providerId = '' } = req.query;
    const where = {};
    if (keyword) where.waybillNo = { contains: keyword };
    if (status) where.status = status;
    if (providerId) where.logisticsProviderId = providerId;
    const [list, total] = await Promise.all([
      prisma.waybill.findMany({
        where,
        include: {
          shippingOrder: { select: { id: true, shippingNo: true } },
          logisticsProvider: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
          deliveryRoute: { select: { id: true, routeNo: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.waybill.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

router.post('/waybills', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF), async (req, res, next) => {
  try {
    const { shippingOrderId, logisticsProviderId, customerId, senderAddress, receiverName, receiverPhone, receiverAddress, weight, volume, freightCost, deliveryRouteId } = req.body;
    const waybillNo = genNo('WB');
    const waybill = await prisma.waybill.create({
      data: {
        waybillNo,
        shippingOrderId: shippingOrderId || null,
        logisticsProviderId: logisticsProviderId || null,
        customerId: customerId || null,
        senderAddress, receiverName, receiverPhone, receiverAddress,
        weight: weight || 0, volume: volume || 0,
        freightCost: freightCost || 0,
        deliveryRouteId: deliveryRouteId || null,
        status: 'CREATED',
      },
    });
    res.json({ success: true, data: waybill });
  } catch (err) { next(err); }
});

// 运单状态流转
router.put('/waybills/:id/status', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF), async (req, res, next) => {
  try {
    const { status, trackingInfo } = req.body;
    const validTransitions = {
      CREATED: ['IN_TRANSIT', 'CANCELLED'],
      IN_TRANSIT: ['DELIVERED', 'EXCEPTION'],
      DELIVERED: [],
      EXCEPTION: ['IN_TRANSIT', 'RETURNED'],
      RETURNED: [],
      CANCELLED: [],
    };
    const waybill = await prisma.waybill.findUnique({ where: { id: req.params.id } });
    if (!waybill) return res.status(404).json({ success: false, message: '运单不存在' });
    if (!validTransitions[waybill.status]?.includes(status)) {
      return res.status(400).json({ success: false, message: `状态不可从 ${waybill.status} 变更为 ${status}` });
    }
    const updateData = { status };
    if (status === 'IN_TRANSIT') updateData.shippedAt = new Date();
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (trackingInfo) updateData.trackingInfo = trackingInfo;
    const updated = await prisma.waybill.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// ============================================================
// 配送路线
// ============================================================
router.get('/routes', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, status = '', routeDate = '' } = req.query;
    const where = {};
    if (status) where.status = status;
    if (routeDate) {
      const d = new Date(routeDate);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.routeDate = { gte: d, lt: next };
    }
    const [list, total] = await Promise.all([
      prisma.deliveryRoute.findMany({
        where,
        include: {
          logisticsProvider: { select: { id: true, name: true } },
          _count: { select: { waybills: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { routeDate: 'desc' },
      }),
      prisma.deliveryRoute.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

router.post('/routes', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF), async (req, res, next) => {
  try {
    const { routeDate, logisticsProviderId, vehicleNo, driverName, driverPhone, totalStops, totalWeight, totalCost, optimizedPath } = req.body;
    const routeNo = genNo('DR');
    const route = await prisma.deliveryRoute.create({
      data: {
        routeNo,
        routeDate: routeDate ? new Date(routeDate) : new Date(),
        logisticsProviderId: logisticsProviderId || null,
        vehicleNo, driverName, driverPhone,
        totalStops: totalStops || 0,
        totalWeight: totalWeight || 0,
        totalCost: totalCost || 0,
        optimizedPath: optimizedPath || null,
        status: 'PLANNED',
      },
    });
    res.json({ success: true, data: route });
  } catch (err) { next(err); }
});

router.put('/routes/:id/status', authorize(ROLES.SUPER_ADMIN, ROLES.LOGISTICS_STAFF), async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await prisma.deliveryRoute.update({ where: { id: req.params.id }, data: { status } });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// ============================================================
// 运费结算
// ============================================================
router.get('/freight-settlements', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, status = '', providerId = '' } = req.query;
    const where = {};
    if (status) where.status = status;
    if (providerId) where.logisticsProviderId = providerId;
    const [list, total] = await Promise.all([
      prisma.freightSettlement.findMany({
        where,
        include: { logisticsProvider: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.freightSettlement.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

router.post('/freight-settlements', authorize(ROLES.SUPER_ADMIN, ROLES.FINANCE_STAFF), async (req, res, next) => {
  try {
    const { logisticsProviderId, periodStart, periodEnd, totalFreight, settledAmount, waybillIds } = req.body;
    const settlementNo = genNo('FS');
    const balance = (totalFreight || 0) - (settledAmount || 0);
    const settlement = await prisma.freightSettlement.create({
      data: {
        settlementNo,
        logisticsProviderId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        totalFreight: totalFreight || 0,
        settledAmount: settledAmount || 0,
        balance,
        waybillIds: waybillIds || null,
        status: 'PENDING',
      },
    });
    res.json({ success: true, data: settlement });
  } catch (err) { next(err); }
});

router.put('/freight-settlements/:id/settle', authorize(ROLES.SUPER_ADMIN, ROLES.FINANCE_STAFF), async (req, res, next) => {
  try {
    const settlement = await prisma.freightSettlement.update({
      where: { id: req.params.id },
      data: { status: 'SETTLED' },
    });
    res.json({ success: true, data: settlement });
  } catch (err) { next(err); }
});

export default router;
