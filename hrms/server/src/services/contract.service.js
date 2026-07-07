import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const ALLOWED_FIELDS = ['contractNo', 'employeeId', 'type', 'startDate', 'endDate', 'terms', 'socialInsuranceAccount', 'hasHousingFund', 'housingFundAccount'];

// 自动计算合同状态（基于日期，续签/终止状态除外）
const calcStatus = (startDate, endDate, currentStatus) => {
  // 续签中/已终止的状态保持不变
  if (currentStatus === 'RENEWED' || currentStatus === 'TERMINATED') return currentStatus;
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > now) return 'PENDING';
  if (end < now) return 'EXPIRED';
  return 'ACTIVE';
};

// 自动生成合同编号：HT-YYYYMMDD-NNNN
const generateContractNo = async () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  // 查找今天已有的最大编号
  const latest = await prisma.contract.findFirst({
    where: { contractNo: { startsWith: `HT-${dateStr}` } },
    orderBy: { contractNo: 'desc' },
    select: { contractNo: true },
  });
  let seq = 1;
  if (latest?.contractNo) {
    const match = latest.contractNo.match(/-(\d{4})$/);
    if (match) seq = parseInt(match[1], 10) + 1;
  }
  return `HT-${dateStr}-${String(seq).padStart(4, '0')}`;
};

export const listContracts = async ({ page = 1, pageSize = 10, employeeId, type, status, departmentFilter, search, departmentId } = {}) => {
  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (type) where.type = type;
  if (status) where.status = status;
  // 角色权限过滤：MANAGER/EMPLOYEE 只能看本部门，管理员看全部
  if (departmentFilter && !employeeId) {
    where.employee = { ...where.employee, departmentId: departmentFilter };
  }
  // 关键词搜索：员工姓名、合同编号
  if (search) {
    where.OR = [
      { employee: { name: { contains: search } } },
      { contractNo: { contains: search } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.contract.count({ where }),
    prisma.contract.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, employeeNo: true, department: { select: { name: true } } } },
        attachments: { orderBy: { uploadedAt: 'desc' } },
        renewedFrom: { select: { id: true, contractNo: true, startDate: true, endDate: true, status: true } },
        renewedTo: { select: { id: true, contractNo: true, startDate: true, endDate: true, status: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { page, pageSize, total, data };
};

export const getContract = async (id) => {
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
      attachments: { orderBy: { uploadedAt: 'desc' } },
      renewedFrom: { select: { id: true, contractNo: true, startDate: true, endDate: true, status: true } },
      renewedTo: { select: { id: true, contractNo: true, startDate: true, endDate: true, status: true } },
    },
  });
  if (!contract) throw new AppError('合同不存在', 404);
  return contract;
};

export const createContract = async (data) => {
  const cleanData = {};
  for (const key of ALLOWED_FIELDS) {
    if (data[key] !== undefined && data[key] !== '') cleanData[key] = data[key];
  }
  if (!cleanData.employeeId) throw new AppError('请选择员工', 400);
  if (!cleanData.type) throw new AppError('请选择合同类型', 400);
  if (!cleanData.startDate) throw new AppError('请选择开始日期', 400);
  if (!cleanData.endDate) throw new AppError('请选择结束日期', 400);

  cleanData.startDate = new Date(cleanData.startDate);
  cleanData.endDate = new Date(cleanData.endDate);
  if (cleanData.endDate <= cleanData.startDate) throw new AppError('结束日期必须晚于开始日期', 400);

  // 自动计算状态（始终根据日期判断，不接受手动传入）
  cleanData.status = calcStatus(cleanData.startDate, cleanData.endDate);

  // 自动生成合同编号
  if (!cleanData.contractNo) {
    cleanData.contractNo = await generateContractNo();
  }

  return prisma.contract.create({ data: cleanData, include: { employee: { select: { name: true, employeeNo: true } } } });
};

export const updateContract = async (id, data) => {
  const cleanData = {};
  for (const key of ALLOWED_FIELDS) {
    if (data[key] !== undefined) cleanData[key] = data[key];
  }
  if (cleanData.startDate) cleanData.startDate = new Date(cleanData.startDate);
  if (cleanData.endDate) cleanData.endDate = new Date(cleanData.endDate);
  if (cleanData.startDate && cleanData.endDate && cleanData.endDate <= cleanData.startDate) {
    throw new AppError('结束日期必须晚于开始日期', 400);
  }

  // 如果修改了日期，重新计算状态
  if (cleanData.startDate || cleanData.endDate) {
    const existing = await prisma.contract.findUnique({ where: { id }, select: { startDate: true, endDate: true, status: true } });
    if (existing) {
      const newStart = cleanData.startDate || existing.startDate;
      const newEnd = cleanData.endDate || existing.endDate;
      cleanData.status = calcStatus(newStart, newEnd, existing.status);
    }
  }

  return prisma.contract.update({
    where: { id },
    data: cleanData,
    include: { employee: { select: { name: true, employeeNo: true } } },
  });
};

export const deleteContract = async (id) => {
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { attachments: true },
  });
  if (!contract) throw new AppError('合同不存在', 404);

  // 删除附件文件
  for (const att of contract.attachments) {
    const fullPath = path.join(process.cwd(), att.filePath);
    try { fs.unlinkSync(fullPath); } catch { /* 文件可能已不存在 */ }
  }

  return prisma.contract.delete({ where: { id } });
};

/* ========= 附件相关 ========= */

export const addAttachment = async (contractId, file) => {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) throw new AppError('合同不存在', 404);

  return prisma.contractAttachment.create({
    data: {
      contractId,
      fileName: file.filename,
      originalName: file.originalname,
      filePath: `uploads/contracts/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
    },
  });
};

export const listAttachments = async (contractId) => {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) throw new AppError('合同不存在', 404);

  return prisma.contractAttachment.findMany({
    where: { contractId },
    orderBy: { uploadedAt: 'desc' },
  });
};

export const getAttachment = async (attachmentId) => {
  const attachment = await prisma.contractAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) throw new AppError('附件不存在', 404);
  return attachment;
};

export const deleteAttachment = async (attachmentId) => {
  const attachment = await prisma.contractAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) throw new AppError('附件不存在', 404);

  // 删除磁盘文件
  const fullPath = path.join(process.cwd(), attachment.filePath);
  try { fs.unlinkSync(fullPath); } catch { /* 文件可能已不存在 */ }

  return prisma.contractAttachment.delete({ where: { id: attachmentId } });
};

/* ========= 续签相关 ========= */

export const renewContract = async (originalContractId, renewalData) => {
  // 1. 查找原合同
  const original = await prisma.contract.findUnique({
    where: { id: originalContractId },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
    },
  });
  if (!original) throw new AppError('原合同不存在', 404);

  // 2. 校验：原合同不能已被续签
  const existingRenewal = await prisma.contract.findUnique({
    where: { renewedFromId: originalContractId },
  });
  if (existingRenewal) {
    throw new AppError('该合同已被续签，不能重复续签', 400);
  }

  // 3. 校验续签数据
  const newStartDate = new Date(renewalData.startDate);
  const newEndDate = new Date(renewalData.endDate);
  if (!renewalData.startDate) throw new AppError('请选择新合同开始日期', 400);
  if (!renewalData.endDate) throw new AppError('请选择新合同结束日期', 400);
  if (newEndDate <= newStartDate) throw new AppError('结束日期必须晚于开始日期', 400);

  // 4. 将原合同状态标记为 RENEWED（未到期）或 EXPIRED（已到期）
  const now = new Date();
  const originalEndDate = new Date(original.endDate);
  const newOriginalStatus = originalEndDate <= now ? 'EXPIRED' : 'RENEWED';
  await prisma.contract.update({
    where: { id: originalContractId },
    data: { status: newOriginalStatus },
  });

  // 5. 创建新合同，关联续签（根据开始日期判断状态）
  const newContractStatus = newStartDate <= now ? 'ACTIVE' : 'PENDING';
  const newContractNo = renewalData.contractNo || (await generateContractNo());
  const newContract = await prisma.contract.create({
    data: {
      contractNo: newContractNo,
      employeeId: original.employeeId,
      type: renewalData.type || original.type,
      startDate: newStartDate,
      endDate: newEndDate,
      status: newContractStatus,
      terms: renewalData.terms || null,
      renewedFromId: originalContractId,
    },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true, department: { select: { name: true } } } },
    },
  });

  return newContract;
};

export const getRenewalHistory = async (contractId) => {
  // 向前查找续签链：当前合同 → 原合同 → 原合同的原合同...
  const chain = [];
  let currentId = contractId;
  const visited = new Set();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const contract = await prisma.contract.findUnique({
      where: { id: currentId },
      select: {
        id: true,
        contractNo: true,
        type: true,
        startDate: true,
        endDate: true,
        status: true,
        createdAt: true,
        renewedFromId: true,
        employee: { select: { name: true, employeeNo: true } },
      },
    });
    if (!contract) break;
    chain.unshift(contract); // 从旧到新排列
    currentId = contract.renewedFromId;
  }

  // 向后查找续签链：当前合同 → 续签合同 → 续签的续签...
  let nextId = contractId;
  const forwardVisited = new Set([contractId]);
  while (true) {
    const next = await prisma.contract.findUnique({
      where: { renewedFromId: nextId },
      select: {
        id: true,
        contractNo: true,
        type: true,
        startDate: true,
        endDate: true,
        status: true,
        createdAt: true,
        renewedFromId: true,
        employee: { select: { name: true, employeeNo: true } },
      },
    });
    if (!next) break;
    if (forwardVisited.has(next.id)) break; // 防循环
    forwardVisited.add(next.id);
    chain.push(next);
    nextId = next.id;
  }

  return chain;
};
