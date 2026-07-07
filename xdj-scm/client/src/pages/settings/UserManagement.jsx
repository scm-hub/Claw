import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, InputAdornment, TablePagination,
  Chip,
} from '@mui/material';
import { Add, Edit, Search, LockReset } from '@mui/icons-material';
import api from '../../lib/api';
import { ROLE_LABELS } from '../../store/authStore';

export default function UserManagement() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [form, setForm] = useState({});

  const loadList = async () => {
    try {
      const params = new URLSearchParams({ page: page + 1, pageSize: rowsPerPage, keyword, role: roleFilter, status: statusFilter });
      const res = await api.get(`/auth/users?${params}`);
      setList(res.data.list || []); setTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadList(); }, [page, rowsPerPage]);

  const handleSearch = () => { setPage(0); loadList(); };

  const handleOpen = (data = null) => {
    setDialog({ open: true, data });
    setForm(data ? { username: data.username, role: data.role, status: data.status, employeeId: data.employee?.id || '' } : { username: '', password: '', role: 'EMPLOYEE', status: 'ACTIVE' });
  };

  const handleSave = async () => {
    try {
      if (dialog.data) await api.put(`/auth/users/${dialog.data.id}`, form);
      else await api.post('/auth/users', form);
      setDialog({ open: false, data: null }); loadList();
    } catch (err) { alert(err.message); }
  };

  const handleResetPassword = async (id) => {
    if (!confirm('确定重置密码为 123456？')) return;
    try { await api.put(`/auth/users/${id}/reset-password`); alert('密码已重置为 123456'); } catch (err) { alert(err.message); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">用户管理</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>新增用户</Button>
      </Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}><TextField fullWidth size="small" label="搜索（用户名/姓名/工号）" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} /></Grid>
            <Grid item xs={6} md={2}>
              <TextField select fullWidth size="small" label="角色" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <MenuItem value="">全部</MenuItem>
                {Object.entries(ROLE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField select fullWidth size="small" label="状态" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="ACTIVE">正常</MenuItem>
                <MenuItem value="DISABLED">禁用</MenuItem>
              </TextField>
            </Grid>
            <Grid item><Button variant="outlined" startIcon={<Search />} onClick={handleSearch}>查询</Button></Grid>
          </Grid>
        </CardContent>
      </Card>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow><TableCell>用户名</TableCell><TableCell>姓名</TableCell><TableCell>工号</TableCell><TableCell>部门</TableCell><TableCell>角色</TableCell><TableCell>状态</TableCell><TableCell>最后登录</TableCell><TableCell>操作</TableCell></TableRow></TableHead>
          <TableBody>
            {list.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.username}</TableCell><TableCell>{item.employee?.name || '-'}</TableCell><TableCell>{item.employee?.empNo || '-'}</TableCell>
                <TableCell>{item.employee?.department || '-'}</TableCell>
                <TableCell><Chip label={ROLE_LABELS[item.role] || item.role} size="small" color={item.role === 'SUPER_ADMIN' ? 'error' : 'default'} /></TableCell>
                <TableCell>{item.status === 'ACTIVE' ? '正常' : '禁用'}</TableCell>
                <TableCell>{item.lastLogin ? new Date(item.lastLogin).toLocaleString() : '-'}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleOpen(item)}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" title="重置密码" onClick={() => handleResetPassword(item.id)}><LockReset fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>暂无数据</TableCell></TableRow>}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(e.target.value); setPage(0); }}
          labelRowsPerPage="每页行数："
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count !== -1 ? count : '超过'} 条`}
        />
      </TableContainer>
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, data: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.data ? '编辑用户' : '新增用户'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}><TextField fullWidth size="small" label="用户名" value={form.username || ''} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!dialog.data} /></Grid>
            {!dialog.data && <Grid item xs={12}><TextField fullWidth size="small" label="密码" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} helperText="默认密码 123456" /></Grid>}
            <Grid item xs={12}>
              <TextField select fullWidth size="small" label="角色" value={form.role || 'EMPLOYEE'} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField select fullWidth size="small" label="状态" value={form.status || 'ACTIVE'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <MenuItem value="ACTIVE">正常</MenuItem>
                <MenuItem value="DISABLED">禁用</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setDialog({ open: false, data: null })}>取消</Button><Button variant="contained" onClick={handleSave}>保存</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
