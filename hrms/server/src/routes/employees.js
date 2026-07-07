import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as empService from '../services/employee.service.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getDepartmentFilter } from '../middleware/departmentScope.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// 文件上传配置（照片 + 附件）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads/employee');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});
const fileUpload = multer({ storage: fileStorage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, pageSize, search, departmentId, status } = req.query;
    const departmentFilter = getDepartmentFilter(req);
    const result = await empService.listEmployees({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 10,
      search,
      departmentId: departmentId || departmentFilter,
      status,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/* ========= 导出员工 Excel ========= */
router.get('/export', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { search, departmentId, status, ids } = req.query;
    const departmentFilter = getDepartmentFilter(req);
    const buffer = await empService.exportEmployees({ search, departmentId: departmentId || departmentFilter, status, ids });
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=employees_${date}.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

/* ========= 下载导入模板 ========= */
router.get('/import/template', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const buffer = empService.generateImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=employee_import_template.xlsx');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

/* ========= 批量导入员工 ========= */
router.post('/import', authenticate, authorize('HR_ADMIN'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传 Excel 文件' });
    }
    const result = await empService.importEmployees(req.file.buffer);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const employee = await empService.getEmployee(req.params.id);
    // 额外查询该员工管理的部门
    const managedDepts = await empService.getManagedDepartments(req.params.id);
    res.json({ success: true, data: { ...employee, managedDepts } });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const employee = await empService.createEmployee(req.body);
    res.status(201).json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { newManagerId, ...empData } = req.body;
    const employee = await empService.updateEmployee(req.params.id, { ...empData, newManagerId });
    res.json({ success: true, data: employee });
  } catch (err) {
    if (err instanceof Error && err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
});

router.delete('/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const employee = await empService.deleteEmployee(req.params.id);
    res.json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
});

// ========= 上传员工照片 =========
router.post('/:id/photo', authenticate, authorize('HR_ADMIN'), fileUpload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '请上传照片' });
    const filePath = `/uploads/employee/${req.file.filename}`;
    // 更新员工照片字段
    await empService.updateEmployee(req.params.id, { photo: filePath });
    res.json({ success: true, data: { url: filePath } });
  } catch (err) {
    next(err);
  }
});

// ========= 上传附件（通用） =========
router.post('/upload-attachment', authenticate, authorize('HR_ADMIN'), fileUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '请上传文件' });
    const filePath = `/uploads/employee/${req.file.filename}`;
    res.json({ success: true, data: { url: filePath, originalName: req.file.originalName || req.file.originalname } });
  } catch (err) {
    next(err);
  }
});

export default router;
