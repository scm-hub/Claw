const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // 1. 获取所有 StockMovement，按 materialId+warehouseId 汇总
  const movements = await prisma.stockMovement.findMany({
    select: { materialId: true, warehouseId: true, direction: true, qty: true, movementType: true }
  });

  const calcMap = {};
  for (const m of movements) {
    const key = `${m.materialId}|${m.warehouseId}`;
    if (!calcMap[key]) calcMap[key] = { materialId: m.materialId, warehouseId: m.warehouseId, inQty: 0, outQty: 0 };
    const qty = Number(m.qty) || 0;
    if (m.direction === 'IN') {
      calcMap[key].inQty += qty;
    } else if (m.direction === 'OUT' && m.movementType !== 'STOCK_TAKE_ADJUST') {
      calcMap[key].outQty += qty;
    }
  }
  for (const key in calcMap) {
    calcMap[key].correctQty = Math.max(0, calcMap[key].inQty - calcMap[key].outQty);
  }

  // 2. 获取当前 Inventory 数据
  const inventories = await prisma.inventory.findMany({
    include: { material: { select: { name: true } }, warehouse: { select: { name: true } } }
  });

  // 3. 修正
  console.log('=== 修正 Inventory 表 ===\n');
  let fixedCount = 0;
  for (const inv of inventories) {
    const key = `${inv.materialId}|${inv.warehouseId}`;
    const calc = calcMap[key];
    const currentQty = Number(inv.qty);
    const correctQty = calc ? calc.correctQty : 0;
    const diff = currentQty - correctQty;

    if (Math.abs(diff) > 0.01) {
      console.log(`[FIX] ${inv.material?.name} (${inv.warehouse?.name}): ${currentQty} -> ${correctQty} (diff: ${diff.toFixed(2)})`);
      await prisma.inventory.update({
        where: { id: inv.id },
        data: { qty: correctQty }
      });
      fixedCount++;
    }
  }
  console.log(`\n修正了 ${fixedCount} 条记录`);

  await prisma.$disconnect();
})();
