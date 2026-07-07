import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

const ALLOWED_FIELDS = ['employeeId', 'period', 'kpiScore', 'selfRating', 'selfSummary', 'mgrRating', 'mgrComments', 'finalRating', 'comments', 'status'];

export const listPerformances = async ({ page = 1, pageSize = 10, employeeId, period, status, departmentFilter } = {}) => {
  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (period) where.period = period;
  if (status) where.status = status;
  if (departmentFilter && !employeeId) where.employee = { departmentId: departmentFilter };

  const [total, data] = await Promise.all([
    prisma.performance.count({ where }),
    prisma.performance.findMany({
      where,
      include: { employee: { select: { id: true, name: true, employeeNo: true, department: { select: { name: true } } } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { page, pageSize, total, data };
};

export const getPerformance = async (id) => {
  const perf = await prisma.performance.findUnique({
    where: { id },
    include: { employee: { select: { id: true, name: true, employeeNo: true } } },
  });
  if (!perf) throw new AppError('绩效记录不存在', 404);
  return perf;
};

export const createPerformance = async (data) => {
  const cleanData = {};
  for (const key of ALLOWED_FIELDS) {
    if (data[key] !== undefined && data[key] !== '') cleanData[key] = data[key];
  }
  if (!cleanData.employeeId) throw new AppError('请选择员工', 400);
  if (!cleanData.period) throw new AppError('请填写考核周期', 400);

  // 数值类型转换
  cleanData.kpiScore = Number(cleanData.kpiScore) || 0;
  if (cleanData.selfRating !== undefined) cleanData.selfRating = Number(cleanData.selfRating) || null;
  if (cleanData.mgrRating !== undefined) cleanData.mgrRating = Number(cleanData.mgrRating) || null;
  if (cleanData.finalRating !== undefined) cleanData.finalRating = Number(cleanData.finalRating) || null;
  if (!cleanData.status) cleanData.status = 'DRAFT';

  return prisma.performance.create({ data: cleanData, include: { employee: { select: { name: true, employeeNo: true } } } });
};

export const updatePerformance = async (id, data) => {
  const cleanData = {};
  for (const key of ALLOWED_FIELDS) {
    if (data[key] !== undefined) cleanData[key] = data[key];
  }
  // 数值类型转换
  if (cleanData.kpiScore !== undefined) cleanData.kpiScore = Number(cleanData.kpiScore) || 0;
  if (cleanData.selfRating !== undefined) cleanData.selfRating = cleanData.selfRating ? Number(cleanData.selfRating) : null;
  if (cleanData.mgrRating !== undefined) cleanData.mgrRating = cleanData.mgrRating ? Number(cleanData.mgrRating) : null;
  if (cleanData.finalRating !== undefined) cleanData.finalRating = cleanData.finalRating ? Number(cleanData.finalRating) : null;

  return prisma.performance.update({
    where: { id },
    data: cleanData,
    include: { employee: { select: { name: true, employeeNo: true } } },
  });
};

export const deletePerformance = async (id) => {
  const perf = await prisma.performance.findUnique({ where: { id } });
  if (!perf) throw new AppError('绩效记录不存在', 404);
  return prisma.performance.delete({ where: { id } });
};

/* ========= 员工提交自评 ========= */
export const submitSelfReview = async (id, employeeId, { selfRating, selfSummary }) => {
  const perf = await prisma.performance.findUnique({ where: { id } });
  if (!perf) throw new AppError('绩效记录不存在', 404);
  if (perf.employeeId !== employeeId) throw new AppError('无权操作', 403);
  if (!selfRating) throw new AppError('请填写自评分数', 400);
  if (!selfSummary || !selfSummary.trim()) throw new AppError('请填写自评总结', 400);

  return prisma.performance.update({
    where: { id },
    data: {
      selfRating: Number(selfRating),
      selfSummary: selfSummary.trim(),
      status: 'MGR_REVIEW',
    },
    include: { employee: { select: { name: true, employeeNo: true } } },
  });
};

/* ========= 经理提交评审 ========= */
export const submitMgrReview = async (id, { mgrRating, mgrComments, finalRating }) => {
  const perf = await prisma.performance.findUnique({ where: { id } });
  if (!perf) throw new AppError('绩效记录不存在', 404);
  if (perf.status !== 'MGR_REVIEW') throw new AppError('当前状态不允许提交评审', 400);

  return prisma.performance.update({
    where: { id },
    data: {
      mgrRating: mgrRating ? Number(mgrRating) : null,
      mgrComments: mgrComments || null,
      finalRating: finalRating ? Number(finalRating) : (mgrRating ? Number(mgrRating) : null),
      status: 'COMPLETED',
    },
    include: { employee: { select: { name: true, employeeNo: true } } },
  });
};
