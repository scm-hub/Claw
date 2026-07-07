import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    // 查所有 SHIPPING_ORDER 类型的出库记录
    const movements = await prisma.stockMovement.findMany({
      where: { refType: 'SHIPPING_ORDER', direction: 'OUT' },
      include: { material: true },
      orderBy: { movementDate: 'asc' }
    });
    
    console.log(`=== SHIPPING_ORDER 出库记录（共${movements.length}条）===\n`);
    
    for (const m of movements) {
      const mat = m.material;
      const factor = Number(mat?.salesConversionFactor || 1);
      const isLikelySalesUnit = factor !== 1 && Number(m.qty) > 0;
      
      // 检查 remark 中是否已有"折算"字样（已修正过的）
      const isFixed = m.remark?.includes('折算') || m.remark?.includes('已修正');
      
      console.log(`${m.movementNo}:`);
      console.log(`  物料: ${mat?.name} | qty=${Number(m.qty)} | salesFactor=${factor}`);
      console.log(`  remark: ${m.remark?.substring(0, 80) || '-'}`);
      console.log(`  已修正: ${isFixed ? '是' : '否'}`);
      
      if (isLikelySalesUnit && !isFixed) {
        const correctQty = Number(m.qty) * factor;
        console.log(`  ⚠️ 可能未折算！应为 ${correctQty}（${Number(m.qty)}×${factor}）`);
        
        // 查对应库存
        const inv = await prisma.inventory.findFirst({
          where: { materialId: m.materialId }
        });
        if (inv) {
          const diff = Number(m.qty) - correctQty; // 多扣的量
          const correctInvQty = Number(inv.qty) + diff;
          console.log(`  当前库存: ${Number(inv.qty)} | 修正后应为: ${correctInvQty}`);
          
          // 执行修正
          await prisma.stockMovement.update({
            where: { id: m.id },
            data: {
              qty: correctQty,
              remark: (m.remark || '') + `（已修正：${Number(m.qty)}${mat?.salesUnit || ''}×${factor}=${correctQty}${mat?.unit || ''}）`,
            }
          });
          await prisma.inventory.update({
            where: { id: inv.id },
            data: { qty: correctInvQty }
          });
          console.log(`  ✅ 已修正: StockMovement qty=${correctQty}, Inventory qty=${correctInvQty}`);
        }
      }
      console.log('');
    }
  } finally {
    await prisma.$disconnect();
  }
})();
