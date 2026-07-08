import React from 'react';
import { Box, Typography, List, ListItemButton, ListItemText, ListItemIcon, Avatar, Divider } from '@mui/material';
import { Logout as LogoutIcon, Notifications as NotifyIcon, AccountTree as WorkflowIcon } from '@mui/icons-material';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Avatar sx={{ width: 56, height: 56, mr: 2 }}>
          {(user?.employee?.name || user?.email || '?')[0]}
        </Avatar>
        <Box>
          <Typography variant="h6">{user?.employee?.name || user?.email}</Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.employee?.departmentName || ''} · {user?.employee?.positionTitle || ''}
          </Typography>
        </Box>
      </Box>

      <Divider />

      <List>
        <ListItemButton onClick={() => navigate('/workflow')}>
          <ListItemIcon><WorkflowIcon /></ListItemIcon>
          <ListItemText primary="工作流待办" secondary="审批 / 我的申请" />
        </ListItemButton>
        <ListItemButton>
          <ListItemIcon><NotifyIcon /></ListItemIcon>
          <ListItemText primary="消息通知" secondary="系统消息和提醒" />
        </ListItemButton>
      </List>

      <Divider sx={{ mt: 2 }} />

      <List>
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon><LogoutIcon color="error" /></ListItemIcon>
          <ListItemText primary="退出登录" primaryTypographyProps={{ color: 'error' }} />
        </ListItemButton>
      </List>
    </Box>
  );
}
