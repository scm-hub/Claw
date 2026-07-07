import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, InputAdornment,
} from '@mui/material';
import { Add, Edit, Delete, Search } from '@mui/icons-material';
import { api } from '../../lib/api';

export default function CostConfigList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ configKey: '', configName: '', configValue: '', unit: '', effectiveDate: '' });
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const loadData = () => {
    setLoading(true);
    api.get('/cost/config').then((res) => setList(res.data || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = () => {
    if (!form.configKey || !form.configName) { setSnack({ open: true, msg: '配置Key和名称必填', sev: 'error' }); return; }
    const payload = { ...form, configValue: Number(form.configValue) || 0, effectiveDate: form.effectiveDate || new Date().toISOString().slice(0, 10) };
    if (editId) {
      api.put(`/cost/config/${editId}`, payload).then(() => { setSnack({ open: true, msg: '更新成功', sev: 'success' }); closeDialog(); loadData(); });
    } else {
      api.post('/cost/config', payload).then(() => { setSnack({ open: true, msg: '创建成功', sev: 'success' }); closeDialog(); loadData(); }).catch((e) => setSnack({ open: true, msg: e.response?.data?.message || '创建失败', sev: 'error' }));
    }
  };

  const handleDelete = (id) => {
    if (!confirm('确认删除该配置？')) return;
    api.delete(`/cost/config/${id}`).then(() => { setSnack({ open: true, msg: '已删除', sev: 'success' }); loadData(); });
  };

  const closeDialog = () => { setDialogOpen(false); setEditId(null); setForm({ configKey: '', configName: '', configValue: '', unit: '', effectiveDate: '' }); };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">成本配置</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setForm({ configKey: '', configName: '', configValue: '', unit: '', effectiveDate: new Date().toISOString().slice(0, 10) }); setDialogOpen(true); }}>新增配置</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>配置Key</TableCell><TableCell>配置名称</TableCell><TableCell>数值</TableCell><TableCell>单位</TableCell><TableCell>生效日期</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((row) => (
              <TableRow key={row.id}>
                <TableCell><Typography variant="body2" fontFamily="monospace">{row.configKey}</Typography></TableCell>
                <TableCell>{row.configName}</TableCell>
                <TableCell>{Number(row.configValue).toLocaleString()}</TableCell>
                <TableCell>{row.unit || '-'}</TableCell>
                <TableCell>{row.effectiveDate ? new Date(row.effectiveDate).toLocaleDateString() : '-'}</TableCell>
                <TableCell><Chip label={row.status} size="small" color={row.status === 'ACTIVE' ? 'success' : 'default'} /></TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => { setEditId(row.id); setForm({ configKey: row.configKey, configName: row.configName, configValue: String(row.configValue), unit: row.unit || '', effectiveDate: row.effectiveDate ? new Date(row.effectiveDate).toISOString().slice(0, 10) : '' }); setDialogOpen(true); }}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}><Delete fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!list.length && <TableRow><TableCell colSpan={7} align="center">暂无数据</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? '编辑配置' : '新增配置'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField label="配置Key" fullWidth value={form.configKey} onChange={(e) => setForm({ ...form, configKey: e.target.value })} disabled={!!editId} size="small" /></Grid>
            <Grid item xs={12}><TextField label="配置名称" fullWidth value={form.configName} onChange={(e) => setForm({ ...form, configName: e.target.value })} size="small" /></Grid>
            <Grid item xs={6}><TextField label="数值" type="number" fullWidth value={form.configValue} onChange={(e) => setForm({ ...form, configValue: e.target.value })} size="small" /></Grid>
            <Grid item xs={6}><TextField label="单位" fullWidth value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} size="small" /></Grid>
            <Grid item xs={12}><TextField label="生效日期" type="date" fullWidth value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} size="small" InputLabelProps={{ shrink: true }} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={closeDialog}>取消</Button><Button variant="contained" onClick={handleSave}>保存</Button></DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}><Alert severity={snack.sev}>{snack.msg}</Alert></Snackbar>
    </Box>
  );
}
