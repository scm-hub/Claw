import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Paper, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, MenuItem, LinearProgress, Tabs, Tab, TablePagination, Tooltip,
} from '@mui/material';
import { Refresh, Download } from '@mui/icons-material';
import api from '../../lib/api';

const STATUS_LABELS = { NORMAL: '正常', AGING: '库龄偏高', WARNING: '即将过期', CRITICAL: '紧急', EXPIRED: '已过期' };
const STATUS_COLORS = { NORMAL: 'success', AGING: 'info', WARNING: 'warning', CRITICAL: 'error', EXPIRED: 'error' };

export default function StockAgeAnalysis() {
  const [data, setData] = useState({ summary: {}, list: [], grouped: [] });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [materialId, setMaterialId] = useState('');
  const [materials, setMaterials] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (materialId) params.set('materialId', materialId);
      params.set('groupBy', 'material');
      const res = await api.get(`/traceability/stock-age?${params}`);
      setData(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [materialId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    api.get('/master/materials?page=1&pageSize=999').then((r) => setMaterials(r.data?.list || [])).catch(() => {});
  }, []);

  const s = data.summary || {};

  const summaryCards = [
    { label: '在库批次', value: s.totalBatches || 0, sub: `${s.totalQty || 0} 件`, color: '#1976d2' },
    { label: '已过期', value: s.expiredCount || 0, sub: `${s.expiredQty || 0} 件`, color: '#d32f2f' },
    { label: '紧急（7天内）', value: s.criticalCount || 0, sub: `${s.criticalQty || 0} 件`, color: '#f44336' },
    { label: '预警（30天内）', value: s.warningCount || 0, sub: `${s.warningQty || 0} 件`, color: '#ed6c02' },
    { label: '正常', value: s.normal?.length || 0, sub: `${(s.normal || []).reduce((a, b) => a + b.remainingQty, 0)} 件`, color: '#2e7d32' },
  ];

  const grouped = data.grouped || [];
  const detailList = data.list || [];
  const pagedGrouped = grouped.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const pagedDetail = detailList.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const currentList = tab === 0 ? pagedGrouped : pagedDetail;
  const totalCount = tab === 0 ? grouped.length : detailList.length;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>库龄分析</Typography>

      {/* 汇总卡片 */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {summaryCards.map((c) => (
          <Grid item xs={12} sm={6} md={2.4} key={c.label}>
            <Card sx={{ borderTop: `3px solid ${c.color}` }}>
              <CardContent>
                <Typography variant="caption" color="textSecondary">{c.label}</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: c.color }}>{c.value}</Typography>
                <Typography variant="body2" color="textSecondary">{c.sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 筛选 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <TextField size="small" select label="物料" value={materialId} onChange={(e) => { setMaterialId(e.target.value); setPage(0); }} sx={{ minWidth: 200 }}>
              <MenuItem value="">全部物料</MenuItem>
              {materials.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item><Button variant="contained" startIcon={<Refresh />} onClick={loadData}>刷新</Button></Grid>
        </Grid>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      <Tabs value={tab} onChange={(e, v) => { setTab(v); setPage(0); }} sx={{ mb: 1 }}>
        <Tab label="按物料汇总" />
        <Tab label="批次明细" />
      </Tabs>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {tab === 0 ? (
                <>
                  <TableCell>物料编码</TableCell><TableCell>物料名称</TableCell><TableCell>规格</TableCell>
                  <TableCell>批次数</TableCell><TableCell>在库总量</TableCell>
                  <TableCell>平均库龄(天)</TableCell><TableCell>最大库龄(天)</TableCell>
                  <TableCell>过期量</TableCell><TableCell>预警量</TableCell>
                </>
              ) : (
                <>
                  <TableCell>批次号</TableCell><TableCell>物料</TableCell><TableCell>供应商</TableCell>
                  <TableCell>剩余量</TableCell><TableCell>入库日期</TableCell><TableCell>库龄(天)</TableCell>
                  <TableCell>过期日期</TableCell><TableCell>剩余天数</TableCell><TableCell>库龄占比</TableCell><TableCell>状态</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {tab === 0 ? (
              pagedGrouped.map((g) => (
                <TableRow key={g.materialId} hover>
                  <TableCell>{g.materialCode}</TableCell>
                  <TableCell>{g.materialName}</TableCell>
                  <TableCell>{g.spec || '-'}</TableCell>
                  <TableCell>{g.batchCount}</TableCell>
                  <TableCell>{g.totalQty} {g.unit}</TableCell>
                  <TableCell>{g.avgAgeDays}</TableCell>
                  <TableCell>{g.maxAgeDays}</TableCell>
                  <TableCell>{g.expiredQty > 0 ? <Chip label={g.expiredQty} color="error" size="small" /> : 0}</TableCell>
                  <TableCell>{g.warningQty > 0 ? <Chip label={g.warningQty} color="warning" size="small" /> : 0}</TableCell>
                </TableRow>
              ))
            ) : (
              pagedDetail.map((b) => (
                <TableRow key={b.batchId} hover>
                  <TableCell>{b.batchNo}</TableCell>
                  <TableCell>{b.materialName}</TableCell>
                  <TableCell>{b.supplierName || '-'}</TableCell>
                  <TableCell>{b.remainingQty} {b.unit}</TableCell>
                  <TableCell>{b.inDate?.slice(0, 10)}</TableCell>
                  <TableCell>{b.stockAgeDays}</TableCell>
                  <TableCell>{b.expiryDate?.slice(0, 10) || '-'}</TableCell>
                  <TableCell>{b.daysLeft !== null ? b.daysLeft : '-'}</TableCell>
                  <TableCell>
                    <Tooltip title={`${b.ageRatio}%`}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, b.ageRatio)}
                        color={b.ageStatus === 'EXPIRED' ? 'error' : b.ageStatus === 'CRITICAL' ? 'error' : b.ageStatus === 'WARNING' ? 'warning' : 'success'}
                        sx={{ width: 80 }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell><Chip label={STATUS_LABELS[b.ageStatus]} color={STATUS_COLORS[b.ageStatus]} size="small" /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(e, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }}
        />
      </TableContainer>
    </Box>
  );
}
