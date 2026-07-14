import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, Chip, Snackbar, Alert, List, ListItem, ListItemText,
  ListItemIcon, Divider, Stack, Card, CardContent, CardActions,
  Switch, FormControlLabel, Tooltip, Avatar, Badge, Grid,
} from '@mui/material';
import {
  Add, Delete, Edit, Save, PhoneAndroid, Dashboard, ShoppingCart,
  TrendingUp, AccountBalanceWallet, Assignment, QrCodeScanner,
  Settings, Warning, Inventory, DragIndicator, ArrowUpward, ArrowDownward,
  Visibility, RestartAlt,
  Home, QrCode, Person, ListAlt, LocalShipping, Print, Approval,
  History, BarChart, Search, CheckCircle, CloudUpload, Download,
} from '@mui/icons-material';
import axios from 'axios';
import api from '../../api';

// SCM 跨系统 API 调用（不走 Portal 的 /api baseURL，直接走网关 /scm 路由）
const scmApi = axios.create({
  baseURL: '',
  timeout: 15000,
});
scmApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('sso_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
scmApi.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error.response?.data || error)
);

const PRESET_ICONS = [
  'Dashboard', 'Home', 'Inventory', 'ShoppingCart', 'TrendingUp',
  'AccountBalanceWallet', 'Assignment', 'QrCodeScanner', 'QrCode',
  'Settings', 'Warning', 'Person', 'ListAlt', 'LocalShipping',
  'Print', 'Approval', 'History', 'BarChart', 'Search',
  'Add', 'Edit', 'CheckCircle', 'CloudUpload', 'Download',
];

const PRESET_ROUTES = [
  { path: '/', label: '首页（仪表盘）' },
  { path: '/inventory', label: '实时库存' },
  { path: '/sales-orders', label: '销售订单' },
  { path: '/sales-plans', label: '销售计划' },
  { path: '/receivables', label: '应收账款' },
  { path: '/purchase-orders', label: '采购订单' },
  { path: '/payables', label: '应付账款' },
  { path: '/scan-inbound', label: '扫码入库' },
  { path: '/stock-take', label: '盘点管理' },
  { path: '/approval-center', label: '审批中心' },
  { path: '/shipping', label: '发货管理' },
  { path: '/settings', label: '个人设置' },
];

const ICON_MAP = {
  Dashboard: <Dashboard />,
  ShoppingCart: <ShoppingCart />,
  TrendingUp: <TrendingUp />,
  AccountBalanceWallet: <AccountBalanceWallet />,
  Assignment: <Assignment />,
  QrCodeScanner: <QrCodeScanner />,
  Settings: <Settings />,
  Warning: <Warning />,
  Inventory: <Inventory />,
  Home: <Home />,
  QrCode: <QrCode />,
  Person: <Person />,
  ListAlt: <ListAlt />,
  LocalShipping: <LocalShipping />,
  Print: <Print />,
  Approval: <Approval />,
  History: <History />,
  BarChart: <BarChart />,
  Search: <Search />,
  Add: <Add />,
  Edit: <Edit />,
  CheckCircle: <CheckCircle />,
  CloudUpload: <CloudUpload />,
  Download: <Download />,
};

// 颜色选项
const COLOR_OPTIONS = [
  '#1976d2', '#9c27b0', '#2e7d32', '#ed6c02', '#d32f2f',
  '#f44336', '#00796b', '#5c6bc0', '#e65100', '#37474f',
];

export default function MobileLayoutConfig() {
  const [configs, setConfigs] = useState([]);
  const [roleList, setRoleList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // 编辑态数据
  const [navItems, setNavItems] = useState([]);
  const [dashboardCards, setDashboardCards] = useState([]);
  const [quickActions, setQuickActions] = useState([]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // 加载 Portal 角色列表
  const fetchRoles = useCallback(async () => {
    try {
      const resp = await api.get('/roles');
      if (resp.success && resp.data?.length > 0) {
        setRoleList(resp.data);
        if (!selectedGroup) setSelectedGroup(resp.data[0].name);
      }
    } catch (err) {
      showSnackbar('加载角色列表失败', 'error');
    }
  }, [selectedGroup]);

  // 加载所有配置
  const fetchConfigs = useCallback(async () => {
    try {
      const resp = await scmApi.get('/scm/api/mobile-layout/configs');
      if (resp.success) setConfigs(resp.data);
    } catch (err) {
      showSnackbar('加载配置列表失败', 'error');
    }
  }, []);

  // 加载指定角色组配置
  const fetchConfig = useCallback(async (roleGroup) => {
    try {
      const resp = await scmApi.get(`/scm/api/mobile-layout/config?roleGroup=${encodeURIComponent(roleGroup)}`);
      if (resp.success) {
        setNavItems(resp.data.navItems || []);
        setDashboardCards(resp.data.dashboardCards || []);
        setQuickActions(resp.data.quickActions || []);
      }
    } catch (err) {
      showSnackbar('加载配置失败', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    if (!selectedGroup) return;
    fetchConfigs();
    fetchConfig(selectedGroup);
  }, [fetchConfigs, fetchConfig, selectedGroup]);

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    try {
      const resp = await scmApi.put(`/scm/api/mobile-layout/config/${encodeURIComponent(selectedGroup)}`, {
        navItems,
        dashboardCards,
        quickActions: quickActions.length > 0 ? quickActions : null,
      });
      if (resp.success) {
        showSnackbar(`${selectedGroup} 配置已保存`);
        fetchConfigs(); // 刷新列表
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 恢复默认
  const handleReset = async () => {
    if (!confirm(`确定恢复 ${selectedGroup} 的默认配置吗？`)) return;
    try {
      const resp = await scmApi.post(`/scm/api/mobile-layout/config/${encodeURIComponent(selectedGroup)}/reset`);
      if (resp.success) {
        setNavItems(resp.data.navItems);
        setDashboardCards(resp.data.dashboardCards);
        setQuickActions(resp.data.quickActions);
        showSnackbar('已恢复默认配置');
      }
    } catch (err) {
      showSnackbar('恢复失败', 'error');
    }
  };

  // ===== 导航项操作 =====
  const addNavItem = () => {
    if (navItems.length >= 5) return showSnackbar('最多5个导航项', 'warning');
    setNavItems([...navItems, { path: '/', label: '新页面', icon: 'Dashboard', sortOrder: navItems.length + 1 }]);
  };

  const updateNavItem = (idx, field, value) => {
    const updated = [...navItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setNavItems(updated);
  };

  const removeNavItem = (idx) => {
    setNavItems(navItems.filter((_, i) => i !== idx).map((item, i) => ({ ...item, sortOrder: i + 1 })));
  };

  const moveNavItem = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= navItems.length) return;
    const updated = [...navItems];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    updated.forEach((item, i) => { item.sortOrder = i + 1; });
    setNavItems(updated);
  };

  // ===== 仪表盘卡片操作 =====
  const addCard = () => {
    setDashboardCards([...dashboardCards, {
      label: '新卡片', key: `card${dashboardCards.length + 1}`, icon: 'Dashboard',
      color: COLOR_OPTIONS[dashboardCards.length % COLOR_OPTIONS.length],
      path: '/', sortOrder: dashboardCards.length + 1,
    }]);
  };

  const updateCard = (idx, field, value) => {
    const updated = [...dashboardCards];
    updated[idx] = { ...updated[idx], [field]: value };
    setDashboardCards(updated);
  };

  const removeCard = (idx) => {
    setDashboardCards(dashboardCards.filter((_, i) => i !== idx).map((item, i) => ({ ...item, sortOrder: i + 1 })));
  };

  const moveCard = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= dashboardCards.length) return;
    const updated = [...dashboardCards];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    updated.forEach((item, i) => { item.sortOrder = i + 1; });
    setDashboardCards(updated);
  };

  // ===== 快捷操作操作 =====
  const addAction = () => {
    setQuickActions([...quickActions, {
      label: '新操作', icon: 'Add', path: '/', color: 'primary.main', sortOrder: quickActions.length + 1,
    }]);
  };

  const updateAction = (idx, field, value) => {
    const updated = [...quickActions];
    updated[idx] = { ...updated[idx], [field]: value };
    setQuickActions(updated);
  };

  const removeAction = (idx) => {
    setQuickActions(quickActions.filter((_, i) => i !== idx).map((item, i) => ({ ...item, sortOrder: i + 1 })));
  };

  const moveAction = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= quickActions.length) return;
    const updated = [...quickActions];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    updated.forEach((item, i) => { item.sortOrder = i + 1; });
    setQuickActions(updated);
  };

  // 渲染图标
  const renderIcon = (iconName) => ICON_MAP[iconName] || <Dashboard />;

  if (loading) return <Typography>加载中...</Typography>;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <PhoneAndroid sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5">移动端布局配置</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RestartAlt />} onClick={handleReset}>
            恢复默认
          </Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存配置'}
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        {/* 左侧：角色组选择 + 配置编辑 */}
        <Grid item xs={12} md={8}>
          {/* 角色组选择 */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>选择角色组</InputLabel>
                <Select
                  value={selectedGroup}
                  label="选择角色组"
                  onChange={(e) => { setLoading(true); setSelectedGroup(e.target.value); }}
                >
                  {roleList.map((role) => (
                    <MenuItem key={role.id} value={role.name}>{role.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Chip label={selectedGroup} color="primary" />
              <Typography variant="body2" color="text.secondary">
                配置后将应用于所有归属该角色组的用户
              </Typography>
            </Stack>
          </Paper>

          {/* 底部导航配置 */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">底部导航栏（最多5个）</Typography>
              <Button size="small" startIcon={<Add />} onClick={addNavItem} disabled={navItems.length >= 5}>
                添加
              </Button>
            </Stack>
            {navItems.map((item, idx) => (
              <Card key={idx} variant="outlined" sx={{ mb: 1, p: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <DragIndicator sx={{ color: 'text.disabled', cursor: 'grab' }} />
                  <IconButton size="small" onClick={() => moveNavItem(idx, -1)} disabled={idx === 0}>
                    <ArrowUpward fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => moveNavItem(idx, 1)} disabled={idx === navItems.length - 1}>
                    <ArrowDownward fontSize="small" />
                  </IconButton>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {renderIcon(item.icon)}
                    <TextField size="small" label="标签" value={item.label} onChange={(e) => updateNavItem(idx, 'label', e.target.value)} sx={{ width: 120 }} />
                    <FormControl size="small" sx={{ width: 140 }}>
                      <InputLabel>页面路由</InputLabel>
                      <Select value={item.path} label="页面路由" onChange={(e) => updateNavItem(idx, 'path', e.target.value)}>
                        {PRESET_ROUTES.map((r) => (
                          <MenuItem key={r.path} value={r.path}>{r.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 140 }}>
                      <InputLabel>图标</InputLabel>
                      <Select value={item.icon} label="图标" onChange={(e) => updateNavItem(idx, 'icon', e.target.value)}>
                        {PRESET_ICONS.map((icon) => (
                          <MenuItem key={icon} value={icon}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              {ICON_MAP[icon] || <Dashboard />}
                              <span>{icon}</span>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => removeNavItem(idx)}>
                    <Delete />
                  </IconButton>
                </Stack>
              </Card>
            ))}
            {navItems.length === 0 && <Typography color="text.secondary">暂无导航项，点击"添加"新增</Typography>}
          </Paper>

          {/* 仪表盘卡片配置 */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">首页仪表盘卡片</Typography>
              <Button size="small" startIcon={<Add />} onClick={addCard}>
                添加卡片
              </Button>
            </Stack>
            {dashboardCards.map((card, idx) => (
              <Card key={idx} variant="outlined" sx={{ mb: 1, p: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <DragIndicator sx={{ color: 'text.disabled' }} />
                  <IconButton size="small" onClick={() => moveCard(idx, -1)} disabled={idx === 0}>
                    <ArrowUpward fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => moveCard(idx, 1)} disabled={idx === dashboardCards.length - 1}>
                    <ArrowDownward fontSize="small" />
                  </IconButton>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {renderIcon(card.icon)}
                    <TextField size="small" label="卡片标题" value={card.label} onChange={(e) => updateCard(idx, 'label', e.target.value)} sx={{ width: 120 }} />
                    <FormControl size="small" sx={{ width: 120 }}>
                      <InputLabel>图标</InputLabel>
                      <Select value={card.icon} label="图标" onChange={(e) => updateCard(idx, 'icon', e.target.value)}>
                        {PRESET_ICONS.map((icon) => (
                          <MenuItem key={icon} value={icon}>{icon}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 120 }}>
                      <InputLabel>颜色</InputLabel>
                      <Select value={card.color} label="颜色" onChange={(e) => updateCard(idx, 'color', e.target.value)}>
                        {COLOR_OPTIONS.map((c) => (
                          <MenuItem key={c} value={c}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: c }} />
                              <span>{c}</span>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 140 }}>
                      <InputLabel>点击跳转</InputLabel>
                      <Select value={card.path} label="点击跳转" onChange={(e) => updateCard(idx, 'path', e.target.value)}>
                        {PRESET_ROUTES.map((r) => (
                          <MenuItem key={r.path} value={r.path}>{r.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => removeCard(idx)}>
                    <Delete />
                  </IconButton>
                </Stack>
              </Card>
            ))}
          </Paper>

          {/* 快捷操作配置 */}
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">首页快捷操作</Typography>
              <Button size="small" startIcon={<Add />} onClick={addAction}>
                添加操作
              </Button>
            </Stack>
            {quickActions.map((action, idx) => (
              <Card key={idx} variant="outlined" sx={{ mb: 1, p: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <DragIndicator sx={{ color: 'text.disabled' }} />
                  <IconButton size="small" onClick={() => moveAction(idx, -1)} disabled={idx === 0}>
                    <ArrowUpward fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => moveAction(idx, 1)} disabled={idx === quickActions.length - 1}>
                    <ArrowDownward fontSize="small" />
                  </IconButton>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {renderIcon(action.icon)}
                    <TextField size="small" label="操作名称" value={action.label} onChange={(e) => updateAction(idx, 'label', e.target.value)} sx={{ width: 120 }} />
                    <FormControl size="small" sx={{ width: 140 }}>
                      <InputLabel>页面路由</InputLabel>
                      <Select value={action.path} label="页面路由" onChange={(e) => updateAction(idx, 'path', e.target.value)}>
                        {PRESET_ROUTES.map((r) => (
                          <MenuItem key={r.path} value={r.path}>{r.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 140 }}>
                      <InputLabel>图标</InputLabel>
                      <Select value={action.icon} label="图标" onChange={(e) => updateAction(idx, 'icon', e.target.value)}>
                        {PRESET_ICONS.map((icon) => (
                          <MenuItem key={icon} value={icon}>{icon}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => removeAction(idx)}>
                    <Delete />
                  </IconButton>
                </Stack>
              </Card>
            ))}
          </Paper>
        </Grid>

        {/* 右侧：实时预览 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, position: 'sticky', top: 80 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <Visibility sx={{ color: 'primary.main' }} />
              <Typography variant="h6">实时预览</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" mb={2} display="block">
              {selectedGroup} 视角
            </Typography>

            {/* 手机模拟器 */}
            <Box sx={{
              width: '100%', maxWidth: 320, mx: 'auto',
              border: '2px solid', borderColor: 'grey.300', borderRadius: 3,
              overflow: 'hidden', bgcolor: '#f5f5f5',
            }}>
              {/* 模拟状态栏 */}
              <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption">9:41</Typography>
                <Stack direction="row" spacing={0.5}>
                  <Typography variant="caption">📶</Typography>
                  <Typography variant="caption">🔋</Typography>
                </Stack>
              </Box>

              {/* 模拟顶栏 */}
              <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 1 }}>
                <Typography variant="subtitle2">鲜当家SCM</Typography>
                <Typography variant="caption">{selectedGroup}视图</Typography>
              </Box>

              {/* 模拟仪表盘卡片 */}
              <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {dashboardCards.map((card, idx) => (
                  <Box key={idx} sx={{
                    bgcolor: 'white', borderRadius: 2, p: 1.5,
                    borderLeft: 3, borderColor: card.color,
                  }}>
                    <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                    <Typography variant="h6" sx={{ color: card.color, fontSize: '1rem' }}>--</Typography>
                  </Box>
                ))}
              </Box>

              {/* 模拟快捷操作 */}
              {quickActions.length > 0 && (
                <Box sx={{ px: 1.5, pb: 1 }}>
                  <Typography variant="caption" color="text.secondary">快捷操作</Typography>
                  <Stack direction="row" spacing={1} mt={0.5}>
                    {quickActions.map((action, idx) => (
                      <Box key={idx} sx={{ textAlign: 'center', flex: 1 }}>
                        <Avatar sx={{ bgcolor: action.color?.replace('main', 'light'), width: 36, height: 36, mx: 'auto', mb: 0.5 }}>
                          {renderIcon(action.icon)}
                        </Avatar>
                        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>{action.label}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* 模拟底部导航 */}
              <Box sx={{
                display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                bgcolor: 'white', borderTop: 1, borderColor: 'grey.200',
                px: 1, py: 0.8,
              }}>
                {navItems.map((item, idx) => (
                  <Box key={idx} sx={{ textAlign: 'center', flex: 1 }}>
                    <Box sx={{ color: idx === 0 ? 'primary.main' : 'grey.400', fontSize: '1.2rem' }}>
                      {renderIcon(item.icon)}
                    </Box>
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', color: idx === 0 ? 'primary.main' : 'grey.400' }}>
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 配置列表（所有角色组）*/}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" mb={2}>所有角色组配置状态</Typography>
        <Grid container spacing={2}>
          {configs.map((c) => (
            <Grid item xs={6} sm={4} md={3} key={c.roleGroup}>
              <Card variant="outlined" sx={{
                cursor: 'pointer',
                borderColor: c.roleGroup === selectedGroup ? 'primary.main' : 'grey.200',
                borderWidth: c.roleGroup === selectedGroup ? 2 : 1,
              }} onClick={() => { setLoading(true); setSelectedGroup(c.roleGroup); }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle2">{c.roleGroupName}</Typography>
                  <Stack direction="row" spacing={2} mt={0.5}>
                    <Chip label={`${c.navItemCount}个导航`} size="small" />
                    <Chip label={`${c.cardCount}个卡片`} size="small" />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
