import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();

/**
 * GET /api/sync-logs — 同步日志列表
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, syncType, status } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where = {};
    if (syncType) where.syncType = syncType;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take,
      }),
      prisma.syncLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page: Number(page), pageSize: take, total },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/sync-logs/:id — 单条日志详情
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const log = await prisma.syncLog.findUnique({
      where: { id: req.params.id },
    });
    if (!log) {
      return res.status(404).json({ success: false, message: '日志不存在' });
    }
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
