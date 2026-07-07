import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Tooltip, Stack, Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Lock as LockIcon, AdminPanelSettings as RoleIcon,
  PersonAdd as BatchAddIcon, Search as SearchIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';

const ROLE_MAP = {
  SUPER_ADMIN: { label: '超级管理员', color: 'error' },
  HR_ADMIN: { label: 'HR管理员', color: 'warning' },
  MANAGER: { label: '经理', color: 'info' },
  EMPLOYEE: { label: '普通员工', color: 'default' },
};

const STATUS_MAP = {
  ACTIVE: { label: '在职', color: 'success' },
  INACTIVE: { label: '停职', color: 'warning' },
  RESIGNED: { label: '离职', color: 'error' },
};

/* ========= 创建用户弹窗 ========= */
function CreateUserDialog({ open, departments, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', employeeNo: '', email: '', password: '',
    departmentId: '', position: '', role: 'EMPLOYEE',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ name: '', employeeNo: '', email: '', password: '', departmentId: '', position: '', role: 'EMPLOYEE' });
      setError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim()) { setError('姓名不能为空'); return; }
    if (!form.employeeNo.trim()) { setError('工号不能为空'); return; }
    if (!form.email.trim()) { setError('邮箱不能为空'); return; }
    if (!form.password || form.password.length < 6) { setError('密码长度至少6位'); return; }

    setSaving(true);
    try {
      await api.post('/auth/create-user', {
        name: form.name.trim(),
        employeeNo: form.employeeNo.trim(),
        email: form.email.trim(),
        password: form.password,
        departmentId: form.departmentId || undefined,
        position: form.position.trim() || undefined,
        role: form.role,
      });
      onSave();
    } catch (err) {
      setError(err.message || '创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>创建系统用户</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField fullWidth label="姓名" margin="normal" required
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextField fullWidth label="工号" margin="normal" required placeholder="如: EMP002"
          value={form.employeeNo} onChange={(e) => setForm({ ...form, employeeNo: e.target.value })} />
        <TextField fullWidth label="邮箱" type="email" margin="normal" required
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <TextField fullWidth label="密码" type="password" margin="normal" required
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          helperText="至少6位" />
        <TextField fullWidth select label="部门" margin="normal"
          value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
          <MenuItem value="">请选择部门</MenuItem>
          {departments.map((d) => (
            <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
          ))}
        </TextField>
        <TextField fullWidth label="岗位" margin="normal"
          value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
        <TextField fullWidth select label="系统角色" margin="normal" required
          value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <MenuItem value="EMPLOYEE">普通员工</MenuItem>
          <MenuItem value="MANAGER">经理</MenuItem>
          <MenuItem value="HR_ADMIN">HR管理员</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========= 修改角色弹窗 ========= */
function ChangeRoleDialog({ open, user, onClose, onSave }) {
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && user) {
      setRole(user.role);
      setError('');
    }
  }, [open, user]);

  const handleSubmit = async () => {
    if (!user || role === user.role) { onClose(); return; }
    setSaving(true);
    try {
      await api.put(`/auth/users/${user.id}/role`, { role });
      onSave();
    } catch (err) {
      setError(err.message || '修改失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>修改角色 - {user?.employee?.name || user?.email}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField fullWidth select label="系统角色" margin="normal" value={role}
          onChange={(e) => setRole(e.target.value)}>
          <MenuItem value="EMPLOYEE">普通员工</MenuItem>
          <MenuItem value="MANAGER">经理</MenuItem>
          <MenuItem value="HR_ADMIN">HR管理员</MenuItem>
          <MenuItem value="SUPER_ADMIN">超级管理员</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========= 重置密码弹窗 ========= */
function ResetPasswordDialog({ open, user, onClose, onSave }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setPassword(''); setError(''); }
  }, [open]);

  const handleSubmit = async () => {
    if (!password || password.length < 6) { setError('密码长度至少6位'); return; }
    setSaving(true);
    try {
      await api.put(`/auth/users/${user.id}/reset-password`, { password });
      onSave();
    } catch (err) {
      setError(err.message || '重置失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>重置密码 - {user?.employee?.name || user?.email}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField fullWidth label="新密码" type="password" margin="normal" required
          value={password} onChange={(e) => setPassword(e.target.value)}
          helperText="至少6位" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : '重置密码'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========= 主页面 ========= */
export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState(null);
  const [pwdTarget, setPwdTarget] = useState(null);
  const [batchCreating, setBatchCreating] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filteredUsers = users.filter((u) => {
    const kw = searchKeyword.toLowerCase();
    if (kw) {
      const name = (u.employee?.name || '').toLowerCase();
      const no = (u.employee?.employeeNo || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      if (!name.includes(kw) && !no.includes(kw) && !email.includes(kw)) return false;
    }
    if (filterRole && u.role !== filterRole) return false;
    if (filterStatus && (u.employee?.status || '') !== filterStatus) return false;
    return true;
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [userRes, deptRes] = await Promise.all([
        api.get('/auth/users'),
        api.get('/departments/flat'),
      ]);
      setUsers(userRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (err) {
      setMessage({ type: 'error', text: '加载失败：' + (err.message || '未知错误') });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = () => {
    setCreateOpen(false);
    setRoleTarget(null);
    setPwdTarget(null);
    setMessage({ type: 'success', text: '操作成功' });
    fetchData();
  };

  const handleBatchCreate = async () => {
    setBatchCreating(true);
    try {
      const res = await api.post('/auth/batch-create-accounts', { defaultPassword: '888888' });
      const { created, total } = res.data;
      if (created === 0) {
        setMessage({ type: 'info', text: '所有在职员工已有账号，无需创建' });
      } else {
        setMessage({ type: 'success', text: `批量开通完成：共为 ${created}/${total} 名员工创建账号，默认密码 888888` });
      }
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: '批量开通失败：' + (err.message || '未知错误') });
    } finally {
      setBatchCreating(false);
    }
  };

  return (
    <Box>
      <PageHeader title="用户管理" breadcrumbs={['系统设置', '用户管理']} />

      {message.text && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {/* 查询栏 */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
        <TextField
          size="small" placeholder="搜索姓名/工号/邮箱"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          sx={{ width: 240 }}
          slotProps={{ input: { startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> } }}
        />
        <TextField size="small" select label="角色" value={filterRole} onChange={(e) => setFilterRole(e.target.value)} sx={{ width: 140 }}>
          <MenuItem value="">全部</MenuItem>
          <MenuItem value="SUPER_ADMIN">超级管理员</MenuItem>
          <MenuItem value="HR_ADMIN">HR管理员</MenuItem>
          <MenuItem value="MANAGER">经理</MenuItem>
          <MenuItem value="EMPLOYEE">普通员工</MenuItem>
        </TextField>
        <TextField size="small" select label="员工状态" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} sx={{ width: 140 }}>
          <MenuItem value="">全部</MenuItem>
          <MenuItem value="ACTIVE">在职</MenuItem>
          <MenuItem value="INACTIVE">停职</MenuItem>
          <MenuItem value="RESIGNED">离职</MenuItem>
        </TextField>
        {(searchKeyword || filterRole || filterStatus) && (
          <Button size="small" onClick={() => { setSearchKeyword(''); setFilterRole(''); setFilterStatus(''); }}>清除筛选</Button>
        )}
      </Stack>

      {/* 操作栏 */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={batchCreating ? <CircularProgress size={16} /> : <BatchAddIcon />}
          onClick={handleBatchCreate}
          disabled={batchCreating}
        >
          {batchCreating ? '开通中...' : '批量开通账号（默认密码 888888）'}
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          创建用户
        </Button>
      </Box>

      {/* 用户列表 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>工号</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>姓名</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>邮箱</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>部门</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>岗位</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>员工状态</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>系统角色</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((u) => {
                const roleInfo = ROLE_MAP[u.role] || { label: u.role, color: 'default' };
                const statusInfo = STATUS_MAP[u.employee?.status] || { label: '-', color: 'default' };
                return (
                  <TableRow key={u.id} hover>
                    <TableCell>{u.employee?.employeeNo || '-'}</TableCell>
                    <TableCell>{u.employee?.name || '-'}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.employee?.department?.name || '-'}</TableCell>
                    <TableCell>{u.employee?.position?.name || u.employee?.positionTitle || '-'}</TableCell>
                    <TableCell>
                      <Chip label={statusInfo.label} size="small" color={statusInfo.color} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={roleInfo.label} size="small" color={roleInfo.color} />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="修改角色">
                          <IconButton size="small" color="primary" onClick={() => setRoleTarget(u)}>
                            <RoleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="重置密码">
                          <IconButton size="small" color="warning" onClick={() => setPwdTarget(u)}>
                            <LockIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredUsers.length === 0 && users.length > 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">没有匹配的查询结果</Typography>
                  </TableCell>
                </TableRow>
              )}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无用户数据</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 创建用户弹窗 */}
      <CreateUserDialog
        open={createOpen}
        departments={departments}
        onClose={() => setCreateOpen(false)}
        onSave={handleSave}
      />

      {/* 修改角色弹窗 */}
      <ChangeRoleDialog
        open={Boolean(roleTarget)}
        user={roleTarget}
        onClose={() => setRoleTarget(null)}
        onSave={handleSave}
      />

      {/* 重置密码弹窗 */}
      <ResetPasswordDialog
        open={Boolean(pwdTarget)}
        user={pwdTarget}
        onClose={() => setPwdTarget(null)}
        onSave={handleSave}
      />
    </Box>
  );
}
