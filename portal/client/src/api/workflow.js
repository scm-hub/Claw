// Workflow Engine API 客户端
// 通过 Portal 网关代理访问 workflow-engine（端口 4011）

import axios from 'axios';

const wfApi = axios.create({
  baseURL: '/workflow/api/workflow',
  timeout: 15000,
});

// 请求拦截 — 自动附加 Portal SSO token
wfApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('sso_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截
wfApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    return Promise.reject(error.response?.data || error);
  }
);

export default wfApi;
