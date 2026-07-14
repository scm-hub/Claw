import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import prisma from '../../shared/prisma.js';
import { getScmModuleUserEmails, getPool } from '../../shared/portalDb.js';
import materialGradeRoutes from './material-grade.routes.js';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 使用物料等级路由
router.use(materialGradeRoutes);

// ============================================================
// 编码自动生成工具
// 格式：前缀 + YYYYMMDD + 3位序号，如 MAT20260621001
// ============================================================
async function genCode(model, prefix, field = 'code') {
  const now = new Date();
  const ymd = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const fullPrefix = prefix + ymd;
  const existing = await prisma[model].findMany({
    where: { [field]: { startsWith: fullPrefix } },
    select: { [field]: true },
  });
  let maxSeq = 0;
  for (const item of existing) {
    const seq = parseInt(item[field].slice(fullPrefix.length), 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }
  return fullPrefix + String(maxSeq + 1).padStart(3, '0');
}

// ============================================================
// 部门管理
// ============================================================

router.get('/departments', async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        parent: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, empNo: true } },
        _count: { select: { employees: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: departments });
  } catch (err) { next(err); }
});

// 部门数据来自综合平台（HRMS），SCM 端不允许新增/编辑/删除
router.post('/departments', async (req, res) => {
  res.status(403).json({ success: false, message: '部门数据由综合平台统一管理，请在 HRMS 中操作' });
});

router.put('/departments/:id', async (req, res) => {
  res.status(403).json({ success: false, message: '部门数据由综合平台统一管理，请在 HRMS 中操作' });
});

router.delete('/departments/:id', async (req, res) => {
  res.status(403).json({ success: false, message: '部门数据由综合平台统一管理，请在 HRMS 中操作' });
});

// ============================================================
// 员工管理
// ============================================================

router.get('/employees', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', departmentId = '', status = '' } = req.query;
    const where = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { empNo: { contains: keyword } },
        { phone: { contains: keyword } },
      ];
    }
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: { department: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { empNo: 'asc' },
      }),
      prisma.employee.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 员工数据来自综合平台（HRMS），SCM 端不允许新增/编辑/删除
router.post('/employees', async (req, res) => {
  res.status(403).json({ success: false, message: '员工数据由综合平台统一管理，请在 HRMS 中操作' });
});

router.put('/employees/:id', async (req, res) => {
  res.status(403).json({ success: false, message: '员工数据由综合平台统一管理，请在 HRMS 中操作' });
});

router.delete('/employees/:id', async (req, res) => {
  res.status(403).json({ success: false, message: '员工数据由综合平台统一管理，请在 HRMS 中操作' });
});

// ============================================================
// HRMS → SCM 数据同步（手动触发）
// ============================================================
router.post('/sync-from-hrms', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const result = { departments: { created: 0, updated: 0 }, employees: { created: 0, updated: 0 } };

    // 建立 HRMS 连接
    const mysql = await import('mysql2/promise');
    const hrmsConn = await mysql.default.createConnection(
      process.env.HRMS_DATABASE_URL || 'mysql://root:Scm@2025!@localhost:3306/hrms'
    );

    try {
      // --- 同步部门 ---
      const [hrmsDepts] = await hrmsConn.execute(`
        SELECT d.id, d.name, d.parentId, d.managerId, d.sortOrder,
               m.employeeNo as managerEmpNo
        FROM Department d
        LEFT JOIN Employee m ON d.managerId = m.id
        ORDER BY d.sortOrder ASC
      `);

      const deptNameMap = new Map();
      for (const hd of hrmsDepts) {
        let scmDept = await prisma.department.findFirst({ where: { name: hd.name } });

        let managerId = null;
        if (hd.managerEmpNo) {
          const scmManager = await prisma.employee.findUnique({ where: { empNo: hd.managerEmpNo } });
          if (scmManager) managerId = scmManager.id;
        }

        let parentId = null;
        if (hd.parentId) {
          const [parentRows] = await hrmsConn.execute('SELECT name FROM Department WHERE id = ?', [hd.parentId]);
          if (parentRows.length > 0) {
            const scmParent = await prisma.department.findFirst({ where: { name: parentRows[0].name } });
            if (scmParent) parentId = scmParent.id;
          }
        }

        if (scmDept) {
          await prisma.department.update({
            where: { id: scmDept.id },
            data: { sortOrder: hd.sortOrder, managerId, parentId },
          });
          result.departments.updated++;
        } else {
          scmDept = await prisma.department.create({
            data: { name: hd.name, code: `HRMS_${hd.id.substring(0, 8).toUpperCase()}`, sortOrder: hd.sortOrder, managerId, parentId, status: 'ACTIVE' },
          });
          result.departments.created++;
        }
        deptNameMap.set(hd.name, scmDept.id);
      }

      // --- 同步员工 ---
      const [hrmsEmps] = await hrmsConn.execute(`
        SELECT e.employeeNo, e.name, e.phone, e.email, e.status, e.hireDate, e.positionTitle,
               d.name as departmentName
        FROM Employee e
        LEFT JOIN Department d ON e.departmentId = d.id
        ORDER BY e.employeeNo ASC
      `);

      for (const he of hrmsEmps) {
        let scmEmp = await prisma.employee.findUnique({ where: { empNo: he.employeeNo } });

        let departmentId = null;
        if (he.departmentName) {
          departmentId = deptNameMap.get(he.departmentName);
          if (!departmentId) {
            const scmDept = await prisma.department.findFirst({ where: { name: he.departmentName } });
            if (scmDept) departmentId = scmDept.id;
          }
        }

        const empData = {
          name: he.name, departmentId,
          position: he.positionTitle || null,
          phone: he.phone || null, email: he.email || null,
          status: he.status || 'ACTIVE',
          hireDate: he.hireDate ? new Date(he.hireDate) : null,
        };

        if (scmEmp) {
          await prisma.employee.update({ where: { id: scmEmp.id }, data: empData });
          result.employees.updated++;
        } else {
          await prisma.employee.create({ data: { empNo: he.employeeNo, ...empData } });
          result.employees.created++;
        }
      }

      // --- 清理 SCM 中 HRMS 没有的数据 ---
      const [allHrmsDepts] = await hrmsConn.execute('SELECT name FROM Department');
      const [allHrmsEmps] = await hrmsConn.execute('SELECT employeeNo FROM Employee');
      const hrmsDeptNames = allHrmsDepts.map(d => d.name);
      const hrmsEmpNoSet = new Set(allHrmsEmps.map(e => e.employeeNo));

      // 删除多余员工
      const orphanEmps = await prisma.employee.findMany({
        where: { empNo: { notIn: [...hrmsEmpNoSet] } },
        select: { id: true, empNo: true, name: true },
      });
      const orphanEmpCount = orphanEmps.length;
      for (const e of orphanEmps) {
        await prisma.employee.delete({ where: { id: e.id } }).catch(() => {});
      }

      // 删除多余部门
      const orphanDepts = await prisma.department.findMany({
        where: { name: { notIn: hrmsDeptNames } },
        select: { id: true, name: true },
      });
      const orphanDeptCount = orphanDepts.length;
      for (const d of orphanDepts) {
        const empRefs = await prisma.employee.count({ where: { departmentId: d.id } });
        if (empRefs > 0) continue;
        await prisma.department.delete({ where: { id: d.id } }).catch(() => {});
      }

      result.cleanup = { orphanEmployees: orphanEmpCount, orphanDepartments: orphanDeptCount };

      res.json({
        success: true,
        message: `同步完成：部门 新增${result.departments.created} 更新${result.departments.updated}，员工 新增${result.employees.created} 更新${result.employees.updated}`,
        data: result,
      });
    } finally {
      await hrmsConn.end();
    }
  } catch (err) { next(err); }
});

// ============================================================
// 产品/物料管理
// ============================================================
// 产品组管理（MaterialGroup — 多规格物料的父级）
// ============================================================

// 产品组列表（含关联物料数量）
router.get('/material-groups', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', category = '', status = '' } = req.query;
    const where = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      prisma.materialGroup.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        include: {
          _count: { select: { materials: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.materialGroup.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// 产品组详情（含关联物料列表）
router.get('/material-groups/:id', async (req, res, next) => {
  try {
    const group = await prisma.materialGroup.findUnique({
      where: { id: req.params.id },
      include: { materials: { orderBy: { createdAt: 'desc' } } },
    });
    if (!group) return res.status(404).json({ success: false, message: '产品组不存在' });
    res.json({ success: true, data: group });
  } catch (err) { next(err); }
});

// 创建产品组
router.post('/material-groups', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER, ROLES.PURCHASE_STAFF), async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.name) return res.status(400).json({ success: false, message: '产品组名称必填' });
    data.code = await genCode('materialGroup', 'MG');
    const group = await prisma.materialGroup.create({ data });
    res.json({ success: true, data: group });
  } catch (err) { next(err); }
});

// 更新产品组
router.put('/material-groups/:id', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER, ROLES.PURCHASE_STAFF), async (req, res, next) => {
  try {
    let { id, createdAt, updatedAt, ...data } = req.body;
    const group = await prisma.materialGroup.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: group });
  } catch (err) { next(err); }
});

// 删除产品组（需确认没有关联物料）
router.delete('/material-groups/:id', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const { id } = req.params;
    const refs = [];
    const MAX_ITEMS = 5;

    // 1. 关联物料
    const materials = await prisma.material.findMany({
      where: { groupId: id },
      select: { code: true, name: true, status: true },
    });
    if (materials.length > 0) {
      refs.push({ type: '规格变体物料', count: materials.length, items: materials.slice(0, MAX_ITEMS).map(m => ({ code: m.code, title: m.name, status: m.status })), more: materials.length > MAX_ITEMS ? materials.length - MAX_ITEMS : 0 });
    }

    if (refs.length > 0) {
      return res.status(400).json({ success: false, message: '该产品组下有关联物料，无法删除', references: refs });
    }

    await prisma.materialGroup.delete({ where: { id } });
    res.json({ success: true, message: '产品组已删除' });
  } catch (err) { next(err); }
});

// ============================================================
// 物料/产品管理
// ============================================================

/**
 * GET /api/master/kingdee-materials — 金蝶物料快速搜索（供产品名称下拉）
 * 代理转发到 MDM 服务
 */
router.get('/kingdee-materials', async (req, res, next) => {
  try {
    const { keyword = '', limit = 50 } = req.query;
    const url = `http://localhost:4005/api/kingdee/search-materials?keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.success) {
      return res.status(500).json({ success: false, message: data.message || 'MDM 查询失败' });
    }
    res.json({ success: true, data: data.data });
  } catch (err) { next(err); }
});

/**
 * GET /api/master/kingdee-customers — 金蝶客户快速搜索（供客户名称下拉）
 * 代理转发到 MDM 服务
 */
router.get('/kingdee-customers', async (req, res, next) => {
  try {
    const { keyword = '', limit = 50 } = req.query;
    const url = `http://localhost:4005/api/kingdee/search-customers?keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.success) {
      return res.status(500).json({ success: false, message: data.message || 'MDM 查询失败' });
    }
    res.json({ success: true, data: data.data });
  } catch (err) { next(err); }
});

/**
 * GET /api/master/kingdee-suppliers — 金蝶供应商快速搜索（供供应商名称下拉）
 * 代理转发到 MDM 服务
 */
router.get('/kingdee-suppliers', async (req, res, next) => {
  try {
    const { keyword = '', limit = 50 } = req.query;
    const url = `http://localhost:4005/api/kingdee/search-suppliers?keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.success) {
      return res.status(500).json({ success: false, message: data.message || 'MDM 查询失败' });
    }
    res.json({ success: true, data: data.data });
  } catch (err) { next(err); }
});

/**
 * GET /api/master/kingdee-warehouses — 金蝶仓库快速搜索（供仓库名称下拉）
 * 代理转发到 MDM 服务
 */
router.get('/kingdee-warehouses', async (req, res, next) => {
  try {
    const { keyword = '', limit = 50 } = req.query;
    const url = `http://localhost:4005/api/kingdee/search-warehouses?keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.success) {
      return res.status(500).json({ success: false, message: data.message || 'MDM 查询失败' });
    }
    res.json({ success: true, data: data.data });
  } catch (err) { next(err); }
});

router.get('/materials/categories', async (req, res, next) => {
  try {
    const rows = await prisma.material.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    res.json({ success: true, data: rows.map(r => r.category) });
  } catch (err) { next(err); }
});

router.get('/materials', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', category = '', status = '', barcode = '', groupId = '', gradeId = '' } = req.query;
    const where = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
        { barcode: { contains: keyword } },
      ];
    }
    if (barcode) where.barcode = { contains: barcode };
    if (category) where.category = category;
    if (status) where.status = status;
    if (groupId) where.groupId = groupId;
    if (gradeId) {
      where.materialGrades = { some: { gradeId } };
    }

    const [list, total] = await Promise.all([
      prisma.material.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        include: {
          group: { select: { id: true, code: true, name: true } },
          materialGrades: { include: { grade: true }, orderBy: { grade: { sortOrder: 'asc' } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.material.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

router.post('/materials', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF), async (req, res, next) => {
  try {
    const { gradeIds, ...data } = req.body;
    if (!data.name) return res.status(400).json({ success: false, message: '产品名称必填' });
    if (!data.code) data.code = await genCode('material', 'MAT');
    // 编码唯一性校验
    else {
      const conflict = await prisma.material.findFirst({ where: { code: data.code } });
      if (conflict) return res.status(400).json({ success: false, message: `编码「${data.code}」已被产品「${conflict.name}」使用，无法保存` });
    }
    if (data.barcode === '') data.barcode = null;
    if (data.groupId === '') data.groupId = null;

    // 先创建物料
    const mat = await prisma.material.create({
      data,
      include: {
        group: { select: { id: true, code: true, name: true } },
        materialGrades: { include: { grade: true }, orderBy: { grade: { sortOrder: 'asc' } } },
      },
    });

    // 再创建等级关联
    if (gradeIds && Array.isArray(gradeIds) && gradeIds.length > 0) {
      await prisma.materialGradeMapping.createMany({
        data: gradeIds.filter(gid => gid).map(gid => ({ materialId: mat.id, gradeId: gid })),
        skipDuplicates: true,
      });
      // 重新查询带等级信息
      const matWithGrades = await prisma.material.findUnique({
        where: { id: mat.id },
        include: {
          group: { select: { id: true, code: true, name: true } },
          materialGrades: { include: { grade: true }, orderBy: { grade: { sortOrder: 'asc' } } },
        },
      });
      return res.json({ success: true, data: matWithGrades });
    }

    res.json({ success: true, data: mat });
  } catch (err) { next(err); }
});

router.put('/materials/:id', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF), async (req, res, next) => {
  try {
    // 只提取可更新的字段，过滤掉 id/createdAt/updatedAt/grades 等只读字段
    let { id, createdAt, updatedAt, latestReceiptDate, group, materialGrades, gradeIds, ...data } = req.body;
    if (data.barcode === '') data.barcode = null;
    if (data.groupId === '') data.groupId = null;

    // 如果要修改编码，先检查是否与其他物料冲突
    if (data.code) {
      const existing = await prisma.material.findFirst({
        where: { code: data.code, id: { not: req.params.id } },
        select: { id: true, name: true },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `编码「${data.code}」已被其他物料「${existing.name}」使用，无法保存`,
        });
      }
    }

    // 更新物料基础字段
    const mat = await prisma.material.update({
      where: { id: req.params.id },
      data,
      include: {
        group: { select: { id: true, code: true, name: true } },
        materialGrades: { include: { grade: true }, orderBy: { grade: { sortOrder: 'asc' } } },
      },
    });

    // 替换等级关联
    if (gradeIds !== undefined) {
      // 删除旧的关联
      await prisma.materialGradeMapping.deleteMany({ where: { materialId: req.params.id } });
      // 插入新的关联
      if (gradeIds && Array.isArray(gradeIds) && gradeIds.length > 0) {
        await prisma.materialGradeMapping.createMany({
          data: gradeIds.filter(gid => gid).map(gid => ({ materialId: req.params.id, gradeId: gid })),
          skipDuplicates: true,
        });
      }
      // 重新查询带等级信息
      const matWithGrades = await prisma.material.findUnique({
        where: { id: req.params.id },
        include: {
          group: { select: { id: true, code: true, name: true } },
          materialGrades: { include: { grade: true }, orderBy: { grade: { sortOrder: 'asc' } } },
        },
      });
      return res.json({ success: true, data: matWithGrades });
    }

    res.json({ success: true, data: mat });
  } catch (err) { next(err); }
});

// 删除产品（验证业务单据引用，返回具体单据列表）
router.delete('/materials/:id', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER, ROLES.PURCHASE_STAFF), async (req, res, next) => {
  try {
    const { id } = req.params;
    const MAX_ITEMS = 5; // 每种类型最多展示5条单据
    const refs = [];

    // 采购计划 — 通过 PurchasePlanItem → PurchasePlan
    const planItems = await prisma.purchasePlanItem.findMany({
      where: { materialId: id },
      select: { plan: { select: { planNo: true, title: true, status: true } } },
    });
    if (planItems.length > 0) {
      const seen = new Set();
      const items = [];
      for (const pi of planItems) {
        if (!seen.has(pi.plan.planNo)) { seen.add(pi.plan.planNo); items.push(pi.plan); }
      }
      refs.push({ type: '采购计划', count: planItems.length, items: items.slice(0, MAX_ITEMS), more: items.length > MAX_ITEMS ? items.length - MAX_ITEMS : 0 });
    }

    // 采购订单 — 通过 PurchaseOrderItem → PurchaseOrder
    const orderItems = await prisma.purchaseOrderItem.findMany({
      where: { materialId: id },
      select: { order: { select: { orderNo: true, status: true } } },
    });
    if (orderItems.length > 0) {
      const seen = new Set();
      const items = [];
      for (const oi of orderItems) {
        if (!seen.has(oi.order.orderNo)) { seen.add(oi.order.orderNo); items.push({ code: oi.order.orderNo, status: oi.order.status }); }
      }
      refs.push({ type: '采购订单', count: orderItems.length, items: items.slice(0, MAX_ITEMS), more: items.length > MAX_ITEMS ? items.length - MAX_ITEMS : 0 });
    }

    // 采购收货 — 通过 PurchaseReceiptItem → PurchaseReceipt
    const receiptItems = await prisma.purchaseReceiptItem.findMany({
      where: { materialId: id },
      select: { receipt: { select: { receiptNo: true, qcResult: true } } },
    });
    if (receiptItems.length > 0) {
      const seen = new Set();
      const items = [];
      for (const ri of receiptItems) {
        if (!seen.has(ri.receipt.receiptNo)) { seen.add(ri.receipt.receiptNo); items.push({ code: ri.receipt.receiptNo, status: ri.receipt.qcResult }); }
      }
      refs.push({ type: '采购收货', count: receiptItems.length, items: items.slice(0, MAX_ITEMS), more: items.length > MAX_ITEMS ? items.length - MAX_ITEMS : 0 });
    }

    // 销售计划 — 通过 SalesPlanItem → SalesPlan (关联字段名: salesPlan)
    const salesPlanItems = await prisma.salesPlanItem.findMany({
      where: { materialId: id },
      select: { salesPlan: { select: { planNo: true, title: true, status: true } } },
    });
    if (salesPlanItems.length > 0) {
      const seen = new Set();
      const items = [];
      for (const si of salesPlanItems) {
        if (!seen.has(si.salesPlan.planNo)) { seen.add(si.salesPlan.planNo); items.push(si.salesPlan); }
      }
      refs.push({ type: '销售计划', count: salesPlanItems.length, items: items.slice(0, MAX_ITEMS), more: items.length > MAX_ITEMS ? items.length - MAX_ITEMS : 0 });
    }

    // 销售订单 — 通过 SalesOrderItem → SalesOrder (关联字段名: salesOrder)
    const salesOrderItems = await prisma.salesOrderItem.findMany({
      where: { materialId: id },
      select: { salesOrder: { select: { orderNo: true, status: true } } },
    });
    if (salesOrderItems.length > 0) {
      const seen = new Set();
      const items = [];
      for (const si of salesOrderItems) {
        if (!seen.has(si.salesOrder.orderNo)) { seen.add(si.salesOrder.orderNo); items.push({ code: si.salesOrder.orderNo, status: si.salesOrder.status }); }
      }
      refs.push({ type: '销售订单', count: salesOrderItems.length, items: items.slice(0, MAX_ITEMS), more: items.length > MAX_ITEMS ? items.length - MAX_ITEMS : 0 });
    }

    // 库存记录
    const inventories = await prisma.inventory.findMany({
      where: { materialId: id },
      select: { warehouse: { select: { name: true } }, qty: true },
    });
    if (inventories.length > 0) {
      const items = inventories.map(inv => ({ code: inv.warehouse.name, status: `库存 ${inv.qty}` }));
      refs.push({ type: '库存记录', count: inventories.length, items: items.slice(0, MAX_ITEMS), more: inventories.length > MAX_ITEMS ? inventories.length - MAX_ITEMS : 0 });
    }

    // 库存移动
    const movements = await prisma.stockMovement.findMany({
      where: { materialId: id },
      select: { movementNo: true, movementType: true, direction: true },
    });
    if (movements.length > 0) {
      const items = movements.map(m => ({ code: m.movementNo, status: `${m.movementType}(${m.direction})` }));
      refs.push({ type: '库存移动', count: movements.length, items: items.slice(0, MAX_ITEMS), more: movements.length > MAX_ITEMS ? movements.length - MAX_ITEMS : 0 });
    }

    // 批次
    const batches = await prisma.batch.findMany({
      where: { materialId: id },
      select: { batchNo: true, status: true, remainingQty: true },
    });
    if (batches.length > 0) {
      const items = batches.map(b => ({ code: b.batchNo, status: `${b.status}, 余量${b.remainingQty}` }));
      refs.push({ type: '批次', count: batches.length, items: items.slice(0, MAX_ITEMS), more: batches.length > MAX_ITEMS ? batches.length - MAX_ITEMS : 0 });
    }

    // 价格清单
    const priceLists = await prisma.priceList.findMany({
      where: { materialId: id },
      select: { priceType: true, status: true, price: true },
    });
    if (priceLists.length > 0) {
      const items = priceLists.map(p => ({ code: p.priceType, status: `${p.status}, ¥${p.price}` }));
      refs.push({ type: '价格清单', count: priceLists.length, items: items.slice(0, MAX_ITEMS), more: priceLists.length > MAX_ITEMS ? priceLists.length - MAX_ITEMS : 0 });
    }

    // 采购员分配 — 通过 PurchaserMaterialItem → PurchaserAssignment → user → employee
    const purchaserItems = await prisma.purchaserMaterialItem.findMany({
      where: { materialId: id },
      select: { assignment: { select: { status: true, user: { select: { employee: { select: { name: true } } } } } } },
    });
    if (purchaserItems.length > 0) {
      const items = purchaserItems.map(pm => ({ code: pm.assignment.user?.employee?.name || '-', status: pm.assignment.status }));
      refs.push({ type: '采购员分配', count: purchaserItems.length, items: items.slice(0, MAX_ITEMS), more: purchaserItems.length > MAX_ITEMS ? purchaserItems.length - MAX_ITEMS : 0 });
    }

    // 盘点记录 — 通过 StockTakeItem → StockTake
    const stockTakeItems = await prisma.stockTakeItem.findMany({
      where: { materialId: id },
      select: { stockTake: { select: { takeNo: true, status: true } } },
    });
    if (stockTakeItems.length > 0) {
      const seen = new Set();
      const items = [];
      for (const st of stockTakeItems) {
        if (!seen.has(st.stockTake.takeNo)) { seen.add(st.stockTake.takeNo); items.push({ code: st.stockTake.takeNo, status: st.stockTake.status }); }
      }
      refs.push({ type: '盘点记录', count: stockTakeItems.length, items: items.slice(0, MAX_ITEMS), more: items.length > MAX_ITEMS ? items.length - MAX_ITEMS : 0 });
    }

    // 如果有引用，返回 400 + 引用详情（含具体单据列表）
    if (refs.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该产品已被业务单据引用，无法删除',
        references: refs,
      });
    }

    // 无引用，允许删除
    await prisma.material.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// ============================================================
// 客户管理
// ============================================================

// ============================================================
// 客户管理
// ============================================================

// 部门负责人缓存（5分钟）
let _deptManagerCache = null;
let _deptManagerCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function isDepartmentManager(userId) {
  const now = Date.now();
  if (_deptManagerCache && (now - _deptManagerCacheTime) < CACHE_TTL) {
    return _deptManagerCache.has(userId);
  }
  // 查所有部门的 managerId
  const departments = await prisma.department.findMany({
    where: { managerId: { not: null } },
    select: { managerId: true },
  });
  // 查所有用户的 employeeId
  const users = await prisma.user.findMany({
    select: { id: true, employeeId: true },
  });
  const userEmployeeMap = {};
  for (const u of users) {
    if (u.employeeId) userEmployeeMap[u.id] = u.employeeId;
  }
  // 构建 userId → isManager 映射
  const managerEmployeeIds = new Set(departments.map(d => d.managerId));
  _deptManagerCache = new Set();
  for (const u of users) {
    const empId = u.employeeId;
    if (empId && managerEmployeeIds.has(empId)) {
      _deptManagerCache.add(u.id);
    }
  }
  _deptManagerCacheTime = now;
  return _deptManagerCache.has(userId);
}

router.get('/customers', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '', salesRepId = '', mine = '' } = req.query;
    const where = {};
    if (keyword) {
      where.OR = [{ name: { contains: keyword } }, { code: { contains: keyword } }, { contactPerson: { contains: keyword } }];
    }
    if (status) where.status = status;

    // ======== 数据隔离 ========
    const user = req.user;
    const role = user.role;

    if (role === ROLES.SUPER_ADMIN) {
      // 超级管理员：无过滤
    } else {
      // 先检查是否部门负责人（不管什么角色），是则看本部门所有成员的客户
      const isManager = await isDepartmentManager(user.userId);
      if (isManager && user.departmentId) {
        const deptMembers = await prisma.employee.findMany({
          where: { departmentId: user.departmentId },
          select: { id: true },
        });
        const deptEmployeeIds = deptMembers.map(e => e.id);
        where.salesRepId = { in: deptEmployeeIds };
      } else if (role === ROLES.SALES_MANAGER || role === ROLES.SALES_STAFF || role === 'SALES_REP') {
        // 销售角色非负责人：只看自己的客户
        where.salesRepId = user.employeeId || null;
      } else {
        // 其他非销售角色：只看自己负责的客户
        where.salesRepId = user.employeeId || null;
      }
    }

    // 前端手动筛选 salesRepId（在数据隔离范围内子集过滤）
    if (salesRepId) where.salesRepId = salesRepId;
    // mine 参数强制只看自己的（业务员默认已应用，非业务员显式传 mine=true 时生效）
    if (mine === 'true' && role !== ROLES.SALES_STAFF && role !== ROLES.SALES_MANAGER && role !== 'SALES_REP') {
      where.salesRepId = user.employeeId || null;
    }

    const [list, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          salesRep: { select: { id: true, name: true, empNo: true } },
          department: { select: { id: true, name: true } },
          addresses: true,
        },
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

router.post('/customers', authorize(ROLES.SUPER_ADMIN, ROLES.SALES_MANAGER, ROLES.SALES_REP), async (req, res, next) => {
  try {
    // 过滤 id/code/createdAt/updatedAt 等只读字段，以及嵌套关联对象
    let { id, createdAt, updatedAt, salesRep, department, addresses, priceLists, salesOrders, salesPlanItems, accountsReceivable, shippingOrders, waybills, afterSales, batchTrackings, ...data } = req.body;
    if (!data.name) return res.status(400).json({ success: false, message: '客户名称必填' });
    // 业务员未指定时，SALES_REP 自动绑定自己
    if (!data.salesRepId) {
      const isSalesRep = req.user.role === 'SALES_REP' || req.user.role === 'SALES_STAFF';
      if (isSalesRep && req.user.employeeId) {
        data.salesRepId = req.user.employeeId;
      }
    }
    if (!data.code) data.code = await genCode('customer', 'CUS');
    // 编码唯一性校验
    else {
      const conflict = await prisma.customer.findFirst({ where: { code: data.code } });
      if (conflict) return res.status(400).json({ success: false, message: `编码「${data.code}」已被客户「${conflict.name}」使用，无法保存` });
    }
    if (data.salesRepId === '') data.salesRepId = null;
    if (data.departmentId === '') data.departmentId = null;
    const cust = await prisma.customer.create({
      data,
      include: { addresses: true },
    });
    res.json({ success: true, data: cust });
  } catch (err) { next(err); }
});

router.put('/customers/:id', authorize(ROLES.SUPER_ADMIN, ROLES.SALES_MANAGER, ROLES.SALES_REP), async (req, res, next) => {
  try {
    // 过滤 id/createdAt/updatedAt 等只读字段，以及嵌套关联对象
    let { id, createdAt, updatedAt, salesRep, department, addresses, priceLists, salesOrders, salesPlanItems, accountsReceivable, shippingOrders, waybills, afterSales, batchTrackings, ...data } = req.body;
    if (data.salesRepId === '' || data.salesRepId === undefined) data.salesRepId = null;
    if (data.departmentId === '' || data.departmentId === undefined) data.departmentId = null;
    // 编码唯一性校验
    if (data.code) {
      const conflict = await prisma.customer.findFirst({ where: { code: data.code, id: { not: req.params.id } } });
      if (conflict) return res.status(400).json({ success: false, message: `编码「${data.code}」已被其他客户「${conflict.name}」使用，无法保存` });
    }
    const cust = await prisma.customer.update({
      where: { id: req.params.id },
      data,
      include: {
        salesRep: { select: { id: true, name: true, empNo: true } },
        department: { select: { id: true, name: true } },
        addresses: true,
      },
    });
    res.json({ success: true, data: cust });
  } catch (err) { next(err); }
});

// 删除客户（验证业务单据引用）
router.delete('/customers/:id', authorize(ROLES.SUPER_ADMIN, ROLES.SALES_MANAGER), async (req, res, next) => {
  try {
    const { id } = req.params;
    const refs = [];
    const MAX_ITEMS = 5;

    // 1. 销售计划 — 通过 SalesPlanItem.customerId → SalesPlan
    const salesPlanItems = await prisma.salesPlanItem.findMany({
      where: { customerId: id },
      select: { salesPlan: { select: { planNo: true, title: true, status: true } } },
    });
    if (salesPlanItems.length > 0) {
      const seen = new Set();
      const items = [];
      for (const spi of salesPlanItems) {
        if (!seen.has(spi.salesPlan.planNo)) { seen.add(spi.salesPlan.planNo); items.push(spi.salesPlan); }
      }
      refs.push({ type: '销售计划', count: salesPlanItems.length, items: items.slice(0, MAX_ITEMS), more: items.length > MAX_ITEMS ? items.length - MAX_ITEMS : 0 });
    }

    // 2. 销售订单 — SalesOrder.customerId
    const salesOrders = await prisma.salesOrder.findMany({
      where: { customerId: id },
      select: { orderNo: true, status: true },
    });
    if (salesOrders.length > 0) {
      const items = salesOrders.map(so => ({ code: so.orderNo, status: so.status }));
      refs.push({ type: '销售订单', count: salesOrders.length, items: items.slice(0, MAX_ITEMS), more: salesOrders.length > MAX_ITEMS ? salesOrders.length - MAX_ITEMS : 0 });
    }

    // 3. 批次追溯 — BatchTracking.customerId
    const batchTrackings = await prisma.batchTracking.findMany({
      where: { customerId: id },
      select: { batch: { select: { batchNo: true, status: true, remainingQty: true } } },
    });
    if (batchTrackings.length > 0) {
      const seen = new Set();
      const items = [];
      for (const bt of batchTrackings) {
        if (!seen.has(bt.batch.batchNo)) { seen.add(bt.batch.batchNo); items.push({ code: bt.batch.batchNo, status: bt.batch.status, title: `余量: ${bt.batch.remainingQty}` }); }
      }
      refs.push({ type: '批次追溯', count: batchTrackings.length, items: items.slice(0, MAX_ITEMS), more: items.length > MAX_ITEMS ? items.length - MAX_ITEMS : 0 });
    }

    // 4. 应收账款 — AccountsReceivable.customerId
    const arRecords = await prisma.accountsReceivable.findMany({
      where: { customerId: id },
      select: { arNo: true, status: true, balance: true },
    });
    if (arRecords.length > 0) {
      const items = arRecords.map(ar => ({ code: ar.arNo, status: ar.status, title: `余额: ¥${ar.balance}` }));
      refs.push({ type: '应收账款', count: arRecords.length, items: items.slice(0, MAX_ITEMS), more: arRecords.length > MAX_ITEMS ? arRecords.length - MAX_ITEMS : 0 });
    }

    // 5. 运单 — Waybill.customerId
    const waybills = await prisma.waybill.findMany({
      where: { customerId: id },
      select: { waybillNo: true, status: true },
    });
    if (waybills.length > 0) {
      const items = waybills.map(w => ({ code: w.waybillNo, status: w.status }));
      refs.push({ type: '运单', count: waybills.length, items: items.slice(0, MAX_ITEMS), more: waybills.length > MAX_ITEMS ? waybills.length - MAX_ITEMS : 0 });
    }

    // 6. 发货单 — ShippingOrder.customerId
    const shippingOrders = await prisma.shippingOrder.findMany({
      where: { customerId: id },
      select: { shippingNo: true, status: true },
    });
    if (shippingOrders.length > 0) {
      const items = shippingOrders.map(so => ({ code: so.shippingNo, status: so.status }));
      refs.push({ type: '发货单', count: shippingOrders.length, items: items.slice(0, MAX_ITEMS), more: shippingOrders.length > MAX_ITEMS ? shippingOrders.length - MAX_ITEMS : 0 });
    }

    // 7. 售后记录 — AfterSalesRecord.customerId
    const afterSales = await prisma.afterSalesRecord.findMany({
      where: { customerId: id },
      select: { recordNo: true, type: true, status: true },
    });
    if (afterSales.length > 0) {
      const items = afterSales.map(as => ({ code: as.recordNo, status: as.status, title: as.type }));
      refs.push({ type: '售后记录', count: afterSales.length, items: items.slice(0, MAX_ITEMS), more: afterSales.length > MAX_ITEMS ? afterSales.length - MAX_ITEMS : 0 });
    }

    // 有引用 → 400 + 具体单据列表
    if (refs.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该客户已被业务单据引用，无法删除',
        references: refs,
      });
    }

    // 无引用 → 允许删除（CustomerAddress 有 onDelete: Cascade 会自动清理）
    await prisma.customer.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// 客户收货地址
router.post('/customers/:id/addresses', async (req, res, next) => {
  try {
    const addr = await prisma.customerAddress.create({
      data: { ...req.body, customerId: req.params.id },
    });
    res.json({ success: true, data: addr });
  } catch (err) { next(err); }
});

router.delete('/customers/:id/addresses/:addrId', async (req, res, next) => {
  try {
    await prisma.customerAddress.delete({ where: { id: req.params.addrId } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// ============================================================
// 供应商管理
// ============================================================

router.get('/suppliers', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '' } = req.query;
    const where = {};
    if (keyword) {
      where.OR = [{ name: { contains: keyword } }, { code: { contains: keyword } }, { contactPerson: { contains: keyword } }];
    }
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplier.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

router.post('/suppliers', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.name) return res.status(400).json({ success: false, message: '供应商名称必填' });
    if (!data.code) data.code = await genCode('supplier', 'SUP');
    // 编码唯一性校验
    else {
      const conflict = await prisma.supplier.findFirst({ where: { code: data.code } });
      if (conflict) return res.status(400).json({ success: false, message: `编码「${data.code}」已被供应商「${conflict.name}」使用，无法保存` });
    }
    const sup = await prisma.supplier.create({ data });
    res.json({ success: true, data: sup });
  } catch (err) { next(err); }
});

router.put('/suppliers/:id', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_STAFF, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const data = req.body;
    // 编码唯一性校验
    if (data.code) {
      const conflict = await prisma.supplier.findFirst({ where: { code: data.code, id: { not: req.params.id } } });
      if (conflict) return res.status(400).json({ success: false, message: `编码「${data.code}」已被其他供应商「${conflict.name}」使用，无法保存` });
    }
    const sup = await prisma.supplier.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: sup });
  } catch (err) { next(err); }
});

// 删除供应商（验证业务单据引用，返回具体单据列表）
router.delete('/suppliers/:id', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const { id } = req.params;
    const MAX_ITEMS = 5;
    const refs = [];

    // 1. 采购订单 — PurchaseOrder.supplierId
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { supplierId: id },
      select: { orderNo: true, status: true },
    });
    if (purchaseOrders.length > 0) {
      const items = purchaseOrders.map(po => ({ code: po.orderNo, status: po.status }));
      refs.push({ type: '采购订单', count: purchaseOrders.length, items: items.slice(0, MAX_ITEMS), more: purchaseOrders.length > MAX_ITEMS ? purchaseOrders.length - MAX_ITEMS : 0 });
    }

    // 2. 采购计划 — PurchasePlanItem.supplierId → PurchasePlan (关联字段名: plan)
    const planItems = await prisma.purchasePlanItem.findMany({
      where: { supplierId: id },
      select: { plan: { select: { planNo: true, title: true, status: true } } },
    });
    if (planItems.length > 0) {
      const seen = new Set();
      const items = [];
      for (const pi of planItems) {
        if (!seen.has(pi.plan.planNo)) { seen.add(pi.plan.planNo); items.push(pi.plan); }
      }
      refs.push({ type: '采购计划', count: planItems.length, items: items.slice(0, MAX_ITEMS), more: items.length > MAX_ITEMS ? items.length - MAX_ITEMS : 0 });
    }

    // 3. 销售计划 — SalesPlanItem.supplierId → SalesPlan (关联字段名: salesPlan)
    const salesPlanItems = await prisma.salesPlanItem.findMany({
      where: { supplierId: id },
      select: { salesPlan: { select: { planNo: true, title: true, status: true } } },
    });
    if (salesPlanItems.length > 0) {
      const seen = new Set();
      const items = [];
      for (const spi of salesPlanItems) {
        if (!seen.has(spi.salesPlan.planNo)) { seen.add(spi.salesPlan.planNo); items.push(spi.salesPlan); }
      }
      refs.push({ type: '销售计划', count: salesPlanItems.length, items: items.slice(0, MAX_ITEMS), more: items.length > MAX_ITEMS ? items.length - MAX_ITEMS : 0 });
    }

    // 4. 批次 — Batch.supplierId
    const batches = await prisma.batch.findMany({
      where: { supplierId: id },
      select: { batchNo: true, status: true, remainingQty: true },
    });
    if (batches.length > 0) {
      const items = batches.map(b => ({ code: b.batchNo, status: `${b.status}, 余量${b.remainingQty}` }));
      refs.push({ type: '批次', count: batches.length, items: items.slice(0, MAX_ITEMS), more: batches.length > MAX_ITEMS ? batches.length - MAX_ITEMS : 0 });
    }

    // 5. 应付账款 — AccountsPayable.supplierId
    const apRecords = await prisma.accountsPayable.findMany({
      where: { supplierId: id },
      select: { apNo: true, status: true, balance: true },
    });
    if (apRecords.length > 0) {
      const items = apRecords.map(ap => ({ code: ap.apNo, status: ap.status, title: `余额: ¥${ap.balance}` }));
      refs.push({ type: '应付账款', count: apRecords.length, items: items.slice(0, MAX_ITEMS), more: apRecords.length > MAX_ITEMS ? apRecords.length - MAX_ITEMS : 0 });
    }

    // 6. 供应商评估 — SupplierEvaluation.supplierId
    const supplierEvals = await prisma.supplierEvaluation.findMany({
      where: { supplierId: id },
      select: { evalPeriod: true, totalScore: true },
    });
    if (supplierEvals.length > 0) {
      const items = supplierEvals.map(se => ({ code: se.evalPeriod, status: `评分: ${se.totalScore}` }));
      refs.push({ type: '供应商评估', count: supplierEvals.length, items: items.slice(0, MAX_ITEMS), more: supplierEvals.length > MAX_ITEMS ? supplierEvals.length - MAX_ITEMS : 0 });
    }

    // 7. 合同 — Contract.supplierId (关联名: SupplierContract)
    const contracts = await prisma.contract.findMany({
      where: { supplierId: id },
      select: { contractNo: true, title: true, contractType: true, status: true },
    });
    if (contracts.length > 0) {
      const items = contracts.map(c => ({ code: c.contractNo, status: c.status, title: `${c.contractType} - ${c.title}` }));
      refs.push({ type: '合同', count: contracts.length, items: items.slice(0, MAX_ITEMS), more: contracts.length > MAX_ITEMS ? contracts.length - MAX_ITEMS : 0 });
    }

    // 有引用 → 400 + 具体单据列表
    if (refs.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该供应商已被业务单据引用，无法删除',
        references: refs,
      });
    }

    // 无引用 → 允许删除
    await prisma.supplier.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// ============================================================
// 仓库管理
// ============================================================

// 自动创建 SCM 用户（Portal-only 用户首次被选为仓管员时）
async function resolvePortalUserId(portalManagerId) {
  if (!portalManagerId || !portalManagerId.startsWith('portal-')) return portalManagerId;
  const portalEmail = portalManagerId.replace('portal-', '');
  const portalPool = getPool();
  const [portalRows] = await portalPool.execute(
    'SELECT email, name, employeeNo, departmentName FROM portal_user WHERE email = ?',
    [portalEmail]
  );
  if (portalRows.length === 0) return null;
  const portalUser = portalRows[0];
  const employee = await prisma.employee.findFirst({ where: { empNo: portalUser.employeeNo } });
  const newUser = await prisma.user.create({
    data: {
      username: portalUser.employeeNo || portalUser.email.split('@')[0],
      passwordHash: 'portal-sso-auto-created',  // SSO 登录不依赖本地密码
      role: 'WAREHOUSE_STAFF',
      status: 'ACTIVE',
      employeeId: employee?.id || null,
    },
  });
  return newUser.id;
}

// 获取可分配为仓管员的用户列表（只显示在 Portal 中角色包含仓储模块权限的用户）
router.get('/warehouse-users', async (req, res, next) => {
  try {
    // 1. 从 Portal DB 查出有 SCM 仓储模块权限的用户邮箱（排除超级管理员）
    const warehouseEmails = await getScmModuleUserEmails(['warehouse'], { excludeSystemAdmin: true });
    const emailPrefixSet = new Set(warehouseEmails.map((e) => e.split('@')[0].toLowerCase()));
    const emailSet = new Set(warehouseEmails.map((e) => e.toLowerCase()));

    // 2. 查出所有 SCM ACTIVE 用户（带员工信息含 email）
    const allUsers = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        username: true,
        role: true,
        employee: { select: { id: true, name: true, empNo: true, email: true, department: { select: { name: true } } } },
      },
      orderBy: { username: 'asc' },
    });

    // 3. 仅靠 Portal 权限邮箱匹配过滤（不做角色兜底）
    const matchedUsers = allUsers.filter((u) => {
      if (u.employee?.email && emailSet.has(u.employee.email.toLowerCase())) return true;
      if (emailPrefixSet.has(u.username.toLowerCase())) return true;
      if (u.employee?.empNo && emailPrefixSet.has(u.employee.empNo.toLowerCase())) return true;
      return false;
    });

    // 4. Portal 邮箱中未匹配到 SCM 用户的，从 Portal 缓存补充（确保邵玉云等未登录SCM的用户也能显示）
    const matchedIds = new Set(matchedUsers.map(u => u.id));
    const unmatchedEmails = warehouseEmails.filter(e => {
      const prefix = e.split('@')[0].toLowerCase();
      return !allUsers.some(u =>
        (u.employee?.email && u.employee.email.toLowerCase() === e.toLowerCase()) ||
        u.username.toLowerCase() === prefix ||
        (u.employee?.empNo && u.employee.empNo.toLowerCase() === prefix)
      );
    });

    // 为未匹配的 Portal 邹箱，查询 Portal 缓存补充用户信息
    const portalSupplementUsers = [];
    if (unmatchedEmails.length > 0) {
      const portalPool = getPool();
      const placeholders = unmatchedEmails.map(() => '?').join(',');
      const [portalRows] = await portalPool.execute(
        `SELECT email, name, employeeNo, departmentName FROM portal_user WHERE email IN (${placeholders})`,
        unmatchedEmails
      );
      for (const row of portalRows) {
        portalSupplementUsers.push({
          id: `portal-${row.email}`,  // 临时 ID，前端显示用
          username: row.employeeNo || row.email.split('@')[0],
          role: 'WAREHOUSE_STAFF',
          employee: {
            id: null,
            name: row.name,
            empNo: row.employeeNo,
            email: row.email,
            department: { name: row.departmentName || '' },
          },
          isPortalOnly: true,  // 标记为仅 Portal 用户
        });
      }
    }

    res.json({ success: true, data: [...matchedUsers, ...portalSupplementUsers] });
  } catch (err) { next(err); }
});

router.get('/warehouses', async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        manager: { select: { id: true, name: true, empNo: true } },
        warehouseManager: { select: { id: true, username: true, employee: { select: { id: true, name: true, empNo: true } } } },
        zones: { include: { _count: { select: { locations: true } } } },
        _count: { select: { inventory: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: warehouses });
  } catch (err) { next(err); }
});

router.post('/warehouses', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    let { name, code, address, managerId, warehouseManagerId, isColdStorage, status } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '仓库名称必填' });
    warehouseManagerId = await resolvePortalUserId(warehouseManagerId);
    const wh = await prisma.warehouse.create({
      data: { code: code || (await genCode('warehouse', 'WH')), name, address, managerId, warehouseManagerId, isColdStorage: isColdStorage || false, status: status || 'ACTIVE' },
    });
    res.json({ success: true, data: wh });
  } catch (err) { next(err); }
});

router.put('/warehouses/:id', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    let { name, code, address, managerId, warehouseManagerId, isColdStorage, status } = req.body;
    warehouseManagerId = await resolvePortalUserId(warehouseManagerId);
    const wh = await prisma.warehouse.update({
      where: { id: req.params.id },
      data: { name, code, address, managerId, warehouseManagerId, isColdStorage, status },
    });
    res.json({ success: true, data: wh });
  } catch (err) { next(err); }
});

// 删除仓库（验证业务单据引用，返回具体单据列表）
router.delete('/warehouses/:id', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_MANAGER), async (req, res, next) => {
  try {
    const { id } = req.params;
    const MAX_ITEMS = 5;
    const refs = [];

    // 1. 采购订单 — PurchaseOrder.warehouseId
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { warehouseId: id },
      select: { orderNo: true, status: true },
    });
    if (purchaseOrders.length > 0) {
      const items = purchaseOrders.map(po => ({ code: po.orderNo, status: po.status }));
      refs.push({ type: '采购订单', count: purchaseOrders.length, items: items.slice(0, MAX_ITEMS), more: purchaseOrders.length > MAX_ITEMS ? purchaseOrders.length - MAX_ITEMS : 0 });
    }

    // 2. 采购收货 — PurchaseReceipt.warehouseId
    const receipts = await prisma.purchaseReceipt.findMany({
      where: { warehouseId: id },
      select: { receiptNo: true, status: true },
    });
    if (receipts.length > 0) {
      const items = receipts.map(r => ({ code: r.receiptNo, status: r.status }));
      refs.push({ type: '采购收货', count: receipts.length, items: items.slice(0, MAX_ITEMS), more: receipts.length > MAX_ITEMS ? receipts.length - MAX_ITEMS : 0 });
    }

    // 3. 销售订单 — SalesOrder.warehouseId
    const salesOrders = await prisma.salesOrder.findMany({
      where: { warehouseId: id },
      select: { orderNo: true, status: true },
    });
    if (salesOrders.length > 0) {
      const items = salesOrders.map(so => ({ code: so.orderNo, status: so.status }));
      refs.push({ type: '销售订单', count: salesOrders.length, items: items.slice(0, MAX_ITEMS), more: salesOrders.length > MAX_ITEMS ? salesOrders.length - MAX_ITEMS : 0 });
    }

    // 4. 发货单 — ShippingOrder.warehouseId
    const shippingOrders = await prisma.shippingOrder.findMany({
      where: { warehouseId: id },
      select: { shippingNo: true, status: true },
    });
    if (shippingOrders.length > 0) {
      const items = shippingOrders.map(so => ({ code: so.shippingNo, status: so.status }));
      refs.push({ type: '发货单', count: shippingOrders.length, items: items.slice(0, MAX_ITEMS), more: shippingOrders.length > MAX_ITEMS ? shippingOrders.length - MAX_ITEMS : 0 });
    }

    // 5. 库存移动 — StockMovement.warehouseId (无status字段，用direction)
    const stockMovements = await prisma.stockMovement.findMany({
      where: { warehouseId: id },
      select: { movementNo: true, movementType: true, direction: true },
    });
    if (stockMovements.length > 0) {
      const items = stockMovements.map(sm => ({ code: sm.movementNo, status: sm.direction, title: sm.movementType }));
      refs.push({ type: '库存移动', count: stockMovements.length, items: items.slice(0, MAX_ITEMS), more: stockMovements.length > MAX_ITEMS ? stockMovements.length - MAX_ITEMS : 0 });
    }

    // 6. 盘点 — StockTake.warehouseId
    const stockTakes = await prisma.stockTake.findMany({
      where: { warehouseId: id },
      select: { takeNo: true, takeType: true, status: true },
    });
    if (stockTakes.length > 0) {
      const items = stockTakes.map(st => ({ code: st.takeNo, status: st.status, title: st.takeType }));
      refs.push({ type: '盘点', count: stockTakes.length, items: items.slice(0, MAX_ITEMS), more: stockTakes.length > MAX_ITEMS ? stockTakes.length - MAX_ITEMS : 0 });
    }

    // 7. 库存记录 — Inventory.warehouseId
    const inventoryRecords = await prisma.inventory.findMany({
      where: { warehouseId: id, qty: { gt: 0 } },
      select: { material: { select: { name: true, code: true } }, qty: true },
    });
    if (inventoryRecords.length > 0) {
      const items = inventoryRecords.map(inv => ({ code: inv.material.code, status: `数量: ${inv.qty}`, title: inv.material.name }));
      refs.push({ type: '库存记录(有库存)', count: inventoryRecords.length, items: items.slice(0, MAX_ITEMS), more: inventoryRecords.length > MAX_ITEMS ? inventoryRecords.length - MAX_ITEMS : 0 });
    }

    // 8. 库存锁定 — StockLock.warehouseId (未释放的锁定)
    const stockLocks = await prisma.stockLock.findMany({
      where: { warehouseId: id, status: 'LOCKED' },
      select: { material: { select: { name: true, code: true } }, qty: true, lockType: true },
    });
    if (stockLocks.length > 0) {
      const items = stockLocks.map(sl => ({ code: sl.material.code, status: `锁定${sl.qty}`, title: `${sl.lockType} - ${sl.material.name}` }));
      refs.push({ type: '库存锁定', count: stockLocks.length, items: items.slice(0, MAX_ITEMS), more: stockLocks.length > MAX_ITEMS ? stockLocks.length - MAX_ITEMS : 0 });
    }

    // 9. 传感器 — Sensor.warehouseId
    const sensors = await prisma.sensor.findMany({
      where: { warehouseId: id },
      select: { sensorCode: true, name: true, sensorType: true },
    });
    if (sensors.length > 0) {
      const items = sensors.map(s => ({ code: s.sensorCode, status: s.sensorType, title: s.name }));
      refs.push({ type: '传感器', count: sensors.length, items: items.slice(0, MAX_ITEMS), more: sensors.length > MAX_ITEMS ? sensors.length - MAX_ITEMS : 0 });
    }

    // 有引用 → 400 + 具体单据列表
    if (refs.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该仓库已被业务单据引用，无法删除',
        references: refs,
      });
    }

    // 无引用 → 允许删除
    await prisma.warehouse.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// 库区管理
router.get('/warehouses/:id/zones', async (req, res, next) => {
  try {
    const zones = await prisma.warehouseZone.findMany({
      where: { warehouseId: req.params.id },
      include: { _count: { select: { locations: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: zones });
  } catch (err) { next(err); }
});

router.post('/warehouses/:id/zones', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const zone = await prisma.warehouseZone.create({
      data: { ...req.body, warehouseId: req.params.id },
    });
    res.json({ success: true, data: zone });
  } catch (err) { next(err); }
});

// 库位管理
router.get('/zones/:id/locations', async (req, res, next) => {
  try {
    const locations = await prisma.warehouseLocation.findMany({
      where: { zoneId: req.params.id },
      orderBy: { code: 'asc' },
    });
    res.json({ success: true, data: locations });
  } catch (err) { next(err); }
});

router.post('/zones/:id/locations', authorize(ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_STAFF), async (req, res, next) => {
  try {
    const loc = await prisma.warehouseLocation.create({
      data: { ...req.body, zoneId: req.params.id },
    });
    res.json({ success: true, data: loc });
  } catch (err) { next(err); }
});

// ============================================================
// 数据中心
// ============================================================

router.get('/data-centers', async (req, res, next) => {
  try {
    const centers = await prisma.dataCenter.findMany();
    res.json({ success: true, data: centers });
  } catch (err) { next(err); }
});

// ============================================================
// 采购员管理 — 采购员与负责物料的分配关系
// ============================================================

// 获取可分配为采购员的用户列表（只显示在 Portal 中角色包含采购模块权限的用户）
router.get('/purchaser-users', async (req, res, next) => {
  try {
    // 1. 从 Portal DB 查出有 SCM 采购模块权限的用户邮箱
    const purchaseEmails = await getScmModuleUserEmails(['purchase']);
    const emailPrefixSet = new Set(purchaseEmails.map((e) => e.split('@')[0].toLowerCase()));
    const emailSet = new Set(purchaseEmails.map((e) => e.toLowerCase()));

    // 2. 查出所有 SCM ACTIVE 用户（带员工信息含 email）
    const allUsers = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        username: true,
        role: true,
        employee: { select: { id: true, name: true, empNo: true, email: true, department: { select: { name: true } } } },
      },
      orderBy: { username: 'asc' },
    });

    // 3. 匹配过滤（与 SSO 登录使用相同的多策略匹配）
    //    策略a: Employee.email 精确匹配 Portal userEmail
    //    策略b: username = Portal userEmail 前缀（如 admin@hrms.com → admin）
    //    策略c: Employee.empNo 匹配 Portal userEmail 前缀（如 emp003@hrms.internal → EMP003）
    //    策略d: SCM role 为采购相关角色作为兜底（PURCHASE_MANAGER/PURCHASE_STAFF/SUPER_ADMIN）
    //           适用于 SSO 登录尚未更新角色但种子数据已标记为采购角色的用户
    const PURCHASE_ROLES = ['SUPER_ADMIN', 'PURCHASE_MANAGER', 'PURCHASE_STAFF'];
    const filteredUsers = allUsers.filter((u) => {
      if (u.employee?.email && emailSet.has(u.employee.email.toLowerCase())) return true;
      if (emailPrefixSet.has(u.username.toLowerCase())) return true;
      if (u.employee?.empNo && emailPrefixSet.has(u.employee.empNo.toLowerCase())) return true;
      if (PURCHASE_ROLES.includes(u.role)) return true;
      return false;
    });

    res.json({ success: true, data: filteredUsers });
  } catch (err) { next(err); }
});

// 当前采购员分配的物料ID列表（用于采购计划物料下拉过滤）
router.get('/purchaser-assignments/my-materials', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    // 查当前用户的 PurchaserAssignment（ACTIVE）
    const assignment = await prisma.purchaserAssignment.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        materials: { select: { materialId: true } },
      },
    });
    if (!assignment) {
      // 没有分配记录 → 返回空数组，前端理解为"不限"（看全部物料）
      return res.json({ success: true, data: { materialIds: [], restricted: false } });
    }
    const materialIds = assignment.materials.map(m => m.materialId);
    res.json({ success: true, data: { materialIds, restricted: true } });
  } catch (err) { next(err); }
});

// 采购员分配列表
router.get('/purchaser-assignments', async (req, res, next) => {
  try {
    const { keyword = '', status = '' } = req.query;
    const where = {};
    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { user: { username: { contains: keyword } } },
        { user: { employee: { name: { contains: keyword } } } },
      ];
    }
    const list = await prisma.purchaserAssignment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true, username: true, role: true,
            employee: { select: { name: true, empNo: true, department: { select: { name: true } } } },
          },
        },
        materials: {
          include: {
            material: { select: { id: true, code: true, name: true, spec: true, unit: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});

// 获取单条采购员分配详情
router.get('/purchaser-assignments/:id', async (req, res, next) => {
  try {
    const assignment = await prisma.purchaserAssignment.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true, username: true, role: true,
            employee: { select: { name: true, empNo: true, department: { select: { name: true } } } },
          },
        },
        materials: {
          include: {
            material: { select: { id: true, code: true, name: true, spec: true, unit: true, category: true } },
          },
        },
      },
    });
    if (!assignment) return res.status(404).json({ success: false, message: '采购员分配不存在' });
    res.json({ success: true, data: assignment });
  } catch (err) { next(err); }
});

// 新增采购员分配（选用户 + 批量选物料）
router.post('/purchaser-assignments', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER, ROLES.PURCHASE_STAFF), async (req, res, next) => {
  try {
    const { userId, materialIds = [], remark } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: '请选择采购员' });
    if (!materialIds.length) return res.status(400).json({ success: false, message: '请至少选择一个物料' });

    // 检查该用户是否已有分配记录
    const existing = await prisma.purchaserAssignment.findUnique({ where: { userId } });
    if (existing) return res.status(400).json({ success: false, message: '该用户已存在采购员分配记录，请直接编辑' });

    const assignment = await prisma.purchaserAssignment.create({
      data: {
        userId,
        remark: remark || null,
        materials: {
          create: materialIds.map((materialId) => ({ materialId })),
        },
      },
      include: {
        user: { select: { id: true, username: true, employee: { select: { name: true } } } },
        materials: { include: { material: { select: { id: true, code: true, name: true } } } },
      },
    });
    res.json({ success: true, data: assignment, message: '采购员分配创建成功' });
  } catch (err) { next(err); }
});

// 编辑采购员分配（更新物料列表）
router.put('/purchaser-assignments/:id', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER, ROLES.PURCHASE_STAFF), async (req, res, next) => {
  try {
    const { materialIds = [], remark, status } = req.body;
    const id = req.params.id;

    const existing = await prisma.purchaserAssignment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: '采购员分配不存在' });

    // 先删除旧的物料关联，再批量创建新的
    await prisma.purchaserMaterialItem.deleteMany({ where: { assignmentId: id } });

    const assignment = await prisma.purchaserAssignment.update({
      where: { id },
      data: {
        remark: remark !== undefined ? remark : existing.remark,
        status: status || existing.status,
        materials: {
          create: materialIds.map((materialId) => ({ materialId })),
        },
      },
      include: {
        user: { select: { id: true, username: true, employee: { select: { name: true } } } },
        materials: { include: { material: { select: { id: true, code: true, name: true } } } },
      },
    });
    res.json({ success: true, data: assignment, message: '采购员分配更新成功' });
  } catch (err) { next(err); }
});

// 删除采购员分配（含引用验证）
router.delete('/purchaser-assignments/:id', authorize(ROLES.SUPER_ADMIN, ROLES.PURCHASE_MANAGER), async (req, res, next) => {
  try {
    const id = req.params.id;
    const existing = await prisma.purchaserAssignment.findUnique({
      where: { id },
      include: { user: { include: { employee: true } } },
    });
    if (!existing) return res.status(404).json({ success: false, message: '采购员分配不存在' });

    const userId = existing.userId;
    const employeeId = existing.user?.employeeId;
    const refs = [];
    const MAX_ITEMS = 5;

    // 1. 采购计划 — PurchasePlan.assigneeId = userId
    const purchasePlans = await prisma.purchasePlan.findMany({
      where: { assigneeId: userId },
      select: { planNo: true, title: true, status: true },
    });
    if (purchasePlans.length > 0) {
      refs.push({
        type: '采购计划',
        count: purchasePlans.length,
        items: purchasePlans.slice(0, MAX_ITEMS).map(p => ({ code: p.planNo, title: p.title, status: p.status })),
        more: purchasePlans.length > MAX_ITEMS ? purchasePlans.length - MAX_ITEMS : 0,
      });
    }

    // 2. 采购订单 — PurchaseOrder.buyerId = employeeId（通过 User → Employee）
    if (employeeId) {
      const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: { buyerId: employeeId },
        select: { orderNo: true, status: true },
      });
      if (purchaseOrders.length > 0) {
        refs.push({
          type: '采购订单',
          count: purchaseOrders.length,
          items: purchaseOrders.slice(0, MAX_ITEMS).map(o => ({ code: o.orderNo, status: o.status })),
          more: purchaseOrders.length > MAX_ITEMS ? purchaseOrders.length - MAX_ITEMS : 0,
        });
      }
    }

    // 有引用 → 拒绝删除
    if (refs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `该采购员已被业务单据引用，无法删除`,
        references: refs,
      });
    }

    // 无引用 → 允许删除
    await prisma.purchaserMaterialItem.deleteMany({ where: { assignmentId: id } });
    await prisma.purchaserAssignment.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// ============================================================
// 打印模板 CRUD
// ============================================================

// 获取打印模板列表（支持按 moduleType 和 status 过滤）
router.get('/print-templates', async (req, res, next) => {
  try {
    const { moduleType, status } = req.query;
    const where = {};
    if (moduleType) where.moduleType = moduleType;
    if (status) where.status = status;
    const list = await prisma.printTemplate.findMany({
      where,
      orderBy: [{ moduleType: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});

// 获取单个打印模板
router.get('/print-templates/:id', async (req, res, next) => {
  try {
    const tpl = await prisma.printTemplate.findUnique({ where: { id: req.params.id } });
    if (!tpl) return res.status(404).json({ success: false, message: '模板不存在' });
    res.json({ success: true, data: tpl });
  } catch (err) { next(err); }
});

// 创建打印模板
router.post('/print-templates', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { name, moduleType, templateContent, paperSize, orientation, margins, headerContent, footerContent } = req.body;
    if (!name || !moduleType) return res.status(400).json({ success: false, message: '模板名称和适用模块必填' });
    const templateNo = await genCode('printTemplate', 'PT', 'templateNo');
    const tpl = await prisma.printTemplate.create({
      data: { templateNo, name, moduleType, templateContent: templateContent || '', paperSize: paperSize || 'A4', orientation: orientation || 'portrait', margins, headerContent, footerContent },
    });
    res.json({ success: true, data: tpl });
  } catch (err) { next(err); }
});

// 更新打印模板
router.put('/print-templates/:id', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { id, createdAt, updatedAt, ...data } = req.body;
    const tpl = await prisma.printTemplate.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: tpl });
  } catch (err) { next(err); }
});

// 删除打印模板
router.delete('/print-templates/:id', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    await prisma.printTemplate.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// 切换模板启用/停用
router.patch('/print-templates/:id/toggle', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const tpl = await prisma.printTemplate.findUnique({ where: { id: req.params.id } });
    if (!tpl) return res.status(404).json({ success: false, message: '模板不存在' });
    const updated = await prisma.printTemplate.update({
      where: { id: req.params.id },
      data: { status: tpl.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// ============================================================
// 车型管理
// ============================================================

router.get('/vehicle-types', async (req, res, next) => {
  try {
    const { keyword, category, status, page = 1, pageSize = 50 } = req.query;
    const where = {};
    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { name: { contains: keyword } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      prisma.vehicleType.findMany({
        where,
        orderBy: [{ category: 'asc' }, { loadWeight: 'asc' }],
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      prisma.vehicleType.count({ where }),
    ]);

    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

router.get('/vehicle-types/:id', async (req, res, next) => {
  try {
    const item = await prisma.vehicleType.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, message: '车型不存在' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.post('/vehicle-types', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { code, name, category, boxLength, boxWidth, boxHeight, loadVolume, loadWeight } = req.body;
    if (!code || !name) return res.status(400).json({ success: false, message: '车型编码和名称必填' });

    const exists = await prisma.vehicleType.findUnique({ where: { code } });
    if (exists) return res.status(400).json({ success: false, message: '车型编码已存在' });

    const data = await prisma.vehicleType.create({
      data: {
        code,
        name,
        category: category || 'NORMAL',
        boxLength: boxLength != null ? Number(boxLength) : null,
        boxWidth: boxWidth != null ? Number(boxWidth) : null,
        boxHeight: boxHeight != null ? Number(boxHeight) : null,
        loadVolume: loadVolume != null ? Number(loadVolume) : null,
        loadWeight: loadWeight != null ? Number(loadWeight) : null,
      },
    });
    res.json({ success: true, data, message: '创建成功' });
  } catch (err) { next(err); }
});

router.put('/vehicle-types/:id', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, boxLength, boxWidth, boxHeight, loadVolume, loadWeight, status } = req.body;

    const item = await prisma.vehicleType.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, message: '车型不存在' });

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (boxLength !== undefined) updateData.boxLength = Number(boxLength);
    if (boxWidth !== undefined) updateData.boxWidth = Number(boxWidth);
    if (boxHeight !== undefined) updateData.boxHeight = Number(boxHeight);
    if (loadVolume !== undefined) updateData.loadVolume = Number(loadVolume);
    if (loadWeight !== undefined) updateData.loadWeight = Number(loadWeight);
    if (status !== undefined) updateData.status = status;

    const data = await prisma.vehicleType.update({ where: { id }, data: updateData });
    res.json({ success: true, data, message: '更新成功' });
  } catch (err) { next(err); }
});

router.delete('/vehicle-types/:id', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.vehicleType.findUnique({ where: { id }, select: { name: true } });
    if (!item) return res.status(404).json({ success: false, message: '车型不存在' });

    const vehicles = await prisma.vehicle.findMany({
      where: { vehicleType: { contains: item.name } },
      select: { plateNo: true, status: true },
      take: 5,
    });
    if (vehicles.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该车型已被车辆档案引用，无法删除',
        references: [{ type: '车辆档案', count: vehicles.length, items: vehicles.map(v => ({ code: v.plateNo, status: v.status })), more: 0 }],
      });
    }

    await prisma.vehicleType.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: '车型不存在' });
    next(err);
  }
});

router.post('/vehicle-types/batch', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: '请提供车型数据数组' });
    }

    const results = { created: 0, skipped: 0 };
    for (const item of items) {
      const exists = await prisma.vehicleType.findUnique({ where: { code: item.code } });
      if (exists) { results.skipped++; continue; }
      await prisma.vehicleType.create({
        data: {
          code: item.code,
          name: item.name,
          category: item.category || 'NORMAL',
          boxLength: item.boxLength != null ? Number(item.boxLength) : null,
          boxWidth: item.boxWidth != null ? Number(item.boxWidth) : null,
          boxHeight: item.boxHeight != null ? Number(item.boxHeight) : null,
          loadVolume: item.loadVolume != null ? Number(item.loadVolume) : null,
          loadWeight: item.loadWeight != null ? Number(item.loadWeight) : null,
        },
      });
      results.created++;
    }
    res.json({ success: true, data: results, message: `导入完成：新建${results.created}条，跳过${results.skipped}条` });
  } catch (err) { next(err); }
});

// ============================================================
// 安全库存管理
// ============================================================

// ---------- 波动系数 ----------
router.get('/season-configs', async (req, res, next) => {
  try {
    const list = await prisma.seasonConfig.findMany({ orderBy: { coefficient: 'asc' } });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});

router.put('/season-configs/:id', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { coefficient, description, isActive } = req.body;
    const data = await prisma.seasonConfig.update({
      where: { id: req.params.id },
      data: { coefficient, description, isActive },
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ---------- 安全库存标准 ----------
router.get('/stock-standards', async (req, res, next) => {
  try {
    const { materialId, warehouseId, status, page = 1, pageSize = 50 } = req.query;
    const where = {};
    if (materialId) where.materialId = materialId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      prisma.stockStandard.findMany({
        where,
        include: {
          material: { select: { id: true, code: true, name: true, shelfLifeDays: true, purchaseLeadTime: true, group: { select: { id: true, name: true, category: true, stockCategory: true } } } },
          warehouse: { select: { id: true, name: true, isRemote: true, transferLeadDays: true } },
          seasonConfig: { select: { id: true, code: true, name: true, coefficient: true } },
        },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: [{ material: { name: 'asc' } }, { warehouse: { name: 'asc' } }],
      }),
      prisma.stockStandard.count({ where }),
    ]);

    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

router.get('/stock-standards/:id', async (req, res, next) => {
  try {
    const item = await prisma.stockStandard.findUnique({
      where: { id: req.params.id },
      include: {
        material: { select: { id: true, code: true, name: true, shelfLifeDays: true, purchaseLeadTime: true } },
        warehouse: { select: { id: true, name: true } },
        seasonConfig: true,
      },
    });
    if (!item) return res.status(404).json({ success: false, message: '记录不存在' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.post('/stock-standards', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { materialId, warehouseId, seasonConfigId, procurementDays, maxStorageDays, remoteAdjust } = req.body;
    if (!materialId || !warehouseId || !seasonConfigId) {
      return res.status(400).json({ success: false, message: '物料、仓库、波动系数为必填' });
    }

    // 检查唯一性
    const exists = await prisma.stockStandard.findUnique({
      where: { materialId_warehouseId: { materialId, warehouseId } },
    });
    if (exists) return res.status(400).json({ success: false, message: '该物料×仓库的安全库存标准已存在' });

    // 继承物料的保质期和采购提前期
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      select: { shelfLifeDays: true, purchaseLeadTime: true },
    });

    const data = await prisma.stockStandard.create({
      data: {
        materialId, warehouseId, seasonConfigId,
        procurementDays: procurementDays ?? material?.purchaseLeadTime ?? 3,
        maxStorageDays: maxStorageDays ?? Math.ceil((material?.shelfLifeDays ?? 7) * 0.6),
        remoteAdjust: remoteAdjust ?? null,
      },
      include: {
        material: { select: { id: true, code: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        seasonConfig: { select: { id: true, name: true, coefficient: true } },
      },
    });
    res.json({ success: true, data, message: '创建成功' });
  } catch (err) { next(err); }
});

router.put('/stock-standards/:id', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { seasonConfigId, procurementDays, maxStorageDays, remoteAdjust, status } = req.body;
    const data = await prisma.stockStandard.update({
      where: { id: req.params.id },
      data: { seasonConfigId, procurementDays, maxStorageDays, remoteAdjust, status },
      include: {
        material: { select: { id: true, code: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        seasonConfig: { select: { id: true, name: true, coefficient: true } },
      },
    });
    res.json({ success: true, data, message: '更新成功' });
  } catch (err) { next(err); }
});

router.delete('/stock-standards/:id', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    await prisma.stockStandard.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: '记录不存在' });
    next(err);
  }
});

// 批量生成/初始化：为所有物料×仓库组合创建安全库存标准（使用默认参数）
router.post('/stock-standards/batch-init', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { seasonConfigId } = req.body;
    if (!seasonConfigId) return res.status(400).json({ success: false, message: '请指定波动系数' });

    const [materials, warehouses] = await Promise.all([
      prisma.material.findMany({ where: { status: 'ACTIVE' }, select: { id: true, shelfLifeDays: true, purchaseLeadTime: true, group: { select: { stockCategory: true } } } }),
      prisma.warehouse.findMany({ where: { status: 'ACTIVE' }, select: { id: true, isRemote: true, transferLeadDays: true } }),
    ]);

    let created = 0, skipped = 0;
    for (const mat of materials) {
      for (const wh of warehouses) {
        const exists = await prisma.stockStandard.findUnique({
          where: { materialId_warehouseId: { materialId: mat.id, warehouseId: wh.id } },
        });
        if (exists) { skipped++; continue; }

        // 外仓系数：可调拨→0.8，远仓→1.3，总部仓→null
        let remoteAdjust = null;
        if (wh.isRemote) {
          remoteAdjust = wh.transferLeadDays && wh.transferLeadDays <= 1 ? 0.8 : 1.3;
        }

        await prisma.stockStandard.create({
          data: {
            materialId: mat.id, warehouseId: wh.id, seasonConfigId,
            procurementDays: mat.purchaseLeadTime,
            maxStorageDays: Math.ceil(mat.shelfLifeDays * 0.6),
            remoteAdjust,
          },
        });
        created++;
      }
    }
    res.json({ success: true, data: { created, skipped }, message: `批量初始化完成：新建${created}条，跳过${skipped}条` });
  } catch (err) { next(err); }
});

// ---------- 仓库更新：外仓标记 ----------
router.patch('/warehouses/:id/remote', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { isRemote, transferLeadDays } = req.body;
    const data = await prisma.warehouse.update({
      where: { id: req.params.id },
      data: { isRemote, transferLeadDays },
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ---------- 手动重算安全库存 ----------
router.post('/stock-standards/recalculate', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { recalculateAll } = await import('../stock-standard.calculator.js');
    const results = await recalculateAll();
    res.json({ success: true, data: results, message: `重算完成：成功${results.success}条，失败${results.fail}条` });
  } catch (err) { next(err); }
});

router.post('/stock-standards/:id/recalculate', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { recalculateOne } = await import('../stock-standard.calculator.js');
    const data = await recalculateOne(req.params.id);
    res.json({ success: true, data, message: '重算完成' });
  } catch (err) {
    if (err.message === '标准不存在') return res.status(404).json({ success: false, message: '标准不存在' });
    next(err);
  }
});

// ---------- 手动触发水位快照 ----------
router.post('/stock-levels/snapshot', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { triggerSnapshot } = await import('../stock-level.scheduler.js');
    await triggerSnapshot();
    res.json({ success: true, message: '水位快照已完成' });
  } catch (err) { next(err); }
});

// ---------- 预警列表 ----------
router.get('/stock-alerts', async (req, res, next) => {
  try {
    const { status, materialId, warehouseId, alertType, alertSubType, level, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (materialId) where.materialId = materialId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (alertType) where.alertType = alertType;
    if (alertSubType) where.alertSubType = alertSubType;
    if (level) where.level = level;

    const [list, total] = await Promise.all([
      prisma.stockAlert.findMany({
        where,
        include: {
          material: { select: { id: true, code: true, name: true, shelfLifeDays: true } },
          warehouse: { select: { id: true, name: true } },
          batch: { select: { id: true, batchNo: true, expiryDate: true, remainingQty: true } },
          steps: { orderBy: { createdAt: 'asc' }, take: 5 },
        },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: [{ level: 'desc' }, { status: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.stockAlert.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

router.patch('/stock-alerts/:id/process', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { status, resolution, step, rootCause, transferOrderId, purchaseOrderId } = req.body;

    // 记录处理步骤
    if (step) {
      await prisma.alertStep.create({
        data: {
          alertId: req.params.id,
          step: step.step || 'DISPOSE',
          action: step.action || '',
          handlerId: step.handlerId,
          handlerRole: step.handlerRole,
          result: step.result,
        },
      });
    }

    const updateData = {
      status: status || 'PROCESSING',
      ...(resolution && { resolution }),
      ...(rootCause && { rootCause }),
      ...(transferOrderId && { transferOrderId }),
      ...(purchaseOrderId && { purchaseOrderId }),
      ...(status === 'RESOLVED' && { processedAt: new Date() }),
    };

    const data = await prisma.stockAlert.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// 获取预警的处置步骤
router.get('/stock-alerts/:id/steps', async (req, res, next) => {
  try {
    const steps = await prisma.alertStep.findMany({
      where: { alertId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: steps });
  } catch (err) { next(err); }
});

// 核销验证
router.patch('/stock-alerts/:id/close-verify', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const data = await prisma.stockAlert.update({
      where: { id: req.params.id },
      data: {
        status: 'RESOLVED',
        closureVerifiedBy: req.user?.id || 'SYSTEM',
        closureVerifiedAt: new Date(),
        processedAt: new Date(),
      },
    });
    // 记录核销步骤
    await prisma.alertStep.create({
      data: {
        alertId: req.params.id,
        step: 'CLOSE',
        action: '核销验证通过',
        handlerId: req.user?.id,
      },
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ---------- 水位快照历史 ----------
router.get('/stock-levels', async (req, res, next) => {
  try {
    const { materialId, warehouseId, page = 1, pageSize = 30 } = req.query;
    const where = {};
    if (materialId) where.materialId = materialId;
    if (warehouseId) where.warehouseId = warehouseId;

    const [list, total] = await Promise.all([
      prisma.stockLevel.findMany({
        where,
        include: {
          material: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
        },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { snapshotDate: 'desc' },
      }),
      prisma.stockLevel.count({ where }),
    ]);
    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) { next(err); }
});

// ---------- 监控仪表盘汇总 ----------
router.get('/stock-monitor/summary', async (req, res, next) => {
  try {
    const [totalStandards, activeStandards, redAlerts, orangeAlerts, yellowAlerts, expiryAlerts, lastSnapshot] = await Promise.all([
      prisma.stockStandard.count(),
      prisma.stockStandard.count({ where: { status: 'ACTIVE' } }),
      prisma.stockAlert.count({ where: { alertType: 'LOW_STOCK', status: { in: ['ACTIVE', 'PROCESSING'] } } }),
      prisma.stockAlert.count({ where: { alertType: 'HIGH_STOCK', status: { in: ['ACTIVE', 'PROCESSING'] } } }),
      prisma.stockAlert.count({ where: { alertType: 'APPROACHING', status: { in: ['ACTIVE'] } } }),
      prisma.stockAlert.count({ where: { alertType: 'EXPIRY', status: { in: ['ACTIVE', 'PROCESSING'] } } }),
      prisma.stockLevel.findFirst({ orderBy: { snapshotDate: 'desc' }, select: { snapshotDate: true } }),
    ]);

    // 按仓库水位统计
    const warehouseStats = await prisma.$queryRaw`
      SELECT w.id, w.name, COUNT(sl.id) as total,
        SUM(CASE WHEN sl.level = 'RED' THEN 1 ELSE 0 END) as red,
        SUM(CASE WHEN sl.level = 'ORANGE' THEN 1 ELSE 0 END) as orange,
        SUM(CASE WHEN sl.level = 'YELLOW' THEN 1 ELSE 0 END) as yellow,
        SUM(CASE WHEN sl.level = 'GREEN' THEN 1 ELSE 0 END) as green
      FROM stock_levels sl
      INNER JOIN warehouses w ON w.id = sl.warehouseId
      WHERE sl.snapshotDate = (SELECT MAX(snapshotDate) FROM stock_levels)
      GROUP BY w.id, w.name
    `;

    res.json({
      success: true,
      data: {
        totalStandards,
        activeStandards,
        redAlerts,
        orangeAlerts,
        yellowAlerts,
        expiryAlerts,
        lastSnapshotDate: lastSnapshot?.snapshotDate || null,
        warehouseStats,
      },
    });
  } catch (err) { next(err); }
});

export default router;
