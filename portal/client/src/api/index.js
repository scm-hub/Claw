import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

// 请求拦截 — 自动附加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sso_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截 — 统一错误处理
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && !error.config?._skipAuthRedirect) {
      // 令牌过期或无效，清除登录状态
      localStorage.removeItem('sso_token');
      localStorage.removeItem('sso_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
