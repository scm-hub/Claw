import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    // 1. 找到菇事金针菇物料
    const mat = await prisma.material.findFirst({ where: { name: { contains: '菇事金针菇' } } });
    if (!mat) { console.log('未找到物料'); process.exit(0); }
    console.log('=== 物料信息 ===');
    console.log(JSON.stringify({
      id: mat.id, name: mat.name, code: mat.code,
      unit: mat.unit, purchaseUnit: mat.purchaseUnit, purchaseConversionFactor: Number(mat.purchaseConversionFactor || 1),
      salesUnit: mat.salesUnit, salesConversionFactor: Number(mat.salesConversionFactor || 1),
    }, null, 2));

    // 2. 查库存
    const inventories = await prisma.inventory.findMany({
      where: { materialId: mat.id },
      include: { warehouse: true }
    });
    console.log('\n=== 库存台账 ===');
    console.log(JSON.stringify(inventories.map(inv => ({
      warehouse: inv.warehouse?.name,
      qty: Number(inv.qty),
      lockedQty: Number(inv.lockedQty || 0),
      availableQty: Number(inv.availableQty || 0),
    })), null, 2));

    // 3. 查所有出入库记录
    const movements = await prisma.stockMovement.findMany({
      where: { materialId: mat.id },
      orderBy: { movementDate: 'asc' }
    });
    console.log('\n=== 出入库记录 ===');
    console.log(JSON.stringify(movements.map(m => ({
      no: m.movementNo,
      direction: m.direction,
      movementType: m.movementType,
      qty: Number(m.qty),
      refType: m.refType,
      movementDate: m.movementDate,
      gradeId: m.gradeId,
    })), null, 2));

    // 4. 汇总
    const inQty = movements.filter(m => m.direction === 'IN').reduce((s, m) => s + Number(m.qty), 0);
    const outQty = movements.filter(m => m.direction === 'OUT').reduce((s, m) => s + Number(m.qty), 0);
    console.log('\n=== 汇总 ===');
    console.log('入库合计(斤):', inQty);
    console.log('出库合计(原始单位):', outQty);
    console.log('出库合计需检查是否为销售单位(盒):');

    // 检查出库记录的refType
    const outMovements = movements.filter(m => m.direction === 'OUT');
    outMovements.forEach(m => {
      const isShipping = m.refType === 'SHIPPING_ORDER' || m.refType === 'SALES_OUTBOUND';
      console.log(`  ${m.movementNo}: qty=${Number(m.qty)}, refType=${m.refType}, ${isShipping ? '销售单位(盒)→需×'+Number(mat.salesConversionFactor)+'折算为斤' : '基准单位(斤)'}`);
    });

    // 计算正确的出库斤数
    let outQtyInBase = 0;
    outMovements.forEach(m => {
      const isShipping = m.refType === 'SHIPPING_ORDER' || m.refType === 'SALES_OUTBOUND';
      if (isShipping) {
        outQtyInBase += Number(m.qty) * Number(mat.salesConversionFactor || 1);
      } else {
        outQtyInBase += Number(m.qty);
      }
    });
    console.log('\n出库折算为斤:', outQtyInBase);
    console.log('理论剩余(斤):', inQty - outQtyInBase);
  } finally {
    await prisma.$disconnect();
  }
})();
