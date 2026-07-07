import { Router } from 'express';
import * as trainingService from '../services/training.service.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

// 培训课程 CRUD
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, pageSize, status } = req.query;
    const result = await trainingService.listTrainings({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 10,
      status,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 员工累计培训学时
router.get('/hours', authenticate, async (req, res, next) => {
  try {
    const { employeeId } = req.query;
    const result = await trainingService.getEmployeeTrainingHours(employeeId || null);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 通过签到码签到（扫码或手动输入签到码）——必须在 :id 路由之前
router.post('/signin', authenticate, async (req, res, next) => {
  try {
    const { signinCode, method } = req.body;
    let employeeId = req.user.employeeId;

    // 兜底：旧 token 中没有 employeeId
    if (!employeeId) {
      const { PrismaClient } = await import('@prisma/client');
      const prisma2 = new PrismaClient();
      const u = await prisma2.user.findUnique({ where: { id: req.user.userId }, select: { employeeId: true } });
      employeeId = u?.employeeId || null;
    }
    if (!employeeId) {
      return res.status(400).json({ success: false, message: '当前账号未绑定员工信息' });
    }

    const result = await trainingService.signinByCode(signinCode, employeeId, method || 'MANUAL');
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await trainingService.getTraining(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const result = await trainingService.createTraining(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const result = await trainingService.updateTraining(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const result = await trainingService.deleteTraining(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 员工报名
router.post('/:id/enroll', authenticate, async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    const result = await trainingService.enrollTraining(req.params.id, employeeId);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 取消报名
router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    const result = await trainingService.cancelEnrollment(req.params.id, employeeId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 更新培训成绩
router.put('/enrollment/:enrollmentId', authenticate, authorize('HR_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const result = await trainingService.updateEnrollmentScore(req.params.enrollmentId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 管理员手动签到（指定员工）
router.post('/:id/signin', authenticate, authorize('HR_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: '请选择员工' });
    }
    const result = await trainingService.signinByTrainingId(req.params.id, employeeId, 'MANUAL');
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
