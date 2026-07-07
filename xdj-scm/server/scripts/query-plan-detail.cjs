const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const plan = await prisma.purchasePlan.findFirst({
    where: { planNo: 'PP202607055MCHIF' },
    include: { items: { include: { material: true } } }
  });
  if (!plan) { console.log('未找到该计划'); await prisma.$disconnect(); return; }

  console.log('=== 采购计划 ===');
  console.log('单号:', plan.planNo);
  console.log('标题:', plan.title);
  console.log('状态:', plan.status);
  console.log('planType:', plan.planType);
  console.log('是否智能建议:', plan.remark || '无');
  console.log('');

  // 是否是子计划
  if (plan.parentPlanId) {
    const parent = await prisma.purchasePlan.findUnique({ where: { id: plan.parentPlanId } });
    console.log('父计划单号:', parent?.planNo);
  }
  const childPlans = await prisma.purchasePlan.findMany({ where: { parentPlanId: plan.id } });
  if (childPlans.length > 0) {
    console.log('子计划:', childPlans.map(c => c.planNo).join(', '));
  }

  console.log('\n=== 明细列表 ===');
  for (const item of plan.items) {
    console.log('物料:', item.material?.name,
      '| planQty:', item.planQty,
      '| unit:', item.unit,
      '| suggestionNo:', item.suggestionNo || '-',
      '| remark:', item.remark || '-');
  }

  // 如果有子计划，也查子计划的明细
  for (const child of childPlans) {
    console.log('\n--- 子计划', child.planNo, '---');
    console.log('采购员:', child.assigneeId);
    const childItems = await prisma.purchasePlanItem.findMany({
      where: { planId: child.id },
      include: { material: true }
    });
    for (const item of childItems) {
      console.log('物料:', item.material?.name,
        '| planQty:', item.planQty,
        '| unit:', item.unit,
        '| actualQty:', item.actualQty,
        '| unitPrice:', Number(item.unitPrice));
    }
  }

  await prisma.$disconnect();
})();
