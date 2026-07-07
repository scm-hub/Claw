import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Settings,
  PeopleAlt,
  Group,
  Logout,
  Menu as MenuIcon,
  Spa,
  ReceiptLong,
  VpnKey,
  ExpandLess,
  ExpandMore,
  Person,
  Shield,
  Checklist,
  AccountTree,
  DoneAll,
  HowToReg,
  PhoneAndroid,
} from '@mui/icons-material';
import useAuthStore from '../store/auth';

const drawerWidth = 220;

export default function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPortalModule, isAdmin } = useAuthStore();

  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // 审批工作台子菜单是否展开
  const workflowPaths = ['/workflow/pending', '/workflow/my-flows', '/workflow/done'];
  const [workflowOpen, setWorkflowOpen] = useState(
    workflowPaths.some((p) => location.pathname.startsWith(p))
  );

  // 权限管理子菜单是否展开（根据当前路径自动展开）
  const accessPaths = ['/admin/access/users', '/admin/access/roles'];
  const [accessOpen, setAccessOpen] = useState(
    accessPaths.some((p) => location.pathname.startsWith(p))
  );

  const handleNavigate = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const toggleAccess = () => setAccessOpen((prev) => !prev);
  const toggleWorkflow = () => setWorkflowOpen((prev) => !prev);

  const handleMenu = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // 判断当前是否在权限管理子页面
  const isAccessActive = accessPaths.some((p) => location.pathname.startsWith(p));
  const isWorkflowActive = workflowPaths.some((p) => location.pathname.startsWith(p)) || location.pathname === '/workflow/templates';

  const renderListItem = (item) => (
    <ListItem
      button
      key={item.path}
      onClick={() => handleNavigate(item.path)}
      sx={{
        mx: 1,
        borderRadius: 2,
        mb: 0.5,
        bgcolor: isActive(item.path) ? 'primary.main' : 'transparent',
        color: isActive(item.path) ? 'white' : 'inherit',
        '&:hover': {
          bgcolor: isActive(item.path) ? 'primary.dark' : 'action.hover',
        },
      }}
    >
      <ListItemIcon sx={{ color: isActive(item.path) ? 'white' : 'inherit' }}>
        {item.icon}
      </ListItemIcon>
      <ListItemText primary={item.text} />
    </ListItem>
  );

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Spa sx={{ color: 'primary.main' }} />
        <Typography variant="subtitle1" fontWeight={700} noWrap>
          鲜当家平台
        </Typography>
      </Box>
      <Divider />
      <List sx={{ flex: 1, pt: 1 }}>
        {/* 工作台 — 所有用户默认可见 */}
        {renderListItem({ text: '工作台', icon: <DashboardIcon />, path: '/' })}

        {/* 审批工作台 — 可展开分组 */}
        <ListItem
          button
          onClick={toggleWorkflow}
          sx={{
            mx: 1,
            borderRadius: 2,
            mb: 0.5,
            bgcolor: isWorkflowActive ? 'action.selected' : 'transparent',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <ListItemIcon sx={{ color: isWorkflowActive ? 'primary.main' : 'inherit' }}>
            <Checklist />
          </ListItemIcon>
          <ListItemText
            primary="审批工作台"
            primaryTypographyProps={{
              fontWeight: isWorkflowActive ? 600 : 400,
              color: isWorkflowActive ? 'primary.main' : 'inherit',
            }}
          />
          {workflowOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={workflowOpen} timeout="auto" unmountOnExit>
          <List disablePadding>
            <ListItem
              button
              onClick={() => handleNavigate('/workflow/pending')}
              sx={{
                mx: 1, borderRadius: 2, mb: 0.5, pl: 4,
                bgcolor: isActive('/workflow/pending') ? 'primary.main' : 'transparent',
                color: isActive('/workflow/pending') ? 'white' : 'inherit',
                '&:hover': { bgcolor: isActive('/workflow/pending') ? 'primary.dark' : 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ color: isActive('/workflow/pending') ? 'white' : 'inherit', minWidth: 36 }}>
                <HowToReg fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="待我审批" primaryTypographyProps={{ fontSize: 14 }} />
            </ListItem>
            <ListItem
              button
              onClick={() => handleNavigate('/workflow/my-flows')}
              sx={{
                mx: 1, borderRadius: 2, mb: 0.5, pl: 4,
                bgcolor: isActive('/workflow/my-flows') ? 'primary.main' : 'transparent',
                color: isActive('/workflow/my-flows') ? 'white' : 'inherit',
                '&:hover': { bgcolor: isActive('/workflow/my-flows') ? 'primary.dark' : 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ color: isActive('/workflow/my-flows') ? 'white' : 'inherit', minWidth: 36 }}>
                <AccountTree fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="我发起的" primaryTypographyProps={{ fontSize: 14 }} />
            </ListItem>
            <ListItem
              button
              onClick={() => handleNavigate('/workflow/done')}
              sx={{
                mx: 1, borderRadius: 2, mb: 0.5, pl: 4,
                bgcolor: isActive('/workflow/done') ? 'primary.main' : 'transparent',
                color: isActive('/workflow/done') ? 'white' : 'inherit',
                '&:hover': { bgcolor: isActive('/workflow/done') ? 'primary.dark' : 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ color: isActive('/workflow/done') ? 'white' : 'inherit', minWidth: 36 }}>
                <DoneAll fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="已处理的" primaryTypographyProps={{ fontSize: 14 }} />
            </ListItem>
          </List>
        </Collapse>

        {/* 系统管理 */}
        {hasPortalModule('systems') && renderListItem({ text: '系统管理', icon: <Settings />, path: '/admin/systems' })}

        {/* 权限管理 — 可展开分组 */}
        {hasPortalModule('access') && (
          <ListItem
            button
            onClick={toggleAccess}
            sx={{
              mx: 1,
              borderRadius: 2,
              mb: 0.5,
              bgcolor: isAccessActive ? 'action.selected' : 'transparent',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemIcon sx={{ color: isAccessActive ? 'primary.main' : 'inherit' }}>
              <Shield />
            </ListItemIcon>
            <ListItemText
              primary="权限管理"
              primaryTypographyProps={{
                fontWeight: isAccessActive ? 600 : 400,
                color: isAccessActive ? 'primary.main' : 'inherit',
              }}
            />
            {accessOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
        )}
        {hasPortalModule('access') && (
          <Collapse in={accessOpen} timeout="auto" unmountOnExit>
            <List disablePadding>
              <ListItem
                button
                onClick={() => handleNavigate('/admin/access/users')}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  mb: 0.5,
                  pl: 4,
                  bgcolor: isActive('/admin/access/users') ? 'primary.main' : 'transparent',
                  color: isActive('/admin/access/users') ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: isActive('/admin/access/users') ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ color: isActive('/admin/access/users') ? 'white' : 'inherit', minWidth: 36 }}>
                  <Person fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="用户管理" primaryTypographyProps={{ fontSize: 14 }} />
              </ListItem>
              <ListItem
                button
                onClick={() => handleNavigate('/admin/access/roles')}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  mb: 0.5,
                  pl: 4,
                  bgcolor: isActive('/admin/access/roles') ? 'primary.main' : 'transparent',
                  color: isActive('/admin/access/roles') ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: isActive('/admin/access/roles') ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ color: isActive('/admin/access/roles') ? 'white' : 'inherit', minWidth: 36 }}>
                  <Group fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="角色管理" primaryTypographyProps={{ fontSize: 14 }} />
              </ListItem>
            </List>
          </Collapse>
        )}

        {/* 操作日志 */}
        {hasPortalModule('logs') && renderListItem({ text: '操作日志', icon: <ReceiptLong />, path: '/admin/logs' })}

        {/* 流程模板管理 — 管理员 */}
        {isAdmin() && renderListItem({ text: '流程管理', icon: <AccountTree />, path: '/workflow/templates' })}
        {/* 移动端布局配置 — 管理员 */}
        {isAdmin() && renderListItem({ text: '移动端布局', icon: <PhoneAndroid />, path: '/admin/mobile-layout' })}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          v1.1.0 · SSO 统一认证
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* 主内容区 */}
      <Box sx={{ flexGrow: 1, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar>
            <IconButton
              sx={{ display: { md: 'none' }, mr: 1 }}
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, color: 'text.primary' }}>
              杭州鲜当家全品类食用菌综合管理平台
            </Typography>
            <Tooltip title={user?.name || user?.email || '用户'}>
              <IconButton onClick={handleMenu} sx={{ p: 0 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                  {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              sx={{ mt: 1.5 }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2">{user?.name || '用户'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
                {user?.departmentName && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {user.departmentName}
                  </Typography>
                )}
              </Box>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <Logout fontSize="small" sx={{ mr: 1 }} /> 退出登录
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
