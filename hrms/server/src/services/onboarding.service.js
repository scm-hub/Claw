import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 入职流程步骤定义
const STEPS = [
  { step: 1, key: 'MATERIAL_SUBMIT', label: '提交入职材料', description: '新员工提交身份证、学历证、体检报告等入职材料' },
  { step: 2, key: 'HR_REVIEW', label: 'HR审核材料', description: 'HR审核材料是否齐全合规' },
  { step: 3, key: 'DEPT_CONFIRM', label: '部门确认到岗', description: '部门负责人确认新员工已到岗' },
  { step: 4, key: 'ADMIN_PROCESS', label: '行政IT办理', description: '办理工牌、邮箱、系统账号、工位等' },
];

// 默认入职材料清单
const DEFAULT_MATERIALS = [
  { id: 'm1', name: '身份证复印件', required: true, status: 'PENDING', remark: '' },
  { id: 'm2', name: '最高学历证明', required: true, status: 'PENDING', remark: '' },
  { id: 'm3', name: '学位证书', required: false, status: 'PENDING', remark: '' },
  { id: 'm4', name: '体检报告', required: true, status: 'PENDING', remark: '' },
  { id: 'm5', name: '银行卡信息', required: true, status: 'PENDING', remark: '' },
  { id: 'm6', name: '离职证明', required: true, status: 'PENDING', remark: '' },
  { id: 'm7', name: '一寸照片', required: false, status: 'PENDING', remark: '' },
  { id: 'm8', name: '社保转移单', required: false, status: 'PENDING', remark: '' },
  { id: 'm9', name: '保密协议', required: true, status: 'PENDING', remark: '' },
  { id: 'm10', name: '竞业限制协议', required: false, status: 'PENDING', remark: '' },
];

// 状态映射
const STATUS_MAP = {
  PENDING: { label: '待提交材料', step: 1 },
  MATERIAL_REVIEW: { label: 'HR审核中', step: 2 },
  DEPT_CONFIRM: { label: '部门确认中', step: 3 },
  ADMIN_PROCESS: { label: '行政IT办理中', step: 4 },
  COMPLETED: { label: '已完成', step: 5 },
  REJECTED: { label: '已驳回', step: 0 },
};

const ONBOARDING_SELECT = {
  id: true, employeeId: true, hireDate: true, status: true,
  currentStep: true, materials: true, approvalRecords: true,
  notes: true, rejectReason: true, mentorId: true, completedAt: true,
  createdAt: true, updatedAt: true,
  // 候选人信息
  candidateName: true, candidatePhone: true, candidateEmail: true,
  candidateDeptId: true, candidatePositionTitle: true,
  employee: {
    select: { id: true, name: true, employeeNo: true, departmentId: true, phone: true,
      department: { select: { id: true, name: true, managerId: true } },
      position: { select: { id: true, name: true } },
    },
  },
  mentor: {
    select: { id: true, name: true, employeeNo: true },
  },
  candidateDept: {
    select: { id: true, name: true, managerId: true },
  },
};

// 列表
export const listOnboardings = async ({ status, search, department, page = 1, pageSize = 10 }) => {
  const where = {};
  if (status) where.status = status;
  if (department) where.employee = { departmentId: department };
  if (search) {
    where.OR = [
      { employee: { name: { contains: search } } },
      { employee: { employeeNo: { contains: search } } },
      { candidateName: { contains: search } },
    ];
  }
  const [total, records] = await Promise.all([
    prisma.employeeOnboarding.count({ where }),
    prisma.employeeOnboarding.findMany({
      where,
      select: ONBOARDING_SELECT,
      orderBy: [{ status: 'asc' }, { hireDate: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { page, pageSize, total, data: records };
};

// 详情
export const getOnboarding = async (id) => {
  const record = await prisma.employeeOnboarding.findUnique({
    where: { id },
    select: ONBOARDING_SELECT,
  });
  if (!record) throw new Error('入职记录未找到');
  return record;
};

// 创建 — 支持两种模式：1) 已有员工ID创建  2) 候选人信息创建（不创建员工）
export const createOnboarding = async (data) => {
  const { employeeId, hireDate, mentorId, notes, materials,
          candidateName, candidatePhone, candidateEmail,
          candidateDeptId, candidatePositionTitle } = data;

  // 如果有 employeeId，检查是否已有入职记录
  if (employeeId) {
    const existing = await prisma.employeeOnboarding.findUnique({ where: { employeeId } });
    if (existing) throw new Error('该员工已有入职记录');
  }

  const materialsData = materials && materials.length > 0 ? materials : DEFAULT_MATERIALS;
  const approvalRecords = [{
    step: 1,
    action: 'CREATE',
    operator: 'SYSTEM',
    timestamp: new Date().toISOString(),
    remark: '入职记录创建',
  }];

  return prisma.employeeOnboarding.create({
    data: {
      employeeId: employeeId || null,
      hireDate: new Date(hireDate),
      mentorId: mentorId || null,
      notes: notes || '',
      materials: materialsData,
      approvalRecords,
      status: 'PENDING',
      currentStep: 1,
      // 候选人信息
      candidateName: candidateName || '',
      candidatePhone: candidatePhone || '',
      candidateEmail: candidateEmail || '',
      candidateDeptId: candidateDeptId || null,
      candidatePositionTitle: candidatePositionTitle || '',
    },
    select: ONBOARDING_SELECT,
  });
};

// 提交材料（步骤1→2）
export const submitMaterials = async (id, updatedMaterials, operatorName) => {
  const record = await prisma.employeeOnboarding.findUnique({ where: { id } });
  if (!record) throw new Error('入职记录未找到');
  if (record.status !== 'PENDING') throw new Error('当前状态不允许提交材料');

  // 检查必填材料是否已提交
  const materials = updatedMaterials || record.materials;
  const missing = materials.filter((m) => m.required && m.status === 'PENDING');
  if (missing.length > 0) {
    throw new Error(`以下必填材料未提交：${missing.map((m) => m.name).join('、')}`);
  }

  const approvalRecords = [...(record.approvalRecords || []), {
    step: 1,
    action: 'SUBMIT',
    operator: operatorName || 'HR',
    timestamp: new Date().toISOString(),
    remark: '材料已提交，提交至HR审核',
  }];

  return prisma.employeeOnboarding.update({
    where: { id },
    data: {
      materials,
      status: 'MATERIAL_REVIEW',
      currentStep: 2,
      approvalRecords,
    },
    select: ONBOARDING_SELECT,
  });
};

// HR审核通过（步骤2→3）
export const hrApprove = async (id, operatorName, remark) => {
  const record = await prisma.employeeOnboarding.findUnique({ where: { id } });
  if (!record) throw new Error('入职记录未找到');
  if (record.status !== 'MATERIAL_REVIEW') throw new Error('当前状态不允许HR审核');

  const approvalRecords = [...(record.approvalRecords || []), {
    step: 2,
    action: 'APPROVE',
    operator: operatorName || 'HR',
    timestamp: new Date().toISOString(),
    remark: remark || '材料审核通过',
  }];

  return prisma.employeeOnboarding.update({
    where: { id },
    data: {
      status: 'DEPT_CONFIRM',
      currentStep: 3,
      approvalRecords,
      rejectReason: '',
    },
    select: ONBOARDING_SELECT,
  });
};

// HR审核驳回（退回步骤1）
export const hrReject = async (id, reason, operatorName) => {
  const record = await prisma.employeeOnboarding.findUnique({ where: { id } });
  if (!record) throw new Error('入职记录未找到');
  if (record.status !== 'MATERIAL_REVIEW') throw new Error('当前状态不允许驳回');

  const approvalRecords = [...(record.approvalRecords || []), {
    step: 2,
    action: 'REJECT',
    operator: operatorName || 'HR',
    timestamp: new Date().toISOString(),
    remark: reason || '材料审核不通过',
  }];

  // 将所有材料状态重置为PENDING
  const materials = (record.materials || []).map((m) => ({ ...m, status: 'PENDING', remark: '' }));

  return prisma.employeeOnboarding.update({
    where: { id },
    data: {
      status: 'PENDING',
      currentStep: 1,
      approvalRecords,
      rejectReason: reason || '',
      materials,
    },
    select: ONBOARDING_SELECT,
  });
};

// 部门确认通过（步骤3→4）
export const deptConfirm = async (id, operatorName, remark) => {
  const record = await prisma.employeeOnboarding.findUnique({ where: { id } });
  if (!record) throw new Error('入职记录未找到');
  if (record.status !== 'DEPT_CONFIRM') throw new Error('当前状态不允许部门确认');

  const approvalRecords = [...(record.approvalRecords || []), {
    step: 3,
    action: 'APPROVE',
    operator: operatorName || '部门负责人',
    timestamp: new Date().toISOString(),
    remark: remark || '已确认到岗',
  }];

  return prisma.employeeOnboarding.update({
    where: { id },
    data: {
      status: 'ADMIN_PROCESS',
      currentStep: 4,
      approvalRecords,
    },
    select: ONBOARDING_SELECT,
  });
};

// 部门确认驳回（退回步骤2）
export const deptReject = async (id, reason, operatorName) => {
  const record = await prisma.employeeOnboarding.findUnique({ where: { id } });
  if (!record) throw new Error('入职记录未找到');
  if (record.status !== 'DEPT_CONFIRM') throw new Error('当前状态不允许驳回');

  const approvalRecords = [...(record.approvalRecords || []), {
    step: 3,
    action: 'REJECT',
    operator: operatorName || '部门负责人',
    timestamp: new Date().toISOString(),
    remark: reason || '未到岗确认',
  }];

  return prisma.employeeOnboarding.update({
    where: { id },
    data: {
      status: 'MATERIAL_REVIEW',
      currentStep: 2,
      approvalRecords,
      rejectReason: reason || '',
    },
    select: ONBOARDING_SELECT,
  });
};

// 行政IT完成（步骤4→完成）— 自动创建员工记录 + 登录账号
export const adminComplete = async (id, operatorName, remark) => {
  const record = await prisma.employeeOnboarding.findUnique({ where: { id } });
  if (!record) throw new Error('入职记录未找到');
  if (record.status !== 'ADMIN_PROCESS') throw new Error('当前状态不允许完成');

  const approvalRecords = [...(record.approvalRecords || []), {
    step: 4,
    action: 'COMPLETE',
    operator: operatorName || '行政',
    timestamp: new Date().toISOString(),
    remark: remark || '入职手续全部完成',
  }];

  // 如果尚未创建员工记录（从招聘推入的），在此时创建
  let employeeCreated = false;
  let newEmployeeNo = null;

  if (!record.employeeId) {
    try {
      // 自动生成工号
      const count = await prisma.employee.count();
      const employeeNo = `EMP${String(count + 1).padStart(3, '0')}`;

      const newEmployee = await prisma.employee.create({
        data: {
          employeeNo,
          name: record.candidateName || '未知',
          phone: record.candidatePhone || '',
          email: record.candidateEmail || '',
          hireDate: record.hireDate,
          departmentId: record.candidateDeptId || '',
          positionTitle: record.candidatePositionTitle || '',
          status: 'ACTIVE',
        },
      });

      // 创建登录账号
      try {
        const bcrypt = await import('bcryptjs');
        const accountEmail = newEmployee.email || `${employeeNo}@hrms.internal`;
        const hashedPassword = await bcrypt.default.hash('123456', 10);
        await prisma.user.create({
          data: {
            email: accountEmail,
            password: hashedPassword,
            role: 'EMPLOYEE',
            employeeId: newEmployee.id,
          },
        });
      } catch (accErr) {
        console.error('自动创建登录账号失败:', accErr.message);
      }

      // 关联员工到入职记录
      await prisma.employeeOnboarding.update({
        where: { id },
        data: { employeeId: newEmployee.id },
      });

      employeeCreated = true;
      newEmployeeNo = employeeNo;
    } catch (empErr) {
      console.error('入职完成时创建员工记录失败:', empErr.message);
      throw new Error('创建员工记录失败: ' + empErr.message);
    }
  }

  const result = await prisma.employeeOnboarding.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      currentStep: 5,
      approvalRecords,
      completedAt: new Date(),
      rejectReason: '',
    },
    select: ONBOARDING_SELECT,
  });

  return { ...result, employeeCreated, employeeNo: newEmployeeNo };
};

// 更新材料状态（单个材料标记已提交/不合格等）
export const updateMaterialStatus = async (id, materialId, status, remark) => {
  const record = await prisma.employeeOnboarding.findUnique({ where: { id } });
  if (!record) throw new Error('入职记录未找到');

  const materials = (record.materials || []).map((m) =>
    m.id === materialId ? { ...m, status, remark: remark || '' } : m
  );

  return prisma.employeeOnboarding.update({
    where: { id },
    data: { materials },
    select: ONBOARDING_SELECT,
  });
};

// 更新入职记录（通用）
export const updateOnboarding = async (id, data) => {
  const update = {};
  if (data.hireDate !== undefined) update.hireDate = new Date(data.hireDate);
  if (data.mentorId !== undefined) update.mentorId = data.mentorId || null;
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.rejectReason !== undefined) update.rejectReason = data.rejectReason;
  return prisma.employeeOnboarding.update({
    where: { id },
    data: update,
    select: ONBOARDING_SELECT,
  });
};

// 删除
export const deleteOnboarding = async (id) => {
  return prisma.employeeOnboarding.delete({ where: { id } });
};

// 统计
export const getStats = async (departmentFilter) => {
  const deptWhere = departmentFilter ? { employee: { departmentId: departmentFilter } } : {};
  const [pending, materialReview, deptConfirm, adminProcess, completed, rejected] = await Promise.all([
    prisma.employeeOnboarding.count({ where: { status: 'PENDING', ...deptWhere } }),
    prisma.employeeOnboarding.count({ where: { status: 'MATERIAL_REVIEW', ...deptWhere } }),
    prisma.employeeOnboarding.count({ where: { status: 'DEPT_CONFIRM', ...deptWhere } }),
    prisma.employeeOnboarding.count({ where: { status: 'ADMIN_PROCESS', ...deptWhere } }),
    prisma.employeeOnboarding.count({ where: { status: 'COMPLETED', ...deptWhere } }),
    prisma.employeeOnboarding.count({ where: { status: 'REJECTED', ...deptWhere } }),
  ]);
  return { pending, materialReview, deptConfirm, adminProcess, completed, rejected };
};

// 获取步骤定义
export const getSteps = () => STEPS;
// 获取默认材料模板
export const getDefaultMaterials = () => DEFAULT_MATERIALS;
// 获取状态映射
export const getStatusMap = () => STATUS_MAP;
