import { Router } from 'express';
import * as perfService from '../services/performance.service.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getDepartmentFilter } from '../middleware/departmentScope.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, pageSize, employeeId, period, status } = req.query;
    const departmentFilter = getDepartmentFilter(req);
    const result = await perfService.listPerformances({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 10,
      employeeId,
      period,
      status,
      departmentFilter,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await perfService.getPerformance(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize('HR_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const result = await perfService.createPerformance(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, authorize('HR_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const result = await perfService.updatePerformance(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const result = await perfService.deletePerformance(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/* ========= 员工提交自评 ========= */
router.patch('/:id/self-submit', authenticate, async (req, res, next) => {
  try {
    let { employeeId } = req.user;
    // 兜底：旧 token 中没有 employeeId，从数据库补查
    if (!employeeId) {
      const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { employeeId: true } });
      employeeId = user?.employeeId || null;
    }
    const result = await perfService.submitSelfReview(
      req.params.id,
      employeeId,
      req.body,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/* ========= 经理提交评审 ========= */
router.patch('/:id/mgr-submit', authenticate, authorize('HR_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const result = await perfService.submitMgrReview(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
