import { Router } from 'express';
import * as leaveService from '../services/leave.service.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
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

router.post('/', authenticate, async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req.user.userId);
    if (!employeeId) return res.status(400).json({ success: false, message: '未关联员工信息' });
    const result = await leaveService.applyLeave({ ...req.body, employeeId });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req.user.userId);
    if (!employeeId) return res.status(400).json({ success: false, message: '未关联员工信息' });
    const result = await leaveService.getMyLeaves(employeeId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/** 查询当前员工的审批人（沿部门层级向上查找） */
router.get('/approver', authenticate, async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req.user.userId);
    if (!employeeId) return res.status(400).json({ success: false, message: '未关联员工信息' });
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { departmentId: true, department: { select: { name: true, managerId: true, manager: { select: { id: true, name: true } } } } },
    });
    const deptManagerId = employee?.department?.managerId;
    const isDeptManager = deptManagerId === employeeId;

    let approver = null;
    let approverDeptName = '';

    if (isDeptManager) {
      // 部门经理请假 → 沿上级部门找审批人
      let currentDeptId = employee?.departmentId;
      const visited = new Set();
      while (currentDeptId && !visited.has(currentDeptId)) {
        visited.add(currentDeptId);
        const parentDept = await prisma.department.findUnique({
          where: { id: currentDeptId },
          select: { parentId: true },
        });
        if (!parentDept?.parentId) break;
        const parent = await prisma.department.findUnique({
          where: { id: parentDept.parentId },
          include: { manager: { select: { id: true, name: true } } },
        });
        if (!parent) break;
        if (parent.manager && parent.manager.id !== employeeId) {
          approver = parent.manager;
          approverDeptName = parent.name;
          break;
        }
        currentDeptId = parent.id;
      }
    } else if (employee?.department?.manager) {
      approver = employee.department.manager;
      approverDeptName = employee.department.name;
    }

    const needsAdminApproval = isDeptManager && !approver;

    res.json({
      success: true,
      data: {
        approver: approver ? { id: approver.id, name: approver.name, departmentName: approverDeptName } : null,
        departmentName: employee?.department?.name || '',
        needsAdminApproval,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/pending', authenticate, async (req, res, next) => {
  try {
    const { role } = req.user;
    let options = { statusParam: req.query.status || null };

    if (role === 'SUPER_ADMIN' || role === 'HR_ADMIN') {
      // 管理员可看全部，不过滤
    } else if (role === 'MANAGER') {
      // 经理只看自己管理的部门的请假
      const employeeId = await getEmployeeId(req.user.userId);
      options.managerEmployeeId = employeeId;
    } else {
      // 普通员工不能看审批列表
      return res.json({ success: true, data: [] });
    }

    const result = await leaveService.getPendingLeaves(options);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/approve', authenticate, authorize('HR_ADMIN', 'MANAGER', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req.user.userId);
    const { role } = req.user;
    const { status, comment } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: '无效的审批状态' });
    }
    const result = await leaveService.approveLeave(req.params.id, employeeId, status, comment, role);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('无权审批') || err.message.includes('无法找到') || err.message.includes('已处理') || err.message.includes('不存在') || err.message.includes('不能审批自己') || err.message.includes('需由管理员')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
});

router.put('/:id/resubmit', authenticate, async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req.user.userId);
    if (!employeeId) return res.status(400).json({ success: false, message: '未关联员工信息' });
    const { startDate, endDate, reason, duration, durationUnit, startTime } = req.body;
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }
    const result = await leaveService.resubmitLeave(req.params.id, employeeId, { startDate, endDate, reason, duration, durationUnit, startTime });
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('仅可重新申请') || err.message.includes('无权操作') || err.message.includes('不存在')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
});

router.get('/balance', authenticate, async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req.user.userId);
    if (!employeeId) return res.status(400).json({ success: false, message: '未关联员工信息' });
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const result = await leaveService.getLeaveBalance(employeeId, year);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
