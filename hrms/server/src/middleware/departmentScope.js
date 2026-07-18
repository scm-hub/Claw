/**
 * 部门数据范围过滤工具
 *
 * 规则：
 *  - SUPER_ADMIN → 不过滤，可看全部数据
 *  - 其他所有角色（含 HR_ADMIN）→ 看本部门 + 所有子部门
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
  // 仅超级管理员看全部
  if (role === 'SUPER_ADMIN') return null;
  // 其他角色返回本部门 ID（调用方应配合 getDeptIdList 获取含子部门的完整列表）
  return departmentId || null;
};

/**
 * 递归获取某部门及其所有子部门的 ID 列表
 * @param {string} deptId 根部门ID
 * @returns {Promise<string[]>} 包含根部门及所有下级子部门的 ID 数组
 */
async function getDeptIdList(deptId) {
  const result = [deptId];
  const children = await prisma.department.findMany({
    where: { parentId: deptId },
    select: { id: true },
  });
  for (const child of children) {
    const grandChildren = await getDeptIdList(child.id);
    result.push(...grandChildren);
  }
  return result;
}

// 部门子级缓存（5分钟）
let _deptIdListCache = new Map();
let _deptIdListCacheTime = 0;

export async function getDepartmentIdsWithChildren(req) {
  if (!req.user) return null;
  const { role, departmentId } = req.user;
  if (role === 'SUPER_ADMIN') return null;
  if (!departmentId) return null;
  // 查缓存
  const now = Date.now();
  if (now - _deptIdListCacheTime > CACHE_TTL) {
    _deptIdListCache = new Map();
    _deptIdListCacheTime = now;
  }
  if (!_deptIdListCache.has(departmentId)) {
    _deptIdListCache.set(departmentId, await getDeptIdList(departmentId));
  }
  return _deptIdListCache.get(departmentId);
}

/**
 * 异步版本：同时判断是否部门负责人
 * @param {object} req - Express request
 * @returns {object} { departmentId: string|null, isDeptManager: boolean }
 */
export const getDepartmentFilterAsync = async (req) => {
  if (!req.user) return { departmentId: null, isDeptManager: false };
  const { role, departmentId, employeeId } = req.user;
  if (role === 'SUPER_ADMIN') {
    return { departmentId: null, isDeptManager: false };
  }
  const isDeptMgr = employeeId ? await isDepartmentManager(employeeId) : false;
  return { departmentId: departmentId || null, isDeptManager: isDeptMgr };
};
