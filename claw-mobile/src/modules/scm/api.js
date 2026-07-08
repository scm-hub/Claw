import { Capacitor } from '@capacitor/core';

/**
 * SCM 模块 API 封装
 * - 原生 App：直连外网服务器 http://111.17.201.197:5174/api
 * - Web 开发：走 Vite proxy → Gateway
 */
function getBaseUrl() {
  if (Capacitor.isNativePlatform()) {
    return 'http://111.17.201.197:5174/api';
  }
  return '/api';
}

const BASE_URL = getBaseUrl();

async function request(url, options = {}) {
  let token = null;
  try {
    const auth = localStorage.getItem('claw_auth');
    if (auth) token = JSON.parse(auth).token;
  } catch {}

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${url}`, { ...options, headers });

  if (res.status === 401) {
    const isLoginRequest = url.includes('/auth/mobile-login') || url.includes('/auth/login');
    if (!isLoginRequest) {
      localStorage.removeItem('claw_auth');
      window.location.href = '/login';
      throw new Error('认证已过期');
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `请求失败 (${res.status})`);
  return data;
}

export const api = {
  get: (url) => request(url, { method: 'GET' }),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
};

export default api;
