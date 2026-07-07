import { create } from 'zustand';
import api from '../api';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('mdm_user') || 'null'),
  token: localStorage.getItem('mdm_token') || null,
  loading: false,

  login: (token, user) => {
    localStorage.setItem('mdm_token', token);
    localStorage.setItem('mdm_user', JSON.stringify(user));
    set({ user, token, loading: false });
  },

  fetchMe: async () => {
    try {
      const res = await api.get('/auth/me');
      localStorage.setItem('mdm_user', JSON.stringify(res.data));
      set({ user: res.data });
      return true;
    } catch {
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('mdm_token');
    localStorage.removeItem('mdm_user');
    set({ user: null, token: null });
  },

  isAuthenticated: () => !!localStorage.getItem('mdm_token'),
}));

/**
 * 检查用户是否有 MDM 某个模块的权限
 * moduleCode: 'master-data', 'master-data-departments', 'master-data-employees', 'master-data-sync'
 * 支持子功能点匹配：有 'master-data' 权限也能访问 'master-data-departments'
 */
export function hasModule(user, moduleCode) {
  const perms = user?.permissions?.mdm;
  if (!perms || perms.length === 0) return false;
  // 父模块权限涵盖子功能点：有 'master-data' 就能访问 'master-data-departments'
  return perms.some((p) => p === moduleCode || moduleCode.startsWith(p + '-') || p.startsWith(moduleCode + '-'));
}

export default useAuthStore;
