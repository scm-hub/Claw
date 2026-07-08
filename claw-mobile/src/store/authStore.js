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
  layoutConfig: null, // SCM 兼容

  // 支持两种调用方式：
  //   setAuth(user, token)  — portal 方式
  //   setAuth({ token, user })  — SCM 方式
  setAuth: (userOrData, token) => {
    let data;
    if (token !== undefined) {
      // setAuth(user, token)
      data = { user: userOrData, token };
    } else if (userOrData && typeof userOrData === 'object') {
      // setAuth({ token, user })
      data = userOrData;
    } else {
      return;
    }
    saveAuth(data);
    set({ user: data.user, token: data.token, isAuthenticated: true });
  },

  clearAuth: () => {
    saveAuth(null);
    set({ user: null, token: null, isAuthenticated: false, layoutConfig: null });
  },

  logout: () => {
    saveAuth(null);
    set({ user: null, token: null, isAuthenticated: false, layoutConfig: null });
  },

  // SCM 兼容
  getRole: () => get().user?.role || null,
  getDisplayName: () => {
    const user = get().user;
    return user?.employee?.name || user?.username || user?.email || '用户';
  },

  getSystemRole: (system) => {
    const user = get().user;
    return user?.systemRoles?.[system] || user?.role || 'EMPLOYEE';
  },

  getPermissions: (system) => {
    const user = get().user;
    return user?.permissions?.[system] || [];
  },

  hasModule: (system, moduleCode) => {
    const user = get().user;
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    const perms = get().getPermissions(system);
    return perms.includes(moduleCode);
  },

  // SCM 兼容：获取布局配置
  getLayoutConfig: () => get().layoutConfig,
  fetchLayoutConfig: async () => {},
}));

export { useAuthStore };
export default useAuthStore;
