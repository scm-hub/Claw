import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Snackbar, Alert, Button, TextField,
} from '@mui/material';
import { Check, Close, Pending } from '@mui/icons-material';
import { api } from '../lib/api';

const STATUS_MAP = { PENDING: { label: '待审批', color: 'warning' }, APPROVED: { label: '已通过', color: 'success' }, REJECTED: { label: '已拒绝', color: 'error' } };
const FLOW_TYPES = { PURCHASE_PLAN: '采购计划审批', PURCHASE_ORDER: '采购订单审批', SALES_ORDER: '销售订单审批', AFTER_SALES: '售后审批', RECALL: '召回审批' };

export default function ApprovalList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const loadData = () => { api.get('/approval', { params: { page, pageSize: 20, status: statusFilter } }).then((res) => { setList(res.data.list || []); setTotal(res.data.total || 0); }); };
  useEffect(() => { loadData(); }, [page, statusFilter]);

  const handleProcess = (id, approved) => {
    api.put(`/approval/${id}/process`, { approved }).then(() => {
      setSnack({ open: true, msg: approved ? '审批通过' : '已拒绝', sev: 'success' }); loadData();
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">审批管理</Typography>
        <Box>
          <Button size="small" variant={statusFilter === '' ? 'contained' : 'outlined'} onClick={() => { setStatusFilter(''); setPage(1); }} sx={{ mr: 1 }}>全部</Button>
          <Button size="small" variant={statusFilter === 'PENDING' ? 'contained' : 'outlined'} onClick={() => { setStatusFilter('PENDING'); setPage(1); }} sx={{ mr: 1 }}>待审批</Button>
          <Button size="small" variant={statusFilter === 'APPROVED' ? 'contained' : 'outlined'} onClick={() => { setStatusFilter('APPROVED'); setPage(1); }}>已通过</Button>
        </Box>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow><TableCell>类型</TableCell><TableCell>关联ID</TableCell><TableCell>申请人</TableCell><TableCell>审批人</TableCell><TableCell>备注</TableCell><TableCell>状态</TableCell><TableCell>创建时间</TableCell><TableCell>操作</TableCell></TableRow></TableHead>
          <TableBody>
            {list.map((row) => (
              <TableRow key={row.id}>
                <TableCell><Chip label={FLOW_TYPES[row.flowType] || row.flowType} size="small" variant="outlined" /></TableCell>
                <TableCell><Typography variant="body2" fontFamily="monospace">{row.refId.slice(-8)}</Typography></TableCell>
                <TableCell>{row.applicant?.name || '-'}</TableCell>
                <TableCell>{row.approver?.name || '-'}</TableCell>
                <TableCell>{row.remark || '-'}</TableCell>
                <TableCell><Chip label={STATUS_MAP[row.status]?.label || row.status} size="small" color={STATUS_MAP[row.status]?.color || 'default'} /></TableCell>
                <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  {row.status === 'PENDING' && <>
                    <IconButton size="small" color="success" onClick={() => handleProcess(row.id, true)} title="通过"><Check fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleProcess(row.id, false)} title="拒绝"><Close fontSize="small" /></IconButton>
                  </>}
                </TableCell>
              </TableRow>
            ))}
            {!list.length && <TableRow><TableCell colSpan={8} align="center">暂无审批记录</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}><Alert severity={snack.sev}>{snack.msg}</Alert></Snackbar>
    </Box>
  );
}
