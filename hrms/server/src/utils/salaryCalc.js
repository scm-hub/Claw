import { calculateSocialInsurance, calculateTax } from './taxCalc.js';

/**
 * 计算单个员工月度薪资
 */
export const calculateSalaryForEmployee = (employee, attendanceStats, month) => {
  const { baseSalary } = employee;

  // 津贴（岗位津贴 = 基本工资 * 10%）
  const allowance = Math.round(baseSalary * 0.1);

  // 加班费（按天计算简化）
  const overtimeRate = Math.round(baseSalary / 21.75) * 1.5;
  const overtimeDays = Math.max(0, (attendanceStats?.normal || 22) - 21.75);
  const overtime = Math.round(overtimeDays * overtimeRate);

  // 奖金（默认0，后续可配置）
  const bonus = 0;

  // 应发合计
  const grossSalary = baseSalary + allowance + overtime + bonus;

  // 社保
  const socialIns = calculateSocialInsurance(baseSalary);

  // 应税所得 = 应发 - 社保 - 5000起征点
  const taxableIncome = grossSalary - socialIns.total - 5000;
  const tax = calculateTax(taxableIncome);

  // 扣款合计
  const deduction = 0;

  // 实发工资
  const netSalary = grossSalary - socialIns.total - tax - deduction;

  return {
    employeeId: employee.id,
    month,
    baseSalary,
    allowance,
    overtime,
    bonus,
    socialIns: socialIns.total,
    tax,
    deduction,
    netSalary: Math.max(0, netSalary),
  };
};
