import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const materialId = 'cmr2xthna001hnddoq2ir1lmi';

    const lossRecord = await prisma.productLossRecord.findFirst({
      where: { materialId },
      orderBy: { calculatedAt: 'desc' }
    });
    console.log('=== ProductLossRecord ===');
    console.log(JSON.stringify(lossRecord, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

    const fees = await prisma.feeRecord.findMany({
      where: { materialId, feeType: { in: ['PACKAGING', 'BOX_COST', 'FREIGHT'] }, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    console.log('\n=== FeeRecord ===');
    console.log(JSON.stringify(fees, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

    const agg = await prisma.feeRecord.aggregate({
      where: { materialId, feeType: { in: ['PACKAGING', 'BOX_COST', 'FREIGHT'] }, isActive: true },
      _sum: { amount: true }
    });
    console.log('\n费用合计:', Number(agg._sum.amount) || 0);
  } finally {
    await prisma.$disconnect();
  }
})();
