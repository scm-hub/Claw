import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

const TRAINING_FIELDS = ['title', 'description', 'instructor', 'startDate', 'endDate', 'location', 'capacity'];

/* ---- 日期计算状态 ---- */
const computeStatus = (training) => {
  if (training.status === 'CANCELLED') return 'CANCELLED';
  const now = new Date();
  const start = new Date(training.startDate);
  const end = new Date(training.endDate);
  if (end < now) return 'COMPLETED';
  if (start <= now) return 'IN_PROGRESS';
  return 'PLANNED';
};

/* ---- 生成随机签到码 ---- */
const generateSigninCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

export const listTrainings = async ({ page = 1, pageSize = 10, status } = {}) => {
  const now = new Date();
  const where = {};

  // 将状态筛选项翻译为日期条件
  if (status) {
    if (status === 'CANCELLED') {
      where.status = 'CANCELLED';
    } else if (status === 'PLANNED') {
      where.status = { not: 'CANCELLED' };
      where.startDate = { gt: now };
    } else if (status === 'IN_PROGRESS') {
      where.status = { not: 'CANCELLED' };
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    } else if (status === 'COMPLETED') {
      where.status = { not: 'CANCELLED' };
      where.endDate = { lt: now };
    }
  }

  const [total, data] = await Promise.all([
    prisma.training.count({ where }),
    prisma.training.findMany({
      where,
      include: { _count: { select: { enrollments: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { startDate: 'desc' },
    }),
  ]);
  const result = data.map((t) => ({
    ...t,
    status: computeStatus(t),
    enrollmentCount: t._count.enrollments,
    _count: undefined,
  }));
  return { page, pageSize, total, data: result };
};

export const getTraining = async (id) => {
  const training = await prisma.training.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: { employee: { select: { id: true, name: true, employeeNo: true, department: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!training) throw new AppError('培训课程不存在', 404);
  return { ...training, status: computeStatus(training) };
};

export const createTraining = async (data) => {
  const cleanData = {};
  for (const key of TRAINING_FIELDS) {
    if (data[key] !== undefined && data[key] !== '') cleanData[key] = data[key];
  }
  if (!cleanData.title) throw new AppError('课程名称不能为空', 400);
  if (!cleanData.startDate) throw new AppError('请选择开始日期', 400);
  if (!cleanData.endDate) throw new AppError('请选择结束日期', 400);

  cleanData.startDate = new Date(cleanData.startDate);
  cleanData.endDate = new Date(cleanData.endDate);
  if (cleanData.endDate <= cleanData.startDate) throw new AppError('结束日期必须晚于开始日期', 400);
  cleanData.capacity = Number(cleanData.capacity) || 30;
  if (!cleanData.status) cleanData.status = 'PLANNED';

  // 生成唯一签到码
  let signinCode;
  for (let i = 0; i < 5; i++) {
    signinCode = generateSigninCode();
    const existing = await prisma.training.findUnique({ where: { signinCode } });
    if (!existing) break;
    if (i === 4) throw new AppError('签到码生成失败，请重试', 500);
  }
  cleanData.signinCode = signinCode;

  return prisma.training.create({ data: cleanData });
};

export const updateTraining = async (id, data) => {
  const cleanData = {};
  for (const key of TRAINING_FIELDS) {
    if (data[key] !== undefined) cleanData[key] = data[key];
  }
  if (cleanData.startDate) cleanData.startDate = new Date(cleanData.startDate);
  if (cleanData.endDate) cleanData.endDate = new Date(cleanData.endDate);
  if (cleanData.capacity !== undefined) cleanData.capacity = Number(cleanData.capacity) || 30;

  return prisma.training.update({ where: { id }, data: cleanData });
};

export const deleteTraining = async (id) => {
  const training = await prisma.training.findUnique({ where: { id }, include: { _count: { select: { enrollments: true } } } });
  if (!training) throw new AppError('培训课程不存在', 404);
  if (training._count.enrollments > 0) throw new AppError('该课程已有员工报名，无法删除', 400);
  return prisma.training.delete({ where: { id } });
};

// 员工报名
export const enrollTraining = async (trainingId, employeeId) => {
  const training = await prisma.training.findUnique({ where: { id: trainingId }, include: { _count: { select: { enrollments: true } } } });
  if (!training) throw new AppError('培训课程不存在', 404);
  const effectiveStatus = computeStatus(training);
  if (effectiveStatus === 'COMPLETED') throw new AppError('课程已结束，无法报名', 400);
  if (effectiveStatus === 'CANCELLED') throw new AppError('课程已取消，无法报名', 400);
  if (training._count.enrollments >= training.capacity) throw new AppError('课程名额已满', 400);

  const existing = await prisma.trainingEnrollment.findUnique({
    where: { trainingId_employeeId: { trainingId, employeeId } },
  });
  if (existing) throw new AppError('该员工已报名此课程', 400);

  return prisma.trainingEnrollment.create({
    data: { trainingId, employeeId, status: 'ENROLLED' },
    include: { employee: { select: { name: true, employeeNo: true } } },
  });
};

// 取消报名
export const cancelEnrollment = async (trainingId, employeeId) => {
  const enrollment = await prisma.trainingEnrollment.findUnique({
    where: { trainingId_employeeId: { trainingId, employeeId } },
  });
  if (!enrollment) throw new AppError('未找到报名记录', 404);
  if (enrollment.signinTime) throw new AppError('该员工已签到，无法取消报名', 400);

  return prisma.trainingEnrollment.update({
    where: { id: enrollment.id },
    data: { status: 'CANCELLED' },
  });
};

// 更新培训成绩
export const updateEnrollmentScore = async (enrollmentId, data) => {
  const cleanData = {};
  if (data.score !== undefined) cleanData.score = Number(data.score) || null;
  if (data.comment !== undefined) cleanData.comment = data.comment;
  if (data.status !== undefined) cleanData.status = data.status;

  return prisma.trainingEnrollment.update({
    where: { id: enrollmentId },
    data: cleanData,
    include: { employee: { select: { name: true, employeeNo: true } } },
  });
};

/* ========= 签到 ========= */

/**
 * 扫码签到：通过 signinCode 查找培训，员工签到
 * @param signinCode 签到码（二维码内容）
 * @param employeeId 签到员工 ID
 * @param method 签到方式：QR / MANUAL
 */
export const signinByCode = async (signinCode, employeeId, method = 'QR') => {
  const training = await prisma.training.findUnique({ where: { signinCode } });
  if (!training) throw new AppError('无效的签到码', 404);
  const effectiveStatus = computeStatus(training);
  if (effectiveStatus === 'CANCELLED') throw new AppError('该培训已取消', 400);
  if (effectiveStatus === 'COMPLETED') throw new AppError('该培训已结束，无法签到', 400);

  // 查找报名记录
  const enrollment = await prisma.trainingEnrollment.findUnique({
    where: { trainingId_employeeId: { trainingId: training.id, employeeId } },
    include: { employee: { select: { name: true, employeeNo: true } } },
  });
  if (!enrollment) throw new AppError('您未报名此培训，无法签到', 400);
  if (enrollment.status === 'CANCELLED') throw new AppError('报名已取消，无法签到', 400);
  if (enrollment.signinTime) throw new AppError('已签到，无需重复签到', 400);

  return prisma.trainingEnrollment.update({
    where: { id: enrollment.id },
    data: {
      signinTime: new Date(),
      signinMethod: method,
      status: 'SIGNED_IN',
    },
    include: {
      employee: { select: { name: true, employeeNo: true } },
      training: { select: { id: true, title: true } },
    },
  });
};

/**
 * 手动签到：通过 trainingId 签到（管理员帮员工签到或员工手动输入签到码）
 */
export const signinByTrainingId = async (trainingId, employeeId, method = 'MANUAL') => {
  const training = await prisma.training.findUnique({ where: { id: trainingId } });
  if (!training) throw new AppError('培训课程不存在', 404);

  const enrollment = await prisma.trainingEnrollment.findUnique({
    where: { trainingId_employeeId: { trainingId, employeeId } },
    include: { employee: { select: { name: true, employeeNo: true } } },
  });
  if (!enrollment) throw new AppError('该员工未报名此培训', 400);
  if (enrollment.status === 'CANCELLED') throw new AppError('报名已取消，无法签到', 400);
  if (enrollment.signinTime) throw new AppError('已签到，无需重复签到', 400);

  return prisma.trainingEnrollment.update({
    where: { id: enrollment.id },
    data: {
      signinTime: new Date(),
      signinMethod: method,
      status: 'SIGNED_IN',
    },
    include: {
      employee: { select: { name: true, employeeNo: true } },
      training: { select: { id: true, title: true } },
    },
  });
};

/* ========= 员工累计培训学时 ========= */
export const getEmployeeTrainingHours = async (employeeId) => {
  const where = { signinTime: { not: null } };
  if (employeeId) where.employeeId = employeeId;

  const enrollments = await prisma.trainingEnrollment.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, employeeNo: true, department: { select: { name: true } } } },
      training: { select: { id: true, title: true, startDate: true, endDate: true } },
    },
    orderBy: { signinTime: 'desc' },
  });

  // 按员工分组计算学时（每天 8 学时，最少 1 天）
  const employeeMap = {};
  for (const enr of enrollments) {
    const empId = enr.employeeId;
    if (!employeeMap[empId]) {
      employeeMap[empId] = {
        employee: enr.employee,
        totalHours: 0,
        records: [],
      };
    }
    const training = enr.training;
    const days = Math.max(1, Math.ceil((new Date(training.endDate) - new Date(training.startDate)) / (1000 * 60 * 60 * 24)) + 1);
    const hours = days * 8;
    employeeMap[empId].totalHours += hours;
    employeeMap[empId].records.push({
      trainingId: training.id,
      trainingTitle: training.title,
      startDate: training.startDate,
      endDate: training.endDate,
      days,
      hours,
      signinTime: enr.signinTime,
    });
  }

  const result = Object.values(employeeMap).sort((a, b) => b.totalHours - a.totalHours);

  if (employeeId) {
    return result[0] || { employee: null, totalHours: 0, records: [] };
  }
  return result;
};
