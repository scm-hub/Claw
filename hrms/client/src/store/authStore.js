import { create } from 'zustand';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  updateUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));

// HRMS 模块别名映射（与 SCM 同逻辑：父模块 → 缩写前缀集合）
const MODULE_ALIASES = {
  attendance: ['attendance'],
  leave: ['leave'],
  payroll: ['payroll'],
  settings: ['settings'],
  departments: ['departments'],
  employees: ['employees'],
  positions: ['positions'],
  onboarding: ['onboarding'],
  contracts: ['contracts'],
  performance: ['performance'],
  training: ['training'],
  recruitment: ['recruitment'],
  reports: ['reports'],
  dashboard: ['dashboard'],
};

// 模块权限检查 — 双向别名扩展 + 精确/父级/子项匹配
export function hasModule(user, moduleCode) {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  const perms = user.permissions;
  if (!perms || !Array.isArray(perms) || perms.length === 0) return false;

  const reqAliases = MODULE_ALIASES[moduleCode] || [moduleCode];
  return perms.some((p) => {
    const permAliases = MODULE_ALIASES[p] || [p];
    return reqAliases.some((req) =>
      permAliases.some((perm) =>
        req === perm ||
        req.startsWith(perm + '-') ||
        perm.startsWith(req + '-')
      )
    );
  });
}

export default useAuthStore;
