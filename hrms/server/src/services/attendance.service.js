import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 打卡（多次打卡：最早=上班卡，最晚=下班卡）
export const punch = async (employeeId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = new Date();

  // 获取或创建今日考勤记录
  let attendance = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
    include: { clockRecords: { orderBy: { clockTime: 'asc' } } },
  });

  if (!attendance) {
    attendance = await prisma.attendance.create({
      data: { employeeId, date: today, status: 'NORMAL', punchCount: 0 },
      include: { clockRecords: true },
    });
  }

  // 创建打卡记录
  const clockRecord = await prisma.clockRecord.create({
    data: {
      employeeId,
      attendanceId: attendance.id,
      clockTime: now,
    },
  });

  // 计算最早和最晚打卡时间
  const allTimes = [...attendance.clockRecords.map((r) => r.clockTime), now];
  const earliest = new Date(Math.min(...allTimes.map((t) => new Date(t).getTime())));
  const latest = new Date(Math.max(...allTimes.map((t) => new Date(t).getTime())));

  // 判断迟到/早退
  const isLate = earliest.getHours() > 9 || (earliest.getHours() === 9 && earliest.getMinutes() > 0);
  const isEarlyLeave = latest.getHours() < 17;

  let status = 'NORMAL';
  if (isLate && isEarlyLeave) status = 'LATE_EARLY';
  else if (isLate) status = 'LATE';
  else if (isEarlyLeave) status = 'EARLY_LEAVE';

  // 更新考勤记录
  attendance = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      clockIn: earliest,
      clockOut: latest,
      punchCount: attendance.punchCount + 1,
      status,
    },
    include: { clockRecords: { orderBy: { clockTime: 'asc' } } },
  });

  return attendance;
};

// 获取今日打卡状态
export const getTodayStatus = async (employeeId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
    include: { clockRecords: { orderBy: { clockTime: 'asc' } } },
  });
};

// 获取考勤记录
export const getAttendanceRecords = async ({ employeeId, month, departmentFilter, page = 1, pageSize = 31 }) => {
  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (departmentFilter && !employeeId) where.employee = { departmentId: departmentFilter };
  if (month) {
    const [year, m] = month.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }
  const [total, data] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      include: {
        employee: { select: { name: true, employeeNo: true, department: { select: { name: true } } } },
        clockRecords: { orderBy: { clockTime: 'asc' } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { date: 'desc' },
    }),
  ]);
  return { page, pageSize, total, data };
};

// 获取考勤统计
export const getAttendanceStats = async (employeeId, month) => {
  const [year, m] = month.split('-').map(Number);
  const start = new Date(year, m - 1, 1);
  const end = new Date(year, m, 0, 23, 59, 59);

  const records = await prisma.attendance.findMany({
    where: { employeeId, date: { gte: start, lte: end } },
  });

  return {
    total: records.length,
    normal: records.filter((r) => r.status === 'NORMAL').length,
    late: records.filter((r) => r.status === 'LATE' || r.status === 'LATE_EARLY').length,
    earlyLeave: records.filter((r) => r.status === 'EARLY_LEAVE' || r.status === 'LATE_EARLY').length,
    absent: records.filter((r) => r.status === 'ABSENT').length,
  };
};

// 获取考勤汇总（按员工汇总当月数据）
export const getAttendanceSummary = async ({ month, departmentFilter, page = 1, pageSize = 20 }) => {
  const [year, m] = month.split('-').map(Number);
  const start = new Date(year, m - 1, 1);
  const end = new Date(year, m, 0, 23, 59, 59);
  const daysInMonth = new Date(year, m, 0).getDate();

  // 计算当月应出勤天数（排除周末）
  let workDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, m - 1, d);
    const dow = dt.getDay();
    if (dow !== 0 && dow !== 6) workDays++;
  }

  // 获取当月所有考勤记录
  const where = { date: { gte: start, lte: end } };
  if (departmentFilter) where.employee = { departmentId: departmentFilter };

  const records = await prisma.attendance.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, employeeNo: true, department: { select: { id: true, name: true } } } },
      clockRecords: { orderBy: { clockTime: 'asc' } },
    },
    orderBy: { date: 'asc' },
  });

  // 按员工分组汇总
  const employeeMap = {};
  for (const r of records) {
    const empId = r.employeeId;
    if (!employeeMap[empId]) {
      employeeMap[empId] = {
        employeeId: empId,
        employeeNo: r.employee.employeeNo,
        employeeName: r.employee.name,
        departmentId: r.employee.department?.id || '',
        departmentName: r.employee.department?.name || '-',
        presentDays: 0,       // 出勤天数（有打卡记录）
        normalDays: 0,        // 正常天数
        lateCount: 0,         // 迟到次数（含迟到+早退）
        earlyLeaveCount: 0,   // 早退次数（含迟到+早退）
        missingPunchCount: 0, // 缺卡次数（仅打卡1次）
        absentCount: 0,       // 缺勤天数
        details: [],
      };
    }
    const emp = employeeMap[empId];

    // 出勤：至少打过1次卡，或有 clockIn 记录（兼容旧数据）
    if (r.punchCount >= 1 || r.clockIn) {
      emp.presentDays++;
    }

    // 正常/迟到/早退/缺勤
    // 迟到次数含 LATE_EARLY（当天既迟到又早退，迟到也算一次）
    // 早退次数含 LATE_EARLY（当天既迟到又早退，早退也算一次）
    switch (r.status) {
      case 'NORMAL': emp.normalDays++; break;
      case 'LATE': emp.lateCount++; break;
      case 'EARLY_LEAVE': emp.earlyLeaveCount++; break;
      case 'LATE_EARLY': emp.lateCount++; emp.earlyLeaveCount++; break;
      case 'ABSENT': emp.absentCount++; break;
    }

    // 缺卡：仅打了1次卡（缺少上班卡或下班卡）
    if (r.punchCount === 1) {
      emp.missingPunchCount++;
    }

    // 保留明细（用于展开查看）
    emp.details.push({
      date: r.date,
      clockIn: r.clockIn,
      clockOut: r.clockOut,
      punchCount: r.punchCount,
      status: r.status,
      clockRecords: r.clockRecords.map((cr) => ({
        id: cr.id,
        clockTime: cr.clockTime,
      })),
    });
  }

  // 获取当月所有在职员工（用于计算未打卡的缺勤天数）
  const empWhere = {};
  if (departmentFilter) empWhere.departmentId = departmentFilter;
  empWhere.status = 'ACTIVE';

  const allEmployees = await prisma.employee.findMany({
    where: empWhere,
    include: { department: { select: { id: true, name: true } } },
  });

  // 对于没有考勤记录的在职员工，也纳入汇总（全部记为缺勤）
  for (const emp of allEmployees) {
    if (!employeeMap[emp.id]) {
      employeeMap[emp.id] = {
        employeeId: emp.id,
        employeeNo: emp.employeeNo,
        employeeName: emp.name,
        departmentId: emp.department?.id || '',
        departmentName: emp.department?.name || '-',
        presentDays: 0,
        normalDays: 0,
        lateCount: 0,
        earlyLeaveCount: 0,
        missingPunchCount: 0,
        absentCount: workDays,
        details: [],
      };
    }
  }

  // 对有考勤记录的员工，计算未打卡工作日的缺勤天数
  // 应出勤天数 = workDays；已有考勤天数 = records数
  // 但有些考勤记录可能是周末的，所以更准确的做法：
  // 缺勤天数 = workDays - 出勤天数
  for (const empId of Object.keys(employeeMap)) {
    const emp = employeeMap[empId];
    if (emp.presentDays > 0 || emp.details.length > 0) {
      // 有考勤记录的员工：缺勤 = 应出勤天数 - 实际出勤天数 - 已标记的ABSENT天数
      // 注意：ABSENT状态的记录本身也计入了出勤天数为0，所以直接用：
      emp.absentCount = workDays - emp.presentDays;
    }
    // 补充应出勤天数字段
    emp.workDays = workDays;
    emp.attendanceRate = workDays > 0 ? ((emp.presentDays / workDays) * 100).toFixed(1) : '0.0';
  }

  // 转为数组并分页
  const summaryList = Object.values(employeeMap);
  // 排序：按部门名+姓名
  summaryList.sort((a, b) => {
    const deptComp = a.departmentName.localeCompare(b.departmentName, 'zh-CN');
    if (deptComp !== 0) return deptComp;
    return a.employeeName.localeCompare(b.employeeName, 'zh-CN');
  });

  const total = summaryList.length;
  const paged = summaryList.slice((page - 1) * pageSize, page * pageSize);

  return { page, pageSize, total, workDays, data: paged };
};
