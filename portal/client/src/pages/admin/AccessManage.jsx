import { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Snackbar, Alert, CircularProgress, Tooltip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TablePagination, TextField, InputAdornment,
  Popover, Checkbox, FormControlLabel, FormGroup,
} from '@mui/material';
import { Refresh, LockReset, Search, ExpandMore } from '@mui/icons-material';
import api from '../../api';

export default function AccessManage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [accessMap, setAccessMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [resetDialog, setResetDialog] = useState({ open: false, userId: '', userName: '' });
  const [searchText, setSearchText] = useState('');
  const [rolePopover, setRolePopover] = useState({ anchorEl: null, userEmail: '' });

  const showSnack = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const fetchData = async () => {
    try {
      const [usersResp, rolesResp, accessResp] = await Promise.all([
        api.get('/users').catch(() => ({ success: false, data: [] })),
        api.get('/roles'),
        api.get('/access'),
      ]);
      if (usersResp.success) setUsers(usersResp.data);
      if (rolesResp.success) setRoles(rolesResp.data);
      if (accessResp.success) {
        const map = {};
        accessResp.data.forEach((u) => { map[u.userEmail] = u.roles; });
        setAccessMap(map);
      }
    } catch (err) {
      showSnack('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggleRole = async (userEmail, roleId, checked) => {
    try {
      if (checked) {
        await api.put('/access/assign', { userEmail, roleId });
      } else {
        await api.delete('/access/assign', { data: { userEmail, roleId } });
      }
      // 只更新 accessMap，不全部刷新
      const resp = await api.get('/access');
      if (resp.success) {
        const map = {};
        resp.data.forEach((u) => { map[u.userEmail] = u.roles; });
        setAccessMap(map);
      }
    } catch (err) {
      showSnack('操作失败', 'error');
    }
  };

  const handleResetPassword = async (password) => {
    try {
      const resp = await api.put(`/users/${resetDialog.userId}/reset-password`, { password });
      if (resp.success) {
        showSnack(`密码已重置为 ${password}`);
        setResetDialog({ open: false, userId: '', userName: '' });
      }
    } catch (err) {
      showSnack('操作失败', 'error');
    }
  };

  // 搜索过滤
  const filteredUsers = users.filter((u) => {
    if (!searchText) return true;
    const name = u.employee?.name || '';
    const email = u.email || '';
    const empNo = u.employee?.employeeNo || '';
    const dept = u.employee?.department?.name || '';
    return [name, email, empNo, dept].some((field) =>
      field.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  const popoverUser = rolePopover.userEmail
    ? filteredUsers.find((u) => u.email === rolePopover.userEmail)
    : null;
  const popoverRoles = popoverUser ? (accessMap[popoverUser.email] || []) : [];

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>用户管理</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            placeholder="搜索姓名/邮箱/工号/部门"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ width: 280 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="刷新"><IconButton onClick={fetchData}><Refresh /></IconButton></Tooltip>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        用户数据来源于 HRMS 在职员工，不可在此新增。点击「角色」列的标签可展开分配/取消角色。
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>姓名</TableCell>
              <TableCell>邮箱</TableCell>
              <TableCell>工号</TableCell>
              <TableCell>部门</TableCell>
              <TableCell sx={{ minWidth: 180 }}>角色</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((user) => {
                const userRoles = accessMap[user.email] || [];
                const summary = userRoles.length === 0
                  ? '未分配'
                  : userRoles.length <= 2
                    ? userRoles.map((r) => r.name).join('、')
                    : `${userRoles[0].name} +${userRoles.length - 1}`;
                return (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {user.employee?.name || '未绑定员工'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                    </TableCell>
                    <TableCell>{user.employee?.employeeNo || '-'}</TableCell>
                    <TableCell>{user.employee?.department?.name || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={summary}
                        size="small"
                        color={userRoles.length > 0 ? 'primary' : 'default'}
                        variant={userRoles.length > 0 ? 'outlined' : 'outlined'}
                        clickable
                        onClick={(e) => setRolePopover({ anchorEl: e.currentTarget, userEmail: user.email })}
                        deleteIcon={<ExpandMore />}
                        onDelete={(e) => { e.stopPropagation(); setRolePopover({ anchorEl: e.currentTarget, userEmail: user.email }); }}
                        sx={{ maxWidth: 200 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="重置密码">
                        <IconButton
                          size="small"
                          onClick={() => setResetDialog({ open: true, userId: user.id, userName: user.employee?.name || user.email })}
                        >
                          <LockReset fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredUsers.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="每页行数："
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
        />
      </TableContainer>

      {/* 角色分配 Popover */}
      <Popover
        open={Boolean(rolePopover.anchorEl)}
        anchorEl={rolePopover.anchorEl}
        onClose={() => setRolePopover({ anchorEl: null, userEmail: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { p: 2, minWidth: 240, maxWidth: 300 } }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {popoverUser?.employee?.name || popoverUser?.email || ''} — 角色分配
        </Typography>
        <FormGroup>
          {roles.map((r) => {
            const checked = popoverRoles.some((ur) => ur.id === r.id);
            return (
              <FormControlLabel
                key={r.id}
                control={
                  <Checkbox
                    size="small"
                    checked={checked}
                    onChange={(e) => handleToggleRole(rolePopover.userEmail, r.id, e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" component="span">{r.name}</Typography>
                    {r.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 0 }}>
                        {r.description}
                      </Typography>
                    )}
                  </Box>
                }
                sx={{ alignItems: 'flex-start', mb: 0.5 }}
              />
            );
          })}
          {roles.length === 0 && (
            <Typography variant="body2" color="text.secondary">暂无可用角色</Typography>
          )}
        </FormGroup>
      </Popover>

      {/* 重置密码对话框 */}
      <Dialog open={resetDialog.open} onClose={() => setResetDialog({ open: false, userId: '', userName: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>重置密码 — {resetDialog.userName}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            {[123456, 888888].map((pwd) => (
              <Button key={pwd} variant="outlined" size="small" onClick={() => handleResetPassword(String(pwd))}>重置为 {pwd}</Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions><Button onClick={() => setResetDialog({ open: false, userId: '', userName: '' })}>关闭</Button></DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
