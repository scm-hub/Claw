import { Router } from 'express';
import * as contractService from '../services/contract.service.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getDepartmentFilter } from '../middleware/departmentScope.js';
import { uploadContractFile } from '../middleware/upload.js';
import path from 'path';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, pageSize, employeeId, type, status, search, departmentId } = req.query;
    const departmentFilter = getDepartmentFilter(req);
    const result = await contractService.listContracts({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 10,
      employeeId,
      type,
      status,
      departmentFilter,
      search,
      departmentId,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const contract = await contractService.getContract(req.params.id);
    res.json({ success: true, data: contract });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const contract = await contractService.createContract(req.body);
    res.status(201).json({ success: true, data: contract });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const contract = await contractService.updateContract(req.params.id, req.body);
    res.json({ success: true, data: contract });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const contract = await contractService.deleteContract(req.params.id);
    res.json({ success: true, data: contract });
  } catch (err) {
    next(err);
  }
});

/* ========= 附件相关路由 ========= */

// 合同续签
router.post('/:id/renew', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { startDate, endDate, type, terms, contractNo } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: '请提供新合同的开始和结束日期' });
    }
    const newContract = await contractService.renewContract(req.params.id, { startDate, endDate, type, terms, contractNo });
    res.status(201).json({ success: true, data: newContract });
  } catch (err) {
    if (err.message.includes('不存在') || err.message.includes('已被续签') || err.message.includes('必须晚于')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
});

// 获取续签历史链
router.get('/:id/renewal-history', authenticate, async (req, res, next) => {
  try {
    const chain = await contractService.getRenewalHistory(req.params.id);
    res.json({ success: true, data: chain });
  } catch (err) {
    next(err);
  }
});

// 上传附件（单个合同上传 PDF）
router.post('/:id/attachments', authenticate, authorize('HR_ADMIN'), uploadContractFile.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new Error('请选择要上传的 PDF 文件');
    const attachment = await contractService.addAttachment(req.params.id, req.file);
    res.status(201).json({ success: true, data: attachment });
  } catch (err) {
    // multer 错误处理
    if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: '文件大小不能超过 10MB' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
});

// 获取合同的附件列表
router.get('/:id/attachments', authenticate, async (req, res, next) => {
  try {
    const attachments = await contractService.listAttachments(req.params.id);
    res.json({ success: true, data: attachments });
  } catch (err) {
    next(err);
  }
});

// 下载/查看附件
router.get('/attachments/:attachmentId', authenticate, async (req, res, next) => {
  try {
    const attachment = await contractService.getAttachment(req.params.attachmentId);
    const fullPath = path.join(process.cwd(), attachment.filePath);

    // 设置响应头
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalName)}"`);

    // 如果是下载模式
    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalName)}"`);
    }

    res.sendFile(fullPath, (err) => {
      if (err) {
        res.status(404).json({ success: false, message: '文件不存在或已被删除' });
      }
    });
  } catch (err) {
    next(err);
  }
});

// 删除附件
router.delete('/attachments/:attachmentId', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const attachment = await contractService.deleteAttachment(req.params.attachmentId);
    res.json({ success: true, data: attachment });
  } catch (err) {
    next(err);
  }
});

export default router;
