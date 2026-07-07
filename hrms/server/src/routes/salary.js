import { Router } from 'express';
import * as salaryService from '../services/salary.service.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getDepartmentFilter } from '../middleware/departmentScope.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

const getEmployeeId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: true },
  });
  return user?.employee?.id;
};

router.post('/calculate', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { month, force } = req.body;
    if (!month) return res.status(400).json({ success: false, message: '请提供月份' });
    const result = await salaryService.calculateMonthlySalary(month, !!force);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/records', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { month, departmentId, page, pageSize } = req.query;
    const departmentFilter = getDepartmentFilter(req);
    const result = await salaryService.getSalaryRecords({
      month,
      departmentId: departmentId || departmentFilter,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 10,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/my', authenticate, async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req.user.userId);
    if (!employeeId) return res.status(400).json({ success: false, message: '未关联员工信息' });
    const result = await salaryService.getMySalary(employeeId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/summary', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ success: false, message: '请提供月份参数' });
    const departmentFilter = getDepartmentFilter(req);
    const result = await salaryService.getSalarySummary(month, departmentFilter);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
