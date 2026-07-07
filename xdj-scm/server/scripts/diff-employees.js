import mysql from 'mysql2/promise';
import prisma from '../src/shared/prisma.js';

const HRMS_CONFIG = {
  host: 'localhost', user: 'root', password: 'Scm@2025!', database: 'hrms'
};

async function main() {
  const conn = await mysql.createConnection(HRMS_CONFIG);

  // 1. Get HRMS employees
  const [hrmsEmps] = await conn.execute(`
    SELECT e.id, e.employeeNo, e.name, e.phone, e.email, e.status, e.hireDate,
           e.positionTitle, e.departmentId,
           d.name as departmentName
    FROM Employee e
    LEFT JOIN Department d ON e.departmentId = d.id
    ORDER BY e.employeeNo ASC
  `);

  // 2. Get SCM employees
  const scmEmps = await prisma.employee.findMany({
    include: { department: { select: { name: true } } },
    orderBy: { empNo: 'asc' }
  });

  console.log('=== 逐条对比 ===\n');
  console.log('工号 | HRMS姓名 vs SCM姓名 | HRMS部门 vs SCM部门 | HRMS职位 vs SCM职位 | HRMS电话 vs SCM电话 | HRMS邮箱 vs SCM邮箱 | HRMS状态 vs SCM状态 | HRMS入职日期 vs SCM入职日期');

  let diffs = 0;
  for (const he of hrmsEmps) {
    const se = scmEmps.find(e => e.empNo === he.employeeNo);
    if (!se) {
      console.log(`${he.employeeNo} | ${he.name} vs [不存在] ⚠️`);
      diffs++;
      continue;
    }

    const fields = [
      ['姓名', he.name, se.name],
      ['部门', he.departmentName || '(无)', se.department?.name || '(无)'],
      ['职位', he.positionTitle || '(无)', se.position || '(无)'],
      ['电话', he.phone || '(无)', se.phone || '(无)'],
      ['邮箱', he.email || '(无)', se.email || '(无)'],
      ['状态', he.status || '(无)', se.status || '(无)'],
      ['入职日期', he.hireDate ? new Date(he.hireDate).toISOString().split('T')[0] : '(无)', se.hireDate ? se.hireDate.toISOString().split('T')[0] : '(无)'],
    ];

    const diffFields = fields.filter(([_, h, s]) => h !== s);
    if (diffFields.length > 0) {
      console.log(`\n${he.employeeNo} ${he.name}:`);
      for (const [label, h, s] of diffFields) {
        console.log(`  ${label}: HRMS="${h}" vs SCM="${s}"`);
      }
      diffs++;
    }
  }

  // Check SCM employees not in HRMS
  for (const se of scmEmps) {
    if (!hrmsEmps.find(e => e.employeeNo === se.empNo)) {
      console.log(`\n${se.empNo} ${se.name}: SCM有但HRMS没有 ⚠️`);
      diffs++;
    }
  }

  console.log(`\n=== 差异数量: ${diffs} ===`);

  await conn.end();
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
