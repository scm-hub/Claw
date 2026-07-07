import { Router } from 'express';
import prisma from '../prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/access
 * 获取所有用户的角色分配情况（管理员）
 * 返回: [{ userEmail, roles: [{ id, name }] }]
 */
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoles = await prisma.userRole.findMany({
      include: {
        role: { select: { id: true, name: true, description: true } },
      },
      orderBy: [{ userEmail: 'asc' }],
    });

    // 按用户分组
    const grouped = {};
    for (const ur of userRoles) {
      if (!grouped[ur.userEmail]) {
        grouped[ur.userEmail] = { userEmail: ur.userEmail, roles: [] };
      }
      grouped[ur.userEmail].roles.push(ur.role);
    }

    res.json({ success: true, data: Object.values(grouped) });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/access/assign
 * 给用户分配角色
 * body: { userEmail, roleId }
 */
router.put('/assign', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { userEmail, roleId } = req.body;
    if (!userEmail || !roleId) {
      return res.status(400).json({ success: false, message: '缺少 userEmail 或 roleId' });
    }

    const record = await prisma.userRole.upsert({
      where: { userEmail_roleId: { userEmail, roleId } },
      update: {},
      create: { userEmail, roleId },
    });

    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/access/assign
 * 取消用户的角色分配
 * body: { userEmail, roleId }
 */
router.delete('/assign', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { userEmail, roleId } = req.body;
    if (!userEmail || !roleId) {
      return res.status(400).json({ success: false, message: '缺少 userEmail 或 roleId' });
    }

    await prisma.userRole.deleteMany({
      where: { userEmail, roleId },
    });

    res.json({ success: true, message: '已取消角色分配' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/access/audit
 * 获取审计日志（管理员）
 */
router.get('/audit', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { userEmail, action, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (userEmail) where.userEmail = { contains: userEmail };
    if (action) where.action = action;

    const [records, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: { list: records, total, page: Number(page), pageSize: Number(pageSize) },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
