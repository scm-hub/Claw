import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { baseQtyToPurchase } from '../shared/unitConversion.js';

const prisma = new PrismaClient();

/**
 * 生成单据编号
 */
function genNo(prefix) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${ymd}${rand}`;
}

/**
 * 智能建议算法 — 与 /plans/suggest 接口逻辑一致
 * 返回建议列表（含 suggestionNo）
 */
async function generateSuggestions(analysisDays = 3) {
  const materials = await prisma.material.findMany({
    where: { status: 'ACTIVE' },
    include: { inventory: { include: { warehouse: { select: { id: true, name: true } } } } },
  });

  const sinceDate = new Date(Date.now() - analysisDays * 86400000);
  const salesMovements = await prisma.stockMovement.findMany({
    where: { movementType: 'SALES_OUTBOUND', direction: 'OUT', createdAt: { gte: sinceDate } },
    select: { materialId: true, qty: true },
  });
  const salesByMaterial = {};
  for (const m of salesMovements) { salesByMaterial[m.materialId] = (salesByMaterial[m.materialId] || 0) + m.qty; }

  const purchaseReceipts = await prisma.stockMovement.findMany({
    where: { movementType: 'PURCHASE_RECEIPT', direction: 'IN', createdAt: { gte: sinceDate } },
    select: { materialId: true, qty: true },
  });
  const receivedByMaterial = {};
  for (const r of purchaseReceipts) { receivedByMaterial[r.materialId] = (receivedByMaterial[r.materialId] || 0) + r.qty; }

  const recentReceiptItems = await prisma.purchaseReceiptItem.findMany({
    include: {
      receipt: { include: { purchaseOrder: { include: { supplier: { select: { id: true, code: true, name: true } } } } } },
    },
    orderBy: [{ receipt: { receiptDate: 'desc' } }, { receipt: { createdAt: 'desc' } }],
  });
  const supplierByMaterial = {};
  const priceByMaterial = {};
  for (const ri of recentReceiptItems) {
    if (!supplierByMaterial[ri.materialId]) {
      supplierByMaterial[ri.materialId] = ri.receipt?.purchaseOrder?.supplier;
      priceByMaterial[ri.materialId] = ri.unitPrice;
    }
  }

  // 排除已有未完成智能建议采购计划的物料
  const usedMaterialIds = new Set();
  const usedPlanItems = await prisma.purchasePlanItem.findMany({
    where: { suggestionNo: { not: null }, plan: { status: { in: ['DRAFT', 'PENDING', 'APPROVED', 'IN_PROGRESS'] } } },
    select: { materialId: true },
  });
  for (const pi of usedPlanItems) { usedMaterialIds.add(pi.materialId); }

  const suggestions = [];
  for (const mat of materials) {
    if (usedMaterialIds.has(mat.id)) continue;

    const totalStock = mat.inventory.reduce((s, inv) => s + inv.qty, 0);
    const lockedStock = mat.inventory.reduce((s, inv) => s + (inv.lockedQty || 0), 0);
    const availableStock = totalStock - lockedStock;
    const salesQty = salesByMaterial[mat.id] || 0;
    const dailyAvgSales = salesQty / analysisDays;
    const purchaseLeadTime = mat.purchaseLeadTime || 0;
    const effectiveDailyAvg = dailyAvgSales > 0 ? dailyAvgSales : 1;
    const safetyStock = Math.ceil(effectiveDailyAvg * purchaseLeadTime);
    const suggestedQty = Math.max(0, safetyStock - totalStock);

    if (suggestedQty > 0) {
      const purchaseSuggestedQty = Math.ceil(Number(baseQtyToPurchase(suggestedQty, mat)));
      const supplier = supplierByMaterial[mat.id];
      suggestions.push({
        materialId: mat.id,
        materialCode: mat.code,
        materialName: mat.name,
        unit: mat.unit,
        purchaseUnit: mat.purchaseUnit || mat.unit,
        purchaseConversionFactor: Number(mat.purchaseConversionFactor || 1),
        totalStock,
        availableStock,
        lockedStock,
        safetyStock,
        dailyAvgSales: Math.round(dailyAvgSales * 100) / 100,
        salesInPeriod: salesQty,
        purchaseLeadTime,
        suggestedQty,
        purchaseSuggestedQty,
        supplierId: supplier?.id || null,
        supplierName: supplier?.name || null,
        unitPrice: Number(priceByMaterial[mat.id] || mat.latestReceiptPrice || mat.initialPurchasePrice || 0),
        urgency: availableStock < safetyStock ? 'HIGH' : (availableStock < safetyStock * 2 ? 'MEDIUM' : 'LOW'),
      });
    }
  }

  // 排序 + 编号
  const urgencyOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  suggestions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  const batchNo = genNo('PS');
  suggestions.forEach((s, i) => { s.suggestionNo = `${batchNo}${String(i + 1).padStart(3, '0')}`; });

  return suggestions;
}

/**
 * 自动分配采购员 — 与 /plans/:id/allocate 逻辑一致
 * 为父计划按采购员绑定关系拆分创建子计划
 */
async function allocatePlan(parentPlan) {
  // 获取所有采购员分配记录
  const assignments = await prisma.purchaserAssignment.findMany({
    where: { status: 'ACTIVE' },
    include: {
      user: { select: { id: true, username: true, employee: { select: { name: true, departmentId: true } } } },
      materials: { include: { material: { select: { id: true } } } },
    },
  });

  if (assignments.length === 0) {
    console.log('[AutoPlan] 无采购员分配记录，跳过分配');
    return { children: [], unassigned: parentPlan.items.length };
  }

  // 构建 materialId -> [assignment] 映射
  const materialToUsers = {};
  for (const assignment of assignments) {
    for (const pm of assignment.materials) {
      if (!materialToUsers[pm.materialId]) materialToUsers[pm.materialId] = [];
      materialToUsers[pm.materialId].push(assignment);
    }
  }

  // 获取父计划明细
  const parentPlanWithItems = await prisma.purchasePlan.findUnique({
    where: { id: parentPlan.id },
    include: { items: true },
  });

  // 按采购员分组
  const userItemsMap = {};
  const unassignedItems = [];

  for (const item of parentPlanWithItems.items) {
    const matchedAssignments = materialToUsers[item.materialId];
    if (matchedAssignments && matchedAssignments.length > 0) {
      for (const assignment of matchedAssignments) {
        if (!userItemsMap[assignment.userId]) userItemsMap[assignment.userId] = { assignment, items: [] };
        userItemsMap[assignment.userId].items.push(item);
      }
    } else {
      unassignedItems.push(item);
    }
  }

  // 为每个采购员创建子计划
  let seq = 1;
  const createdChildren = [];
  const assignedItemIds = [];

  for (const [userId, { assignment, items }] of Object.entries(userItemsMap)) {
    const childPlanNo = `${parentPlan.planNo}-${String(seq).padStart(2, '0')}`;
    seq++;

    try {
      const childPlan = await prisma.purchasePlan.create({
        data: {
          planNo: childPlanNo,
          title: `${parentPlan.title}（${assignment.user.employee?.name || assignment.user.username}）`,
          planType: parentPlan.planType,
          priceDate: new Date(), // 子计划单据日期取当前系统日期，不继承父计划
          periodStart: parentPlan.periodStart,
          periodEnd: parentPlan.periodEnd,
          departmentId: assignment.user.employee?.departmentId || parentPlan.departmentId,
          status: 'APPROVED',
          creatorId: parentPlan.creatorId,
          parentPlanId: parentPlan.id,
          assigneeId: userId,
          approvedAt: new Date(),
          publishedAt: new Date(),
          remark: `定时自动生成并分配`,
          items: {
            create: items.map((it) => ({
              materialId: it.materialId,
              gradeId: it.gradeId || null,
              planQty: Number(it.planQty) || 0,
              unit: it.unit || '',
              expectedDate: it.expectedDate ? new Date(it.expectedDate) : null,
              suggestionNo: it.suggestionNo || null,
              remark: it.remark || '',
            })),
          },
        },
      });

      createdChildren.push(childPlan);
      assignedItemIds.push(...items.map((it) => it.id));
    } catch (createErr) {
      console.error('[AutoPlan] 创建子计划失败', { userId, planNo: childPlanNo, error: createErr.message });
    }
  }

  // 更新父计划发布时间
  if (createdChildren.length > 0) {
    await prisma.purchasePlan.update({
      where: { id: parentPlan.id },
      data: { publishedAt: new Date() },
    });

    // 标记已分配的父明细为 forwarded
    if (assignedItemIds.length > 0) {
      await prisma.purchasePlanItem.updateMany({
        where: { id: { in: assignedItemIds } },
        data: { forwarded: true },
      });
    }
  }

  return { children: createdChildren, unassigned: unassignedItems.length };
}

/**
 * 定时任务主流程：生成智能建议 → 创建父计划（APPROVED）→ 自动分配采购员 → 创建子计划（APPROVED）
 */
export async function autoGeneratePurchasePlan() {
  const now = new Date();
  console.log(`[AutoPlan] 定时任务触发: ${now.toISOString()}`);

  try {
    // 1. 生成智能建议
    const suggestions = await generateSuggestions(3);

    if (suggestions.length === 0) {
      console.log('[AutoPlan] 本次无智能建议，无需生成采购计划');
      return { suggestions: 0, plans: 0, children: 0 };
    }

    console.log(`[AutoPlan] 生成 ${suggestions.length} 条智能建议`);

    // 2. 查找采购经理作为 creatorId（优先 PURCHASE_MANAGER，其 departmentId 为采购部门）
    // PurchasePlan.creatorId 关联 Employee，需通过 User -> Employee 链查找
    // 数据隔离要求：父计划 departmentId 应为采购部门而非 SUPER_ADMIN 部门
    const purchaseManager = await prisma.user.findFirst({
      where: {
        role: 'PURCHASE_MANAGER',
        status: 'ACTIVE',
        employeeId: { not: null },
      },
      include: { employee: { select: { id: true, name: true, departmentId: true } } },
    });

    // 如果没有 PURCHASE_MANAGER，降级使用 SUPER_ADMIN（但其部门可能不是采购部门）
    const fallbackAdmin = purchaseManager ? null : await prisma.user.findFirst({
      where: {
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        employeeId: { not: null },
      },
      include: { employee: { select: { id: true, name: true, departmentId: true } } },
    });

    const adminUser = purchaseManager || fallbackAdmin;
    const creatorId = adminUser?.employee?.id || adminUser?.employeeId || 'system-auto';
    const departmentId = adminUser?.employee?.departmentId || null;
    console.log(`[AutoPlan] 使用创建者: ${adminUser?.employee?.name || adminUser?.username || 'system-auto'} (${creatorId}), 部门: ${departmentId || '未知'}`);

    // 3. 创建父计划（状态直接 APPROVED，跳过草稿）
    const planNo = genNo('PP');
    const today = new Date();
    const title = `自动采购计划 ${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const parentPlan = await prisma.purchasePlan.create({
      data: {
        planNo,
        title,
        planType: 'MONTHLY',
        priceDate: today,
        periodStart: today,
        periodEnd: new Date(today.getTime() + 30 * 86400000),
        creatorId,
        departmentId, // 数据隔离：采购部门ID，确保 PURCHASE_MANAGER 可见
        status: 'APPROVED',
        approvedAt: now,
        remark: '每日定时智能建议自动生成',
        items: {
          create: suggestions.map((s) => ({
            materialId: s.materialId,
            planQty: s.purchaseSuggestedQty || s.suggestedQty,
            unit: s.purchaseUnit || s.unit,
            expectedDate: new Date(today.getTime() + (s.purchaseLeadTime || 0) * 86400000),
            suggestionNo: s.suggestionNo,
            remark: `建议采购量=${s.suggestedQty}, 安全库存=${s.safetyStock}, 当前库存=${s.totalStock}`,
          })),
        },
      },
      include: { items: true },
    });

    console.log(`[AutoPlan] 父计划已创建: ${parentPlan.planNo} (${parentPlan.items.length} 条明细), 状态=APPROVED`);

    // 4. 自动分配采购员
    const allocateResult = await allocatePlan(parentPlan);
    console.log(`[AutoPlan] 分配完成: ${allocateResult.children.length} 个子计划, ${allocateResult.unassigned} 个物料未匹配采购员`);

    // 5. 通过 WebSocket 通知前端（如有连接）
    // 后续可扩展为推送通知

    return {
      suggestions: suggestions.length,
      plans: 1,
      children: allocateResult.children.length,
      unassigned: allocateResult.unassigned,
      parentPlanNo: parentPlan.planNo,
    };
  } catch (err) {
    console.error('[AutoPlan] 定时任务执行失败:', err.message);
    throw err;
  }
}

/**
 * 启动定时任务：每天早上 6:00 自动生成采购计划
 */
export function startPurchasePlanScheduler() {
  const task = cron.schedule('0 6 * * *', async () => {
    console.log('[AutoPlan] 定时任务触发(06:00):', new Date().toISOString());
    try {
      const result = await autoGeneratePurchasePlan();
      console.log('[AutoPlan] 定时任务完成:', JSON.stringify(result));
    } catch (err) {
      console.error('[AutoPlan] 定时任务执行失败:', err.message);
    }
  }, {
    timezone: 'Asia/Shanghai',
  });
  console.log('[AutoPlan] 定时任务已启动: 每天 06:00 自动生成智能采购建议并分配采购员');
  return task;
}
