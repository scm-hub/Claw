import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, TablePagination, ToggleButtonGroup, ToggleButton, MenuItem, TextField,
} from '@mui/material';
import { Refresh, CheckCircle, Cancel } from '@mui/icons-material';
import api from '../../lib/api';

const LEVEL_LABEL = { RED: { label: '低于安全库存', color: 'error' }, ORANGE: { label: '超最高库存', color: 'warning' }, YELLOW: { label: '达预警水位', color: 'info' } };
const STATUS_LABEL = { ACTIVE: { label: '待处理', color: 'error' }, PROCESSING: { label: '处理中', color: 'warning' }, RESOLVED: { label: '已恢复', color: 'success' }, DISMISSED: { label: '已忽略', color: 'default' } };

export default function StockAlertList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, pageSize };
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouseId = warehouseFilter;
      const res = await api.get('/master/stock-alerts', { params });
      setList(res.data?.list || []);
      setTotal(res.data?.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, pageSize, statusFilter, warehouseFilter]);

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    api.get('/master/warehouses').then(r => setWarehouses(r.data || [])).catch(() => {});
  }, []);

  const handleProcess = async (id, status, resolution) => {
    try {
      await api.patch(`/master/stock-alerts/${id}/process`, { status, resolution });
      loadList();
    } catch { /* ignore */ }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>库存预警管理</Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <ToggleButtonGroup size="small" value={statusFilter} exclusive onChange={(_, v) => { setStatusFilter(v || ''); setPage(0); }}>
          <ToggleButton value="">全部</ToggleButton>
          <ToggleButton value="ACTIVE">待处理</ToggleButton>
          <ToggleButton value="PROCESSING">处理中</ToggleButton>
          <ToggleButton value="RESOLVED">已恢复</ToggleButton>
          <ToggleButton value="DISMISSED">已忽略</ToggleButton>
        </ToggleButtonGroup>
        <TextField select size="small" label="仓库" value={warehouseFilter}
          onChange={(e) => { setWarehouseFilter(e.target.value); setPage(0); }}
          sx={{ width: 150 }}>
          <MenuItem value="">全部仓库</MenuItem>
          {warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        <Button startIcon={<Refresh />} onClick={loadList}>刷新</Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>预警时间</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>物料</TableCell>
              <TableCell>仓库</TableCell>
              <TableCell>当前库存</TableCell>
              <TableCell>阈值</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>处理结果</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3 }}>加载中...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>暂无预警记录</TableCell></TableRow>
            ) : list.map(row => {
              const lvlCfg = LEVEL_LABEL[row.level] || {};
              const stCfg = STATUS_LABEL[row.status] || {};
              return (
                <TableRow key={row.id}>
                  <TableCell>{new Date(row.createdAt).toLocaleString('zh-CN')}</TableCell>
                  <TableCell><Chip label={lvlCfg.label} size="small" color={lvlCfg.color} /></TableCell>
                  <TableCell>{row.material?.name || '-'}</TableCell>
                  <TableCell>{row.warehouse?.name || '-'}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{row.currentQty?.toFixed(2)}</TableCell>
                  <TableCell>{row.thresholdQty?.toFixed(2)}</TableCell>
                  <TableCell><Chip label={stCfg.label} size="small" color={stCfg.color} /></TableCell>
                  <TableCell sx={{ maxWidth: 200, fontSize: '0.8rem' }}>
                    {row.resolution || '-'}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {row.status === 'ACTIVE' && (
                        <>
                          <Button size="small" variant="contained" color="warning"
                            sx={{ minWidth: 56, fontSize: '0.7rem', py: 0.25, borderRadius: 10 }}
                            onClick={() => handleProcess(row.id, 'PROCESSING')}>
                            处理
                          </Button>
                          <Button size="small" variant="contained"
                            sx={{ minWidth: 56, fontSize: '0.7rem', py: 0.25, borderRadius: 10 }}
                            onClick={() => handleProcess(row.id, 'DISMISSED', '人工忽略')}>
                            忽略
                          </Button>
                        </>
                      )}
                      {row.status === 'PROCESSING' && (
                        <Button size="small" variant="contained" color="success"
                          sx={{ minWidth: 56, fontSize: '0.7rem', py: 0.25, borderRadius: 10 }}
                          onClick={() => handleProcess(row.id, 'RESOLVED', '已通过补货/调拨解决')}>
                          解决
                        </Button>
                      )}
                      {['RESOLVED', 'DISMISSED'].includes(row.status) && (
                        <Chip label="完成" size="small" color="success" variant="outlined" />
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination component={Paper} sx={{ mt: 0 }}
        count={total} page={page} onPageChange={(_, p) => setPage(p)}
        rowsPerPage={pageSize} onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
        labelRowsPerPage="每页" rowsPerPageOptions={[10, 20, 50]}
      />
    </Box>
  );
}
