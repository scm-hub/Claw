import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, InputAdornment, MenuItem, TablePagination, LinearProgress,
} from '@mui/material';
import { Search, Refresh } from '@mui/icons-material';
import api from '../../lib/api';

export default function InventoryList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page + 1, pageSize: rowsPerPage });
      if (keyword) params.set('keyword', keyword);
      if (warehouseId) params.set('warehouseId', warehouseId);
      const res = await api.get(`/wms/inventory?${params}`);
      setList(res.data?.list || []);
      setTotal(res.data?.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, rowsPerPage, keyword, warehouseId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    api.get('/master/warehouses').then(res => setWarehouses(res.data || [])).catch(() => {});
  }, []);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>库存台账</Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <TextField size="small" placeholder="物料名称/编码" value={keyword} onChange={e => setKeyword(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
          </Grid>
          <Grid item>
            <TextField size="small" select label="仓库" value={warehouseId} onChange={e => setWarehouseId(e.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="">全部仓库</MenuItem>
              {warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item><Button variant="contained" onClick={loadData} startIcon={<Search />}>查询</Button></Grid>
          <Grid item><Button variant="outlined" onClick={loadData} startIcon={<Refresh />}>刷新</Button></Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>物料编码</TableCell><TableCell>物料名称</TableCell><TableCell>规格</TableCell>
              <TableCell>仓库</TableCell><TableCell>物理库存</TableCell><TableCell>锁定库存</TableCell>
              <TableCell>可用库存</TableCell><TableCell>库存状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((inv) => {
              const available = inv.availableQty ?? (inv.qty - (inv.lockedQty || 0));
              const ratio = inv.qty > 0 ? (inv.lockedQty / inv.qty) * 100 : 0;
              const lowStock = available <= 10;
              return (
                <TableRow key={inv.id} hover>
                  <TableCell>{inv.material?.code}</TableCell>
                  <TableCell>{inv.material?.name}</TableCell>
                  <TableCell>{inv.material?.spec || '-'}</TableCell>
                  <TableCell>{inv.warehouse?.name}</TableCell>
                  <TableCell>{Number(inv.qty).toFixed(1)} {inv.material?.unit}</TableCell>
                  <TableCell>
                    {inv.lockedQty > 0 ? (
                      <Chip label={Number(inv.lockedQty).toFixed(1)} size="small" color="warning" variant="outlined" />
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700, color: lowStock ? 'error.main' : 'success.main' }}>
                      {Number(available).toFixed(1)} {inv.material?.unit}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {inv.lockedQty > 0 && (
                      <Box sx={{ minWidth: 80 }}>
                        <LinearProgress
                          variant="determinate"
                          value={ratio}
                          color={ratio > 80 ? 'error' : ratio > 50 ? 'warning' : 'primary'}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" color="textSecondary">已占用 {ratio.toFixed(0)}%</Typography>
                      </Box>
                    )}
                    {inv.lockedQty === 0 && lowStock && <Chip label="低库存" color="error" size="small" />}
                    {inv.lockedQty === 0 && !lowStock && <Chip label="正常" color="success" size="small" variant="outlined" />}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(e, p) => setPage(p)}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          labelRowsPerPage="每页行数："
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count !== -1 ? count : '超过'} 条`}
        />
      </TableContainer>
    </Box>
  );
}
