/**
 * Portal API 客户端 — SCM 后端通过 HTTP 调用 Portal 综合平台接口
 *
 * 用途：
 * - 获取有 SCM 某模块权限的用户列表（数据源完全在 Portal，SCM 不再依赖自己的 users 表）
 * - 替代之前直接 SQL 查询 portal_db 的 getScmModuleUserEmails 方案
 *
 * 优势：
 * - 数据源单一：Portal 是用户和权限的权威源
 * - 避免数据不一致：不再需要在 SCM 和 Portal 之间做邮箱/工号/前缀匹配
 * - 复用 Portal 已有的聚合逻辑（HRMS 数据 + Portal 角色权限）
 */

const PORTAL_API_URL = process.env.PORTAL_API_URL || 'http://localhost:14001';
// 注：正式环境默认 4001，测试环境默认 14001，各自通过 .env 覆盖
const PORTAL_ADMIN_EMAIL = process.env.PORTAL_ADMIN_EMAIL || 'admin@hrms.com';
const PORTAL_ADMIN_PASSWORD = process.env.PORTAL_ADMIN_PASSWORD || 'admin123';

// 缓存 Portal admin token（过期前复用）
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * 用管理员账号登录 Portal 拿 token（用于服务端间调用）
 * Portal 的 /api/auth/login 走 HRMS 身份验证
 */
async function getPortalAdminToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60_000) return cachedToken;
  const resp = await fetch(`${PORTAL_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: PORTAL_ADMIN_EMAIL,
      password: PORTAL_ADMIN_PASSWORD,
    }),
  });
  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(`Portal 管理员登录失败: ${data.message || resp.statusText}`);
  }
  cachedToken = data.data.token;
  // Portal JWT 默认 8 小时有效期，这里缓存 1 小时保守些
  tokenExpiresAt = now + 60 * 60 * 1000;
  return cachedToken;
}

/**
 * 调用 Portal 的 GET /api/users 接口，获取所有在职用户及其权限信息
 *
 * @returns {Promise<Array<{
 *   id, email, name, employeeNo, globalId,
 *   departmentName, position, hrmsRole, isActive,
 *   roleNames, permissions, employee
 * }>>}
 */
export async function getPortalUsers() {
  const token = await getPortalAdminToken();
  const resp = await fetch(`${PORTAL_API_URL}/api/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(`Portal 获取用户列表失败: ${data.message || resp.statusText}`);
  }
  return data.data || [];
}

/**
 * 从 Portal 用户列表中筛选拥有指定 SCM 模块权限的用户
 *
 * 模块匹配规则（与 Portal 侧一致）：
 *   精确匹配 OR 以 moduleCode- 开头（覆盖子功能点如 sales-orders）
 *
 * @param {string[]} moduleCodes - SCM 模块编码数组，如 ['sales']
 * @returns {Promise<Array>} Portal 中有该模块权限的用户列表
 */
export async function getPortalUsersByScmModule(moduleCodes) {
  const users = await getPortalUsers();
  const codes = Array.isArray(moduleCodes) ? moduleCodes : [moduleCodes];
  return users.filter((u) => {
    if (!u.isActive) return false;
    const perms = u.permissions?.scm || [];
    return codes.some((mc) => perms.some((p) => p === mc || p.startsWith(mc + '-')));
  });
}

/**
 * 清除 token 缓存（用于测试或强制刷新）
 */
export function clearPortalTokenCache() {
  cachedToken = null;
  tokenExpiresAt = 0;
}
