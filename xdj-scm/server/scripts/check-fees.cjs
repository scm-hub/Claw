const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const fees = await prisma.feeRecord.findMany({ where: { isActive: true }, select: { feeName: true, amount: true, materialId: true } });
  console.log('Active fees:', JSON.stringify(fees, null, 2));
  const total = fees.reduce((s, f) => s + Number(f.amount), 0);
  console.log('Total:', total);

  const r = await prisma.costPriceRecord.findFirst({
    where: { materialName: '香菇鲜品', gradeName: '花菇' },
    orderBy: { calculatedAt: 'desc' }
  });
  console.log('\nLatest cost price record:');
  console.log('  beginningQty:', Number(r.beginningQty));
  console.log('  inboundQty:', Number(r.inboundQty));
  console.log('  outboundQty:', Number(r.outboundQty));
  console.log('  endingQty:', Number(r.endingQty));
  console.log('  weightedAvgPrice:', Number(r.weightedAvgPrice));
  console.log('  feesTotal:', Number(r.feesTotal));
  console.log('  feesDetail:', JSON.stringify(r.feesDetail));
  console.log('  costPrice:', Number(r.costPrice));

  await prisma.$disconnect();
})();
