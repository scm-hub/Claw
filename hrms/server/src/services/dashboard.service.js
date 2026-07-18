import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (departmentIds = null) => {
  const empWhere = departmentIds?.length > 0 ? { departmentId: { in: departmentIds } } : {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysLater = new Date(today.getTime() + 30 * 86400000);

  const [
    totalEmployees,
    activeEmployees,
    thisMonthHires,
    thisMonthResign,
    pendingLeaves,
    todayAttendance,
    openJobs,
    genderStats,
    statusStats,
  ] = await Promise.all([
    prisma.employee.count({ where: empWhere }),
    prisma.employee.count({ where: { ...empWhere, status: 'ACTIVE' } }),
    prisma.employee.count({
      where: { ...empWhere, hireDate: { gte: thisMonthStart } },
    }),
    prisma.employee.count({
      where: { ...empWhere, status: 'RESIGNED', leaveDate: { gte: thisMonthStart } },
    }),
    prisma.leave.count({
      where: {
        status: 'PENDING',
        ...(departmentIds?.length > 0 ? { employee: { departmentId: { in: departmentIds } } } : {}),
      },
    }),
    prisma.attendance.count({
      where: {
        date: today,
        ...(departmentIds?.length > 0 ? { employee: { departmentId: { in: departmentIds } } } : {}),
      },
    }),
    prisma.job.count({ where: { status: 'OPEN' } }),
    // 性别分布
    prisma.employee.groupBy({
      by: ['gender'],
      where: empWhere,
      _count: true,
    }),
    // 员工状态分布
    prisma.employee.groupBy({
      by: ['status'],
      where: empWhere,
      _count: true,
    }),
  ]);

  // 近 6 个月入职/离职趋势
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const [hires, resigns] = await Promise.all([
      prisma.employee.count({
        where: { ...empWhere, hireDate: { gte: mStart, lt: mEnd } },
      }),
      prisma.employee.count({
        where: { ...empWhere, status: 'RESIGNED', leaveDate: { gte: mStart, lt: mEnd } },
      }),
    ]);
    monthlyTrend.push({
      month: `${mStart.getFullYear()}-${String(mStart.getMonth() + 1).padStart(2, '0')}`,
      hires,
      resigns,
    });
  }

  // 最近入职员工（前 5）
  const recentHires = await prisma.employee.findMany({
    where: { ...empWhere, status: 'ACTIVE' },
    orderBy: { hireDate: 'desc' },
    take: 5,
    select: {
      id: true,
      name: true,
      employeeNo: true,
      hireDate: true,
      department: { select: { name: true } },
    },
  });

  // 本月生日员工
  const thisMonth = now.getMonth() + 1;
  const birthdays = await prisma.employee.findMany({
    where: { ...empWhere, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      employeeNo: true,
      birthday: true,
      department: { select: { name: true } },
    },
  });
  const upcomingBirthdays = birthdays
    .filter((e) => e.birthday && new Date(e.birthday).getMonth() + 1 === thisMonth)
    .sort((a, b) => new Date(a.birthday).getDate() - new Date(b.birthday).getDate());

  // 合同到期预警（30天内）
  const expiringContracts = await prisma.contract.findMany({
    where: {
      endDate: { gte: today, lte: thirtyDaysLater },
      status: 'ACTIVE',
      ...(departmentIds?.length > 0 ? { employee: { departmentId: { in: departmentIds } } } : {}),
    },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true, department: { select: { name: true } } } },
    },
    orderBy: { endDate: 'asc' },
    take: 10,
  });

  // 培训概览
  const [upcomingTrainings, trainingInProgress] = await Promise.all([
    prisma.training.count({
      where: { startDate: { gte: today }, status: { not: 'CANCELLED' } },
    }),
    prisma.training.count({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
        status: { not: 'CANCELLED' },
      },
    }),
  ]);

  // 部门分布
  const deptWhere = departmentIds?.length > 0 ? { id: { in: departmentIds } } : {};
  const deptStats = await prisma.department.findMany({
    where: deptWhere,
    include: { _count: { select: { employees: true } } },
    orderBy: { employees: { _count: 'desc' } },
  });

  // 上月入职/离职（用于环比）
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [lastMonthHires, lastMonthResign] = await Promise.all([
    prisma.employee.count({
      where: { ...empWhere, hireDate: { gte: lastMonthStart, lt: thisMonthStart } },
    }),
    prisma.employee.count({
      where: { ...empWhere, status: 'RESIGNED', leaveDate: { gte: lastMonthStart, lt: thisMonthStart } },
    }),
  ]);

  return {
    // 核心统计
    totalEmployees,
    activeEmployees,
    thisMonthHires,
    thisMonthResign,
    pendingLeaves,
    todayAttendance,
    openJobs,
    // 环比
    lastMonthHires,
    lastMonthResign,
    // 性别分布
    genderDistribution: {
      male: genderStats.find((g) => g.gender === 'MALE')?._count || 0,
      female: genderStats.find((g) => g.gender === 'FEMALE')?._count || 0,
    },
    // 状态分布
    statusDistribution: statusStats.map((s) => ({
      status: s.status,
      count: s._count,
    })),
    // 趋势
    monthlyTrend,
    // 列表
    recentHires,
    upcomingBirthdays,
    expiringContracts,
    // 培训
    upcomingTrainings,
    trainingInProgress,
    // 部门
    departmentIds,
    departmentDistribution: deptStats.map((d) => ({
      id: d.id,
      name: d.name,
      count: d._count.employees,
    })),
  };
};
