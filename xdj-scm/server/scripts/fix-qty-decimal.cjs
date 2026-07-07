const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // 修正出库记录的 qty（恢复小数部分）
  console.log('=== 修正 StockMovement qty ===');
  
  // OUT20260704Z3YEQ1: 杏鲍菇鲜品, 150盒 × 0.25 = 37.5
  const r1 = await prisma.stockMovement.findFirst({ where: { movementNo: 'OUT20260704Z3YEQ1' } });
  if (r1) {
    console.log(`OUT20260704Z3YEQ1: ${r1.qty} -> 37.5`);
    await prisma.stockMovement.update({ where: { id: r1.id }, data: { qty: 37.5 } });
  }

  // OUT20260704HXOQBX: 本来菇事金针菇, 510盒 × 0.25 = 127.5
  const r2 = await prisma.stockMovement.findFirst({ where: { movementNo: 'OUT20260704HXOQBX' } });
  if (r2) {
    console.log(`OUT20260704HXOQBX: ${r2.qty} -> 127.5`);
    await prisma.stockMovement.update({ where: { id: r2.id }, data: { qty: 127.5 } });
  }

  // 修正 Inventory 表（从 StockMovement 重算）
  console.log('\n=== 修正 Inventory ===');
  const movements = await prisma.stockMovement.findMany({
    select: { materialId: true, warehouseId: true, direction: true, qty: true, movementType: true }
  });
  const calcMap = {};
  for (const m of movements) {
    const key = `${m.materialId}|${m.warehouseId}`;
    if (!calcMap[key]) calcMap[key] = { inQty: 0, outQty: 0 };
    const qty = Number(m.qty) || 0;
    if (m.direction === 'IN') calcMap[key].inQty += qty;
    else if (m.direction === 'OUT' && m.movementType !== 'STOCK_TAKE_ADJUST') calcMap[key].outQty += qty;
  }

  for (const key in calcMap) {
    const { inQty, outQty } = calcMap[key];
    const [materialId, warehouseId] = key.split('|');
    const correctQty = Math.max(0, inQty - outQty);
    const inv = await prisma.inventory.findFirst({ where: { materialId, warehouseId } });
    if (inv) {
      const current = Number(inv.qty);
      if (Math.abs(current - correctQty) > 0.001) {
        console.log(`Inventory ${key}: ${current} -> ${correctQty}`);
        await prisma.inventory.update({ where: { id: inv.id }, data: { qty: correctQty } });
      }
    }
  }

  // 验证
  console.log('\n=== 验证 ===');
  const allMoves = await prisma.stockMovement.findMany({
    select: { movementNo: true, qty: true, refType: true, material: { select: { name: true } } },
    orderBy: { movementDate: 'desc' }
  });
  for (const m of allMoves) {
    console.log(`${m.movementNo} (${m.material?.name}, ${m.refType}): qty=${m.qty}`);
  }

  await prisma.$disconnect();
  console.log('\nDone.');
})();
