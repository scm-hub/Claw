import { Router } from 'express';
import prisma from '../prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { reportOperationLog, getClientIp } from '../middleware/operationLogger.js';

const router = Router();

/**
 * GET /api/logs
 * 查询操作日志（管理员）
 * 查询参数:
 *   userEmail  — 按用户邮箱模糊搜索
 *   action     — 按操作类型筛选 (LOGIN, CREATE, UPDATE, DELETE, ACCESS_SYSTEM)
 *   systemCode — 按子系统筛选
 *   targetType — 按操作对象类型筛选 (产品, 客户, 供应商...)
 *   startDate  — 开始日期 (YYYY-MM-DD)
 *   endDate    — 结束日期 (YYYY-MM-DD)
 *   page       — 页码 (默认 1)
 *   pageSize   — 每页条数 (默认 20)
 */
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      userEmail,
      action,
      systemCode,
      targetType,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = req.query;

    const where = {};
    if (userEmail) where.userEmail = { contains: userEmail };
    if (action) where.action = action;
    if (systemCode) where.systemCode = systemCode;
    if (targetType) where.targetType = { contains: targetType };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate + 'T00:00:00');
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59');
    }

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

/**
 * GET /api/logs/stats
 * 日志统计（管理员）
 * 返回: 总数、今日数、按操作类型分组、按用户分组 TOP 10
 */
router.get('/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [total, todayCount, byAction, byUser, bySystem, byTarget] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
      }),
      prisma.auditLog.groupBy({
        by: ['userEmail'],
        _count: { userEmail: true },
        orderBy: { _count: { userEmail: 'desc' } },
        take: 10,
      }),
      prisma.auditLog.groupBy({
        by: ['systemCode'],
        _count: { systemCode: true },
        orderBy: { _count: { systemCode: 'desc' } },
      }),
      prisma.auditLog.groupBy({
        by: ['targetType'],
        _count: { targetType: true },
        orderBy: { _count: { targetType: 'desc' } },
        take: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        todayCount,
        byAction: byAction.map((r) => ({ action: r.action, count: r._count.action })),
        byUser: byUser.map((r) => ({ userEmail: r.userEmail, count: r._count.userEmail })),
        bySystem: bySystem
          .filter((r) => r.systemCode)
          .map((r) => ({ systemCode: r.systemCode, count: r._count.systemCode })),
        byTarget: byTarget
          .filter((r) => r.targetType)
          .map((r) => ({ targetType: r.targetType, count: r._count.targetType })),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/logs/report
 * 子系统上报操作日志
 * body: { userEmail, userName, action, systemCode, method, path, targetType, targetId, detail, requestBody, statusCode }
 */
router.post('/report', async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.userEmail || !data.action) {
      return res.status(400).json({ success: false, message: '缺少 userEmail 或 action' });
    }

    // 自动补充 IP 和 UA（子系统未传时从本请求获取）
    if (!data.ip) {
      data.ip = getClientIp(req);
    }
    if (!data.userAgent) {
      data.userAgent = req.headers['user-agent'] || null;
    }

    const record = await reportOperationLog(data);
    res.json({ success: true, data: { id: record.id } });
  } catch (err) {
    next(err);
  }
});

export default router;
