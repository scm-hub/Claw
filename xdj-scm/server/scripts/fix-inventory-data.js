import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const materialId = 'cmr3kfsrx000vnd6o1umreto3';
    
    // 1. 修正 StockMovement: OUT20260704HXOQBX 的 qty 从 510 改为 127.5
    const movement = await prisma.stockMovement.findFirst({
      where: { movementNo: 'OUT20260704HXOQBX' }
    });
    if (movement) {
      console.log('修正前 StockMovement:', { no: movement.movementNo, qty: Number(movement.qty) });
      await prisma.stockMovement.update({
        where: { id: movement.id },
        data: {
          qty: 127.5,
          remark: (movement.remark || '') + '（已修正：510盒×0.25=127.5斤）',
        }
      });
      console.log('修正后 StockMovement: qty = 127.5');
    }

    // 2. 修正 Inventory: qty 从 0 改为 22.5
    const inv = await prisma.inventory.findFirst({
      where: { materialId }
    });
    if (inv) {
      console.log('修正前 Inventory:', { id: inv.id, qty: Number(inv.qty), lockedQty: Number(inv.lockedQty) });
      await prisma.inventory.update({
        where: { id: inv.id },
        data: { qty: 22.5 }
      });
      console.log('修正后 Inventory: qty = 22.5');
    }

    // 3. 检查批次数据是否也需要修正
    const movement2 = await prisma.stockMovement.findFirst({
      where: { movementNo: 'OUT20260704HXOQBX' },
      select: { batchId: true }
    });
    if (movement2?.batchId) {
      const batch = await prisma.batch.findUnique({
        where: { id: movement2.batchId }
      });
      if (batch) {
        console.log('当前批次 remainingQty:', Number(batch.remainingQty));
        // 批次之前被多扣了 510-127.5=382.5，需要补回
        const correctRemaining = Number(batch.remainingQty) + (510 - 127.5);
        await prisma.batch.update({
          where: { id: batch.id },
          data: { remainingQty: correctRemaining }
        });
        console.log('修正后批次 remainingQty:', correctRemaining);
      }
    } else {
      console.log('该出库记录无关联批次，无需修正批次');
    }

    // 4. 验证结果
    const finalInv = await prisma.inventory.findFirst({
      where: { materialId },
      include: { warehouse: true }
    });
    console.log('\n=== 最终验证 ===');
    console.log('库存:', finalInv ? `${Number(finalInv.qty)} ${finalInv.warehouse?.name}` : '无');

    const movements = await prisma.stockMovement.findMany({
      where: { materialId },
      orderBy: { movementDate: 'asc' }
    });
    console.log('出入库记录:');
    movements.forEach(m => {
      console.log(`  ${m.movementNo} ${m.direction} qty=${Number(m.qty)}`);
    });

    const inQty = movements.filter(m => m.direction === 'IN').reduce((s, m) => s + Number(m.qty), 0);
    const outQty = movements.filter(m => m.direction === 'OUT').reduce((s, m) => s + Number(m.qty), 0);
    console.log(`\n入库合计: ${inQty} 斤`);
    console.log(`出库合计: ${outQty} 斤`);
    console.log(`理论库存: ${inQty - outQty} 斤`);
  } finally {
    await prisma.$disconnect();
  }
})();
