/**
 * 角色差异化导航配置
 * 每个角色组对应不同的底部导航 Tab 和首页布局
 */

// 角色组映射 — 将 SCM 细粒度角色映射到 Portal 角色名称（与权限管理→角色管理一致）
export const ROLE_GROUPS = {
  SUPER_ADMIN: '超级管理员',
  WAREHOUSE_MANAGER: '仓库管理员',
  WAREHOUSE_STAFF: '仓库管理员',
  SALES_MANAGER: '销售经理',
  SALES_STAFF: '销售经理',
  PURCHASE_MANAGER: '采购员',
  PURCHASE_STAFF: '采购员',
  FINANCE_MANAGER: '经理',
  FINANCE_STAFF: '经理',
  QUALITY_STAFF: '仓库管理员',
  LOGISTICS_STAFF: '普通员工',
  CONTRACT_MANAGER: '经理',
  HR_ADMIN: 'HR管理员',
  HR: 'HR管理员',
  COST_MANAGER: '经理',
  SALES_REP: '销售经理',
};

// 各角色组的底部导航项（最多5个）— 服务端配置的本地兜底
export const NAV_BY_GROUP = {
  '超级管理员': [
    { path: '/', label: '首页', icon: 'Dashboard' },
    { path: '/inventory', label: '库存', icon: 'Inventory' },
    { path: '/sales-orders', label: '销售', icon: 'ShoppingCart' },
    { path: '/purchase-orders', label: '采购', icon: 'TrendingUp' },
    { path: '/settings', label: '设置', icon: 'Settings' },
  ],
  '仓库管理员': [
    { path: '/', label: '首页', icon: 'Dashboard' },
    { path: '/inventory', label: '库存', icon: 'Inventory' },
    { path: '/scan-inbound', label: '扫码', icon: 'QrCodeScanner' },
    { path: '/stock-take', label: '盘点', icon: 'Assignment' },
    { path: '/settings', label: '设置', icon: 'Settings' },
  ],
  '销售经理': [
    { path: '/', label: '首页', icon: 'Dashboard' },
    { path: '/sales-orders', label: '销售订单', icon: 'ShoppingCart' },
    { path: '/sales-plans', label: '销售计划', icon: 'Assignment' },
    { path: '/receivables', label: '应收', icon: 'AccountBalanceWallet' },
    { path: '/settings', label: '设置', icon: 'Settings' },
  ],
  '采购员': [
    { path: '/', label: '首页', icon: 'Dashboard' },
    { path: '/purchase-orders', label: '采购订单', icon: 'TrendingUp' },
    { path: '/payables', label: '应付', icon: 'AccountBalanceWallet' },
    { path: '/settings', label: '设置', icon: 'Settings' },
  ],
  '采购计划专员': [
    { path: '/', label: '首页', icon: 'Dashboard' },
    { path: '/purchase-orders', label: '采购订单', icon: 'TrendingUp' },
    { path: '/payables', label: '应付', icon: 'AccountBalanceWallet' },
    { path: '/settings', label: '设置', icon: 'Settings' },
  ],
  '经理': [
    { path: '/', label: '首页', icon: 'Dashboard' },
    { path: '/receivables', label: '应收', icon: 'AccountBalanceWallet' },
    { path: '/payables', label: '应付', icon: 'AccountBalanceWallet' },
    { path: '/settings', label: '设置', icon: 'Settings' },
  ],
  'HR管理员': [
    { path: '/', label: '首页', icon: 'Dashboard' },
    { path: '/settings', label: '设置', icon: 'Settings' },
  ],
  '普通员工': [
    { path: '/', label: '首页', icon: 'Dashboard' },
    { path: '/settings', label: '设置', icon: 'Settings' },
  ],
  // 兜底
  'default': [
    { path: '/', label: '首页', icon: 'Dashboard' },
    { path: '/settings', label: '设置', icon: 'Settings' },
  ],
};

// 各角色组的首页卡片配置
export const DASHBOARD_CARDS_BY_GROUP = {
  '超级管理员': [
    { label: '销售总额', key: 'sales', icon: 'ShoppingCart', color: '#1976d2', path: '/sales-orders' },
    { label: '采购总额', key: 'purchase', icon: 'TrendingUp', color: '#9c27b0', path: '/purchase-orders' },
    { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/inventory' },
    { label: '应收余额', key: 'receivable', icon: 'AccountBalanceWallet', color: '#ed6c02', path: '/receivables' },
    { label: '应付余额', key: 'payable', icon: 'AccountBalanceWallet', color: '#d32f2f', path: '/payables' },
    { label: '临期批次', key: 'batch', icon: 'Warning', color: '#f44336', path: '/inventory' },
  ],
  '仓库管理员': [
    { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/inventory' },
    { label: '临期批次', key: 'batch', icon: 'Warning', color: '#f44336', path: '/inventory' },
    { label: '待入库', key: 'pendingInbound', icon: 'QrCodeScanner', color: '#1976d2', path: '/scan-inbound' },
    { label: '待盘点', key: 'pendingStockTake', icon: 'Assignment', color: '#ed6c02', path: '/stock-take' },
  ],
  '销售经理': [
    { label: '销售总额', key: 'sales', icon: 'ShoppingCart', color: '#1976d2', path: '/sales-orders' },
    { label: '应收余额', key: 'receivable', icon: 'AccountBalanceWallet', color: '#ed6c02', path: '/receivables' },
    { label: '临期批次', key: 'batch', icon: 'Warning', color: '#f44336', path: '/inventory' },
    { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/inventory' },
  ],
  '采购员': [
    { label: '采购总额', key: 'purchase', icon: 'TrendingUp', color: '#9c27b0', path: '/purchase-orders' },
    { label: '应付余额', key: 'payable', icon: 'AccountBalanceWallet', color: '#d32f2f', path: '/payables' },
    { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/inventory' },
  ],
  '采购计划专员': [
    { label: '采购总额', key: 'purchase', icon: 'TrendingUp', color: '#9c27b0', path: '/purchase-orders' },
    { label: '应付余额', key: 'payable', icon: 'AccountBalanceWallet', color: '#d32f2f', path: '/payables' },
    { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/inventory' },
  ],
  '经理': [
    { label: '应收余额', key: 'receivable', icon: 'AccountBalanceWallet', color: '#ed6c02', path: '/receivables' },
    { label: '应付余额', key: 'payable', icon: 'AccountBalanceWallet', color: '#d32f2f', path: '/payables' },
    { label: '销售总额', key: 'sales', icon: 'ShoppingCart', color: '#1976d2', path: '/sales-orders' },
    { label: '采购总额', key: 'purchase', icon: 'TrendingUp', color: '#9c27b0', path: '/purchase-orders' },
  ],
  'HR管理员': [
    { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/inventory' },
  ],
  '普通员工': [
    { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/inventory' },
  ],
  'default': [
    { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/inventory' },
  ],
};

// 各角色组首页快捷入口
export const QUICK_ACTIONS_BY_GROUP = {
  '超级管理员': [
    { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'primary.main' },
    { label: '销售订单', icon: 'ShoppingCart', path: '/sales-orders', color: 'secondary.main' },
    { label: '采购订单', icon: 'TrendingUp', path: '/purchase-orders', color: 'success.main' },
    { label: '临期预警', icon: 'Warning', path: '/inventory', color: 'warning.main' },
  ],
  '仓库管理员': [
    { label: '扫码入库', icon: 'QrCodeScanner', path: '/scan-inbound', color: 'primary.main' },
    { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'success.main' },
    { label: '盘点管理', icon: 'Assignment', path: '/stock-take', color: 'warning.main' },
    { label: '临期预警', icon: 'Warning', path: '/inventory', color: 'error.main' },
  ],
  '销售经理': [
    { label: '销售订单', icon: 'ShoppingCart', path: '/sales-orders', color: 'primary.main' },
    { label: '销售计划', icon: 'Assignment', path: '/sales-plans', color: 'secondary.main' },
    { label: '应收账款', icon: 'AccountBalanceWallet', path: '/receivables', color: 'warning.main' },
    { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'success.main' },
  ],
  '采购员': [
    { label: '采购订单', icon: 'TrendingUp', path: '/purchase-orders', color: 'primary.main' },
    { label: '应付账款', icon: 'AccountBalanceWallet', path: '/payables', color: 'error.main' },
    { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'success.main' },
  ],
  '采购计划专员': [
    { label: '采购订单', icon: 'TrendingUp', path: '/purchase-orders', color: 'primary.main' },
    { label: '应付账款', icon: 'AccountBalanceWallet', path: '/payables', color: 'error.main' },
    { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'success.main' },
  ],
  '经理': [
    { label: '应收账款', icon: 'AccountBalanceWallet', path: '/receivables', color: 'warning.main' },
    { label: '应付账款', icon: 'AccountBalanceWallet', path: '/payables', color: 'error.main' },
  ],
  'HR管理员': [
    { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'primary.main' },
  ],
  '普通员工': [
    { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'primary.main' },
  ],
  'default': [
    { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'primary.main' },
  ],
};

/**
 * 根据角色获取导航配置
 */
export function getNavItems(role) {
  const group = ROLE_GROUPS[role] || 'default';
  return NAV_BY_GROUP[group] || NAV_BY_GROUP.default;
}

/**
 * 根据角色获取首页卡片配置
 */
export function getDashboardCards(role) {
  const group = ROLE_GROUPS[role] || 'default';
  return DASHBOARD_CARDS_BY_GROUP[group] || DASHBOARD_CARDS_BY_GROUP.default;
}

/**
 * 根据角色获取首页快捷入口
 */
export function getQuickActions(role) {
  const group = ROLE_GROUPS[role] || 'default';
  return QUICK_ACTIONS_BY_GROUP[group] || QUICK_ACTIONS_BY_GROUP.default;
}

/**
 * 获取角色组名称（中文）
 */
export function getRoleGroupName(role) {
  return ROLE_GROUPS[role] || '普通员工';
}
