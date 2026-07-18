import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import { getOrgFilter } from '../../middleware/orgContext.js';
import prisma from '../../shared/prisma.js';
import { purchaseQtyToBase, purchaseUnitPriceToBase, baseQtyToPurchase, baseUnitPriceToPurchase, getDisplayUnit } from '../../shared/unitConversion.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getKingdeeAdapter } from '../../../../../mdm/server/src/services/kingdee-adapter.js';

const router = Router();
router.use(authenticate);

// ============================================================
// 采购计划数据隔离（方案三：混合隔离 + 采购员绑定兜底）
// SUPER_ADMIN → 无过滤，看全部
// PURCHASE_MANAGER → 部门负责人看本部门所有计划；非负责人只看 assigneeId=自己 + creatorId=自己的草稿
// PURCHASE_STAFF → 只看 assigneeId=自己的子计划 + creatorId=自己的草稿父计划
// 其他角色 → 如果有 PurchaserAssignment 绑定：部门负责人看同部门所有子计划，普通成员只看 assigneeId=自己的子计划；否则不返回数据
// ============================================================

// 缓存"该员工是否是采购员"（以 employeeId 为单位，不依赖 SCM User）
let _purchaserAssigneeMap = null;  // employeeId -> boolean
let _purchaserAssigneeCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 缓存"是否是部门负责人"的结果
let _deptManagerCache = null;
let _deptManagerCacheTime = 0;

// 判断该员工是否有采购员绑定记录（以 employeeId 为单位，不依赖 SCM User）
async function isPurchaserAssignee(employeeId) {
  const now = Date.now();
  if (_purchaserAssigneeMap && (now - _purchaserAssigneeCacheTime) < CACHE_TTL) {
    return _purchaserAssigneeMap.has(employeeId);
  }
  const assignments = await prisma.purchaserAssignment.findMany({
    where: { status: 'ACTIVE' },
    select: { employeeId: true },
  });
  _purchaserAssigneeMap = new Set(assignments.map(a => a.employeeId));
  _purchaserAssigneeCacheTime = now;
  return _purchaserAssigneeMap.has(employeeId);
}

// 判断用户是否是其所在部门的负责人（Department.managerId === Employee.id）
// 部门负责人可以看到同部门所有采购计划
async function isDepartmentManager(userId) {
  const now = Date.now();
  if (_deptManagerCache && (now - _deptManagerCacheTime) < CACHE_TTL) {
    return _deptManagerCache.has(userId);
  }
  // 查所有部门的 managerId，构建 employeeId -> departmentId 映射
  const departments = await prisma.department.findMany({
    where: { managerId: { not: null } },
    select: { managerId: true },
  });
  // 查所有用户的 employeeId，构建 userId -> employeeId 映射
  const users = await prisma.user.findMany({
    select: { id: true, employeeId: true },
  });
  const userEmployeeMap = {};
  for (const u of users) {
    if (u.employeeId) userEmployeeMap[u.id] = u.employeeId;
  }
  // managerId 集合（employeeId）
  const managerEmployeeIds = new Set(departments.map(d => d.managerId));
  // userId 集合：userId -> employeeId 属于 managerEmployeeIds 的
  _deptManagerCache = new Set();
  for (const [uid, empId] of Object.entries(userEmployeeMap)) {
    if (managerEmployeeIds.has(empId)) _deptManagerCache.add(uid);
  }
  _deptManagerCacheTime = now;
  return _deptManagerCache.has(userId);
}

async function getPlanDataFilter(user) {
  const role = user.role;

  // SUPER_ADMIN：无过滤
  if (role === ROLES.SUPER_ADMIN) return null; // null 表示不加过滤条件

  // PURCHASE_MANAGER：部门负责人看本部门所有计划，非负责人只看自己的
  if (role === ROLES.PURCHASE_MANAGER) {
    if (await isDepartmentManager(user.userId) && user.departmentId) {
      return { departmentId: user.departmentId };
    }
    // 非负责人或没有部门信息 → 只看分配给自己的 + 自己创建的草稿
    const employeeId = user.employeeId || user.userId;
    return {
      OR: [
        { assigneeId: employeeId },
        { creatorId: employeeId, status: 'DRAFT', parentPlanId: null },
      ],
    };
  }

  // PURCHASE_STAFF：只看分配给自己的子计划 + 自己创建的草稿父计划
  if (role === ROLES.PURCHASE_STAFF) {
    const employeeId = user.employeeId || user.userId;
    return {
      OR: [
        { assigneeId: employeeId }, // 分配给自己的子计划（含已分配、已转发）
        { creatorId: employeeId, status: 'DRAFT', parentPlanId: null }, // 自己创建的草稿父计划
      ],
    };
  }

  // 其他角色：检查是否有采购员绑定记录
  // 部门负责人 → 看同部门所有子计划（departmentId=自己部门）
  // 非负责人但有采购员绑定 → 只看 assigneeId=自己的子计划
  if (await isPurchaserAssignee(user.employeeId || user.userId)) {
    if (await isDepartmentManager(user.userId) && user.departmentId) {
      return { departmentId: user.departmentId };
    }
    // 非负责人或没有部门信息 → 只看分配给自己的
    return { assigneeId: user.employeeId || user.userId };
  }

  // 无采购员绑定的非采购角色：不返回任何采购计划数据
  return { id: '___NO_ACCESS___' }; // 永远不会匹配的 ID，返回空数据
}

async function hasPlanViewAccess(user) {
  const role = user.role;
  if (role === ROLES.SUPER_ADMIN || role === ROLES.PURCHASE_MANAGER || role === ROLES.PURCHASE_STAFF) {
    return true;
  }
  // 非采购角色：有采购员绑定记录则可查看
  return await isPurchaserAssignee(user.employeeId || user.userId);
}

// 质检附件上传配置（磁盘存储，10MB 限制）
// 使用绝对路径，避免 PM2 cwd 变化导致文件保存位置不一致
const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../../uploads', 'qc');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const qcUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `qc_${uniqueSuffix}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    }
  },
});

// ============================================================
// 工具函数：生成单据编号
// ============================================================
function genNo(prefix) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${ymd}${rand}`;
}

// ============================================================
// 采购计划
// ============================================================

// 采购计划智能建议 (P1-14) — 必须在 /:id 路由之前，数据隔离
router.get('/plans/suggest', async (req, res, next) => {
  try {
    // 数据隔离：非采购角色不返回智能建议
    if (!(await hasPlanViewAccess(req.user))) {
      return res.json({ success: true, data: { analysisDays: 3, suggestions: [], totalItems: 0, totalEstimatedAmount: 0, summary: { highUrgency: 0, mediumUrgency: 0, lowUrgency: 0 } } });
    }

    const { days = 3 } = req.query;
    const analysisDays = Number(days);

    // 智能建议物料范围：启用 或 采购补全已完成
    const materials = await prisma.material.findMany({
      where: { OR: [{ status: 'ACTIVE' }, { purchaseFieldsComplete: true }] },
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

    // 查询已有智能建议生成且未完成的采购计划明细，排除这些物料
    const usedMaterialIds = new Set();
    const usedPlanItems = await prisma.purchasePlanItem.findMany({
      where: { suggestionNo: { not: null }, plan: { status: { in: ['DRAFT', 'PENDING', 'APPROVED', 'IN_PROGRESS'] } } },
      select: { materialId: true },
    });
    for (const pi of usedPlanItems) { usedMaterialIds.add(pi.materialId); }

    const suggestions = [];
    for (const mat of materials) {
      // 已有未完成的智能建议采购计划，跳过
      if (usedMaterialIds.has(mat.id)) continue;

      const totalStock = mat.inventory.reduce((s, inv) => s + inv.qty, 0);
      const lockedStock = mat.inventory.reduce((s, inv) => s + (inv.lockedQty || 0), 0);
      const availableStock = totalStock - lockedStock;
      const salesQty = salesByMaterial[mat.id] || 0;
      const dailyAvgSales = salesQty / analysisDays;
      const recentReceived = receivedByMaterial[mat.id] || 0;
      const purchaseLeadTime = mat.purchaseLeadTime || 0;
      // 无销售历史时使用经验安全库存系数（日均1件 × 采购周期），避免 safetyStock=0 导致无意义建议
      const effectiveDailyAvg = dailyAvgSales > 0 ? dailyAvgSales : 1;
      const safetyStock = Math.ceil(effectiveDailyAvg * purchaseLeadTime);
      const maxStock = Math.ceil(effectiveDailyAvg * (purchaseLeadTime + 1));
      const suggestedQty = Math.max(0, safetyStock - totalStock);

      // 库存不足才出建议：当前库存低于安全库存
      if (suggestedQty > 0) {
        const supplier = supplierByMaterial[mat.id];
        // 单价：latestReceiptPrice 已改为基准单位单价，需转换为采购单位单价显示
        const baseUnitPrice = Number(priceByMaterial[mat.id] || mat.latestReceiptPrice || mat.initialPurchasePrice || 0);
        const purchaseDisplayUnitPrice = Number(baseUnitPriceToPurchase(baseUnitPrice, mat));
        // 建议采购量：基准单位 → 采购单位，向上取整确保满足需求
        const purchaseSuggestedQty = Math.ceil(Number(baseQtyToPurchase(suggestedQty, mat)));
        // 采购单位下预估金额
        const estimatedAmount = purchaseSuggestedQty * purchaseDisplayUnitPrice;
        suggestions.push({
          materialId: mat.id, materialCode: mat.code, materialName: mat.name,
          unit: mat.unit, // 基准单位
          purchaseUnit: mat.purchaseUnit || mat.unit, // 采购单位
          purchaseConversionFactor: Number(mat.purchaseConversionFactor || 1), // 换算系数
          // 库存相关（基准单位）
          currentStock: totalStock, availableStock, lockedStock, safetyStock,
          dailyAvgSales: Math.round(dailyAvgSales * 100) / 100, salesInPeriod: salesQty,
          stockDays: dailyAvgSales > 0 ? Math.round(totalStock / dailyAvgSales) : null,
          purchaseLeadTime, maxStock,
          recentReceived,
          // 建议采购量（基准单位）
          suggestedQty,
          // 建议采购量（采购单位，向上取整）
          purchaseSuggestedQty,
          supplierId: supplier?.id || null, supplierName: supplier?.name || null,
          // 单价（采购单位单价，用于显示和金额计算）
          unitPrice: purchaseDisplayUnitPrice,
          estimatedAmount,
          urgency: availableStock < safetyStock ? 'HIGH' : (availableStock < safetyStock * 2 ? 'MEDIUM' : 'LOW'),
        });
      }
    }

    const urgencyOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    suggestions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
    // 排序后生成建议编号（类似计划编号规则：PS+日期+随机码+3位序号）
    const batchNo = genNo('PS');
    suggestions.forEach((s, i) => { s.suggestionNo = `${batchNo}${String(i + 1).padStart(3, '0')}`; });
    const totalEstimatedAmount = suggestions.reduce((s, item) => s + item.estimatedAmount, 0);

    res.json({
      success: true,
      data: {
        analysisDays, suggestions,
        totalItems: suggestions.length, totalEstimatedAmount,
        summary: {
          highUrgency: suggestions.filter((s) => s.urgency === 'HIGH').length,
          mediumUrgency: suggestions.filter((s) => s.urgency === 'MEDIUM').length,
          lowUrgency: suggestions.filter((s) => s.urgency === 'LOW').length,
        },
      },
    });
  } catch (err) { next(err); }
});

// 基于建议直接生成采购计划草稿 (P1-14)
router.post('/plans/from-suggestion', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const { title, planType, priceDate, periodStart, periodEnd, departmentId, remark, items } = req.body;
    if (!items || !items.length) return res.status(400).json({ success: false, message: '至少需要一条明细' });

    const creatorId = req.user.employeeId || req.user.userId;
    const planNo = genNo('PP');

    const plan = await prisma.purchasePlan.create({
      data: {
        planNo,
        title: title || `智能采购计划 ${new Date().toLocaleDateString('zh-CN')}`,
        planType: 'MONTHLY',
        periodStart: new Date(periodStart || Date.now()),
        periodEnd: new Date(periodEnd || Date.now() + 30 * 86400000),
        departmentId: departmentId || req.user.departmentId || null,
        creatorId,
        remark: remark || '系统智能建议生成',
        status: 'DRAFT',
        items: {
          create: items.map((it) => ({
            materialId: it.materialId,
            planQty: it.planQty || 0,
            unit: it.unit || null,
            expectedDate: it.expectedDate ? new Date(it.expectedDate) : null,
            suggestionNo: it.suggestionNo || null,
            remark: it.remark || null,
          })),
        },
      },
      include: { items: true },
    });
    res.json({ success: true, data: plan, message: '采购计划草稿已生成' });
  } catch (err) { next(err); }
});

// 子计划列表（已分配 + 已转发），数据隔离，只读查询
router.get('/plans/children', async (req, res, next) => {
  try {
    const { keyword = '', status = '' } = req.query;

    // 数据隔离：非采购角色不返回子计划数据
    if (!(await hasPlanViewAccess(req.user))) {
      return res.json({ success: true, data: { allocated: [], forwarded: [], cancelled: [] } });
    }

    // 查询所有子计划（parentPlanId != null），包含父计划信息
    const where = { parentPlanId: { not: null } };

    // 数据隔离过滤
    const dataFilter = await getPlanDataFilter(req.user);
    if (dataFilter) {
      if (dataFilter.OR) {
        // PURCHASE_STAFF 的 OR 条件需要与 parentPlanId!=null AND 组合
        where.AND = [
          { parentPlanId: { not: null } },
          dataFilter,
        ];
        delete where.parentPlanId; // 移到 AND 中
      } else {
        Object.assign(where, dataFilter);
      }
    }

    if (keyword) {
      const keywordFilter = {
        OR: [
          { planNo: { contains: keyword } },
          { title: { contains: keyword } },
          { parentPlan: { planNo: { contains: keyword } } },
          { parentPlan: { title: { contains: keyword } } },
          { assignee: { name: { contains: keyword } } },
        ],
      };
      if (where.AND) {
        where.AND.push(keywordFilter);
      } else if (where.OR) {
        where.AND = [where.OR, keywordFilter];
        delete where.OR;
      } else {
        where.OR = keywordFilter.OR;
      }
    }
    if (status) where.status = status;

    const children = await prisma.purchasePlan.findMany({
      where,
      include: {
        parentPlan: { select: { id: true, planNo: true, title: true, status: true, priceDate: true, createdAt: true, department: { select: { name: true } } } },
        assignee: { select: { id: true, name: true, empNo: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 按 remark 区分：含"分配"为分配（含"自动分配"和"定时自动生成并分配"），含"转发"为转发，已作废单独归类
    const allocatedChildren = children.filter((p) => p.status !== 'CANCELLED' && p.remark?.includes('分配'));
    const forwardedChildren = children.filter((p) => p.status !== 'CANCELLED' && p.remark?.includes('转发') && !p.remark?.includes('分配'));
    const cancelledChildren = children.filter((p) => p.status === 'CANCELLED');

    // 按父计划聚合 — 每个父计划一行，附带其子计划列表
    const aggregateByParent = (childList) => {
      const map = new Map();
      for (const child of childList) {
        const parentId = child.parentPlan?.id;
        if (!parentId) continue;
        if (!map.has(parentId)) {
          map.set(parentId, {
            parentPlan: child.parentPlan,
            children: [],
          });
        }
        map.get(parentId).children.push({
          id: child.id,
          planNo: child.planNo,
          title: child.title,
          status: child.status,
          assignee: child.assignee,
          itemCount: child._count?.items || 0,
          createdAt: child.createdAt,
        });
      }
      return Array.from(map.values());
    };

    const allocated = aggregateByParent(allocatedChildren);
    const forwarded = aggregateByParent(forwardedChildren);
    const cancelled = aggregateByParent(cancelledChildren);

    res.json({ success: true, data: { allocated, forwarded, cancelled } });
  } catch (err) { next(err); }
});

// 列表（数据隔离）
router.get('/plans', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '', planType = '' } = req.query;

    // 数据隔离过滤
    const dataFilter = await getPlanDataFilter(req.user);
    if (!(await hasPlanViewAccess(req.user))) {
      return res.json({ success: true, data: { list: [], total: 0, page: Number(page), pageSize: Number(pageSize) } });
    }

    const where = {};
    if (dataFilter) {
      // 将数据隔离条件合并到 where
      if (dataFilter.OR) {
        where.OR = dataFilter.OR;
      } else {
        Object.assign(where, dataFilter);
      }
    }

    if (keyword) {
      // keyword 搜索需与数据隔离条件组合
      const keywordFilter = { OR: [{ planNo: { contains: keyword } }, { title: { contains: keyword } }] };
      if (where.OR) {
        // 已有 OR 条件（PURCHASE_STAFF），需 AND 组合
        where.AND = [where.OR, keywordFilter];
        delete where.OR;
      } else {
        // 无 OR（SUPER_ADMIN/PURCHASE_MANAGER），keyword 直接加 OR
        where.OR = keywordFilter.OR;
        // 但如果已有 departmentId 等字段，需保证 AND 组合
        // 由于 Prisma where 是 AND 语义（所有条件同时满足），直接加 OR 即可
      }
    }
    if (status) where.status = status;
    if (planType) where.planType = planType;

    // 排除"所有明细都已分配"的父计划（allocated=true 的已全部分配，不再展示）
    // 保留：有未分配明细的父计划（支持补分配）+ 所有子计划
    // 逻辑：不是 (父计划且没有未分配明细) → 是子计划 OR 父计划有未分配明细
    where.NOT = {
      AND: [
        { parentPlanId: null },
        { items: { none: { allocated: false } } },
      ],
    };

    const [list, total] = await Promise.all([
      prisma.purchasePlan.findMany({
        where,
        include: {
          department: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, empNo: true } },
          approver: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, empNo: true } },
          parentPlan: { select: { id: true, planNo: true, title: true } },
          _count: { select: { items: true, purchaseOrders: true, childPlans: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchasePlan.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 详情（含明细），数据隔离校验
router.get('/plans/:id', async (req, res, next) => {
  try {
    // 数据隔离：非采购角色不可查看详情
    if (!(await hasPlanViewAccess(req.user))) {
      return res.status(403).json({ success: false, message: '您没有采购计划查看权限' });
    }

    const plan = await prisma.purchasePlan.findUnique({
      where: { id: req.params.id },
      include: {
        department: true,
        creator: { select: { id: true, name: true, empNo: true } },
        approver: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, empNo: true } },
        parentPlan: { select: { id: true, planNo: true, title: true } },
        childPlans: {
          select: { id: true, planNo: true, title: true, status: true,
            assignee: { select: { id: true, name: true, empNo: true } },
            _count: { select: { items: true } },
          },
        },
        items: {
          where: { forwarded: false },
          include: {
            material: { select: { id: true, code: true, name: true, spec: true, unit: true, purchaseUnit: true, salesUnit: true, purchaseConversionFactor: true, salesConversionFactor: true } },
            supplier: { select: { id: true, code: true, name: true } },
            grade: { select: { id: true, code: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        purchaseOrders: { select: { id: true, orderNo: true, status: true } },
      },
    });
    if (!plan) return res.status(404).json({ success: false, message: '采购计划不存在' });

    // 数据隔离校验：验证当前用户是否有权查看此计划
    const role = req.user.role;
    if (role !== ROLES.SUPER_ADMIN) {
      if (role === ROLES.PURCHASE_MANAGER) {
        // 采购经理：部门负责人看本部门所有计划，非负责人只看自己的
        const isDeptManager = await isDepartmentManager(req.user.userId);
        const isSameDepartment = isDeptManager && req.user.departmentId && plan.departmentId === req.user.departmentId;
        const isAssignedToMe = plan.assigneeId === (req.user.employeeId || req.user.userId);
        const isMyDraftParent = plan.creatorId === (req.user.employeeId || req.user.userId) && plan.status === 'DRAFT' && !plan.parentPlanId;
        if (!isSameDepartment && !isAssignedToMe && !isMyDraftParent) {
          return res.status(403).json({ success: false, message: '您没有查看该采购计划的权限' });
        }
      } else if (role === ROLES.PURCHASE_STAFF) {
        // 采购员只能看分配给自己的子计划 + 自己创建的草稿父计划
        const isAssignedToMe = plan.assigneeId === (req.user.employeeId || req.user.userId);
        const isMyDraftParent = plan.creatorId === (req.user.employeeId || req.user.userId) && plan.status === 'DRAFT' && !plan.parentPlanId;
        if (!isAssignedToMe && !isMyDraftParent) {
          return res.status(403).json({ success: false, message: '您没有查看该采购计划的权限' });
        }
      } else {
        // 非采购角色：部门负责人可看同部门所有子计划，普通成员只能看分配给自己的
        const isDeptManager = await isDepartmentManager(req.user.userId);
        const isSameDepartment = isDeptManager && req.user.departmentId && plan.departmentId === req.user.departmentId;
        const isAssignedToMe = plan.assigneeId === (req.user.employeeId || req.user.userId);
        if (!isSameDepartment && !isAssignedToMe) {
          return res.status(403).json({ success: false, message: '您没有查看该采购计划的权限' });
        }
      }
    }

    res.json({ success: true, data: plan });
  } catch (err) { next(err); }
});

// 创建（数据隔离：自动取当前用户为 creatorId，部门自动取用户部门）
router.post('/plans', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const { title, planType, priceDate, periodStart, periodEnd, remark, items } = req.body;
    // departmentId 不允许手动指定，自动取用户所属部门（SUPER_ADMIN 可指定任意部门）
    const departmentId = req.user.role === ROLES.SUPER_ADMIN ? (req.body.departmentId || req.user.departmentId) : req.user.departmentId;
    if (!title) return res.status(400).json({ success: false, message: '计划标题必填' });
    if (!items || !items.length) return res.status(400).json({ success: false, message: '至少需要一条明细' });

    const creatorId = req.user.employeeId || req.user.userId;
    const planNo = genNo('PP');

    const plan = await prisma.purchasePlan.create({
      data: {
        planNo,
        title,
        planType: planType || 'MONTHLY',
        priceDate: priceDate ? new Date(priceDate) : new Date(),
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        departmentId: departmentId || null,
        creatorId,
        remark: remark || null,
        status: 'DRAFT',
        items: {
          create: items.map((it) => ({
            materialId: it.materialId,
            planQty: it.planQty || 0,
            unit: it.unit || null,
            gradeId: it.gradeId || null,
            expectedDate: it.expectedDate ? new Date(it.expectedDate) : null,
            remark: it.remark || null,
          })),
        },
      },
      include: { items: true },
    });
    res.json({ success: true, data: plan });
  } catch (err) { next(err); }
});

// 更新（仅DRAFT状态可改，数据隔离校验）
router.put('/plans/:id', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const existing = await prisma.purchasePlan.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: '采购计划不存在' });
    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') return res.status(400).json({ success: false, message: '仅草稿或已驳回状态可编辑' });

    // 数据隔离校验：采购员只能编辑自己创建的草稿父计划
    const role = req.user.role;
    if (role !== ROLES.SUPER_ADMIN) {
      if (role === ROLES.PURCHASE_MANAGER) {
        if (existing.departmentId !== req.user.departmentId) {
          return res.status(403).json({ success: false, message: '您没有编辑该采购计划的权限' });
        }
      } else if (role === ROLES.PURCHASE_STAFF) {
        const isMyDraftParent = existing.creatorId === (req.user.employeeId || req.user.userId) && !existing.parentPlanId;
        if (!isMyDraftParent) {
          return res.status(403).json({ success: false, message: '您只能编辑自己创建的草稿父计划' });
        }
      }
    }

    const { title, planType, priceDate, periodStart, periodEnd, departmentId, remark, items } = req.body;
    const plan = await prisma.purchasePlan.update({
      where: { id: req.params.id },
      data: {
        title, planType,
        priceDate: priceDate ? new Date(priceDate) : undefined,
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        departmentId: departmentId || null,
        remark,
        // 已驳回的修改后自动回到草稿状态，重新走审批
        ...(existing.status === 'REJECTED' ? { status: 'DRAFT' } : {}),
      },
    });

    // 更新明细：先删后建
    if (items && items.length) {
      await prisma.purchasePlanItem.deleteMany({ where: { planId: req.params.id } });
      await prisma.purchasePlanItem.createMany({
        data: items.map((it) => ({
          planId: req.params.id,
          materialId: it.materialId,
          planQty: it.planQty || 0,
          unit: it.unit || null,
          gradeId: it.gradeId || null,
          expectedDate: it.expectedDate ? new Date(it.expectedDate) : null,
          remark: it.remark || null,
        })),
      });
    }
    res.json({ success: true, data: plan });
  } catch (err) { next(err); }
});

// 审批（数据隔离：PURCHASE_MANAGER只能审批本部门计划）
router.put('/plans/:id/approve', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const plan = await prisma.purchasePlan.findUnique({ where: { id: req.params.id } });
    if (!plan) return res.status(404).json({ success: false, message: '采购计划不存在' });
    if (plan.status !== 'DRAFT' && plan.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: '当前状态不可审批' });
    }

    // 数据隔离校验：采购经理只能审批本部门计划
    if (req.user.role === ROLES.PURCHASE_MANAGER && plan.departmentId !== req.user.departmentId) {
      return res.status(403).json({ success: false, message: '您只能审批本部门的采购计划' });
    }
    const updated = await prisma.purchasePlan.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approverId: req.user.employeeId,
        approvedAt: new Date(),
        publishedAt: new Date(),
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// 驳回（仅待审批状态，数据隔离：PURCHASE_MANAGER只能驳回本部门计划）
router.put('/plans/:id/reject', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const { rejectReason } = req.body;
    const plan = await prisma.purchasePlan.findUnique({ where: { id: req.params.id } });
    if (!plan) return res.status(404).json({ success: false, message: '采购计划不存在' });
    if (plan.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: '只有待审批状态可以驳回' });
    }

    // 数据隔离校验：采购经理只能驳回本部门计划
    if (req.user.role === ROLES.PURCHASE_MANAGER && plan.departmentId !== req.user.departmentId) {
      return res.status(403).json({ success: false, message: '您只能驳回本部门的采购计划' });
    }
    const remark = rejectReason
      ? (plan.remark ? `${plan.remark}\n[驳回原因]: ${rejectReason}` : `[驳回原因]: ${rejectReason}`)
      : plan.remark;
    const updated = await prisma.purchasePlan.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', remark },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// 采购员确认采购计划（填写供应商/单价/实际采购数量后确认）
// 只有 APPROVED 状态的子计划（分配给采购员的）才能确认
router.put('/plans/:id/confirm', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const existing = await prisma.purchasePlan.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { material: { select: { id: true, name: true, code: true } } } } },
    });
    if (!existing) return res.status(404).json({ success: false, message: '采购计划不存在' });
    if (existing.status !== 'APPROVED') {
      return res.status(400).json({ success: false, message: '只有已批准状态可以确认，当前状态: ' + existing.status });
    }

    // 数据隔离校验：采购员只能确认分配给自己的子计划
    if (req.user.role !== ROLES.SUPER_ADMIN) {
      if (existing.assigneeId !== (req.user.employeeId || req.user.userId)) {
        return res.status(403).json({ success: false, message: '您只能确认分配给您的采购计划' });
      }
    }

    // 校验每条明细必须填写供应商、单价、实际采购数量
    const incompleteItems = existing.items.filter(it => !it.supplierId || !it.unitPrice || it.unitPrice <= 0 || !it.actualQty || it.actualQty <= 0);
    if (incompleteItems.length > 0) {
      const incompleteNames = incompleteItems.map(it => {
        const matName = it.material?.name || it.material?.code || it.materialId;
        const missing = [];
        if (!it.supplierId) missing.push('供应商');
        if (!it.unitPrice || it.unitPrice <= 0) missing.push('单价');
        if (!it.actualQty || it.actualQty <= 0) missing.push('实际采购数量');
        return `${matName}(${missing.join('、')}未填)`;
      });
      return res.status(400).json({ success: false, message: `以下明细未填写完整，无法确认: ${incompleteNames.join('; ')}` });
    }

    const updated = await prisma.purchasePlan.update({
      where: { id: req.params.id },
      data: { status: 'CONFIRMED' },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// 更新采购计划明细字段（供应商/单价/实际采购数量）— 采购员在 APPROVED 子计划上填写
router.put('/plans/:id/items', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const existing = await prisma.purchasePlan.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: '采购计划不存在' });
    // 只有 APPROVED 状态的子计划可以填写供应商/单价/实际采购数量
    if (existing.status !== 'APPROVED') {
      return res.status(400).json({ success: false, message: '只有已批准状态可以填写采购详情' });
    }

    // 数据隔离校验
    if (req.user.role !== ROLES.SUPER_ADMIN) {
      if (existing.assigneeId !== (req.user.employeeId || req.user.userId)) {
        return res.status(403).json({ success: false, message: '您只能修改分配给您的采购计划明细' });
      }
    }

    const { items } = req.body;
    if (!items || !items.length) return res.status(400).json({ success: false, message: '至少需要一条明细' });

    // 逐条更新明细的 supplierId / unitPrice / actualQty / gradeId
    for (const it of items) {
      await prisma.purchasePlanItem.update({
        where: { id: it.id },
        data: {
          supplierId: it.supplierId || null,
          unitPrice: it.unitPrice ? Number(it.unitPrice) : 0,
          actualQty: it.actualQty ? Number(it.actualQty) : 0,
          gradeId: it.gradeId || null,
        },
      });
    }

    res.json({ success: true, message: '采购计划明细更新成功' });
  } catch (err) { next(err); }
});

// 提交审批（数据隔离校验：只有采购角色可提交，非采购角色+采购员绑定不可提交）
router.put('/plans/:id/submit', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const existing = await prisma.purchasePlan.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: '采购计划不存在' });
    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      return res.status(400).json({ success: false, message: '只有草稿或已驳回状态可提交审批' });
    }

    // 采购员只能提交自己创建的草稿父计划
    if (req.user.role === ROLES.PURCHASE_STAFF) {
      const isMyDraftParent = existing.creatorId === (req.user.employeeId || req.user.userId) && !existing.parentPlanId;
      if (!isMyDraftParent) {
        return res.status(403).json({ success: false, message: '您只能提交自己创建的草稿父计划' });
      }
    }
    // 采购经理只能提交本部门的计划
    if (req.user.role === ROLES.PURCHASE_MANAGER && existing.departmentId !== req.user.departmentId) {
      return res.status(403).json({ success: false, message: '您只能提交本部门的采购计划' });
    }

    const plan = await prisma.purchasePlan.update({
      where: { id: req.params.id },
      data: { status: 'PENDING' },
    });
    res.json({ success: true, data: plan });
  } catch (err) { next(err); }
});

// 作废 (任何非已确认/非已作废状态 → CANCELLED)
router.put('/plans/:id/cancel', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const existing = await prisma.purchasePlan.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: '采购计划不存在' });
    if (existing.status === 'CONFIRMED') {
      return res.status(400).json({ success: false, message: '已确认的采购计划不可作废' });
    }
    if (existing.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: '该采购计划已作废' });
    }
    if (existing.status === 'DRAFT') {
      return res.status(400).json({ success: false, message: '草稿状态不可作废，请直接删除' });
    }

    // 权限：采购经理只能作废本部门、采购员只能作废自己创建的
    if (req.user.role === ROLES.PURCHASE_STAFF && existing.creatorId !== (req.user.employeeId || req.user.userId)) {
      return res.status(403).json({ success: false, message: '您只能作废自己创建的采购计划' });
    }
    if (req.user.role === ROLES.PURCHASE_MANAGER && existing.departmentId && existing.departmentId !== req.user.departmentId) {
      return res.status(403).json({ success: false, message: '您只能作废本部门的采购计划' });
    }

    const plan = await prisma.purchasePlan.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json({ success: true, data: plan, message: '采购计划已作废' });
  } catch (err) { next(err); }
});

// 删除（仅DRAFT，数据隔离：PURCHASE_MANAGER只能删本部门，PURCHASE_STAFF只能删自己创建的草稿父计划）
router.delete('/plans/:id', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const plan = await prisma.purchasePlan.findUnique({ where: { id: req.params.id } });
    if (!plan) return res.status(404).json({ success: false, message: '采购计划不存在' });
    if (plan.status !== 'DRAFT') return res.status(400).json({ success: false, message: '仅草稿状态可删除' });

    // 数据隔离校验
    if (req.user.role === ROLES.PURCHASE_MANAGER && plan.departmentId !== req.user.departmentId) {
      return res.status(403).json({ success: false, message: '您只能删除本部门的采购计划' });
    }

    // 有子计划的不允许删除
    const childCount = await prisma.purchasePlan.count({ where: { parentPlanId: req.params.id } });
    if (childCount > 0) return res.status(400).json({ success: false, message: '该计划已分配子计划，不可删除' });
    await prisma.purchasePlan.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// ============================================================
// 订单分配 — 数据隔离：PURCHASE_MANAGER只能分配本部门的计划
// ============================================================
router.post('/plans/:id/allocate', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const parentId = req.params.id;

    // 数据隔离校验：采购经理只能分配本部门计划
    if (req.user.role === ROLES.PURCHASE_MANAGER) {
      const planDept = await prisma.purchasePlan.findUnique({ where: { id: parentId }, select: { departmentId: true } });
      if (!planDept) return res.status(404).json({ success: false, message: '采购计划不存在' });
      if (planDept.departmentId !== req.user.departmentId) {
        return res.status(403).json({ success: false, message: '您只能分配本部门的采购计划' });
      }
    }

    // 1. 获取父计划及其明细
    const parentPlan = await prisma.purchasePlan.findUnique({
      where: { id: parentId },
      include: {
        items: {
          include: { material: { select: { id: true, code: true, name: true, unit: true, purchaseUnit: true, salesUnit: true, purchaseConversionFactor: true, salesConversionFactor: true } } },
        },
      },
    });
    if (!parentPlan) return res.status(404).json({ success: false, message: '采购计划不存在' });
    if (parentPlan.status !== 'APPROVED') return res.status(400).json({ success: false, message: '仅已批准状态可分配' });
    if (parentPlan.parentPlanId) return res.status(400).json({ success: false, message: '子计划不可再次分配' });

    // 检查是否有未分配的明细
    const unallocatedItems = parentPlan.items.filter((it) => !it.allocated);
    if (unallocatedItems.length === 0) {
      return res.status(400).json({ success: false, message: '该计划的所有明细已全部分配完毕' });
    }
    const isReAllocation = parentPlan.items.some((it) => it.allocated); // 是否为补分配

    // 2. 获取所有采购员分配记录（含物料绑定）
    const assignments = await prisma.purchaserAssignment.findMany({
      where: { status: 'ACTIVE' },
      include: {
        employee: { select: { id: true, name: true, empNo: true, departmentId: true } },
        materials: { include: { material: { select: { id: true } } } },
      },
    });

    if (assignments.length === 0) {
      return res.status(400).json({ success: false, message: '系统中无采购员分配记录，请先在「基础数据 > 采购员管理」中配置' });
    }

    // 3. 按采购员分组物料
    // 构建 materialId -> [assignment] 映射
    const materialToEmployees = {};
    for (const assignment of assignments) {
      for (const pm of assignment.materials) {
        if (!materialToEmployees[pm.materialId]) materialToEmployees[pm.materialId] = [];
        materialToEmployees[pm.materialId].push(assignment);
      }
    }

    // 按采购员聚合明细（key 仍是 employeeId，因为这是业务维度）
    const employeeItemsMap = {}; // employeeId -> [{ item, assignment }]
    const unassignedItems = [];

    for (const item of unallocatedItems) {
      const matchedAssignments = materialToEmployees[item.materialId];
      if (matchedAssignments && matchedAssignments.length > 0) {
        // 多个采购员负责同一物料时，每个采购员都分配到该物料明细
        for (const assignment of matchedAssignments) {
          if (!employeeItemsMap[assignment.employeeId]) employeeItemsMap[assignment.employeeId] = { assignment, items: [] };
          employeeItemsMap[assignment.employeeId].items.push(item);
        }
      } else {
        unassignedItems.push(item);
      }
    }

    // 4. 为每个采购员创建子采购计划（每个子计划单独 try-catch，避免一个失败全部回滚）
    // 补分配时 seq 必须从已存在的子计划最大编号 + 1 开始，否则会与已存在的子计划编号冲突
    const existingChildren = await prisma.purchasePlan.findMany({
      where: { parentPlanId: parentId },
      select: { planNo: true },
    });
    let seq = existingChildren.reduce((max, c) => {
      const m = c.planNo.match(/-(\d+)$/);
      const n = m ? parseInt(m[1], 10) : 0;
      return Math.max(max, n);
    }, 0) + 1;
    const createdChildren = [];
    const failedEmployees = [];
    const assignedItemIds = []; // 成功分配到子计划的父明细 ID

    for (const [employeeId, { assignment, items }] of Object.entries(employeeItemsMap)) {
      const childPlanNo = `${parentPlan.planNo}-${String(seq).padStart(2, '0')}`;
      seq++;

      try {
        const childPlan = await prisma.purchasePlan.create({
          data: {
            planNo: childPlanNo,
            title: `${parentPlan.title}（${assignment.employee.name}）`,
            planType: parentPlan.planType,
            periodStart: parentPlan.periodStart,
            periodEnd: parentPlan.periodEnd,
            departmentId: assignment.employee.departmentId || parentPlan.departmentId,
            priceDate: new Date(), // 子计划单据日期取当前系统日期，不继承父计划
            status: 'APPROVED',
            creatorId: parentPlan.creatorId,
            parentPlanId: parentId,
            assigneeId: employeeId,
            approvedAt: new Date(),
            publishedAt: new Date(),
            remark: `由父计划 ${parentPlan.planNo} 自动分配`,
            items: {
              create: items.map((it) => ({
                materialId: it.materialId,
                gradeId: it.gradeId || null,
                planQty: Number(it.planQty) || 0,
                unit: it.unit || '',
                expectedDate: it.expectedDate ? new Date(it.expectedDate) : null,
                remark: it.remark || '',
              })),
            },
          },
          include: {
            assignee: { select: { name: true } },
            _count: { select: { items: true } },
          },
        });

        createdChildren.push(childPlan);
        // 记录成功分配的父明细 ID
        assignedItemIds.push(...items.map((it) => it.id));
      } catch (createErr) {
        console.error('[订单分配] 创建子计划失败', { employeeId, planNo: childPlanNo, error: createErr.message });
        failedEmployees.push({ employeeId, name: assignment.employee.name, empNo: assignment.employee.empNo, reason: createErr.message });
      }
    }

    // 全部失败则返回错误
    if (createdChildren.length === 0 && failedEmployees.length > 0) {
      return res.status(500).json({ success: false, message: '子计划创建失败：' + failedEmployees[0].reason });
    }

    // 部分成功时也继续（已创建的保留），在消息中提示失败的
    await prisma.purchasePlan.update({
      where: { id: parentId },
      data: { publishedAt: new Date() },
    });

    // 将已成功分配到子计划的父明细标记为 allocated
    if (assignedItemIds.length > 0) {
      await prisma.purchasePlanItem.updateMany({
        where: { id: { in: assignedItemIds } },
        data: { allocated: true },
      });
    }

    // 返回精简数据，避免 Prisma Decimal 等类型序列化问题
    const action = isReAllocation ? '补分配' : '分配';
    let msg = `${action}成功：生成 ${createdChildren.length} 个子采购计划`;
    if (failedEmployees.length > 0) msg += `，${failedEmployees.length} 个采购员分配失败`;
    if (unassignedItems.length > 0) msg += `，${unassignedItems.length} 个物料未匹配到采购员`;
    res.json({
      success: true,
      message: msg,
      data: {
        children: createdChildren.map((c) => ({
          id: c.id,
          planNo: c.planNo,
          title: c.title,
          status: c.status,
          assigneeName: c.assignee?.name || '-',
          itemCount: c._count?.items || 0,
        })),
        unassignedMaterials: unassignedItems.map((it) => ({ id: it.materialId, code: it.material?.code, name: it.material?.name })),
        failedEmployees: failedEmployees.length > 0 ? failedEmployees : undefined,
        isReAllocation,
        allocatedCount: assignedItemIds.length,
        unallocatedRemaining: unassignedItems.length,
      },
    });
  } catch (err) { next(err); }
});

// ============================================================
// 转发 — 数据隔离：PURCHASE_MANAGER只能转发本部门计划，PURCHASE_STAFF只能转发分配给自己的子计划
// ============================================================
router.post('/plans/:id/forward', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER, ROLES.PURCHASE_STAFF), async (req, res, next) => {
  try {
    const sourceId = req.params.id;
    const { itemIds, targetEmployeeId } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ success: false, message: '请至少选择一条明细' });
    }
    if (!targetEmployeeId) {
      return res.status(400).json({ success: false, message: '请选择目标采购员' });
    }

    // 数据隔离校验
    const sourcePlanForAuth = await prisma.purchasePlan.findUnique({ where: { id: sourceId }, select: { departmentId: true, assigneeId: true, parentPlanId: true, status: true } });
    if (!sourcePlanForAuth) return res.status(404).json({ success: false, message: '源采购计划不存在' });
    if (sourcePlanForAuth.status === 'CONFIRMED') {
      return res.status(400).json({ success: false, message: '已确认的采购计划不允许转发' });
    }
    if (req.user.role === ROLES.PURCHASE_MANAGER && sourcePlanForAuth.departmentId !== req.user.departmentId) {
      return res.status(403).json({ success: false, message: '您只能转发本部门的采购计划' });
    }
    if (req.user.role === ROLES.PURCHASE_STAFF && sourcePlanForAuth.assigneeId !== (req.user.employeeId || req.user.userId)) {
      return res.status(403).json({ success: false, message: '您只能转发分配给自己的子计划' });
    }

    // 查询源计划（只查未转发的明细，避免重复转发）
    const sourcePlan = await prisma.purchasePlan.findUnique({
      where: { id: sourceId },
      include: {
        items: {
          where: { forwarded: false },
          include: { material: { select: { id: true, code: true, name: true, spec: true, unit: true, purchaseUnit: true, salesUnit: true, purchaseConversionFactor: true, salesConversionFactor: true } } },
        },
      },
    });
    if (!sourcePlan) return res.status(404).json({ success: false, message: '源采购计划不存在' });

    // 筛选选中的明细
    const selectedItems = sourcePlan.items.filter((it) => itemIds.includes(it.id));
    if (selectedItems.length === 0) {
      return res.status(400).json({ success: false, message: '选中的明细不存在或已转发' });
    }

    // 查询目标员工（直接查 Employee，不依赖 User）
    const targetEmployee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { id: true, name: true, empNo: true, departmentId: true },
    });
    if (!targetEmployee) return res.status(400).json({ success: false, message: '目标采购员不存在' });

    const fromName = req.user.name || req.user.userId;
    const forwardRemark = `由${fromName}转发给${targetEmployee.name}`;

    // 生成新计划编号
    const newPlanNo = genNo('PP');

    // 创建新采购计划（转发后的单据日期取当前系统日期）
    const newPlan = await prisma.purchasePlan.create({
      data: {
        planNo: newPlanNo,
        title: `${sourcePlan.title}（转发）`,
        planType: sourcePlan.planType,
        priceDate: new Date(),
        periodStart: sourcePlan.periodStart,
        periodEnd: sourcePlan.periodEnd,
        departmentId: targetEmployee.departmentId || sourcePlan.departmentId,
        status: 'APPROVED',
        creatorId: req.user.employeeId || req.user.userId,
        parentPlanId: sourceId,
        assigneeId: targetEmployeeId,
        approvedAt: new Date(),
        publishedAt: new Date(),
        remark: forwardRemark,
        items: {
          create: selectedItems.map((it) => ({
            materialId: it.materialId,
            gradeId: it.gradeId || null,
            planQty: Number(it.planQty) || 0,
            unit: it.unit,
            expectedDate: it.expectedDate,
            remark: it.remark,
          })),
        },
      },
      include: {
        assignee: { select: { name: true } },
        items: { include: { material: { select: { code: true, name: true } } } },
      },
    });

    // 标记源计划中选中的明细为已转发
    await prisma.purchasePlanItem.updateMany({
      where: { id: { in: itemIds } },
      data: { forwarded: true },
    });

    res.json({
      success: true,
      message: `转发成功：已将 ${selectedItems.length} 条明细转发给 ${targetEmployee.name}`,
      data: {
        id: newPlan.id,
        planNo: newPlan.planNo,
        title: newPlan.title,
        assigneeName: newPlan.assignee?.name,
        itemCount: newPlan.items.length,
        remark: forwardRemark,
      },
    });
  } catch (err) { next(err); }
});

// ============================================================
// 采购订单
// ============================================================

// 可下单的采购计划明细（数据隔离）
router.get('/orders/available-plans', async (req, res, next) => {
  try {
    // 数据隔离：非采购角色不返回可下单数据
    if (!(await hasPlanViewAccess(req.user))) {
      return res.json({ success: true, data: [] });
    }

    // 支持按供应商过滤
    const { supplierId } = req.query;

    // 查询已确认的采购计划（含明细），排除已转发的明细
    const where = {
      status: 'CONFIRMED',
      items: { some: { forwarded: false } },
    };

    // 数据隔离过滤
    const dataFilter = await getPlanDataFilter(req.user);
    if (dataFilter) {
      if (dataFilter.OR) {
        // PURCHASE_STAFF 的 OR 条件需与基础条件 AND 组合
        where.AND = [{ status: 'CONFIRMED', items: { some: { forwarded: false } } }, dataFilter];
        delete where.status;
        delete where.items;
      } else if (dataFilter.id === '___NO_ACCESS___') {
        return res.json({ success: true, data: [] });
      } else {
        Object.assign(where, dataFilter);
      }
    }

    const plans = await prisma.purchasePlan.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, empNo: true } },
        items: {
          where: { forwarded: false },
          include: {
            material: { select: { id: true, code: true, name: true, spec: true, unit: true, purchaseUnit: true, salesUnit: true, purchaseConversionFactor: true, salesConversionFactor: true } },
            supplier: { select: { id: true, code: true, name: true } },
            grade: { select: { id: true, code: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 过滤出还有剩余可下单数量的明细（actualQty - orderedQty > 0，确认后的计划用实际采购数量）
    let result = plans
      .map((plan) => ({
        ...plan,
        items: plan.items
          .filter((it) => (it.actualQty - it.orderedQty) > 0)
          .map((it) => ({
            ...it,
            remainingQty: it.actualQty - it.orderedQty,
            budgetUnitPrice: Number(it.budgetUnitPrice),
            budgetTotal: Number(it.budgetTotal),
            unitPrice: Number(it.unitPrice),
            actualQty: Number(it.actualQty),
          })),
      }))
      .filter((plan) => plan.items.length > 0);

    // 按供应商过滤（前端传入supplierId时）
    if (supplierId) {
      result = result
        .map((plan) => ({
          ...plan,
          items: plan.items.filter((it) => it.supplierId === supplierId),
        }))
        .filter((plan) => plan.items.length > 0);
    }

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// 列表
router.get('/orders', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '', supplierId = '', warehouseId = '', dateStart = '', dateEnd = '' } = req.query;
    const where = {};
    // 组织过滤：当前组织 + 未分配组织的旧记录（防御性兼容）
    if (req.orgCode) where.orgCode = req.orgCode;

    if (keyword) {
      // 关联搜索：订单编号 + 供应商名称
      where.OR = [
        { orderNo: { contains: keyword } },
        { supplier: { name: { contains: keyword } } },
      ];
    }
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (dateStart) where.orderDate = { ...where.orderDate, gte: new Date(dateStart) };
    if (dateEnd) where.orderDate = { ...where.orderDate, lte: new Date(dateEnd + 'T23:59:59') };

    const [list, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, code: true, name: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          purchasePlan: { select: { id: true, planNo: true, title: true } },
          buyer: { select: { id: true, name: true } },
          items: {
            include: {
              material: { select: { id: true, code: true, name: true, spec: true, unit: true, purchaseUnit: true, salesUnit: true, purchaseConversionFactor: true, salesConversionFactor: true } },
              planItem: { include: { plan: { select: { id: true, planNo: true, title: true } } } },
              grade: { select: { id: true, code: true, name: true, sortOrder: true } },
            },
          },
          _count: { select: { receipts: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 详情（含收货记录）
router.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        warehouse: true,
        purchasePlan: { select: { id: true, planNo: true, title: true } },
        buyer: { select: { id: true, name: true, empNo: true } },
        contract: { select: { id: true, contractNo: true } },
        items: {
          include: {
            material: { select: { id: true, code: true, name: true, spec: true, unit: true, purchaseUnit: true, salesUnit: true, purchaseConversionFactor: true, salesConversionFactor: true } },
            planItem: { include: { plan: { select: { id: true, planNo: true, title: true } } } },
            grade: { select: { id: true, code: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        receipts: {
          include: {
            batch: { select: { id: true, batchNo: true } },
            location: { select: { id: true, code: true, name: true } },
          },
          orderBy: { receiptDate: 'desc' },
        },
      },
    });
    if (!order) return res.status(404).json({ success: false, message: '采购订单不存在' });
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

// 创建（支持多明细，跨采购计划整合为一个采购订单）
router.post('/orders', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const {
      supplierId, warehouseId,
      orderDate, expectedDate, contractId, notes,
      items,
    } = req.body;

    if (!supplierId || !warehouseId) {
      return res.status(400).json({ success: false, message: '供应商、仓库必填' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: '至少需要选择一条明细' });
    }

    const orderNo = genNo('PO');

    // 计算各明细金额
    const orderItems = items.map((it) => {
      const qty = Number(it.qty) || 0;
      const unitPrice = Number(it.unitPrice) || 0;
      const taxRate = Number(it.taxRate) || 0;
      const totalAmount = qty * unitPrice;
      const taxAmount = totalAmount * taxRate / 100;
      const grandTotal = totalAmount + taxAmount;
      return {
        planItemId: it.planItemId || null,
        materialId: it.materialId,
        gradeId: it.gradeId || null,
        qty,
        unitPrice,
        taxRate,
        totalAmount,
        taxAmount,
        grandTotal,
        remark: it.remark || null,
      };
    });

    // 汇总订单头金额
    const totalAmount = orderItems.reduce((s, it) => s + it.totalAmount, 0);
    const taxAmount = orderItems.reduce((s, it) => s + it.taxAmount, 0);
    const grandTotal = orderItems.reduce((s, it) => s + it.grandTotal, 0);
    const totalQty = orderItems.reduce((s, it) => s + it.qty, 0);
    const avgUnitPrice = totalQty > 0 ? totalAmount / totalQty : 0;
    const avgTaxRate = totalAmount > 0 ? taxAmount / totalAmount * 100 : 0;

    // 取第一个明细关联的计划作为主计划（兼容旧字段）
    const firstPlanItemId = orderItems.find((it) => it.planItemId)?.planItemId;
    let purchasePlanId = null;
    if (firstPlanItemId) {
      const planItem = await prisma.purchasePlanItem.findUnique({ where: { id: firstPlanItemId } });
      purchasePlanId = planItem?.planId || null;
    }

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNo,
        orgCode: req.orgCode || null,  // 创建时锁定组织
        supplierId,
        purchasePlanId,
        purchasePlanItemId: firstPlanItemId || null,
        warehouseId,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        qty: totalQty,
        unitPrice: avgUnitPrice,
        taxRate: avgTaxRate,
        totalAmount,
        taxAmount,
        grandTotal,
        contractId: contractId || null,
        status: 'PENDING',
        buyerId: req.user.employeeId || null,
        notes: notes || null,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: { material: { select: { id: true, code: true, name: true, spec: true, unit: true, purchaseUnit: true, salesUnit: true, purchaseConversionFactor: true, salesConversionFactor: true } }, planItem: { include: { plan: { select: { id: true, planNo: true } } } } },
        },
      },
    });

    // 更新各计划明细的已下单数量
    for (const it of orderItems) {
      if (it.planItemId) {
        await prisma.purchasePlanItem.update({
          where: { id: it.planItemId },
          data: { orderedQty: { increment: it.qty } },
        });
      }
    }

    res.json({ success: true, data: order, message: `采购订单 ${orderNo} 创建成功，共 ${orderItems.length} 条明细` });
  } catch (err) { next(err); }
});

// 更新（仅PENDING可改，支持明细增删改）
router.put('/orders/:id', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const existing = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { items: { select: { id: true, planItemId: true, qty: true } } },
    });
    if (!existing) return res.status(404).json({ success: false, message: '采购订单不存在' });
    if (existing.status !== 'PENDING') return res.status(400).json({ success: false, message: '仅待审批状态可编辑' });

    const { supplierId, warehouseId, expectedDate, notes, items } = req.body;

    // 如果传了 items，做明细增删改 + 金额重算 + 计划数量同步
    if (items && Array.isArray(items)) {
      const oldItemsMap = new Map(existing.items.map((it) => [it.id, it]));
      const newItemIds = new Set(items.filter((it) => it.id).map((it) => it.id));

      // 1. 删除被移除的明细，释放对应计划数量
      for (const oldItem of existing.items) {
        if (!newItemIds.has(oldItem.id)) {
          if (oldItem.planItemId) {
            await prisma.purchasePlanItem.update({
              where: { id: oldItem.planItemId },
              data: { orderedQty: { decrement: oldItem.qty } },
            });
          }
          await prisma.purchaseOrderItem.delete({ where: { id: oldItem.id } });
        }
      }

      // 2. 更新已有明细 / 创建新明细
      const processedItems = [];
      for (const it of items) {
        const qty = Number(it.qty) || 0;
        const unitPrice = Number(it.unitPrice) || 0;
        const taxRate = Number(it.taxRate) || 0;
        const totalAmount = qty * unitPrice;
        const taxAmount = totalAmount * taxRate / 100;
        const grandTotal = totalAmount + taxAmount;

        const itemData = {
          planItemId: it.planItemId || null,
          materialId: it.materialId,
          qty, unitPrice, taxRate, totalAmount, taxAmount, grandTotal,
          remark: it.remark || null,
        };

        if (it.id && oldItemsMap.has(it.id)) {
          // 更新已有 — 如果关联了计划，先减旧数量再加新数量
          const old = oldItemsMap.get(it.id);
          if (old.planItemId && old.planItemId === it.planItemId) {
            const diff = qty - old.qty;
            if (diff !== 0) {
              await prisma.purchasePlanItem.update({
                where: { id: old.planItemId },
                data: { orderedQty: { increment: diff } },
              });
            }
          } else {
            // 计划关联变了 — 释放旧的，增加新的
            if (old.planItemId) {
              await prisma.purchasePlanItem.update({
                where: { id: old.planItemId },
                data: { orderedQty: { decrement: old.qty } },
              });
            }
            if (it.planItemId) {
              await prisma.purchasePlanItem.update({
                where: { id: it.planItemId },
                data: { orderedQty: { increment: qty } },
              });
            }
          }
          await prisma.purchaseOrderItem.update({ where: { id: it.id }, data: itemData });
          processedItems.push({ ...itemData, id: it.id });
        } else {
          // 新增
          if (it.planItemId) {
            await prisma.purchasePlanItem.update({
              where: { id: it.planItemId },
              data: { orderedQty: { increment: qty } },
            });
          }
          const created = await prisma.purchaseOrderItem.create({
            data: { ...itemData, orderId: req.params.id },
          });
          processedItems.push({ ...itemData, id: created.id });
        }
      }

      // 3. 重算订单头金额
      const totalAmt = processedItems.reduce((s, it) => s + it.totalAmount, 0);
      const taxAmt = processedItems.reduce((s, it) => s + it.taxAmount, 0);
      const grandTotal = processedItems.reduce((s, it) => s + it.grandTotal, 0);
      const totalQty = processedItems.reduce((s, it) => s + it.qty, 0);
      const avgUnitPrice = totalQty > 0 ? totalAmt / totalQty : 0;
      const avgTaxRate = totalAmt > 0 ? taxAmt / totalAmt * 100 : 0;

      const order = await prisma.purchaseOrder.update({
        where: { id: req.params.id },
        data: {
          supplierId, warehouseId,
          expectedDate: expectedDate ? new Date(expectedDate) : undefined,
          notes,
          qty: totalQty, unitPrice: avgUnitPrice, taxRate: avgTaxRate,
          totalAmount: totalAmt, taxAmount: taxAmt, grandTotal,
        },
        include: {
          items: {
            include: { material: { select: { id: true, code: true, name: true, spec: true, unit: true, purchaseUnit: true, salesUnit: true, purchaseConversionFactor: true, salesConversionFactor: true } }, planItem: { include: { plan: { select: { id: true, planNo: true } } } } },
          },
        },
      });
      return res.json({ success: true, data: order, message: '订单及明细已更新' });
    }

    // 无 items 时只更新头部
    const order = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        supplierId, warehouseId,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        notes,
      },
    });
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

// 状态流转
router.put('/orders/:id/status', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const { status } = req.body;
    const validTransitions = {
      PENDING: ['ORDERED'],
      ORDERED: [],
    };
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ success: false, message: '采购订单不存在' });
    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({ success: false, message: `状态不可从 ${order.status} 变更为 ${status}` });
    }
    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status },
    });

    // 批准下单时，自动创建1条入库单（含N条明细）
    if (status === 'ORDERED') {
      const receiptNo = genNo('RC');
      await prisma.purchaseReceipt.create({
        data: {
          receiptNo,
          purchaseOrderId: order.id,
          warehouseId: order.warehouseId,
          orgCode: order.orgCode,
          materialId: null,
          receiptDate: null,
          receivedQty: 0,
          unitPrice: 0,
          taxRate: 0,
          totalAmount: 0,
          qcResult: 'PENDING',
          status: 'PENDING',
          remark: `由采购订单 ${order.orderNo} 批准下单自动生成`,
          items: {
            create: order.items.map(item => ({
              orderItemId: item.id,
              materialId: item.materialId,
              receivedQty: 0,
              unitPrice: item.unitPrice,
              totalAmount: Number(item.totalAmount) || (Number(item.qty) * Number(item.unitPrice)),
              qcResult: 'PENDING',
              status: 'PENDING',
            })),
          },
        },
      });
    }

    res.json({ success: true, data: updated, message: status === 'ORDERED' ? `订单已下单，已自动生成 1 条入库单（含 ${order.items.length} 条明细）` : '' });
  } catch (err) { next(err); }
});

// 删除（仅PENDING）
router.delete('/orders/:id', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { items: { select: { id: true, planItemId: true, qty: true } } },
    });
    if (!order) return res.status(404).json({ success: false, message: '采购订单不存在' });
    if (order.status !== 'PENDING') return res.status(400).json({ success: false, message: '仅待审批状态可删除' });

    // 释放采购计划明细的已下单数量
    for (const item of order.items) {
      if (item.planItemId) {
        await prisma.purchasePlanItem.update({
          where: { id: item.planItemId },
          data: { orderedQty: { decrement: item.qty } },
        });
      }
    }

    await prisma.purchaseOrder.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '删除成功，已释放采购计划数量' });
  } catch (err) { next(err); }
});

// ============================================================
// 收货入库（核心：自动创建批次+更新库存+记录移动）
// ============================================================

// 入库记录列表
router.get('/receipts', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '', orderId = '', batchNo = '', supplierId = '', startDate = '', endDate = '' } = req.query;
    const where = {};
    // 组织过滤：当前组织
    if (req.orgCode) where.orgCode = req.orgCode;
    if (keyword) where.OR = [{ receiptNo: { contains: keyword } }];
    if (status) where.status = status;
    if (orderId) where.purchaseOrderId = orderId;
    if (supplierId) where.purchaseOrder = { supplierId };
    if (startDate || endDate) {
      where.receiptDate = {};
      if (startDate) where.receiptDate.gte = new Date(startDate);
      if (endDate) where.receiptDate.lte = new Date(endDate + 'T23:59:59');
    }
    if (batchNo) where.items = { some: { batch: { batchNo: { contains: batchNo } } } };

    const [list, total] = await Promise.all([
      prisma.purchaseReceipt.findMany({
        where,
        include: {
          purchaseOrder: {
            select: { id: true, orderNo: true, supplier: { select: { id: true, name: true } } },
          },
          warehouse: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, code: true, name: true } },
          items: {
            include: {
              material: {
                include: {
                  materialGrades: {
                    include: {
                      grade: {
                        select: { id: true, code: true, name: true },
                      },
                    },
                  },
                },
              },
              orderItem: { select: { id: true, qty: true, gradeId: true, grade: { select: { id: true, code: true, name: true } } } },
              batch: { select: { id: true, batchNo: true, status: true } },
              grade: { select: { id: true, code: true, name: true } },
            },
          },
          inspector: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { receiptDate: 'desc' },
      }),
      prisma.purchaseReceipt.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 创建收货入库记录（自动联动批次/库存/移动/追溯）
router.post('/receipts', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const {
      purchaseOrderId, warehouseId, locationId, materialId,
      receiptDate, receivedQty, unitPrice, taxRate,
      productionDate, expiryDate, qcResult, inspectorId, remark,
      gradeId,
    } = req.body;

    if (!purchaseOrderId || !warehouseId || !materialId || !receivedQty) {
      return res.status(400).json({ success: false, message: '采购订单、仓库、物料、收货数量必填' });
    }

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { supplier: true },
    });
    if (!order) return res.status(400).json({ success: false, message: '采购订单不存在' });

    const receiptNo = genNo('RC');
    const totalAmount = receivedQty * (unitPrice || order.unitPrice);

    // 1. 获取物料信息（用于计算过期日期 + 单位换算）
    const material = await prisma.material.findUnique({ where: { id: materialId } });
    let _expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (!_expiryDate && material?.shelfLifeDays && productionDate) {
      _expiryDate = new Date(new Date(productionDate).getTime() + material.shelfLifeDays * 86400000);
    }

    // 单位换算：receivedQty 是采购单位数量，转换为基准单位用于库存/移动
    const baseReceivedQty = Number(purchaseQtyToBase(receivedQty, material));
    const _unitPrice = unitPrice || order.unitPrice;
    const baseUnitPrice = Number(purchaseUnitPriceToBase(_unitPrice, material));

    // 2. 创建批次（receivedQty/remainingQty 用基准单位）
    const batchNo = genNo('B');
    const batch = await prisma.batch.create({
      data: {
        batchNo,
        materialId,
        supplierId: order.supplierId,
        productionDate: productionDate ? new Date(productionDate) : null,
        expiryDate: _expiryDate,
        receivedQty: baseReceivedQty,
        remainingQty: baseReceivedQty,
        status: 'ACTIVE',
      },
    });

    // 3. 创建入库记录（receivedQty/unitPrice 保持采购单位，用于合同/财务参考）
    const receipt = await prisma.purchaseReceipt.create({
      data: {
        receiptNo,
        orgCode: req.orgCode || null,  // 创建时锁定组织
        purchaseOrderId,
        warehouseId,
        locationId: locationId || null,
        materialId,
        receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
        receivedQty,
        unitPrice: _unitPrice,
        taxRate: taxRate ?? order.taxRate,
        totalAmount,
        batchId: batch.id,
        inspectorId: inspectorId || null,
        qcResult: qcResult || 'PASS',
        status: 'CONFIRMED',
        remark: remark || null,
      },
    });

    // 4. 更新库存（使用基准单位数量）
    const inventoryWhere = { materialId_warehouseId: { materialId, warehouseId } };
    await prisma.inventory.upsert({
      where: inventoryWhere,
      create: { materialId, warehouseId, locationId: locationId || null, qty: baseReceivedQty, lockedQty: 0 },
      update: { qty: { increment: baseReceivedQty } },
    });

    // 5. 创建库存移动记录（使用基准单位数量）
    const movementNo = genNo('SM');
    await prisma.stockMovement.create({
      data: {
        movementNo,
        warehouseId,
        locationId: locationId || null,
        materialId,
        batchId: batch.id,
        gradeId: gradeId || null,
        movementType: 'PURCHASE_RECEIPT',
        direction: 'IN',
        qty: baseReceivedQty,
        movementDate: receipt.receiptDate || new Date(),
        refType: 'PURCHASE_RECEIPT',
        refId: receipt.id,
        operatorId: req.user.employeeId || null,
        remark: `采购入库 ${receiptNo}`,
      },
    });

    // 6. 创建批次追溯记录（使用基准单位数量）
    await prisma.batchTracking.create({
      data: {
        batchId: batch.id,
        movementType: 'PURCHASE_RECEIPT',
        refType: 'PURCHASE_RECEIPT',
        refId: receipt.id,
        toLocation: locationId || null,
        qty: baseReceivedQty,
        operatorId: req.user.employeeId || null,
        remark: `采购入库 批次${batchNo}`,
      },
    });

    // 7. 更新采购订单收货状态（使用采购单位数量比较）
    const newReceivedQty = order.receivedQty + receivedQty;
    let receiptStatus = 'PARTIAL';
    if (newReceivedQty >= order.qty) receiptStatus = 'FULL';
    await prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        receivedQty: newReceivedQty,
        receiptStatus,
        status: newReceivedQty >= order.qty ? 'RECEIVING' : order.status,
      },
    });

    // 8. 更新物料最新入库价（转换为基准单位单价，用于成本价计算）
    await prisma.material.update({
      where: { id: materialId },
      data: {
        latestReceiptPrice: baseUnitPrice,
        latestReceiptDate: new Date(),
      },
    });

    // 9. 自动创建应付账款
    const _taxRate = taxRate ?? order.taxRate ?? 0;
    const _taxAmount = totalAmount * _taxRate / 100;
    const _grandTotal = totalAmount + _taxAmount;
    const apNo = genNo('AP');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30天账期
    await prisma.accountsPayable.create({
      data: {
        apNo,
        supplierId: order.supplierId,
        refType: 'PURCHASE_RECEIPT',
        refId: receipt.id,
        amount: _grandTotal,
        paidAmount: 0,
        balance: _grandTotal,
        dueDate,
        status: 'PENDING',
      },
    });

    // 10. 更新采购计划明细已收数量
    if (order.purchasePlanItemId) {
      await prisma.purchasePlanItem.update({
        where: { id: order.purchasePlanItemId },
        data: { receivedQty: { increment: receivedQty } },
      });
    }

    res.json({ success: true, data: { receipt, batchNo: batch.batchNo, apNo } });
  } catch (err) { next(err); }
});

// 收货记录详情
router.get('/receipts/:id', async (req, res, next) => {
  try {
    const receipt = await prisma.purchaseReceipt.findUnique({
      where: { id: req.params.id },
      include: {
        purchaseOrder: {
          include: { supplier: true, warehouse: true },
        },
        warehouse: true,
        location: true,
        material: true,
        batch: true,
        inspector: { select: { id: true, name: true } },
      },
    });
    if (!receipt) return res.status(404).json({ success: false, message: '入库记录不存在' });
    res.json({ success: true, data: receipt });
  } catch (err) { next(err); }
});

// 更新收货数量（仅未入库状态可编辑）
router.put('/receipts/:id/qty', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const { receivedQty } = req.body;
    if (receivedQty === undefined || receivedQty === null || Number(receivedQty) < 0) {
      return res.status(400).json({ success: false, message: '收货数量必须 ≥ 0' });
    }
    const receipt = await prisma.purchaseReceipt.findUnique({ where: { id: req.params.id } });
    if (!receipt) return res.status(404).json({ success: false, message: '入库记录不存在' });
    if (receipt.status !== 'PENDING') return res.status(400).json({ success: false, message: '已入库记录不可修改收货数量' });
    const updated = await prisma.purchaseReceipt.update({
      where: { id: req.params.id },
      data: { receivedQty: Number(receivedQty) },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// 收货明细上传质检附件（上传后立即保存，不需等到确认入库）
router.put('/receipts/items/:itemId/qc-upload', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER, ROLES.WAREHOUSE_STAFF), qcUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '请选择要上传的附件' });
    const item = await prisma.purchaseReceiptItem.findUnique({
      where: { id: req.params.itemId },
      include: { receipt: true },
    });
    if (!item) return res.status(404).json({ success: false, message: '入库明细不存在' });
    if (item.receipt.status !== 'PENDING') return res.status(400).json({ success: false, message: '已入库明细不可上传质检附件' });

    // 删除旧附件
    if (item.qcAttachment) {
      const oldPath = path.join(__dirname, '../../..', item.qcAttachment);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const filePath = `/uploads/qc/${req.file.filename}`;
    const updated = await prisma.purchaseReceiptItem.update({
      where: { id: req.params.itemId },
      data: { qcResult: 'INSPECTED', qcAttachment: filePath },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// 上传质检附件（上传后 qcResult → INSPECTED）
router.put('/receipts/:id/qc-upload', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER, ROLES.WAREHOUSE_STAFF), qcUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '请选择要上传的附件' });
    const receipt = await prisma.purchaseReceipt.findUnique({ where: { id: req.params.id } });
    if (!receipt) return res.status(404).json({ success: false, message: '入库记录不存在' });
    if (receipt.status !== 'PENDING') return res.status(400).json({ success: false, message: '已入库记录不可上传质检附件' });

    // 删除旧附件
    if (receipt.qcAttachment) {
      const oldPath = path.join(process.cwd(), receipt.qcAttachment);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const filePath = `/uploads/qc/${req.file.filename}`;
    const updated = await prisma.purchaseReceipt.update({
      where: { id: req.params.id },
      data: { qcResult: 'INSPECTED', qcAttachment: filePath },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// 确认入库（处理入库单下所有明细：逐条创建批次/库存/移动/应付）
// 前端 FormData:
//   items: JSON string [{id, receivedQty}, ...]
//   file_<itemId>: 每条明细的质检附件（multer.any() 接收）
// ========================
// 金蝶同步：SCM 采购入库 → 金蝶采购订单 + 入库单
// ========================

const SCM_UNIT_TO_KINGDEE = {
  '斤': 'jin',
  '千克': 'kg',
  '磅': 'lb',
  '克': 'g',
  '吨': 'ton',
  '升': 'l',
  '毫升': 'ml',
  '个': 'ge',
  '箱': 'xiang',
  '包': 'bao',
  '袋': 'dai',
  '套': 'tao',
  '米': 'm',
};

function toKingdeeUnit(scmUnit) {
  return SCM_UNIT_TO_KINGDEE[scmUnit] || scmUnit?.toLowerCase() || 'ge';
}

/**
 * 异步推送采购入库单到金蝶（不阻塞用户响应）
 */
/**
 * 推送入库单到金蝶（纯函数，不更新 SCM 入库单状态，由调用方决定）
 * @returns {{ success: boolean, poNo?: string, inboundNo?: string, error?: string }}
 */
async function pushToKingdee({ supplierCode, warehouseCode, date, entries, orgCodeParam, receiveSendTypeId }) {
  try {
    if (!supplierCode || !warehouseCode) {
      return { success: false, error: '供应商或仓库金蝶编码缺失' };
    }
    if (!entries.length || entries.some(e => !e.materialCode)) {
      return { success: false, error: '物料金蝶编码缺失' };
    }

    const adapter = getKingdeeAdapter();
    // 显式传入的组织编码优先，否则从仓库编码推导（兼容旧逻辑）
    const orgCode = orgCodeParam || (warehouseCode?.length >= 5 ? warehouseCode.substring(0, 5) : '10001');

    // Step 1: 创建金蝶采购订单
    const poResult = await adapter.createPurchaseOrder({
      supplierCode,
      date,
      entries,
      purchaseOrgCode: orgCode,
      receiveSendTypeId,
    });
    if (!poResult.success) return { success: false, error: poResult.error || '采购订单创建失败' };

    // Step 2: 创建金蝶采购入库单
    const inboundResult = await adapter.createInboundReceipt({
      supplierCode,
      date,
      entries,
      sourceBillNo: poResult.billNo,
      stockOrgCode: orgCode,
      receiveSendTypeId,
    });
    if (!inboundResult.success) return { success: false, error: inboundResult.error || '入库单创建失败' };

    return { success: true, poNo: poResult.billNo, inboundNo: inboundResult.billNo };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * 重试金蝶同步（用于已确认入库但金蝶推送失败的入库单）
 */
async function retrySyncReceiptToKingdee(receiptId) {
  const receipt = await prisma.purchaseReceipt.findUnique({
    where: { id: receiptId },
    include: {
      purchaseOrder: { include: { supplier: true } },
      warehouse: true,
      items: { include: { material: true } },
    },
  });
  if (!receipt) return { success: false, error: '入库单不存在' };
  if (receipt.status !== 'CONFIRMED') return { success: false, error: '入库单未确认' };

  const supplierCode = receipt.purchaseOrder?.supplier?.code;
  const warehouseCode = receipt.warehouse?.code;
  const date = receipt.receiptDate ? new Date(receipt.receiptDate).toISOString().slice(0, 10) : undefined;

  const entries = receipt.items.map(item => ({
    materialCode: item.material?.code,
    qty: item.receivedQty,
    price: Number(item.unitPrice),
    unitCode: toKingdeeUnit(item.material?.purchaseUnit),
    warehouseCode,
    note: `SCM入库单${receipt.receiptNo}`,
  }));

  const result = await pushToKingdee({ supplierCode, warehouseCode, date, entries, orgCodeParam: receipt.orgCode, receiveSendTypeId: receipt.receiveSendTypeId });

  if (result.success) {
    await prisma.purchaseReceipt.update({
      where: { id: receiptId },
      data: {
        kingdeeSyncStatus: 'SYNCED',
        kingdeeSyncMessage: null,
        kingdeeOrderNo: result.poNo,
        kingdeeInboundNo: result.inboundNo,
      },
    });
    console.log(`[金蝶] 重试推送成功: 入库单=${receipt.receiptNo}, 采购订单=${result.poNo}, 入库单=${result.inboundNo}`);
  } else {
    await prisma.purchaseReceipt.update({
      where: { id: receiptId },
      data: { kingdeeSyncStatus: 'FAILED', kingdeeSyncMessage: result.error },
    }).catch(() => {});
    console.error(`[金蝶] 重试推送失败: 入库单=${receipt.receiptNo}, 错误=${result.error}`);
  }

  return result;
}

const handleConfirmReceipt = async (req, res, next) => { try {
    const receipt = await prisma.purchaseReceipt.findUnique({
      where: { id: req.params.id },
      include: {
        purchaseOrder: { include: { supplier: true } },
        warehouse: true,
        items: { include: { material: true, orderItem: true } },
      },
    });
    if (!receipt) return res.status(404).json({ success: false, message: '入库记录不存在' });
    if (receipt.status !== 'PENDING') return res.status(400).json({ success: false, message: '该入库单已确认，不可重复操作' });

    // 0. 验证收发类别必填
    const receiveSendTypeId = req.body.receiveSendTypeId;
    if (!receiveSendTypeId) {
      return res.status(400).json({ success: false, message: '请选择收发类别' });
    }

    // 1. 解析前端提交的明细数据
    const itemsData = JSON.parse(req.body.items || '[]');
    if (!itemsData.length) return res.status(400).json({ success: false, message: '没有明细数据' });

    // 2. 匹配上传的文件（field name = file_<itemId>）
    const filesMap = {};
    (req.files || []).forEach(f => {
      const itemId = f.fieldname.replace('file_', '');
      filesMap[itemId] = f;
    });

    // 3. 逐条校验
    for (const itemData of itemsData) {
      const receivedQty = Number(itemData.receivedQty);
      if (!receivedQty || receivedQty <= 0) {
        return res.status(400).json({ success: false, message: '收货数量必须大于0' });
      }
      const receiptItem = receipt.items.find(i => i.id === itemData.id);
      if (!receiptItem) return res.status(400).json({ success: false, message: '明细不存在' });
      if (!filesMap[itemData.id] && !receiptItem.qcAttachment) {
        return res.status(400).json({ success: false, message: `请为【${receiptItem.material?.name}】上传质检附件` });
      }
    }

    // 4. ★ 先同步推送到金蝶（阻塞等待，失败则不执行入库）
    const supplierCode = receipt.purchaseOrder?.supplier?.code;
    const warehouseCode = receipt.warehouse?.code;
    const kingdeeEntries = itemsData.map(itemData => {
      const receiptItem = receipt.items.find(i => i.id === itemData.id);
      // 物料等级兜底：优先用入库明细 grade，回退到采购订单明细 grade
      const gradeCode = receiptItem?.grade?.code || receiptItem?.orderItem?.grade?.code;
      return {
        materialCode: receiptItem?.material?.code,
        qty: Number(itemData.receivedQty),
        price: Number(receiptItem?.unitPrice || 0),
        unitCode: toKingdeeUnit(receiptItem?.material?.purchaseUnit),
        warehouseCode,
        gradeCode,
        note: `SCM入库单${receipt.receiptNo}`,
      };
    });

    const date = receipt.receiptDate
      ? new Date(receipt.receiptDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const kingdeeResult = await pushToKingdee({
      supplierCode, warehouseCode, date, entries: kingdeeEntries, orgCodeParam: req.orgCode,
      receiveSendTypeId,
    });

    if (!kingdeeResult.success) {
      // 金蝶失败：入库单保持 PENDING 状态，记录失败原因
      await prisma.purchaseReceipt.update({
        where: { id: req.params.id },
        data: { kingdeeSyncStatus: 'FAILED', kingdeeSyncMessage: kingdeeResult.error },
      });
      console.error(`[金蝶] 确认入库时推送失败: 入库单=${receipt.receiptNo}, 错误=${kingdeeResult.error}`);
      return res.status(400).json({ success: false, message: `金蝶同步失败，未执行入库：${kingdeeResult.error}` });
    }

    console.log(`[金蝶] 确认入库时推送成功: 入库单=${receipt.receiptNo}, 采购订单=${kingdeeResult.poNo}, 入库单=${kingdeeResult.inboundNo}`);

    // 5. 金蝶成功 → 逐条执行入库联动
    const batchNos = [];
    const apNos = [];
    const order = receipt.purchaseOrder;
    const _warehouseId = receipt.warehouseId;

    for (const itemData of itemsData) {
      const receivedQty = Number(itemData.receivedQty);
      const receiptItem = receipt.items.find(i => i.id === itemData.id);
      const materialId = receiptItem.materialId;
      const file = filesMap[itemData.id];

      // 单位换算：receivedQty 是采购单位数量，转换为基准单位用于库存/移动
      const _material = receiptItem.material;
      const baseReceivedQty = Number(purchaseQtyToBase(receivedQty, _material));
      const baseUnitPrice = Number(purchaseUnitPriceToBase(Number(receiptItem.unitPrice), _material));

      // 5a. 处理质检附件
      let qcAttachment = receiptItem.qcAttachment;
      if (file) {
        if (qcAttachment) {
          const oldPath = path.join(process.cwd(), qcAttachment);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        qcAttachment = `/uploads/qc/${file.filename}`;
      }

      // 5b. 创建批次（receivedQty/remainingQty 用基准单位）
      const batchNo = genNo('B');
      const batch = await prisma.batch.create({
        data: {
          batchNo,
          materialId,
          supplierId: order.supplierId,
          productionDate: null,
          expiryDate: null,
          receivedQty: baseReceivedQty,
          remainingQty: baseReceivedQty,
          status: 'ACTIVE',
        },
      });
      batchNos.push(batchNo);

      // 5c. 更新明细：收货数量、附件、批次、状态、等级
      const totalAmount = receivedQty * Number(receiptItem.unitPrice);
      const finalGradeId = itemData.gradeId || receiptItem.orderItem?.gradeId || null;
      await prisma.purchaseReceiptItem.update({
        where: { id: itemData.id },
        data: {
          receivedQty,
          qcAttachment,
          qcResult: 'INSPECTED',
          batchId: batch.id,
          gradeId: finalGradeId,
          totalAmount,
          status: 'CONFIRMED',
        },
      });

      // 5d. 更新库存
      const inventoryWhere = { materialId_warehouseId: { materialId, warehouseId: _warehouseId } };
      await prisma.inventory.upsert({
        where: inventoryWhere,
        create: { materialId, warehouseId: _warehouseId, locationId: null, qty: baseReceivedQty, lockedQty: 0 },
        update: { qty: { increment: baseReceivedQty } },
      });

      // 5e. 创建库存移动记录
      const movementNo = genNo('SM');
      await prisma.stockMovement.create({
        data: {
          movementNo,
          warehouseId: _warehouseId,
          materialId,
          batchId: batch.id,
          gradeId: finalGradeId,
          movementType: 'PURCHASE_RECEIPT',
          direction: 'IN',
          qty: baseReceivedQty,
          movementDate: receipt.receiptDate || new Date(),
          refType: 'PURCHASE_RECEIPT',
          refId: receipt.id,
          operatorId: req.user.employeeId || null,
          remark: `采购入库 ${receipt.receiptNo}`,
        },
      });

      // 5f. 创建批次追溯记录
      await prisma.batchTracking.create({
        data: {
          batchId: batch.id,
          movementType: 'PURCHASE_RECEIPT',
          refType: 'PURCHASE_RECEIPT',
          refId: receipt.id,
          toLocation: null,
          qty: baseReceivedQty,
          operatorId: req.user.employeeId || null,
          remark: `采购入库 批次${batchNo}`,
        },
      });

      // 5g. 更新物料最新入库价
      await prisma.material.update({
        where: { id: materialId },
        data: {
          latestReceiptPrice: baseUnitPrice,
          latestReceiptDate: new Date(),
        },
      });

      // 5h. 自动创建应付账款
      const _taxRate = Number(receiptItem.taxRate) || 0;
      const _taxAmount = totalAmount * _taxRate / 100;
      const _grandTotal = totalAmount + _taxAmount;
      const apNo = genNo('AP');
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      await prisma.accountsPayable.create({
        data: {
          apNo,
          supplierId: order.supplierId,
          refType: 'PURCHASE_RECEIPT',
          refId: receipt.id,
          amount: _grandTotal,
          paidAmount: 0,
          balance: _grandTotal,
          dueDate,
          status: 'PENDING',
        },
      });
      apNos.push(apNo);
    }

    // 6. 更新入库单状态为已确认 + 金蝶已同步
    await prisma.purchaseReceipt.update({
      where: { id: req.params.id },
      data: {
        status: 'CONFIRMED',
        orgCode: req.orgCode || null,
        receiptDate: new Date(),
        kingdeeSyncStatus: 'SYNCED',
        kingdeeSyncMessage: null,
        kingdeeOrderNo: kingdeeResult.poNo,
        kingdeeInboundNo: kingdeeResult.inboundNo,
        receiveSendTypeId,
      },
    });

    res.json({ success: true, data: { receiptNo: receipt.receiptNo, batchNos, apNos } });
  } catch (err) { next(err); }
};

// PUT: 更新入库单收发类别（确认入库前可选设置）
router.put('/receipts/:id/receive-send-type', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const { receiveSendTypeId } = req.body;
    if (!receiveSendTypeId) return res.status(400).json({ success: false, message: '请选择收发类别' });
    const receipt = await prisma.purchaseReceipt.findUnique({ where: { id: req.params.id } });
    if (!receipt) return res.status(404).json({ success: false, message: '入库记录不存在' });
    if (receipt.status !== 'PENDING') return res.status(400).json({ success: false, message: '该入库单已确认，不可修改' });
    await prisma.purchaseReceipt.update({ where: { id: req.params.id }, data: { receiveSendTypeId } });
    res.json({ success: true, message: '收发类别已更新' });
  } catch (err) { next(err); }
});

// POST: 确认入库（带多文件上传，multer.any() 接收 file_<itemId> 字段）
router.post('/receipts/:id/confirm', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER, ROLES.WAREHOUSE_STAFF), qcUpload.any(), handleConfirmReceipt);

// POST: 重新同步金蝶（入库单已确认但金蝶推送失败时重试）
router.post('/receipts/:id/retry-kingdee', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const result = await retrySyncReceiptToKingdee(req.params.id);
    if (!result.success) {
      return res.status(400).json({ success: false, message: `金蝶同步失败：${result.error}` });
    }
    res.json({ success: true, data: { poNo: result.poNo, inboundNo: result.inboundNo }, message: '金蝶同步成功' });
  } catch (err) { next(err); }
});

export default router;
