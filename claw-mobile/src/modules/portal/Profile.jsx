import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItemButton, ListItemText, ListItemIcon, Avatar, Divider, Switch, Alert } from '@mui/material';
import { Logout, Notifications, AccountTree, Fingerprint, Info } from '@mui/icons-material';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import {
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  checkBiometricAvailable,
  isNativePlatform,
} from '../../shared/biometric';

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  useEffect(() => {
    isBiometricEnabled().then(setBioEnabled);
    // 延迟检查，确保 Capacitor 插件已完全初始化
    setTimeout(async () => {
      try {
        const available = await checkBiometricAvailable();
        console.log('[Profile] 生物认证可用:', available);
        setBioAvailable(available);
      } catch (e) {
        console.warn('[Profile] 生物认证检查失败:', e);
        setBioAvailable(false);
      }
    }, 500);
  }, []);

  const handleBioToggle = async (e) => {
    const checked = e.target.checked;
    setBioLoading(true);
    try {
      if (checked) {
        const username = user?.employee?.employeeNo || user?.email || '';
        if (!username) { setSnackbar('无法获取用户信息'); setBioLoading(false); return; }
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
        {isNativePlatform() && bioAvailable && (
          <ListItemButton onClick={() => {}} sx={{ cursor: 'default' }}>
            <ListItemIcon><Fingerprint /></ListItemIcon>
            <ListItemText primary="指纹/面容登录" secondary={bioLoading ? '设置中...' : (bioEnabled ? '已启用' : '已关闭')} />
            <Switch checked={bioEnabled} onChange={handleBioToggle} disabled={bioLoading} />
          </ListItemButton>
        )}

        {isNativePlatform() && !bioAvailable && (
          <ListItemButton>
            <ListItemIcon><Info /></ListItemIcon>
            <ListItemText primary="指纹/面容登录" secondary="当前设备不支持或未设置" />
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
