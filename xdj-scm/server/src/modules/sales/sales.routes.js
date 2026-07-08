import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import prisma from '../../shared/prisma.js';
import { salesQtyToBase, baseQtyToSales, baseUnitPriceToSales, getDisplayUnit } from '../../shared/unitConversion.js';
import multer from 'multer';
import * as XLSX from 'xlsx';
import axios from 'axios';

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    }
  },
});

// ============================================================
// 部门负责人判断（5分钟缓存 — 用于数据隔离）
// ============================================================
let _deptManagerCache = null;
let _deptManagerCacheTime = 0;
const DEPT_MGR_CACHE_TTL = 5 * 60 * 1000;

async function isDepartmentManager(userId) {
  const now = Date.now();
  if (_deptManagerCache && (now - _deptManagerCacheTime) < DEPT_MGR_CACHE_TTL) {
    return _deptManagerCache.has(userId);
  }
  const departments = await prisma.department.findMany({
    where: { managerId: { not: null } },
    select: { managerId: true },
  });
  const users = await prisma.user.findMany({
    select: { id: true, employeeId: true },
  });
  const managerEmployeeIds = new Set(departments.map(d => d.managerId));
  _deptManagerCache = new Set();
  for (const u of users) {
    if (u.employeeId && managerEmployeeIds.has(u.employeeId)) {
      _deptManagerCache.add(u.id);
    }
  }
  _deptManagerCacheTime = now;
  return _deptManagerCache.has(userId);
}

// ============================================================
// 工具函数
// ============================================================
function genNo(prefix) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${ymd}${rand}`;
}

const STATUS_COLORS = {
  DRAFT: 'default',
  PENDING: 'warning',
  PENDING_APPROVAL: 'warning',
  IN_APPROVAL: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  ACTIVE: 'success',
  INACTIVE: 'default',
  CONFIRMED: 'success',
  SHIPPING: 'info',
  DELIVERED: 'success',
  CLOSED: 'default',
  CANCELLED: 'error',
};

// ============================================================
// 销售计划
// ============================================================

// 需求汇总 — 按物料+供应商聚合所有已批准(APPROVED)且未推送采购的销售计划明细
router.get('/plans/demand-aggregation', async (req, res, next) => {
  try {
    const { status: statusFilter, showPushed } = req.query;
    const statuses = statusFilter ? [statusFilter] : ['APPROVED'];

    const plans = await prisma.salesPlan.findMany({
      where: { status: { in: statuses } },
      include: {
        salesRep: { select: { id: true, name: true } },
        items: {
          where: showPushed === 'true' ? undefined : { pushedToPurchase: false },
          include: {
            material: { select: { id: true, code: true, name: true, unit: true, category: true } },
            supplier: { select: { id: true, code: true, name: true } },
            customer: { select: { id: true, name: true } },
          },
        },
      },
    });

    // 按 materialId + supplierId 聚合
    const grouped = {};
    for (const plan of plans) {
      for (const it of plan.items) {
        const key = `${it.materialId}|${it.supplierId || 'none'}`;
        if (!grouped[key]) {
          grouped[key] = {
            key,
            materialId: it.materialId,
            material: it.material,
            supplierId: it.supplierId,
            supplier: it.supplier,
            totalQty: 0,
            totalAmount: 0,
            sources: [],
            sourceItemIds: [],
          };
        }
        grouped[key].totalQty += it.planQty || 0;
        grouped[key].totalAmount += Number(it.planAmount) || 0;
        grouped[key].sourceItemIds.push(it.id);
        grouped[key].sources.push({
          itemId: it.id,
          planNo: plan.planNo,
          planTitle: plan.title,
          salesRep: plan.salesRep?.name || '-',
          qty: it.planQty,
          amount: Number(it.planAmount),
          customer: it.customer?.name || '通用',
        });
      }
    }

    // 查询各物料的当前库存总量
    const materialIds = [...new Set(Object.values(grouped).map(g => g.materialId))];
    const inventories = await prisma.inventory.groupBy({
      by: ['materialId'],
      where: { materialId: { in: materialIds } },
      _sum: { qty: true },
    });
    const stockMap = {};
    for (const inv of inventories) {
      stockMap[inv.materialId] = inv._sum.qty || 0;
    }

    // 计算采购计划数 = 合计数量 - 当前库存（不低于0）
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const list = Object.values(grouped).map((it, idx) => {
      const stockQty = stockMap[it.materialId] || 0;
      const purchaseQty = Math.max(0, it.totalQty - stockQty);
      const aggNo = `DA${ymd}${String(idx + 1).padStart(3, '0')}`;
      return { ...it, aggNo, stockQty, purchaseQty };
    }).sort((a, b) => b.totalQty - a.totalQty);
    const summary = {
      totalItems: list.length,
      totalQty: list.reduce((s, i) => s + i.totalQty, 0),
      totalStock: list.reduce((s, i) => s + i.stockQty, 0),
      totalPurchase: list.reduce((s, i) => s + i.purchaseQty, 0),
      totalAmount: list.reduce((s, i) => s + i.totalAmount, 0),
      uniqueMaterials: new Set(list.map(i => i.materialId)).size,
      uniqueSuppliers: new Set(list.filter(i => i.supplierId).map(i => i.supplierId)).size,
      sourcePlans: plans.length,
    };

    res.json({ success: true, data: { list, summary } });
  } catch (err) { next(err); }
});

// 推送生成采购计划 — 从选中的需求汇总项生成采购计划
router.post('/plans/push-to-purchase', async (req, res, next) => {
  try {
    const { title, periodStart, periodEnd, remark, items } = req.body;
    if (!title) return res.status(400).json({ success: false, message: '计划标题必填' });
    if (!items || !items.length) return res.status(400).json({ success: false, message: '至少选择一条需求' });

    const creatorId = req.user.employeeId || req.user.userId;
    const planNo = genNo('PP');

    // 收集所有来源 SalesPlanItem ID，用于标记已推送
    const allSourceItemIds = [];
    for (const it of items) {
      if (it.sourceItemIds && Array.isArray(it.sourceItemIds)) {
        allSourceItemIds.push(...it.sourceItemIds);
      }
    }

    const plan = await prisma.purchasePlan.create({
      data: {
        planNo,
        title,
        planType: 'MONTHLY',
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        creatorId,
        remark: remark || '由销售需求汇总推送生成',
        status: 'DRAFT',
        items: {
          create: items.map(it => ({
            materialId: it.materialId,
            planQty: Number(it.planQty) || 0,
            unit: it.unit || null,
            demandAggNo: it.demandAggNo || null,
            expectedDate: it.expectedDate ? new Date(it.expectedDate) : null,
            remark: it.remark || null,
          })),
        },
      },
      include: { items: true },
    });

    // 标记对应的 SalesPlanItem 为已推送
    if (allSourceItemIds.length > 0) {
      await prisma.salesPlanItem.updateMany({
        where: { id: { in: allSourceItemIds } },
        data: { pushedToPurchase: true },
      });
    }

    res.json({ success: true, data: plan, message: `采购计划 ${planNo} 创建成功` });
  } catch (err) { next(err); }
});

// 推送历史 — 查询从需求汇总推送生成的采购计划
router.get('/plans/push-history', async (req, res, next) => {
  try {
    const { keyword = '' } = req.query;

    // 查询包含 demandAggNo 的采购计划明细
    const items = await prisma.purchasePlanItem.findMany({
      where: { demandAggNo: { not: null } },
      include: {
        material: { select: { id: true, code: true, name: true, unit: true, category: true } },
        plan: {
          select: {
            id: true, planNo: true, title: true, status: true,
            periodStart: true, periodEnd: true, createdAt: true, remark: true,
            creator: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { plan: { createdAt: 'desc' } },
    });

    // 按采购计划分组
    const planMap = {};
    for (const it of items) {
      const planId = it.planId;
      if (!planMap[planId]) {
        planMap[planId] = {
          planId,
          planNo: it.plan.planNo,
          title: it.plan.title,
          status: it.plan.status,
          periodStart: it.plan.periodStart,
          periodEnd: it.plan.periodEnd,
          createdAt: it.plan.createdAt,
          remark: it.plan.remark,
          creator: it.plan.creator?.name || '-',
          items: [],
        };
      }
      planMap[planId].items.push({
        demandAggNo: it.demandAggNo,
        material: it.material,
        planQty: it.planQty,
        unit: it.unit,
        remark: it.remark,
      });
    }

    let list = Object.values(planMap);

    // 关键词过滤
    if (keyword) {
      const kw = keyword.toLowerCase();
      list = list.filter(p =>
        p.planNo.toLowerCase().includes(kw) ||
        p.title.toLowerCase().includes(kw) ||
        p.items.some(it => it.material?.name?.toLowerCase().includes(kw) || it.demandAggNo?.toLowerCase().includes(kw))
      );
    }

    const summary = {
      totalPlans: list.length,
      totalItems: list.reduce((s, p) => s + p.items.length, 0),
      totalQty: list.reduce((s, p) => s + p.items.reduce((ss, it) => ss + it.planQty, 0), 0),
    };

    res.json({ success: true, data: { list, summary } });
  } catch (err) { next(err); }
});

// 列表
router.get('/plans', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '', showAggregated, planType = '', customerId = '', dateStart = '', dateEnd = '' } = req.query;
    const where = {};
    if (keyword) where.OR = [{ planNo: { contains: keyword } }, { title: { contains: keyword } }];
    if (status) where.status = status;
    if (planType) where.planType = planType;

    // 日期范围
    if (dateStart || dateEnd) {
      where.createdAt = {};
      if (dateStart) where.createdAt.gte = new Date(dateStart + 'T00:00:00');
      if (dateEnd) where.createdAt.lte = new Date(dateEnd + 'T23:59:59');
    }

    // 客户筛选（查 items 中包含指定客户）
    if (customerId) {
      where.items = { some: { customerId } };
    }

    // 默认只显示还有未推送明细的计划（即未完全汇总的）
    if (showAggregated !== 'true' && !customerId) {
      where.items = { some: { pushedToPurchase: false } };
    } else if (showAggregated !== 'true' && customerId) {
      // 已有 customerId 的 items 条件，需同时满足 pushedToPurchase
      where.items = { some: { customerId, pushedToPurchase: false } };
    }

    // ======== 数据隔离（按提报人 salesRepId）========
    const user = req.user;
    const role = user.role;
    if (role !== ROLES.SUPER_ADMIN) {
      const isManager = await isDepartmentManager(user.userId);
      if (isManager && user.departmentId) {
        const deptMembers = await prisma.employee.findMany({
          where: { departmentId: user.departmentId },
          select: { id: true },
        });
        const deptEmployeeIds = deptMembers.map(e => e.id);
        where.salesRepId = deptEmployeeIds.length > 0 ? { in: deptEmployeeIds } : { in: ['__none__'] };
      } else if (
        role === ROLES.SALES_MANAGER ||
        role === ROLES.SALES_STAFF ||
        role === 'SALES_REP'
      ) {
        where.salesRepId = user.employeeId || null;
      } else {
        where.salesRepId = user.employeeId || null;
      }
    }

    const [list, total] = await Promise.all([
      prisma.salesPlan.findMany({
        where,
        include: {
          salesRep: { select: { id: true, name: true, empNo: true } },
          department: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
          _count: { select: { items: true, salesOrders: true } },
          items: {
            select: { id: true, pushedToPurchase: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.salesPlan.count({ where }),
    ]);

    // 计算汇总状态
    const listWithAgg = list.map(plan => {
      const totalItems = plan.items?.length || 0;
      const pushedItems = plan.items?.filter(it => it.pushedToPurchase).length || 0;
      const aggStatus = totalItems === 0 ? 'NONE' : pushedItems === totalItems ? 'ALL_PUSHED' : pushedItems > 0 ? 'PARTIAL' : 'NONE';
      // 不返回 items 明细数组（列表不需要）
      const { items, ...rest } = plan;
      return { ...rest, aggStatus, pushedItems, totalItems };
    });

    res.json({ success: true, data: { list: listWithAgg, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 详情
router.get('/plans/:id', async (req, res, next) => {
  try {
    const plan = await prisma.salesPlan.findUnique({
      where: { id: req.params.id },
      include: {
        salesRep: true,
        department: true,
        approver: { select: { id: true, name: true } },
        items: {
          include: {
            customer: { select: { id: true, name: true } },
            material: {
              include: { materialGrades: { include: { grade: true }, orderBy: { grade: { sortOrder: 'asc' } } } },
            },
            supplier: { select: { id: true, name: true, code: true } },
            grade: { select: { id: true, name: true, code: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!plan) return res.status(404).json({ success: false, message: '销售计划不存在' });
    res.json({ success: true, data: plan });
  } catch (err) { next(err); }
});

// 创建 — 提报人自动取当前登录用户
router.post('/plans', authorize(ROLES.SALES_MANAGER, ROLES.SALES_REP, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { title, planType, departmentId, remark, items } = req.body;
    const salesRepId = req.user.employeeId;
    if (!salesRepId) return res.status(400).json({ success: false, message: '当前用户未关联员工信息，无法提报' });

    // 根据 planType 自动计算周期
    const now = new Date();
    const type = planType || 'WEEKLY';
    let periodStart, periodEnd;
    if (type === 'WEEKLY') {
      const day = now.getDay() || 7; // 周日=7
      periodStart = new Date(now); periodStart.setDate(now.getDate() - day + 1);
      periodEnd = new Date(periodStart); periodEnd.setDate(periodStart.getDate() + 6);
    } else if (type === 'MONTHLY') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === 'QUARTERLY') {
      const q = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), q * 3, 1);
      periodEnd = new Date(now.getFullYear(), q * 3 + 3, 0);
    } else {
      periodStart = new Date(now.getFullYear(), 0, 1);
      periodEnd = new Date(now.getFullYear(), 11, 31);
    }

    const plan = await prisma.salesPlan.create({
      data: {
        planNo: genNo('SP'),
        title,
        planType: type,
        periodStart,
        periodEnd,
        salesRepId,
        departmentId: departmentId || req.user.departmentId || null,
        remark: remark || null,
        status: 'PENDING',
        items: items && items.length > 0 ? {
          create: items.map(it => ({
            customerId: it.customerId || null,
            materialId: it.materialId,
            supplierId: it.supplierId || null,
            gradeId: it.gradeId || null,
            planQty: Number(it.planQty) || 0,
            deliveryDate: it.deliveryDate ? new Date(it.deliveryDate) : null,
            remark: it.remark || null,
          })),
        } : undefined,
      },
      include: { items: true },
    });
    res.json({ success: true, data: plan, message: '销售计划创建成功' });
  } catch (err) { next(err); }
});

// 更新 — 提报人不可修改
router.put('/plans/:id', async (req, res, next) => {
  try {
    const { title, planType, departmentId, remark, items } = req.body;
    const existing = await prisma.salesPlan.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: '销售计划不存在' });
    if (existing.status !== 'DRAFT' && existing.status !== 'PENDING') return res.status(400).json({ success: false, message: '待审核或草稿状态才可编辑' });

    // 删除旧明细
    await prisma.salesPlanItem.deleteMany({ where: { salesPlanId: req.params.id } });

    // 根据 planType 自动计算周期
    const now = new Date();
    const type = planType || existing.planType;
    let periodStart, periodEnd;
    if (type === 'WEEKLY') {
      const day = now.getDay() || 7;
      periodStart = new Date(now); periodStart.setDate(now.getDate() - day + 1);
      periodEnd = new Date(periodStart); periodEnd.setDate(periodStart.getDate() + 6);
    } else if (type === 'MONTHLY') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === 'QUARTERLY') {
      const q = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), q * 3, 1);
      periodEnd = new Date(now.getFullYear(), q * 3 + 3, 0);
    } else {
      periodStart = new Date(now.getFullYear(), 0, 1);
      periodEnd = new Date(now.getFullYear(), 11, 31);
    }

    const plan = await prisma.salesPlan.update({
      where: { id: req.params.id },
      data: {
        title, planType: type,
        periodStart, periodEnd,
        departmentId: departmentId || null,
        remark,
        items: items && items.length > 0 ? {
          create: items.map(it => ({
            customerId: it.customerId || null,
            materialId: it.materialId,
            supplierId: it.supplierId || null,
            gradeId: it.gradeId || null,
            planQty: Number(it.planQty) || 0,
            deliveryDate: it.deliveryDate ? new Date(it.deliveryDate) : null,
            remark: it.remark || null,
          })),
        } : undefined,
      },
      include: { items: true },
    });
    res.json({ success: true, data: plan, message: '销售计划更新成功' });
  } catch (err) { next(err); }
});

// 提交审批
router.put('/plans/:id/submit', async (req, res, next) => {
  try {
    const plan = await prisma.salesPlan.update({
      where: { id: req.params.id },
      data: { status: 'PENDING' },
    });
    res.json({ success: true, data: plan, message: '已提交审批' });
  } catch (err) { next(err); }
});

// 审批
router.put('/plans/:id/approve', authorize(ROLES.SALES_MANAGER, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { approved } = req.body; // true=通过 false=拒绝
    const plan = await prisma.salesPlan.update({
      where: { id: req.params.id },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        approverId: req.user.employeeId,
        approvedAt: new Date(),
      },
    });
    res.json({ success: true, data: plan, message: approved ? '审批通过' : '审批拒绝' });
  } catch (err) { next(err); }
});

// 删除
router.delete('/plans/:id', async (req, res, next) => {
  try {
    const existing = await prisma.salesPlan.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: '销售计划不存在' });
    if (existing.status !== 'DRAFT' && existing.status !== 'PENDING') return res.status(400).json({ success: false, message: '待审核或草稿状态才可删除' });

    await prisma.salesPlanItem.deleteMany({ where: { salesPlanId: req.params.id } });
    await prisma.salesPlan.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// ============================================================
// 价目表
// ============================================================

// 列表
router.get('/prices', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '' } = req.query;
    const where = {};
    if (status) where.status = status;
    if (keyword) {
      const materials = await prisma.material.findMany({
        where: { name: { contains: keyword } },
        select: { id: true },
      });
      where.materialId = { in: materials.map(m => m.id) };
    }

    const [list, total] = await Promise.all([
      prisma.priceList.findMany({
        where,
        include: {
          material: { select: { id: true, name: true, unit: true } },
          customer: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          salesRep: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.priceList.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 创建
router.post('/prices', authorize(ROLES.SALES_MANAGER, ROLES.SALES_REP, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { materialId, customerId, departmentId, salesRepId, price, minPrice, priceType, tierPricing, effectiveFrom, effectiveTo } = req.body;
    const pl = await prisma.priceList.create({
      data: {
        materialId,
        customerId: customerId || null,
        departmentId: departmentId || null,
        salesRepId: salesRepId || null,
        price: Number(price),
        minPrice: Number(minPrice) || 0,
        priceType: priceType || 'STANDARD',
        tierPricing: tierPricing || null,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        status: 'ACTIVE',
      },
    });
    res.json({ success: true, data: pl, message: '价目表创建成功' });
  } catch (err) { next(err); }
});

// 更新
router.put('/prices/:id', async (req, res, next) => {
  try {
    const { materialId, customerId, departmentId, salesRepId, price, minPrice, priceType, tierPricing, effectiveFrom, effectiveTo, status } = req.body;
    const pl = await prisma.priceList.update({
      where: { id: req.params.id },
      data: {
        materialId, customerId: customerId || null,
        departmentId: departmentId || null, salesRepId: salesRepId || null,
        price: price !== undefined ? Number(price) : undefined,
        minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
        priceType, tierPricing: tierPricing || null,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        status,
      },
    });
    res.json({ success: true, data: pl, message: '价目表更新成功' });
  } catch (err) { next(err); }
});

// 删除
router.delete('/prices/:id', async (req, res, next) => {
  try {
    await prisma.priceList.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// 按物料查价（供销售订单使用）
router.get('/prices/by-material/:materialId', async (req, res, next) => {
  try {
    const { customerId } = req.query;
    const where = {
      materialId: req.params.materialId,
      status: 'ACTIVE',
      OR: [
        { effectiveFrom: null, effectiveTo: null },
        { effectiveFrom: { lte: new Date() }, effectiveTo: null },
        { effectiveFrom: null, effectiveTo: { gte: new Date() } },
        { effectiveFrom: { lte: new Date() }, effectiveTo: { gte: new Date() } },
      ],
    };
    if (customerId) {
      where.OR_cust = [{ customerId: null }, { customerId }];
    }
    const prices = await prisma.priceList.findMany({
      where: {
        materialId: req.params.materialId,
        status: 'ACTIVE',
      },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: [{ customerId: 'desc' }, { price: 'asc' }],
    });
    res.json({ success: true, data: prices });
  } catch (err) { next(err); }
});

// ============================================================
// 销售订单
// ============================================================

// 列表
router.get('/orders', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '', customerId = '', warehouseId = '', dateStart = '', dateEnd = '' } = req.query;
    const where = {};
    if (keyword) {
      const customers = await prisma.customer.findMany({ where: { name: { contains: keyword } }, select: { id: true } });
      where.OR = [
        { orderNo: { contains: keyword } },
        ...(customers.length > 0 ? [{ customerId: { in: customers.map(c => c.id) } }] : []),
      ];
    }
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (warehouseId) where.warehouseId = warehouseId;

    // 日期范围
    if (dateStart || dateEnd) {
      where.orderDate = {};
      if (dateStart) where.orderDate.gte = new Date(dateStart + 'T00:00:00');
      if (dateEnd) where.orderDate.lte = new Date(dateEnd + 'T23:59:59');
    }

    // ======== 数据隔离（按业务员 salesRepId）========
    const user = req.user;
    const role = user.role;
    if (role !== ROLES.SUPER_ADMIN) {
      const isManager = await isDepartmentManager(user.userId);
      if (isManager && user.departmentId) {
        const deptMembers = await prisma.employee.findMany({
          where: { departmentId: user.departmentId },
          select: { id: true },
        });
        const deptEmployeeIds = deptMembers.map(e => e.id);
        where.salesRepId = deptEmployeeIds.length > 0 ? { in: deptEmployeeIds } : { in: ['__none__'] };
      } else if (
        role === ROLES.SALES_MANAGER ||
        role === ROLES.SALES_STAFF ||
        role === 'SALES_REP'
      ) {
        where.salesRepId = user.employeeId || null;
      } else {
        where.salesRepId = user.employeeId || null;
      }
    }

    const [list, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, contactPhone: true } },
          warehouse: { select: { id: true, name: true } },
          salesRep: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          salesPlan: { select: { id: true, planNo: true, title: true } },
          items: {
            include: {
              material: { select: { id: true, name: true, unit: true, spec: true, salesUnit: true, salesConversionFactor: true } },
              grade: { select: { id: true, name: true } },
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.salesOrder.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 详情
router.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        address: true,
        warehouse: true,
        salesRep: { select: { id: true, name: true, empNo: true } },
        salesPlan: { select: { id: true, planNo: true, title: true } },
        items: {
          include: {
            material: { select: { id: true, name: true, unit: true, spec: true, salesUnit: true, salesConversionFactor: true } },
            grade: { select: { id: true, name: true } },
            priceList: { select: { id: true, price: true } },
            batch: { select: { id: true, batchNo: true } },
          },
        },
      },
    });
    if (!order) return res.status(404).json({ success: false, message: '销售订单不存在' });
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

// 创建
router.post('/orders', authorize(ROLES.SALES_MANAGER, ROLES.SALES_REP, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { customerId, warehouseId, addressId, salesRepId, salesPlanId, orderDate, expectedDate, priceType, items, notes } = req.body;

    // 计算金额
    let totalAmount = 0, taxAmount = 0;
    const orderItems = (items || []).map(it => {
      const lineTotal = Number(it.qty) * Number(it.unitPrice);
      const tax = lineTotal * (Number(it.taxRate) || 0) / 100;
      totalAmount += lineTotal;
      taxAmount += tax;
      return {
        materialId: it.materialId,
        qty: Number(it.qty),
        unitPrice: Number(it.unitPrice),
        costPrice: Number(it.costPrice) || 0,
        taxRate: Number(it.taxRate) || 0,
        lineTotal,
        priceListId: it.priceListId || null,
        batchId: it.batchId || null,
        gradeId: it.gradeId || null,
        remark: it.remark || null,
      };
    });

    // 保存前校验可用库存（聚合同物料数量，转换为基准单位比较）
    const qtyByMaterial = {};
    for (const item of orderItems) {
      qtyByMaterial[item.materialId] = (qtyByMaterial[item.materialId] || 0) + item.qty;
    }
    // 获取所有涉及物料的换算系数
    const matIds = Object.keys(qtyByMaterial);
    const mats = await prisma.material.findMany({ where: { id: { in: matIds } } });
    const matMap = mats.reduce((m, mat) => { m[mat.id] = mat; return m; }, {});
    for (const [matId, needQty] of Object.entries(qtyByMaterial)) {
      const mat = matMap[matId];
      const baseNeedQty = Number(salesQtyToBase(needQty, mat));
      const inv = await prisma.inventory.findFirst({
        where: { materialId: matId, warehouseId },
        include: { material: true },
      });
      const available = inv ? inv.qty - inv.lockedQty : 0;
      if (!inv || available < baseNeedQty) {
        return res.status(400).json({ success: false, message: `物料 ${inv?.material?.name || matId} 可用库存不足（可用 ${available}${mat.unit}，需 ${baseNeedQty}${mat.unit}）` });
      }
    }

    const order = await prisma.salesOrder.create({
      data: {
        orderNo: genNo('SO'),
        customerId,
        warehouseId,
        addressId: addressId || null,
        salesRepId: salesRepId || null,
        salesPlanId: salesPlanId || null,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        priceType: priceType || 'STANDARD',
        totalAmount,
        taxAmount,
        grandTotal: totalAmount + taxAmount,
        notes: notes || null,
        status: 'PENDING_APPROVAL',
        stockLocked: true,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // 保存即锁定库存（占位，转换为基准单位）
    for (const item of order.items) {
      const mat = matMap[item.materialId];
      const baseQty = Number(salesQtyToBase(item.qty, mat));
      const inv = await prisma.inventory.findFirst({
        where: { materialId: item.materialId, warehouseId },
      });
      if (inv) {
        await prisma.inventory.update({
          where: { id: inv.id },
          data: { lockedQty: { increment: baseQty } },
        });
      }
      await prisma.stockLock.create({
        data: {
          materialId: item.materialId,
          warehouseId,
          qty: baseQty,
          lockType: 'SALES_ORDER',
          refId: order.id,
          status: 'LOCKED',
        },
      });
    }

    res.json({ success: true, data: order, message: '销售订单创建成功' });
  } catch (err) { next(err); }
});

// 更新
router.put('/orders/:id', async (req, res, next) => {
  try {
    const existing = await prisma.salesOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: '销售订单不存在' });
    if (existing.status !== 'PENDING_APPROVAL' && existing.status !== 'REJECTED') return res.status(400).json({ success: false, message: '非待审核或已拒绝状态不可编辑' });
    if (existing.status === 'IN_APPROVAL') return res.status(400).json({ success: false, message: '审批流进行中不可编辑' });

    const { customerId, warehouseId, addressId, salesRepId, salesPlanId, orderDate, expectedDate, priceType, items, notes } = req.body;

    // 如果已锁库存，先释放旧锁（转换为基准单位释放）
    if (existing.stockLocked) {
      const oldItems = await prisma.salesOrderItem.findMany({ where: { salesOrderId: req.params.id } });
      const oldMatIds = oldItems.map(i => i.materialId);
      const oldMats = await prisma.material.findMany({ where: { id: { in: oldMatIds } } });
      const oldMatMap = oldMats.reduce((m, mat) => { m[mat.id] = mat; return m; }, {});
      for (const item of oldItems) {
        const mat = oldMatMap[item.materialId];
        const baseQty = Number(salesQtyToBase(item.qty, mat));
        const inv = await prisma.inventory.findFirst({
          where: { materialId: item.materialId, warehouseId: existing.warehouseId },
        });
        if (inv && inv.lockedQty >= baseQty) {
          await prisma.inventory.update({
            where: { id: inv.id },
            data: { lockedQty: { decrement: baseQty } },
          });
        }
      }
      await prisma.stockLock.updateMany({
        where: { refId: req.params.id, status: 'LOCKED' },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
    }

    await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: req.params.id } });

    let totalAmount = 0, taxAmount = 0;
    const orderItems = (items || []).map(it => {
      const lineTotal = Number(it.qty) * Number(it.unitPrice);
      const tax = lineTotal * (Number(it.taxRate) || 0) / 100;
      totalAmount += lineTotal;
      taxAmount += tax;
      return {
        materialId: it.materialId,
        qty: Number(it.qty),
        unitPrice: Number(it.unitPrice),
        costPrice: Number(it.costPrice) || 0,
        taxRate: Number(it.taxRate) || 0,
        lineTotal,
        priceListId: it.priceListId || null,
        batchId: it.batchId || null,
        gradeId: it.gradeId || null,
        remark: it.remark || null,
      };
    });

    // 校验新明细的可用库存（聚合同物料数量，转换为基准单位比较）
    const qtyByMaterial = {};
    for (const item of orderItems) {
      qtyByMaterial[item.materialId] = (qtyByMaterial[item.materialId] || 0) + item.qty;
    }
    const newMatIds = Object.keys(qtyByMaterial);
    const newMats = await prisma.material.findMany({ where: { id: { in: newMatIds } } });
    const newMatMap = newMats.reduce((m, mat) => { m[mat.id] = mat; return m; }, {});
    for (const [matId, needQty] of Object.entries(qtyByMaterial)) {
      const mat = newMatMap[matId];
      const baseNeedQty = Number(salesQtyToBase(needQty, mat));
      const inv = await prisma.inventory.findFirst({
        where: { materialId: matId, warehouseId },
        include: { material: true },
      });
      const available = inv ? inv.qty - inv.lockedQty : 0;
      if (!inv || available < baseNeedQty) {
        return res.status(400).json({ success: false, message: `物料 ${inv?.material?.name || matId} 可用库存不足（可用 ${available}${mat.unit}，需 ${baseNeedQty}${mat.unit}）` });
      }
    }

    const order = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: {
        customerId, warehouseId, addressId: addressId || null, salesRepId: salesRepId || null,
        salesPlanId: salesPlanId || null,
        orderDate: orderDate ? new Date(orderDate) : undefined,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        priceType, notes,
        totalAmount, taxAmount, grandTotal: totalAmount + taxAmount,
        stockLocked: true,
        // 被拒绝的订单修改后回到待审核状态，清除旧审批实例
        status: 'PENDING_APPROVAL',
        workflowInstanceId: null,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // 重新锁定库存（转换为基准单位）
    for (const item of order.items) {
      const mat = newMatMap[item.materialId];
      const baseQty = Number(salesQtyToBase(item.qty, mat));
      const inv = await prisma.inventory.findFirst({
        where: { materialId: item.materialId, warehouseId },
      });
      if (inv) {
        await prisma.inventory.update({
          where: { id: inv.id },
          data: { lockedQty: { increment: baseQty } },
        });
      }
      await prisma.stockLock.create({
        data: {
          materialId: item.materialId,
          warehouseId,
          qty: baseQty,
          lockType: 'SALES_ORDER',
          refId: order.id,
          status: 'LOCKED',
        },
      });
    }

    res.json({ success: true, data: order, message: '销售订单更新成功' });
  } catch (err) { next(err); }
});

// 状态流转
router.put('/orders/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const existing = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true, warehouse: true },
    });
    if (!existing) return res.status(404).json({ success: false, message: '销售订单不存在' });

    const validTransitions = {
      PENDING_APPROVAL: ['APPROVED', 'CANCELLED', 'IN_APPROVAL'],
      IN_APPROVAL: ['CANCELLED'],
      APPROVED: ['SHIPPING', 'CANCELLED'],
      REJECTED: ['PENDING_APPROVAL'], // 拒绝后可重新提交
      DRAFT: ['APPROVED', 'CANCELLED', 'IN_APPROVAL'],
      CONFIRMED: ['SHIPPING', 'CANCELLED'],
      SHIPPING: ['DELIVERED', 'CANCELLED'],
      DELIVERED: ['CLOSED'],
      CLOSED: [],
      CANCELLED: [],
    };
    if (!validTransitions[existing.status]?.includes(status)) {
      return res.status(400).json({ success: false, message: `不允许从 ${existing.status} 变更为 ${status}` });
    }

    // APPROVED: 库存已在保存时锁定，此处仅校验（跳过重复锁定）
    if (status === 'APPROVED') {
      if (!existing.stockLocked) {
        // 兼容旧数据：如果未锁定，则锁定（转换为基准单位）
        const approveMatIds = existing.items.map(i => i.materialId);
        const approveMats = await prisma.material.findMany({ where: { id: { in: approveMatIds } } });
        const approveMatMap = approveMats.reduce((m, mat) => { m[mat.id] = mat; return m; }, {});
        for (const item of existing.items) {
          const mat = approveMatMap[item.materialId];
          const baseQty = Number(salesQtyToBase(item.qty, mat));
          const inv = await prisma.inventory.findFirst({
            where: { materialId: item.materialId, warehouseId: existing.warehouseId },
          });
          const available = inv ? inv.qty - inv.lockedQty : 0;
          if (!inv || available < baseQty) {
            return res.status(400).json({ success: false, message: `物料 ${mat.name} 可用库存不足（可用 ${available}${mat.unit}，需 ${baseQty}${mat.unit}）` });
          }
        }
        for (const item of existing.items) {
          const mat = approveMatMap[item.materialId];
          const baseQty = Number(salesQtyToBase(item.qty, mat));
          const inv = await prisma.inventory.findFirst({
            where: { materialId: item.materialId, warehouseId: existing.warehouseId },
          });
          if (inv) {
            await prisma.inventory.update({
              where: { id: inv.id },
              data: { lockedQty: { increment: baseQty } },
            });
          }
          await prisma.stockLock.create({
            data: {
              materialId: item.materialId,
              warehouseId: existing.warehouseId,
              qty: baseQty,
              lockType: 'SALES_ORDER',
              refId: existing.id,
              status: 'LOCKED',
            },
          });
        }
        await prisma.salesOrder.update({ where: { id: req.params.id }, data: { stockLocked: true } });
      }
    }

    // DELIVERED: 出库 — 扣减物理库存 + 释放锁定 + 创建StockMovement + 创建应收（转换为基准单位）
    if (status === 'DELIVERED') {
      const deliverMatIds = existing.items.map(i => i.materialId);
      const deliverMats = await prisma.material.findMany({ where: { id: { in: deliverMatIds } } });
      const deliverMatMap = deliverMats.reduce((m, mat) => { m[mat.id] = mat; return m; }, {});
      for (const item of existing.items) {
        const mat = deliverMatMap[item.materialId];
        const baseQty = Number(salesQtyToBase(item.qty, mat));
        // 扣减物理库存 + 释放锁定
        const inv = await prisma.inventory.findFirst({
          where: { materialId: item.materialId, warehouseId: existing.warehouseId },
        });
        if (!inv || inv.qty < baseQty) {
          return res.status(400).json({ success: false, message: `物理库存不足，无法出库` });
        }
        await prisma.inventory.update({
          where: { id: inv.id },
          data: {
            qty: { decrement: baseQty },
            lockedQty: { decrement: baseQty },
          },
        });

        // 创建出库记录（使用基准单位数量）
        await prisma.stockMovement.create({
          data: {
            movementNo: genNo('OUT'),
            movementType: 'SALES_OUTBOUND',
            direction: 'OUT',
            materialId: item.materialId,
            warehouseId: existing.warehouseId,
            gradeId: item.gradeId || null,
            qty: baseQty,
            movementDate: new Date(),
            refType: 'SALES_ORDER',
            refId: existing.id,
            operatorId: req.user.employeeId,
            remark: `销售出库 - ${existing.orderNo}`,
          },
        });

        // 更新批次剩余量（使用基准单位数量）
        if (item.batchId) {
          await prisma.batch.update({
            where: { id: item.batchId },
            data: { remainingQty: { decrement: baseQty } },
          });
          // 创建批次追溯记录
          await prisma.batchTracking.create({
            data: {
              batchId: item.batchId,
              movementType: 'SALES_OUTBOUND',
              refType: 'SALES_ORDER',
              refId: existing.id,
              qty: baseQty,
              operatorId: req.user.employeeId || null,
              remark: `销售出库 - ${existing.orderNo}`,
            },
          });
        }
      }

      // 创建应收账款
      await prisma.accountsReceivable.create({
        data: {
          arNo: genNo('AR'),
          customerId: existing.customerId,
          refType: 'SALES_ORDER',
          refId: existing.id,
          amount: Number(existing.grandTotal),
          receivedAmount: 0,
          balance: Number(existing.grandTotal),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天账期
          status: 'PENDING',
        },
      });
    }

    // CANCELLED: 如果已锁定库存，释放锁定（转换为基准单位释放）
    if (status === 'CANCELLED' && existing.stockLocked) {
      const cancelMatIds = existing.items.map(i => i.materialId);
      const cancelMats = await prisma.material.findMany({ where: { id: { in: cancelMatIds } } });
      const cancelMatMap = cancelMats.reduce((m, mat) => { m[mat.id] = mat; return m; }, {});
      for (const item of existing.items) {
        const mat = cancelMatMap[item.materialId];
        const baseQty = Number(salesQtyToBase(item.qty, mat));
        const inv = await prisma.inventory.findFirst({
          where: { materialId: item.materialId, warehouseId: existing.warehouseId },
        });
        if (inv && inv.lockedQty >= baseQty) {
          await prisma.inventory.update({
            where: { id: inv.id },
            data: { lockedQty: { decrement: baseQty } },
          });
        }
      }
      await prisma.stockLock.updateMany({
        where: { refId: req.params.id, status: 'LOCKED' },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
      await prisma.salesOrder.update({ where: { id: req.params.id }, data: { stockLocked: false } });
    }

    const order = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ success: true, data: order, message: '状态更新成功' });
  } catch (err) { next(err); }
});

// 提交审批到 workflow-engine（替代原来的直接审核）
router.post('/orders/:id/submit-approval', authorize(ROLES.SALES_MANAGER, ROLES.SALES_REP, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: { customer: true, items: { include: { material: true, grade: true } } },
    });
    if (!order) return res.status(404).json({ success: false, message: '销售订单不存在' });
    if (order.status !== 'PENDING_APPROVAL' && order.status !== 'DRAFT' && order.status !== 'REJECTED') {
      return res.status(400).json({ success: false, message: '非待审核/草稿/已拒绝状态不可提交审批' });
    }
    if (order.workflowInstanceId) {
      return res.status(400).json({ success: false, message: '该订单已有进行中的审批流程' });
    }

    // 调用 workflow-engine POST /start
    const submitterId = req.user.globalId || req.user.employeeId || req.user.userId;
    const submitterName = req.user.name || req.user.username || '';
    const submitterEmail = req.user.email || '';

    // 计算整体毛利率 & 最低成本毛利率，同时提取明细数据
    const itemsWithMargin = [];
    const detailItems = [];
    for (const it of order.items) {
      const costPrice = Number(it.costPrice) || 0;
      const unitPrice = Number(it.unitPrice) || 0;
      const qty = Number(it.qty) || 0;
      const totalCost = costPrice * qty;
      const totalRevenue = unitPrice * qty;
      const rowMargin = costPrice > 0 ? Math.round(((unitPrice - costPrice) / costPrice) * 100 * 100) / 100 : 0;
      itemsWithMargin.push({ totalCost, totalRevenue, rowMargin });
      detailItems.push({
        materialName: it.material?.name || '',
        gradeName: it.grade?.name || '',
        salesUnit: it.material?.salesUnit || it.material?.unit || '',
        qty,
        costPrice,
        unitPrice,
        lineTotal: unitPrice * qty,
        rowMargin,
      });
    }
    const totalCost = itemsWithMargin.reduce((s, i) => s + i.totalCost, 0);
    const totalRevenue = itemsWithMargin.reduce((s, i) => s + i.totalRevenue, 0);
    const marginRate = totalCost > 0 ? Math.round(((totalRevenue - totalCost) / totalCost) * 100 * 100) / 100 : 0;
    const minMarginRate = itemsWithMargin.length > 0
      ? Math.min(...itemsWithMargin.filter(i => i.rowMargin !== 0).map(i => i.rowMargin))
      : 0;

    const wfPayload = {
      businessType: 'sales_order',
      system: 'scm',
      objectId: order.id,
      objectNo: order.orderNo,
      objectTitle: `销售订单 ${order.orderNo} - ${order.customer?.name || ''}`,
      objectData: {
        orderNo: order.orderNo,
        customerName: order.customer?.name,
        salesRepName: order.salesRep?.name,
        orderDate: order.orderDate ? order.orderDate.toISOString() : null,
        totalAmount: Number(order.grandTotal),
        marginRate,
        minMarginRate,
        itemCount: order.items.length,
        items: detailItems,
      },
      submitterId,
      submitterName,
      submitterEmail,
    };

    const WORKFLOW_ENGINE_URL = process.env.WORKFLOW_ENGINE_URL || 'http://localhost:4011';

    let wfResult;
    try {
      const wfRes = await axios.post(`${WORKFLOW_ENGINE_URL}/api/workflow/start`, wfPayload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': process.env.INTERNAL_API_SECRET || 'xdj-internal-api-secret-2026',
        },
      });
      wfResult = wfRes.data?.data;
    } catch (wfErr) {
      const errMsg = wfErr.response?.data?.message || wfErr.message;
      return res.status(500).json({ success: false, message: `审批流启动失败: ${errMsg}` });
    }

    // 将 workflowInstanceId 写入 SalesOrder，并改状态为 IN_APPROVAL
    const updated = await prisma.salesOrder.update({
      where: { id: order.id },
      data: {
        workflowInstanceId: wfResult.instanceId,
        status: 'IN_APPROVAL',
      },
    });

    res.json({
      success: true,
      data: {
        order: updated,
        workflowInstance: wfResult,
      },
      message: `已提交审批，审批实例 ${wfResult.instanceId}`,
    });
  } catch (err) { next(err); }
});

// 审核（保留原接口，IN_APPROVAL 状态不再允许直接审核，需走审批流回调）
router.put('/orders/:id/approve', async (req, res, next) => {
  try {
    const existing = await prisma.salesOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: '销售订单不存在' });
    if (existing.status === 'IN_APPROVAL') {
      return res.status(400).json({ success: false, message: '该订单正在审批流中，请等待审批结果' });
    }
    if (existing.status !== 'PENDING_APPROVAL' && existing.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: '非待审核状态不可审核' });
    }

    const order = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedById: req.user.employeeId || null,
        approvedAt: new Date(),
      },
    });

    // 审核通过后自动生成发货单（如果尚未存在）
    let shippingOrder = null;
    const existingShipping = await prisma.shippingOrder.findUnique({ where: { salesOrderId: req.params.id } });
    if (!existingShipping) {
      shippingOrder = await prisma.shippingOrder.create({
        data: {
          shippingNo: genNo('SH'),
          salesOrderId: req.params.id,
          customerId: existing.customerId,
          warehouseId: existing.warehouseId,
          status: 'PENDING',
          notes: '销售订单审核通过自动生成',
        },
      });
    }

    res.json({ success: true, data: { ...order, shippingOrder }, message: shippingOrder ? `审核通过，已自动生成发货单 ${shippingOrder.shippingNo}` : '审核通过' });
  } catch (err) { next(err); }
});

// 删除
router.delete('/orders/:id', async (req, res, next) => {
  try {
    const existing = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!existing) return res.status(404).json({ success: false, message: '销售订单不存在' });
    if (existing.status !== 'PENDING_APPROVAL') return res.status(400).json({ success: false, message: '非待审核状态不可删除' });
    if (existing.status === 'IN_APPROVAL') return res.status(400).json({ success: false, message: '审批流进行中不可删除，请先撤回审批' });

    // 删除前释放库存锁（转换为基准单位释放）
    if (existing.stockLocked) {
      const delMatIds = existing.items.map(i => i.materialId);
      const delMats = await prisma.material.findMany({ where: { id: { in: delMatIds } } });
      const delMatMap = delMats.reduce((m, mat) => { m[mat.id] = mat; return m; }, {});
      for (const item of existing.items) {
        const mat = delMatMap[item.materialId];
        const baseQty = Number(salesQtyToBase(item.qty, mat));
        const inv = await prisma.inventory.findFirst({
          where: { materialId: item.materialId, warehouseId: existing.warehouseId },
        });
        if (inv && inv.lockedQty >= baseQty) {
          await prisma.inventory.update({
            where: { id: inv.id },
            data: { lockedQty: { decrement: baseQty } },
          });
        }
      }
      await prisma.stockLock.updateMany({
        where: { refId: req.params.id, status: 'LOCKED' },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
    }

    await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: req.params.id } });
    await prisma.salesOrder.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// ============================================================
// 价目表 Excel 导入 (P1-12)
// ============================================================
router.post('/prices/import', authorize(ROLES.SALES_MANAGER, ROLES.SUPER_ADMIN), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '请上传文件' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) return res.status(400).json({ success: false, message: '文件无数据' });

    // 预加载物料和客户映射
    const materials = await prisma.material.findMany({ select: { id: true, code: true, name: true } });
    const customers = await prisma.customer.findMany({ select: { id: true, code: true, name: true } });
    const matByCode = {};
    materials.forEach((m) => { matByCode[m.code] = m; });
    const custByCode = {};
    customers.forEach((c) => { custByCode[c.code] = c; });

    const results = { success: 0, failed: 0, errors: [] };
    const toCreate = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const materialCode = String(row['物料编码'] || row['materialCode'] || row['code'] || '').trim();
      const materialName = String(row['物料名称'] || row['materialName'] || '').trim();
      const customerCode = String(row['客户编码'] || row['customerCode'] || '').trim();
      const price = Number(row['价格'] || row['price'] || 0);
      const minPrice = Number(row['最低价'] || row['minPrice'] || 0);
      const priceType = String(row['价格类型'] || row['priceType'] || 'STANDARD').trim();
      const effectiveFrom = row['生效日期'] || row['effectiveFrom'] || null;
      const effectiveTo = row['失效日期'] || row['expiryDate'] || row['effectiveTo'] || null;

      // 匹配物料
      let material = matByCode[materialCode];
      if (!material && materialName) {
        material = materials.find((m) => m.name === materialName);
      }
      if (!material) {
        results.failed++;
        results.errors.push(`第${i + 2}行: 物料 ${materialCode || materialName} 未找到`);
        continue;
      }

      if (!price || price <= 0) {
        results.failed++;
        results.errors.push(`第${i + 2}行: 价格无效`);
        continue;
      }

      // 匹配客户（可选）
      let customerId = null;
      if (customerCode) {
        const customer = custByCode[customerCode];
        if (!customer) {
          results.failed++;
          results.errors.push(`第${i + 2}行: 客户 ${customerCode} 未找到`);
          continue;
        }
        customerId = customer.id;
      }

      toCreate.push({
        materialId: material.id,
        customerId,
        price,
        minPrice,
        priceType,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        status: 'ACTIVE',
      });
      results.success++;
    }

    // 批量创建
    if (toCreate.length > 0) {
      await prisma.priceList.createMany({ data: toCreate });
    }

    res.json({
      success: true,
      data: results,
      message: `导入完成: 成功${results.success}条, 失败${results.failed}条`,
    });
  } catch (err) { next(err); }
});

// 价目表导入模板下载
router.get('/prices/import-template', async (req, res, next) => {
  try {
    const template = [
      { 物料编码: 'MAT001', 物料名称: '示例物料', 客户编码: '', 价格: 100, 最低价: 80, 价格类型: 'STANDARD', 生效日期: '2026-01-01', 失效日期: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '价目表导入模板');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=price-import-template.xlsx');
    res.send(buf);
  } catch (err) { next(err); }
});

// ============================================================
// 费用登记 (FeeRecord)
// ============================================================
// 按物料查询费用：返回所有物料的 PACKAGING/BOX_COST/FREIGHT 费用，支持查询筛选
router.get('/fees/by-material', async (req, res, next) => {
  try {
    const { keyword = '', category = '', hasFee = '', page = 1, pageSize = 9999 } = req.query;

    // 构建物料查询条件
    const matWhere = { status: 'ACTIVE' };
    if (keyword) {
      matWhere.OR = [{ code: { contains: keyword } }, { name: { contains: keyword } }];
    }
    if (category) {
      matWhere.category = category;
    }

    // 查物料
    const materials = await prisma.material.findMany({
      where: matWhere,
      select: { id: true, code: true, name: true, spec: true, unit: true, category: true, salesUnit: true, salesConversionFactor: true, purchaseUnit: true, purchaseConversionFactor: true },
      orderBy: { code: 'asc' },
    });

    // 查所有按物料关联的费用（PACKAGING/BOX_COST/FREIGHT）
    const materialIds = materials.map(m => m.id);
    const feeRecords = await prisma.feeRecord.findMany({
      where: { materialId: { in: materialIds }, feeType: { in: ['PACKAGING', 'BOX_COST', 'FREIGHT'] } },
    });

    // 构建映射 materialId → { PACKAGING, BOX_COST, FREIGHT }
    const feeMap = {};
    for (const f of feeRecords) {
      if (!feeMap[f.materialId]) feeMap[f.materialId] = {};
      feeMap[f.materialId][f.feeType] = f;
    }

    // 组装结果：每物料一行
    let result = materials.map(mat => ({
      materialId: mat.id,
      materialCode: mat.code,
      materialName: mat.name,
      spec: mat.spec,
      unit: mat.unit,
      category: mat.category,
      packagingFee: feeMap[mat.id]?.PACKAGING?.id ? Number(feeMap[mat.id].PACKAGING.amount) : 0,
      packagingFeeId: feeMap[mat.id]?.PACKAGING?.id || null,
      boxCost: feeMap[mat.id]?.BOX_COST?.id ? Number(feeMap[mat.id].BOX_COST.amount) : 0,
      boxCostId: feeMap[mat.id]?.BOX_COST?.id || null,
      freightPerBox: feeMap[mat.id]?.FREIGHT?.id ? Number(feeMap[mat.id].FREIGHT.amount) : 0,
      freightPerBoxId: feeMap[mat.id]?.FREIGHT?.id || null,
    }));

    // hasFee 筛选
    if (hasFee === 'yes') {
      result = result.filter(r => r.packagingFee > 0 || r.boxCost > 0 || r.freightPerBox > 0);
    } else if (hasFee === 'no') {
      result = result.filter(r => r.packagingFee === 0 && r.boxCost === 0 && r.freightPerBox === 0);
    }

    const total = result.length;

    // 分页
    const p = Number(page);
    const ps = Number(pageSize);
    if (ps < 9999) {
      result = result.slice((p - 1) * ps, p * ps);
    }

    res.json({ success: true, data: { list: result, total, page: p, pageSize: ps } });
  } catch (err) { next(err); }
});

// 按物料批量保存费用：一次性保存某物料的三类费用
router.put('/fees/by-material/:materialId', async (req, res, next) => {
  try {
    const { materialId } = req.params;
    const { packagingFee, boxCost, freightPerBox } = req.body;

    // 查该物料现有的三类费用记录
    const existing = await prisma.feeRecord.findMany({
      where: { materialId, feeType: { in: ['PACKAGING', 'BOX_COST', 'FREIGHT'] } },
    });

    const updates = [];
    const feeData = [
      { feeType: 'PACKAGING', feeName: '包装费用', amount: Number(packagingFee) || 0 },
      { feeType: 'BOX_COST', feeName: '单盒成本', amount: Number(boxCost) || 0 },
      { feeType: 'FREIGHT', feeName: '采购到货运费/盒', amount: Number(freightPerBox) || 0 },
    ];

    for (const fd of feeData) {
      const ex = existing.find(e => e.feeType === fd.feeType);
      if (ex) {
        // 更新现有记录
        const r = await prisma.feeRecord.update({
          where: { id: ex.id },
          data: { amount: fd.amount },
        });
        updates.push(r);
      } else {
        // 创建新记录
        const r = await prisma.feeRecord.create({
          data: {
            materialId,
            feeName: fd.feeName,
            feeType: fd.feeType,
            amount: fd.amount,
            isBuiltin: false,
            isActive: true,
          },
        });
        updates.push(r);
      }
    }

    res.json({ success: true, data: updates, message: '保存成功' });
  } catch (err) { next(err); }
});

// 按物料删除费用：删除某物料的所有三类费用记录
router.delete('/fees/by-material/:materialId', authorize(ROLES.SALES_MANAGER, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { materialId } = req.params;
    const deleted = await prisma.feeRecord.deleteMany({
      where: { materialId, feeType: { in: ['PACKAGING', 'BOX_COST', 'FREIGHT'] } },
    });
    res.json({ success: true, data: { count: deleted.count }, message: `已删除 ${deleted.count} 条费用记录` });
  } catch (err) { next(err); }
});

// 列表
router.get('/fees', async (req, res, next) => {
  try {
    const { keyword = '', isActive } = req.query;
    const where = {};
    if (keyword) {
      where.feeName = { contains: keyword };
    }
    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }
    const list = await prisma.feeRecord.findMany({
      where,
      orderBy: [{ isBuiltin: 'desc' }, { createdAt: 'asc' }],
    });
    res.json({ success: true, data: { list, total: list.length } });
  } catch (err) { next(err); }
});

// 创建（非内定费用）
router.post('/fees', authorize(ROLES.SALES_MANAGER, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { feeName, feeType, materialId, amount, remark } = req.body;
    if (!feeName || !feeName.trim()) {
      return res.status(400).json({ success: false, message: '费用名称不能为空' });
    }
    if (!materialId) {
      return res.status(400).json({ success: false, message: '请选择物料' });
    }
    const validFeeTypes = ['PACKAGING', 'BOX_COST', 'FREIGHT'];
    const ft = validFeeTypes.includes(feeType) ? feeType : 'PACKAGING';
    const record = await prisma.feeRecord.create({
      data: {
        feeName: feeName.trim(),
        feeType: ft,
        materialId,
        amount: Number(amount) || 0,
        isBuiltin: false,
        isActive: true,
        remark: remark || null,
      },
    });
    res.json({ success: true, data: record, message: '费用创建成功' });
  } catch (err) { next(err); }
});

// 切换启用/停用状态
router.patch('/fees/:id/toggle', authorize(ROLES.SALES_MANAGER, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.feeRecord.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '费用记录不存在' });
    }
    const record = await prisma.feeRecord.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    res.json({ success: true, data: record, message: `费用已${record.isActive ? '启用' : '停用'}` });
  } catch (err) { next(err); }
});

// 更新（内定费用只能改金额）
router.put('/fees/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.feeRecord.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '费用记录不存在' });
    }

    const { amount, feeName, remark, isActive } = req.body;
    const updateData = {};

    if (existing.isBuiltin) {
      // 内定费用：只能改金额和状态
      if (amount !== undefined) updateData.amount = Number(amount) || 0;
    } else {
      // 非内定费用：可改全部字段
      if (amount !== undefined) updateData.amount = Number(amount) || 0;
      if (feeName !== undefined) updateData.feeName = feeName.trim();
      if (remark !== undefined) updateData.remark = remark || null;
    }
    if (isActive !== undefined) updateData.isActive = !!isActive;

    const record = await prisma.feeRecord.update({
      where: { id },
      data: updateData,
    });
    res.json({ success: true, data: record, message: '费用更新成功' });
  } catch (err) { next(err); }
});

// 删除（拒绝删除内定费用）
router.delete('/fees/:id', authorize(ROLES.SALES_MANAGER, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.feeRecord.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '费用记录不存在' });
    }
    if (existing.isBuiltin) {
      return res.status(403).json({ success: false, message: '内定费用不可删除' });
    }
    await prisma.feeRecord.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// ============================================================
// 客户信用管控 (P1-15)
// ============================================================

// 客户信用概览（全部客户）
router.get('/credit/overview', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    const where = { status: 'ACTIVE' };
    if (keyword) where.OR = [{ name: { contains: keyword } }, { code: { contains: keyword } }];

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          salesRep: { select: { id: true, name: true } },
          accountsReceivable: {
            where: { status: { in: ['PENDING', 'PARTIAL'] } },
            select: { balance: true, dueDate: true },
          },
          salesOrders: {
            where: { status: { in: ['APPROVED', 'PARTIAL_SHIPPED', 'SHIPPED'] } },
            select: { grandTotal: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    const now = new Date();
    const enriched = customers.map((c) => {
      const creditLimit = Number(c.creditLimit);
      // 已用信用 = 未核销AR余额 + 未完成订单金额
      const arBalance = c.accountsReceivable.reduce((s, ar) => s + Number(ar.balance), 0);
      const pendingOrderAmount = c.salesOrders.reduce((s, o) => s + Number(o.grandTotal), 0);
      const usedCredit = arBalance + pendingOrderAmount;
      const availableCredit = creditLimit - usedCredit;
      const usageRatio = creditLimit > 0 ? (usedCredit / creditLimit) * 100 : 0;

      // 超期应收
      const overdueAR = c.accountsReceivable.filter((ar) => new Date(ar.dueDate) < now);
      const overdueAmount = overdueAR.reduce((s, ar) => s + Number(ar.balance), 0);

      let creditStatus = 'NORMAL';
      if (creditLimit > 0) {
        if (usageRatio >= 100 || overdueAmount > 0) creditStatus = 'FROZEN';
        else if (usageRatio >= 80) creditStatus = 'WARNING';
        else if (usageRatio >= 50) creditStatus = 'ATTENTION';
      }

      return {
        id: c.id,
        code: c.code,
        name: c.name,
        contactPerson: c.contactPerson,
        contactPhone: c.contactPhone,
        salesRepName: c.salesRep?.name,
        creditLimit,
        creditPeriod: c.creditPeriod,
        arBalance,
        pendingOrderAmount,
        usedCredit,
        availableCredit: Math.max(0, availableCredit),
        usageRatio: Math.round(usageRatio * 100) / 100,
        overdueCount: overdueAR.length,
        overdueAmount,
        creditStatus,
      };
    });

    res.json({ success: true, data: { list: enriched, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 单个客户信用详情
router.get('/credit/:customerId', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.customerId },
      include: {
        salesRep: { select: { id: true, name: true } },
        accountsReceivable: {
          where: { status: { in: ['PENDING', 'PARTIAL'] } },
          orderBy: { dueDate: 'asc' },
        },
        salesOrders: {
          where: { status: { in: ['APPROVED', 'PARTIAL_SHIPPED', 'SHIPPED'] } },
          include: { items: { select: { materialId: true, qty: true, unitPrice: true, lineTotal: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!customer) return res.status(404).json({ success: false, message: '客户不存在' });

    const creditLimit = Number(customer.creditLimit);
    const arBalance = customer.accountsReceivable.reduce((s, ar) => s + Number(ar.balance), 0);
    const pendingOrderAmount = customer.salesOrders.reduce((s, o) => s + Number(o.grandTotal), 0);
    const usedCredit = arBalance + pendingOrderAmount;
    const availableCredit = creditLimit - usedCredit;
    const usageRatio = creditLimit > 0 ? (usedCredit / creditLimit) * 100 : 0;

    const now = new Date();
    const overdueARs = customer.accountsReceivable.filter((ar) => new Date(ar.dueDate) < now);

    res.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          code: customer.code,
          name: customer.name,
          contactPerson: customer.contactPerson,
          contactPhone: customer.contactPhone,
          address: customer.address,
          salesRepName: customer.salesRep?.name,
          creditLimit,
          creditPeriod: customer.creditPeriod,
        },
        credit: {
          arBalance,
          pendingOrderAmount,
          usedCredit,
          availableCredit: Math.max(0, availableCredit),
          usageRatio: Math.round(usageRatio * 100) / 100,
          overdueCount: overdueARs.length,
          overdueAmount: overdueARs.reduce((s, ar) => s + Number(ar.balance), 0),
        },
        receivables: customer.accountsReceivable.map((ar) => ({
          ...ar,
          isOverdue: new Date(ar.dueDate) < now,
          daysOverdue: Math.max(0, Math.floor((now - new Date(ar.dueDate)) / 86400000)),
        })),
        pendingOrders: customer.salesOrders,
      },
    });
  } catch (err) { next(err); }
});

// 更新客户信用额度
router.put('/credit/:customerId', authorize(ROLES.SALES_MANAGER, ROLES.FINANCE_STAFF, ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { creditLimit, creditPeriod } = req.body;
    const customer = await prisma.customer.update({
      where: { id: req.params.customerId },
      data: {
        creditLimit: creditLimit !== undefined ? Number(creditLimit) : undefined,
        creditPeriod: creditPeriod !== undefined ? Number(creditPeriod) : undefined,
      },
      select: { id: true, code: true, name: true, creditLimit: true, creditPeriod: true },
    });
    res.json({ success: true, data: customer, message: '信用额度已更新' });
  } catch (err) { next(err); }
});

// 信用检查（创建销售订单时调用）
router.get('/credit/:customerId/check', async (req, res, next) => {
  try {
    const { amount = 0 } = req.query;
    const checkAmount = Number(amount);

    const customer = await prisma.customer.findUnique({
      where: { id: req.params.customerId },
      include: {
        accountsReceivable: {
          where: { status: { in: ['PENDING', 'PARTIAL'] } },
          select: { balance: true, dueDate: true },
        },
        salesOrders: {
          where: { status: { in: ['APPROVED', 'PARTIAL_SHIPPED', 'SHIPPED'] } },
          select: { grandTotal: true },
        },
      },
    });
    if (!customer) return res.status(404).json({ success: false, message: '客户不存在' });

    const creditLimit = Number(customer.creditLimit);
    const arBalance = customer.accountsReceivable.reduce((s, ar) => s + Number(ar.balance), 0);
    const pendingOrderAmount = customer.salesOrders.reduce((s, o) => s + Number(o.grandTotal), 0);
    const usedCredit = arBalance + pendingOrderAmount;
    const availableCredit = creditLimit - usedCredit;
    const now = new Date();
    const overdueARs = customer.accountsReceivable.filter((ar) => new Date(ar.dueDate) < now);
    const hasOverdue = overdueARs.length > 0;

    const afterAmount = usedCredit + checkAmount;
    const wouldExceed = creditLimit > 0 && afterAmount > creditLimit;

    let result = 'PASS';
    let message = '信用检查通过';
    if (hasOverdue) {
      result = 'BLOCK';
      message = `客户有${overdueARs.length}笔超期应收账款，共${overdueARs.reduce((s, ar) => s + Number(ar.balance), 0).toFixed(2)}元，禁止下单`;
    } else if (wouldExceed) {
      result = 'WARN';
      message = `下单后信用使用率将达${((afterAmount / creditLimit) * 100).toFixed(1)}%，可用额度${availableCredit.toFixed(2)}元`;
    }

    res.json({
      success: true,
      data: {
        result,
        message,
        creditLimit,
        usedCredit,
        availableCredit,
        checkAmount,
        afterAmount,
        hasOverdue,
        overdueCount: overdueARs.length,
      },
    });
  } catch (err) { next(err); }
});

export default router;
