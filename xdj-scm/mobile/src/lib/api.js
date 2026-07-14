import { useAuthStore } from '../store/authStore';
import { Capacitor } from '@capacitor/core';

/**
 * 获取 API BASE_URL
 * - 原生 App 模式：使用配置的服务器地址
 * - Web 模式：使用相对路径 /api（由 Vite proxy 或网关转发）
 */
function getBaseUrl() {
  if (Capacitor.isNativePlatform()) {
    // 生产环境请改为实际服务器地址
    return 'http://111.17.201.197:5174/scm/api';
  }
  // Web 开发/预览模式
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base + '/api';
}

export const BASE_URL = getBaseUrl();

async function request(url, options = {}) {
  const token = useAuthStore.getState().token;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${url}`, { ...options, headers });

  if (res.status === 401) {
    // 登录接口的 401 是用户名/密码错误，不要清除 token 和跳转
    const isLoginRequest = url.includes('/auth/mobile-login') || url.includes('/auth/login');
    if (!isLoginRequest) {
      useAuthStore.getState().clearAuth();
      if (Capacitor.isNativePlatform()) {
        window.location.href = '/login';
      } else {
        window.location.href = import.meta.env.BASE_URL + 'login';
      }
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
