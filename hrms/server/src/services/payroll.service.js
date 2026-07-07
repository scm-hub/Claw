import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();

// Excel 模板列定义（按顺序）
const EXCEL_COLUMNS = [
  { header: '序号', key: 'seq', width: 6 },
  { header: '月份', key: 'month', width: 10 },
  { header: '公司', key: 'company', width: 20 },
  { header: '部门', key: 'department', width: 16 },
  { header: '班组', key: 'team', width: 12 },
  { header: '岗位', key: 'position', width: 14 },
  { header: '岗位层级', key: 'positionLevel', width: 10 },
  { header: '岗位类别', key: 'positionCategory', width: 10 },
  { header: '工号', key: 'employeeNo', width: 10 },
  { header: '身份证号', key: 'idCard', width: 20 },
  { header: '计薪方式', key: 'payMethod', width: 10 },
  { header: '状态', key: 'status', width: 8 },
  { header: '姓名', key: 'name', width: 10 },
  { header: '出勤天数', key: 'attendanceDays', width: 10 },
  { header: '基本/计件工资', key: 'baseWage', width: 14 },
  { header: '绩效工资', key: 'performanceBonus', width: 12 },
  { header: '加班费', key: 'overtimePay', width: 10 },
  { header: '提成', key: 'commission', width: 10 },
  { header: '全勤奖', key: 'fullAttendanceBonus', width: 10 },
  { header: '工龄补贴', key: 'seniorityAllowance', width: 10 },
  { header: '党员补贴', key: 'partyMemberSubsidy', width: 10 },
  { header: '证书补贴', key: 'certificateSubsidy', width: 10 },
  { header: '岗位津贴', key: 'positionAllowance', width: 10 },
  { header: '学历补贴', key: 'educationSubsidy', width: 10 },
  { header: '技术员补贴', key: 'technicianSubsidy', width: 12 },
  { header: '孝心补贴', key: 'filialSubsidy', width: 10 },
  { header: '高温补贴', key: 'highTempSubsidy', width: 10 },
  { header: '带薪年休假', key: 'paidAnnualLeave', width: 12 },
  { header: '其他补贴', key: 'otherSubsidy', width: 10 },
  { header: '福利费', key: 'welfareFee', width: 10 },
  { header: '奖励项', key: 'rewardItem', width: 10 },
  { header: '处罚项', key: 'penaltyItem', width: 10 },
  { header: '应付工资', key: 'grossPay', width: 12 },
  { header: '个税', key: 'individualTax', width: 10 },
  { header: '社保', key: 'socialInsurance', width: 10 },
  { header: '公积金', key: 'housingFund', width: 10 },
  { header: '党费', key: 'partyFee', width: 8 },
  { header: '其他扣款', key: 'otherDeduction', width: 10 },
  { header: '扣款小计', key: 'totalDeduction', width: 10 },
  { header: '实付工资', key: 'netPay', width: 12 },
  { header: '工资卡银行', key: 'bankName', width: 12 },
  { header: '银行卡号', key: 'bankAccount', width: 20 },
];

// 数值字段列表
const NUMERIC_FIELDS = [
  'attendanceDays', 'baseWage', 'performanceBonus', 'overtimePay', 'commission',
  'fullAttendanceBonus', 'seniorityAllowance', 'partyMemberSubsidy', 'certificateSubsidy',
  'positionAllowance', 'educationSubsidy', 'technicianSubsidy', 'filialSubsidy',
  'highTempSubsidy', 'paidAnnualLeave', 'otherSubsidy', 'welfareFee', 'rewardItem',
  'penaltyItem', 'grossPay', 'individualTax', 'socialInsurance', 'housingFund',
  'partyFee', 'otherDeduction', 'totalDeduction', 'netPay',
];

// 工资计算：应发 = 所有薪资项之和
const EARNING_FIELDS = [
  'baseWage', 'performanceBonus', 'overtimePay', 'commission',
  'fullAttendanceBonus', 'seniorityAllowance', 'partyMemberSubsidy', 'certificateSubsidy',
  'positionAllowance', 'educationSubsidy', 'technicianSubsidy', 'filialSubsidy',
  'highTempSubsidy', 'paidAnnualLeave', 'otherSubsidy', 'welfareFee', 'rewardItem',
];

const DEDUCTION_FIELDS = [
  'individualTax', 'socialInsurance', 'housingFund', 'partyFee', 'otherDeduction',
];

/**
 * 计算应付工资和扣款小计
 */
export function calculateTotals(record) {
  const grossPay = EARNING_FIELDS.reduce((s, f) => s + (Number(record[f]) || 0), 0) - (Number(record.penaltyItem) || 0);
  const totalDeduction = DEDUCTION_FIELDS.reduce((s, f) => s + (Number(record[f]) || 0), 0);
  const netPay = grossPay - totalDeduction;
  return { grossPay, totalDeduction, netPay };
}

/**
 * 列表查询
 */
export async function listPayrollRecords({ month, department, company, search, page = 1, pageSize = 20 }) {
  const where = {};
  if (month) where.month = month;
  if (department) where.department = { contains: department };
  if (company) where.company = { contains: company };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { employeeNo: { contains: search } },
      { idCard: { contains: search } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.payrollRecord.count({ where }),
    prisma.payrollRecord.findMany({
      where,
      include: { employee: { select: { id: true, name: true, employeeNo: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ month: 'desc' }, { employeeNo: 'asc' }],
    }),
  ]);
  return { page, pageSize, total, data };
}

/**
 * 获取单条详情
 */
export async function getPayrollRecord(id) {
  return prisma.payrollRecord.findUnique({
    where: { id },
    include: { employee: { select: { id: true, name: true, employeeNo: true } } },
  });
}

/**
 * 更新
 */
export async function updatePayrollRecord(id, data) {
  // 数值字段转换
  NUMERIC_FIELDS.forEach((f) => {
    if (data[f] !== undefined) data[f] = Number(data[f]) || 0;
  });
  // 自动计算合计
  const totals = calculateTotals(data);
  data.grossPay = totals.grossPay;
  data.totalDeduction = totals.totalDeduction;
  data.netPay = totals.netPay;
  return prisma.payrollRecord.update({ where: { id }, data });
}

/**
 * 删除
 */
export async function deletePayrollRecord(id) {
  return prisma.payrollRecord.delete({ where: { id } });
}

/**
 * 按月份批量删除
 */
export async function deletePayrollByMonth(month) {
  return prisma.payrollRecord.deleteMany({ where: { month } });
}

/**
 * 统计汇总
 */
export async function getPayrollSummary(month) {
  const where = {};
  if (month) where.month = month;

  const records = await prisma.payrollRecord.findMany({
    where,
    select: {
      department: true,
      company: true,
      grossPay: true,
      totalDeduction: true,
      netPay: true,
      individualTax: true,
      socialInsurance: true,
      housingFund: true,
    },
  });

  const totalGross = records.reduce((s, r) => s + r.grossPay, 0);
  const totalNet = records.reduce((s, r) => s + r.netPay, 0);
  const totalTax = records.reduce((s, r) => s + r.individualTax, 0);
  const totalSocial = records.reduce((s, r) => s + r.socialInsurance, 0);
  const totalFund = records.reduce((s, r) => s + r.housingFund, 0);
  const totalDeduction = records.reduce((s, r) => s + r.totalDeduction, 0);

  // 按部门汇总
  const byDepartment = {};
  records.forEach((r) => {
    const dept = r.department || '未知';
    if (!byDepartment[dept]) byDepartment[dept] = { count: 0, totalGross: 0, totalNet: 0 };
    byDepartment[dept].count++;
    byDepartment[dept].totalGross += r.grossPay;
    byDepartment[dept].totalNet += r.netPay;
  });

  // 按公司汇总
  const byCompany = {};
  records.forEach((r) => {
    const comp = r.company || '未知';
    if (!byCompany[comp]) byCompany[comp] = { count: 0, totalGross: 0, totalNet: 0 };
    byCompany[comp].count++;
    byCompany[comp].totalGross += r.grossPay;
    byCompany[comp].totalNet += r.netPay;
  });

  return {
    month,
    employeeCount: records.length,
    totalGross,
    totalNet,
    totalTax,
    totalSocial,
    totalFund,
    totalDeduction,
    byDepartment,
    byCompany,
  };
}

/**
 * 生成导入模板 Excel
 */
export async function generateTemplate(month) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('工资表');

  // 设置列
  ws.columns = EXCEL_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  // 表头样式
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

  // 填充月份默认值
  const m = month || new Date().toISOString().slice(0, 7);

  // 添加示例行
  ws.addRow({
    seq: 1, month: m, company: '', department: '', team: '', position: '',
    positionLevel: '', positionCategory: '', employeeNo: '', idCard: '',
    payMethod: '月薪', status: '在职', name: '', attendanceDays: 22,
    baseWage: 0, performanceBonus: 0, overtimePay: 0, commission: 0,
    fullAttendanceBonus: 0, seniorityAllowance: 0, partyMemberSubsidy: 0,
    certificateSubsidy: 0, positionAllowance: 0, educationSubsidy: 0,
    technicianSubsidy: 0, filialSubsidy: 0, highTempSubsidy: 0,
    paidAnnualLeave: 0, otherSubsidy: 0, welfareFee: 0, rewardItem: 0,
    penaltyItem: 0, grossPay: 0, individualTax: 0, socialInsurance: 0,
    housingFund: 0, partyFee: 0, otherDeduction: 0, totalDeduction: 0,
    netPay: 0, bankName: '', bankAccount: '',
  });

  return wb.xlsx.writeBuffer();
}

/**
 * 导出 Excel
 */
export async function exportPayrollExcel({ month, department, company }) {
  const where = {};
  if (month) where.month = month;
  if (department) where.department = { contains: department };
  if (company) where.company = { contains: company };

  const records = await prisma.payrollRecord.findMany({
    where,
    orderBy: [{ month: 'desc' }, { employeeNo: 'asc' }],
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('工资表');

  ws.columns = EXCEL_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  // 表头样式
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

  records.forEach((r, i) => {
    ws.addRow({
      seq: i + 1,
      month: r.month,
      company: r.company,
      department: r.department,
      team: r.team,
      position: r.position,
      positionLevel: r.positionLevel,
      positionCategory: r.positionCategory,
      employeeNo: r.employeeNo,
      idCard: r.idCard,
      payMethod: r.payMethod,
      status: r.status,
      name: r.name,
      attendanceDays: r.attendanceDays,
      baseWage: r.baseWage,
      performanceBonus: r.performanceBonus,
      overtimePay: r.overtimePay,
      commission: r.commission,
      fullAttendanceBonus: r.fullAttendanceBonus,
      seniorityAllowance: r.seniorityAllowance,
      partyMemberSubsidy: r.partyMemberSubsidy,
      certificateSubsidy: r.certificateSubsidy,
      positionAllowance: r.positionAllowance,
      educationSubsidy: r.educationSubsidy,
      technicianSubsidy: r.technicianSubsidy,
      filialSubsidy: r.filialSubsidy,
      highTempSubsidy: r.highTempSubsidy,
      paidAnnualLeave: r.paidAnnualLeave,
      otherSubsidy: r.otherSubsidy,
      welfareFee: r.welfareFee,
      rewardItem: r.rewardItem,
      penaltyItem: r.penaltyItem,
      grossPay: r.grossPay,
      individualTax: r.individualTax,
      socialInsurance: r.socialInsurance,
      housingFund: r.housingFund,
      partyFee: r.partyFee,
      otherDeduction: r.otherDeduction,
      totalDeduction: r.totalDeduction,
      netPay: r.netPay,
      bankName: r.bankName,
      bankAccount: r.bankAccount,
    });
  });

  // 数值列格式
  const numericColKeys = ['attendanceDays', ...NUMERIC_FIELDS];
  numericColKeys.forEach((key) => {
    const col = ws.getColumn(key);
    if (col) col.numFmt = '#,##0.00';
  });

  return wb.xlsx.writeBuffer();
}

/**
 * 从 Excel 导入
 */
export async function importPayrollExcel(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.getWorksheet(1);
  if (!ws) throw new Error('Excel 文件无有效工作表');

  // 读取表头，建立列名→key 映射
  const headerRow = ws.getRow(1);
  const headerMap = {};
  headerRow.eachCell((cell, colNumber) => {
    const text = String(cell.value || '').trim();
    const colDef = EXCEL_COLUMNS.find((c) => c.header === text);
    if (colDef) headerMap[colNumber] = colDef.key;
  });

  if (Object.keys(headerMap).length < 5) {
    throw new Error('Excel 表头不匹配，请使用下载的模板');
  }

  const results = { success: 0, failed: 0, errors: [] };
  let rowNum = 1;

  // 逐行读取
  for (let r = 2; r <= ws.rowCount; r++) {
    rowNum = r;
    const row = ws.getRow(r);
    if (!row || row.cellCount === 0) continue;

    const record = {};
    let hasData = false;

    Object.entries(headerMap).forEach(([colNum, key]) => {
      // seq 是序号列，不写入数据库
      if (key === 'seq') return;

      const cell = row.getCell(parseInt(colNum));
      let val = cell.value;
      // 处理公式结果
      if (val && typeof val === 'object' && val.result !== undefined) val = val.result;
      if (val !== null && val !== undefined && String(val).trim() !== '') hasData = true;

      if (NUMERIC_FIELDS.includes(key)) {
        record[key] = Number(val) || 0;
      } else {
        record[key] = val ? String(val).trim() : '';
      }
    });

    if (!hasData) continue;

    // 必填字段校验
    if (!record.employeeNo) {
      results.errors.push(`第 ${rowNum} 行：缺少工号`);
      results.failed++;
      continue;
    }
    if (!record.name) {
      results.errors.push(`第 ${rowNum} 行：缺少姓名`);
      results.failed++;
      continue;
    }
    if (!record.month) {
      results.errors.push(`第 ${rowNum} 行：缺少月份`);
      results.failed++;
      continue;
    }

    // 自动计算合计（如果导入数据没有填）
    const totals = calculateTotals(record);
    if (!record.grossPay) record.grossPay = totals.grossPay;
    if (!record.totalDeduction) record.totalDeduction = totals.totalDeduction;
    if (!record.netPay) record.netPay = totals.netPay;

    // 尝试关联员工
    let employeeId = null;
    try {
      const emp = await prisma.employee.findFirst({
        where: { employeeNo: record.employeeNo },
        select: { id: true },
      });
      if (emp) employeeId = emp.id;
    } catch {}

    try {
      await prisma.payrollRecord.upsert({
        where: { employeeNo_month: { employeeNo: record.employeeNo, month: record.month } },
        create: { ...record, employeeId },
        update: { ...record, employeeId },
      });
      results.success++;
    } catch (err) {
      results.errors.push(`第 ${rowNum} 行：${err.message}`);
      results.failed++;
    }
  }

  return results;
}

/**
 * 从员工表初始化当月工资记录
 * 为所有在职员工创建空白工资记录（如果该月尚无记录）
 */
export async function initFromEmployees(month, departmentId) {
  // 先检查该月是否已有记录
  const existingCount = await prisma.payrollRecord.count({ where: { month } });
  if (existingCount > 0) {
    return { created: 0, skipped: existingCount, message: '该月已有工资记录，跳过初始化' };
  }

  // 查询在职员工
  const empWhere = { status: 'ACTIVE' };
  if (departmentId) empWhere.departmentId = departmentId;

  const employees = await prisma.employee.findMany({
    where: empWhere,
    include: {
      department: { select: { name: true } },
      position: { select: { name: true, level: true, category: true } },
    },
    orderBy: { employeeNo: 'asc' },
  });

  let created = 0;
  for (const emp of employees) {
    try {
      await prisma.payrollRecord.create({
        data: {
          employeeId: emp.id,
          month,
          company: '',
          department: emp.department?.name || '',
          team: '',
          position: emp.positionTitle || emp.position?.name || '',
          positionLevel: emp.position?.level || '',
          positionCategory: emp.position?.category || '',
          employeeNo: emp.employeeNo,
          idCard: emp.idCard || '',
          payMethod: '月薪',
          status: '在职',
          name: emp.name,
          attendanceDays: 22,
          baseWage: emp.baseSalary || 0,
          grossPay: emp.baseSalary || 0,
          netPay: emp.baseSalary || 0,
        },
      });
      created++;
    } catch (err) {
      // 可能重复，跳过
    }
  }

  return { created, skipped: 0, message: `已为 ${created} 名员工初始化工资记录` };
}

/**
 * 从上月复制数据
 * 将上个月的工资数据复制到当前月（保留金额，更新月份）
 */
export async function copyFromLastMonth(month) {
  // 计算上个月
  const [year, mon] = month.split('-').map(Number);
  let lastYear = year, lastMon = mon - 1;
  if (lastMon === 0) { lastMon = 12; lastYear--; }
  const lastMonth = `${lastYear}-${String(lastMon).padStart(2, '0')}`;

  const lastRecords = await prisma.payrollRecord.findMany({
    where: { month: lastMonth },
  });

  if (lastRecords.length === 0) {
    return { copied: 0, message: `${lastMonth} 无工资记录可复制` };
  }

  // 检查当前月是否已有记录
  const currentRecords = await prisma.payrollRecord.findMany({
    where: { month },
    select: { employeeNo: true },
  });
  const existingNos = new Set(currentRecords.map((r) => r.employeeNo));

  let copied = 0;
  for (const rec of lastRecords) {
    if (existingNos.has(rec.employeeNo)) continue; // 已存在则跳过
    try {
      const { id, createdAt, updatedAt, employeeId, ...rest } = rec;
      await prisma.payrollRecord.create({
        data: {
          ...rest,
          month,
          employeeId: employeeId || null,
        },
      });
      copied++;
    } catch (err) {
      // 跳过错误
    }
  }

  return { copied, lastMonth, message: `从 ${lastMonth} 复制了 ${copied} 条记录` };
}

/**
 * 批量保存工资记录
 * 接收多条记录，逐条 upsert
 */
export async function batchUpdatePayrollRecords(records) {
  const results = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    try {
      // 数值字段转换
      NUMERIC_FIELDS.forEach((f) => {
        if (rec[f] !== undefined) rec[f] = Number(rec[f]) || 0;
      });
      // 自动计算合计
      const totals = calculateTotals(rec);
      rec.grossPay = totals.grossPay;
      rec.totalDeduction = totals.totalDeduction;
      rec.netPay = totals.netPay;

      if (rec.id) {
        // 已有记录 → update
        const { id, ...data } = rec;
        await prisma.payrollRecord.update({ where: { id }, data });
      } else {
        // 新记录 → upsert by employeeNo + month
        await prisma.payrollRecord.upsert({
          where: { employeeNo_month: { employeeNo: rec.employeeNo, month: rec.month } },
          create: rec,
          update: rec,
        });
      }
      results.success++;
    } catch (err) {
      results.errors.push(`第 ${i + 1} 行(${rec.employeeNo || rec.name}): ${err.message}`);
      results.failed++;
    }
  }

  return results;
}
