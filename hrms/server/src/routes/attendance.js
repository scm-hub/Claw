import { Router } from 'express';
import * as attService from '../services/attendance.service.js';
import { authenticate } from '../middleware/auth.js';
import { getDepartmentFilter } from '../middleware/departmentScope.js';
import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';

const prisma = new PrismaClient();
const router = Router();

// Get employee ID from user
const getEmployeeId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: true },
  });
  return user?.employee?.id;
};

// 打卡（多次打卡，最早=上班卡，最晚=下班卡）
router.post('/punch', authenticate, async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req.user.userId);
    if (!employeeId) return res.status(400).json({ success: false, message: '未关联员工信息' });
    const result = await attService.punch(employeeId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 保留旧接口兼容（内部调用 punch）
router.post('/clock-in', authenticate, async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req.user.userId);
    if (!employeeId) return res.status(400).json({ success: false, message: '未关联员工信息' });
    const result = await attService.punch(employeeId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/clock-out', authenticate, async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req.user.userId);
    if (!employeeId) return res.status(400).json({ success: false, message: '未关联员工信息' });
    const result = await attService.punch(employeeId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 获取今日打卡状态
router.get('/today', authenticate, async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req.user.userId);
    if (!employeeId) return res.status(400).json({ success: false, message: '未关联员工信息' });
    const result = await attService.getTodayStatus(employeeId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 获取考勤记录
router.get('/records', authenticate, async (req, res, next) => {
  try {
    const { month, page, pageSize } = req.query;
    const departmentFilter = getDepartmentFilter(req);
    let employeeId;
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'HR_ADMIN') {
      employeeId = req.query.employeeId;
    } else {
      employeeId = await getEmployeeId(req.user.userId);
    }
    const result = await attService.getAttendanceRecords({
      employeeId,
      month,
      departmentFilter,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 31,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 获取考勤统计
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ success: false, message: '请提供月份参数' });
    let employeeId;
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'HR_ADMIN') {
      employeeId = req.query.employeeId;
    } else {
      employeeId = await getEmployeeId(req.user.userId);
    }
    if (!employeeId) return res.status(400).json({ success: false, message: '未关联员工信息' });
    const result = await attService.getAttendanceStats(employeeId, month);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 获取考勤汇总（管理员按员工汇总当月考勤数据）
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const { month, page, pageSize } = req.query;
    if (!month) return res.status(400).json({ success: false, message: '请提供月份参数' });
    const departmentFilter = getDepartmentFilter(req);
    const result = await attService.getAttendanceSummary({
      month,
      departmentFilter,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 导出考勤记录 Excel
router.get('/export', authenticate, async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ success: false, message: '请提供月份参数' });

    // 管理员可导出全部，普通员工只导出自己
    const departmentFilter = getDepartmentFilter(req);
    let employeeId;
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'HR_ADMIN') {
      employeeId = req.query.employeeId; // 可选，不传则导出全部
    } else {
      employeeId = await getEmployeeId(req.user.userId);
    }

    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (departmentFilter && !employeeId) where.employee = { departmentId: departmentFilter };
    if (month) {
      const [year, m] = month.split('-').map(Number);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        employee: { select: { name: true, employeeNo: true, department: { select: { name: true } } } },
        clockRecords: { orderBy: { clockTime: 'asc' } },
      },
      orderBy: { date: 'asc' },
    });

    const statusLabels = {
      NORMAL: '正常',
      LATE: '迟到',
      EARLY_LEAVE: '早退',
      LATE_EARLY: '迟到+早退',
      ABSENT: '缺勤',
    };

    // Sheet1: 考勤汇总
    const summaryData = records.map((r) => ({
      '日期': new Date(r.date).toLocaleDateString('zh-CN'),
      '工号': r.employee?.employeeNo || '',
      '姓名': r.employee?.name || '',
      '部门': r.employee?.department?.name || '',
      '上班时间': r.clockIn ? new Date(r.clockIn).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
      '下班时间': r.clockOut ? new Date(r.clockOut).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
      '打卡次数': r.punchCount || 0,
      '状态': statusLabels[r.status] || r.status,
    }));

    // Sheet2: 打卡明细
    const detailData = [];
    records.forEach((r) => {
      const clockRecords = r.clockRecords || [];
      if (clockRecords.length === 0) {
        detailData.push({
          '日期': new Date(r.date).toLocaleDateString('zh-CN'),
          '工号': r.employee?.employeeNo || '',
          '姓名': r.employee?.name || '',
          '打卡时间': '',
          '打卡序号': '',
          '备注': '无打卡记录',
        });
      } else {
        clockRecords.forEach((cr, idx) => {
          let remark = '';
          if (clockRecords.length > 1) {
            if (idx === 0) remark = '上班卡（最早）';
            else if (idx === clockRecords.length - 1) remark = '下班卡（最晚）';
            else remark = '中间打卡';
          }
          detailData.push({
            '日期': new Date(r.date).toLocaleDateString('zh-CN'),
            '工号': r.employee?.employeeNo || '',
            '姓名': r.employee?.name || '',
            '打卡时间': new Date(cr.clockTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            '打卡序号': idx + 1,
            '备注': remark,
          });
        });
      }
    });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    const ws2 = XLSX.utils.json_to_sheet(detailData);

    // 设置列宽
    ws1['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    ];
    ws2['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(wb, ws1, '考勤汇总');
    XLSX.utils.book_append_sheet(wb, ws2, '打卡明细');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = encodeURIComponent(`考勤记录_${month}.xlsx`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

export default router;
