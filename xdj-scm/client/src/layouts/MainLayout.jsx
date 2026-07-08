import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, Toolbar, Typography, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Collapse, Avatar, Menu, MenuItem,
  IconButton, Divider, Badge,
} from '@mui/material';
import {
  Dashboard as DashboardIcon, Category as CategoryIcon, ShoppingCart as PurchaseIcon,
  Storefront as SalesIcon, Inventory2 as InventoryIcon, Warehouse as WmsIcon,
  TrackChanges as TraceIcon, AccountBalanceWallet as FinanceIcon, Calculate as CostIcon,
  LocalShipping as LogisticsIcon, AcUnit as ColdChainIcon, QrCodeScanner as BarcodeIcon,
  Description as ContractIcon, SupportAgent as AfterSalesIcon, Approval as ApprovalIcon,
  Analytics as AnalyticsIcon, NotificationsActive as AlertIcon, RateReview as EvalIcon,
  Settings as SettingsIcon, People as PeopleIcon, ExpandLess, ExpandMore,
  Logout, Person, Menu as MenuIcon, Business, Print as PrintIcon, Route as RouteIcon, Shield as ShieldIcon,
} from '@mui/icons-material';
import { useAuthStore, ROLE_LABELS, hasModule } from '../store/authStore';

const drawerWidth = 240;

// 菜单组定义 — 每个菜单项绑定精确的 moduleCode（对应 Portal 权限配置的 moduleCode）
// 组级不再用 module 控制可见性，而是逐项过滤：组可见 = 组内有至少一个可见项
const menuGroups = [
  {
    label: '基础数据', icon: <CategoryIcon />, items: [
      { path: '/master/material-grades', label: '物料等级管理', icon: <CategoryIcon />, module: 'master-material-grades' },
      { path: '/master/material-groups', label: '产品组管理', icon: <CategoryIcon />, module: 'master-material-groups' },
      { path: '/master/materials', label: '产品管理', icon: <InventoryIcon />, module: 'master-materials' },
      { path: '/master/customers', label: '客户管理', icon: <PeopleIcon />, module: 'master-customers' },
      { path: '/master/suppliers', label: '供应商管理', icon: <Business />, module: 'master-suppliers' },
      { path: '/master/warehouses', label: '仓库管理', icon: <WmsIcon />, module: 'master-warehouses' },
      { path: '/master/employees', label: '员工管理', icon: <PeopleIcon />, module: 'master-employees' },
      { path: '/master/departments', label: '部门管理', icon: <Business />, module: 'master-departments' },
      { path: '/master/purchaser-assignments', label: '采购员管理', icon: <PeopleIcon />, module: 'master-purchaser-assignments' },
      { path: '/master/providers', label: '承运商管理', icon: <LogisticsIcon />, module: 'master-providers' },
      { path: '/master/print-templates', label: '打印管理', icon: <PrintIcon />, module: 'master-print-templates' },
      { path: '/master/vehicle-types', label: '车型管理', icon: <LogisticsIcon />, module: 'master-vehicle-types' },
      { path: '/master/stock-standards', label: '安全库存标准', icon: <ShieldIcon />, module: 'master-stock-standards' },
      { path: '/master/stock-alerts', label: '库存预警', icon: <ShieldIcon />, module: 'master-stock-alerts' },
      { path: '/master/addresses', label: '地址管理', icon: <RouteIcon />, module: 'master-addresses' },
    ],
  },
  {
    label: '采购管理', icon: <PurchaseIcon />, items: [
      { path: '/purchase/plans', label: '采购计划', icon: <PurchaseIcon />, module: 'purchase-plans' },
      { path: '/purchase/orders', label: '采购订单', icon: <PurchaseIcon />, module: 'purchase-orders' },
      { path: '/purchase/receipts', label: '采购入库', icon: <InventoryIcon />, module: 'purchase-receipts' },
    ],
  },
  {
    label: '销售管理', icon: <SalesIcon />, items: [
      { path: '/sales/plans', label: '销售计划', icon: <SalesIcon />, module: 'sales-plans' },
      { path: '/sales/orders', label: '销售订单', icon: <SalesIcon />, module: 'sales-orders' },
      { path: '/sales/prices', label: '费用登记', icon: <SalesIcon />, module: 'sales-prices' },
      { path: '/sales/credit', label: '客户信用', icon: <SalesIcon />, module: 'sales-credit' },
      { path: '/sales/demand-aggregation', label: '需求汇总', icon: <SalesIcon />, module: 'sales-demand' },
    ],
  },
  {
    label: '仓储WMS', icon: <WmsIcon />, items: [
      { path: '/wms/inventory', label: '库存台账', icon: <InventoryIcon />, module: 'wh-inventory' },
      { path: '/wms/zones', label: '库区库位', icon: <WmsIcon />, module: 'wh-zones' },
      { path: '/wms/movements', label: '出入库记录', icon: <InventoryIcon />, module: 'wh-movements' },
      { path: '/wms/stock-takes', label: '盘点管理', icon: <WmsIcon />, module: 'wh-stocktakes' },
    ],
  },
  {
    label: '批次追溯', icon: <TraceIcon />, items: [
      { path: '/traceability/batches', label: '批次管理', icon: <TraceIcon />, module: 'trace-batches' },
      { path: '/traceability/trace', label: '批次追溯', icon: <TraceIcon />, module: 'trace-trace' },
      { path: '/traceability/stock-age', label: '库龄分析', icon: <TraceIcon />, module: 'trace-stockage' },
      { path: '/traceability/recall', label: '召回管理', icon: <TraceIcon />, module: 'trace-recall' },
    ],
  },
  {
    label: '财务结算', icon: <FinanceIcon />, items: [
      { path: '/finance/receivable', label: '应收账款', icon: <FinanceIcon />, module: 'fin-receivable' },
      { path: '/finance/payable', label: '应付账款', icon: <FinanceIcon />, module: 'fin-payable' },
      { path: '/finance/invoices', label: '发票管理', icon: <FinanceIcon />, module: 'fin-invoices' },
      { path: '/finance/payments', label: '收付款', icon: <FinanceIcon />, module: 'fin-payments' },
    ],
  },
  {
    label: '成本引擎', icon: <CostIcon />, items: [
      { path: '/cost/config', label: '成本配置', icon: <CostIcon />, module: 'cost-config' },
      { path: '/cost/standard', label: '标准成本', icon: <CostIcon />, module: 'cost-standard' },
    ],
  },
  {
    label: '物流冷链', icon: <LogisticsIcon />, items: [
      { path: '/logistics/shipping-orders', label: '发货管理', icon: <LogisticsIcon />, module: 'log-shipping' },
      { path: '/logistics/waybills', label: '运单管理', icon: <LogisticsIcon />, module: 'log-waybills' },
      { path: '/logistics/routes', label: '配送路线', icon: <LogisticsIcon />, module: 'log-routes' },
      { path: '/coldchain/dashboard', label: '温度看板', icon: <ColdChainIcon />, module: 'log-temp' },
      { path: '/coldchain/sensors', label: '传感器管理', icon: <ColdChainIcon />, module: 'log-sensors' },
    ],
  },
  {
    label: '其他管理', icon: <ApprovalIcon />, items: [
      { path: '/barcode', label: '扫码作业', icon: <BarcodeIcon />, module: 'wh-barcode' },
      { path: '/contract', label: '合同管理', icon: <ContractIcon />, module: 'contract-mgmt' },
      { path: '/aftersales', label: '售后管理', icon: <AfterSalesIcon />, module: 'contract-aftersales' },
      { path: '/approval', label: '审批管理', icon: <ApprovalIcon />, module: 'approval' },
      { path: '/analytics', label: '数据分析', icon: <AnalyticsIcon />, module: 'dash-analytics' },
      { path: '/alert', label: '预警中心', icon: <AlertIcon />, module: 'dash-alert' },
      { path: '/supplier-eval', label: '供应商评估', icon: <EvalIcon />, module: 'purchase-eval' },
    ],
  },
  {
    label: '系统设置', icon: <SettingsIcon />, items: [
      { path: '/settings/portal', label: '用户权限管理', icon: <PeopleIcon />, external: true, module: 'settings-portal' },
    ],
  },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState(null);
  const [openGroups, setOpenGroups] = useState(() => {
    const currentGroup = menuGroups.find((g) =>
      g.items.some((item) => location.pathname.startsWith(item.path))
    );
    return currentGroup ? { [currentGroup.label]: true } : {};
  });

  const handleToggle = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // 过滤菜单：逐项检查权限，组可见 = 组内有至少一个可见项
  const visibleGroups = menuGroups
    .map((group) => {
      const visibleItems = group.items.filter((item) => {
        if (!item.module) return true; // 无 module 的项始终可见
        return hasModule(user, item.module);
      });
      return visibleItems.length > 0 ? { ...group, items: visibleItems } : null;
    })
    .filter(Boolean);

  return (
    <Box sx={{ display: 'flex' }}>
      {/* 侧边栏 */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
            鲜当家 SCM
          </Typography>
        </Toolbar>
        <Divider />
        <List sx={{ overflowY: 'auto', flex: 1 }}>
          <ListItemButton
            selected={location.pathname === '/'}
            onClick={() => navigate('/')}
          >
            <ListItemIcon><DashboardIcon /></ListItemIcon>
            <ListItemText primary="仪表盘" />
          </ListItemButton>

          <ListItemButton
            selected={location.pathname === '/dashboard/stock-monitor'}
            onClick={() => navigate('/dashboard/stock-monitor')}
          >
            <ListItemIcon><ShieldIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="库存监控" />
          </ListItemButton>

          {visibleGroups.map((group) => (
            <div key={group.label}>
              <ListItemButton onClick={() => handleToggle(group.label)}>
                <ListItemIcon>{group.icon}</ListItemIcon>
                <ListItemText primary={group.label} />
                {openGroups[group.label] ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={!!openGroups[group.label]} timeout="auto" unmountOnExit>
                {group.items.map((item) => (
                  <ListItemButton
                    key={item.path}
                    selected={!item.external && location.pathname === item.path}
                    onClick={() => {
                      if (item.external) {
                        window.open(window.location.origin + '/admin/roles', '_blank');
                      } else {
                        navigate(item.path);
                      }
                    }}
                    sx={{ pl: 4 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                ))}
              </Collapse>
            </div>
          ))}
        </List>
        <Divider />
      </Drawer>

      {/* 主内容区 */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
        {/* 顶栏 */}
        <AppBar position="fixed" sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              鲜当家食用菌供应链管理系统
            </Typography>
            <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Badge badgeContent={0} color="error">
                <Person />
              </Badge>
            </IconButton>
            <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
              <MenuItem disabled>
                <ListItemIcon><Person fontSize="small" /></ListItemIcon>
                {user?.employee?.name || user?.username || '未知'}
              </MenuItem>
              <MenuItem disabled>
                <ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>
                {ROLE_LABELS[user?.role] || user?.role || '未知角色'}
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
                退出登录
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Toolbar />

        {/* 页面内容 */}
        <Outlet />
      </Box>
    </Box>
  );
}
