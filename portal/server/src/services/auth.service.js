import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { hrmsLogin } from './hrms-client.js';

const SSO_JWT_SECRET = process.env.SSO_JWT_SECRET || 'xdj-portal-sso-secret-2026';
const SSO_JWT_EXPIRES_IN = process.env.SSO_JWT_EXPIRES_IN || '7d';

const HRMS_ROLE_PRIORITY = {
  SUPER_ADMIN: 4,
  HR_ADMIN: 3,
  MANAGER: 2,
  EMPLOYEE: 1,
};

const SCM_ROLE_PRIORITY = {
  SUPER_ADMIN: 10,
  FINANCE_MANAGER: 9,
  SALES_MANAGER: 8,
  PURCHASE_MANAGER: 7,
  WAREHOUSE_MANAGER: 6,
  QUALITY_STAFF: 5,
  LOGISTICS_STAFF: 4,
  CONTRACT_MANAGER: 3,
  HR: 2,
  WAREHOUSE_STAFF: 1,
};

/**
 * 从多个角色映射中选出优先级最高的角色
 * @param {string[]} roles - 角色编码列表
 * @param {object} priorityMap - 优先级映射表
 * @returns {string|null} 最高优先级角色，无有效角色时返回 null
 */
function pickHighestRole(roles, priorityMap) {
  let best = null;
  let bestScore = 0;
  for (const role of roles) {
    if (!role) continue;
    const score = priorityMap[role] || 0;
    if (score > bestScore) {
      bestScore = score;
      best = role;
    }
  }
  return best;
}

function signToken(payload) {
  return jwt.sign(payload, SSO_JWT_SECRET, { expiresIn: SSO_JWT_EXPIRES_IN });
}

/**
 * 检查用户权限列表中是否包含某个模块（支持子功能点匹配）
 * 例如：检查 'purchase' 时，'purchase-plans'、'purchase-orders' 也算匹配
 */
function hasModuleInPerms(perms, moduleCode) {
  return perms.some((p) => p === moduleCode || p.startsWith(moduleCode + '-'));
}

/**
 * 根据用户拥有的 SCM 模块权限，自动推导 SCM 内部角色
 * 权限可能是父级模块名（如 'purchase'）或子功能点（如 'purchase-plans'），都算拥有该模块
 */
function deriveScmRole(scmModules) {
  if (!scmModules || scmModules.length === 0) return 'WAREHOUSE_STAFF';

  // 拥有全部 SCM 模块 → 超级管理员
  const allScmModules = [
    'master',
    'purchase',
    'sales',
    'warehouse',
    'traceability',
    'finance',
    'cost',
    'logistics',
    'other',
    'settings',
  ];
  if (allScmModules.every((m) => hasModuleInPerms(scmModules, m))) {
    return 'SUPER_ADMIN';
  }

  // 按优先级推导：第一个匹配的模块决定角色
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

  // 只有 master/dashboard 等基础权限，没有具体业务模块
  return 'WAREHOUSE_STAFF';
}

/**
 * 根据用户拥有的 HRMS 模块权限，自动推导 HRMS 内部角色
 */
function deriveHrmsRole(hrmsModules) {
  if (!hrmsModules || hrmsModules.length === 0) return 'EMPLOYEE';

  // 拥有全部 HRMS 模块 → 超级管理员
  const allHrmsModules = [
    'dashboard',
    'departments',
    'positions',
    'employees',
    'onboarding',
    'attendance',
    'leave',
    'payroll',
    'contracts',
    'performance',
    'training',
    'recruitment',
    'reports',
    'settings',
  ];
  if (allHrmsModules.every((m) => hasModuleInPerms(hrmsModules, m))) {
    return 'SUPER_ADMIN';
  }

  // 拥有 settings 或 payroll 等高级管理模块 → HR 管理员
  if (
    [
      'settings',
      'payroll',
      'employees',
      'departments',
      'attendance',
      'leave',
      'recruitment',
      'training',
      'performance',
      'contracts',
      'positions',
      'onboarding',
      'reports',
    ].some((m) => hasModuleInPerms(hrmsModules, m))
  ) {
    return 'HR_ADMIN';
  }

  return 'EMPLOYEE';
}

/**
 * 根据用户拥有的 MDM 模块权限，自动推导 MDM 内部角色
 * MDM 模块较简单：只有 master-data 及其子功能点
 */
function deriveMdmRole(mdmModules) {
  if (!mdmModules || mdmModules.length === 0) return null; // 无 MDM 权限 → 不允许访问
  // 有任何 MDM 模块权限 → MDM 管理员
  return 'MDM_ADMIN';
}

/**
 * 获取用户的角色权限聚合
 * 从 UserRole → Role → RolePermission 读取，聚合为 permissions 和 systemRoles
 * systemRoles 不再手动配置，而是根据模块权限自动推导
 */
async function getUserPermissions(userEmail) {
  const userRoles = await prisma.userRole.findMany({
    where: { userEmail },
    include: {
      role: {
        include: { permissions: true },
      },
    },
  });

  if (userRoles.length === 0) {
    return { permissions: {}, systemRoles: {} };
  }

  // 聚合所有角色的模块权限，同时收集各子系统显式角色映射
  const permMap = {}; // { scm: Set(master, purchase), hrms: Set(employees) }
  const explicitRoles = { scm: new Set(), hrms: new Set(), mdm: new Set() };

  for (const ur of userRoles) {
    const role = ur.role;
    if (role.scmRole) explicitRoles.scm.add(role.scmRole);
    if (role.hrmsRole) explicitRoles.hrms.add(role.hrmsRole);
    if (role.mdmRole) explicitRoles.mdm.add(role.mdmRole);
    for (const perm of role.permissions) {
      if (!permMap[perm.systemCode]) permMap[perm.systemCode] = new Set();
      permMap[perm.systemCode].add(perm.moduleCode);
    }
  }

  // Set → Array
  const permissions = {};
  for (const [sys, mods] of Object.entries(permMap)) {
    permissions[sys] = Array.from(mods);
  }

  // 优先使用 Portal 角色上的显式子系统角色映射；没有显式映射时再按模块权限推导
  const systemRoles = {};
  systemRoles.scm =
    pickHighestRole(Array.from(explicitRoles.scm), SCM_ROLE_PRIORITY) ||
    deriveScmRole(permissions.scm || []);
  systemRoles.hrms =
    pickHighestRole(Array.from(explicitRoles.hrms), HRMS_ROLE_PRIORITY) ||
    deriveHrmsRole(permissions.hrms || []);
  systemRoles.mdm =
    explicitRoles.mdm.size > 0
      ? Array.from(explicitRoles.mdm)[0]
      : deriveMdmRole(permissions.mdm || []);

  return { permissions, systemRoles };
}

/**
 * SSO 登录
 */
export async function login(email, password, clientInfo = {}) {
  const hrmsResult = await hrmsLogin(email, password);
  const user = hrmsResult.user;
  const userEmail = user.email;

  // 获取所有活跃系统
  const allSystems = await prisma.systemRegistry.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  // 查询用户的系统访问权限（系统级开关）
  const accessRecords = await prisma.userSystemAccess.findMany({
    where: { userEmail },
  });
  const accessMap = new Map(accessRecords.map((r) => [r.systemCode, r.canAccess]));

  // 获取用户的角色权限
  const { permissions, systemRoles } = await getUserPermissions(userEmail);

  // 确定可访问的系统列表
  let accessibleSystems = [];
  let needCreateAccess = false;

  if (accessRecords.length === 0) {
    accessibleSystems = allSystems.map((s) => ({
      code: s.code,
      name: s.name,
      url: s.url,
      icon: s.icon,
      color: s.color,
    }));
    needCreateAccess = true;
  } else {
    accessibleSystems = allSystems
      .filter((s) => {
        const record = accessMap.get(s.code);
        return record ? record : true;
      })
      .map((s) => ({
        code: s.code,
        name: s.name,
        url: s.url,
        icon: s.icon,
        color: s.color,
      }));
  }

  // 首次登录自动创建访问权限记录
  if (needCreateAccess) {
    await prisma.userSystemAccess.createMany({
      data: allSystems.map((s) => ({ userEmail, systemCode: s.code, canAccess: true })),
      skipDuplicates: true,
    });
  }

  // 构建令牌载荷 — 包含 globalId 用于子系统 SSO 精确匹配
  const tokenPayload = {
    userId: user.id,
    email: userEmail,
    name: user.employee?.name || userEmail,
    role: user.role,
    globalId: user.employee?.globalId || null,
    employeeId: user.employee?.id || null,
    employeeNo: user.employee?.employeeNo || null,
    departmentId: user.employee?.departmentId || null,
    departmentName: user.employee?.departmentName || '',
    systems: accessibleSystems.map((s) => s.code),
    permissions,
    systemRoles,
    source: 'sso',
  };

  const token = signToken(tokenPayload);

  // SSO 登录成功后，同步用户信息到 portal_user 缓存表
  await prisma.portalUser.upsert({
    where: { email: userEmail },
    update: {
      globalId: user.employee?.globalId || null,
      name: user.employee?.name || userEmail,
      employeeNo: user.employee?.employeeNo || null,
      departmentId: user.employee?.departmentId || null,
      departmentName: user.employee?.departmentName || '',
      position: user.employee?.positionTitle || '',
      phone: user.employee?.phone || '',
      hrmsRole: user.role,
      isActive: user.employee?.status === 'ACTIVE',
      lastLoginAt: new Date(),
    },
    create: {
      email: userEmail,
      globalId: user.employee?.globalId || null,
      name: user.employee?.name || userEmail,
      employeeNo: user.employee?.employeeNo || null,
      departmentId: user.employee?.departmentId || null,
      departmentName: user.employee?.departmentName || '',
      position: user.employee?.positionTitle || '',
      phone: user.employee?.phone || '',
      hrmsRole: user.role,
      isActive: user.employee?.status === 'ACTIVE',
      lastLoginAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userEmail,
      action: 'LOGIN',
      detail: `登录统一平台，可访问 ${accessibleSystems.length} 个系统`,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    },
  });

  return {
    token,
    user: {
      id: user.id,
      email: userEmail,
      name: user.employee?.name || userEmail,
      role: user.role,
      employee: user.employee,
    },
    systems: accessibleSystems,
    permissions,
    systemRoles,
  };
}

/**
 * 验证 SSO 令牌
 */
export async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, SSO_JWT_SECRET);

    const allSystems = await prisma.systemRegistry.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const accessRecords = await prisma.userSystemAccess.findMany({
      where: { userEmail: decoded.email },
    });
    const accessMap = new Map(accessRecords.map((r) => [r.systemCode, r.canAccess]));

    const accessibleSystems = allSystems
      .filter((s) => {
        const record = accessMap.get(s.code);
        return record ? record : true;
      })
      .map((s) => ({
        code: s.code,
        name: s.name,
        url: s.url,
        icon: s.icon,
        color: s.color,
      }));

    // 重新获取最新权限
    const { permissions, systemRoles } = await getUserPermissions(decoded.email);

    // 安全网：保留原始 HRMS SUPER_ADMIN 角色，防止刷新令牌时降级
    if (decoded.role === 'SUPER_ADMIN') {
      systemRoles.hrms = 'SUPER_ADMIN';
    }

    return {
      ...decoded,
      systems: accessibleSystems.map((s) => s.code),
      permissions,
      systemRoles,
      accessibleSystems,
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw { status: 401, message: '令牌已过期，请重新登录' };
    }
    throw { status: 401, message: '令牌无效' };
  }
}

/**
 * 刷新令牌
 */
export async function refreshToken(oldToken) {
  const decoded = jwt.verify(oldToken, SSO_JWT_SECRET, { ignoreExpiration: true });
  const userInfo = await verifyToken(oldToken).catch(() => null);
  if (!userInfo) throw { status: 401, message: '令牌无效' };

  const newPayload = {
    userId: decoded.userId,
    email: decoded.email,
    name: decoded.name,
    role: decoded.role,
    globalId: decoded.globalId,
    employeeId: decoded.employeeId,
    employeeNo: decoded.employeeNo,
    departmentId: decoded.departmentId,
    departmentName: decoded.departmentName,
    systems: userInfo.systems,
    permissions: userInfo.permissions,
    systemRoles: userInfo.systemRoles,
    source: 'sso',
  };

  return signToken(newPayload);
}

/**
 * 记录用户访问系统的审计日志
 */
export async function logSystemAccess(userEmail, systemCode, clientInfo = {}) {
  await prisma.auditLog.create({
    data: {
      userEmail,
      action: 'ACCESS_SYSTEM',
      systemCode,
      detail: `访问系统: ${systemCode}`,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    },
  });
}
