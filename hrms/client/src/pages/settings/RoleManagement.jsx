import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, IconButton, Switch,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Alert, CircularProgress,
  Chip, Tooltip, Stack, Divider, Checkbox, FormControlLabel,
  Drawer, Avatar, LinearProgress, InputAdornment,
  Card, CardContent, CardActions,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  AdminPanelSettings as RoleIcon, Security as SecurityIcon,
  ContentCopy as CopyIcon, Visibility as ViewIcon,
  Search as SearchIcon, People as PeopleIcon,
  Close as CloseIcon, Shield as ShieldIcon,
  CheckCircle as CheckIcon, Cancel as BlockIcon,
  ListAlt as ListIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import api from '../../hooks/useFetch';

/* ========= 权限分组定义 ========= */
const PERMISSION_DEFINITIONS = [
  { code: 'dashboard', name: '仪表盘', group: '首页', icon: '📊' },
  { code: 'departments', name: '部门管理', group: '组织', icon: '🏢' },
  { code: 'positions', name: '岗位管理', group: '组织', icon: '💼' },
  { code: 'employees', name: '员工管理', group: '组织', icon: '👥' },
  { code: 'attendance', name: '考勤管理', group: '人事', icon: '🕐' },
  { code: 'leaves', name: '请假管理', group: '人事', icon: '📅' },
  { code: 'salary', name: '薪资管理', group: '人事', icon: '💰' },
  { code: 'contracts', name: '合同管理', group: '人事', icon: '📝' },
  { code: 'performance', name: '绩效管理', group: '人事', icon: '📈' },
  { code: 'training', name: '培训管理', group: '人事', icon: '🎓' },
  { code: 'recruitment', name: '招聘管理', group: '人事', icon: '🤝' },
  { code: 'reports', name: '报表中心', group: '分析', icon: '📋' },
  { code: 'settings_users', name: '用户管理', group: '系统', icon: '⚙️' },
  { code: 'settings_roles', name: '角色管理', group: '系统', icon: '🔒' },
];

const LEVEL_CONFIG = {
  4: { label: '最高权限', color: '#d32f2f', bg: '#ffebee' },
  3: { label: '高级权限', color: '#ed6c02', bg: '#fff3e0' },
  2: { label: '中级权限', color: '#0288d1', bg: '#e1f5fe' },
  1: { label: '基础权限', color: '#2e7d32', bg: '#e8f5e9' },
};

const ROLE_COLORS = ['#d32f2f', '#7b1fa2', '#0288d1', '#2e7d32', '#ed6c02', '#00838f'];

/* ========= 权限选择器组件 ========= */
function PermissionSelector({ permissions, onChange }) {
  const grouped = {};
  PERMISSION_DEFINITIONS.forEach((p) => {
    if (!grouped[p.group]) grouped[p.group] = [];
    grouped[p.group].push(p);
  });

  const togglePermission = (code) => {
    if (permissions.includes(code)) {
      onChange(permissions.filter((p) => p !== code));
    } else {
      onChange([...permissions, code]);
    }
  };

  const toggleGroup = (codes) => {
    const allSelected = codes.every((c) => permissions.includes(c));
    if (allSelected) {
      onChange(permissions.filter((p) => !codes.includes(p)));
    } else {
      onChange([...new Set([...permissions, ...codes])]);
    }
  };

  const selectAll = () => onChange(PERMISSION_DEFINITIONS.map((p) => p.code));
  const clearAll = () => onChange([]);

  const totalPerms = PERMISSION_DEFINITIONS.length;
  const selectedPerms = permissions.length;
  const progress = totalPerms > 0 ? (selectedPerms / totalPerms) * 100 : 0;

  return (
    <Box>
      {/* 进度条和操作按钮 */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              已选择 {selectedPerms} / {totalPerms} 项权限
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {Math.round(progress)}%
            </Typography>
          </Stack>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
        </Box>
        <Button size="small" onClick={selectAll} variant="outlined">全选</Button>
        <Button size="small" onClick={clearAll} variant="outlined" color="inherit">清空</Button>
      </Stack>

      {/* 分组选择 */}
      {Object.entries(grouped).map(([group, items]) => {
        const codes = items.map((i) => i.code);
        const allSelected = codes.every((c) => permissions.includes(c));
        const someSelected = codes.some((c) => permissions.includes(c));
        const selectedCount = codes.filter((c) => permissions.includes(c)).length;

        return (
          <Box key={group} sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={() => toggleGroup(codes)}
                    size="small"
                    color="primary"
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontWeight={500} fontSize={14}>{group}</Typography>
                    <Chip label={`${selectedCount}/${items.length}`} size="small"
                      color={allSelected ? 'primary' : someSelected ? 'default' : 'default'}
                      variant={allSelected ? 'filled' : 'outlined'}
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  </Stack>
                }
              />
            </Stack>
            <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.5, pl: 3 }}>
              {items.map((item) => {
                const checked = permissions.includes(item.code);
                return (
                  <Chip
                    key={item.code}
                    label={item.name}
                    size="small"
                    icon={checked ? <CheckIcon sx={{ fontSize: 14 }} /> : undefined}
                    variant={checked ? 'filled' : 'outlined'}
                    color={checked ? 'primary' : 'default'}
                    onClick={() => togglePermission(item.code)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      ...(checked && { fontWeight: 500 }),
                    }}
                  />
                );
              })}
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}

/* ========= 角色表单弹窗（新建/编辑/复制） ========= */
function RoleFormDialog({ open, editing, mode, onClose, onSave }) {
  const isEdit = mode === 'edit';
  const isDuplicate = mode === 'duplicate';
  const [form, setForm] = useState({
    name: '', code: '', description: '', level: 1, permissions: [], isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && editing) {
      setForm({
        name: isDuplicate ? `${editing.name} (副本)` : (editing.name || ''),
        code: isDuplicate ? `${editing.code}_COPY` : (editing.code || ''),
        description: editing.description || '',
        level: editing.level || 1,
        permissions: [...(editing.permissions || [])],
        isActive: isDuplicate ? true : (editing.isActive !== false),
      });
    } else if (open && !editing) {
      setForm({ name: '', code: '', description: '', level: 1, permissions: [], isActive: true });
    }
    setError('');
  }, [open, editing, isDuplicate]);

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim()) { setError('角色名称不能为空'); return; }
    if (!isEdit && !form.code.trim()) { setError('角色编码不能为空'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description || '',
        level: parseInt(form.level) || 1,
        permissions: form.permissions,
        isActive: form.isActive,
      };
      if (isEdit) {
        delete payload.code;
        await api.put(`/roles/${editing.id}`, payload);
      } else if (isDuplicate) {
        await api.post(`/roles/${editing.id}/duplicate`, payload);
      } else {
        await api.post('/roles', payload);
      }
      onSave();
    } catch (err) {
      setError(err.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  const getTitle = () => {
    if (isDuplicate) return '复制角色';
    if (isEdit) return `编辑角色 - ${editing?.name}`;
    return '新建角色';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          {isDuplicate ? <CopyIcon color="primary" /> : <SecurityIcon color="primary" />}
          {getTitle()}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* 系统角色提示 */}
        {isEdit && editing?.isSystem && (
          <Alert severity="info" sx={{ mb: 2 }}>
            这是系统内置角色，仅允许修改描述和功能权限，不可修改名称、编码和状态。
          </Alert>
        )}

        <Stack direction="row" spacing={2}>
          <TextField
            label="角色名称" margin="dense" required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="如：部门主管"
            disabled={isEdit && editing?.isSystem}
            sx={{ flex: 1 }}
          />
          <TextField
            label="角色编码" margin="dense" required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="如：DEPT_MANAGER"
            disabled={isEdit}
            helperText={isEdit ? '编码不可修改' : '唯一标识，创建后不可修改'}
            sx={{ flex: 1 }}
          />
        </Stack>

        <TextField
          fullWidth label="角色描述" margin="dense" multiline rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="描述该角色的职责和权限范围"
        />

        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <TextField
            select label="权限等级" margin="dense"
            value={form.level}
            onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) })}
            helperText="等级越高，权限越大"
            disabled={isEdit && editing?.isSystem}
            sx={{ flex: 1 }}
          >
            <MenuItem value={4}>4 - 最高权限</MenuItem>
            <MenuItem value={3}>3 - 高级权限</MenuItem>
            <MenuItem value={2}>2 - 中级权限</MenuItem>
            <MenuItem value={1}>1 - 基础权限</MenuItem>
          </TextField>

          {!(isEdit && editing?.isSystem) && (
            <Stack direction="row" alignItems="center" sx={{ flex: 1, pl: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>状态</Typography>
              <Switch
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                color={form.isActive ? 'success' : 'default'}
              />
              <Typography variant="body2">{form.isActive ? '启用' : '停用'}</Typography>
            </Stack>
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />
        <Typography fontWeight={500} sx={{ mb: 1.5 }}>功能权限</Typography>
        <PermissionSelector
          permissions={form.permissions}
          onChange={(perms) => setForm({ ...form, permissions: perms })}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}>
          {isDuplicate ? '复制' : isEdit ? '保存' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========= 角色详情抽屉 ========= */
function RoleDetailDrawer({ open, role, onClose, onEdit }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (open && role) {
      setLoadingUsers(true);
      api.get(`/roles/${role.id}/users`)
        .then((res) => setUsers(res.data || []))
        .catch(() => setUsers([]))
        .finally(() => setLoadingUsers(false));
    }
  }, [open, role]);

  if (!role) return null;

  const levelConf = LEVEL_CONFIG[role.level] || LEVEL_CONFIG[1];
  const groupedPerms = {};
  PERMISSION_DEFINITIONS.forEach((p) => {
    if (role.permissions?.includes(p.code)) {
      if (!groupedPerms[p.group]) groupedPerms[p.group] = [];
      groupedPerms[p.group].push(p);
    }
  });

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: 480, p: 0 } }}>
      {/* 头部 */}
      <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                <ShieldIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={700}>{role.name}</Typography>
                <Chip label={role.code} size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 500 }} />
              </Box>
            </Stack>
            {role.description && (
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>{role.description}</Typography>
            )}
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
        </Stack>
      </Box>

      <Box sx={{ p: 3 }}>
        {/* 基本信息 */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Card variant="outlined" sx={{ flex: 1, textAlign: 'center' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">权限等级</Typography>
              <Typography fontWeight={700} sx={{ color: levelConf.color }}>
                {levelConf.label}
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ flex: 1, textAlign: 'center' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">功能权限</Typography>
              <Typography fontWeight={700}>{role.permissions?.length || 0} 项</Typography>
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ flex: 1, textAlign: 'center' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">关联用户</Typography>
              <Typography fontWeight={700}>{role.userCount || 0} 人</Typography>
            </CardContent>
          </Card>
        </Stack>

        {/* 状态和类型 */}
        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          <Chip
            icon={role.isActive ? <CheckIcon /> : <BlockIcon />}
            label={role.isActive ? '已启用' : '已停用'}
            color={role.isActive ? 'success' : 'default'}
            size="small"
          />
          <Chip
            icon={role.isSystem ? <SecurityIcon /> : <ListIcon />}
            label={role.isSystem ? '系统内置' : '自定义角色'}
            color={role.isSystem ? 'primary' : 'default'}
            variant="outlined"
            size="small"
          />
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* 权限详情 */}
        <Typography fontWeight={500} sx={{ mb: 1.5 }}>功能权限</Typography>
        {Object.entries(groupedPerms).length === 0 ? (
          <Typography color="text.secondary" fontSize={14}>暂无权限</Typography>
        ) : (
          Object.entries(groupedPerms).map(([group, items]) => (
            <Box key={group} sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>{group}</Typography>
              <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.5 }}>
                {items.map((item) => (
                  <Chip key={item.code} label={item.name} size="small" color="primary" variant="outlined" />
                ))}
              </Stack>
            </Box>
          ))
        )}

        <Divider sx={{ my: 2 }} />

        {/* 关联用户 */}
        <Typography fontWeight={500} sx={{ mb: 1.5 }}>关联用户</Typography>
        {loadingUsers ? (
          <CircularProgress size={20} />
        ) : users.length === 0 ? (
          <Typography color="text.secondary" fontSize={14}>暂无用户使用此角色</Typography>
        ) : (
          <Stack spacing={1}>
            {users.map((u) => (
              <Stack key={u.id} direction="row" alignItems="center" spacing={1.5}
                sx={{ p: 1, borderRadius: 1, '&:hover': { bgcolor: 'grey.50' } }}>
                <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: 'primary.light', color: 'primary.dark' }}>
                  {u.employee?.name?.[0] || 'U'}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={500} noWrap>
                    {u.employee?.name || u.email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {u.employee?.department?.name || '-'} · {u.employee?.employeeNo || '-'}
                  </Typography>
                </Box>
                <Chip label={u.employee?.status === 'ACTIVE' ? '在职' : '离职'}
                  size="small" color={u.employee?.status === 'ACTIVE' ? 'success' : 'default'}
                  variant="outlined" sx={{ height: 20, fontSize: 11 }} />
              </Stack>
            ))}
          </Stack>
        )}

        {/* 操作按钮 */}
        <Divider sx={{ my: 2 }} />
        <Button variant="contained" fullWidth startIcon={<EditIcon />}
          onClick={() => { onClose(); onEdit(role); }}>
          编辑角色
        </Button>
      </Box>
    </Drawer>
  );
}

/* ========= 统计卡片 ========= */
function StatsCards({ roles }) {
  const totalRoles = roles.length;
  const activeRoles = roles.filter((r) => r.isActive).length;
  const totalUsers = roles.reduce((sum, r) => sum + (r.userCount || 0), 0);
  const totalPerms = roles.reduce((sum, r) => sum + (r.permissions?.length || 0), 0);

  const stats = [
    { label: '角色总数', value: totalRoles, icon: <RoleIcon />, color: 'primary' },
    { label: '启用角色', value: activeRoles, icon: <CheckIcon />, color: 'success' },
    { label: '关联用户', value: totalUsers, icon: <PeopleIcon />, color: 'info' },
    { label: '权限配置', value: totalPerms, icon: <ShieldIcon />, color: 'warning' },
  ];

  return (
    <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
      {stats.map((stat) => (
        <Card key={stat.label} variant="outlined" sx={{ flex: 1 }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: `${stat.color}.light`, color: `${stat.color}.dark` }}>
              {stat.icon}
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
              <Typography variant="h6" fontWeight={700}>{stat.value}</Typography>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

/* ========= 主页面 ========= */
export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all'); // all | system | custom
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formMode, setFormMode] = useState('create'); // create | edit | duplicate
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRole, setDetailRole] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingFlag, setDeletingFlag] = useState(false);
  const [initFlag, setInitFlag] = useState(false);
  const [toggleFlag, setToggleFlag] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/roles');
      setRoles(res.data || []);
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleInit = async () => {
    setInitFlag(true);
    try {
      await api.post('/roles/init');
      loadData();
    } catch (err) {
      setError(err.message || '初始化失败');
    } finally {
      setInitFlag(false);
    }
  };

  const handleSave = () => {
    setFormOpen(false);
    setEditing(null);
    setFormMode('create');
    loadData();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletingFlag(true);
    try {
      await api.delete(`/roles/${deleting.id}`);
      setConfirmOpen(false);
      setDeleting(null);
      loadData();
    } catch (err) {
      setError(err.message || '删除失败');
    } finally {
      setDeletingFlag(false);
    }
  };

  const handleToggleActive = async (role) => {
    setToggleFlag((prev) => ({ ...prev, [role.id]: true }));
    try {
      await api.put(`/roles/${role.id}/toggle-active`);
      loadData();
    } catch (err) {
      setError(err.message || '操作失败');
    } finally {
      setToggleFlag((prev) => ({ ...prev, [role.id]: false }));
    }
  };

  const openEdit = (role) => {
    setEditing(role);
    setFormMode('edit');
    setFormOpen(true);
  };

  const openDuplicate = (role) => {
    setEditing(role);
    setFormMode('duplicate');
    setFormOpen(true);
  };

  const openDetail = (role) => {
    setDetailRole(role);
    setDetailOpen(true);
  };

  // 筛选
  const filteredRoles = roles.filter((role) => {
    const matchSearch = !searchText
      || role.name.toLowerCase().includes(searchText.toLowerCase())
      || role.code.toLowerCase().includes(searchText.toLowerCase())
      || (role.description || '').toLowerCase().includes(searchText.toLowerCase());
    const matchType = filterType === 'all'
      || (filterType === 'system' && role.isSystem)
      || (filterType === 'custom' && !role.isSystem);
    return matchSearch && matchType;
  });

  return (
    <Box>
      <PageHeader title="角色管理" breadcrumbs={['系统设置', '角色管理']} />

      {/* 统计卡片 */}
      {!loading && <StatsCards roles={roles} />}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* 操作栏 */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small" placeholder="搜索角色..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            }}
            sx={{ width: 240 }}
          />
          <TextField
            size="small" select value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            sx={{ width: 120 }}
          >
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="system">系统角色</MenuItem>
            <MenuItem value="custom">自定义角色</MenuItem>
          </TextField>
        </Stack>
        <Stack direction="row" spacing={1}>
          {roles.length === 0 && (
            <Button variant="outlined" startIcon={<SecurityIcon />} onClick={handleInit} disabled={initFlag}>
              {initFlag ? '初始化中...' : '初始化系统角色'}
            </Button>
          )}
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => { setEditing(null); setFormMode('create'); setFormOpen(true); }}>
            新建角色
          </Button>
        </Stack>
      </Stack>

      {/* 角色列表 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredRoles.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <SecurityIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
            <Typography color="text.secondary">
              {roles.length === 0 ? '暂无角色数据，请先初始化系统角色' : '没有匹配的搜索结果'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {filteredRoles.map((role, index) => {
            const levelConf = LEVEL_CONFIG[role.level] || LEVEL_CONFIG[1];
            const roleColor = ROLE_COLORS[index % ROLE_COLORS.length];

            return (
              <Card key={role.id} variant="outlined"
                sx={{
                  borderRadius: 2,
                  borderLeft: `4px solid ${roleColor}`,
                  opacity: role.isActive ? 1 : 0.6,
                  transition: 'all 0.2s',
                  '&:hover': { boxShadow: 2 },
                }}>
                <CardContent sx={{ py: 2, px: 3, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    {/* 角色图标 */}
                    <Avatar sx={{ bgcolor: `${roleColor}22`, color: roleColor, width: 44, height: 44 }}>
                      <RoleIcon />
                    </Avatar>

                    {/* 角色信息 */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                        <Typography fontWeight={600} fontSize={16}>{role.name}</Typography>
                        <Chip label={role.code} size="small" variant="outlined"
                          sx={{ height: 20, fontSize: 11, fontFamily: 'monospace' }} />
                        <Chip
                          label={levelConf.label}
                          size="small"
                          sx={{
                            height: 20, fontSize: 11, fontWeight: 500,
                            bgcolor: levelConf.bg, color: levelConf.color,
                          }}
                        />
                        {role.isSystem && (
                          <Chip label="系统" size="small" color="primary" variant="outlined"
                            sx={{ height: 20, fontSize: 11 }} />
                        )}
                        {!role.isActive && (
                          <Chip label="已停用" size="small" color="default"
                            sx={{ height: 20, fontSize: 11 }} />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 0.5 }}>
                        {role.description || '暂无描述'}
                      </Typography>
                      {/* 权限标签预览 */}
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {role.permissions?.slice(0, 6).map((code) => {
                          const perm = PERMISSION_DEFINITIONS.find((p) => p.code === code);
                          return perm ? (
                            <Chip key={code} label={perm.name} size="small" variant="outlined"
                              sx={{ height: 18, fontSize: 10 }} />
                          ) : null;
                        })}
                        {role.permissions?.length > 6 && (
                          <Chip label={`+${role.permissions.length - 6}`} size="small"
                            sx={{ height: 18, fontSize: 10, bgcolor: 'grey.100' }} />
                        )}
                      </Stack>
                    </Box>

                    {/* 用户数 */}
                    <Box sx={{ textAlign: 'center', px: 2 }}>
                      <Typography variant="h6" fontWeight={700}>{role.userCount || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">用户</Typography>
                    </Box>

                    {/* 权限数 */}
                    <Box sx={{ textAlign: 'center', px: 2 }}>
                      <Typography variant="h6" fontWeight={700}>{role.permissions?.length || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">权限</Typography>
                    </Box>

                    {/* 启用/停用开关 */}
                    {!role.isSystem && (
                      <Tooltip title={role.isActive ? '点击停用' : '点击启用'}>
                        <Switch
                          checked={role.isActive}
                          onChange={() => handleToggleActive(role)}
                          color={role.isActive ? 'success' : 'default'}
                          disabled={toggleFlag[role.id]}
                          size="small"
                        />
                      </Tooltip>
                    )}

                    {/* 操作按钮 */}
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="查看详情">
                        <IconButton size="small" onClick={() => openDetail(role)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="编辑">
                        <IconButton size="small" color="primary" onClick={() => openEdit(role)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="复制角色">
                        <IconButton size="small" color="info" onClick={() => openDuplicate(role)}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!role.isSystem && (
                        <Tooltip title="删除">
                          <IconButton size="small" color="error"
                            onClick={() => { setDeleting(role); setConfirmOpen(true); }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* 表单弹窗 */}
      <RoleFormDialog
        open={formOpen}
        editing={editing}
        mode={formMode}
        onClose={() => { setFormOpen(false); setEditing(null); setFormMode('create'); }}
        onSave={handleSave}
      />

      {/* 详情抽屉 */}
      <RoleDetailDrawer
        open={detailOpen}
        role={detailRole}
        onClose={() => { setDetailOpen(false); setDetailRole(null); }}
        onEdit={(role) => { openEdit(role); }}
      />

      {/* 删除确认 */}
      <ConfirmDialog
        open={confirmOpen}
        title="删除角色"
        content={`确定要删除角色「${deleting?.name}」吗？此操作不可撤销。`}
        confirmText="删除"
        confirmColor="error"
        loading={deletingFlag}
        onClose={() => { setConfirmOpen(false); setDeleting(null); }}
        onConfirm={handleDelete}
      />
    </Box>
  );
}
