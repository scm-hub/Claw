import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Box, BottomNavigation, BottomNavigationAction, Typography, IconButton, Chip } from '@mui/material';
import {
  Dashboard as HomeIcon,
  Inventory2 as InventoryIcon,
  ShoppingCart as OrderIcon,
  Assignment as PlanIcon,
  TrendingUp as PurchaseIcon,
  AccountBalanceWallet as WalletIcon,
  Settings as SettingsIcon,
  QrCodeScanner as ScanIcon,
  Logout,
  ArrowBack,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { getNavItems, getRoleGroupName, ROLE_GROUPS } from '../config/navConfig';

// 图标名称 -> 组件映射（全量，与服务端 icon 字段对应）
const ICONS = {
  Dashboard: HomeIcon,
  Home: HomeIcon,
  Inventory: InventoryIcon,
  ShoppingCart: OrderIcon,
  Assignment: PlanIcon,
  TrendingUp: PurchaseIcon,
  AccountBalanceWallet: WalletIcon,
  Settings: SettingsIcon,
  QrCodeScanner: ScanIcon,
  QrCode: ScanIcon,
  Warning: null,
  Person: null,
  ListAlt: null,
  LocalShipping: null,
  Print: null,
  Approval: null,
  History: null,
  BarChart: null,
  Search: null,
  Add: null,
  Edit: null,
  CheckCircle: null,
  CloudUpload: null,
  Download: null,
};

function renderIcon(iconName) {
  const IconComp = ICONS[iconName];
  if (!IconComp) return null;
  return <IconComp />;
}

// 页面标题映射
const PAGE_TITLES = {
  '/': '鲜当家SCM',
  '/inventory': '库存管理',
  '/sales-orders': '销售订单',
  '/sales-plans': '销售计划',
  '/purchase-orders': '采购订单',
  '/receivables': '应收账款',
  '/payables': '应付账款',
  '/scan-inbound': '扫码入库',
  '/stock-take': '盘点管理',
  '/approval-center': '审批中心',
  '/shipping': '发货管理',
  '/settings': '设置',
};

export default function MobileLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth, layoutConfig } = useAuthStore();

  const role = user?.role || 'WAREHOUSE_STAFF';

  // 优先使用服务端动态配置，fallback 到本地 navConfig.js
  const navItems = layoutConfig?.navItems || getNavItems(role);
  const roleGroupName = layoutConfig?.roleGroup
    ? (() => { const names = { admin: '管理员', warehouse: '仓储', sales: '销售', purchase: '采购', finance: '财务', logistics: '物流', default: '通用' }; return names[layoutConfig.roleGroup] || layoutConfig.roleGroup; })()
    : getRoleGroupName(role);

  const currentIdx = navItems.findIndex((n) => n.path === location.pathname);
  const isExtraPage = currentIdx === -1;
  const pageTitle = PAGE_TITLES[location.pathname] || '鲜当家SCM';

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const displayName = user?.employee?.name || user?.username || '用户';
  const department = user?.employee?.department?.name || '';

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      maxWidth: '480px', margin: '0 auto', bgcolor: 'background.default',
    }}>
      <AppBar position="static" sx={{ flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isExtraPage && (
              <IconButton size="small" color="inherit" onClick={() => navigate(-1)}>
                <ArrowBack fontSize="small" />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{pageTitle}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ lineHeight: 1.2 }}>{displayName}</Typography>
              {department && (
                <Typography variant="caption" sx={{ opacity: 0.7, lineHeight: 1 }}>{department}</Typography>
              )}
            </Box>
            <IconButton size="small" color="inherit" onClick={handleLogout}>
              <Logout fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'auto', pb: 1 }}>
        <Outlet />
      </Box>

      <BottomNavigation
        value={currentIdx >= 0 ? currentIdx : 0}
        onChange={(e, v) => navigate(navItems[v].path)}
        showLabels
        sx={{ flexShrink: 0, borderTop: '1px solid #e0e0e0' }}
      >
        {navItems.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={renderIcon(item.icon)}
          />
        ))}
      </BottomNavigation>
    </Box>
  );
}
