import { PrismaClient } from '@prisma/client';
import { calculateSalaryForEmployee } from '../utils/salaryCalc.js';

const prisma = new PrismaClient();

export const calculateMonthlySalary = async (month, force = false) => {
  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
  });

  const results = [];
  for (const emp of employees) {
    // Check if already calculated
    const existing = await prisma.salaryRecord.findUnique({
      where: { employeeId_month: { employeeId: emp.id, month } },
    });

    if (existing && !force) {
      results.push(existing);
      continue;
    }

    // 如果强制重新计算，先删除旧记录
    if (existing && force) {
      await prisma.salaryRecord.delete({ where: { id: existing.id } });
    }

    // Get attendance stats for the month
    const [year, m] = month.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);
    const attRecords = await prisma.attendance.findMany({
      where: { employeeId: emp.id, date: { gte: start, lte: end } },
    });
    const attStats = {
      normal: attRecords.filter((r) => r.status === 'NORMAL').length,
      late: attRecords.filter((r) => r.status === 'LATE').length,
      earlyLeave: attRecords.filter((r) => r.status === 'EARLY_LEAVE').length,
      absent: attRecords.filter((r) => r.status === 'ABSENT').length,
    };

    const salaryData = calculateSalaryForEmployee(emp, attStats, month);
    const record = await prisma.salaryRecord.create({ data: salaryData });
    results.push(record);
  }

  return results;
};

export const getSalaryRecords = async ({ month, departmentId, page = 1, pageSize = 10 }) => {
  const where = {};
  if (month) where.month = month;
  if (departmentId) {
    where.employee = { departmentId };
  }

  const [total, data] = await Promise.all([
    prisma.salaryRecord.count({ where }),
    prisma.salaryRecord.findMany({
      where,
      include: { employee: { select: { name: true, employeeNo: true, department: { select: { name: true } } } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { page, pageSize, total, data };
};

export const getMySalary = async (employeeId) => {
  return prisma.salaryRecord.findMany({
    where: { employeeId },
    orderBy: { month: 'desc' },
  });
};

export const getSalarySummary = async (month, departmentFilter = null) => {
  const where = { month };
  if (departmentFilter) {
    where.employee = { departmentId: departmentFilter };
  }
  const records = await prisma.salaryRecord.findMany({
    where,
    include: { employee: { include: { department: true } } },
  });

  const totalGross = records.reduce((sum, r) => sum + r.baseSalary + r.allowance + r.overtime + r.bonus, 0);
  const totalNet = records.reduce((sum, r) => sum + r.netSalary, 0);
  const totalTax = records.reduce((sum, r) => sum + r.tax, 0);
  const totalSocialIns = records.reduce((sum, r) => sum + r.socialIns, 0);

  // Group by department
  const byDepartment = {};
  records.forEach((r) => {
    const dept = r.employee?.department?.name || '未知';
    if (!byDepartment[dept]) byDepartment[dept] = { count: 0, totalNet: 0 };
    byDepartment[dept].count++;
    byDepartment[dept].totalNet += r.netSalary;
  });

  return {
    month,
    employeeCount: records.length,
    totalGross,
    totalNet,
    totalTax,
    totalSocialIns,
    byDepartment,
  };
};
