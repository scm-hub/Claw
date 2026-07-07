import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Select, MenuItem, InputLabel, FormControl,
} from '@mui/material';
import { Add, Calculate, Search } from '@mui/icons-material';
import { api } from '../../lib/api';

export default function StandardCostList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [materials, setMaterials] = useState([]);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcForm, setCalcForm] = useState({ materialId: '', purchaseCost: '', transportAllocCost: '', packagingCost: '', transportCost: '' });
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const loadData = () => {
    api.get('/cost/standard', { params: { page, pageSize: 20, keyword } }).then((res) => {
      setList(res.data.list || []); setTotal(res.data.total || 0);
    });
  };

  useEffect(() => { loadData(); }, [page]);
  useEffect(() => {
    api.get('/master/materials', { params: { page: 1, pageSize: 999 } }).then((res) => setMaterials(res.data.list || []));
  }, []);

  const handleCalc = () => {
    if (!calcForm.materialId) { setSnack({ open: true, msg: '请选择物料', sev: 'error' }); return; }
    const payload = {
      materialId: calcForm.materialId,
      purchaseCost: calcForm.purchaseCost ? Number(calcForm.purchaseCost) : undefined,
      transportAllocCost: calcForm.transportAllocCost ? Number(calcForm.transportAllocCost) : undefined,
      packagingCost: calcForm.packagingCost ? Number(calcForm.packagingCost) : undefined,
      transportCost: calcForm.transportCost ? Number(calcForm.transportCost) : undefined,
    };
    api.post('/cost/standard/calculate', payload).then(() => {
      setSnack({ open: true, msg: '标准成本计算成功', sev: 'success' });
      setCalcOpen(false);
      setCalcForm({ materialId: '', purchaseCost: '', transportAllocCost: '', packagingCost: '', transportCost: '' });
      loadData();
    }).catch((e) => setSnack({ open: true, msg: e.response?.data?.message || '计算失败', sev: 'error' }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">标准成本</Typography>
        <Button variant="contained" startIcon={<Calculate />} onClick={() => setCalcOpen(true)}>计算标准成本</Button>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <TextField size="small" placeholder="搜索物料名称" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadData()} />
        <Button variant="outlined" startIcon={<Search />} onClick={loadData}>搜索</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>物料编码</TableCell><TableCell>物料名称</TableCell><TableCell>采购成本</TableCell><TableCell>运输分摊</TableCell><TableCell>包装成本</TableCell><TableCell>运输成本</TableCell><TableCell>总成本</TableCell><TableCell>计算日期</TableCell><TableCell>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.material?.code || '-'}</TableCell>
                <TableCell>{row.material?.name || '-'}</TableCell>
                <TableCell>{Number(row.purchaseCost).toFixed(2)}</TableCell>
                <TableCell>{Number(row.transportAllocCost).toFixed(2)}</TableCell>
                <TableCell>{Number(row.packagingCost).toFixed(2)}</TableCell>
                <TableCell>{Number(row.transportCost).toFixed(2)}</TableCell>
                <TableCell><Typography variant="body2" fontWeight="bold" color="primary">{Number(row.totalCost).toFixed(2)}</Typography></TableCell>
                <TableCell>{new Date(row.calcDate).toLocaleDateString()}</TableCell>
                <TableCell><Chip label={row.status} size="small" color={row.status === 'ACTIVE' ? 'success' : 'default'} /></TableCell>
              </TableRow>
            ))}
            {!list.length && <TableRow><TableCell colSpan={9} align="center">暂无数据</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={calcOpen} onClose={() => setCalcOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>计算标准成本</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>选择物料</InputLabel>
                <Select value={calcForm.materialId} onChange={(e) => setCalcForm({ ...calcForm, materialId: e.target.value })} label="选择物料">
                  {materials.map((m) => <MenuItem key={m.id} value={m.id}>{m.code} - {m.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}><TextField label="采购成本（留空用最近入库价）" type="number" fullWidth size="small" value={calcForm.purchaseCost} onChange={(e) => setCalcForm({ ...calcForm, purchaseCost: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField label="运输分摊成本" type="number" fullWidth size="small" value={calcForm.transportAllocCost} onChange={(e) => setCalcForm({ ...calcForm, transportAllocCost: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField label="包装成本" type="number" fullWidth size="small" value={calcForm.packagingCost} onChange={(e) => setCalcForm({ ...calcForm, packagingCost: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField label="运输成本" type="number" fullWidth size="small" value={calcForm.transportCost} onChange={(e) => setCalcForm({ ...calcForm, transportCost: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setCalcOpen(false)}>取消</Button><Button variant="contained" onClick={handleCalc}>计算并保存</Button></DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}><Alert severity={snack.sev}>{snack.msg}</Alert></Snackbar>
    </Box>
  );
}
