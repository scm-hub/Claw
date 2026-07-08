import { create } from 'zustand';
import api from '../shared/api';

/**
 * 移动端布局配置 Store
 * 支持从后端动态加载角色差异化布局，也支持本地默认布局
 */
const DEFAULT_TABS = [
  { key: 'workbench', label: '工作台', icon: 'home' },
  { key: 'scm', label: '供应链', icon: 'inventory' },
  { key: 'hrms', label: '人力资源', icon: 'people' },
  { key: 'ai', label: 'AI助手', icon: 'smart_toy' },
  { key: 'profile', label: '我的', icon: 'person' },
];

const useLayoutStore = create((set, get) => ({
  tabs: DEFAULT_TABS,
  loaded: false,
  loading: false,

  /**
   * 从后端加载角色对应的移动端布局配置
   * API: GET /api/portal/mobile-layout
   */
  loadLayout: async (role) => {
    if (!role) return;
    set({ loading: true });
    try {
      const res = await api.get(`/api/portal/mobile-layout?role=${encodeURIComponent(role)}`);
      if (res.data?.tabs && res.data.tabs.length > 0) {
        set({ tabs: res.data.tabs, loaded: true, loading: false });
      } else {
        set({ loaded: true, loading: false });
      }
    } catch {
      // 加载失败使用默认布局
      set({ loaded: true, loading: false });
    }
  },

  resetLayout: () => set({ tabs: DEFAULT_TABS, loaded: false }),
}));

export default useLayoutStore;
