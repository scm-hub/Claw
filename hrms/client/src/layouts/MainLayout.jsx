import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Collapse,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  AccessTime as AttendanceIcon,
  EventNote as LeaveIcon,
  Payments as SalaryIcon,
  Calculate as CalcIcon,
  Work as RecruitmentIcon,
  Assessment as PerformanceIcon,
  Description as ContractIcon,
  School as TrainingIcon,
  AccountTree as DeptIcon,
  Badge as PositionIcon,
  Description as ReportIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  HowToReg as OnboardingIcon,
  Person as PersonIcon,
  ExpandLess,
  ExpandMore,
  Summarize as SummaryIcon,
  Fingerprint as PunchIcon,
  ListAlt as RecordsIcon,
  Security as SecurityIcon,
  Approval as ApprovalIcon,
} from '@mui/icons-material';
import useAuthStore, { hasModule } from '../store/authStore';
import useUiStore from '../store/uiStore';
import useAuth from '../hooks/useAuth';

const DRAWER_WIDTH = 240;

// 菜单结构 — 每项带 moduleCode 用于权限过滤
const ALL_MENU_ITEMS = [
  { text: '仪表盘', icon: <DashboardIcon />, path: '/dashboard', moduleCode: 'dashboard' },
  { text: '部门管理', icon: <DeptIcon />, path: '/departments', moduleCode: 'departments' },
  { text: '岗位管理', icon: <PositionIcon />, path: '/positions', moduleCode: 'positions' },
  { text: '员工管理', icon: <PeopleIcon />, path: '/employees', moduleCode: 'employees' },
  { text: '入职管理', icon: <OnboardingIcon />, path: '/employees/onboarding', moduleCode: 'onboarding' },
  {
    text: '考勤管理',
    icon: <AttendanceIcon />,
    basePath: '/attendance',
    moduleCode: 'attendance',
    children: [
      { text: '考勤打卡', icon: <PunchIcon />, path: '/attendance', moduleCode: 'attendance-punch' },
      { text: '考勤记录', icon: <RecordsIcon />, path: '/attendance/records', moduleCode: 'attendance-records' },
      { text: '考勤汇总', icon: <SummaryIcon />, path: '/attendance/summary', moduleCode: 'attendance-summary' },
    ],
  },
  {
    text: '请假管理',
    icon: <LeaveIcon />,
    basePath: '/leaves',
    moduleCode: 'leave',
    children: [
      { text: '我的请假', icon: <LeaveIcon />, path: '/leaves/balance', moduleCode: 'leave-balance' },
      { text: '请假申请', icon: <PersonIcon />, path: '/leaves/apply', moduleCode: 'leave-apply' },
      { text: '请假审批', icon: <ApprovalIcon />, path: '/leaves/approval', moduleCode: 'leave-approval' },
    ],
  },
  {
    text: '薪资管理',
    icon: <SalaryIcon />,
    basePath: '/salary',
    moduleCode: 'payroll',
    children: [
      { text: '工资台账', icon: <SalaryIcon />, path: '/payroll', moduleCode: 'payroll-manage' },
      { text: '薪资计算', icon: <CalcIcon />, path: '/payroll/calc', moduleCode: 'payroll-calc' },
    ],
  },
  { text: '合同管理', icon: <ContractIcon />, path: '/contracts', moduleCode: 'contracts' },
  { text: '绩效管理', icon: <PerformanceIcon />, path: '/performance', moduleCode: 'performance' },
  { text: '培训管理', icon: <TrainingIcon />, path: '/training', moduleCode: 'training' },
  { text: '招聘管理', icon: <RecruitmentIcon />, path: '/recruitment', moduleCode: 'recruitment' },
  { text: '报表中心', icon: <ReportIcon />, path: '/reports', moduleCode: 'reports' },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const [anchorEl, setAnchorEl] = useState(null);

  // 按权限过滤菜单
  const menuItems = ALL_MENU_ITEMS.filter((item) => {
    if (!hasModule(user, item.moduleCode)) return false;
    // 过滤子菜单
    if (item.children) {
      item.children = item.children.filter((child) => hasModule(user, child.moduleCode));
      return item.children.length > 0;
    }
    return true;
  });

  // 追踪展开的子菜单
  const [expandedMenus, setExpandedMenus] = useState(() => {
    const expanded = {};
    menuItems.forEach((item) => {
      if (item.children && location.pathname.startsWith(item.basePath)) {
        expanded[item.basePath] = true;
      }
    });
    return expanded;
  });

  const isActive = (path) => location.pathname === path;

  const toggleMenu = (basePath) => {
    setExpandedMenus((prev) => ({ ...prev, [basePath]: !prev[basePath] }));
  };

  const isParentActive = (item) => {
    if (item.children) {
      return item.children.some((child) => location.pathname === child.path || location.pathname.startsWith(child.path));
    }
    return false;
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Drawer
        variant="persistent"
        open={sidebarOpen}
        sx={{
          width: sidebarOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar>
          <Typography variant="h6" fontWeight="bold" color="primary" sx={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            人力资源管理系统
          </Typography>
        </Toolbar>
        <Divider />
        <List sx={{ px: 1 }}>
          {menuItems.map((item) => {
            // 有子菜单的项目
            if (item.children) {
              const active = isParentActive(item);
              const expanded = expandedMenus[item.basePath];
              return (
                <Box key={item.basePath}>
                  <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      selected={active && !expanded}
                      onClick={() => toggleMenu(item.basePath)}
                      sx={{
                        borderRadius: 2,
                        '&.Mui-selected': {
                          bgcolor: 'primary.light',
                          color: 'primary.dark',
                          '& .MuiListItemIcon-root': { color: 'primary.dark' },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                      {expanded ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                  </ListItem>
                  <Collapse in={expanded} timeout="auto" unmountOnExit={false}>
                    <List sx={{ pl: 2 }}>
                      {item.children.map((child) => (
                        <ListItem key={child.path} disablePadding sx={{ mb: 0.5 }}>
                          <ListItemButton
                            selected={location.pathname === child.path}
                            onClick={() => navigate(child.path)}
                            sx={{
                              borderRadius: 2,
                              '&.Mui-selected': {
                                bgcolor: 'primary.main',
                                color: 'white',
                                '& .MuiListItemIcon-root': { color: 'white' },
                              },
                              '&.Mui-selected:hover': {
                                bgcolor: 'primary.dark',
                              },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>{child.icon}</ListItemIcon>
                            <ListItemText primary={child.text} primaryTypographyProps={{ fontSize: 14 }} />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </Box>
              );
            }

            // 没有子菜单的项目
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={isActive(item.path)}
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'white',
                      '& .MuiListItemIcon-root': { color: 'white' },
                    },
                    '&.Mui-selected:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            );
          })}

          {/* 分隔线 + 权限管理跳转 Portal（需 settings 权限） */}
          <Divider sx={{ my: 1 }} />
          {hasModule(user, 'settings') && (
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  window.location.href = window.location.origin + '/admin/access/users';
                }}
                sx={{
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'grey.100' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}><SecurityIcon /></ListItemIcon>
                <ListItemText primary="权限管理" primaryTypographyProps={{ fontSize: 14, color: 'text.secondary' }} />
              </ListItemButton>
            </ListItem>
          )}
        </List>
      </Drawer>

      {/* Main content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid #e0e0e0' }}>
          <Toolbar>
            <IconButton edge="start" onClick={toggleSidebar} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                {user?.employee?.name?.[0] || 'U'}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem disabled>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                {user?.employee?.name || user?.email}
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { logout(); navigate('/login'); }}>
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                退出登录
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, p: 3, bgcolor: '#f5f5f5', height: 'calc(100vh - 64px)', overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
