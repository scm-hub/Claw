/**
 * 部门数据范围过滤工具
 *
 * 规则：
 *  - SUPER_ADMIN / HR_ADMIN → 不过滤，可看全部数据
 *  - 部门负责人（Department.managerId === user.employeeId）→ 看本部门及子部门
 *  - 普通 EMPLOYEE/MANAGER → 只看自己所在部门（不含子部门）
 *  - 未登录或无部门信息 → 不过滤（交给业务层判断）
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 部门负责人缓存（5分钟）
let _deptManagerCache = null;
let _deptManagerCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function isDepartmentManager(employeeId) {
  const now = Date.now();
  if (_deptManagerCache && now - _deptManagerCacheTime < CACHE_TTL) {
    return _deptManagerCache.has(employeeId);
  }
  const departments = await prisma.department.findMany({
    where: { managerId: { not: null } },
    select: { managerId: true },
  });
  _deptManagerCache = new Set(departments.map((d) => d.managerId));
  _deptManagerCacheTime = now;
  return _deptManagerCache.has(employeeId);
}

/**
 * 从请求中获取部门过滤条件（同步版，向后兼容）
 * @param {object} req - Express request（需经过 authenticate 中间件）
 * @returns {string|null} departmentId 或 null（null 表示不过滤）
 */
export const getDepartmentFilter = (req) => {
  if (!req.user) return null;
  const { role, departmentId } = req.user;
  // 管理员角色看全部
  if (role === 'SUPER_ADMIN' || role === 'HR_ADMIN') return null;
  // 其他角色只看本部门
  return departmentId || null;
};

/**
 * 异步版本：同时判断是否部门负责人
 * @param {object} req - Express request
 * @returns {object} { departmentId: string|null, isDeptManager: boolean }
 */
export const getDepartmentFilterAsync = async (req) => {
  if (!req.user) return { departmentId: null, isDeptManager: false };
  const { role, departmentId, employeeId } = req.user;
  if (role === 'SUPER_ADMIN' || role === 'HR_ADMIN') {
    return { departmentId: null, isDeptManager: false };
  }
  const isDeptMgr = employeeId ? await isDepartmentManager(employeeId) : false;
  return { departmentId: departmentId || null, isDeptManager: isDeptMgr };
};
