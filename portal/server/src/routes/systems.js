import { Router } from 'express';
import prisma from '../prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/systems
 * 获取所有已注册系统（已认证用户可查看活跃系统）
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const systems = await prisma.systemRegistry.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: systems });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/systems/all
 * 获取所有系统（含停用的，管理员）
 */
router.get('/all', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const systems = await prisma.systemRegistry.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { userAccess: true } },
      },
    });
    res.json({ success: true, data: systems });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/systems
 * 注册新系统（管理员）
 */
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { code, name, description, url, apiUrl, icon, color, sortOrder } = req.body;

    if (!code || !name || !url) {
      return res.status(400).json({ success: false, message: '编码、名称、URL 为必填' });
    }

    const existing = await prisma.systemRegistry.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ success: false, message: '系统编码已存在' });
    }

    const system = await prisma.systemRegistry.create({
      data: {
        code,
        name,
        description: description || '',
        url,
        apiUrl: apiUrl || '',
        icon: icon || '',
        color: color || '#1976d2',
        sortOrder: sortOrder || 0,
      },
    });

    res.json({ success: true, data: system });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/systems/:id
 * 更新系统信息（管理员）
 */
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, url, apiUrl, icon, color, sortOrder, isActive } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (url !== undefined) updateData.url = url;
    if (apiUrl !== undefined) updateData.apiUrl = apiUrl;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const system = await prisma.systemRegistry.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({ success: true, data: system });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/systems/:id
 * 删除系统注册（管理员，软删除 — 设为 isActive=false）
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.systemRegistry.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: '系统已停用' });
  } catch (err) {
    next(err);
  }
});

export default router;
