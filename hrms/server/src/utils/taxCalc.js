/**
 * 社保计算（北京标准，简化版）
 * 养老保险 8%，医疗保险 2%，失业保险 0.5%，公积金 12%
 */
export const calculateSocialInsurance = (baseSalary) => {
  const base = Math.min(baseSalary, 31884); // 社保基数上限
  return {
    pension: Math.round(base * 0.08),
    medical: Math.round(base * 0.02),
    unemployment: Math.round(base * 0.005),
    housingFund: Math.round(base * 0.12),
    get total() {
      return this.pension + this.medical + this.unemployment + this.housingFund;
    },
  };
};

/**
 * 个税计算（2024年累进税率，简化版）
 * 起征点 5000，按月计算
 */
export const calculateTax = (taxableIncome) => {
  const brackets = [
    { limit: 3000, rate: 0.03, deduction: 0 },
    { limit: 12000, rate: 0.1, deduction: 210 },
    { limit: 25000, rate: 0.2, deduction: 1410 },
    { limit: 35000, rate: 0.25, deduction: 2660 },
    { limit: 55000, rate: 0.3, deduction: 4410 },
    { limit: 80000, rate: 0.35, deduction: 7160 },
    { limit: Infinity, rate: 0.45, deduction: 15160 },
  ];

  if (taxableIncome <= 0) return 0;

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.limit) {
      return Math.round(taxableIncome * bracket.rate - bracket.deduction);
    }
  }
  return 0;
};
