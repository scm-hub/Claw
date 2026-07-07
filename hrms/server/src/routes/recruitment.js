import { Router } from 'express';
import path from 'path';
import * as recService from '../services/recruitment.service.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getDepartmentFilter } from '../middleware/departmentScope.js';
import { uploadResumeFile } from '../middleware/upload.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

/* ========== 职位 ========== */

// 统计数据
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    let departmentName = undefined;
    if (departmentFilter) {
      const dept = await prisma.department.findUnique({ where: { id: departmentFilter }, select: { name: true } });
      departmentName = dept?.name;
    }
    const result = await recService.getJobStats(departmentName);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 职位列表（支持筛选、搜索、分页）
router.get('/jobs', authenticate, async (req, res, next) => {
  try {
    const { status, type, search, page, pageSize } = req.query;
    const departmentFilter = getDepartmentFilter(req);
    let departmentName = undefined;
    if (departmentFilter) {
      const dept = await prisma.department.findUnique({ where: { id: departmentFilter }, select: { name: true } });
      departmentName = dept?.name;
    }
    const result = await recService.listJobs({
      status,
      type,
      search,
      department: departmentName,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 10,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 创建职位
router.post('/jobs', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { title, department, location, type, salary, description, requirements, headcount, urgency, startDate, endDate } = req.body;
    if (!title || !department) {
      return res.status(400).json({ success: false, message: '岗位名称和部门为必填项' });
    }
    const result = await recService.createJob({
      title: title.trim(),
      department,
      location: location || '',
      type: type || 'FULL_TIME',
      salary: salary || '',
      description: description || '',
      requirements: requirements || '',
      headcount: parseInt(headcount) || 1,
      urgency: urgency || 'NORMAL',
      startDate: startDate || null,
      endDate: endDate || null,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 更新职位
router.put('/jobs/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { title, department, location, type, salary, description, requirements, headcount, urgency, status, startDate, endDate } = req.body;
    const data = {};
    if (title !== undefined) data.title = title.trim();
    if (department !== undefined) data.department = department;
    if (location !== undefined) data.location = location;
    if (type !== undefined) data.type = type;
    if (salary !== undefined) data.salary = salary;
    if (description !== undefined) data.description = description;
    if (requirements !== undefined) data.requirements = requirements;
    if (headcount !== undefined) data.headcount = parseInt(headcount) || 1;
    if (urgency !== undefined) data.urgency = urgency;
    if (status !== undefined) data.status = status;
    if (startDate !== undefined) data.startDate = startDate || null;
    if (endDate !== undefined) data.endDate = endDate || null;
    const result = await recService.updateJob(req.params.id, data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 删除职位
router.delete('/jobs/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    await recService.deleteJob(req.params.id);
    res.json({ success: true, message: '岗位已删除' });
  } catch (err) {
    next(err);
  }
});

/* ========== 候选人 ========== */

// 获取候选人列表（支持按职位过滤）
router.get('/candidates', authenticate, async (req, res, next) => {
  try {
    const { jobId } = req.query;
    if (!jobId) return res.status(400).json({ success: false, message: '请指定岗位' });
    const result = await recService.getCandidates(jobId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 获取某个职位的候选人
router.get('/jobs/:id/candidates', authenticate, async (req, res, next) => {
  try {
    const result = await recService.getCandidates(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 添加候选人（支持简历文件上传）
router.post('/candidates', authenticate, authorize('HR_ADMIN'), uploadResumeFile.single('resumeFile'), async (req, res, next) => {
  try {
    const { jobId, name, email, phone, resume, source } = req.body;
    if (!jobId || !name) {
      return res.status(400).json({ success: false, message: '岗位和姓名为必填项' });
    }
    let resumeFileData = null;
    if (req.file) {
      resumeFileData = JSON.stringify({
        originalName: req.file.originalname,
        filePath: req.file.path.replace(process.cwd(), ''),
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      });
    }
    const result = await recService.addCandidate({
      jobId,
      name: name.trim(),
      email: email || '',
      phone: phone || '',
      resume: resume || '',
      resumeFile: resumeFileData,
      source: source || '',
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 更新候选人（面试信息、评价等）
router.put('/candidates/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { name, email, phone, notes, interviewDate, interviewer, rating, stage, rejectReason } = req.body;
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (notes !== undefined) data.notes = notes;
    if (interviewDate !== undefined) data.interviewDate = interviewDate ? new Date(interviewDate) : null;
    if (interviewer !== undefined) data.interviewer = interviewer;
    if (rating !== undefined) data.rating = parseInt(rating) || 0;
    if (stage !== undefined) data.stage = stage;
    if (rejectReason !== undefined) data.rejectReason = rejectReason;
    const result = await recService.updateCandidate(req.params.id, data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 更新候选人阶段
router.put('/candidates/:id/stage', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { stage, rejectReason } = req.body;
    if (!stage) return res.status(400).json({ success: false, message: '请提供候选人阶段' });
    const data = { stage };
    if (stage === 'REJECTED' && rejectReason) data.rejectReason = rejectReason;
    const result = await recService.updateCandidateStage(req.params.id, data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 删除候选人
router.delete('/candidates/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    await recService.deleteCandidate(req.params.id);
    res.json({ success: true, message: '候选人已删除' });
  } catch (err) {
    next(err);
  }
});

// 下载简历文件
router.get('/candidates/:id/resume', authenticate, async (req, res, next) => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { id: req.params.id } });
    if (!candidate || !candidate.resumeFile) {
      return res.status(404).json({ success: false, message: '简历文件未找到' });
    }
    const fileInfo = JSON.parse(candidate.resumeFile);
    const fullPath = path.join(process.cwd(), fileInfo.filePath);
    res.setHeader('Content-Type', fileInfo.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileInfo.originalName)}"`);
    res.sendFile(fullPath);
  } catch (err) {
    next(err);
  }
});

export default router;
