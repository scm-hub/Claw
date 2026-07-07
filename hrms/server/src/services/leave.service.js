import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 获取请假审批人：沿部门层级向上查找
 * 1. 先查申请人所在部门的经理（排除自己）
 * 2. 如果申请人就是部门经理 → 向上找父部门的经理
 * 3. 如果父部门经理也是自己 → 继续向上，直到找到或到达顶层
 * 4. 全部找不到 → 返回 null（需 HR_ADMIN/SUPER_ADMIN 审批）
 * @param {string} departmentId - 申请人所在部门ID
 * @param {string} employeeId - 申请人员工ID
 * @returns {object|null} { id, name, departmentName } 或 null
 */
const getLeaveApprover = async (departmentId, employeeId) => {
  let currentDeptId = departmentId;
  const visited = new Set(); // 防止循环引用

  while (currentDeptId && !visited.has(currentDeptId)) {
    visited.add(currentDeptId);
    const dept = await prisma.department.findUnique({
      where: { id: currentDeptId },
      include: {
        manager: { select: { id: true, name: true } },
      },
    });
    if (!dept) break;

    // 找到经理且不是申请人自己 → 这就是审批人
    if (dept.manager && dept.manager.id !== employeeId) {
      return { id: dept.manager.id, name: dept.manager.name, departmentName: dept.name };
    }

    // 经理是自己或没有经理 → 向上找父部门
    if (!dept.parentId) break; // 已到顶层
    currentDeptId = dept.parentId;
  }

  return null; // 需要管理员审批
};

export const applyLeave = async (data) => {
  // 构建 leave 数据
  const leaveData = {
    employeeId: data.employeeId,
    type: data.type,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    duration: data.duration ?? 1,
    durationUnit: data.durationUnit || 'DAY',
    reason: data.reason,
  };

  // 按小时请假时，保存开始时间
  if (data.durationUnit === 'HOUR' && data.startTime) {
    leaveData.startTime = data.startTime;
  }

  const leave = await prisma.leave.create({
    data: leaveData,
    include: {
      employee: { select: { name: true, employeeNo: true, departmentId: true, department: { select: { name: true } } } },
    },
  });

  // 沿部门层级向上查找审批人
  const approver = await getLeaveApprover(leave.employee.departmentId, data.employeeId);

  return {
    ...leave,
    approverInfo: approver ? { id: approver.id, name: approver.name, departmentName: approver.departmentName } : null,
  };
};

export const getMyLeaves = async (employeeId) => {
  return prisma.leave.findMany({
    where: { employeeId },
    include: {
      employee: { select: { name: true, employeeNo: true, departmentId: true, department: { select: { name: true, managerId: true } } } },
      approver: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * 获取待审批/已审批的请假列表
 * @param {object} options
 * @param {string|null} options.departmentFilter - 部门过滤（兼容旧接口）
 * @param {string|null} options.statusParam - 状态过滤
 * @param {string|null} options.managerEmployeeId - 经理员工ID（只返回其管理的部门的请假）
 */
export const getPendingLeaves = async ({ departmentFilter = null, statusParam = null, managerEmployeeId = null } = {}) => {
  const where = {};
  if (statusParam) {
    // 支持逗号分隔的多个状态，如 "APPROVED,REJECTED"
    const statuses = statusParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      where.status = statuses[0];
    } else if (statuses.length > 1) {
      where.status = { in: statuses };
    }
  } else {
    where.status = 'PENDING';
  }

  // 如果传入了经理ID，查找其作为审批人可见的请假
  if (managerEmployeeId) {
    // 1. 直接管理的部门下的请假
    const managedDepts = await prisma.department.findMany({
      where: { managerId: managerEmployeeId },
      select: { id: true },
    });
    const deptIds = managedDepts.map((d) => d.id);

    // 2. 子部门经理请假（审批人是当前经理的上级部门经理 → 也会包含当前经理）
    //    简化逻辑：查找所有"审批人就是当前经理"的请假
    //    但 PENDING 请假没有记录审批人，所以需要用部门层级关系
    
    if (deptIds.length === 0) {
      // 该经理没有直接管理任何部门，但仍可能审批子部门经理的请假
      // 找到以该经理为管理者的父部门，其子部门经理的请假
      // 实际上这种场景较少，暂时返回空
      return [];
    }

    // 查看自己管理的部门（含子部门）下的请假，排除自己提交的
    // 需要包含子部门，因为子部门经理请假的审批人可能是当前经理
    const allSubDeptIds = [...deptIds];
    
    // 递归查找所有子部门
    const findChildDepts = async (parentIds) => {
      const children = await prisma.department.findMany({
        where: { parentId: { in: parentIds } },
        select: { id: true },
      });
      if (children.length === 0) return;
      const childIds = children.map(c => c.id);
      allSubDeptIds.push(...childIds);
      await findChildDepts(childIds);
    };
    await findChildDepts(deptIds);

    where.employee = { departmentId: { in: allSubDeptIds } };
    where.NOT = { employeeId: managerEmployeeId };
  } else if (departmentFilter) {
    where.employee = { departmentId: departmentFilter };
  }

  return prisma.leave.findMany({
    where,
    include: {
      employee: { select: { name: true, employeeNo: true, departmentId: true, department: { select: { name: true } } } },
      approver: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * 审批请假
 * @param {string} leaveId - 请假ID
 * @param {string} approverId - 审批人员工ID
 * @param {string} status - APPROVED / REJECTED
 * @param {string} comment - 审批意见
 * @param {string} approverRole - 审批人角色（用于权限校验）
 */
export const approveLeave = async (leaveId, approverId, status, comment, approverRole = null) => {
  // 获取请假记录及申请人信息
  const leave = await prisma.leave.findUnique({
    where: { id: leaveId },
    include: {
      employee: { select: { departmentId: true } },
    },
  });
  if (!leave) throw new Error('请假记录不存在');
  if (leave.status !== 'PENDING') throw new Error('该请假已处理，不可重复审批');

  // SUPER_ADMIN / HR_ADMIN 可审批任意请假（包括部门经理自己的请假）
  const isAdmin = approverRole === 'SUPER_ADMIN' || approverRole === 'HR_ADMIN';
  if (!isAdmin) {
    // 非管理员：必须是审批人（沿部门层级向上查找）
    if (leave.employeeId === approverId) {
      throw new Error('您不能审批自己的请假申请');
    }
    const expectedApprover = await getLeaveApprover(leave.employee.departmentId, leave.employeeId);
    if (!expectedApprover) throw new Error('无法找到合适的审批人，需由管理员审批');
    if (expectedApprover.id !== approverId) throw new Error('您不是该员工所在部门的审批人，无权审批');
  }

  return prisma.leave.update({
    where: { id: leaveId },
    data: {
      status,
      approverId,
      comment,
    },
    include: {
      employee: { select: { name: true, employeeNo: true, department: { select: { name: true } } } },
    },
  });
};

export const resubmitLeave = async (leaveId, employeeId, data) => {
  // 确认该请假存在且属于当前员工且已被驳回
  const leave = await prisma.leave.findUnique({ where: { id: leaveId } });
  if (!leave) throw new Error('请假记录不存在');
  if (leave.employeeId !== employeeId) throw new Error('无权操作此请假记录');
  if (leave.status !== 'REJECTED') throw new Error('仅可重新申请已驳回的请假');

  const updateData = {
    status: 'PENDING',
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    duration: data.duration ?? 1,
    durationUnit: data.durationUnit || 'DAY',
    startTime: data.durationUnit === 'HOUR' ? (data.startTime || null) : null,
    reason: data.reason,
    comment: null, // 清空上次审批意见
    approverId: null, // 清空审批人
  };

  return prisma.leave.update({
    where: { id: leaveId },
    data: updateData,
    include: {
      employee: { select: { name: true, employeeNo: true } },
    },
  });
};

export const getLeaveBalance = async (employeeId, year) => {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const usedLeaves = await prisma.leave.findMany({
    where: {
      employeeId,
      status: 'APPROVED',
      startDate: { gte: startOfYear },
      endDate: { lte: endOfYear },
    },
  });

  const balance = {
    ANNUAL: { total: 10, used: 0 },
    SICK: { total: 15, used: 0 },
    PERSONAL: { total: 5, used: 0 },
    MATERNITY: { total: 98, used: 0 },
    OTHER: { total: 3, used: 0 },
  };

  usedLeaves.forEach((leave) => {
    // 使用 duration/durationUnit 计算天数
    // 旧数据兼容：没有 duration 字段时按日期差计算
    let days;
    if (leave.duration != null && leave.durationUnit) {
      if (leave.durationUnit === 'HOUR') {
        // 按小时：8小时 = 1天
        days = leave.duration / 8;
      } else {
        // 按天：直接使用 duration（如 0.5, 1, 2）
        days = leave.duration;
      }
    } else {
      // 旧数据兼容：按日期差计算
      days = Math.ceil(
        (new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)
      ) + 1;
    }
    if (balance[leave.type]) {
      balance[leave.type].used += days;
    }
  });

  return balance;
};
