import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Select, MenuItem, InputLabel, FormControl,
} from '@mui/material';
import { Add, LocalShipping } from '@mui/icons-material';
import { api } from '../../lib/api';

const STATUS_MAP = { CREATED: { label: '已创建', color: 'default' }, IN_TRANSIT: { label: '运输中', color: 'warning' }, DELIVERED: { label: '已送达', color: 'success' }, EXCEPTION: { label: '异常', color: 'error' }, RETURNED: { label: '已退回', color: 'error' }, CANCELLED: { label: '已取消', color: 'default' } };

export default function WaybillList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [providers, setProviders] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ logisticsProviderId: '', customerId: '', receiverName: '', receiverPhone: '', receiverAddress: '', weight: '', volume: '', freightCost: '' });
  const [customers, setCustomers] = useState([]);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const loadData = () => {
    api.get('/logistics/waybills', { params: { page, pageSize: 20, status: statusFilter } }).then((res) => { setList(res.data.list || []); setTotal(res.data.total || 0); });
  };
  useEffect(() => { loadData(); }, [page, statusFilter]);
  useEffect(() => {
    api.get('/logistics/providers').then((res) => setProviders(res.data || []));
    api.get('/master/customers', { params: { page: 1, pageSize: 999 } }).then((res) => setCustomers(res.data.list || []));
  }, []);

  const handleCreate = () => {
    api.post('/logistics/waybills', { ...form, weight: Number(form.weight) || 0, volume: Number(form.volume) || 0, freightCost: Number(form.freightCost) || 0 }).then(() => {
      setSnack({ open: true, msg: '运单创建成功', sev: 'success' }); setCreateOpen(false); setForm({ logisticsProviderId: '', customerId: '', receiverName: '', receiverPhone: '', receiverAddress: '', weight: '', volume: '', freightCost: '' }); loadData();
    }).catch((e) => setSnack({ open: true, msg: e.response?.data?.message || '失败', sev: 'error' }));
  };

  const handleStatus = (id, status) => { api.put(`/logistics/waybills/${id}/status`, { status }).then(() => { setSnack({ open: true, msg: '状态更新成功', sev: 'success' }); loadData(); }); };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">运单管理</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>新建运单</Button>
      </Box>
      <Box sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>状态筛选</InputLabel>
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} label="状态筛选">
            <MenuItem value="">全部</MenuItem>
            {Object.entries(STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow><TableCell>运单号</TableCell><TableCell>承运商</TableCell><TableCell>收件人</TableCell><TableCell>电话</TableCell><TableCell>重量</TableCell><TableCell>运费</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell></TableRow></TableHead>
          <TableBody>
            {list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.waybillNo}</TableCell>
                <TableCell>{row.logisticsProvider?.name || '-'}</TableCell>
                <TableCell>{row.receiverName || '-'}</TableCell>
                <TableCell>{row.receiverPhone || '-'}</TableCell>
                <TableCell>{Number(row.weight)}kg</TableCell>
                <TableCell>{Number(row.freightCost).toFixed(2)}</TableCell>
                <TableCell><Chip label={STATUS_MAP[row.status]?.label || row.status} size="small" color={STATUS_MAP[row.status]?.color || 'default'} /></TableCell>
                <TableCell>
                  {row.status === 'CREATED' && <Button size="small" onClick={() => handleStatus(row.id, 'IN_TRANSIT')}>发车</Button>}
                  {row.status === 'IN_TRANSIT' && <Button size="small" color="success" onClick={() => handleStatus(row.id, 'DELIVERED')}>送达</Button>}
                </TableCell>
              </TableRow>
            ))}
            {!list.length && <TableRow><TableCell colSpan={8} align="center">暂无数据</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建运单</DialogTitle>
        <DialogContent><Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}><FormControl fullWidth size="small"><InputLabel>承运商</InputLabel><Select value={form.logisticsProviderId} onChange={(e) => setForm({ ...form, logisticsProviderId: e.target.value })} label="承运商">{providers.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12}><FormControl fullWidth size="small"><InputLabel>客户</InputLabel><Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} label="客户">{customers.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6}><TextField label="收件人" fullWidth size="small" value={form.receiverName} onChange={(e) => setForm({ ...form, receiverName: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="电话" fullWidth size="small" value={form.receiverPhone} onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })} /></Grid>
          <Grid item xs={12}><TextField label="收件地址" fullWidth size="small" value={form.receiverAddress} onChange={(e) => setForm({ ...form, receiverAddress: e.target.value })} /></Grid>
          <Grid item xs={4}><TextField label="重量(kg)" type="number" fullWidth size="small" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></Grid>
          <Grid item xs={4}><TextField label="体积(m³)" type="number" fullWidth size="small" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} /></Grid>
          <Grid item xs={4}><TextField label="运费" type="number" fullWidth size="small" value={form.freightCost} onChange={(e) => setForm({ ...form, freightCost: e.target.value })} /></Grid>
        </Grid></DialogContent>
        <DialogActions><Button onClick={() => setCreateOpen(false)}>取消</Button><Button variant="contained" onClick={handleCreate}>创建</Button></DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}><Alert severity={snack.sev}>{snack.msg}</Alert></Snackbar>
    </Box>
  );
}
