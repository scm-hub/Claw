const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const materials = await prisma.material.findMany({
    select: { id: true, name: true, unit: true, initialPurchasePrice: true }
  });

  for (const mat of materials) {
    // 查该物料所有 StockMovement，按 gradeId 分组
    const movements = await prisma.stockMovement.findMany({
      where: { materialId: mat.id },
      select: { direction: true, qty: true, gradeId: true, movementType: true, movementNo: true }
    });

    if (movements.length === 0) continue;

    // 按 gradeId 分组
    const gradeMap = {};
    for (const m of movements) {
      const gKey = m.gradeId || 'null';
      if (!gradeMap[gKey]) gradeMap[gKey] = { gradeId: m.gradeId, inQty: 0, outQty: 0, count: 0 };
      gradeMap[gKey].count++;
      const qty = Number(m.qty) || 0;
      if (m.direction === 'IN') {
        gradeMap[gKey].inQty += qty;
      } else if (m.direction === 'OUT' && m.movementType !== 'STOCK_TAKE_ADJUST') {
        gradeMap[gKey].outQty += qty;
      }
    }

    console.log(`\n=== ${mat.name} (${mat.unit}) ===`);
    let totalIn = 0, totalOut = 0;
    for (const gKey in gradeMap) {
      const g = gradeMap[gKey];
      const balance = g.inQty - g.outQty;
      totalIn += g.inQty;
      totalOut += g.outQty;
      console.log(`  gradeId=${g.gradeId || 'null'}: 入库=${g.inQty}, 出库=${g.outQty}, 余额=${balance}, 记录数=${g.count}`);
    }
    console.log(`  合计: 入库=${totalIn}, 出库=${totalOut}, 余额=${totalIn - totalOut}`);

    // 查最新的成本价记录
    const latestRecords = await prisma.costPriceRecord.findMany({
      where: { materialId: mat.id },
      orderBy: { calculatedAt: 'desc' }
    });
    const seen = new Set();
    for (const r of latestRecords) {
      const key = r.gradeId || 'null';
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`  成本价[${r.gradeName || '无等级'}]: 期初=${Number(r.beginningQty)}, 入库=${Number(r.inboundQty)}, 出库=${Number(r.outboundQty)}, 损耗=${Number(r.lossQty)}, 结存=${Number(r.endingQty)}`);
    }
  }

  await prisma.$disconnect();
})();
