const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // 1. 所有客户
  const customers = await prisma.customer.findMany({
    select: { name: true, salesRepId: true, departmentId: true, salesRep: { select: { name: true } }, department: { select: { name: true } } }
  });
  console.log('=== 所有客户 ===');
  customers.forEach(c => console.log(c.name, '| salesRepId:', c.salesRepId, '(', c.salesRep?.name, ')', '| deptId:', c.departmentId, '(', c.department?.name, ')'));

  // 2. SALES_MANAGER
  const mgrs = await prisma.user.findMany({
    where: { role: 'SALES_MANAGER' },
    select: { id: true, username: true, employeeId: true, employee: { select: { name: true, departmentId: true, department: { select: { name: true } } } } }
  });
  console.log('\n=== SALES_MANAGER ===');
  mgrs.forEach(m => console.log(m.username, '| userId:', m.id, '| empId:', m.employeeId, '| deptId:', m.employee?.departmentId, '(', m.employee?.department?.name, ')', '| name:', m.employee?.name));

  // 3. SALES_STAFF
  const staff = await prisma.user.findMany({
    where: { role: 'SALES_STAFF' },
    select: { id: true, username: true, employeeId: true, employee: { select: { name: true, departmentId: true } } }
  });
  console.log('\n=== SALES_STAFF ===');
  staff.forEach(s => console.log(s.username, '| userId:', s.id, '| empId:', s.employeeId, '| name:', s.employee?.name));

  // 4. 部门负责人
  const depts = await prisma.department.findMany({
    where: { managerId: { not: null } },
    select: { name: true, managerId: true }
  });
  console.log('\n=== 部门负责人 ===');
  depts.forEach(d => console.log(d.name, '| managerId:', d.managerId));

  await prisma.$disconnect();
})();
