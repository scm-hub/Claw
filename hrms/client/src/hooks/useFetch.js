import axios from 'axios';
import useAuthStore from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.BASE_URL.replace(/\/$/, '') + '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // 如果是 blob 响应（文件下载），返回整个 response 对象以便调用方获取 blob
    if (response.config?.responseType === 'blob') {
      return response;
    }
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    // 对于 blob 请求的错误，尝试解析错误消息
    if (error.config?.responseType === 'blob' && data instanceof Blob) {
      return new Promise((_, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const json = JSON.parse(reader.result);
            reject(json);
          } catch {
            reject({ message: '文件下载失败' });
          }
        };
        reader.onerror = () => reject({ message: '文件下载失败' });
        reader.readAsText(data);
      });
    }

    // 401 only redirect if already logged in (session expired)
    if (status === 401 && useAuthStore.getState().isAuthenticated) {
      useAuthStore.getState().logout();
      window.location.href = import.meta.env.BASE_URL + 'login';
      return Promise.reject(data || error);
    }

    // Return structured error for the caller to handle
    const err = data || { message: error.message || '网络请求失败' };
    return Promise.reject(err);
  }
);

export default api;
