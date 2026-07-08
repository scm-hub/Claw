/**
 * 角色差异化导航配置
 * 每个角色组对应不同的底部导航 Tab 和首页布局
 */

// 角色组映射 — 将细粒度角色归到角色组
export const ROLE_GROUPS = {
  SUPER_ADMIN: 'admin',
  WAREHOUSE_MANAGER: 'warehouse',
  WAREHOUSE_STAFF: 'warehouse',
  SALES_MANAGER: 'sales',
  SALES_STAFF: 'sales',
  PURCHASE_MANAGER: 'purchase',
  PURCHASE_STAFF: 'purchase',
  FINANCE_MANAGER: 'finance',
  QUALITY_STAFF: 'warehouse',
  LOGISTICS_STAFF: 'logistics',
  CONTRACT_MANAGER: 'admin',
  HR_ADMIN: 'admin',
  HR: 'admin',
};

// 各角色组的底部导航项（最多5个）
export const NAV_BY_GROUP = {
  admin: [
    { path: '/scm', label: '首页', icon: 'Dashboard' },
    { path: '/scm/inventory', label: '库存', icon: 'Inventory' },
    { path: '/scm/sales-orders', label: '销售', icon: 'ShoppingCart' },
    { path: '/scm/purchase-orders', label: '采购', icon: 'TrendingUp' },
    { path: '/scm/settings', label: '设置', icon: 'Settings' },
  ],
  warehouse: [
    { path: '/scm', label: '首页', icon: 'Dashboard' },
    { path: '/scm/inventory', label: '库存', icon: 'Inventory' },
    { path: '/scm/scan-inbound', label: '扫码', icon: 'QrCodeScanner' },
    { path: '/scm/stock-take', label: '盘点', icon: 'Assignment' },
    { path: '/scm/settings', label: '设置', icon: 'Settings' },
  ],
  sales: [
    { path: '/scm', label: '首页', icon: 'Dashboard' },
    { path: '/scm/sales-orders', label: '销售订单', icon: 'ShoppingCart' },
    { path: '/scm/sales-plans', label: '销售计划', icon: 'Assignment' },
    { path: '/scm/receivables', label: '应收', icon: 'AccountBalanceWallet' },
    { path: '/scm/settings', label: '设置', icon: 'Settings' },
  ],
  purchase: [
    { path: '/scm', label: '首页', icon: 'Dashboard' },
    { path: '/scm/purchase-orders', label: '采购订单', icon: 'TrendingUp' },
    { path: '/scm/payables', label: '应付', icon: 'AccountBalanceWallet' },
    { path: '/scm/settings', label: '设置', icon: 'Settings' },
  ],
  finance: [
    { path: '/scm', label: '首页', icon: 'Dashboard' },
    { path: '/scm/receivables', label: '应收', icon: 'AccountBalanceWallet' },
    { path: '/scm/payables', label: '应付', icon: 'AccountBalanceWallet' },
    { path: '/scm/settings', label: '设置', icon: 'Settings' },
  ],
  logistics: [
    { path: '/scm', label: '首页', icon: 'Dashboard' },
    { path: '/scm/inventory', label: '库存', icon: 'Inventory' },
    { path: '/scm/settings', label: '设置', icon: 'Settings' },
  ],
  default: [
    { path: '/scm', label: '首页', icon: 'Dashboard' },
    { path: '/scm/settings', label: '设置', icon: 'Settings' },
  ],
};

// 各角色组的首页卡片配置
export const DASHBOARD_CARDS_BY_GROUP = {
  admin: [
    { label: '销售总额', key: 'sales', icon: 'ShoppingCart', color: '#1976d2', path: '/scm/sales-orders' },
    { label: '采购总额', key: 'purchase', icon: 'TrendingUp', color: '#9c27b0', path: '/scm/purchase-orders' },
    { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/scm/inventory' },
    { label: '应收余额', key: 'receivable', icon: 'AccountBalanceWallet', color: '#ed6c02', path: '/scm/receivables' },
    { label: '应付余额', key: 'payable', icon: 'AccountBalanceWallet', color: '#d32f2f', path: '/scm/payables' },
    { label: '临期批次', key: 'batch', icon: 'Warning', color: '#f44336', path: '/scm/inventory' },
  ],
  warehouse: [
    { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/scm/inventory' },
    { label: '临期批次', key: 'batch', icon: 'Warning', color: '#f44336', path: '/scm/inventory' },
    { label: '待入库', key: 'pendingInbound', icon: 'QrCodeScanner', color: '#1976d2', path: '/scm/scan-inbound' },
    { label: '待盘点', key: 'pendingStockTake', icon: 'Assignment', color: '#ed6c02', path: '/scm/stock-take' },
  ],
  sales: [
    { label: '销售总额', key: 'sales', icon: 'ShoppingCart', color: '#1976d2', path: '/scm/sales-orders' },
    { label: '应收余额', key: 'receivable', icon: 'AccountBalanceWallet', color: '#ed6c02', path: '/scm/receivables' },
    { label: '临期批次', key: 'batch', icon: 'Warning', color: '#f44336', path: '/scm/inventory' },
    { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/scm/inventory' },
  ],
  purchase: [
    { label: '采购总额', key: 'purchase', icon: 'TrendingUp', color: '#9c27b0', path: '/scm/purchase-orders' },
    { label: '应付余额', key: 'payable', icon: 'AccountBalanceWallet', color: '#d32f2f', path: '/scm/payables' },
    { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/scm/inventory' },
  ],
  finance: [
    { label: '应收余额', key: 'receivable', icon: 'AccountBalanceWallet', color: '#ed6c02', path: '/scm/receivables' },
    { label: '应付余额', key: 'payable', icon: 'AccountBalanceWallet', color: '#d32f2f', path: '/scm/payables' },
    { label: '销售总额', key: 'sales', icon: 'ShoppingCart', color: '#1976d2', path: '/scm/sales-orders' },
    { label: '采购总额', key: 'purchase', icon: 'TrendingUp', color: '#9c27b0', path: '/scm/purchase-orders' },
  ],
  logistics: [
    { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/scm/inventory' },
    { label: '临期批次', key: 'batch', icon: 'Warning', color: '#f44336', path: '/scm/inventory' },
  ],
  default: [
    { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/scm/inventory' },
  ],
};

// 各角色组首页快捷入口
export const QUICK_ACTIONS_BY_GROUP = {
  admin: [
    { label: '实时库存', icon: 'Inventory', path: '/scm/inventory', color: 'primary.main' },
    { label: '销售订单', icon: 'ShoppingCart', path: '/scm/sales-orders', color: 'secondary.main' },
    { label: '采购订单', icon: 'TrendingUp', path: '/scm/purchase-orders', color: 'success.main' },
    { label: '临期预警', icon: 'Warning', path: '/scm/inventory', color: 'warning.main' },
  ],
  warehouse: [
    { label: '扫码入库', icon: 'QrCodeScanner', path: '/scm/scan-inbound', color: 'primary.main' },
    { label: '实时库存', icon: 'Inventory', path: '/scm/inventory', color: 'success.main' },
    { label: '盘点管理', icon: 'Assignment', path: '/scm/stock-take', color: 'warning.main' },
    { label: '临期预警', icon: 'Warning', path: '/scm/inventory', color: 'error.main' },
  ],
  sales: [
    { label: '销售订单', icon: 'ShoppingCart', path: '/scm/sales-orders', color: 'primary.main' },
    { label: '销售计划', icon: 'Assignment', path: '/scm/sales-plans', color: 'secondary.main' },
    { label: '应收账款', icon: 'AccountBalanceWallet', path: '/scm/receivables', color: 'warning.main' },
    { label: '实时库存', icon: 'Inventory', path: '/scm/inventory', color: 'success.main' },
  ],
  purchase: [
    { label: '采购订单', icon: 'TrendingUp', path: '/scm/purchase-orders', color: 'primary.main' },
    { label: '应付账款', icon: 'AccountBalanceWallet', path: '/scm/payables', color: 'error.main' },
    { label: '实时库存', icon: 'Inventory', path: '/scm/inventory', color: 'success.main' },
  ],
  finance: [
    { label: '应收账款', icon: 'AccountBalanceWallet', path: '/scm/receivables', color: 'warning.main' },
    { label: '应付账款', icon: 'AccountBalanceWallet', path: '/scm/payables', color: 'error.main' },
  ],
  logistics: [
    { label: '实时库存', icon: 'Inventory', path: '/scm/inventory', color: 'primary.main' },
    { label: '临期预警', icon: 'Warning', path: '/scm/inventory', color: 'warning.main' },
  ],
  default: [
    { label: '实时库存', icon: 'Inventory', path: '/scm/inventory', color: 'primary.main' },
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
  const group = ROLE_GROUPS[role] || 'default';
  const names = {
    admin: '管理员',
    warehouse: '仓储',
    sales: '销售',
    purchase: '采购',
    finance: '财务',
    logistics: '物流',
    default: '通用',
  };
  return names[group] || '通用';
}
