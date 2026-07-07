const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // 1. 获取所有物料的出入库汇总（从 StockMovement 重算）
  const movements = await prisma.stockMovement.findMany({
    select: {
      materialId: true,
      warehouseId: true,
      direction: true,
      qty: true,
      movementType: true
    }
  });

  // 按 materialId+warehouseId 汇总
  const calcMap = {};
  for (const m of movements) {
    const key = `${m.materialId}|${m.warehouseId}`;
    if (!calcMap[key]) calcMap[key] = { materialId: m.materialId, warehouseId: m.warehouseId, inQty: 0, outQty: 0, movements: [] };
    const qty = Number(m.qty) || 0;
    if (m.direction === 'IN') {
      calcMap[key].inQty += qty;
    } else if (m.direction === 'OUT') {
      // 排除盘点调整（盘点调整不算正常出库，盘点损耗在成本价里单独算）
      if (m.movementType !== 'STOCK_TAKE_ADJUST') {
        calcMap[key].outQty += qty;
      }
    }
  }
  // 计算正确 qty = 入库 - 出库（不小于0）
  for (const key in calcMap) {
    calcMap[key].correctQty = Math.max(0, calcMap[key].inQty - calcMap[key].outQty);
  }

  // 2. 获取当前 Inventory 表数据
  const inventories = await prisma.inventory.findMany({
    include: {
      material: { select: { name: true, unit: true } },
      warehouse: { select: { name: true } }
    }
  });

  // 3. 对比
  console.log('=== Inventory 表 vs StockMovement 重算对比 ===\n');
  console.log('物料 | 仓库 | Inventory.qty | 重算qty | 差异 | 入库合计 | 出库合计\n');

  let mismatchCount = 0;
  const fixList = [];
  for (const inv of inventories) {
    const key = `${inv.materialId}|${inv.warehouseId}`;
    const calc = calcMap[key];
    const currentQty = Number(inv.qty);
    const correctQty = calc ? calc.correctQty : 0;
    const diff = currentQty - correctQty;

    if (Math.abs(diff) > 0.01) {
      mismatchCount++;
      console.log(`[X] ${inv.material?.name} | ${inv.warehouse?.name} | ${currentQty} | ${correctQty} | ${diff.toFixed(2)} | 入库:${calc?.inQty || 0} | 出库:${calc?.outQty || 0}`);
      fixList.push({ id: inv.id, materialName: inv.material?.name, warehouseName: inv.warehouse?.name, currentQty, correctQty });
    } else {
      console.log(`[OK] ${inv.material?.name} | ${inv.warehouse?.name} | ${currentQty} | ${correctQty}`);
    }
  }

  console.log(`\n不一致: ${mismatchCount}, 总计: ${inventories.length}`);

  // 4. 也检查 StockMovement 中有但 Inventory 表中没有的
  const invKeys = new Set(inventories.map(i => `${i.materialId}|${i.warehouseId}`));
  let missingCount = 0;
  for (const key in calcMap) {
    if (!invKeys.has(key)) {
      missingCount++;
      const calc = calcMap[key];
      const mat = await prisma.material.findUnique({ where: { id: calc.materialId }, select: { name: true } });
      const wh = await prisma.warehouse.findUnique({ where: { id: calc.warehouseId }, select: { name: true } });
      console.log(`[MISSING] ${mat?.name} | ${wh?.name} | 无Inventory记录 | 应有:${calc.correctQty} | 入库:${calc.inQty} | 出库:${calc.outQty}`);
    }
  }
  if (missingCount > 0) console.log(`\n缺失记录: ${missingCount}`);

  // 5. 如果有需要修正的，输出修正SQL
  if (fixList.length > 0) {
    console.log('\n=== 需要修正的记录 ===\n');
    for (const f of fixList) {
      console.log(`${f.materialName} (${f.warehouseName}): ${f.currentQty} -> ${f.correctQty}`);
    }
  }

  await prisma.$disconnect();
})();
