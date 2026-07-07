import { Router } from 'express';
import * as authService from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const router = Router();

// SSO 单点登录 — 验证 Portal 令牌，自动创建/更新 HRMS 用户，签发 HRMS 本地令牌
router.post('/sso-login', async (req, res, next) => {
  try {
    const { ssoToken } = req.body;
    if (!ssoToken) {
      return res.status(400).json({ success: false, message: '缺少 SSO 令牌' });
    }

    // 验证 SSO 令牌
    const ssoSecret = process.env.SSO_JWT_SECRET || 'xdj-portal-sso-secret-2026';
    let decoded;
    try {
      decoded = jwt.verify(ssoToken, ssoSecret);
    } catch {
      return res.status(401).json({ success: false, message: 'SSO 令牌无效或已过期' });
    }

    if (decoded.source !== 'sso') {
      return res.status(401).json({ success: false, message: '非 SSO 令牌' });
    }

    // 从 SSO 令牌获取 HRMS 角色和模块权限
    const hrmsRole = decoded.systemRoles?.hrms || 'EMPLOYEE';
    const hrmsPermissions = decoded.permissions?.hrms || [];

    // 多策略匹配查找 HRMS 用户（优先 globalId 精确匹配）
    let user = null;

    // 1. 通过 globalId 精确匹配（跨系统统一标识，最可靠）
    if (decoded.globalId) {
      const empByGlobalId = await prisma.employee.findFirst({
        where: { globalId: decoded.globalId },
        include: { user: true },
      });
      if (empByGlobalId?.user) {
        user = await prisma.user.findUnique({
          where: { id: empByGlobalId.user.id },
          include: { employee: { include: { department: { select: { id: true, name: true } } } } },
        });
      }
    }

    // 2. 通过 email 精确匹配
    if (!user && decoded.email) {
      user = await prisma.user.findUnique({
        where: { email: decoded.email },
        include: { employee: { include: { department: { select: { id: true, name: true } } } } },
      });
    }

    // 3. 尝试通过工号匹配
    if (!user && decoded.employeeNo) {
      const empByNo = await prisma.employee.findFirst({
        where: { employeeNo: decoded.employeeNo },
        include: { user: true },
      });
      if (empByNo?.user) {
        user = await prisma.user.findUnique({
          where: { id: empByNo.user.id },
          include: { employee: { include: { department: { select: { id: true, name: true } } } } },
        });
      }
    }

    // 4. 未找到用户 — 不再自动创建，返回 403 错误
    if (!user) {
      return res.status(403).json({
        success: false,
        message: '您的账号在 HRMS 系统中尚未配置，请联系管理员添加您的信息',
      });
    }

    // 用户已存在，更新角色为 Portal 配置的角色
    if (user.role !== hrmsRole) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: hrmsRole },
      });
      user.role = hrmsRole;
    }

    // 签发 HRMS 本地 JWT
    const token = jwt.sign(
      { userId: user.id, employeeId: user.employee?.id || null, role: hrmsRole, email: user.email, departmentId: user.employee?.departmentId || null },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: hrmsRole,
          permissions: hrmsPermissions,
          employee: user.employee
            ? {
                id: user.employee.id,
                name: user.employee.name,
                employeeNo: user.employee.employeeNo,
                positionTitle: user.employee.positionTitle,
                positionId: user.employee.positionId,
                departmentId: user.employee.departmentId,
                departmentName: user.employee.department?.name || '',
              }
            : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// 登录 — 仅供 Portal 统一认证中心服务端调用（HRMS 前端已跳转 Portal 登录）
router.post('/login', async (req, res, next) => {
  try {
    const { email, identifier, password } = req.body;
    const loginId = identifier || email;
    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: '请提供账号和密码' });
    }
    const result = await authService.login(loginId, password);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 注册接口 - 仅用于系统首次初始化（创建首位管理员）
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, employeeNo, departmentName, position } = req.body;
    if (!email || !password || !name || !employeeNo) {
      return res.status(400).json({ success: false, message: '请提供邮箱、密码、姓名和工号' });
    }

    // 仅当数据库无用户时允许注册（首次初始化）
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return res.status(403).json({ success: false, message: '系统已初始化，请通过统一平台 Portal 登录' });
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: '该邮箱已注册' });
    }

    // 检查工号是否已存在
    const existingEmp = await prisma.employee.findUnique({ where: { employeeNo } });
    if (existingEmp) {
      return res.status(400).json({ success: false, message: '该工号已存在' });
    }

    // 创建或查找部门
    let department;
    if (departmentName) {
      department = await prisma.department.findFirst({ where: { name: departmentName } });
      if (!department) {
        department = await prisma.department.create({ data: { name: departmentName } });
      }
    } else {
      department = await prisma.department.findFirst();
      if (!department) {
        department = await prisma.department.create({ data: { name: '默认部门' } });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = await prisma.employee.create({
      data: {
        employeeNo,
        name,
        email,
        position: position || '',
        status: 'ACTIVE',
        hireDate: new Date(),
        departmentId: department.id,
        baseSalary: 0,
        user: {
          create: {
            email,
            password: hashedPassword,
            role: 'SUPER_ADMIN',
          },
        },
      },
      include: { department: true, user: true },
    });

    res.json({
      success: true,
      data: {
        id: employee.user.id,
        email: employee.user.email,
        role: employee.user.role,
        employee: {
          id: employee.id,
          name: employee.name,
          employeeNo: employee.employeeNo,
          position: employee.position,
          departmentId: employee.departmentId,
        },
        isFirstAdmin: true,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// 用户管理 — 已迁移到统一平台 Portal 的权限管理页面
// 以下接口保留只读（列表）用于兼容，创建/修改/重置密码请到 Portal 操作
router.get('/users', authenticate, authorize('HR_ADMIN'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        employee: {
          select: { id: true, name: true, employeeNo: true, positionTitle: true, positionId: true, status: true, department: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

router.post('/create-user', authenticate, async (req, res) => {
  res.json({ success: false, message: '用户管理已迁移到统一平台，请在 Portal 的「用户管理」页面操作' });
});

router.post('/batch-create-accounts', authenticate, async (req, res) => {
  res.json({ success: false, message: '用户管理已迁移到统一平台，请在 Portal 的「用户管理」页面操作' });
});

router.put('/users/:id/role', authenticate, async (req, res) => {
  res.json({ success: false, message: '角色管理已迁移到统一平台，请在 Portal 的「权限管理 → 角色管理」页面配置' });
});

router.put('/users/:id/reset-password', authenticate, async (req, res) => {
  res.json({ success: false, message: '密码管理已迁移到统一平台，请在 Portal 的「用户管理」页面重置密码' });
});

router.post('/logout', authenticate, (req, res) => {
  res.json({ success: true, message: '已退出登录' });
});

// 检查系统是否已初始化
router.get('/setup-status', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({
      success: true,
      data: {
        initialized: userCount > 0,
        userCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
