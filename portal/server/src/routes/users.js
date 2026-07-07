import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();
const HRMS_API_URL = process.env.HRMS_API_URL || 'http://localhost:4002';

/**
 * 用户管理路由 — 优先从 portal_user 缓存读取，不足时从 HRMS API 代理
 * Portal 作为统一管理入口
 */

// 获取 HRMS 管理员 token（用 admin@hrms.com 登录）
async function getHrmsAdminToken() {
  const resp = await fetch(`${HRMS_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@hrms.com', password: process.env.HRMS_ADMIN_PASSWORD || 'admin123' }),
  });
  const data = await resp.json();
  if (!data.success) throw new Error('获取 HRMS 管理员 token 失败');
  return data.data.token;
}

/**
 * GET /api/users
 * 始终从 HRMS 获取完整的在职员工列表，再与 portal_user 缓存合并角色权限信息，
 * 并自动将新员工补写到 portal_user（后续登录可直接命中缓存）。
 */
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // 1. 从 HRMS API 获取完整在职员工列表
    const hrmsToken = await getHrmsAdminToken();
    const hrmsResp = await fetch(`${HRMS_API_URL}/api/auth/users`, {
      headers: { Authorization: `Bearer ${hrmsToken}` },
    });
    const hrmsData = await hrmsResp.json();

    if (!hrmsData.success) {
      return res.status(500).json({ success: false, message: '获取 HRMS 用户列表失败' });
    }

    // HRMS 返回的用户列表（含 employee 信息）
    const hrmsUsers = hrmsData.data || [];

    // 2. 读取 portal_user 缓存（用于角色/权限/lastLogin 信息）
    const portalUsers = await prisma.portalUser.findMany();
    const portalMap = new Map(portalUsers.map((pu) => [pu.email.toLowerCase(), pu]));

    // 3. 批量读取所有用户的角色权限（避免逐条查询）
    const allUserRoles = await prisma.userRole.findMany({
      include: { role: { include: { permissions: true } } },
    });
    const rolesMap = new Map();
    for (const ur of allUserRoles) {
      const emailKey = ur.userEmail.toLowerCase();
      if (!rolesMap.has(emailKey)) rolesMap.set(emailKey, []);
      rolesMap.get(emailKey).push(ur);
    }

    // 4. 合并：HRMS 数据为主，portal_user 补充角色权限
    const enrichedUsers = hrmsUsers.map((hu) => {
      const emailKey = (hu.email || '').toLowerCase();
      const portalUser = portalMap.get(emailKey);
      const userRoles = rolesMap.get(emailKey) || [];

      const roleNames = userRoles.map((ur) => ur.role.name);
      const permissions = {};
      for (const ur of userRoles) {
        for (const perm of ur.role.permissions) {
          if (!permissions[perm.systemCode]) permissions[perm.systemCode] = [];
          if (!permissions[perm.systemCode].includes(perm.moduleCode)) {
            permissions[perm.systemCode].push(perm.moduleCode);
          }
        }
      }

      // 统一数据结构：兼容前端 AccessManage.jsx 的字段格式
      const employee = hu.employee || {};
      return {
        id: hu.id,
        email: hu.email,
        name: employee.name || hu.name || hu.email,
        employeeNo: employee.employeeNo || hu.employeeNo || '',
        globalId: employee.globalId || hu.globalId || null,
        departmentName: employee.department?.name || employee.departmentName || portalUser?.departmentName || '',
        position: employee.positionTitle || employee.position || portalUser?.position || '',
        phone: employee.phone || hu.phone || portalUser?.phone || '',
        hrmsRole: hu.role || portalUser?.hrmsRole || '',
        isActive: hu.status === 'ACTIVE' || employee.status === 'ACTIVE' || portalUser?.isActive || false,
        roleNames,
        permissions,
        lastLoginAt: portalUser?.lastLoginAt || null,
        // 前端 AccessManage 用 employee 对象渲染
        employee: {
          name: employee.name || hu.name || hu.email,
          employeeNo: employee.employeeNo || hu.employeeNo || '',
          department: employee.department || (portalUser ? { name: portalUser.departmentName } : null),
          email: hu.email,
        },
      };
    });

    // 5. 自动同步：将 HRMS 中还没在 portal_user 里的员工补写入缓存
    const newEmployees = hrmsUsers.filter((hu) => !portalMap.has((hu.email || '').toLowerCase()));
    if (newEmployees.length > 0) {
      await prisma.portalUser.createMany({
        data: newEmployees.map((hu) => {
          const emp = hu.employee || {};
          return {
            email: hu.email,
            globalId: emp.globalId || hu.globalId || null,
            name: emp.name || hu.name || hu.email,
            employeeNo: emp.employeeNo || hu.employeeNo || '',
            departmentId: emp.departmentId || hu.departmentId || null,
            departmentName: emp.department?.name || emp.departmentName || '',
            position: emp.positionTitle || emp.position || '',
            phone: emp.phone || hu.phone || '',
            hrmsRole: hu.role || '',
            isActive: hu.status === 'ACTIVE' || emp.status === 'ACTIVE',
          };
        }),
        skipDuplicates: true,
      });
    }

    res.json({ success: true, data: enrichedUsers });
  } catch (err) {
    // HRMS API 不可用时，回退到仅从 portal_user 缓存读取
    try {
      const portalUsers = await prisma.portalUser.findMany({ orderBy: { employeeNo: 'asc' } });
      const allUserRoles = await prisma.userRole.findMany({
        include: { role: { include: { permissions: true } } },
      });
      const rolesMap = new Map();
      for (const ur of allUserRoles) {
        const emailKey = ur.userEmail.toLowerCase();
        if (!rolesMap.has(emailKey)) rolesMap.set(emailKey, []);
        rolesMap.get(emailKey).push(ur);
      }

      const enrichedUsers = portalUsers.map((pu) => {
        const userRoles = rolesMap.get(pu.email.toLowerCase()) || [];
        const roleNames = userRoles.map((ur) => ur.role.name);
        const permissions = {};
        for (const ur of userRoles) {
          for (const perm of ur.role.permissions) {
            if (!permissions[perm.systemCode]) permissions[perm.systemCode] = [];
            if (!permissions[perm.systemCode].includes(perm.moduleCode)) {
              permissions[perm.systemCode].push(perm.moduleCode);
            }
          }
        }
        return {
          id: pu.id,
          email: pu.email,
          name: pu.name,
          employeeNo: pu.employeeNo,
          globalId: pu.globalId,
          departmentName: pu.departmentName,
          position: pu.position,
          phone: pu.phone,
          hrmsRole: pu.hrmsRole,
          isActive: pu.isActive,
          roleNames,
          permissions,
          lastLoginAt: pu.lastLoginAt,
          employee: {
            name: pu.name,
            employeeNo: pu.employeeNo,
            department: { name: pu.departmentName },
            email: pu.email,
          },
        };
      });
      res.json({ success: true, data: enrichedUsers });
    } catch (fallbackErr) {
      next(fallbackErr);
    }
  }
});

/**
 * POST /api/users
 * 创建用户（代理 HRMS）
 * body: { email, password, name, employeeNo, departmentId, position, role }
 */
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const token = await getHrmsAdminToken();
    const resp = await fetch(`${HRMS_API_URL}/api/auth/create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(req.body),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json(data);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/:id/role
 * 修改用户角色（代理 HRMS — HRMS 内部角色）
 */
router.put('/:id/role', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const token = await getHrmsAdminToken();
    const resp = await fetch(`${HRMS_API_URL}/api/auth/users/${req.params.id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(req.body),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json(data);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/:id/reset-password
 * 重置密码（代理 HRMS）
 */
router.put('/:id/reset-password', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const token = await getHrmsAdminToken();
    const resp = await fetch(`${HRMS_API_URL}/api/auth/users/${req.params.id}/reset-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(req.body),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json(data);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
