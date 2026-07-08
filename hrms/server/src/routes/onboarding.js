import { Router } from 'express';
import * as onbService from '../services/onboarding.service.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getDepartmentFilter } from '../middleware/departmentScope.js';

const router = Router();

// 获取步骤定义
router.get('/steps', authenticate, (req, res) => {
  res.json({ success: true, data: onbService.getSteps() });
});

// 获取状态映射
router.get('/status-map', authenticate, (req, res) => {
  res.json({ success: true, data: onbService.getStatusMap() });
});

// 获取默认材料模板
router.get('/default-materials', authenticate, (req, res) => {
  res.json({ success: true, data: onbService.getDefaultMaterials() });
});

// 入职统计（已添加数据隔离）
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const deptFilter = getDepartmentFilter(req);
    const stats = await onbService.getStats(deptFilter);
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
});

// 入职记录列表（已添加数据隔离）
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, search, page, pageSize } = req.query;
    const deptFilter = getDepartmentFilter(req);
    const result = await onbService.listOnboardings({
      status: status || undefined,
      search: search || undefined,
      department: deptFilter || undefined,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 10,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// 获取单条入职记录
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await onbService.getOnboarding(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// 创建入职记录
router.post('/', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { employeeId, hireDate, mentorId, notes, materials } = req.body;
    if (!employeeId || !hireDate) {
      return res.status(400).json({ success: false, message: '员工和入职日期为必填项' });
    }
    const operatorName = req.user?.name || 'HR';
    const result = await onbService.createOnboarding({ employeeId, hireDate, mentorId, notes, materials });
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// 更新入职记录（基本信息：入职日期/导师/备注）
router.put('/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const result = await onbService.updateOnboarding(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// 步骤1: 提交入职材料（推进到HR审核）
router.put('/:id/submit-materials', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { materials } = req.body;
    const operatorName = req.user?.name || 'HR';
    const result = await onbService.submitMaterials(req.params.id, materials, operatorName);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// 步骤2: HR审核通过
router.put('/:id/hr-approve', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { remark } = req.body;
    const operatorName = req.user?.name || 'HR';
    const result = await onbService.hrApprove(req.params.id, operatorName, remark);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// 步骤2: HR审核驳回
router.put('/:id/hr-reject', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: '请提供驳回理由' });
    const operatorName = req.user?.name || 'HR';
    const result = await onbService.hrReject(req.params.id, reason, operatorName);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// 步骤3: 部门确认通过（HR_ADMIN / SUPER_ADMIN / 该部门负责人可操作）
router.put('/:id/dept-confirm', authenticate, async (req, res, next) => {
  try {
    const { remark } = req.body;
    const operatorName = req.user?.name || '部门负责人';

    // 权限校验：HR_ADMIN/SUPER_ADMIN 直接通过；其他角色需验证是否为该部门负责人
      if (req.user?.role !== 'HR_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        const record = await onbService.getOnboarding(req.params.id);
        // 兼容候选人模式：优先用 employee.department.managerId，fallback 到 candidateDept.managerId
        const deptManagerId = record.employee?.department?.managerId || record.candidateDept?.managerId;
        if (!deptManagerId || deptManagerId !== req.user.employeeId) {
          return res.status(403).json({ success: false, message: '仅限HR或该部门负责人操作' });
        }
      }

    const result = await onbService.deptConfirm(req.params.id, operatorName, remark);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// 步骤3: 部门确认驳回（HR_ADMIN / SUPER_ADMIN / 该部门负责人可操作）
router.put('/:id/dept-reject', authenticate, async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: '请提供驳回理由' });
    const operatorName = req.user?.name || '部门负责人';

    // 权限校验：HR_ADMIN/SUPER_ADMIN 直接通过；其他角色需验证是否为该部门负责人
      if (req.user?.role !== 'HR_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        const record = await onbService.getOnboarding(req.params.id);
        // 兼容候选人模式：优先用 employee.department.managerId，fallback 到 candidateDept.managerId
        const deptManagerId = record.employee?.department?.managerId || record.candidateDept?.managerId;
        if (!deptManagerId || deptManagerId !== req.user.employeeId) {
          return res.status(403).json({ success: false, message: '仅限HR或该部门负责人操作' });
        }
      }

    const result = await onbService.deptReject(req.params.id, reason, operatorName);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// 步骤4: 行政IT完成（HR_ADMIN / SUPER_ADMIN / HR 可操作）
router.put('/:id/admin-complete', authenticate, async (req, res, next) => {
  try {
    const { remark } = req.body;
    const operatorName = req.user?.name || '行政';

    // 权限校验：HR_ADMIN/SUPER_ADMIN/HR 可操作
    if (!['HR_ADMIN', 'SUPER_ADMIN', 'HR'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: '仅限HR操作' });
    }

    const result = await onbService.adminComplete(req.params.id, operatorName, remark);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// 更新单个材料状态
router.put('/:id/materials/:materialId', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { status, remark } = req.body;
    if (!status) return res.status(400).json({ success: false, message: '请提供材料状态' });
    const result = await onbService.updateMaterialStatus(req.params.id, req.params.materialId, status, remark);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// 删除入职记录
router.delete('/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    await onbService.deleteOnboarding(req.params.id);
    res.json({ success: true, message: '入职记录已删除' });
  } catch (err) { next(err); }
});

export default router;
