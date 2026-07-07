import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getDepartmentFilter } from '../middleware/departmentScope.js';

const prisma = new PrismaClient();
const router = Router();

// 获取职位列表
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { departmentId, isActive } = req.query;
    const departmentFilter = getDepartmentFilter(req);
    const where = {};
    if (departmentId) where.departmentId = departmentId;
    else if (departmentFilter) where.departmentId = departmentFilter;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const positions = await prisma.position.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        employees: { select: { id: true } },
      },
      orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
    });

    const data = positions.map((pos) => ({
      ...pos,
      employeeCount: pos.employees.length,
      employees: undefined,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// 获取单个职位详情
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const position = await prisma.position.findUnique({
      where: { id: req.params.id },
      include: {
        department: { select: { id: true, name: true } },
        employees: {
          select: { id: true, name: true, employeeNo: true, status: true },
        },
      },
    });

    if (!position) {
      return res.status(404).json({ success: false, message: '岗位不存在' });
    }

    res.json({ success: true, data: position });
  } catch (err) {
    next(err);
  }
});

// 新建职位（HR_ADMIN 及以上，编码自动生成）
router.post('/', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const {
      name, code, departmentId, level,
      minSalary, maxSalary, description, isActive,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '岗位名称为必填项' });
    }

    // 自动生成编码：POS-001、POS-002 ...（如果前端没传或传空）
    let finalCode = code && code.trim();
    if (!finalCode) {
      // 查找所有 POS-NNN 格式的编码，取最大编号
      const allPositions = await prisma.position.findMany({
        where: { code: { startsWith: 'POS-' } },
        select: { code: true },
      });
      let maxNum = 0;
      for (const pos of allPositions) {
        const match = pos.code.match(/^POS-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      finalCode = `POS-${String(maxNum + 1).padStart(3, '0')}`;
    }

    // 检查编码是否重复
    const existing = await prisma.position.findUnique({ where: { code: finalCode } });
    if (existing) {
      return res.status(400).json({ success: false, message: '岗位编码已存在' });
    }

    const position = await prisma.position.create({
      data: {
        name,
        code: finalCode,
        departmentId: departmentId || null,
        level: level || '',
        minSalary: minSalary ? parseFloat(minSalary) : 0,
        maxSalary: maxSalary ? parseFloat(maxSalary) : 0,
        description: description || '',
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: position });
  } catch (err) {
    next(err);
  }
});

// 更新职位（HR_ADMIN 及以上）
router.put('/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const {
      name, code, departmentId, level,
      minSalary, maxSalary, description, isActive,
    } = req.body;

    const existing = await prisma.position.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '岗位不存在' });
    }

    // 检查编码是否与其他职位重复
    if (code && code !== existing.code) {
      const codeExists = await prisma.position.findUnique({ where: { code } });
      if (codeExists) {
        return res.status(400).json({ success: false, message: '岗位编码已存在' });
      }
    }

    const position = await prisma.position.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(level !== undefined && { level }),
        ...(minSalary !== undefined && { minSalary: parseFloat(minSalary) || 0 }),
        ...(maxSalary !== undefined && { maxSalary: parseFloat(maxSalary) || 0 }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: position });
  } catch (err) {
    next(err);
  }
});

// 从员工职位信息同步到职位管理（HR_ADMIN 及以上）
router.post('/sync-from-employees', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    // 获取所有有 positionTitle 的员工
    const employees = await prisma.employee.findMany({
      where: {
        positionTitle: { not: '' },
      },
      select: {
        id: true,
        positionTitle: true,
        departmentId: true,
      },
    });

    if (employees.length === 0) {
      return res.json({
        success: true,
        data: { created: 0, linked: 0, skipped: 0, total: 0, details: [] },
      });
    }

    // 获取已有职位
    const existingPositions = await prisma.position.findMany();
    const positionNameMap = {};
    existingPositions.forEach((p) => {
      positionNameMap[p.name] = p;
    });

    // 按 positionTitle + departmentId 分组
    const positionGroups = {};
    employees.forEach((emp) => {
      const key = `${emp.positionTitle}__${emp.departmentId || 'none'}`;
      if (!positionGroups[key]) {
        positionGroups[key] = {
          name: emp.positionTitle,
          departmentId: emp.departmentId,
          employeeIds: [],
        };
      }
      positionGroups[key].employeeIds.push(emp.id);
    });

    const details = [];
    let created = 0;
    let linked = 0;
    let skipped = 0;

    for (const [, group] of Object.entries(positionGroups)) {
      // 检查是否已有同名职位（全局匹配或同部门匹配）
      let position = positionNameMap[group.name];

      // 优先匹配同部门的职位
      const deptMatch = existingPositions.find(
        (p) => p.name === group.name && p.departmentId === group.departmentId
      );
      if (deptMatch) {
        position = deptMatch;
      }

      if (!position) {
        // 创建新职位
        const code = `POS-${group.name.replace(/\s+/g, '-').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        position = await prisma.position.create({
          data: {
            name: group.name,
            code,
            departmentId: group.departmentId || null,
            isActive: true,
          },
        });
        existingPositions.push(position);
        positionNameMap[position.name] = position;
        created++;
        details.push({ action: 'created', positionName: group.name, departmentId: group.departmentId, employeeCount: group.employeeIds.length });
      }

      // 将员工关联到此职位
      for (const empId of group.employeeIds) {
        const emp = await prisma.employee.findUnique({
          where: { id: empId },
          select: { positionId: true },
        });
        if (!emp.positionId) {
          await prisma.employee.update({
            where: { id: empId },
            data: { positionId: position.id },
          });
          linked++;
        } else if (emp.positionId === position.id) {
          skipped++;
        } else {
          // 已关联其他职位，也更新
          await prisma.employee.update({
            where: { id: empId },
            data: { positionId: position.id },
          });
          linked++;
        }
      }
    }

    res.json({
      success: true,
      data: { created, linked, skipped, total: employees.length, details },
    });
  } catch (err) {
    next(err);
  }
});

// 统一职位编码（HR_ADMIN 及以上，一次性迁移）
router.post('/normalize-codes', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const positions = await prisma.position.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, code: true, name: true },
    });

    const updates = [];
    let seq = 1;
    for (const pos of positions) {
      const newCode = `POS-${String(seq).padStart(3, '0')}`;
      if (pos.code !== newCode) {
        updates.push({ id: pos.id, oldCode: pos.code, newCode, name: pos.name });
      }
      seq++;
    }

    // 先把所有待更新的编码改为临时编码，避免唯一约束冲突
    for (const u of updates) {
      await prisma.position.update({
        where: { id: u.id },
        data: { code: `TMP-${u.id}` },
      });
    }
    // 再改为最终编码
    for (const u of updates) {
      await prisma.position.update({
        where: { id: u.id },
        data: { code: u.newCode },
      });
    }

    res.json({
      success: true,
      data: {
        total: positions.length,
        updated: updates.length,
        details: updates.map((u) => `${u.name}: ${u.oldCode} → ${u.newCode}`),
      },
    });
  } catch (err) {
    next(err);
  }
});

// 停用/启用职位（HR_ADMIN 及以上）
router.patch('/:id/toggle-status', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const position = await prisma.position.findUnique({
      where: { id: req.params.id },
      include: { employees: { select: { id: true, status: true } } },
    });

    if (!position) {
      return res.status(404).json({ success: false, message: '岗位不存在' });
    }

    // 如果要停用，检查是否有在职员工
    if (position.isActive) {
      const activeEmployees = position.employees.filter((e) => e.status === 'ACTIVE');
      if (activeEmployees.length > 0) {
        return res.status(400).json({
          success: false,
          message: `该岗位下有 ${activeEmployees.length} 名在职员工，请先调整员工岗位后再停用`,
        });
      }
    }

    const updated = await prisma.position.update({
      where: { id: req.params.id },
      data: { isActive: !position.isActive },
      include: {
        department: { select: { id: true, name: true } },
        employees: { select: { id: true } },
      },
    });

    res.json({
      success: true,
      data: {
        ...updated,
        employeeCount: updated.employees.length,
        employees: undefined,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 删除职位（HR_ADMIN 及以上，有员工的职位不能删除）
router.delete('/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const position = await prisma.position.findUnique({
      where: { id: req.params.id },
      include: { employees: { select: { id: true } } },
    });

    if (!position) {
      return res.status(404).json({ success: false, message: '岗位不存在' });
    }

    if (position.employees.length > 0) {
      return res.status(400).json({
        success: false,
        message: `该岗位下有 ${position.employees.length} 名员工，无法删除`,
      });
    }

    await prisma.position.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: '岗位已删除' });
  } catch (err) {
    next(err);
  }
});

export default router;
