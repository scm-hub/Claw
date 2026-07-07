import mysql from 'mysql2/promise';
import prisma from '../src/shared/prisma.js';

const HRMS_CONFIG = {
  host: 'localhost', user: 'root', password: 'Scm@2025!', database: 'hrms'
};

async function main() {
  const conn = await mysql.createConnection(HRMS_CONFIG);

  // 1. Get HRMS departments
  const [hrmsDepts] = await conn.execute(
    'SELECT id, name, parentId, managerId, sortOrder FROM Department ORDER BY sortOrder ASC'
  );
  console.log('HRMS Departments:', hrmsDepts.length);
  console.table(hrmsDepts);

  // 2. Get SCM departments (via Prisma)
  const scmDepts = await prisma.department.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' }
  });
  console.log('SCM Departments:', scmDepts.length);
  console.table(scmDepts);

  // 3. Find SCM departments NOT in HRMS (orphans to delete)
  const hrmsNames = hrmsDepts.map(d => d.name);
  const orphanDepts = scmDepts.filter(d => !hrmsNames.includes(d.name));
  console.log('\nOrphan SCM departments (not in HRMS, will be deleted):', orphanDepts.length);
  console.table(orphanDepts);

  // 4. Check employees in orphan departments
  if (orphanDepts.length > 0) {
    const orphanIds = orphanDepts.map(d => d.id);
    const orphanEmps = await prisma.employee.findMany({
      where: { departmentId: { in: orphanIds } },
      select: { id: true, name: true, empNo: true, departmentId: true }
    });
    console.log('\nEmployees in orphan departments:', orphanEmps.length);
    if (orphanEmps.length > 0) console.table(orphanEmps);
  }

  // 5. Get HRMS employees
  const [hrmsEmps] = await conn.execute(
    'SELECT id, employeeNo, name, departmentId, email, phone, positionTitle, status, hireDate FROM Employee ORDER BY employeeNo ASC'
  );
  console.log('\nHRMS Employees:', hrmsEmps.length);

  // 6. Get SCM employees
  const scmEmps = await prisma.employee.findMany({
    select: { id: true, name: true, empNo: true, email: true, departmentId: true },
    orderBy: { empNo: 'asc' }
  });
  console.log('SCM Employees:', scmEmps.length);

  // 7. Find SCM employees NOT in HRMS (orphans)
  const hrmsEmpNos = hrmsEmps.map(e => e.employeeNo);
  const orphanEmps = scmEmps.filter(e => !hrmsEmpNos.includes(e.empNo));
  console.log('\nOrphan SCM employees (not in HRMS, will be deleted):', orphanEmps.length);
  if (orphanEmps.length > 0) console.table(orphanEmps);

  await conn.end();
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
