import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 创建 SCM 同步配置
  await prisma.syncConfig.upsert({
    where: { systemCode: 'SCM' },
    update: {},
    create: {
      systemCode: 'SCM',
      systemName: '供应链管理系统',
      apiUrl: 'http://localhost:4003',
      autoSync: false,
      syncInterval: 3600,
    },
  });

  console.log('Seed completed: SCM sync config created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
