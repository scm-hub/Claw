import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  TablePagination,
} from '@mui/material';
import { Refresh, PersonAdd, LockReset } from '@mui/icons-material';
import api from '../../api';

const HRMS_ROLES = [
  { value: 'SUPER_ADMIN', label: '超级管理员' },
  { value: 'HR_ADMIN', label: 'HR管理员' },
  { value: 'MANAGER', label: '经理' },
  { value: 'EMPLOYEE', label: '普通员工' },
];

export default function UserManage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [createDialog, setCreateDialog] = useState(false);
  const [resetDialog, setResetDialog] = useState({ open: false, userId: '', userName: '' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // 创建用户表单
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    name: '',
    employeeNo: '',
    departmentId: '',
    position: '',
    role: 'EMPLOYEE',
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchUsers = async () => {
    try {
      const resp = await api.get('/users');
      if (resp.success) setUsers(resp.data);
    } catch (err) {
      showSnackbar('加载用户列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async () => {
    try {
      const resp = await api.post('/users', createForm);
      if (resp.success) {
        showSnackbar('用户创建成功');
        setCreateDialog(false);
        setCreateForm({ email: '', password: '', name: '', employeeNo: '', departmentId: '', position: '', role: 'EMPLOYEE' });
        fetchUsers();
      }
    } catch (err) {
      showSnackbar(err.message || '创建失败', 'error');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const resp = await api.put(`/users/${userId}/role`, { role: newRole });
      if (resp.success) {
        showSnackbar('角色已更新');
        fetchUsers();
      }
    } catch (err) {
      showSnackbar('操作失败', 'error');
    }
  };

  const handleResetPassword = async (password) => {
    try {
      const resp = await api.put(`/users/${resetDialog.userId}/reset-password`, { password });
      if (resp.success) {
        showSnackbar(`密码已重置为 ${password}`);
        setResetDialog({ open: false, userId: '', userName: '' });
      }
    } catch (err) {
      showSnackbar('操作失败', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const roleColors = {
    SUPER_ADMIN: 'error',
    HR_ADMIN: 'warning',
    MANAGER: 'info',
    EMPLOYEE: 'default',
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          用户管理
        </Typography>
        <Box>
          <Tooltip title="刷新">
            <IconButton onClick={fetchUsers} sx={{ mr: 1 }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setCreateDialog(true)}>
            新增用户
          </Button>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        统一管理平台所有用户账号。用户创建后自动可用于所有子系统的 SSO 登录，具体权限和角色请在「权限管理」页面配置。
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>姓名</TableCell>
              <TableCell>邮箱</TableCell>
              <TableCell>工号</TableCell>
              <TableCell>部门</TableCell>
              <TableCell>岗位</TableCell>
              <TableCell>HRMS 角色</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {user.employee?.name || '未绑定员工'}
                    </Typography>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.employee?.employeeNo || '-'}</TableCell>
                  <TableCell>{user.employee?.department?.name || '-'}</TableCell>
                  <TableCell>{user.employee?.positionTitle || user.employee?.position || '-'}</TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={user.role}
                      sx={{ minWidth: 120, fontSize: 13 }}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    >
                      {HRMS_ROLES.map((r) => (
                        <MenuItem key={r.value} value={r.value} sx={{ fontSize: 13 }}>
                          {r.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <Chip
                      label={HRMS_ROLES.find((r) => r.value === user.role)?.label || user.role}
                      size="small"
                      color={roleColors[user.role] || 'default'}
                      sx={{ ml: 1 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="重置密码">
                      <IconButton
                        size="small"
                        onClick={() =>
                          setResetDialog({ open: true, userId: user.id, userName: user.employee?.name || user.email })
                        }
                      >
                        <LockReset fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={users.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="每页行数："
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
        />
      </TableContainer>

      {/* 创建用户对话框 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增用户</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="邮箱 *"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="密码 *"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              size="small"
              fullWidth
              helperText="最少6位"
            />
            <TextField
              label="姓名 *"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="工号 *"
              value={createForm.employeeNo}
              onChange={(e) => setCreateForm({ ...createForm, employeeNo: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="岗位"
              value={createForm.position}
              onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}
              size="small"
              fullWidth
            />
            <FormControl fullWidth size="small">
              <InputLabel>HRMS 角色</InputLabel>
              <Select
                value={createForm.role}
                label="HRMS 角色"
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              >
                {HRMS_ROLES.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!createForm.email || !createForm.password || !createForm.name || !createForm.employeeNo}>
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 重置密码对话框 */}
      <Dialog open={resetDialog.open} onClose={() => setResetDialog({ open: false, userId: '', userName: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>重置密码 — {resetDialog.userName}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            {[123456, 888888].map((pwd) => (
              <Button key={pwd} variant="outlined" size="small" onClick={() => handleResetPassword(String(pwd))}>
                重置为 {pwd}
              </Button>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            点击上方按钮快速重置密码，用户可用新密码通过统一平台登录。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog({ open: false, userId: '', userName: '' })}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
