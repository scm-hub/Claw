import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = Router();
const HRMS_API_URL = process.env.HRMS_API_URL || 'http://localhost:14002';

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

    // 5. 清理 stale 记录：删除 portal_user 中不在 HRMS 用户列表里的记录（保留 admin）
    const hrmsEmails = hrmsUsers.map((hu) => (hu.email || '').toLowerCase());
    const stalePortal = portalUsers.filter(
      (pu) => pu.email !== 'admin@hrms.com' && !hrmsEmails.includes((pu.email || '').toLowerCase())
    );
    if (stalePortal.length > 0) {
      const staleEmails = stalePortal.map((p) => p.email);
      await prisma.userRole.deleteMany({ where: { userEmail: { in: staleEmails } } });
      await prisma.portalUser.deleteMany({ where: { email: { in: staleEmails } } });
      for (const pu of stalePortal) portalMap.delete((pu.email || '').toLowerCase());
    }

    // 5a. 系统超级管理员（admin@hrms.com）始终显示在首位，不受 HRMS 数据源限制
    // 如果 admin 已从 HRMS 同步回来，先移除再添加，避免重复
    const adminPortal = portalMap.get('admin@hrms.com');
    if (adminPortal) {
      const adminIdx = enrichedUsers.findIndex((u) => u.email === 'admin@hrms.com');
      if (adminIdx >= 0) enrichedUsers.splice(adminIdx, 1);
      const adminUserRoles = rolesMap.get('admin@hrms.com') || [];
      enrichedUsers.unshift({
        id: adminPortal.id,
        email: 'admin@hrms.com',
        name: adminPortal.name || 'admin@hrms.com',
        employeeNo: adminPortal.employeeNo || '',
        globalId: adminPortal.globalId || null,
        departmentName: adminPortal.departmentName || '',
        position: adminPortal.position || '',
        phone: adminPortal.phone || '',
        hrmsRole: adminPortal.hrmsRole || 'SUPER_ADMIN',
        isActive: true,
        roleNames: adminUserRoles.map((ur) => ur.role.name),
        permissions: (() => {
          const perms = {};
          for (const ur of adminUserRoles) {
            for (const perm of ur.role.permissions) {
              if (!perms[perm.systemCode]) perms[perm.systemCode] = [];
              if (!perms[perm.systemCode].includes(perm.moduleCode)) {
                perms[perm.systemCode].push(perm.moduleCode);
              }
            }
          }
          return perms;
        })(),
        lastLoginAt: adminPortal.lastLoginAt || null,
        employee: {
          name: adminPortal.name || 'admin@hrms.com',
          employeeNo: adminPortal.employeeNo || '',
          department: { name: adminPortal.departmentName || '' },
          email: 'admin@hrms.com',
        },
      });
    }

    // 6. 自动同步：将 HRMS 中还没在 portal_user 里的员工补写入缓存
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

    // 5a. 自动同步已有用户：将 portal_user 中与 HRMS 不一致的字段（工号/姓名/部门/岗位/状态）更新为 HRMS 数据
    for (const hu of hrmsUsers) {
      const emailKey = (hu.email || '').toLowerCase();
      const cached = portalMap.get(emailKey);
      if (!cached) continue;
      const emp = hu.employee || {};
      const hrmEmployeeNo = emp.employeeNo || hu.employeeNo || '';
      const hrmName = emp.name || hu.name || hu.email;
      const hrmDeptName = emp.department?.name || emp.departmentName || '';
      const hrmPosition = emp.positionTitle || emp.position || '';
      const hrmActive = !!(hu.status === 'ACTIVE' || emp.status === 'ACTIVE');
      if (
        cached.employeeNo !== hrmEmployeeNo ||
        cached.name !== hrmName ||
        cached.departmentName !== hrmDeptName ||
        cached.position !== hrmPosition ||
        cached.isActive !== hrmActive
      ) {
        await prisma.portalUser.update({
          where: { id: cached.id },
          data: {
            employeeNo: hrmEmployeeNo,
            name: hrmName,
            departmentName: hrmDeptName,
            position: hrmPosition,
            isActive: hrmActive,
          },
        });
      }
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
