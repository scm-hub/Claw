import { create } from 'zustand';

const TOKEN_KEY = 'xdj_m_token';
const USER_KEY = 'xdj_m_user';
const CONFIG_KEY = 'xdj_m_layout_config';

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY) || null,
  user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  layoutConfig: JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'),

  setAuth: (data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    set({ token: data.token, user: data.user });
    // 登录后自动拉取布局配置
    get().fetchLayoutConfig(data.user.role);
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(CONFIG_KEY);
    set({ token: null, user: null, layoutConfig: null });
  },

  // 获取当前用户角色
  getRole: () => {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return user?.role || null;
  },

  // 获取当前用户名（用于显示）
  getDisplayName: () => {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return user?.employee?.name || user?.username || '用户';
  },

  // 拉取移动端布局配置（从服务端动态读取，fallback 到本地硬编码）
  fetchLayoutConfig: async (role) => {
    try {
      const { getRoleGroupName } = await import('../config/navConfig.js');
      const roleGroup = getRoleGroupName(role);
      const res = await fetch(
        `/api/mobile-layout/config?roleGroup=${roleGroup}`,
        { headers: { Authorization: `Bearer ${get().token}` } }
      );
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(data.data));
        set({ layoutConfig: data.data });
      }
    } catch (err) {
      // 拉取失败时降级使用本地 navConfig.js
      console.warn('[LayoutConfig] 服务端配置拉取失败，使用本地配置', err.message);
    }
  },

  // 获取当前布局配置（优先服务端，fallback 本地 navConfig.js）
  getLayoutConfig: () => {
    const config = get().layoutConfig;
    if (config) return config;
    // fallback：动态 import navConfig.js
    return null; // 由调用方自行 fallback
  },
}));
