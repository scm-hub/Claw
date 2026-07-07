import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    // 先根据物料名称找到 materialId
    const mat = await prisma.material.findFirst({ where: { name: '香菇鲜品' } });
    if (!mat) { console.log('未找到物料 香菇鲜品'); process.exit(0); }
    console.log('物料:', mat.name, 'ID:', mat.id, '基准单位:', mat.unit, '销售单位:', mat.salesUnit, '销售换算:', Number(mat.salesConversionFactor || 1));

    const records = await prisma.costPriceRecord.findMany({
      where: { materialId: mat.id, gradeName: '花菇' },
      orderBy: { calculatedAt: 'desc' },
      take: 1
    });
    if (!records.length) { console.log('未找到花菇等级成本价记录'); process.exit(0); }
    const r = records[0];
    console.log('\n=== CostPriceRecord ===');
    console.log(JSON.stringify(r, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

    const inbound = await prisma.stockMovement.findMany({
      where: { materialId: mat.id, gradeId: r.gradeId, direction: 'IN', movementDate: { lte: r.calculatedAt } },
      include: { material: true },
      orderBy: { movementDate: 'asc' }
    });
    console.log('\n=== 入库明细 ===');
    console.log(JSON.stringify(inbound.map(m => ({ no: m.movementNo, qty: Number(m.qty), refType: m.refType, refId: m.refId, date: m.movementDate, gradeId: m.gradeId })), null, 2));

    const outbound = await prisma.stockMovement.findMany({
      where: { materialId: mat.id, gradeId: r.gradeId, direction: 'OUT', movementType: { not: 'STOCK_TAKE_ADJUST' }, movementDate: { lte: r.calculatedAt } },
      include: { material: true },
      orderBy: { movementDate: 'asc' }
    });
    console.log('\n=== 出库明细 ===');
    console.log(JSON.stringify(outbound.map(m => ({ no: m.movementNo, qty: Number(m.qty), refType: m.refType, date: m.movementDate, gradeId: m.gradeId, materialSalesUnit: m.material?.salesUnit, salesConversionFactor: Number(m.material?.salesConversionFactor || 1) })), null, 2));

    const loss = await prisma.stockTakeItem.findMany({
      where: { materialId: mat.id },
      include: { stockTake: true },
      orderBy: { stockTake: { takeDate: 'asc' } }
    });
    console.log('\n=== 盘点损耗明细 ===');
    console.log(JSON.stringify(loss.map(i => ({ no: i.stockTake.takeNo, diffQty: Number(i.diffQty), date: i.stockTake.takeDate })), null, 2));
  } finally {
    await prisma.$disconnect();
  }
})();
