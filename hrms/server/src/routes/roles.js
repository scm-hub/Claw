import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const prisma = new PrismaClient();
const router = Router();

// 系统预置权限定义
const PERMISSION_DEFINITIONS = [
  { code: 'dashboard', name: '仪表盘', group: '首页' },
  { code: 'departments', name: '部门管理', group: '组织' },
  { code: 'positions', name: '岗位管理', group: '组织' },
  { code: 'employees', name: '员工管理', group: '组织' },
  { code: 'attendance', name: '考勤管理', group: '人事' },
  { code: 'leaves', name: '请假管理', group: '人事' },
  { code: 'salary', name: '薪资管理', group: '人事' },
  { code: 'contracts', name: '合同管理', group: '人事' },
  { code: 'performance', name: '绩效管理', group: '人事' },
  { code: 'training', name: '培训管理', group: '人事' },
  { code: 'recruitment', name: '招聘管理', group: '人事' },
  { code: 'reports', name: '报表中心', group: '分析' },
  { code: 'settings_users', name: '用户管理', group: '系统' },
  { code: 'settings_roles', name: '角色管理', group: '系统' },
];

// 系统预置角色
const SYSTEM_ROLES = [
  {
    name: '超级管理员', code: 'SUPER_ADMIN', description: '系统最高权限，可管理所有功能',
    level: 4, isSystem: true,
    permissions: JSON.stringify(PERMISSION_DEFINITIONS.map((p) => p.code)),
  },
  {
    name: 'HR管理员', code: 'HR_ADMIN', description: '人力资源管理员，可管理人事相关功能',
    level: 3, isSystem: true,
    permissions: JSON.stringify(PERMISSION_DEFINITIONS.map((p) => p.code)),
  },
  {
    name: '经理', code: 'MANAGER', description: '部门经理，可查看和管理本部门数据',
    level: 2, isSystem: true,
    permissions: JSON.stringify(['dashboard', 'departments', 'positions', 'employees', 'attendance', 'leaves', 'salary', 'performance', 'training', 'reports']),
  },
  {
    name: '普通员工', code: 'EMPLOYEE', description: '普通员工，仅可查看个人信息和考勤',
    level: 1, isSystem: true,
    permissions: JSON.stringify(['dashboard', 'attendance', 'leaves', 'training']),
  },
];

// 初始化系统角色（如果不存在）
router.post('/init', authenticate, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const created = [];
    for (const role of SYSTEM_ROLES) {
      const existing = await prisma.role.findUnique({ where: { code: role.code } });
      if (!existing) {
        const r = await prisma.role.create({ data: role });
        created.push(r);
      } else {
        // 更新系统角色的权限（保持同步）
        await prisma.role.update({
          where: { code: role.code },
          data: { permissions: role.permissions, level: role.level, description: role.description },
        });
      }
    }
    res.json({ success: true, data: { created: created.length, message: `已初始化 ${created.length} 个系统角色` } });
  } catch (err) {
    next(err);
  }
});

// 获取权限定义列表（注意：必须在 /:id 之前）
router.get('/meta/permissions', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    res.json({ success: true, data: PERMISSION_DEFINITIONS });
  } catch (err) {
    next(err);
  }
});

// 获取角色列表
router.get('/', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: [{ level: 'desc' }, { name: 'asc' }],
    });

    // 统计每个角色的用户数
    const userCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });
    const countMap = {};
    userCounts.forEach((item) => { countMap[item.role] = item._count.role; });

    const data = roles.map((role) => ({
      ...role,
      permissions: JSON.parse(role.permissions || '[]'),
      userCount: countMap[role.code] || 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// 获取单个角色详情
router.get('/:id', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!role) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    const userCount = await prisma.user.count({ where: { role: role.code } });
    res.json({
      success: true,
      data: { ...role, permissions: JSON.parse(role.permissions || '[]'), userCount },
    });
  } catch (err) {
    next(err);
  }
});

// 获取角色下的用户列表
router.get('/:id/users', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!role) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    const users = await prisma.user.findMany({
      where: { role: role.code },
      select: {
        id: true, email: true, role: true, createdAt: true,
        employee: {
          select: { id: true, name: true, employeeNo: true, status: true,
            department: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

// 复制角色
router.post('/:id/duplicate', authenticate, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const source = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!source) {
      return res.status(404).json({ success: false, message: '源角色不存在' });
    }

    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: '请提供新角色的名称和编码' });
    }

    // 检查唯一性
    const codeExists = await prisma.role.findUnique({ where: { code: code.trim() } });
    if (codeExists) {
      return res.status(400).json({ success: false, message: '角色编码已存在' });
    }
    const nameExists = await prisma.role.findFirst({ where: { name: name.trim() } });
    if (nameExists) {
      return res.status(400).json({ success: false, message: '角色名称已存在' });
    }

    const newRole = await prisma.role.create({
      data: {
        name: name.trim(),
        code: code.trim(),
        description: req.body.description || source.description,
        level: req.body.level ? parseInt(req.body.level) : source.level,
        permissions: source.permissions,
        isSystem: false,
        isActive: true,
      },
    });

    res.json({ success: true, data: { ...newRole, permissions: JSON.parse(newRole.permissions) } });
  } catch (err) {
    next(err);
  }
});

// 快速切换角色状态
router.put('/:id/toggle-active', authenticate, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!role) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    if (role.isSystem) {
      return res.status(400).json({ success: false, message: '系统内置角色不可停用' });
    }
    const updated = await prisma.role.update({
      where: { id: req.params.id },
      data: { isActive: !role.isActive },
    });
    res.json({ success: true, data: { ...updated, permissions: JSON.parse(updated.permissions) } });
  } catch (err) {
    next(err);
  }
});

// 新建角色（SUPER_ADMIN 专属）
router.post('/', authenticate, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { name, code, description, level, permissions, isActive } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: '角色名称和编码为必填项' });
    }

    const existingCode = await prisma.role.findUnique({ where: { code } });
    if (existingCode) {
      return res.status(400).json({ success: false, message: '角色编码已存在' });
    }

    const existingName = await prisma.role.findFirst({ where: { name } });
    if (existingName) {
      return res.status(400).json({ success: false, message: '角色名称已存在' });
    }

    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        code: code.trim(),
        description: description || '',
        level: level ? parseInt(level) : 1,
        permissions: JSON.stringify(permissions || []),
        isSystem: false,
        isActive: isActive !== false,
      },
    });

    res.json({ success: true, data: { ...role, permissions: JSON.parse(role.permissions) } });
  } catch (err) {
    next(err);
  }
});

// 更新角色（SUPER_ADMIN 专属，系统角色仅允许修改权限和描述）
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { name, description, level, permissions, isActive } = req.body;

    const existing = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }

    if (existing.isSystem) {
      await prisma.role.update({
        where: { id: req.params.id },
        data: {
          ...(description !== undefined && { description }),
          ...(permissions !== undefined && { permissions: JSON.stringify(permissions) }),
        },
      });
    } else {
      if (name) {
        const nameExists = await prisma.role.findFirst({
          where: { name: name.trim(), id: { not: req.params.id } },
        });
        if (nameExists) {
          return res.status(400).json({ success: false, message: '角色名称已存在' });
        }
      }
      await prisma.role.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description }),
          ...(level !== undefined && { level: parseInt(level) || 1 }),
          ...(permissions !== undefined && { permissions: JSON.stringify(permissions) }),
          ...(isActive !== undefined && { isActive }),
        },
      });
    }

    const updated = await prisma.role.findUnique({ where: { id: req.params.id } });
    res.json({ success: true, data: { ...updated, permissions: JSON.parse(updated.permissions) } });
  } catch (err) {
    next(err);
  }
});

// 删除角色（仅可删除自定义角色且无用户关联）
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!role) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    if (role.isSystem) {
      return res.status(400).json({ success: false, message: '系统内置角色不可删除' });
    }
    const userCount = await prisma.user.count({ where: { role: role.code } });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: `该角色下有 ${userCount} 名用户，请先更改用户角色后再删除`,
      });
    }
    await prisma.role.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '角色已删除' });
  } catch (err) {
    next(err);
  }
});

export default router;
