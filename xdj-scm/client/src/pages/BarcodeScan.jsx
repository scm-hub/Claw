import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Snackbar, Alert, Select, MenuItem, InputLabel, FormControl,
} from '@mui/material';
import { QrCodeScanner, Add, Refresh } from '@mui/icons-material';
import { api } from '../lib/api';

const ACTION_TYPES = { INBOUND: '入库', OUTBOUND: '出库', GENERATE: '生成条码', CHECK: '查验', TRANSFER: '调拨' };
const BARCODE_TYPES = { MATERIAL: '物料', BATCH: '批次', LOCATION: '库位', PRODUCT: '产品' };

export default function BarcodeScan() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [materials, setMaterials] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [scanForm, setScanForm] = useState({ barcode: '', barcodeType: 'MATERIAL', actionType: 'INBOUND', materialId: '', batchId: '', warehouseId: '', qty: '1' });
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const loadData = () => { api.get('/barcode/records', { params: { page, pageSize: 30 } }).then((res) => { setList(res.data.list || []); setTotal(res.data.total || 0); }); };
  useEffect(() => {
    loadData();
    api.get('/master/materials', { params: { page: 1, pageSize: 999 } }).then((res) => setMaterials(res.data.list || []));
    api.get('/master/warehouses').then((res) => setWarehouses(res.data || []));
  }, [page]);

  const handleScan = () => {
    if (!scanForm.barcode || !scanForm.actionType) { setSnack({ open: true, msg: '条码和操作类型必填', sev: 'error' }); return; }
    api.post('/barcode/scan', { ...scanForm, qty: Number(scanForm.qty) || 1 }).then((res) => {
      const r = res.data;
      setSnack({ open: true, msg: `扫码${ACTION_TYPES[scanForm.actionType]}成功${r.inventoryUpdated ? '（库存已更新）' : ''}`, sev: 'success' });
      setScanForm({ ...scanForm, barcode: '' });
      loadData();
    }).catch((e) => setSnack({ open: true, msg: e.response?.data?.message || '扫码失败', sev: 'error' }));
  };

  const handleGenerate = () => {
    api.post('/barcode/generate', { materialId: scanForm.materialId || undefined }).then((res) => {
      setSnack({ open: true, msg: `条码已生成: ${res.data.barcode}`, sev: 'success' });
      setScanForm({ ...scanForm, barcode: res.data.barcode });
    });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>扫码作业</Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}><TextField label="条码" fullWidth size="small" value={scanForm.barcode} onChange={(e) => setScanForm({ ...scanForm, barcode: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleScan()} autoFocus /></Grid>
          <Grid item xs={6} md={2}><FormControl fullWidth size="small"><InputLabel>条码类型</InputLabel><Select value={scanForm.barcodeType} onChange={(e) => setScanForm({ ...scanForm, barcodeType: e.target.value })} label="条码类型">{Object.entries(BARCODE_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6} md={2}><FormControl fullWidth size="small"><InputLabel>操作类型</InputLabel><Select value={scanForm.actionType} onChange={(e) => setScanForm({ ...scanForm, actionType: e.target.value })} label="操作类型">{Object.entries(ACTION_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6} md={2}><FormControl fullWidth size="small"><InputLabel>物料</InputLabel><Select value={scanForm.materialId} onChange={(e) => setScanForm({ ...scanForm, materialId: e.target.value })} label="物料"><MenuItem value="">无</MenuItem>{materials.map((m) => <MenuItem key={m.id} value={m.id}>{m.code} - {m.name}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6} md={1}><TextField label="数量" type="number" fullWidth size="small" value={scanForm.qty} onChange={(e) => setScanForm({ ...scanForm, qty: e.target.value })} /></Grid>
          <Grid item xs={12} md={2}><Box sx={{ display: 'flex', gap: 1 }}><Button variant="contained" startIcon={<QrCodeScanner />} onClick={handleScan} fullWidth>扫码</Button><Button variant="outlined" onClick={handleGenerate}><Add /></Button></Box></Grid>
        </Grid>
        {(scanForm.actionType === 'INBOUND' || scanForm.actionType === 'OUTBOUND') && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6} md={3}><FormControl fullWidth size="small"><InputLabel>仓库</InputLabel><Select value={scanForm.warehouseId} onChange={(e) => setScanForm({ ...scanForm, warehouseId: e.target.value })} label="仓库">{warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}</Select></FormControl></Grid>
          </Grid>
        )}
      </Paper>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6">扫码记录</Typography>
        <Button startIcon={<Refresh />} onClick={loadData}>刷新</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow><TableCell>条码</TableCell><TableCell>类型</TableCell><TableCell>操作</TableCell><TableCell>物料</TableCell><TableCell>数量</TableCell><TableCell>操作人</TableCell><TableCell>时间</TableCell></TableRow></TableHead>
          <TableBody>
            {list.map((row) => (
              <TableRow key={row.id}>
                <TableCell><Typography variant="body2" fontFamily="monospace">{row.barcode}</Typography></TableCell>
                <TableCell><Chip label={BARCODE_TYPES[row.barcodeType] || row.barcodeType} size="small" variant="outlined" /></TableCell>
                <TableCell><Chip label={ACTION_TYPES[row.actionType] || row.actionType} size="small" color={row.actionType === 'INBOUND' ? 'success' : row.actionType === 'OUTBOUND' ? 'warning' : 'default'} /></TableCell>
                <TableCell>{row.material?.name || '-'}</TableCell>
                <TableCell>{row.qty}</TableCell>
                <TableCell>{row.operator?.name || '-'}</TableCell>
                <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {!list.length && <TableRow><TableCell colSpan={7} align="center">暂无扫码记录</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}><Alert severity={snack.sev}>{snack.msg}</Alert></Snackbar>
    </Box>
  );
}
