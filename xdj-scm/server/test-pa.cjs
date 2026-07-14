const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const list = await prisma.purchaserAssignment.findMany({
    include: {
      user: { select: { id: true, username: true, role: true, employee: { select: { name: true, empNo: true, department: { select: { name: true } } } } } },
      materials: { include: { material: { select: { id: true, code: true, name: true, spec: true, unit: true, category: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log('Prisma 返回记录数：' + list.length);
  if (list.length > 0) {
    console.log(JSON.stringify(list[0], null, 2));
  }
  await prisma.disconnect();
})();
