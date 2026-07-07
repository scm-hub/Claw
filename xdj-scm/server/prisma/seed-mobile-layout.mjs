/**
 * 移动端布局默认配置种子脚本
 * 将 navConfig.js 的硬编码配置写入 mobile_layout_configs 表
 */

import prisma from '../src/shared/prisma.js';

const defaultConfigs = [
  {
    roleGroup: 'admin',
    navItems: [
      { path: '/', label: '首页', icon: 'Dashboard', sortOrder: 1 },
      { path: '/inventory', label: '库存', icon: 'Inventory', sortOrder: 2 },
      { path: '/sales-orders', label: '销售', icon: 'ShoppingCart', sortOrder: 3 },
      { path: '/purchase-orders', label: '采购', icon: 'TrendingUp', sortOrder: 4 },
      { path: '/settings', label: '设置', icon: 'Settings', sortOrder: 5 },
    ],
    dashboardCards: [
      { label: '销售总额', key: 'sales', icon: 'ShoppingCart', color: '#1976d2', path: '/sales-orders', sortOrder: 1 },
      { label: '采购总额', key: 'purchase', icon: 'TrendingUp', color: '#9c27b0', path: '/purchase-orders', sortOrder: 2 },
      { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/inventory', sortOrder: 3 },
      { label: '应收余额', key: 'receivable', icon: 'AccountBalanceWallet', color: '#ed6c02', path: '/receivables', sortOrder: 4 },
      { label: '应付余额', key: 'payable', icon: 'AccountBalanceWallet', color: '#d32f2f', path: '/payables', sortOrder: 5 },
      { label: '临期批次', key: 'batch', icon: 'Warning', color: '#f44336', path: '/inventory', sortOrder: 6 },
    ],
    quickActions: [
      { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'primary.main', sortOrder: 1 },
      { label: '销售订单', icon: 'ShoppingCart', path: '/sales-orders', color: 'secondary.main', sortOrder: 2 },
      { label: '采购订单', icon: 'TrendingUp', path: '/purchase-orders', color: 'success.main', sortOrder: 3 },
      { label: '临期预警', icon: 'Warning', path: '/inventory', color: 'warning.main', sortOrder: 4 },
    ],
  },
  {
    roleGroup: 'warehouse',
    navItems: [
      { path: '/', label: '首页', icon: 'Dashboard', sortOrder: 1 },
      { path: '/inventory', label: '库存', icon: 'Inventory', sortOrder: 2 },
      { path: '/scan-inbound', label: '扫码', icon: 'QrCodeScanner', sortOrder: 3 },
      { path: '/stock-take', label: '盘点', icon: 'Assignment', sortOrder: 4 },
      { path: '/settings', label: '设置', icon: 'Settings', sortOrder: 5 },
    ],
    dashboardCards: [
      { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/inventory', sortOrder: 1 },
      { label: '临期批次', key: 'batch', icon: 'Warning', color: '#f44336', path: '/inventory', sortOrder: 2 },
      { label: '待入库', key: 'pendingInbound', icon: 'QrCodeScanner', color: '#1976d2', path: '/scan-inbound', sortOrder: 3 },
      { label: '待盘点', key: 'pendingStockTake', icon: 'Assignment', color: '#ed6c02', path: '/stock-take', sortOrder: 4 },
    ],
    quickActions: [
      { label: '扫码入库', icon: 'QrCodeScanner', path: '/scan-inbound', color: 'primary.main', sortOrder: 1 },
      { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'success.main', sortOrder: 2 },
      { label: '盘点管理', icon: 'Assignment', path: '/stock-take', color: 'warning.main', sortOrder: 3 },
      { label: '临期预警', icon: 'Warning', path: '/inventory', color: 'error.main', sortOrder: 4 },
    ],
  },
  {
    roleGroup: 'sales',
    navItems: [
      { path: '/', label: '首页', icon: 'Dashboard', sortOrder: 1 },
      { path: '/sales-orders', label: '销售订单', icon: 'ShoppingCart', sortOrder: 2 },
      { path: '/sales-plans', label: '销售计划', icon: 'Assignment', sortOrder: 3 },
      { path: '/receivables', label: '应收', icon: 'AccountBalanceWallet', sortOrder: 4 },
      { path: '/settings', label: '设置', icon: 'Settings', sortOrder: 5 },
    ],
    dashboardCards: [
      { label: '销售总额', key: 'sales', icon: 'ShoppingCart', color: '#1976d2', path: '/sales-orders', sortOrder: 1 },
      { label: '应收余额', key: 'receivable', icon: 'AccountBalanceWallet', color: '#ed6c02', path: '/receivables', sortOrder: 2 },
      { label: '临期批次', key: 'batch', icon: 'Warning', color: '#f44336', path: '/inventory', sortOrder: 3 },
      { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/inventory', sortOrder: 4 },
    ],
    quickActions: [
      { label: '销售订单', icon: 'ShoppingCart', path: '/sales-orders', color: 'primary.main', sortOrder: 1 },
      { label: '销售计划', icon: 'Assignment', path: '/sales-plans', color: 'secondary.main', sortOrder: 2 },
      { label: '应收账款', icon: 'AccountBalanceWallet', path: '/receivables', color: 'warning.main', sortOrder: 3 },
      { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'success.main', sortOrder: 4 },
    ],
  },
  {
    roleGroup: 'purchase',
    navItems: [
      { path: '/', label: '首页', icon: 'Dashboard', sortOrder: 1 },
      { path: '/purchase-orders', label: '采购订单', icon: 'TrendingUp', sortOrder: 2 },
      { path: '/payables', label: '应付', icon: 'AccountBalanceWallet', sortOrder: 3 },
      { path: '/settings', label: '设置', icon: 'Settings', sortOrder: 4 },
    ],
    dashboardCards: [
      { label: '采购总额', key: 'purchase', icon: 'TrendingUp', color: '#9c27b0', path: '/purchase-orders', sortOrder: 1 },
      { label: '应付余额', key: 'payable', icon: 'AccountBalanceWallet', color: '#d32f2f', path: '/payables', sortOrder: 2 },
      { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/inventory', sortOrder: 3 },
    ],
    quickActions: [
      { label: '采购订单', icon: 'TrendingUp', path: '/purchase-orders', color: 'primary.main', sortOrder: 1 },
      { label: '应付账款', icon: 'AccountBalanceWallet', path: '/payables', color: 'error.main', sortOrder: 2 },
      { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'success.main', sortOrder: 3 },
    ],
  },
  {
    roleGroup: 'finance',
    navItems: [
      { path: '/', label: '首页', icon: 'Dashboard', sortOrder: 1 },
      { path: '/receivables', label: '应收', icon: 'AccountBalanceWallet', sortOrder: 2 },
      { path: '/payables', label: '应付', icon: 'AccountBalanceWallet', sortOrder: 3 },
      { path: '/settings', label: '设置', icon: 'Settings', sortOrder: 4 },
    ],
    dashboardCards: [
      { label: '应收余额', key: 'receivable', icon: 'AccountBalanceWallet', color: '#ed6c02', path: '/receivables', sortOrder: 1 },
      { label: '应付余额', key: 'payable', icon: 'AccountBalanceWallet', color: '#d32f2f', path: '/payables', sortOrder: 2 },
      { label: '销售总额', key: 'sales', icon: 'ShoppingCart', color: '#1976d2', path: '/sales-orders', sortOrder: 3 },
      { label: '采购总额', key: 'purchase', icon: 'TrendingUp', color: '#9c27b0', path: '/purchase-orders', sortOrder: 4 },
    ],
    quickActions: [
      { label: '应收账款', icon: 'AccountBalanceWallet', path: '/receivables', color: 'warning.main', sortOrder: 1 },
      { label: '应付账款', icon: 'AccountBalanceWallet', path: '/payables', color: 'error.main', sortOrder: 2 },
    ],
  },
  {
    roleGroup: 'logistics',
    navItems: [
      { path: '/', label: '首页', icon: 'Dashboard', sortOrder: 1 },
      { path: '/inventory', label: '库存', icon: 'Inventory', sortOrder: 2 },
      { path: '/settings', label: '设置', icon: 'Settings', sortOrder: 3 },
    ],
    dashboardCards: [
      { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/inventory', sortOrder: 1 },
      { label: '临期批次', key: 'batch', icon: 'Warning', color: '#f44336', path: '/inventory', sortOrder: 2 },
    ],
    quickActions: [
      { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'primary.main', sortOrder: 1 },
      { label: '临期预警', icon: 'Warning', path: '/inventory', color: 'warning.main', sortOrder: 2 },
    ],
  },
  {
    roleGroup: 'default',
    navItems: [
      { path: '/', label: '首页', icon: 'Dashboard', sortOrder: 1 },
      { path: '/settings', label: '设置', icon: 'Settings', sortOrder: 2 },
    ],
    dashboardCards: [
      { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/inventory', sortOrder: 1 },
    ],
    quickActions: [
      { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'primary.main', sortOrder: 1 },
    ],
  },
];

async function main() {
  console.log('开始写入移动端布局默认配置...');

  for (const config of defaultConfigs) {
    const { roleGroup, navItems, dashboardCards, quickActions } = config;

    await prisma.mobileLayoutConfig.upsert({
      where: { roleGroup },
      update: {
        navItems: JSON.stringify(navItems),
        dashboardCards: JSON.stringify(dashboardCards),
        quickActions: quickActions ? JSON.stringify(quickActions) : null,
      },
      create: {
        roleGroup,
        navItems: JSON.stringify(navItems),
        dashboardCards: JSON.stringify(dashboardCards),
        quickActions: quickActions ? JSON.stringify(quickActions) : null,
      },
    });

    console.log(`  ✓ ${roleGroup} 组配置已写入`);
  }

  console.log('\n✅ 全部默认配置写入完成！');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ 写入失败：', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
