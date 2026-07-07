import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Select, MenuItem, InputLabel, FormControl,
} from '@mui/material';
import { Add, Check, Close, DoneAll } from '@mui/icons-material';
import { api } from '../lib/api';

const TYPE_MAP = { REFUND: '退款', RETURN: '退货', EXCHANGE: '换货', COMPLAINT: '投诉' };
const STATUS_MAP = { PENDING: { label: '待处理', color: 'warning' }, APPROVED: { label: '已审批', color: 'info' }, REJECTED: { label: '已拒绝', color: 'error' }, COMPLETED: { label: '已完成', color: 'success' } };

export default function AfterSalesList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [salesOrders, setSalesOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ salesOrderId: '', customerId: '', batchId: '', type: 'REFUND', reason: '', refundAmount: '' });
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const loadData = () => { api.get('/aftersales', { params: { page, pageSize: 20 } }).then((res) => { setList(res.data.list || []); setTotal(res.data.total || 0); }); };
  useEffect(() => {
    loadData();
    api.get('/sales/orders', { params: { page: 1, pageSize: 99 } }).then((res) => setSalesOrders(res.data.list || []));
    api.get('/master/customers', { params: { page: 1, pageSize: 999 } }).then((res) => setCustomers(res.data.list || []));
    api.get('/traceability/batches', { params: { page: 1, pageSize: 999 } }).then((res) => setBatches(res.data.list || []));
  }, [page]);

  const handleCreate = () => {
    api.post('/aftersales', { ...form, refundAmount: Number(form.refundAmount) || 0 }).then(() => {
      setSnack({ open: true, msg: '售后记录创建成功', sev: 'success' }); setCreateOpen(false); setForm({ salesOrderId: '', customerId: '', batchId: '', type: 'REFUND', reason: '', refundAmount: '' }); loadData();
    }).catch((e) => setSnack({ open: true, msg: e.response?.data?.message || '失败', sev: 'error' }));
  };
  const handleApprove = (id, approved) => { api.put(`/aftersales/${id}/approve`, { approved }).then(() => { setSnack({ open: true, msg: approved ? '已审批通过' : '已拒绝', sev: 'success' }); loadData(); }); };
  const handleComplete = (id) => { api.put(`/aftersales/${id}/complete`).then(() => { setSnack({ open: true, msg: '售后已完成', sev: 'success' }); loadData(); }); };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">售后管理</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>新建售后</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow><TableCell>单号</TableCell><TableCell>销售订单</TableCell><TableCell>客户</TableCell><TableCell>类型</TableCell><TableCell>退款金额</TableCell><TableCell>原因</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell></TableRow></TableHead>
          <TableBody>
            {list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.recordNo}</TableCell>
                <TableCell>{row.salesOrder?.orderNo || '-'}</TableCell>
                <TableCell>{row.customer?.name || '-'}</TableCell>
                <TableCell><Chip label={TYPE_MAP[row.type] || row.type} size="small" variant="outlined" /></TableCell>
                <TableCell>{Number(row.refundAmount).toFixed(2)}</TableCell>
                <TableCell>{row.reason || '-'}</TableCell>
                <TableCell><Chip label={STATUS_MAP[row.status]?.label || row.status} size="small" color={STATUS_MAP[row.status]?.color || 'default'} /></TableCell>
                <TableCell>
                  {row.status === 'PENDING' && <>
                    <IconButton size="small" color="success" onClick={() => handleApprove(row.id, true)} title="通过"><Check fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleApprove(row.id, false)} title="拒绝"><Close fontSize="small" /></IconButton>
                  </>}
                  {row.status === 'APPROVED' && <Button size="small" startIcon={<DoneAll />} onClick={() => handleComplete(row.id)}>完成</Button>}
                </TableCell>
              </TableRow>
            ))}
            {!list.length && <TableRow><TableCell colSpan={8} align="center">暂无数据</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建售后记录</DialogTitle>
        <DialogContent><Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}><FormControl fullWidth size="small"><InputLabel>销售订单</InputLabel><Select value={form.salesOrderId} onChange={(e) => { const so = salesOrders.find(o => o.id === e.target.value); setForm({ ...form, salesOrderId: e.target.value, customerId: so?.customerId || '' }); }} label="销售订单">{salesOrders.map((o) => <MenuItem key={o.id} value={o.id}>{o.orderNo}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>客户</InputLabel><Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} label="客户">{customers.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>批次</InputLabel><Select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} label="批次"><MenuItem value="">无</MenuItem>{batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.batchNo}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>类型</InputLabel><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} label="类型">{Object.entries(TYPE_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6}><TextField label="退款金额" type="number" fullWidth size="small" value={form.refundAmount} onChange={(e) => setForm({ ...form, refundAmount: e.target.value })} /></Grid>
          <Grid item xs={12}><TextField label="原因" fullWidth size="small" multiline rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Grid>
        </Grid></DialogContent>
        <DialogActions><Button onClick={() => setCreateOpen(false)}>取消</Button><Button variant="contained" onClick={handleCreate}>创建</Button></DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}><Alert severity={snack.sev}>{snack.msg}</Alert></Snackbar>
    </Box>
  );
}
