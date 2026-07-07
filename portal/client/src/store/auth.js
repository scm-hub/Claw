import { create } from 'zustand';
import api from '../api';

const useAuthStore = create((set, get) => ({
  // 状态
  token: localStorage.getItem('sso_token') || null,
  user: JSON.parse(localStorage.getItem('sso_user') || 'null'),
  systems: JSON.parse(localStorage.getItem('sso_systems') || '[]'),
  loading: false,
  error: null,

  // 登录
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const resp = await api.post('/auth/login', { email, password });
      const { token, user, systems, permissions, systemRoles } = resp.data;
      const userWithPerms = { ...user, permissions, systemRoles };
      localStorage.setItem('sso_token', token);
      localStorage.setItem('sso_user', JSON.stringify(userWithPerms));
      localStorage.setItem('sso_systems', JSON.stringify(systems));
      set({ token, user: userWithPerms, systems, loading: false });
      return { success: true };
    } catch (err) {
      const msg = err.message || '登录失败';
      set({ loading: false, error: msg });
      return { success: false, message: msg };
    }
  },

  // 退出
  logout: () => {
    localStorage.removeItem('sso_token');
    localStorage.removeItem('sso_user');
    localStorage.removeItem('sso_systems');
    set({ token: null, user: null, systems: [] });
  },

  // 检查令牌有效性
  checkAuth: async () => {
    const token = get().token;
    if (!token) return false;
    try {
      const resp = await api.get('/auth/me');
      if (resp.success) {
        const user = {
          id: resp.data.userId,
          email: resp.data.email,
          name: resp.data.name,
          role: resp.data.role,
          employeeId: resp.data.employeeId,
          departmentName: resp.data.departmentName,
          permissions: resp.data.permissions,
          systemRoles: resp.data.systemRoles,
        };
        set({ user, systems: resp.data.accessibleSystems || [] });
        localStorage.setItem('sso_user', JSON.stringify(user));
        localStorage.setItem('sso_systems', JSON.stringify(get().systems));
        return true;
      }
    } catch {
      get().logout();
      return false;
    }
  },

  // 刷新系统列表
  refreshSystems: async () => {
    try {
      const resp = await api.get('/systems');
      if (resp.success) {
        set({ systems: resp.data });
        localStorage.setItem('sso_systems', JSON.stringify(resp.data));
      }
    } catch {
      // ignore
    }
  },

  // 判断是否已登录
  isAuthenticated: () => !!get().token,

  // 判断是否管理员 — 纯粹基于 Portal 模块权限，不依赖 HRMS 角色
  isAdmin: () => {
    const portalPerms = get().user?.permissions?.portal;
    if (!Array.isArray(portalPerms) || portalPerms.length === 0) return false;
    return portalPerms.some(p =>
      p === 'access' || p.startsWith('access-') ||
      p === 'systems' || p === 'logs'
    );
  },

  // 逐项检查 Portal 模块权限 — 仅基于 permissions.portal，不依赖 HRMS 角色
  hasPortalModule: (moduleCode) => {
    const user = get().user;
    if (!user) return false;
    const portalPerms = user?.permissions?.portal;
    if (!Array.isArray(portalPerms)) return false;
    if (portalPerms.length === 0) return false;
    // 精确匹配 + 前缀匹配（拥有父模块 = 可访问子功能）
    return portalPerms.some(p =>
      p === moduleCode ||
      moduleCode.startsWith(p + '-') ||
      p.startsWith(moduleCode + '-')
    );
  },
}));

export default useAuthStore;
