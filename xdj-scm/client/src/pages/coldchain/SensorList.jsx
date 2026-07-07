import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Select, MenuItem, InputLabel, FormControl,
} from '@mui/material';
import { Add, Edit, Sensors } from '@mui/icons-material';
import { api } from '../../lib/api';

export default function SensorList() {
  const [list, setList] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ sensorCode: '', name: '', warehouseId: '', zoneId: '', sensorType: 'TEMP_HUMIDITY', protocol: 'MQTT', deviceAddress: '', tempMin: '', tempMax: '', humidityMin: '', humidityMax: '' });
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const loadData = () => { api.get('/coldchain/sensors').then((res) => setList(res.data || [])); };
  useEffect(() => {
    loadData();
    api.get('/master/warehouses').then((res) => setWarehouses(res.data || []));
  }, []);

  const handleSave = () => {
    const payload = { ...form, tempMin: form.tempMin ? Number(form.tempMin) : null, tempMax: form.tempMax ? Number(form.tempMax) : null, humidityMin: form.humidityMin ? Number(form.humidityMin) : null, humidityMax: form.humidityMax ? Number(form.humidityMax) : null, warehouseId: form.warehouseId || null };
    if (editId) { api.put(`/coldchain/sensors/${editId}`, payload).then(() => { setSnack({ open: true, msg: '更新成功', sev: 'success' }); closeDialog(); loadData(); }); }
    else { api.post('/coldchain/sensors', payload).then(() => { setSnack({ open: true, msg: '创建成功', sev: 'success' }); closeDialog(); loadData(); }).catch((e) => setSnack({ open: true, msg: e.response?.data?.message || '失败', sev: 'error' })); }
  };
  const handleDelete = (id) => { if (confirm('确认停用？')) { api.delete(`/coldchain/sensors/${id}`).then(() => { setSnack({ open: true, msg: '已停用', sev: 'success' }); loadData(); }); } };
  const closeDialog = () => { setDialogOpen(false); setEditId(null); setForm({ sensorCode: '', name: '', warehouseId: '', zoneId: '', sensorType: 'TEMP_HUMIDITY', protocol: 'MQTT', deviceAddress: '', tempMin: '', tempMax: '', humidityMin: '', humidityMax: '' }); };

  // 模拟上报温度
  const handleSimulate = (id) => {
    const temp = (Math.random() * 30 - 5).toFixed(1);
    const humidity = (Math.random() * 40 + 30).toFixed(1);
    api.post('/coldchain/records', { sensorId: id, temperature: Number(temp), humidity: Number(humidity) }).then(() => { setSnack({ open: true, msg: `已模拟上报: ${temp}°C / ${humidity}%`, sev: 'success' }); loadData(); }).catch((e) => setSnack({ open: true, msg: e.response?.data?.message || '上报失败', sev: 'error' }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">传感器管理</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setForm({ sensorCode: '', name: '', warehouseId: '', zoneId: '', sensorType: 'TEMP_HUMIDITY', protocol: 'MQTT', deviceAddress: '', tempMin: '', tempMax: '', humidityMin: '', humidityMax: '' }); setDialogOpen(true); }}>新增传感器</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow><TableCell>编码</TableCell><TableCell>名称</TableCell><TableCell>仓库</TableCell><TableCell>类型</TableCell><TableCell>温度范围</TableCell><TableCell>最后读数</TableCell><TableCell>告警数</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell></TableRow></TableHead>
          <TableBody>
            {list.map((row) => (
              <TableRow key={row.id}>
                <TableCell><Typography variant="body2" fontFamily="monospace">{row.sensorCode}</Typography></TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.warehouse?.name || '-'}</TableCell>
                <TableCell><Chip label={row.sensorType} size="small" variant="outlined" /></TableCell>
                <TableCell>{row.tempMin ? `${row.tempMin}~${row.tempMax}°C` : '-'}</TableCell>
                <TableCell>{row.lastReadingAt ? new Date(row.lastReadingAt).toLocaleString() : '从未'}</TableCell>
                <TableCell>{row._count?.temperatureAlerts || 0}</TableCell>
                <TableCell><Chip label={row.status} size="small" color={row.status === 'ACTIVE' ? 'success' : 'default'} /></TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleSimulate(row.id)}>模拟上报</Button>
                  <IconButton size="small" onClick={() => { setEditId(row.id); setForm({ sensorCode: row.sensorCode, name: row.name, warehouseId: row.warehouseId || '', zoneId: row.zoneId || '', sensorType: row.sensorType, protocol: row.protocol, deviceAddress: row.deviceAddress || '', tempMin: row.tempMin ? String(row.tempMin) : '', tempMax: row.tempMax ? String(row.tempMax) : '', humidityMin: row.humidityMin ? String(row.humidityMin) : '', humidityMax: row.humidityMax ? String(row.humidityMax) : '' }); setDialogOpen(true); }}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}><Sensors fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!list.length && <TableRow><TableCell colSpan={9} align="center">暂无数据</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? '编辑传感器' : '新增传感器'}</DialogTitle>
        <DialogContent><Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}><TextField label="传感器编码" fullWidth size="small" value={form.sensorCode} onChange={(e) => setForm({ ...form, sensorCode: e.target.value })} disabled={!!editId} /></Grid>
          <Grid item xs={6}><TextField label="名称" fullWidth size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Grid>
          <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>仓库</InputLabel><Select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })} label="仓库"><MenuItem value="">无</MenuItem>{warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6}><TextField label="设备地址" fullWidth size="small" value={form.deviceAddress} onChange={(e) => setForm({ ...form, deviceAddress: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="温度下限" type="number" fullWidth size="small" value={form.tempMin} onChange={(e) => setForm({ ...form, tempMin: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="温度上限" type="number" fullWidth size="small" value={form.tempMax} onChange={(e) => setForm({ ...form, tempMax: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="湿度下限" type="number" fullWidth size="small" value={form.humidityMin} onChange={(e) => setForm({ ...form, humidityMin: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="湿度上限" type="number" fullWidth size="small" value={form.humidityMax} onChange={(e) => setForm({ ...form, humidityMax: e.target.value })} /></Grid>
        </Grid></DialogContent>
        <DialogActions><Button onClick={closeDialog}>取消</Button><Button variant="contained" onClick={handleSave}>保存</Button></DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}><Alert severity={snack.sev}>{snack.msg}</Alert></Snackbar>
    </Box>
  );
}
