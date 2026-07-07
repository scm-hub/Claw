import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Select, MenuItem, InputLabel, FormControl,
} from '@mui/material';
import { Add, Edit, Description } from '@mui/icons-material';
import { api } from '../lib/api';

const CONTRACT_TYPES = { PURCHASE: '采购合同', SALES: '销售合同', LOGISTICS: '物流合同', SERVICE: '服务合同', OTHER: '其他' };
const STATUS_MAP = { ACTIVE: { label: '生效中', color: 'success' }, EXPIRED: { label: '已过期', color: 'default' }, TERMINATED: { label: '已终止', color: 'error' } };

export default function ContractList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [suppliers, setSuppliers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ title: '', contractType: 'PURCHASE', partyType: 'SUPPLIER', supplierId: '', logisticsId: '', signDate: '', effectiveFrom: '', effectiveTo: '', amount: '', attachmentUrl: '' });
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const loadData = () => { api.get('/contract', { params: { page, pageSize: 20 } }).then((res) => { setList(res.data.list || []); setTotal(res.data.total || 0); }); };
  useEffect(() => {
    loadData();
    api.get('/master/suppliers', { params: { page: 1, pageSize: 999 } }).then((res) => setSuppliers(res.data.list || []));
    api.get('/logistics/providers').then((res) => setProviders(res.data || []));
  }, [page]);

  const handleSave = () => {
    if (!form.title || !form.contractType) { setSnack({ open: true, msg: '标题和类型必填', sev: 'error' }); return; }
    const payload = { ...form, amount: Number(form.amount) || 0, signDate: form.signDate || new Date().toISOString().slice(0, 10), effectiveFrom: form.effectiveFrom || new Date().toISOString().slice(0, 10) };
    if (editId) { api.put(`/contract/${editId}`, payload).then(() => { setSnack({ open: true, msg: '更新成功', sev: 'success' }); closeDialog(); loadData(); }); }
    else { api.post('/contract', payload).then(() => { setSnack({ open: true, msg: '创建成功', sev: 'success' }); closeDialog(); loadData(); }); }
  };
  const handleDelete = (id) => { if (confirm('确认终止该合同？')) { api.delete(`/contract/${id}`).then(() => { setSnack({ open: true, msg: '已终止', sev: 'success' }); loadData(); }); } };
  const closeDialog = () => { setDialogOpen(false); setEditId(null); setForm({ title: '', contractType: 'PURCHASE', partyType: 'SUPPLIER', supplierId: '', logisticsId: '', signDate: '', effectiveFrom: '', effectiveTo: '', amount: '', attachmentUrl: '' }); };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">合同管理</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setForm({ title: '', contractType: 'PURCHASE', partyType: 'SUPPLIER', supplierId: '', logisticsId: '', signDate: new Date().toISOString().slice(0, 10), effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: '', amount: '', attachmentUrl: '' }); setDialogOpen(true); }}>新增合同</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow><TableCell>合同号</TableCell><TableCell>标题</TableCell><TableCell>类型</TableCell><TableCell>关联方</TableCell><TableCell>金额</TableCell><TableCell>签订日期</TableCell><TableCell>有效期至</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell></TableRow></TableHead>
          <TableBody>
            {list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.contractNo}</TableCell>
                <TableCell>{row.title}</TableCell>
                <TableCell><Chip label={CONTRACT_TYPES[row.contractType] || row.contractType} size="small" variant="outlined" /></TableCell>
                <TableCell>{row.supplier?.name || row.logistics?.name || row.partyId}</TableCell>
                <TableCell>{Number(row.amount).toLocaleString()}</TableCell>
                <TableCell>{new Date(row.signDate).toLocaleDateString()}</TableCell>
                <TableCell>{row.effectiveTo ? new Date(row.effectiveTo).toLocaleDateString() : '长期'}</TableCell>
                <TableCell><Chip label={STATUS_MAP[row.status]?.label || row.status} size="small" color={STATUS_MAP[row.status]?.color || 'default'} /></TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => { setEditId(row.id); setForm({ title: row.title, contractType: row.contractType, partyType: row.partyType, supplierId: row.supplierId || '', logisticsId: row.logisticsId || '', signDate: row.signDate ? new Date(row.signDate).toISOString().slice(0, 10) : '', effectiveFrom: row.effectiveFrom ? new Date(row.effectiveFrom).toISOString().slice(0, 10) : '', effectiveTo: row.effectiveTo ? new Date(row.effectiveTo).toISOString().slice(0, 10) : '', amount: String(row.amount), attachmentUrl: row.attachmentUrl || '' }); setDialogOpen(true); }}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}><Description fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!list.length && <TableRow><TableCell colSpan={9} align="center">暂无数据</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? '编辑合同' : '新增合同'}</DialogTitle>
        <DialogContent><Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}><TextField label="合同标题" fullWidth size="small" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Grid>
          <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>合同类型</InputLabel><Select value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })} label="合同类型">{Object.entries(CONTRACT_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6}><TextField label="金额" type="number" fullWidth size="small" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Grid>
          {form.contractType === 'LOGISTICS' ? (
            <Grid item xs={12}><FormControl fullWidth size="small"><InputLabel>承运商</InputLabel><Select value={form.logisticsId} onChange={(e) => setForm({ ...form, logisticsId: e.target.value, partyType: 'LOGISTICS' })} label="承运商">{providers.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</Select></FormControl></Grid>
          ) : (
            <Grid item xs={12}><FormControl fullWidth size="small"><InputLabel>供应商</InputLabel><Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value, partyType: 'SUPPLIER' })} label="供应商">{suppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</Select></FormControl></Grid>
          )}
          <Grid item xs={4}><TextField label="签订日期" type="date" fullWidth size="small" value={form.signDate} onChange={(e) => setForm({ ...form, signDate: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={4}><TextField label="生效日期" type="date" fullWidth size="small" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={4}><TextField label="到期日期" type="date" fullWidth size="small" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
        </Grid></DialogContent>
        <DialogActions><Button onClick={closeDialog}>取消</Button><Button variant="contained" onClick={handleSave}>保存</Button></DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}><Alert severity={snack.sev}>{snack.msg}</Alert></Snackbar>
    </Box>
  );
}
