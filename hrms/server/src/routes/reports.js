import { Router } from 'express';
import XLSX from 'xlsx';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getDepartmentFilter } from '../middleware/departmentScope.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

/* ========== 员工报表 ========== */

router.get('/employee-summary', authenticate, async (req, res, next) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    const where = departmentFilter ? { departmentId: departmentFilter } : {};

    const [total, byGender, byStatus, byDepartment, byEducation, byMarital, activeOnboard, inactiveCount, resignedCount] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.groupBy({ by: ['gender'], where, _count: true }),
      prisma.employee.groupBy({ by: ['status'], where, _count: true }),
      prisma.department.findMany({
        where: departmentFilter ? { id: departmentFilter } : {},
        include: { employees: { where, select: { id: true } }, _count: { select: { employees: true } } },
      }),
      prisma.employee.groupBy({ by: ['education'], where: { ...where, education: { not: '' } }, _count: true }),
      prisma.employee.groupBy({ by: ['maritalStatus'], where: { ...where, maritalStatus: { not: '' } }, _count: true }),
      prisma.employee.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.employee.count({ where: { ...where, status: 'INACTIVE' } }),
      prisma.employee.count({ where: { ...where, status: 'RESIGNED' } }),
    ]);

    // 近12个月入职/离职趋势
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d);
    }

    const hireTrend = await Promise.all(
      months.map(async (m) => {
        const start = new Date(m.getFullYear(), m.getMonth(), 1);
        const end = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59);
        const [onboarded, left] = await Promise.all([
          prisma.employee.count({ where: { ...where, hireDate: { gte: start, lte: end } } }),
          prisma.employee.count({ where: { ...where, leaveDate: { gte: start, lte: end } } }),
        ]);
        return { month: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`, onboarded, left };
      })
    );

    const genderMap = { MALE: '男', FEMALE: '女' };
    const statusMap = { ACTIVE: '在职', INACTIVE: '待岗', RESIGNED: '离职' };

    res.json({
      success: true,
      data: {
        total,
        activeOnboard,
        inactiveCount,
        resignedCount,
        genderDistribution: byGender.map((g) => ({ name: genderMap[g.gender] || g.gender, value: g._count })),
        statusDistribution: byStatus.map((s) => ({ name: statusMap[s.status] || s.status, value: s._count })),
        departmentDistribution: byDepartment
          .filter((d) => d._count.employees > 0)
          .map((d) => ({ name: d.name, value: d._count.employees })),
        educationDistribution: byEducation.map((e) => ({ name: e.education, value: e._count })),
        maritalDistribution: byMarital.map((m) => ({ name: m.maritalStatus, value: m._count })),
        hireTrend,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ========== 考勤报表 ========== */

router.get('/attendance-summary', authenticate, async (req, res, next) => {
  try {
    const { month } = req.query;
    const departmentFilter = getDepartmentFilter(req);
    const now = new Date();
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, m] = targetMonth.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);

    const where = { date: { gte: start, lte: end } };
    if (departmentFilter) where.employee = { departmentId: departmentFilter };

    const records = await prisma.attendance.findMany({
      where,
      include: { employee: { select: { name: true, employeeNo: true, department: { select: { name: true } } } } },
      orderBy: { date: 'desc' },
    });

    const totalRecords = records.length;
    const normalCount = records.filter((r) => r.status === 'NORMAL').length;
    const lateCount = records.filter((r) => r.status === 'LATE').length;
    const earlyCount = records.filter((r) => r.status === 'EARLY').length;
    const absentCount = records.filter((r) => r.status === 'ABSENT').length;

    // 按部门统计出勤率
    const deptMap = {};
    records.forEach((r) => {
      const dName = r.employee?.department?.name || '未分配';
      if (!deptMap[dName]) deptMap[dName] = { total: 0, normal: 0 };
      deptMap[dName].total++;
      if (r.status === 'NORMAL') deptMap[dName].normal++;
    });

    const deptStats = Object.entries(deptMap).map(([name, v]) => ({
      name,
      total: v.total,
      normal: v.normal,
      rate: v.total ? Math.round((v.normal / v.total) * 100) : 0,
    }));

    // 每日出勤统计
    const dailyMap = {};
    records.forEach((r) => {
      const d = new Date(r.date).toISOString().slice(0, 10);
      if (!dailyMap[d]) dailyMap[d] = { total: 0, normal: 0, late: 0, early: 0, absent: 0 };
      dailyMap[d].total++;
      dailyMap[d][r.status.toLowerCase()] = (dailyMap[d][r.status.toLowerCase()] || 0) + 1;
    });

    const dailyStats = Object.entries(dailyMap)
      .map(([date, v]) => ({ date, ...v, rate: v.total ? Math.round((v.normal / v.total) * 100) : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        month: targetMonth,
        totalRecords,
        normalCount,
        lateCount,
        earlyCount,
        absentCount,
        attendanceRate: totalRecords ? Math.round((normalCount / totalRecords) * 100) : 0,
        deptStats,
        dailyStats,
        records,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ========== 薪资报表 ========== */

router.get('/salary-summary', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { month } = req.query;
    const departmentFilter = getDepartmentFilter(req);

    const now = new Date();
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const where = { month: targetMonth };
    const empWhere = departmentFilter ? { departmentId: departmentFilter } : {};

    const records = await prisma.salaryRecord.findMany({
      where: {
        ...where,
        ...(departmentFilter ? { employee: { departmentId: departmentFilter } } : {}),
      },
      include: { employee: { select: { name: true, employeeNo: true, department: { select: { name: true } } } } },
      orderBy: { netSalary: 'desc' },
    });

    // 汇总统计
    const totalBase = records.reduce((s, r) => s + r.baseSalary, 0);
    const totalBonus = records.reduce((s, r) => s + r.bonus, 0);
    const totalOvertime = records.reduce((s, r) => s + r.overtime, 0);
    const totalDeduction = records.reduce((s, r) => s + r.deduction, 0);
    const totalTax = records.reduce((s, r) => s + r.tax, 0);
    const totalNet = records.reduce((s, r) => s + r.netSalary, 0);

    // 按部门统计
    const deptMap = {};
    records.forEach((r) => {
      const dName = r.employee?.department?.name || '未分配';
      if (!deptMap[dName]) deptMap[dName] = { count: 0, totalBase: 0, totalNet: 0 };
      deptMap[dName].count++;
      deptMap[dName].totalBase += r.baseSalary;
      deptMap[dName].totalNet += r.netSalary;
    });

    const deptStats = Object.entries(deptMap).map(([name, v]) => ({
      name,
      count: v.count,
      avgBase: Math.round(v.totalBase / v.count),
      avgNet: Math.round(v.totalNet / v.count),
      totalNet: Math.round(v.totalNet),
    }));

    // 近12个月薪资趋势
    const trendMonths = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const trend = await Promise.all(
      trendMonths.map(async (m) => {
        const salaryRecords = await prisma.salaryRecord.aggregate({
          where: { month: m, ...(departmentFilter ? { employee: { departmentId: departmentFilter } } : {}) },
          _sum: { netSalary: true, baseSalary: true },
          _count: true,
        });
        return {
          month: m,
          count: salaryRecords._count,
          totalNet: salaryRecords._sum.netSalary || 0,
          totalBase: salaryRecords._sum.baseSalary || 0,
        };
      })
    );

    res.json({
      success: true,
      data: {
        month: targetMonth,
        totalRecords: records.length,
        totalBase: Math.round(totalBase),
        totalBonus: Math.round(totalBonus),
        totalOvertime: Math.round(totalOvertime),
        totalDeduction: Math.round(totalDeduction),
        totalTax: Math.round(totalTax),
        totalNet: Math.round(totalNet),
        avgNet: records.length ? Math.round(totalNet / records.length) : 0,
        deptStats,
        trend,
        records,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ========== 培训报表 ========== */

router.get('/training-summary', authenticate, async (req, res, next) => {
  try {
    const [totalTrainings, byStatus, enrollments, employees] = await Promise.all([
      prisma.training.count(),
      prisma.training.groupBy({ by: ['status'], _count: true }),
      prisma.trainingEnrollment.findMany({
        include: { training: { select: { title: true, startDate: true, endDate: true } }, employee: { select: { name: true, department: { select: { name: true } } } } },
      }),
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
    ]);

    const statusMap = { PLANNED: '计划中', ONGOING: '进行中', COMPLETED: '已结束', CANCELLED: '已取消' };
    const statusDistribution = byStatus.map((s) => ({ name: statusMap[s.status] || s.status, value: s._count }));

    const totalEnrollments = enrollments.length;
    const signedIn = enrollments.filter((e) => e.signinTime).length;
    const participationRate = totalEnrollments ? Math.round((signedIn / totalEnrollments) * 100) : 0;
    const avgScore = enrollments.filter((e) => e.score).reduce((s, e) => s + e.score, 0) / (enrollments.filter((e) => e.score).length || 1);

    // 按培训项目统计参与情况
    const trainingMap = {};
    enrollments.forEach((e) => {
      const tTitle = e.training?.title || '未知培训';
      if (!trainingMap[tTitle]) trainingMap[tTitle] = { enrolled: 0, signedIn: 0 };
      trainingMap[tTitle].enrolled++;
      if (e.signinTime) trainingMap[tTitle].signedIn++;
    });

    const trainingStats = Object.entries(trainingMap).map(([name, v]) => ({
      name,
      enrolled: v.enrolled,
      signedIn: v.signedIn,
      rate: v.enrolled ? Math.round((v.signedIn / v.enrolled) * 100) : 0,
    }));

    // 按部门统计参训
    const deptMap = {};
    enrollments.forEach((e) => {
      const dName = e.employee?.department?.name || '未分配';
      if (!deptMap[dName]) deptMap[dName] = { total: 0, signedIn: 0 };
      deptMap[dName].total++;
      if (e.signinTime) deptMap[dName].signedIn++;
    });

    const deptStats = Object.entries(deptMap).map(([name, v]) => ({
      name,
      total: v.total,
      signedIn: v.signedIn,
      rate: v.total ? Math.round((v.signedIn / v.total) * 100) : 0,
    }));

    // 员工学时排名（培训天数 × 8）
    const empHours = {};
    enrollments
      .filter((e) => e.signinTime && e.training)
      .forEach((e) => {
        const start = new Date(e.training.startDate);
        const end = new Date(e.training.endDate);
        const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
        const hours = days * 8;
        const ename = e.employee?.name || '未知';
        if (!empHours[ename]) empHours[ename] = { name: ename, dept: e.employee?.department?.name || '', hours: 0, count: 0 };
        empHours[ename].hours += hours;
        empHours[ename].count++;
      });

    const employeeHours = Object.values(empHours).sort((a, b) => b.hours - a.hours).slice(0, 20);

    res.json({
      success: true,
      data: {
        totalTrainings,
        totalEnrollments,
        signedIn,
        totalEmployees: employees,
        participationRate,
        avgScore: Math.round(avgScore * 10) / 10,
        statusDistribution,
        trainingStats,
        deptStats,
        employeeHours,
        enrollments,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ========== 招聘报表 ========== */

router.get('/recruitment-summary', authenticate, async (req, res, next) => {
  try {
    const [jobs, byStatus, byUrgency, candidates, byStage] = await Promise.all([
      prisma.job.findMany({ include: { _count: { select: { candidates: true } } } }),
      prisma.job.groupBy({ by: ['status'], _count: true }),
      prisma.job.groupBy({ by: ['urgency'], _count: true }),
      prisma.candidate.findMany({ include: { job: { select: { title: true } } } }),
      prisma.candidate.groupBy({ by: ['stage'], _count: true }),
    ]);

    const statusMap = { OPEN: '招聘中', CLOSED: '已关闭', PAUSED: '已暂停' };
    const urgencyMap = { URGENT: '紧急', NORMAL: '一般', LOW: '低' };
    const stageMap = {
      APPLIED: '已投递', SCREENING: '筛选中', INTERVIEW1: '初试',
      INTERVIEW2: '复试', OFFER: '录用', ONBOARDED: '已入职', REJECTED: '已淘汰',
    };

    const jobStatusDistribution = byStatus.map((s) => ({
      name: statusMap[s.status] || s.status, value: s._count,
    }));

    const urgencyDistribution = byUrgency.map((u) => ({
      name: urgencyMap[u.urgency] || u.urgency, value: u._count,
    }));

    // 候选人阶段漏斗
    const stageDistribution = byStage.map((s) => ({
      name: stageMap[s.stage] || s.stage, value: s._count,
    }));

    // 按岗位统计
    const jobStats = jobs
      .filter((j) => j._count.candidates > 0)
      .map((j) => ({
        name: j.title,
        headcount: j.headcount,
        candidates: j._count.candidates,
        status: j.status,
      }))
      .sort((a, b) => b.candidates - a.candidates);

    res.json({
      success: true,
      data: {
        totalJobs: jobs.length,
        openJobs: jobs.filter((j) => j.status === 'OPEN').length,
        totalCandidates: candidates.length,
        activeCandidates: candidates.filter((c) => !['REJECTED'].includes(c.stage)).length,
        jobStatusDistribution,
        urgencyDistribution,
        stageDistribution,
        jobStats,
        candidates,
        jobs,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ========== 绩效报表 ========== */

router.get('/performance-summary', authenticate, async (req, res, next) => {
  try {
    const { period } = req.query;
    const departmentFilter = getDepartmentFilter(req);

    const now = new Date();
    const targetPeriod = period || `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;

    const where = { period: targetPeriod, status: { not: 'DRAFT' } };
    if (departmentFilter) where.employee = { departmentId: departmentFilter };

    const records = await prisma.performance.findMany({
      where,
      include: { employee: { select: { name: true, department: { select: { name: true } } } } },
      orderBy: { finalRating: 'desc' },
    });

    const totalRecords = records.length;
    const completedRecords = records.filter((r) => r.status === 'COMPLETED').length;
    const avgFinalRating = totalRecords ? Math.round(records.reduce((s, r) => s + (r.finalRating || 0), 0) / totalRecords * 10) / 10 : 0;
    const avgSelfRating = totalRecords ? Math.round(records.reduce((s, r) => s + (r.selfRating || 0), 0) / totalRecords * 10) / 10 : 0;
    const avgMgrRating = totalRecords ? Math.round(records.reduce((s, r) => s + (r.mgrRating || 0), 0) / totalRecords * 10) / 10 : 0;

    // 评分分布
    const ratingBuckets = { 'A(≥90)': 0, 'B(80-89)': 0, 'C(70-79)': 0, 'D(60-69)': 0, 'E(<60)': 0 };
    records.forEach((r) => {
      const score = r.finalRating || 0;
      if (score >= 90) ratingBuckets['A(≥90)']++;
      else if (score >= 80) ratingBuckets['B(80-89)']++;
      else if (score >= 70) ratingBuckets['C(70-79)']++;
      else if (score >= 60) ratingBuckets['D(60-69)']++;
      else ratingBuckets['E(<60)']++;
    });

    const ratingDistribution = Object.entries(ratingBuckets).map(([name, value]) => ({ name, value }));

    // 按部门统计
    const deptMap = {};
    records.forEach((r) => {
      const dName = r.employee?.department?.name || '未分配';
      if (!deptMap[dName]) deptMap[dName] = { count: 0, total: 0 };
      deptMap[dName].count++;
      deptMap[dName].total += r.finalRating || 0;
    });

    const deptStats = Object.entries(deptMap).map(([name, v]) => ({
      name,
      count: v.count,
      avg: Math.round((v.total / v.count) * 10) / 10,
    }));

    // 近6期绩效趋势
    const trendPeriods = [];
    for (let i = 0; i < 6; i++) {
      const y = now.getFullYear();
      const q = Math.ceil((now.getMonth() + 1) / 3) - i;
      if (q > 0) trendPeriods.push(`${y}-Q${q}`);
      else trendPeriods.push(`${y - 1}-Q${q + 4}`);
    }

    const trend = await Promise.all(
      trendPeriods.reverse().map(async (p) => {
        const perfRecords = await prisma.performance.aggregate({
          where: { period: p, status: { not: 'DRAFT' }, ...(departmentFilter ? { employee: { departmentId: departmentFilter } } : {}) },
          _avg: { finalRating: true },
          _count: true,
        });
        return {
          period: p,
          count: perfRecords._count,
          avgRating: perfRecords._avg.finalRating ? Math.round(perfRecords._avg.finalRating * 10) / 10 : 0,
        };
      })
    );

    res.json({
      success: true,
      data: {
        period: targetPeriod,
        totalRecords,
        completedRecords,
        avgFinalRating,
        avgSelfRating,
        avgMgrRating,
        ratingDistribution,
        deptStats,
        trend,
        records,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ========== 合同报表 ========== */

router.get('/contract-summary', authenticate, async (req, res, next) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    const now = new Date();

    const where = departmentFilter ? { employee: { departmentId: departmentFilter } } : {};

    const contracts = await prisma.contract.findMany({
      where,
      include: { employee: { select: { name: true, employeeNo: true, department: { select: { name: true } } } } },
      orderBy: { endDate: 'asc' },
    });

    const total = contracts.length;
    const activeCount = contracts.filter((c) => c.status === 'ACTIVE').length;

    // 即将到期（60天内）
    const in60Days = new Date(now.getTime() + 60 * 24 * 3600 * 1000);
    const expiring60 = contracts.filter((c) => c.status === 'ACTIVE' && new Date(c.endDate) <= in60Days).sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

    // 即将到期（30天内）
    const in30Days = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    const expiring30 = expiring60.filter((c) => new Date(c.endDate) <= in30Days);

    // 按类型分布
    const typeMap = {};
    contracts.forEach((c) => {
      if (!typeMap[c.type]) typeMap[c.type] = 0;
      typeMap[c.type]++;
    });

    const typeDistribution = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

    // 按部门分布
    const deptMap = {};
    contracts.forEach((c) => {
      const dName = c.employee?.department?.name || '未分配';
      if (!deptMap[dName]) deptMap[dName] = 0;
      deptMap[dName]++;
    });

    const deptDistribution = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

    // 月度到期分布（未来12个月）
    const monthExpiry = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const count = contracts.filter((c) => {
        const ed = new Date(c.endDate);
        return c.status === 'ACTIVE' && ed >= mStart && ed <= mEnd;
      }).length;
      monthExpiry.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        count,
      });
    }

    res.json({
      success: true,
      data: {
        total,
        activeCount,
        expiring60Count: expiring60.length,
        expiring30Count: expiring30.length,
        expiredCount: contracts.filter((c) => c.status === 'EXPIRED').length,
        expiring60,
        expiring30,
        typeDistribution,
        deptDistribution,
        monthExpiry,
        contracts,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ========== 请假报表 ========== */

router.get('/leave-summary', authenticate, async (req, res, next) => {
  try {
    const { month } = req.query;
    const departmentFilter = getDepartmentFilter(req);

    const now = new Date();
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, m] = targetMonth.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);

    const where = { startDate: { lte: end }, endDate: { gte: start }, status: 'APPROVED' };
    if (departmentFilter) where.employee = { departmentId: departmentFilter };

    const leaves = await prisma.leave.findMany({
      where,
      include: { employee: { select: { name: true, employeeNo: true, department: { select: { name: true } } } } },
      orderBy: { startDate: 'desc' },
    });

    const totalLeaves = leaves.length;
    const totalDays = leaves.reduce((s, l) => s + l.duration, 0);

    // 按类型统计
    const typeMap = {};
    leaves.forEach((l) => {
      if (!typeMap[l.type]) typeMap[l.type] = { count: 0, days: 0 };
      typeMap[l.type].count++;
      typeMap[l.type].days += l.duration;
    });

    const typeDistribution = Object.entries(typeMap).map(([name, v]) => ({ name, count: v.count, days: Math.round(v.days * 10) / 10 }));

    // 按部门统计
    const deptMap = {};
    leaves.forEach((l) => {
      const dName = l.employee?.department?.name || '未分配';
      if (!deptMap[dName]) deptMap[dName] = { count: 0, days: 0 };
      deptMap[dName].count++;
      deptMap[dName].days += l.duration;
    });

    const deptStats = Object.entries(deptMap).map(([name, v]) => ({
      name,
      count: v.count,
      days: Math.round(v.days * 10) / 10,
    }));

    res.json({
      success: true,
      data: {
        month: targetMonth,
        totalLeaves,
        totalDays: Math.round(totalDays * 10) / 10,
        typeDistribution,
        deptStats,
        leaves,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ========== 仪表盘摘要 ========== */

router.get('/dashboard-summary', authenticate, async (req, res, next) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    const empWhere = departmentFilter ? { departmentId: departmentFilter } : {};

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalEmployees, activeEmployees, newThisMonth, totalDepartments, openJobs, totalTrainings, activeContracts, expiringContracts] = await Promise.all([
      prisma.employee.count({ where: empWhere }),
      prisma.employee.count({ where: { ...empWhere, status: 'ACTIVE' } }),
      prisma.employee.count({ where: { ...empWhere, hireDate: { gte: monthStart } } }),
      prisma.department.count({ where: departmentFilter ? { id: departmentFilter } : {} }),
      prisma.job.count({ where: { status: 'OPEN' } }),
      prisma.training.count(),
      prisma.contract.count({ where: { status: 'ACTIVE', ...(departmentFilter ? { employee: { departmentId: departmentFilter } } : {}) } }),
      prisma.contract.count({
        where: {
          status: 'ACTIVE',
          endDate: { lte: new Date(now.getTime() + 30 * 24 * 3600 * 1000) },
          ...(departmentFilter ? { employee: { departmentId: departmentFilter } } : {}),
        },
      }),
    ]);

    // 今日出勤率
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
    const todayAttendance = await prisma.attendance.findMany({
      where: { date: { gte: today, lt: tomorrow }, ...(departmentFilter ? { employee: { departmentId: departmentFilter } } : {}) },
    });
    const todayRate = todayAttendance.length
      ? Math.round((todayAttendance.filter((a) => a.status === 'NORMAL').length / todayAttendance.length) * 100)
      : 0;

    // 本月薪资总额
    const salaryAgg = await prisma.salaryRecord.aggregate({
      where: { month: thisMonth, ...(departmentFilter ? { employee: { departmentId: departmentFilter } } : {}) },
      _sum: { netSalary: true },
    });

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        newThisMonth,
        totalDepartments,
        openJobs,
        totalTrainings,
        activeContracts,
        expiringContracts,
        todayAttendanceRate: todayRate,
        thisMonthSalaryTotal: salaryAgg._sum.netSalary || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ========== 导出接口 ========== */

// 导出考勤为 Excel
router.get('/attendance-export', authenticate, async (req, res, next) => {
  try {
    const { month } = req.query;
    const departmentFilter = getDepartmentFilter(req);
    const now = new Date();
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, m] = targetMonth.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);

    const where = { date: { gte: start, lte: end } };
    if (departmentFilter) where.employee = { departmentId: departmentFilter };

    const records = await prisma.attendance.findMany({
      where,
      include: { employee: { select: { name: true, employeeNo: true, department: { select: { name: true } } } } },
      orderBy: { date: 'desc' },
    });

    const statusMap = { NORMAL: '正常', LATE: '迟到', EARLY: '早退', ABSENT: '缺勤' };
    const rows = records.map((r) => ({
      '员工姓名': r.employee?.name || '',
      '工号': r.employee?.employeeNo || '',
      '部门': r.employee?.department?.name || '',
      '日期': r.date ? new Date(r.date).toLocaleDateString('zh-CN') : '',
      '上班时间': r.clockIn ? new Date(r.clockIn).toLocaleTimeString('zh-CN') : '未打卡',
      '下班时间': r.clockOut ? new Date(r.clockOut).toLocaleTimeString('zh-CN') : '未打卡',
      '状态': statusMap[r.status] || r.status,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, '考勤明细');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${targetMonth}.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// 导出员工为 Excel
router.get('/employee-export', authenticate, async (req, res, next) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    const where = departmentFilter ? { departmentId: departmentFilter } : {};
    const employees = await prisma.employee.findMany({
      where,
      include: { department: { select: { name: true } } },
      orderBy: { employeeNo: 'asc' },
    });

    const genderMap = { MALE: '男', FEMALE: '女' };
    const statusMap = { ACTIVE: '在职', INACTIVE: '待岗', RESIGNED: '离职' };

    const rows = employees.map((e) => ({
      '工号': e.employeeNo,
      '姓名': e.name,
      '性别': genderMap[e.gender] || e.gender,
      '部门': e.department?.name || '',
      '岗位': e.positionTitle || '',
      '手机号': e.phone,
      '邮箱': e.email,
      '状态': statusMap[e.status] || e.status,
      '入职日期': e.hireDate ? new Date(e.hireDate).toLocaleDateString('zh-CN') : '',
      '学历': e.education,
      '身份证号': e.idCard,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, '员工花名册');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=employees_${date}.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// 导出薪资为 Excel
router.get('/salary-export', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const { month } = req.query;
    const departmentFilter = getDepartmentFilter(req);
    const now = new Date();
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const records = await prisma.salaryRecord.findMany({
      where: { month: targetMonth, ...(departmentFilter ? { employee: { departmentId: departmentFilter } } : {}) },
      include: { employee: { select: { name: true, employeeNo: true, department: { select: { name: true } } } } },
      orderBy: { netSalary: 'desc' },
    });

    const rows = records.map((r) => ({
      '员工姓名': r.employee?.name || '',
      '工号': r.employee?.employeeNo || '',
      '部门': r.employee?.department?.name || '',
      '基本工资': r.baseSalary,
      '津贴补贴': r.allowance,
      '加班费': r.overtime,
      '奖金': r.bonus,
      '社保代扣': r.socialIns,
      '个税': r.tax,
      '其他扣款': r.deduction,
      '实发工资': r.netSalary,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 14 }, { wch: 12 }, { wch: 16 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '薪资明细');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=salary_${targetMonth}.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

export default router;
