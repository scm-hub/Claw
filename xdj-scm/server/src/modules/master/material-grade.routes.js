import { Router } from 'express';
import prisma from '../../shared/prisma.js';

const router = Router();

// 编码自动生成：MG + YYYYMMDD + 6位随机字母数字
function genGradeCode() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MG${ymd}${rand}`;
}

// 获取物料等级列表
router.get('/material-grades', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, status, search } = req.query;
    console.log('[MaterialGrade] GET /material-grades query:', { page, pageSize, status, search });
    
    const whereClause = {};
    if (status) whereClause.status = status;
    if (search) {
      whereClause.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const [list, totalCount] = await Promise.all([
      prisma.materialGrade.findMany({
        where: whereClause,
        orderBy: { sortOrder: 'asc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      }),
      prisma.materialGrade.count({ where: whereClause })
    ]);

    console.log('[MaterialGrade] 返回结果:', { count: list.length, totalCount });

    res.json({
      list,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('[MaterialGrade] GET 错误:', error.message);
    next(error);
  }
});

// 获取单个物料等级
router.get('/material-grades/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const grade = await prisma.materialGrade.findUnique({
      where: { id }
    });

    if (!grade) {
      return res.status(404).json({ error: '物料等级不存在' });
    }

    res.json(grade);
  } catch (error) {
    next(error);
  }
});

// 生成唯一编码（防碰撞）
async function generateUniqueCode() {
  for (let i = 0; i < 10; i++) {
    const code = genGradeCode();
    const existing = await prisma.materialGrade.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error('无法生成唯一编码，请重试');
}

// 创建物料等级
router.post('/material-grades', async (req, res, next) => {
  try {
    const { name, description, sortOrder, status = 'ACTIVE' } = req.body;

    const code = await generateUniqueCode();

    const newGrade = await prisma.materialGrade.create({
      data: {
        code,
        name,
        description: description || null,
        sortOrder: sortOrder || 0,
        status
      }
    });

    res.status(201).json(newGrade);
  } catch (error) {
    next(error);
  }
});

// 更新物料等级
router.put('/material-grades/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, name, description, sortOrder, status } = req.body;

    const existingGrade = await prisma.materialGrade.findUnique({
      where: { id }
    });

    if (!existingGrade) {
      return res.status(404).json({ error: '物料等级不存在' });
    }

    // 检查编码是否被其他记录占用
    if (code !== existingGrade.code) {
      const existingCode = await prisma.materialGrade.findFirst({
        where: { code, NOT: { id } }
      });
      if (existingCode) {
        return res.status(400).json({ error: '等级编码已存在' });
      }
    }

    const updatedGrade = await prisma.materialGrade.update({
      where: { id },
      data: {
        code,
        name,
        description: description || null,
        sortOrder: sortOrder || 0,
        status,
        updatedAt: new Date()
      }
    });

    res.json(updatedGrade);
  } catch (error) {
    next(error);
  }
});

// 删除物料等级
router.delete('/material-grades/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const refs = [];
    const MAX_ITEMS = 5;

    // 1. 物料等级映射（MaterialGradeMapping）
    const mappings = await prisma.materialGradeMapping.findMany({
      where: { gradeId: id },
      include: { material: { select: { code: true, name: true } } },
    });
    if (mappings.length > 0) {
      refs.push({
        type: '物料等级关联',
        count: mappings.length,
        items: mappings.slice(0, MAX_ITEMS).map(m => ({
          code: m.material.code,
          title: m.material.name,
        })),
        more: mappings.length > MAX_ITEMS ? mappings.length - MAX_ITEMS : 0,
      });
    }

    // 2. 采购计划明细
    const purchasePlanItems = await prisma.purchasePlanItem.findMany({
      where: { gradeId: id },
      include: { plan: { select: { planNo: true, title: true, status: true } } },
    });
    if (purchasePlanItems.length > 0) {
      const seen = new Set();
      const items = [];
      for (const ppi of purchasePlanItems) {
        if (!seen.has(ppi.plan.planNo)) { seen.add(ppi.plan.planNo); items.push(ppi.plan); }
      }
      refs.push({ type: '采购计划', count: purchasePlanItems.length, items: items.slice(0, MAX_ITEMS).map(p => ({ code: p.planNo, title: p.title, status: p.status })), more: items.length > MAX_ITEMS ? items.length - MAX_ITEMS : 0 });
    }

    // 3. 采购订单明细
    const purchaseOrderItems = await prisma.purchaseOrderItem.findMany({
      where: { gradeId: id },
      include: { order: { select: { orderNo: true, status: true } } },
    });
    if (purchaseOrderItems.length > 0) {
      const seen = new Set();
      const items = [];
      for (const poi of purchaseOrderItems) {
        if (!seen.has(poi.order.orderNo)) { seen.add(poi.order.orderNo); items.push(poi.order); }
      }
      refs.push({ type: '采购订单', count: purchaseOrderItems.length, items: items.slice(0, MAX_ITEMS).map(o => ({ code: o.orderNo, status: o.status })), more: items.length > MAX_ITEMS ? items.length - MAX_ITEMS : 0 });
    }

    // 4. 采购收货明细
    const receiptItems = await prisma.purchaseReceiptItem.findMany({
      where: { gradeId: id },
      include: { receipt: { select: { receiptNo: true, status: true } } },
    });
    if (receiptItems.length > 0) {
      const seen = new Set();
      const items = [];
      for (const ri of receiptItems) {
        if (!seen.has(ri.receipt.receiptNo)) { seen.add(ri.receipt.receiptNo); items.push(ri.receipt); }
      }
      refs.push({ type: '采购收货', count: receiptItems.length, items: items.slice(0, MAX_ITEMS).map(r => ({ code: r.receiptNo, status: r.status })), more: items.length > MAX_ITEMS ? items.length - MAX_ITEMS : 0 });
    }

    // 5. 销售订单明细
    const salesOrderItems = await prisma.salesOrderItem.findMany({
      where: { gradeId: id },
      include: { salesOrder: { select: { orderNo: true, status: true } } },
    });
    if (salesOrderItems.length > 0) {
      const seen = new Set();
      const items = [];
      for (const soi of salesOrderItems) {
        if (!seen.has(soi.salesOrder.orderNo)) { seen.add(soi.salesOrder.orderNo); items.push(soi.salesOrder); }
      }
      refs.push({ type: '销售订单', count: salesOrderItems.length, items: items.slice(0, MAX_ITEMS).map(so => ({ code: so.orderNo, status: so.status })), more: items.length > MAX_ITEMS ? items.length - MAX_ITEMS : 0 });
    }

    // 6. 销售计划明细
    const salesPlanItems = await prisma.salesPlanItem.findMany({
      where: { gradeId: id },
      include: { salesPlan: { select: { planNo: true, status: true } } },
    });
    if (salesPlanItems.length > 0) {
      const seen = new Set();
      const items = [];
      for (const spi of salesPlanItems) {
        if (!seen.has(spi.salesPlan.planNo)) { seen.add(spi.salesPlan.planNo); items.push(spi.salesPlan); }
      }
      refs.push({ type: '销售计划', count: salesPlanItems.length, items: items.slice(0, MAX_ITEMS).map(sp => ({ code: sp.planNo, status: sp.status })), more: items.length > MAX_ITEMS ? items.length - MAX_ITEMS : 0 });
    }

    // 7. 出入库记录
    const stockMovements = await prisma.stockMovement.findMany({
      where: { gradeId: id },
      select: { movementNo: true },
    });
    if (stockMovements.length > 0) {
      refs.push({
        type: '出入库记录',
        count: stockMovements.length,
        items: stockMovements.slice(0, MAX_ITEMS).map(sm => ({ code: sm.movementNo })),
        more: stockMovements.length > MAX_ITEMS ? stockMovements.length - MAX_ITEMS : 0,
      });
    }

    // 8. 成本价记录
    const costRecords = await prisma.costPriceRecord.findMany({
      where: { gradeId: id },
      select: { materialName: true },
    });
    if (costRecords.length > 0) {
      refs.push({
        type: '成本价记录',
        count: costRecords.length,
        items: costRecords.slice(0, MAX_ITEMS).map(cr => ({ code: cr.materialName })),
        more: costRecords.length > MAX_ITEMS ? costRecords.length - MAX_ITEMS : 0,
      });
    }

    // -- 有引用则拒绝删除 --
    if (refs.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该等级已被业务单据引用，无法删除',
        references: refs,
      });
    }

    // -- 无引用则删除 --
    await prisma.materialGrade.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

export default router;