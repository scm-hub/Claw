import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化系统注册表...');

  // 预置 HRMS 系统
  await prisma.systemRegistry.upsert({
    where: { code: 'hrms' },
    update: {},
    create: {
      code: 'hrms',
      name: '人力资源管理',
      description: '员工管理、考勤、薪酬、招聘、培训等人力资源全流程管理',
      url: 'http://localhost:5173',
      apiUrl: 'http://localhost:4002',
      icon: 'badge',
      color: '#2E7D32',
      sortOrder: 1,
    },
  });

  // 预置 SCM 系统
  await prisma.systemRegistry.upsert({
    where: { code: 'scm' },
    update: {},
    create: {
      code: 'scm',
      name: '供应链管理',
      description: '采购、销售、库存、物流、财务、溯源等供应链全链路管理',
      url: 'http://localhost:5175',
      apiUrl: 'http://localhost:4003',
      icon: 'inventory_2',
      color: '#1565C0',
      sortOrder: 2,
    },
  });

  // 预置 MDM 系统
  await prisma.systemRegistry.upsert({
    where: { code: 'MDM' },
    update: {},
    create: {
      code: 'MDM',
      name: '主数据管理系统',
      description: '统一管理部门/员工主数据，实现 HRMS → MDM → SCM 数据同步',
      url: 'http://localhost:5177',
      apiUrl: 'http://localhost:4005',
      icon: 'hub',
      color: '#E65100',
      sortOrder: 3,
    },
  });

  // 预置 AI 服务
  await prisma.systemRegistry.upsert({
    where: { code: 'ai-service' },
    update: {},
    create: {
      code: 'ai-service',
      name: 'AI 智能服务',
      description: '智能问答、订单助手、数据分析、预测引擎 — 跨系统AI服务层',
      url: 'http://192.168.21.34:5118',
      apiUrl: 'http://localhost:4005',
      icon: 'smart_toy',
      color: '#7B1FA2',
      sortOrder: 4,
    },
  });

  console.log('系统注册表初始化完成:');
  const systems = await prisma.systemRegistry.findMany({ orderBy: { sortOrder: 'asc' } });
  for (const s of systems) {
    console.log(`  [${s.code}] ${s.name} -> ${s.url}`);
  }
}

main()
  .catch((e) => {
    console.error('Seed 失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
