import { Router } from 'express';
import multer from 'multer';
import * as payrollService from '../services/payroll.service.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getDepartmentFilter } from '../middleware/departmentScope.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    }
  },
});

// 列表（已添加数据隔离：部门负责人只能看本部门薪资数据）
router.get('/records', authenticate, async (req, res, next) => {
  try {
    const { month, department, company, search, page, pageSize } = req.query;
    // 数据隔离：非管理员强制只看本部门
    const deptFilter = getDepartmentFilter(req);
    const result = await payrollService.listPayrollRecords({
      month,
      department: deptFilter || department,
      company,
      search,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 统计汇总（已添加数据隔离）
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const { month } = req.query;
    const deptFilter = getDepartmentFilter(req);
    const result = await payrollService.getPayrollSummary(month, deptFilter);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 详情
router.get('/records/:id', authenticate, async (req, res, next) => {
  try {
    const record = await payrollService.getPayrollRecord(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: '记录不存在' });
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

// 更新
router.put('/records/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const record = await payrollService.updatePayrollRecord(req.params.id, req.body);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

// 删除单条
router.delete('/records/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    await payrollService.deletePayrollRecord(req.params.id);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
});

// 按月份批量删除
router.delete('/records', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ success: false, message: '请提供月份' });
    const result = await payrollService.deletePayrollByMonth(month);
    res.json({ success: true, data: { deleted: result.count } });
  } catch (err) {
    next(err);
  }
});

// 下载导入模板
router.get('/template', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { month } = req.query;
    const buffer = await payrollService.generateTemplate(month);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=payroll_template.xlsx`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});

// 导出 Excel
router.get('/export', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { month, department, company } = req.query;
    const buffer = await payrollService.exportPayrollExcel({ month, department, company });
    const filename = month ? `payroll_${month}.xlsx` : `payroll_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});

// 导入 Excel
router.post('/import', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '请上传 Excel 文件' });
    const result = await payrollService.importPayrollExcel(req.file.buffer);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 从员工表初始化当月工资记录
router.post('/init', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { month, departmentId } = req.body;
    if (!month) return res.status(400).json({ success: false, message: '请提供月份' });
    const result = await payrollService.initFromEmployees(month, departmentId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 从上月复制数据
router.post('/copy-last-month', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ success: false, message: '请提供月份' });
    const result = await payrollService.copyFromLastMonth(month);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 批量保存工资记录
router.post('/batch-update', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ success: false, message: '请提供记录数组' });
    const result = await payrollService.batchUpdatePayrollRecords(records);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
