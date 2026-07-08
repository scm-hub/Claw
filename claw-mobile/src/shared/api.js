/**
 * 统一 API 请求封装
 * - 自动附加 JWT Token
 * - 401 自动跳转登录页
 * - 统一错误处理
 */

const API_BASE = import.meta.env.VITE_API_BASE || '';

function getToken() {
  try {
    const auth = localStorage.getItem('claw_auth');
    if (!auth) return null;
    return JSON.parse(auth).token;
  } catch {
    return null;
  }
}

function getAuthHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(url, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    },
    ...options,
  };

  // 自动拼接 API 前缀
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

  const res = await fetch(fullUrl, config);

  if (res.status === 401) {
    localStorage.removeItem('claw_auth');
    window.location.href = '/login';
    throw new Error('登录已过期，请重新登录');
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || '请求失败');
  }

  return data;
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
};

export default api;
