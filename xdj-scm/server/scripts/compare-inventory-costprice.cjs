const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // 1. 获取所有物料的库存台账数据
  const inventories = await prisma.inventory.findMany({
    include: {
      material: {
        select: { id: true, name: true, unit: true, salesUnit: true, salesConversionFactor: true, purchaseUnit: true, purchaseConversionFactor: true }
      },
      warehouse: { select: { name: true } }
    },
    orderBy: { material: { name: 'asc' } }
  });

  // 2. 获取所有最新成本价记录（CostPriceRecord 没有 material 关联，只有 materialId/materialName）
  const allRecords = await prisma.costPriceRecord.findMany({
    orderBy: { calculatedAt: 'desc' }
  });

  // 只保留每个 materialId+gradeId 的最新一条
  const seen = new Set();
  const latestCostPrices = [];
  for (const r of allRecords) {
    const key = `${r.materialId}|${r.gradeId || 'null'}`;
    if (!seen.has(key)) {
      seen.add(key);
      latestCostPrices.push(r);
    }
  }

  // 3. 对比展示
  console.log('=== 库存台账 vs 成本价结存对比 ===\n');
  console.log('物料(等级) | 库存台账qty | 成本价结存qty | 差异 | 物料单位\n');

  let mismatchCount = 0;
  for (const cpr of latestCostPrices) {
    const invList = inventories.filter(i => i.materialId === cpr.materialId);
    const invQty = invList.reduce((sum, i) => sum + Number(i.qty), 0);
    const endingQty = Number(cpr.endingQty) || 0;
    const diff = invQty - endingQty;

    if (Math.abs(diff) > 0.01) {
      mismatchCount++;
      const gradeLabel = cpr.gradeName || '无等级';
      const warehouses = invList.map(i => `${i.warehouse?.name || '?'}:${Number(i.qty)}`).join(', ') || '无库存记录';
      console.log(`[X] ${cpr.materialName} (${gradeLabel})`);
      console.log(`    台账: ${invQty} | 成本价结存: ${endingQty} | 差异: ${diff.toFixed(2)} | 单位: ${invList[0]?.material?.unit || '?'}`);
      console.log(`    仓库分布: ${warehouses}`);
      console.log(`    期初: ${Number(cpr.beginningQty)} | 入库: ${Number(cpr.inboundQty)} | 出库: ${Number(cpr.outboundQty)} | 损耗: ${Number(cpr.lossQty)} | 结存: ${Number(cpr.endingQty)}`);
      console.log('');
    }
  }

  if (mismatchCount === 0) {
    console.log('所有物料库存与成本价结存一致！');
  } else {
    console.log(`\n共 ${mismatchCount} 个物料存在差异（共 ${latestCostPrices.length} 条记录）`);
  }

  // 4. 一致的也展示
  console.log('\n=== 一致的物料 ===\n');
  let matchCount = 0;
  for (const cpr of latestCostPrices) {
    const invList = inventories.filter(i => i.materialId === cpr.materialId);
    const invQty = invList.reduce((sum, i) => sum + Number(i.qty), 0);
    const endingQty = Number(cpr.endingQty) || 0;
    const diff = invQty - endingQty;

    if (Math.abs(diff) <= 0.01) {
      matchCount++;
      console.log(`[OK] ${cpr.materialName} (${cpr.gradeName || '无等级'}) | 台账: ${invQty} | 成本价: ${endingQty}`);
    }
  }
  console.log(`\n一致: ${matchCount}, 有差异: ${mismatchCount}`);

  await prisma.$disconnect();
})();
