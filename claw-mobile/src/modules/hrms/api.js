import { Capacitor } from '@capacitor/core';

function getBaseUrl() {
  if (Capacitor.isNativePlatform()) {
    return '/hrms/api';
  }
  return '/api';
}

const BASE_URL = getBaseUrl();

async function request(url, options = {}) {
  let token = localStorage.getItem('claw_hrms_token') || null;
  if (!token) {
    try {
      const auth = localStorage.getItem('claw_auth');
      if (auth) token = JSON.parse(auth).token;
    } catch {}
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${url}`, { ...options, headers });

  if (res.status === 401) {
    const isLoginRequest = url.includes('/auth/');
    if (!isLoginRequest) {
      localStorage.removeItem('claw_hrms_token');
      localStorage.removeItem('claw_auth');
      window.location.href = '/mobile/login';
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
};

export default api;
