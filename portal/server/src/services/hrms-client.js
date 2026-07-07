/**
 * HRMS API 客户端 — 通过 HTTP 调用 HRMS 的认证接口验证用户身份
 * SSO 中心不直接操作 HRMS 数据库，所有认证通过 API 完成
 */

const HRMS_API_URL = process.env.HRMS_API_URL || 'http://localhost:4002';

/**
 * 调用 HRMS 登录接口验证用户凭据
 * @param {string} email - 用户邮箱（或工号/手机号）
 * @param {string} password - 密码
 * @returns {Promise<object>} HRMS 返回的用户信息
 */
export async function hrmsLogin(email, password) {
  const resp = await fetch(`${HRMS_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await resp.json();

  if (!resp.ok || !data.success) {
    throw { status: 401, message: data.message || '账号或密码错误' };
  }

  return data.data; // { token, user: { id, email, role, employee: { ... } } }
}

/**
 * 通过 HRMS token 获取用户信息（用于 token 刷新场景）
 */
export async function hrmsGetMe(hrmsToken) {
  const resp = await fetch(`${HRMS_API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${hrmsToken}` },
  });

  const data = await resp.json();

  if (!resp.ok || !data.success) {
    throw { status: 401, message: 'HRMS 令牌无效' };
  }

  return data.data;
}
