import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Switch, FormControlLabel, Divider,
  List, ListItem, ListItemIcon, ListItemText, CircularProgress, Alert, Button,
} from '@mui/material';
import {
  Fingerprint, Person, Badge, Business, Security, Info, Logout,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  checkBiometricAvailable,
  isNativePlatform,
} from '../lib/biometric';
import { getRoleGroupName } from '../config/navConfig';

// 角色中文映射（与权限管理→角色管理一致）
const ROLE_NAMES = {
  SUPER_ADMIN: '超级管理员',
  WAREHOUSE_MANAGER: '仓库管理员',
  WAREHOUSE_STAFF: '仓库管理员',
  SALES_MANAGER: '销售经理',
  SALES_STAFF: '销售经理',
  PURCHASE_MANAGER: '采购员',
  PURCHASE_STAFF: '采购员',
  FINANCE_MANAGER: '经理',
  FINANCE_STAFF: '经理',
  QUALITY_STAFF: '仓库管理员',
  LOGISTICS_STAFF: '普通员工',
  CONTRACT_MANAGER: '经理',
  HR_ADMIN: 'HR管理员',
  HR: 'HR管理员',
  COST_MANAGER: '经理',
  SALES_REP: '销售经理',
};

export default function Settings() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  useEffect(() => {
    const check = async () => {
      const enabled = await isBiometricEnabled();
      setBioEnabled(enabled);
      const available = await checkBiometricAvailable();
      setBioAvailable(available);
    };
    check();
  }, []);

  const handleBioToggle = async (e) => {
    const checked = e.target.checked;
    setBioLoading(true);
    try {
      if (checked) {
        // 启用生物认证 — 绑定当前用户
        if (!user?.username) {
          setSnackbar('无法获取用户信息');
          setBioLoading(false);
          return;
        }
        await enableBiometric(user.username);
        setBioEnabled(true);
        setSnackbar('生物认证已启用');
      } else {
        await disableBiometric();
        setBioEnabled(false);
        setSnackbar('生物认证已关闭');
      }
    } catch (err) {
      setSnackbar('操作失败: ' + err.message);
    }
    setBioLoading(false);
    setTimeout(() => setSnackbar(''), 3000);
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const userInfo = [
    { icon: <Person />, label: '姓名', value: user?.employee?.name || user?.username || '-' },
    { icon: <Badge />, label: '工号', value: user?.employee?.empNo || '-' },
    { icon: <Business />, label: '部门', value: user?.employee?.department?.name || '-' },
    { icon: <Security />, label: '角色', value: `${ROLE_NAMES[user?.role] || user?.role || '-'} (${getRoleGroupName(user?.role)})` },
  ];

  return (
    <Box sx={{ p: 2 }}>
      {/* 用户信息卡片 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>个人信息</Typography>
          <List dense>
            {userInfo.map((item) => (
              <ListItem key={item.label} sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} secondary={item.value} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* 安全设置 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>安全设置</Typography>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Fingerprint color={bioAvailable ? 'primary' : 'disabled'} />
              <Box>
                <Typography variant="body2">指纹/面容快捷登录</Typography>
                <Typography variant="caption" color="textSecondary">
                  {!isNativePlatform()
                    ? '仅在 App 中可用'
                    : bioAvailable
                    ? bioEnabled ? '已启用' : '未启用'
                    : '当前设备不支持'}
                </Typography>
              </Box>
            </Box>
            {bioLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Switch
                checked={bioEnabled}
                onChange={handleBioToggle}
                disabled={!bioAvailable}
              />
            )}
          </Box>
          {snackbar && <Alert severity="info" sx={{ mt: 1 }}>{snackbar}</Alert>}
        </CardContent>
      </Card>

      {/* 关于 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>关于</Typography>
          <List dense>
            <ListItem sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 36 }}><Info /></ListItemIcon>
              <ListItemText primary="应用版本" secondary={isNativePlatform() ? 'v1.0.0 (Native App)' : 'v1.0.0 (H5)'} />
            </ListItem>
            <ListItem sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 36 }}><Security /></ListItemIcon>
              <ListItemText primary="系统名称" secondary="鲜当家供应链管理系统" />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* 退出登录 */}
      <Button
        fullWidth
        variant="outlined"
        color="error"
        size="large"
        onClick={handleLogout}
        startIcon={<Logout />}
        sx={{ mb: 2 }}
      >
        退出登录
      </Button>
    </Box>
  );
}
