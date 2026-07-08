import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getDepartmentFilterAsync } from '../middleware/departmentScope.js';
import { syncManagerRole } from '../services/employee.service.js';

const prisma = new PrismaClient();
const router = Router();

// 递归收集部门及其所有子部门 ID
async function collectSubDeptIds(deptId) {
  const ids = [deptId];
  const children = await prisma.department.findMany({
    where: { parentId: deptId },
    select: { id: true },
  });
  for (const child of children) {
    const subIds = await collectSubDeptIds(child.id);
    ids.push(...subIds);
  }
  return ids;
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    }
  },
});

// 获取部门列表（树形结构）— 数据隔离
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { departmentId: deptFilter, isDeptManager } = await getDepartmentFilterAsync(req);

    let departments;
    if (!deptFilter) {
      // 管理员：看全部
      departments = await prisma.department.findMany({
        include: {
          children: {
            include: {
              children: {
                include: {
                  children: true,
                  employees: { select: { id: true, name: true, position: true } },
                  manager: { select: { id: true, name: true } },
                  parent: { select: { id: true, name: true } },
                },
              },
              employees: { select: { id: true, name: true, position: true } },
              manager: { select: { id: true, name: true } },
              parent: { select: { id: true, name: true } },
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          },
          employees: { select: { id: true, name: true, position: true } },
          manager: { select: { id: true, name: true } },
          parent: { select: { id: true, name: true } },
        },
        where: { parentId: null },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    } else {
      // 非管理员：只看本部门及子部门
      const accessibleIds = await collectSubDeptIds(deptFilter);
      // 查询所有可访问的部门（含祖先以保持树结构完整）
      const allAccessible = await prisma.department.findMany({
        where: { id: { in: accessibleIds } },
        select: { id: true, parentId: true },
      });
      // 收集祖先节点 ID（确保树结构完整）
      const ancestorIds = new Set();
      const idToParent = new Map(allAccessible.map((d) => [d.id, d.parentId]));
      for (const d of allAccessible) {
        let pId = d.parentId;
        while (pId) {
          ancestorIds.add(pId);
          pId = idToParent.get(pId);
          // 防止死循环
          if (pId && ancestorIds.has(pId)) break;
        }
      }
      // 合并可访问节点 + 祖先节点
      const allIds = [...new Set([...accessibleIds, ...ancestorIds])];

      departments = await prisma.department.findMany({
        where: { parentId: null, id: { in: allIds } },
        include: {
          children: {
            where: { id: { in: allIds } },
            include: {
              children: {
                where: { id: { in: allIds } },
                include: {
                  children: { where: { id: { in: allIds } } },
                  employees: { select: { id: true, name: true, position: true } },
                  manager: { select: { id: true, name: true } },
                  parent: { select: { id: true, name: true } },
                },
              },
              employees: { select: { id: true, name: true, position: true } },
              manager: { select: { id: true, name: true } },
              parent: { select: { id: true, name: true } },
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          },
          employees: { select: { id: true, name: true, position: true } },
          manager: { select: { id: true, name: true } },
          parent: { select: { id: true, name: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    }

    res.json({ success: true, data: departments });
  } catch (err) {
    next(err);
  }
});

// 获取所有部门（平铺列表，用于下拉选择）— 数据隔离
router.get('/flat', authenticate, async (req, res, next) => {
  try {
    const { departmentId: deptFilter, isDeptManager } = await getDepartmentFilterAsync(req);

    let where = {};
    if (deptFilter) {
      const accessibleIds = await collectSubDeptIds(deptFilter);
      where = { id: { in: accessibleIds } };
    }

    const departments = await prisma.department.findMany({
      select: { id: true, name: true, parentId: true, sortOrder: true },
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: departments });
  } catch (err) {
    next(err);
  }
});

// 导出部门列表（Excel）
router.get(
  '/export',
  authenticate,
  authorize('SUPER_ADMIN', 'HR_ADMIN'),
  async (req, res, next) => {
    try {
      // 递归查询所有部门及其员工数
      const allDepts = await prisma.department.findMany({
        include: {
          parent: { select: { name: true } },
          manager: { select: { name: true, employeeNo: true, position: true } },
          employees: { select: { id: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      const rows = allDepts.map((dept) => ({
        部门名称: dept.name,
        上级部门: dept.parent?.name || '无',
        负责人: dept.manager?.name || '未指定',
        负责人工号: dept.manager?.employeeNo || '',
        负责人岗位: dept.manager?.position || '',
        员工人数: dept.employees.length,
        创建时间: dept.createdAt ? new Date(dept.createdAt).toLocaleDateString('zh-CN') : '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 20 },
        { wch: 18 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 10 },
        { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, '部门列表');

      // 再加一个"部门员工明细"sheet
      const empDepts = await prisma.department.findMany({
        include: {
          parent: { select: { name: true } },
          employees: {
            select: {
              employeeNo: true,
              name: true,
              gender: true,
              phone: true,
              position: true,
              status: true,
              hireDate: true,
            },
            orderBy: { employeeNo: 'asc' },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      const genderMap = { MALE: '男', FEMALE: '女' };
      const statusMap = { ACTIVE: '在职', INACTIVE: '停职', RESIGNED: '离职' };
      const detailRows = [];
      empDepts.forEach((dept) => {
        if (dept.employees.length === 0) {
          detailRows.push({
            部门: dept.name,
            上级部门: dept.parent?.name || '无',
            工号: '',
            姓名: '',
            性别: '',
            手机号: '',
            岗位: '',
            状态: '',
            入职日期: '',
          });
        } else {
          dept.employees.forEach((emp) => {
            detailRows.push({
              部门: dept.name,
              上级部门: dept.parent?.name || '无',
              工号: emp.employeeNo,
              姓名: emp.name,
              性别: genderMap[emp.gender] || emp.gender,
              手机号: emp.phone,
              岗位: emp.position,
              状态: statusMap[emp.status] || emp.status,
              入职日期: emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('zh-CN') : '',
            });
          });
        }
      });

      const ws2 = XLSX.utils.json_to_sheet(detailRows);
      ws2['!cols'] = [
        { wch: 20 },
        { wch: 18 },
        { wch: 10 },
        { wch: 10 },
        { wch: 6 },
        { wch: 14 },
        { wch: 12 },
        { wch: 8 },
        { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, ws2, '部门员工明细');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const date = new Date().toISOString().slice(0, 10);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename=departments_${date}.xlsx`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },
);

// 导入部门（Excel）
router.post(
  '/import',
  authenticate,
  authorize('SUPER_ADMIN', 'HR_ADMIN'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: '请上传Excel文件' });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      if (rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Excel文件中没有数据' });
      }

      // 查找可用列名（兼容中英文）
      const nameKey =
        Object.keys(rows[0]).find(
          (k) => k.includes('部门名称') || k.toLowerCase().includes('name'),
        ) || Object.keys(rows[0])[0];
      const parentKey =
        Object.keys(rows[0]).find(
          (k) => k.includes('上级部门') || k.toLowerCase().includes('parent'),
        ) || null;
      const managerKey =
        Object.keys(rows[0]).find(
          (k) =>
            (k.includes('负责人') && !k.includes('工号') && !k.includes('岗位')) ||
            k.toLowerCase() === 'manager',
        ) || null;

      // 获取所有在职员工（用于按姓名匹配负责人）
      const allEmployees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, employeeNo: true },
      });
      const empByName = new Map(allEmployees.map((e) => [e.name, e]));
      const empByNo = new Map(allEmployees.map((e) => [e.employeeNo, e]));

      const results = { created: 0, skipped: 0, errors: [] };
      const deptNameToId = new Map(); // 缓存：部门名 → id（含已存在的）

      // 加载已有部门
      const existingDepts = await prisma.department.findMany({
        select: { id: true, name: true, parentId: true },
      });
      existingDepts.forEach((d) => deptNameToId.set(d.name.trim(), d.id));

      // 第一轮：先创建没有上级部门的顶级部门，再逐层创建子部门
      // 排序：上级部门为空或"无"的排前面
      const sortedRows = [...rows].sort((a, b) => {
        const aParent = parentKey ? String(a[parentKey] || '').trim() : '';
        const bParent = parentKey ? String(b[parentKey] || '').trim() : '';
        const aIsTop = !aParent || aParent === '无' || aParent === '-' || aParent === '0';
        const bIsTop = !bParent || bParent === '无' || bParent === '-' || bParent === '0';
        if (aIsTop && !bIsTop) return -1;
        if (!aIsTop && bIsTop) return 1;
        return 0;
      });

      for (let i = 0; i < sortedRows.length; i++) {
        const row = sortedRows[i];
        const name = String(row[nameKey] || '').trim();
        if (!name) {
          results.errors.push(`第${i + 2}行：部门名称为空，已跳过`);
          results.skipped++;
          continue;
        }

        // 已存在则跳过
        if (deptNameToId.has(name)) {
          results.skipped++;
          continue;
        }

        // 解析上级部门
        let parentId = null;
        if (parentKey) {
          const parentName = String(row[parentKey] || '').trim();
          if (parentName && parentName !== '无' && parentName !== '-' && parentName !== '0') {
            parentId = deptNameToId.get(parentName) || null;
            if (!parentId) {
              results.errors.push(
                `第${i + 2}行「${name}」：上级部门「${parentName}」不存在，已跳过`,
              );
              results.skipped++;
              continue;
            }
          }
        }

        // 解析负责人
        let managerId = null;
        if (managerKey) {
          const managerName = String(row[managerKey] || '').trim();
          if (managerName && managerName !== '无' && managerName !== '-') {
            const emp = empByName.get(managerName) || empByNo.get(managerName);
            if (emp) {
              managerId = emp.id;
            } else {
              results.errors.push(
                `第${i + 2}行「${name}」：负责人「${managerName}」未找到在职员工匹配，已跳过负责人`,
              );
            }
          }
        }

        try {
          const dept = await prisma.department.create({
            data: { name, parentId, managerId },
          });
          // 新负责人自动升级为经理角色
          if (managerId) {
            const newUser = await prisma.user.findUnique({ where: { employeeId: managerId } });
            if (newUser && newUser.role === 'EMPLOYEE') {
              await prisma.user.update({ where: { id: newUser.id }, data: { role: 'MANAGER' } });
            }
          }
          deptNameToId.set(name, dept.id);
          results.created++;
        } catch (err) {
          results.errors.push(`第${i + 2}行「${name}」：创建失败 - ${err.message}`);
          results.skipped++;
        }
      }

      res.json({
        success: true,
        data: {
          total: rows.length,
          created: results.created,
          skipped: results.skipped,
          errors: results.errors,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// 批量调整部门排序
router.put(
  '/reorder',
  authenticate,
  authorize('SUPER_ADMIN', 'HR_ADMIN'),
  async (req, res, next) => {
    try {
      const { items } = req.body; // [{id, sortOrder}, ...]
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: '请提供排序数据' });
      }

      // 使用事务批量更新
      await prisma.$transaction(
        items.map((item) =>
          prisma.department.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          }),
        ),
      );

      res.json({ success: true, message: '排序已更新' });
    } catch (err) {
      next(err);
    }
  },
);

// 初始化排序值（按 name 排序赋予递增 sortOrder）
router.post(
  '/init-sort',
  authenticate,
  authorize('SUPER_ADMIN', 'HR_ADMIN'),
  async (req, res, next) => {
    try {
      // 获取所有部门按 parentId 分组
      const allDepts = await prisma.department.findMany({
        select: { id: true, parentId: true },
        orderBy: { name: 'asc' },
      });

      // 按 parentId 分组
      const groups = {};
      allDepts.forEach((d) => {
        const key = d.parentId || '__root__';
        if (!groups[key]) groups[key] = [];
        groups[key].push(d);
      });

      // 每组内按当前顺序赋予递增 sortOrder
      const updates = [];
      Object.values(groups).forEach((group) => {
        group.forEach((d, idx) => {
          updates.push(
            prisma.department.update({
              where: { id: d.id },
              data: { sortOrder: idx },
            }),
          );
        });
      });

      await prisma.$transaction(updates);
      res.json({ success: true, message: `已初始化 ${allDepts.length} 个部门的排序` });
    } catch (err) {
      next(err);
    }
  },
);

// 获取导入模板
router.get(
  '/import-template',
  authenticate,
  authorize('SUPER_ADMIN', 'HR_ADMIN'),
  async (req, res, next) => {
    try {
      const templateData = [
        { 部门名称: '技术部', 上级部门: '无', 负责人姓名: '张三' },
        { 部门名称: '前端组', 上级部门: '技术部', 负责人姓名: '李四' },
        { 部门名称: '后端组', 上级部门: '技术部', 负责人姓名: '王五' },
        { 部门名称: '产品部', 上级部门: '无', 负责人姓名: '赵六' },
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(templateData);
      ws['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 16 }];

      // 添加说明行（批注）
      ws['!ref'] = 'A1:C5';

      XLSX.utils.book_append_sheet(wb, ws, '部门导入模板');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename=department_import_template.xlsx');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },
);

// 获取单个部门详情
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const dept = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: {
        children: {
          include: {
            employees: { select: { id: true, name: true, position: true } },
            manager: { select: { id: true, name: true } },
          },
        },
        employees: { select: { id: true, name: true, position: true } },
        manager: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
      },
    });
    if (!dept) {
      return res.status(404).json({ success: false, message: '部门不存在' });
    }
    res.json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
});

// 创建部门
router.post('/', authenticate, authorize('SUPER_ADMIN', 'HR_ADMIN'), async (req, res, next) => {
  try {
    const { name, parentId, managerId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '部门名称不能为空' });
    }
    if (!managerId) {
      return res.status(400).json({ success: false, message: '请选择部门负责人' });
    }
    // 检查同名部门
    const existing = await prisma.department.findFirst({ where: { name: name.trim() } });
    if (existing) {
      return res.status(400).json({ success: false, message: '该部门名称已存在' });
    }
    const dept = await prisma.department.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
        managerId: managerId || null,
        sortOrder:
          req.body.sortOrder !== undefined
            ? req.body.sortOrder
            : await prisma.department.count({ where: { parentId: parentId || null } }),
      },
      include: {
        children: true,
        employees: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
      },
    });

    // 新负责人自动升级为经理角色
    await syncManagerRole(managerId, null);

    res.status(201).json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
});

// 更新部门
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'HR_ADMIN'), async (req, res, next) => {
  try {
    const { name, parentId, managerId } = req.body;
    const deptId = req.params.id;

    // 检查部门是否存在
    const existing = await prisma.department.findUnique({ where: { id: deptId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '部门不存在' });
    }

    // 检查不能把自己设为上级部门
    if (parentId === deptId) {
      return res.status(400).json({ success: false, message: '不能将部门自身设为上级部门' });
    }

    // 必填字段校验（上级部门允许为空，即顶层部门）
    if (managerId !== undefined && !managerId) {
      return res.status(400).json({ success: false, message: '请选择部门负责人' });
    }

    // 检查同名部门（排除自身）
    if (name && name.trim() !== existing.name) {
      const dup = await prisma.department.findFirst({
        where: { name: name.trim(), id: { not: deptId } },
      });
      if (dup) {
        return res.status(400).json({ success: false, message: '该部门名称已存在' });
      }
    }

    // 记录旧负责人（用于角色同步）
    const oldManagerId = existing.managerId;

    const dept = await prisma.department.update({
      where: { id: deptId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(managerId !== undefined && { managerId: managerId || null }),
        ...(req.body.sortOrder !== undefined && { sortOrder: req.body.sortOrder }),
      },
      include: {
        children: true,
        employees: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
      },
    });

    // 负责人变更时自动调整角色
    if (managerId !== undefined && managerId !== oldManagerId) {
      await syncManagerRole(managerId || null, oldManagerId);
    }

    res.json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
});

// 删除部门
router.delete(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'HR_ADMIN'),
  async (req, res, next) => {
    try {
      const deptId = req.params.id;

      // 检查部门是否存在
      const dept = await prisma.department.findUnique({
        where: { id: deptId },
        include: {
          children: true,
          employees: true,
        },
      });
      if (!dept) {
        return res.status(404).json({ success: false, message: '部门不存在' });
      }

      // 检查是否有子部门
      if (dept.children.length > 0) {
        return res
          .status(400)
          .json({ success: false, message: '该部门下有子部门，请先删除或迁移子部门' });
      }

      // 检查是否有员工
      if (dept.employees.length > 0) {
        return res
          .status(400)
          .json({ success: false, message: '该部门下有员工，请先迁移员工到其他部门' });
      }

      // 记录旧负责人（用于角色同步）
      const oldManagerId = dept.managerId;

      await prisma.department.delete({ where: { id: deptId } });

      // 旧负责人如果不再管理任何部门，降级角色
      if (oldManagerId) {
        await syncManagerRole(null, oldManagerId);
      }

      res.json({ success: true, message: '部门已删除' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
