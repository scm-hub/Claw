import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItemButton, ListItemText, ListItemIcon, Avatar, Divider, Switch, Alert } from '@mui/material';
import { Logout, AccountTree, Fingerprint } from '@mui/icons-material';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import {
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  authenticateWithBiometric,
  isNativePlatform,
} from '../../shared/biometric';

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  useEffect(() => {
    isBiometricEnabled().then(setBioEnabled);
  }, []);

  const handleBioToggle = async (e) => {
    const checked = e.target.checked;
    setBioLoading(true);
    try {
      if (checked) {
        // 调用系统生物认证验证身份
        const authSuccess = await authenticateWithBiometric();
        if (!authSuccess) {
          setSnackbar('验证未通过或已取消，未开启');
          setBioLoading(false);
          return;
        }
        const username = user?.employee?.employeeNo || user?.email || '';
        await enableBiometric(username);
        setBioEnabled(true);
        setSnackbar('指纹/面容登录已启用');
      } else {
        await disableBiometric();
        setBioEnabled(false);
        setSnackbar('已关闭');
      }
    } catch (err) {
      setSnackbar('操作失败: ' + err.message);
    }
    setBioLoading(false);
    setTimeout(() => setSnackbar(''), 3000);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Avatar sx={{ width: 56, height: 56, mr: 2, bgcolor: 'primary.main' }}>
          {(user?.employee?.name || user?.email || '?')[0]}
        </Avatar>
        <Box>
          <Typography variant="h6">{user?.employee?.name || user?.email}</Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.employee?.departmentName || ''} · {user?.employee?.positionTitle || ''}
          </Typography>
        </Box>
      </Box>

      {snackbar && <Alert severity={snackbar.includes('失败') ? 'error' : 'success'} sx={{ mb: 2 }}>{snackbar}</Alert>}

      <Divider />
      <List>
        <ListItemButton onClick={() => navigate('/scm/approval-center')}>
          <ListItemIcon><AccountTree /></ListItemIcon>
          <ListItemText primary="审批中心" secondary="待审批 / 已审批" />
        </ListItemButton>

        {/* 生物认证开关 — 仅原生 App 可用 */}
        {isNativePlatform() && (
          <ListItemButton onClick={() => {}} sx={{ cursor: 'default' }}>
            <ListItemIcon><Fingerprint /></ListItemIcon>
            <ListItemText
              primary="指纹/面容登录"
              secondary={bioLoading ? '设置中...' : (bioEnabled ? '已启用（登录时可用指纹）' : '开启后可用指纹快速登录')}
            />
            <Switch checked={bioEnabled} onChange={handleBioToggle} disabled={bioLoading} />
          </ListItemButton>
        )}
      </List>

      <Divider sx={{ mt: 2 }} />
      <List>
        <ListItemButton onClick={() => { logout(); navigate('/mobile/login'); }}>
          <ListItemIcon><Logout color="error" /></ListItemIcon>
          <ListItemText primary="退出登录" primaryTypographyProps={{ color: 'error' }} />
        </ListItemButton>
      </List>
    </Box>
  );
}
