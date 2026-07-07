import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { authorize } from '../../middleware/auth.js';

const ROLES = { SUPER_ADMIN: true, LOGISTICS_STAFF: true, WAREHOUSE_MANAGER: true };

const router = Router();

// ========== 列表查询 ==========
router.get('/', authorize(Object.keys(ROLES)), async (req, res, next) => {
  try {
    const { keyword, category, status = 'ACTIVE', page = 1, pageSize = 50 } = req.query;
    const where = {};
    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { name: { contains: keyword } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      prisma.vehicleType.findMany({
        where,
        orderBy: [{ category: 'asc' }, { loadWeight: 'asc' }],
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      prisma.vehicleType.count({ where }),
    ]);

    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// ========== 单条查询 ==========
router.get('/:id', authorize(Object.keys(ROLES)), async (req, res, next) => {
  try {
    const item = await prisma.vehicleType.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, message: '车型不存在' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

// ========== 创建 ==========
router.post('/', authorize(Object.keys(ROLES)), async (req, res, next) => {
  try {
    const { code, name, category, boxLength, boxWidth, boxHeight, loadVolume, loadWeight } = req.body;
    if (!code || !name) return res.status(400).json({ success: false, message: '车型编码和名称必填' });

    const exists = await prisma.vehicleType.findUnique({ where: { code } });
    if (exists) return res.status(400).json({ success: false, message: '车型编码已存在' });

    const data = await prisma.vehicleType.create({
      data: {
        code,
        name,
        category: category || 'NORMAL',
        boxLength: boxLength != null ? Number(boxLength) : null,
        boxWidth: boxWidth != null ? Number(boxWidth) : null,
        boxHeight: boxHeight != null ? Number(boxHeight) : null,
        loadVolume: loadVolume != null ? Number(loadVolume) : null,
        loadWeight: loadWeight != null ? Number(loadWeight) : null,
      },
    });
    res.json({ success: true, data, message: '创建成功' });
  } catch (err) { next(err); }
});

// ========== 更新 ==========
router.put('/:id', authorize(Object.keys(ROLES)), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, boxLength, boxWidth, boxHeight, loadVolume, loadWeight, status } = req.body;

    const item = await prisma.vehicleType.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, message: '车型不存在' });

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (boxLength !== undefined) updateData.boxLength = Number(boxLength);
    if (boxWidth !== undefined) updateData.boxWidth = Number(boxWidth);
    if (boxHeight !== undefined) updateData.boxHeight = Number(boxHeight);
    if (loadVolume !== undefined) updateData.loadVolume = Number(loadVolume);
    if (loadWeight !== undefined) updateData.loadWeight = Number(loadWeight);
    if (status !== undefined) updateData.status = status;

    const data = await prisma.vehicleType.update({ where: { id }, data: updateData });
    res.json({ success: true, data, message: '更新成功' });
  } catch (err) { next(err); }
});

// ========== 删除 ==========
router.delete('/:id', authorize(Object.keys(ROLES)), async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查是否有车辆实例引用该车型（通过 vehicleType 字段文本匹配）
    const vehicles = await prisma.vehicle.findMany({
      where: { vehicleType: { contains: (await prisma.vehicleType.findUnique({ where: { id }, select: { name: true } }))?.name || '' } },
      select: { plateNo: true, status: true },
      take: 5,
    });
    if (vehicles.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该车型已被车辆档案引用，无法删除',
        references: [{ type: '车辆档案', count: vehicles.length, items: vehicles.map(v => ({ code: v.plateNo, status: v.status })), more: 0 }],
      });
    }

    await prisma.vehicleType.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: '车型不存在' });
    next(err);
  }
});

// ========== 批量导入（初始化用） ==========
router.post('/batch', authorize(Object.keys(ROLES)), async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: '请提供车型数据数组' });
    }

    const results = { created: 0, skipped: 0 };
    for (const item of items) {
      const exists = await prisma.vehicleType.findUnique({ where: { code: item.code } });
      if (exists) { results.skipped++; continue; }
      await prisma.vehicleType.create({
        data: {
          code: item.code,
          name: item.name,
          category: item.category || 'NORMAL',
          boxLength: item.boxLength != null ? Number(item.boxLength) : null,
          boxWidth: item.boxWidth != null ? Number(item.boxWidth) : null,
          boxHeight: item.boxHeight != null ? Number(item.boxHeight) : null,
          loadVolume: item.loadVolume != null ? Number(item.loadVolume) : null,
          loadWeight: item.loadWeight != null ? Number(item.loadWeight) : null,
        },
      });
      results.created++;
    }
    res.json({ success: true, data: results, message: `导入完成：新建${results.created}条，跳过${results.skipped}条` });
  } catch (err) { next(err); }
});

export default router;
