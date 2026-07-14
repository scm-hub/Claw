import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import * as authService from './auth.service.js';
import jwt from 'jsonwebtoken';
import prisma from '../../shared/prisma.js';
import { getUserScmPermissions } from '../../shared/portalDb.js';

/**
 * 判断用户拥有的权限中是否包含指定模块（支持父模块匹配子功能点）
 */
function hasModuleInPerms(perms, moduleCode) {
  if (perms.includes('*')) return true;
  if (perms.includes(moduleCode)) return true;
  return perms.some((p) => p.startsWith(moduleCode + '-'));
}

/**
 * 根据用户拥有的 SCM 模块权限，自动推导 SCM 内部角色
 * 与 Portal auth.service.js 中的 deriveScmRole 保持逻辑一致
 */
function deriveScmRole(scmModules) {
  if (!scmModules || scmModules.length === 0) return 'WAREHOUSE_STAFF';

  const allScmModules = [
    'master', 'purchase', 'sales', 'warehouse', 'traceability',
    'finance', 'cost', 'logistics', 'other', 'settings',
  ];
  if (scmModules.includes('*') || allScmModules.every((m) => hasModuleInPerms(scmModules, m))) {
    return 'SUPER_ADMIN';
  }

  const roleMap = [
    { modules: ['finance', 'cost'], role: 'FINANCE_MANAGER' },
    { modules: ['purchase'], role: 'PURCHASE_MANAGER' },
    { modules: ['sales'], role: 'SALES_MANAGER' },
    { modules: ['warehouse', 'traceability'], role: 'WAREHOUSE_MANAGER' },
    { modules: ['contract'], role: 'CONTRACT_MANAGER' },
    { modules: ['logistics'], role: 'LOGISTICS_STAFF' },
  ];

  for (const entry of roleMap) {
    if (entry.modules.some((m) => hasModuleInPerms(scmModules, m))) {
      return entry.role;
    }
  }

  return 'WAREHOUSE_STAFF';
}

const router = Router();

// SSO 单点登录 — 验证 Portal 令牌，自动创建/更新 SCM 用户，签发 SCM 本地令牌
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

    // 从 SSO 令牌获取 SCM 角色和模块权限
    // SSO 模式下角色必须来自 Portal 的 systemRoles.scm（根据 SCM 模块权限推导）
    // 不再使用 HRMS 角色回退映射（会导致 HR_ADMIN 获得 SCM SUPER_ADMIN 等过度授权）
    const scmRole = decoded.systemRoles?.scm || 'WAREHOUSE_STAFF';
    const scmPermissions = decoded.permissions?.scm || [];

    // 多策略匹配查找 SCM 用户（优先 globalId 精确匹配）
    let user = null;
    let matchedEmployee = null; // 找到的员工（用于自动创建用户）

    // 1. 通过 globalId 精确匹配（跨系统统一标识，最可靠）
    if (decoded.globalId) {
      const employee = await prisma.employee.findFirst({
        where: { globalId: decoded.globalId },
        include: { user: true },
      });
      if (employee?.user) {
        user = await prisma.user.findUnique({
          where: { id: employee.user.id },
          include: { employee: { include: { department: true } } },
        });
      } else if (employee) {
        matchedEmployee = employee;
      }
    }

    // 2. 通过 Employee.email 精确匹配
    if (!user && !matchedEmployee && decoded.email) {
      const employee = await prisma.employee.findFirst({
        where: { email: decoded.email },
        include: { user: true },
      });
      if (employee?.user) {
        user = await prisma.user.findUnique({
          where: { id: employee.user.id },
          include: { employee: { include: { department: true } } },
        });
      } else if (employee) {
        matchedEmployee = employee;
      }
    }

    // 3. 尝试 username = email 前缀（如 admin@hrms.com → admin）
    if (!user && !matchedEmployee) {
      const emailPrefix = decoded.email.split('@')[0];
      user = await prisma.user.findUnique({
        where: { username: emailPrefix },
        include: { employee: { include: { department: true } } },
      });
      if (user?.employee) {
        matchedEmployee = user.employee;
      }
    }

    // 4. 尝试通过工号匹配
    if (!user && !matchedEmployee && decoded.employeeNo) {
      const empByNo = await prisma.employee.findFirst({
        where: { empNo: decoded.employeeNo },
        include: { user: true },
      });
      if (empByNo?.user) {
        user = await prisma.user.findUnique({
          where: { id: empByNo.user.id },
          include: { employee: { include: { department: true } } },
        });
      } else if (empByNo) {
        matchedEmployee = empByNo;
      }
    }

    // 5. 找到员工但无用户 → 自动创建用户（SSO 首次登录）
    if (!user && matchedEmployee) {
      const username = decoded.email.split('@')[0] || matchedEmployee.empNo;
      user = await prisma.user.create({
        data: {
          username,
          passwordHash: await bcrypt.hash(username + '-sso-' + Date.now(), 10), // SSO 用户无需密码，登录完全由 Portal 控制
          role: scmRole,
          status: 'ACTIVE',
          employeeId: matchedEmployee.id,
        },
        include: { employee: { include: { department: true } } },
      });
    }

    // 6. 既未找到用户也未找到员工 → 返回 403
    if (!user) {
      return res.status(403).json({
        success: false,
        message: '您的账号在 SCM 系统中尚未配置，请联系管理员在员工管理中添加您的信息',
      });
    }

    // 用户已存在，更新角色为 Portal 配置的角色
    if (user.role !== scmRole) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: scmRole, status: 'ACTIVE' },
      });
      user.role = scmRole;
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: '账号已被禁用，请联系管理员' });
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // 签发 SCM 本地 JWT（含 permissions，供 authorize 中间件双重判断）
    // 包含 globalId，用于 workflow-engine 审批流的 submitterId 匹配
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        username: user.username,
        permissions: scmPermissions,
        globalId: decoded.globalId || user.employee?.globalId || null,
        employeeName: user.employee?.name || decoded.name || '',
        email: user.employee?.email || decoded.email || '',
      },
      process.env.JWT_SECRET || 'xdj-scm-jwt-secret-2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          permissions: scmPermissions,
          employee: user.employee
            ? {
                id: user.employee.id,
                empNo: user.employee.empNo,
                name: user.employee.name,
                phone: user.employee.phone,
                email: user.employee.email,
                departmentId: user.employee.departmentId,
                department: user.employee.department
                  ? { id: user.employee.department.id, name: user.employee.department.name }
                  : null,
                position: user.employee.position,
              }
            : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// 登录 — 已关闭独立登录，请通过统一平台 Portal 登录
router.post('/login', async (req, res) => {
  res.status(403).json({
    success: false,
    message: '请通过统一平台登录（Portal 登录后点击 SCM 系统进入）',
    redirect: '/',
  });
});

// 移动端专用登录 — 统一使用 HRMS 身份源验证，与电脑端 Portal SSO 共用同一套账号密码
router.post('/mobile-login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const identifier = username; // 兼容旧参数名，也可直接传 identifier
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: '请输入账号和密码' });
    }

    // ====== 步骤1：调用 HRMS 统一认证验证密码 ======
    const hrmsUrl = process.env.HRMS_API_URL || 'http://localhost:4002';
    let hrmsResult;
    try {
      const hrmsResp = await fetch(`${hrmsUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      hrmsResult = await hrmsResp.json();
    } catch (fetchErr) {
      return res.status(503).json({
        success: false,
        message: '认证服务暂不可用，请稍后重试',
      });
    }

    if (!hrmsResult.success) {
      return res.status(401).json({
        success: false,
        message: hrmsResult.message || '账号或密码错误',
      });
    }

    const hrmsUser = hrmsResult.data.user;
    const userEmail = hrmsUser.email;
    const employeeInfo = hrmsResult.data.user.employee;

    // ====== 步骤2：从 Portal DB 获取 SCM 角色权限 ======
    const { modules: scmModules } = await getUserScmPermissions(userEmail);
    const scmRole = deriveScmRole(scmModules);

    // ====== 步骤3：在 SCM 本地查找/创建用户（复用 SSO 的多策略匹配逻辑） ======
    let user = null;
    let matchedEmployee = null;

    // 3.1 通过 globalId 精确匹配
    if (employeeInfo?.globalId) {
      const employee = await prisma.employee.findFirst({
        where: { globalId: employeeInfo.globalId },
        include: { user: true },
      });
      if (employee?.user) {
        user = await prisma.user.findUnique({
          where: { id: employee.user.id },
          include: { employee: { include: { department: true } } },
        });
      } else if (employee) {
        matchedEmployee = employee;
      }
    }

    // 3.2 通过 Employee.email 精确匹配
    if (!user && !matchedEmployee && userEmail) {
      const employee = await prisma.employee.findFirst({
        where: { email: userEmail },
        include: { user: true },
      });
      if (employee?.user) {
        user = await prisma.user.findUnique({
          where: { id: employee.user.id },
          include: { employee: { include: { department: true } } },
        });
      } else if (employee) {
        matchedEmployee = employee;
      }
    }

    // 3.3 尝试 username = email 前缀
    if (!user && !matchedEmployee) {
      const emailPrefix = userEmail.split('@')[0];
      user = await prisma.user.findUnique({
        where: { username: emailPrefix },
        include: { employee: { include: { department: true } } },
      });
      if (user?.employee) {
        matchedEmployee = user.employee;
      }
    }

    // 3.4 尝试通过工号匹配
    if (!user && !matchedEmployee && employeeInfo?.employeeNo) {
      const empByNo = await prisma.employee.findFirst({
        where: { empNo: employeeInfo.employeeNo },
        include: { user: true },
      });
      if (empByNo?.user) {
        user = await prisma.user.findUnique({
          where: { id: empByNo.user.id },
          include: { employee: { include: { department: true } } },
        });
      } else if (empByNo) {
        matchedEmployee = empByNo;
      }
    }

    // 3.5 找到员工但无用户 → 自动创建
    if (!user && matchedEmployee) {
      const uname = userEmail.split('@')[0] || matchedEmployee.empNo;
      user = await prisma.user.create({
        data: {
          username: uname,
          passwordHash: await bcrypt.hash(uname + '-sso-' + Date.now(), 10),
          role: scmRole,
          status: 'ACTIVE',
          employeeId: matchedEmployee.id,
        },
        include: { employee: { include: { department: true } } },
      });
    }

    // 3.6 未找到员工 → 尝试仅通过 SCM username 查找（兜底：可能用户存在于 SCM 但 employee 表未同步）
    if (!user && !matchedEmployee) {
      const emailPrefix = userEmail.split('@')[0];
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: emailPrefix },
            { username: identifier },
          ],
        },
        include: { employee: { include: { department: true } } },
      });
    }

    // 3.7 完全找不到
    if (!user) {
      return res.status(403).json({
        success: false,
        message: '您的账号在 SCM 系统中尚未配置，请联系管理员在员工管理中添加您的信息',
      });
    }

    // ====== 步骤4：同步角色权限（以 Portal 为准） ======
    if (user.role !== scmRole) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: scmRole, status: 'ACTIVE' },
      });
      user.role = scmRole;
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: '账号已被禁用，请联系管理员' });
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // ====== 步骤5：签发 SCM 本地 JWT ======
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        username: user.username,
        permissions: scmModules,
        globalId: user.employee?.globalId || employeeInfo?.globalId || null,
        employeeName: user.employee?.name || employeeInfo?.name || '',
        email: user.employee?.email || userEmail || '',
      },
      process.env.JWT_SECRET || 'xdj-scm-jwt-secret-2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          permissions: scmModules,
          employee: user.employee
            ? {
                id: user.employee.id,
                empNo: user.employee.empNo,
                name: user.employee.name,
                phone: user.employee.phone,
                email: user.employee.email,
                departmentId: user.employee.departmentId,
                department: user.employee.department
                  ? { id: user.employee.department.id, name: user.employee.department.name }
                  : null,
                position: user.employee.position,
              }
            : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// 获取当前用户
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// 修改密码
router.put('/change-password', authenticate, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '请输入原密码和新密码' });
    }
    await authService.changePassword(req.user.id, oldPassword, newPassword);
    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    next(err);
  }
});

// 用户管理 — 已迁移到统一平台 Portal 的权限管理页面
// 以下接口保留只读（列表）用于兼容，创建/修改/重置密码请到 Portal 操作
router.get('/users', authenticate, authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const result = await authService.getUserList(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/users', authenticate, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  res.json({ success: false, message: '用户管理已迁移到统一平台，请在 Portal 的「用户管理」页面操作' });
});

router.put('/users/:id', authenticate, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  res.json({ success: false, message: '角色管理已迁移到统一平台，请在 Portal 的「权限管理」页面配置 SCM 角色' });
});

router.put('/users/:id/reset-password', authenticate, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  res.json({ success: false, message: '密码管理已迁移到统一平台，请在 Portal 的「用户管理」页面重置密码' });
});

export default router;
