import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, InputAdornment, IconButton,
  TablePagination, Chip, FormControl, InputLabel, Select, MenuItem, Button, Alert,
} from '@mui/material';
import { Search, Sync } from '@mui/icons-material';
import api from '../../lib/api';

const statusMap = {
  ACTIVE: { label: '在职', color: 'success' },
  INACTIVE: { label: '停职', color: 'warning' },
  RESIGNED: { label: '离职', color: 'error' },
};

export default function EmployeeList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    api.get('/master/departments').then((res) => {
      setDepartments(res.data || []);
    }).catch(() => {});
  }, []);

  const loadList = async () => {
    try {
      setLoading(true);
      const params = { page: page + 1, pageSize: rowsPerPage, keyword };
      if (selectedStatus) params.status = selectedStatus;
      if (selectedDeptId) params.departmentId = selectedDeptId;
      const res = await api.get('/master/employees', { params });
      setList(res.data?.list || []);
      setTotal(res.data?.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadList(); }, [page, rowsPerPage, selectedStatus, selectedDeptId]);

  const handleSearch = () => { setPage(0); loadList(); };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await api.post('/master/sync-from-hrms');
      setSyncMsg(res.message || '同步完成');
      loadList();
      // 刷新部门列表
      api.get('/master/departments').then(r => setDepartments(r.data || [])).catch(() => {});
    } catch (err) {
      setSyncMsg(err?.data?.message || '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>员工管理</Typography>
        <Button
          variant="outlined" size="small" startIcon={<Sync />}
          onClick={handleSync} disabled={syncing}
        >
          {syncing ? '同步中...' : '从综合平台同步'}
        </Button>
      </Box>

      {/* 只读提示 */}
      <Alert severity="info" sx={{ mb: 2 }}>
        员工数据来源于综合平台（HRMS），仅支持查看，不支持在 SCM 中新增、编辑或删除。如需修改请前往 HRMS 操作后点击"从综合平台同步"。
      </Alert>

      {syncMsg && (
        <Alert severity={syncMsg.includes('失败') ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setSyncMsg('')}>
          {syncMsg}
        </Alert>
      )}

      {/* 筛选栏 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small" label="搜索（工号/姓名/电话）" value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleSearch}><Search /></IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>按部门筛选</InputLabel>
              <Select
                value={selectedDeptId}
                onChange={(e) => { setSelectedDeptId(e.target.value); setPage(0); }}
                label="按部门筛选"
              >
                <MenuItem value="">全部部门</MenuItem>
                {departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>按状态筛选</InputLabel>
              <Select
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setPage(0); }}
                label="按状态筛选"
              >
                <MenuItem value="">全部状态</MenuItem>
                <MenuItem value="ACTIVE">在职</MenuItem>
                <MenuItem value="INACTIVE">停职</MenuItem>
                <MenuItem value="RESIGNED">离职</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

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
              <TableCell>入职日期</TableCell>
              <TableCell>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.empNo}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.department?.name || '-'}</TableCell>
                <TableCell>{item.position || '-'}</TableCell>
                <TableCell>{item.phone || '-'}</TableCell>
                <TableCell>{item.email || '-'}</TableCell>
                <TableCell>{item.hireDate ? new Date(item.hireDate).toLocaleDateString('zh-CN') : '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={statusMap[item.status]?.label || item.status}
                    color={statusMap[item.status]?.color || 'default'}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  {loading ? '加载中...' : '暂无数据'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
          labelRowsPerPage="每页"
        />
      </TableContainer>
    </Box>
  );
}
