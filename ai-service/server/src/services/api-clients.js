/**
 * 跨系统 API 客户端
 *
 * 使用 SSO 令牌向各子系统换取本地 JWT，然后调用业务 API。
 * 令牌缓存在内存中，过期自动重新获取。
 */

const HRMS_API_URL = process.env.HRMS_API_URL || 'http://localhost:4002';
const SCM_API_URL = process.env.SCM_API_URL || 'http://localhost:4003';
const MDM_API_URL = process.env.MDM_API_URL || 'http://localhost:4005';

// 令牌缓存 { ssoToken: { hrms: {token, expiry}, scm: {...}, mdm: {...} } }
const tokenCache = new Map();

/**
 * 用 SSO 令牌向指定系统换取本地 JWT
 */
async function getLocalToken(baseUrl, ssoToken) {
  const resp = await fetch(`${baseUrl}/api/auth/sso-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ssoToken }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`SSO 登录失败 (${baseUrl}): ${text}`);
  }

  const data = await resp.json();
  if (!data.success) {
    throw new Error(`SSO 登录失败 (${baseUrl}): ${data.message}`);
  }

  return data.data.token;
}

/**
 * 获取指定系统的本地令牌（带缓存）
 */
async function ensureToken(system, ssoToken) {
  if (!tokenCache.has(ssoToken)) {
    tokenCache.set(ssoToken, {});
  }

  const cache = tokenCache.get(ssoToken);
  const cached = cache[system];

  // 缓存有效期 1 小时
  if (cached && Date.now() < cached.expiry) {
    return cached.token;
  }

  const urls = { hrms: HRMS_API_URL, scm: SCM_API_URL, mdm: MDM_API_URL };
  const token = await getLocalToken(urls[system], ssoToken);

  cache[system] = { token, expiry: Date.now() + 3600 * 1000 };
  return token;
}

/**
 * 通用 API 调用
 */
async function callApi(baseUrl, path, method, token, body) {
  const url = `${baseUrl}${path}`;
  const options = {
    method: method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const resp = await fetch(url, options);
  const data = await resp.json();

  if (!resp.ok || !data.success) {
    throw new Error(`API 调用失败 (${url}): ${data.message || resp.statusText}`);
  }

  return data.data;
}

// ============================================================
// HRMS API
// ============================================================

export async function hrmsApi(ssoToken, path, method, body) {
  const token = await ensureToken('hrms', ssoToken);
  return callApi(HRMS_API_URL, path, method, token, body);
}

// ============================================================
// SCM API
// ============================================================

export async function scmApi(ssoToken, path, method, body) {
  const token = await ensureToken('scm', ssoToken);
  return callApi(SCM_API_URL, path, method, token, body);
}

// ============================================================
// MDM API
// ============================================================

export async function mdmApi(ssoToken, path, method, body) {
  const token = await ensureToken('mdm', ssoToken);
  return callApi(MDM_API_URL, path, method, token, body);
}

/**
 * 从请求中提取 SSO 令牌
 * AI 服务的本地 JWT 中保存了原始 SSO 令牌
 */
export function getSsoToken(req) {
  return req.user?.ssoToken;
}

export { HRMS_API_URL, SCM_API_URL, MDM_API_URL };
