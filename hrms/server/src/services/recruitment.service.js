import { PrismaClient } from '@prisma/client';
import * as onboardingService from './onboarding.service.js';

const prisma = new PrismaClient();

const JOB_SELECT = { id: true, title: true, department: true, location: true, type: true, salary: true, description: true, requirements: true, headcount: true, urgency: true, status: true, startDate: true, endDate: true, createdAt: true, updatedAt: true };

/* ========== 职位 ========== */

export const listJobs = async ({ status, department, type, search, page = 1, pageSize = 10 }) => {
  const where = {};
  if (status) where.status = status;
  if (department) where.department = department;
  if (type) where.type = type;
  if (search) where.title = { contains: search };
  const [total, data] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      select: { ...JOB_SELECT, _count: { select: { candidates: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { page, pageSize, total, data };
};

export const createJob = async (data) => {
  // 根据开始/结束时间自动判断状态
  if (data.startDate && data.endDate) {
    const now = new Date();
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (now < start) data.status = 'PENDING';
    else if (now > end) data.status = 'CLOSED';
    else data.status = 'OPEN';
  }
  if (data.startDate) data.startDate = new Date(data.startDate);
  else data.startDate = null;
  if (data.endDate) data.endDate = new Date(data.endDate);
  else data.endDate = null;
  return prisma.job.create({ data, include: { _count: { select: { candidates: true } } } });
};

export const updateJob = async (id, data) => {
  // 根据开始/结束时间自动判断状态
  if (data.startDate || data.endDate) {
    const current = await prisma.job.findUnique({ where: { id }, select: { startDate: true, endDate: true } });
    const start = data.startDate ? new Date(data.startDate) : current.startDate;
    const end = data.endDate ? new Date(data.endDate) : current.endDate;
    if (start && end) {
      const now = new Date();
      if (now < start) data.status = 'PENDING';
      else if (now > end) data.status = 'CLOSED';
      else data.status = 'OPEN';
    }
  }
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  return prisma.job.update({ where: { id }, data, include: { _count: { select: { candidates: true } } } });
};

export const deleteJob = async (id) => {
  // 先删除关联的候选人，再删除职位
  await prisma.candidate.deleteMany({ where: { jobId: id } });
  return prisma.job.delete({ where: { id } });
};

export const getJobStats = async (departmentName) => {
  const where = departmentName ? { department: departmentName } : {};
  const [total, open, closed, pending] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.count({ where: { ...where, status: 'OPEN' } }),
    prisma.job.count({ where: { ...where, status: 'CLOSED' } }),
    prisma.job.count({ where: { ...where, status: 'PENDING' } }),
  ]);
  const totalCandidates = await prisma.candidate.count({
    where: departmentName ? { job: { department: departmentName } } : {},
  });
  return { totalJobs: total, openJobs: open, closedJobs: closed, pendingJobs: pending, totalCandidates };
};

/* ========== 候选人 ========== */

export const getCandidates = async (jobId) => {
  return prisma.candidate.findMany({
    where: { jobId },
    orderBy: [{ updatedAt: 'desc' }],
  });
};

export const addCandidate = async (data) => {
  return prisma.candidate.create({ data });
};

export const updateCandidate = async (id, data) => {
  return prisma.candidate.update({ where: { id }, data });
};

export const deleteCandidate = async (id) => {
  return prisma.candidate.delete({ where: { id } });
};

export const updateCandidateStage = async (candidateId, data) => {
  const stage = typeof data === 'string' ? data : data.stage;
  const rejectReason = typeof data === 'object' ? data.rejectReason : undefined;

  const updateData = { stage };
  if (stage === 'REJECTED' && rejectReason) updateData.rejectReason = rejectReason;

  // 当候选人进入「已发Offer」阶段时，只创建入职管理记录（不创建员工）
  let onboardingCreated = false;

  if (stage === 'OFFERED') {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { job: true },
    });
    if (candidate) {
      // 查找部门（Job.department 是部门名称字符串）
      let department = null;
      if (candidate.job?.department) {
        department = await prisma.department.findFirst({
          where: { name: candidate.job.department },
        });
      }

      // 创建入职管理记录（带候选人信息，不创建员工）
      try {
        await onboardingService.createOnboarding({
          hireDate: new Date().toISOString(),
          notes: `从招聘「${candidate.job?.title || ''}」自动转入（已发Offer阶段）`,
          candidateName: candidate.name,
          candidatePhone: candidate.phone || '',
          candidateEmail: candidate.email || '',
          candidateDeptId: department?.id || null,
          candidatePositionTitle: candidate.job?.title || '',
        });
        onboardingCreated = true;
      } catch (onbErr) {
        console.error('自动创建入职记录失败:', onbErr.message);
      }
    }
  }

  const result = await prisma.candidate.update({
    where: { id: candidateId },
    data: updateData,
  });

  return { ...result, onboardingCreated };
};
