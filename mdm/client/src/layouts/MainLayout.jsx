import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Box, IconButton, Menu, MenuItem, Avatar, Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PeopleIcon from '@mui/icons-material/People';
import SyncHistoryIcon from '@mui/icons-material/SyncAlt';
import HubIcon from '@mui/icons-material/Hub';
import useAuthStore, { hasModule } from '../store/auth';

const drawerWidth = 240;

const menuItems = [
  { text: '仪表盘', path: '/', icon: <DashboardIcon />, module: 'dashboard' },
  { text: '部门主数据', path: '/departments', icon: <AccountTreeIcon />, module: 'master-data-departments' },
  { text: '员工主数据', path: '/employees', icon: <PeopleIcon />, module: 'master-data-employees' },
  { text: '同步日志', path: '/sync-log', icon: <SyncHistoryIcon />, module: 'master-data-sync' },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState(null);

  const visibleMenuItems = menuItems.filter((item) => {
    // 仪表盘对有 MDM 权限的用户始终可见
    if (item.module === 'dashboard') return true;
    return hasModule(user, item.module);
  });

  const handleMenu = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: '#7B1FA2' }}>
        <Toolbar>
          <HubIcon sx={{ mr: 1 }} />
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            鲜当家主数据管理系统
          </Typography>
          <IconButton onClick={handleMenu} color="inherit">
            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, fontSize: 14 }}>
              {user?.name?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
            <MenuItem disabled>
              <Typography variant="body2">{user?.name} ({user?.email})</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>退出登录</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{ width: drawerWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}
      >
        <Toolbar />
        <List>
          {visibleMenuItems.map((item) => (
            <ListItemButton
              key={item.path}
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
              sx={{
                '&.Mui-selected': { bgcolor: 'primary.light', color: 'white', '&:hover': { bgcolor: 'primary.main' } },
                '& .MuiListItemIcon-root': { color: location.pathname === item.path ? 'white' : 'inherit' },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
