import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.BASE_URL.replace(/\/$/, '') + '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mdm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mdm_token');
      localStorage.removeItem('mdm_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = import.meta.env.BASE_URL + 'login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
