import { create } from 'zustand';

const AUTH_KEY = 'claw_auth';

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveAuth(data) {
  if (data) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(data));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

const useAuthStore = create((set, get) => ({
  user: loadAuth()?.user || null,
  token: loadAuth()?.token || null,
  isAuthenticated: !!loadAuth()?.token,

  setAuth: (user, token) => {
    const data = { user, token };
    saveAuth(data);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    saveAuth(null);
    set({ user: null, token: null, isAuthenticated: false });
  },

  /**
   * 获取用户在子系统中的角色
   * @param {string} system - 'hrms' | 'scm' | 'mdm' | 'ai' | 'workflow'
   * @returns {string} 角色值
   */
  getSystemRole: (system) => {
    const user = get().user;
    return user?.systemRoles?.[system] || user?.role || 'EMPLOYEE';
  },

  /**
   * 获取模块权限列表
   * @param {string} system - 子系统标识
   * @returns {string[]}
   */
  getPermissions: (system) => {
    const user = get().user;
    return user?.permissions?.[system] || [];
  },

  /**
   * 检查是否有某模块权限
   */
  hasModule: (system, moduleCode) => {
    const user = get().user;
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    const perms = get().getPermissions(system);
    return perms.includes(moduleCode);
  },
}));

export default useAuthStore;
