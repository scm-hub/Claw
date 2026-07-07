import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Select, MenuItem, InputLabel, FormControl,
} from '@mui/material';
import { Add, Route as RouteIcon } from '@mui/icons-material';
import { api } from '../../lib/api';

const STATUS_MAP = { PLANNED: { label: '已规划', color: 'default' }, IN_PROGRESS: { label: '执行中', color: 'warning' }, COMPLETED: { label: '已完成', color: 'success' }, CANCELLED: { label: '已取消', color: 'default' } };

export default function DeliveryRouteList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [providers, setProviders] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ routeDate: '', logisticsProviderId: '', vehicleNo: '', driverName: '', driverPhone: '', totalStops: '', totalWeight: '', totalCost: '' });
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const loadData = () => { api.get('/logistics/routes', { params: { page, pageSize: 20 } }).then((res) => { setList(res.data.list || []); setTotal(res.data.total || 0); }); };
  useEffect(() => { loadData(); }, [page]);
  useEffect(() => { api.get('/logistics/providers').then((res) => setProviders(res.data || [])); }, []);

  const handleCreate = () => {
    api.post('/logistics/routes', { ...form, routeDate: form.routeDate || new Date().toISOString().slice(0, 10), totalStops: Number(form.totalStops) || 0, totalWeight: Number(form.totalWeight) || 0, totalCost: Number(form.totalCost) || 0 }).then(() => {
      setSnack({ open: true, msg: '路线创建成功', sev: 'success' }); setCreateOpen(false); setForm({ routeDate: '', logisticsProviderId: '', vehicleNo: '', driverName: '', driverPhone: '', totalStops: '', totalWeight: '', totalCost: '' }); loadData();
    });
  };
  const handleStatus = (id, status) => { api.put(`/logistics/routes/${id}/status`, { status }).then(() => { setSnack({ open: true, msg: '状态更新', sev: 'success' }); loadData(); }); };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">配送路线</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>新建路线</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow><TableCell>路线号</TableCell><TableCell>日期</TableCell><TableCell>承运商</TableCell><TableCell>车牌</TableCell><TableCell>司机</TableCell><TableCell>停靠站</TableCell><TableCell>总重量</TableCell><TableCell>总成本</TableCell><TableCell>运单数</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell></TableRow></TableHead>
          <TableBody>
            {list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.routeNo}</TableCell>
                <TableCell>{new Date(row.routeDate).toLocaleDateString()}</TableCell>
                <TableCell>{row.logisticsProvider?.name || '-'}</TableCell>
                <TableCell>{row.vehicleNo || '-'}</TableCell>
                <TableCell>{row.driverName || '-'}</TableCell>
                <TableCell>{row.totalStops}</TableCell>
                <TableCell>{Number(row.totalWeight)}kg</TableCell>
                <TableCell>{Number(row.totalCost).toFixed(2)}</TableCell>
                <TableCell>{row._count?.waybills || 0}</TableCell>
                <TableCell><Chip label={STATUS_MAP[row.status]?.label || row.status} size="small" color={STATUS_MAP[row.status]?.color || 'default'} /></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {row.status === 'PLANNED' && <Button size="small" variant="contained" onClick={() => handleStatus(row.id, 'IN_PROGRESS')} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>出发</Button>}
                    {row.status === 'IN_PROGRESS' && <Button size="small" variant="contained" color="success" onClick={() => handleStatus(row.id, 'COMPLETED')} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>完成</Button>}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!list.length && <TableRow><TableCell colSpan={11} align="center">暂无数据</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建配送路线</DialogTitle>
        <DialogContent><Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}><TextField label="路线日期" type="date" fullWidth size="small" value={form.routeDate} onChange={(e) => setForm({ ...form, routeDate: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>承运商</InputLabel><Select value={form.logisticsProviderId} onChange={(e) => setForm({ ...form, logisticsProviderId: e.target.value })} label="承运商"><MenuItem value="">无</MenuItem>{providers.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6}><TextField label="车牌号" fullWidth size="small" value={form.vehicleNo} onChange={(e) => setForm({ ...form, vehicleNo: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="司机" fullWidth size="small" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="司机电话" fullWidth size="small" value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="停靠站数" type="number" fullWidth size="small" value={form.totalStops} onChange={(e) => setForm({ ...form, totalStops: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="总重量(kg)" type="number" fullWidth size="small" value={form.totalWeight} onChange={(e) => setForm({ ...form, totalWeight: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="总成本" type="number" fullWidth size="small" value={form.totalCost} onChange={(e) => setForm({ ...form, totalCost: e.target.value })} /></Grid>
        </Grid></DialogContent>
        <DialogActions><Button onClick={() => setCreateOpen(false)}>取消</Button><Button variant="contained" onClick={handleCreate}>创建</Button></DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}><Alert severity={snack.sev}>{snack.msg}</Alert></Snackbar>
    </Box>
  );
}
