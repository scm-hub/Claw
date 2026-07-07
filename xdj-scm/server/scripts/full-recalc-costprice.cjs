const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // 直接调用 calculateAllCostPrices with fullRecalc=true
  // 由于是 ES module，需要动态 import
  const mod = await import('../src/modules/cost-price.scheduler.js');
  const result = await mod.calculateAllCostPrices({ onlyNew: false, fullRecalc: true });
  console.log('\n=== 全量重算结果 ===');
  console.log(JSON.stringify(result, null, 2));

  // 验证：查询最新的成本价记录
  const latestRecords = await prisma.costPriceRecord.findMany({
    orderBy: { calculatedAt: 'desc' },
    take: 20
  });

  const seen = new Set();
  console.log('\n=== 全量重算后的最新成本价记录 ===');
  for (const r of latestRecords) {
    const key = `${r.materialId}|${r.gradeId || 'null'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`${r.materialName} (${r.gradeName || '无等级'}): 期初=${Number(r.beginningQty)}, 入库=${Number(r.inboundQty)}, 出库=${Number(r.outboundQty)}, 损耗=${Number(r.lossQty)}, 结存=${Number(r.endingQty)}, 成本价=${Number(r.costPrice)}`);
  }

  await prisma.$disconnect();
})();
