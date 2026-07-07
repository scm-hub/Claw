/**
 * 部门数据范围过滤工具
 *
 * 规则：
 *  - SUPER_ADMIN / HR_ADMIN → 不过滤，可看全部数据
 *  - MANAGER / EMPLOYEE → 只能看本部门及子部门数据（服务层自动递归包含子部门）
 *  - 未登录或无部门信息 → 不过滤（交给业务层判断）
 */

/**
 * 从请求中获取部门过滤条件
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
