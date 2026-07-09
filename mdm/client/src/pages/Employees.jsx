import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, CircularProgress, Alert, TextField, MenuItem, Grid,
} from '@mui/material';
import api from '../api';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchEmployees = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/master-data/employees', { params });
      setEmployees(res.data);
    } catch (err) {
      setError(err.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchEmployees(), 300);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  if (loading && employees.length === 0) {
    return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;
  }

  const statusColors = { ACTIVE: 'success', RESIGNED: 'error', INACTIVE: 'warning' };
  const statusLabel = { ACTIVE: '在职', RESIGNED: '离职', INACTIVE: '停用' };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>员工主数据</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth size="small" placeholder="搜索姓名/工号/邮箱/电话"
            value={search} onChange={(e) => { setSearch(e.target.value); setLoading(true); }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            select fullWidth size="small" label="状态筛选"
            value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setLoading(true); }}
          >
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="ACTIVE">在职</MenuItem>
            <MenuItem value="RESIGNED">离职</MenuItem>
            <MenuItem value="INACTIVE">停用</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>工号</TableCell>
              <TableCell>姓名</TableCell>
              <TableCell>部门</TableCell>
              <TableCell>职位</TableCell>
              <TableCell>电话</TableCell>
              <TableCell>邮箱</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>最后同步</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp.id} hover>
                <TableCell>{emp.employeeNo}</TableCell>
                <TableCell><Typography variant="body2" fontWeight="bold">{emp.name}</Typography></TableCell>
                <TableCell>{emp.departmentName || '—'}</TableCell>
                <TableCell>{emp.positionTitle || '—'}</TableCell>
                <TableCell>{emp.phone || '—'}</TableCell>
                <TableCell>{emp.email || '—'}</TableCell>
                <TableCell>
                  <Chip size="small" label={statusLabel[emp.status] || emp.status} color={statusColors[emp.status] || 'default'} />
                </TableCell>
                <TableCell>{new Date(emp.lastSyncAt).toLocaleString('zh-CN')}</TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center">暂无员工数据，请先从 HRMS 同步</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        共 {employees.length} 条记录
      </Typography>
    </Box>
  );
}
