import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Stack, Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, TablePagination, ToggleButtonGroup, ToggleButton, MenuItem, TextField, Grid,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import api from '../../lib/api';

const ALERT_TYPE_LABEL = { LOW_STOCK: '缺货预警', HIGH_STOCK: '积压预警', EXPIRY: '临期预警', APPROACHING: '逼近预警' };
const ALERT_TYPE_COLOR = { LOW_STOCK: 'error', HIGH_STOCK: 'warning', EXPIRY: 'secondary', APPROACHING: 'info' };

const SUBTYPE_LABEL = {
  YELLOW_LOW: { label: '缺货·黄', color: 'info' }, RED_LOW: { label: '缺货·红', color: 'error' },
  CRITICAL: { label: '缺货·特级', color: 'error' }, ORANGE_80: { label: '积压·橙', color: 'warning' },
  DEEP_RED: { label: '积压·深红', color: 'error' }, YELLOW_EXPIRY: { label: '临期·黄', color: 'secondary' },
  RED_EXPIRY: { label: '临期·红', color: 'error' },
};

const STATUS_LABEL = { ACTIVE: { label: '待处理', color: 'error' }, PROCESSING: { label: '处理中', color: 'warning' }, RESOLVED: { label: '已解决', color: 'success' }, DISMISSED: { label: '已忽略', color: 'default' } };
const STEP_LABEL = { VERIFY: '核查', DISPOSE: '处置', FOLLOW: '跟进', CLOSE: '核销' };

export default function StockAlertList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const [detailSteps, setDetailSteps] = useState([]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, pageSize };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.alertType = typeFilter;
      if (warehouseFilter) params.warehouseId = warehouseFilter;
      const res = await api.get('/master/stock-alerts', { params });
      setList(res.data?.list || []);
      setTotal(res.data?.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, pageSize, statusFilter, typeFilter, warehouseFilter]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { api.get('/master/warehouses').then(r => setWarehouses(r.data || [])).catch(() => {}); }, []);

  const handleProcess = async (id, status, resolution) => {
    try {
      await api.patch(`/master/stock-alerts/${id}/process`, {
        status, resolution,
        step: { step: status === 'RESOLVED' ? 'CLOSE' : 'DISPOSE', action: resolution || '状态更新' },
      });
      loadList();
    } catch { /* ignore */ }
  };

  const handleViewDetail = async (row) => {
    setDetailRow(row);
    setDetailOpen(true);
    try {
      const res = await api.get(`/master/stock-alerts/${row.id}/steps`);
      setDetailSteps(res.data || []);
    } catch { setDetailSteps([]); }
  };

  const getDeadline = (row) => {
    if (!row.deadline) return null;
    const diff = new Date(row.deadline).getTime() - Date.now();
    if (diff <= 0) return <Chip label="已超时" size="small" color="error" sx={{ animation: 'pulse 1s infinite' }} />;
    const h = Math.floor(diff / 3600000);
    if (h < 1) return <Chip label={`${Math.floor(diff / 60000)}分钟`} size="small" color="error" />;
    if (h < 24) return <Chip label={`${h}小时`} size="small" color="warning" />;
    return <Chip label={`${Math.floor(h / 24)}天`} size="small" color="info" variant="outlined" />;
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>库存预警管理</Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <ToggleButtonGroup size="small" value={statusFilter} exclusive onChange={(_, v) => { setStatusFilter(v || ''); setPage(0); }}>
          <ToggleButton value="">全部状态</ToggleButton>
          <ToggleButton value="ACTIVE">待处理</ToggleButton>
          <ToggleButton value="PROCESSING">处理中</ToggleButton>
          <ToggleButton value="RESOLVED">已解决</ToggleButton>
          <ToggleButton value="DISMISSED">已忽略</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup size="small" value={typeFilter} exclusive onChange={(_, v) => { setTypeFilter(v || ''); setPage(0); }}>
          <ToggleButton value="">全部类型</ToggleButton>
          <ToggleButton value="LOW_STOCK">缺货</ToggleButton>
          <ToggleButton value="HIGH_STOCK">积压</ToggleButton>
          <ToggleButton value="EXPIRY">临期</ToggleButton>
        </ToggleButtonGroup>
        <TextField select size="small" label="仓库" value={warehouseFilter}
          onChange={(e) => { setWarehouseFilter(e.target.value); setPage(0); }} sx={{ width: 150 }}>
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
              <TableCell>时间</TableCell><TableCell>类型</TableCell><TableCell>物料</TableCell>
              <TableCell>仓库</TableCell><TableCell>库存</TableCell><TableCell>阈值</TableCell>
              <TableCell>在途</TableCell><TableCell>截止</TableCell><TableCell>临期</TableCell>
              <TableCell>状态</TableCell><TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={11} align="center" sx={{ py: 3 }}>加载中...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={11} align="center" sx={{ py: 3, color: 'text.secondary' }}>暂无预警</TableCell></TableRow>
            ) : list.map(row => {
              const subCfg = SUBTYPE_LABEL[row.alertSubType] || {};
              const stCfg = STATUS_LABEL[row.status] || {};
              return (
                <TableRow key={row.id} sx={row.level === 'CRITICAL' ? { bgcolor: '#fff0f0' } : {}}>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{new Date(row.createdAt).toLocaleString('zh-CN')}</TableCell>
                  <TableCell><Chip label={subCfg.label || row.alertType} size="small" color={subCfg.color || 'default'} /></TableCell>
                  <TableCell>{row.material?.name || '-'}</TableCell>
                  <TableCell>{row.warehouse?.name || '-'}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{row.currentQty?.toFixed(2)}</TableCell>
                  <TableCell>{row.thresholdQty?.toFixed(2)}</TableCell>
                  <TableCell>{row.inTransitQty != null ? row.inTransitQty.toFixed(2) : '-'}</TableCell>
                  <TableCell>{getDeadline(row)}</TableCell>
                  <TableCell>
                    {row.remainingDays != null ? (
                      <Chip label={`${row.remainingDays}天`} size="small"
                        color={row.remainingDays <= 3 ? 'error' : 'warning'} />
                    ) : '-'}
                  </TableCell>
                  <TableCell><Chip label={stCfg.label} size="small" color={stCfg.color} /></TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" variant="contained"
                        sx={{ minWidth: 36, fontSize: '0.65rem', py: 0.25, borderRadius: 10 }}
                        onClick={() => handleViewDetail(row)}>详情</Button>
                      {row.status === 'ACTIVE' && (
                        <>
                          <Button size="small" variant="contained" color="warning"
                            sx={{ minWidth: 44, fontSize: '0.65rem', py: 0.25, borderRadius: 10 }}
                            onClick={() => handleProcess(row.id, 'PROCESSING')}>处理</Button>
                          <Button size="small" variant="contained"
                            sx={{ minWidth: 44, fontSize: '0.65rem', py: 0.25, borderRadius: 10 }}
                            onClick={() => handleProcess(row.id, 'DISMISSED', '人工忽略')}>忽略</Button>
                        </>
                      )}
                      {row.status === 'PROCESSING' && (
                        <Button size="small" variant="contained" color="success"
                          sx={{ minWidth: 44, fontSize: '0.65rem', py: 0.25, borderRadius: 10 }}
                          onClick={() => handleProcess(row.id, 'RESOLVED', '已解决')}>解决</Button>
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
        labelRowsPerPage="每页" rowsPerPageOptions={[10, 20, 50]} />

      {/* 详情+时间线弹窗 */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>预警详情 - {detailRow?.material?.name}</DialogTitle>
        <DialogContent>
          {detailRow && (
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={1}>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">仓库：{detailRow.warehouse?.name}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">当前库存：{detailRow.currentQty}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">在途：{detailRow.inTransitQty ?? '-'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">锁定：{detailRow.lockedQty ?? '-'}</Typography></Grid>
                {detailRow.batch && (
                  <Grid item xs={12}><Typography variant="caption" color="text.secondary">
                    批次：{detailRow.batch.batchNo} | 到期：{detailRow.expiryDate ? new Date(detailRow.expiryDate).toLocaleDateString('zh-CN') : '-'} | 剩余：{detailRow.remainingDays}天
                  </Typography></Grid>
                )}
              </Grid>
            </Box>
          )}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>处置时间线</Typography>
          {detailSteps.length === 0 && <Typography variant="body2" color="text.secondary">暂无处置记录</Typography>}
          {detailSteps.map((s, i) => (
            <Box key={i} sx={{ display: 'flex', mb: i < detailSteps.length - 1 ? 1 : 0 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 1.5 }}>
                <Box sx={{
                  width: 10, height: 10, borderRadius: '50%',
                  bgcolor: s.step === 'CLOSE' ? 'success.main' : s.step === 'VERIFY' ? 'info.main' : 'primary.main',
                }} />
                {i < detailSteps.length - 1 && <Box sx={{ width: 2, flex: 1, bgcolor: 'grey.300', my: 0.5 }} />}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {new Date(s.createdAt).toLocaleString('zh-CN')} · {STEP_LABEL[s.step] || s.step}
                </Typography>
                <Typography variant="body2">{s.action}</Typography>
                {s.result && <Typography variant="caption" color="text.secondary">{s.result}</Typography>}
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
