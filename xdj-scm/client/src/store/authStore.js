import { create } from 'zustand';

const TOKEN_KEY = 'xdj_token';
const USER_KEY = 'xdj_user';

export const useAuthStore = create((set) => ({
  token: localStorage.getItem(TOKEN_KEY) || null,
  user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),

  setAuth: (data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    set({ token: data.token, user: data.user });
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null });
  },

  get isLoggedIn() {
    return !!this?.token;
  },
}));

// 角色权限辅助
export function hasRole(user, ...roles) {
  if (!user?.role) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return roles.includes(user.role);
}

// 模块权限别名映射：SCM 菜单 module → Portal 权限 moduleCode 前缀集合
// Portal 权限模块已对齐 SCM 菜单结构，部分模块使用缩写前缀
const MODULE_ALIASES = {
  master: ['master'],
  purchase: ['purchase'],
  sales: ['sales'],
  warehouse: ['warehouse', 'wh'],
  traceability: ['traceability', 'trace'],
  finance: ['finance', 'fin'],
  cost: ['cost'],
  logistics: ['logistics', 'log'],
  other: ['other'],
  settings: ['settings'],
  contract: ['contract'],
  dashboard: ['dashboard', 'dash'],
  approval: ['approval'],
};

// 模块权限检查 — 检查用户是否有某模块的访问权限
// 支持双向别名扩展 + 四种匹配方式：
// 1. 精确匹配：权限码 === 请求码（如 purchase-plans === purchase-plans）
// 2. 请求码前缀匹配：权限码以请求码的别名开头（如 warehouse 权限匹配 wh-inventory，因为 wh-inventory 以 wh- 开头）
// 3. 父级匹配：请求码以权限码的别名开头（如 purchase-plans 以 purchase- 开头，拥有 purchase 权限 = 可访问子功能）
// 4. 权限码前缀匹配：请求码以权限码的别名开头（如 wh-inventory 以 wh- 开头，拥有 warehouse/wh 权限 → 匹配所有 wh-* 子项）
export function hasModule(user, moduleCode) {
  // SUPER_ADMIN 始终拥有所有权限
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;

  // SSO 模式下权限必须是数组：null/undefined/空数组 = 无任何模块权限
  const perms = user.permissions;
  if (!perms || !Array.isArray(perms) || perms.length === 0) return false;

  // 双向扩展别名：请求码和权限码都通过 MODULE_ALIASES 展开
  const reqAliases = MODULE_ALIASES[moduleCode] || [moduleCode];

  return perms.some((p) => {
    const permAliases = MODULE_ALIASES[p] || [p];
    // 请求码别名 × 权限码别名：任一交叉匹配即通过
    return reqAliases.some((req) =>
      permAliases.some((perm) =>
        req === perm ||                            // 精确匹配
        req.startsWith(perm + '-') ||              // 父级匹配（请求码以权限别名开头）
        perm.startsWith(req + '-')                 // 子项匹配（权限码以请求别名开头）
      )
    );
  });
}

// 角色中文映射
export const ROLE_LABELS = {
  SUPER_ADMIN: '超级管理员',
  SALES_MANAGER: '销售经理',
  SALES_REP: '销售员',
  PURCHASE_STAFF: '采购员',
  PURCHASE_MANAGER: '采购主管',
  WAREHOUSE_STAFF: '仓库管理员',
  FINANCE_STAFF: '财务员',
  COST_MANAGER: '成本管理员',
  QUALITY_STAFF: '质检员',
  LOGISTICS_STAFF: '物流管理员',
  CONTRACT_MANAGER: '合同管理员',
  EMPLOYEE: '普通员工',
};
