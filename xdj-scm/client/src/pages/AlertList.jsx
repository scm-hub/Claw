import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Snackbar, Alert, Button, Select, MenuItem, InputLabel, FormControl,
} from '@mui/material';
import { CheckCircle, Warning } from '@mui/icons-material';
import { api } from '../lib/api';

const SEVERITY_MAP = { INFO: { label: '信息', color: 'info' }, WARNING: { label: '警告', color: 'warning' }, CRITICAL: { label: '严重', color: 'error' } };
const STATUS_MAP = { ACTIVE: { label: '活跃', color: 'error' }, RESOLVED: { label: '已解决', color: 'success' } };

export default function AlertList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const loadData = () => { api.get('/extra/alerts', { params: { page, pageSize: 20, status: statusFilter } }).then((res) => { setList(res.data.list || []); setTotal(res.data.total || 0); }); };
  useEffect(() => { loadData(); }, [page, statusFilter]);

  const handleResolve = (id) => { api.put(`/extra/alerts/${id}/resolve`).then(() => { setSnack({ open: true, msg: '告警已解决', sev: 'success' }); loadData(); }); };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">预警中心</Typography>
        <Box>
          <Button size="small" variant={statusFilter === 'ACTIVE' ? 'contained' : 'outlined'} onClick={() => { setStatusFilter('ACTIVE'); setPage(1); }} sx={{ mr: 1 }}>活跃告警</Button>
          <Button size="small" variant={statusFilter === '' ? 'contained' : 'outlined'} onClick={() => { setStatusFilter(''); setPage(1); }}>全部</Button>
        </Box>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow><TableCell>类型</TableCell><TableCell>严重程度</TableCell><TableCell>标题</TableCell><TableCell>内容</TableCell><TableCell>关联</TableCell><TableCell>状态</TableCell><TableCell>时间</TableCell><TableCell>操作</TableCell></TableRow></TableHead>
          <TableBody>
            {list.map((row) => (
              <TableRow key={row.id}>
                <TableCell><Chip label={row.alertType} size="small" variant="outlined" /></TableCell>
                <TableCell><Chip label={SEVERITY_MAP[row.severity]?.label || row.severity} size="small" color={SEVERITY_MAP[row.severity]?.color || 'default'} icon={<Warning />} /></TableCell>
                <TableCell>{row.title}</TableCell>
                <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{row.content || '-'}</Typography></TableCell>
                <TableCell>{row.refType ? `${row.refType}` : '-'}</TableCell>
                <TableCell><Chip label={STATUS_MAP[row.status]?.label || row.status} size="small" color={STATUS_MAP[row.status]?.color || 'default'} /></TableCell>
                <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                <TableCell>{row.status === 'ACTIVE' && <Button size="small" startIcon={<CheckCircle />} onClick={() => handleResolve(row.id)}>解决</Button>}</TableCell>
              </TableRow>
            ))}
            {!list.length && <TableRow><TableCell colSpan={8} align="center">暂无告警</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}><Alert severity={snack.sev}>{snack.msg}</Alert></Snackbar>
    </Box>
  );
}
