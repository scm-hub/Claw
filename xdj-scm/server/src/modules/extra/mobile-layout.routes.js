import { Router } from 'express';
import { ssoAuth } from '../../middleware/sso-middleware.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import prisma from '../../shared/prisma.js';
import { getPool as getPortalDb } from '../../shared/portalDb.js';

const router = Router();

// ============================================================
// 移动端布局配置 API
// GET 公开（移动端启动时拉取配置，无需登录）
// PUT/POST 需要 SSO 认证 + SUPER_ADMIN 权限
// ============================================================

/**
 * 预设图标列表（供 Portal 配置页面下拉选择）
 */
const PRESET_ICONS = [
  'Dashboard', 'Home', 'Inventory', 'ShoppingCart', 'TrendingUp',
  'AccountBalanceWallet', 'Assignment', 'QrCodeScanner', 'QrCode',
  'Settings', 'Warning', 'Person', 'ListAlt', 'LocalShipping',
  'Print', 'Approval', 'History', 'BarChart', 'PieChart',
  'Search', 'Add', 'Edit', 'Delete', 'CheckCircle', 'Cancel',
  'CloudUpload', 'CloudDownload', 'Refresh', 'Filter',
  'DateRange', 'Download', 'Upload', 'Visibility', 'Notifications',
];

/**
 * 预设页面路由（供 Portal 配置页面下拉选择）
 */
const PRESET_ROUTES = [
  { path: '/', label: '首页（仪表盘）', category: '基础' },
  { path: '/inventory', label: '实时库存', category: '库存' },
  { path: '/sales-orders', label: '销售订单', category: '销售' },
  { path: '/sales-plans', label: '销售计划', category: '销售' },
  { path: '/receivables', label: '应收账款', category: '财务' },
  { path: '/purchase-orders', label: '采购订单', category: '采购' },
  { path: '/payables', label: '应付账款', category: '财务' },
  { path: '/scan-inbound', label: '扫码入库', category: '仓储' },
  { path: '/stock-take', label: '盘点管理', category: '仓储' },
  { path: '/approval-center', label: '审批中心', category: '审批' },
  { path: '/shipping', label: '发货管理', category: '仓储' },
  { path: '/traceability', label: '追溯查询', category: '追溯' },
  { path: '/settings', label: '个人设置', category: '基础' },
];

// ============================================================
// 默认布局配置（按 Portal 角色名称 key）
// ============================================================
const DEFAULTS = {
  '超级管理员': {
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
  '仓库管理员': {
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
  '销售经理': {
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
  '采购员': {
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
  '采购计划专员': {
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
  'HR管理员': {
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
    ],
    quickActions: [
      { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'primary.main', sortOrder: 1 },
      { label: '销售订单', icon: 'ShoppingCart', path: '/sales-orders', color: 'secondary.main', sortOrder: 2 },
      { label: '采购订单', icon: 'TrendingUp', path: '/purchase-orders', color: 'success.main', sortOrder: 3 },
    ],
  },
  '经理': {
    navItems: [
      { path: '/', label: '首页', icon: 'Dashboard', sortOrder: 1 },
      { path: '/sales-orders', label: '销售订单', icon: 'ShoppingCart', sortOrder: 2 },
      { path: '/purchase-orders', label: '采购订单', icon: 'TrendingUp', sortOrder: 3 },
      { path: '/inventory', label: '库存', icon: 'Inventory', sortOrder: 4 },
      { path: '/settings', label: '设置', icon: 'Settings', sortOrder: 5 },
    ],
    dashboardCards: [
      { label: '销售总额', key: 'sales', icon: 'ShoppingCart', color: '#1976d2', path: '/sales-orders', sortOrder: 1 },
      { label: '采购总额', key: 'purchase', icon: 'TrendingUp', color: '#9c27b0', path: '/purchase-orders', sortOrder: 2 },
      { label: '库存总量', key: 'inventory', icon: 'Inventory', color: '#2e7d32', path: '/inventory', sortOrder: 3 },
      { label: '应收余额', key: 'receivable', icon: 'AccountBalanceWallet', color: '#ed6c02', path: '/receivables', sortOrder: 4 },
      { label: '应付余额', key: 'payable', icon: 'AccountBalanceWallet', color: '#d32f2f', path: '/payables', sortOrder: 5 },
    ],
    quickActions: [
      { label: '销售订单', icon: 'ShoppingCart', path: '/sales-orders', color: 'primary.main', sortOrder: 1 },
      { label: '采购订单', icon: 'TrendingUp', path: '/purchase-orders', color: 'secondary.main', sortOrder: 2 },
      { label: '实时库存', icon: 'Inventory', path: '/inventory', color: 'success.main', sortOrder: 3 },
    ],
  },
  '普通员工': {
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
};

// ============================================================
// 公开接口 — 无需登录
// ============================================================

/**
 * GET /api/mobile-layout/config?roleGroup=销售经理
 * 移动端启动时拉取布局配置
 */
router.get('/config', async (req, res, next) => {
  try {
    const { roleGroup = '普通员工' } = req.query;

    const config = await prisma.mobileLayoutConfig.findUnique({
      where: { roleGroup },
    });

    if (!config) {
      // 没有配置时返回默认结构
      return res.json({
        success: true,
        data: {
          roleGroup,
          navItems: [{ path: '/', label: '首页', icon: 'Dashboard', sortOrder: 1 }],
          dashboardCards: [],
          quickActions: [],
        },
      });
    }

    res.json({
      success: true,
      data: {
        roleGroup: config.roleGroup,
        navItems: JSON.parse(config.navItems),
        dashboardCards: JSON.parse(config.dashboardCards),
        quickActions: config.quickActions ? JSON.parse(config.quickActions) : [],
        updatedAt: config.updatedAt,
      },
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/mobile-layout/presets
 * 获取预设图标和页面路由列表
 */
router.get('/presets', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        icons: PRESET_ICONS,
        routes: PRESET_ROUTES,
      },
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/mobile-layout/roles
 * 获取 Portal 角色列表（供配置页面角色选择下拉使用）
 * 数据来源：portal_db.role 表
 */
router.get('/roles', async (req, res, next) => {
  try {
    const pool = getPortalDb();
    const [rows] = await pool.query(
      'SELECT id, name, description, isSystem, createdAt FROM `role` ORDER BY createdAt ASC'
    );
    res.json({
      success: true,
      data: rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        isSystem: !!r.isSystem,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// 管理接口 — 需要 SSO 认证 + SUPER_ADMIN 权限
// ============================================================
router.use(ssoAuth);
router.use(authorize(ROLES.SUPER_ADMIN));

/**
 * GET /api/mobile-layout/configs
 * 获取所有角色的配置列表（Portal 管理页面用）
 */
router.get('/configs', async (req, res, next) => {
  try {
    const configs = await prisma.mobileLayoutConfig.findMany({
      orderBy: { roleGroup: 'asc' },
    });

    res.json({
      success: true,
      data: configs.map(c => ({
        roleGroup: c.roleGroup,
        roleGroupName: c.roleGroup,
        navItemCount: JSON.parse(c.navItems).length,
        cardCount: JSON.parse(c.dashboardCards).length,
        actionCount: c.quickActions ? JSON.parse(c.quickActions).length : 0,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (err) { next(err); }
});

/**
 * PUT /api/mobile-layout/config/:roleGroup
 * 保存某角色的布局配置（roleGroup 为 Portal 角色名称，需 URL 编码）
 */
router.put('/config/:roleGroup', async (req, res, next) => {
  try {
    const roleGroup = decodeURIComponent(req.params.roleGroup);
    const { navItems, dashboardCards, quickActions } = req.body;

    if (!Array.isArray(navItems) || !Array.isArray(dashboardCards)) {
      return res.status(400).json({ success: false, message: 'navItems 和 dashboardCards 必须是数组' });
    }

    if (navItems.length > 5) {
      return res.status(400).json({ success: false, message: '底部导航最多5个' });
    }

    const navOrders = navItems.map(i => i.sortOrder);
    const cardOrders = dashboardCards.map(c => c.sortOrder);
    if (new Set(navOrders).size !== navOrders.length) {
      return res.status(400).json({ success: false, message: '导航项排序号不能重复' });
    }
    if (new Set(cardOrders).size !== cardOrders.length) {
      return res.status(400).json({ success: false, message: '仪表盘卡片排序号不能重复' });
    }

    const config = await prisma.mobileLayoutConfig.upsert({
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

    res.json({
      success: true,
      message: `${roleGroup} 配置已保存`,
      data: {
        roleGroup: config.roleGroup,
        navItems: JSON.parse(config.navItems),
        dashboardCards: JSON.parse(config.dashboardCards),
        quickActions: config.quickActions ? JSON.parse(config.quickActions) : [],
      },
    });
  } catch (err) { next(err); }
});

/**
 * POST /api/mobile-layout/config/:roleGroup/reset
 * 恢复某角色到默认配置
 */
router.post('/config/:roleGroup/reset', async (req, res, next) => {
  try {
    const roleGroup = decodeURIComponent(req.params.roleGroup);

    const defaultConfig = DEFAULTS[roleGroup];
    if (!defaultConfig) {
      return res.status(400).json({ success: false, message: `未找到角色"${roleGroup}"的默认配置，请手动配置` });
    }

    const config = await prisma.mobileLayoutConfig.upsert({
      where: { roleGroup },
      update: {
        navItems: JSON.stringify(defaultConfig.navItems),
        dashboardCards: JSON.stringify(defaultConfig.dashboardCards),
        quickActions: JSON.stringify(defaultConfig.quickActions || []),
      },
      create: {
        roleGroup,
        navItems: JSON.stringify(defaultConfig.navItems),
        dashboardCards: JSON.stringify(defaultConfig.dashboardCards),
        quickActions: JSON.stringify(defaultConfig.quickActions || []),
      },
    });

    res.json({
      success: true,
      message: `${roleGroup} 配置已恢复默认`,
      data: {
        roleGroup: config.roleGroup,
        navItems: JSON.parse(config.navItems),
        dashboardCards: JSON.parse(config.dashboardCards),
        quickActions: JSON.parse(config.quickActions),
      },
    });
  } catch (err) { next(err); }
});

export default router;
