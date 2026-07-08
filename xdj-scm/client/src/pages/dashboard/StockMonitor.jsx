import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Paper, Chip,
  LinearProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Stack, MenuItem, TextField, Alert,
  TablePagination,
} from '@mui/material';
import {
  Warning, Error as ErrorIcon, NotificationsActive,
  Inventory2, CheckCircle, Refresh, Speed,
} from '@mui/icons-material';
import api from '../../lib/api';

const LEVEL_CONFIG = {
  GREEN: { label: '正常', color: 'success', bg: '#e8f5e9', icon: CheckCircle },
  YELLOW: { label: '预警', color: 'warning', bg: '#fff8e1', icon: NotificationsActive },
  ORANGE: { label: '超限', color: 'warning', bg: '#fff3e0', icon: Speed },
  RED: { label: '危险', color: 'error', bg: '#ffebee', icon: ErrorIcon },
};

const CATEGORY_COLORS = { A: 'error', B: 'warning', C: 'info', D: 'default' };

export default function StockMonitor() {
  const [summary, setSummary] = useState(null);
  const [standards, setStandards] = useState([]);
  const [levels, setLevels] = useState([]);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, stdRes, whRes] = await Promise.all([
        api.get('/master/stock-monitor/summary'),
        api.get('/master/stock-standards', { params: { status: 'ACTIVE', pageSize: 999 } }),
        api.get('/master/warehouses'),
      ]);

      setSummary(sumRes.data);
      setWarehouses(whRes.data || []);

      const stds = stdRes.data?.list || [];
      // 补充水位数据
      setStandards(stds);

      // 尝试加载水位快照
      const lvlRes = await api.get('/master/stock-levels', {
        params: { ...(warehouseFilter && { warehouseId: warehouseFilter }), pageSize: 999 },
      });
      const allLevels = lvlRes.data?.list || [];
      // 只取每个物料×仓库的最新一条
      const latest = {};
      for (const l of allLevels) {
        const key = `${l.materialId}_${l.warehouseId}`;
        if (!latest[key] || new Date(l.snapshotDate) > new Date(latest[key].snapshotDate)) {
          latest[key] = l;
        }
      }
      setLevels(Object.values(latest));
    } catch (err) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [warehouseFilter]);

  // 为每个标准找到对应的水位数据
  const mergedList = standards.map(std => {
    const lvl = levels.find(l => l.materialId === std.materialId && l.warehouseId === std.warehouseId);
    return { ...std, level: lvl };
  }).filter(s => !warehouseFilter || s.warehouseId === warehouseFilter);

  const paginated = mergedList.slice(page * pageSize, (page + 1) * pageSize);

  // 水位进度条（百分比：当前库存 / 最高库存）
  const getProgress = (lvl, std) => {
    if (!lvl || !lvl.currentQty || !std.maxStock || std.maxStock <= 0) return 0;
    const pct = (lvl.currentQty / std.maxStock) * 100;
    return Math.min(pct, 100);
  };

  const getProgressColor = (lvl) => {
    if (!lvl) return 'primary';
    if (lvl.level === 'RED') return 'error';
    if (lvl.level === 'ORANGE') return 'warning';
    if (lvl.level === 'YELLOW') return 'warning';
    return 'primary';
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>库存水位监控看板</Typography>

      {/* 统计卡片 */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={2.4}>
            <Card sx={{ borderLeft: '4px solid #1976d2' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
                <Inventory2 sx={{ fontSize: 36, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h5" fontWeight={700}>{summary.activeStandards}</Typography>
                  <Typography variant="caption" color="text.secondary">启用标准</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={2.4}>
            <Card sx={{ borderLeft: '4px solid #d32f2f' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
                <ErrorIcon sx={{ fontSize: 36, color: 'error.main' }} />
                <Box>
                  <Typography variant="h5" fontWeight={700} color="error.main">{summary.redAlerts}</Typography>
                  <Typography variant="caption" color="text.secondary">🔴 低于安全库存</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={2.4}>
            <Card sx={{ borderLeft: '4px solid #ed6c02' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
                <Speed sx={{ fontSize: 36, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h5" fontWeight={700} color="warning.main">{summary.orangeAlerts}</Typography>
                  <Typography variant="caption" color="text.secondary">🟠 超最高库存</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={2.4}>
            <Card sx={{ borderLeft: '4px solid #ff9800' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
                <NotificationsActive sx={{ fontSize: 36, color: '#ff9800' }} />
                <Box>
                  <Typography variant="h5" fontWeight={700} color="#ff9800">{summary.yellowAlerts}</Typography>
                  <Typography variant="caption" color="text.secondary">🟡 达预警水位</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={2.4}>
            <Card sx={{ borderLeft: '4px solid #2e7d32' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
                <CheckCircle sx={{ fontSize: 36, color: 'success.main' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    最近快照：{summary.lastSnapshotDate ? new Date(summary.lastSnapshotDate).toLocaleString('zh-CN') : '暂无'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 筛选项 */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <TextField select size="small" label="仓库" value={warehouseFilter}
          onChange={(e) => { setWarehouseFilter(e.target.value); setPage(0); }}
          sx={{ width: 200 }}>
          <MenuItem value="">全部仓库</MenuItem>
          {warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        <Chip icon={<Refresh />} label="刷新" onClick={loadData} clickable variant="outlined" />
      </Stack>

      {/* 水位列表 */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>物料</TableCell><TableCell>品类</TableCell><TableCell>仓库</TableCell>
              <TableCell>水位条</TableCell>
              <TableCell>当前库存</TableCell><TableCell>安全库存</TableCell>
              <TableCell>预警库存</TableCell><TableCell>最高库存</TableCell><TableCell>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3 }}>加载中...</TableCell></TableRow>
            ) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                暂无数据，请先「批量初始化」并「重算所有标准」
              </TableCell></TableRow>
            ) : paginated.map(row => {
              const lvl = row.level;
              const lvlCfg = LEVEL_CONFIG[lvl?.level] || LEVEL_CONFIG.GREEN;
              const progress = getProgress(lvl, row);
              return (
                <TableRow key={row.id} sx={{ bgcolor: lvl?.level !== 'GREEN' && lvl ? lvlCfg.bg : 'inherit' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{row.material?.name || '-'}</TableCell>
                  <TableCell>
                    {row.material?.group?.stockCategory ? (
                      <Chip label={`${row.material.group.stockCategory}类`} size="small"
                        color={CATEGORY_COLORS[row.material.group.stockCategory] || 'default'} />
                    ) : '-'}
                  </TableCell>
                  <TableCell>{row.warehouse?.name || '-'}</TableCell>
                  <TableCell sx={{ minWidth: 180 }}>
                    <Box sx={{ position: 'relative' }}>
                      {/* 安全库存线 */}
                      {row.safetyStock > 0 && lvl?.currentQty > 0 && (
                        <Box sx={{
                          position: 'absolute', left: `${Math.min((row.safetyStock / row.maxStock) * 100, 98)}%`,
                          top: -2, width: 2, height: 8, bgcolor: 'error.main', zIndex: 2,
                        }} title="安全库存线" />
                      )}
                      <LinearProgress variant="determinate" value={progress}
                        color={getProgressColor(lvl)}
                        sx={{ height: 6, borderRadius: 3 }} />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    {lvl ? lvl.currentQty?.toFixed(2) : '-'}
                  </TableCell>
                  <TableCell sx={{ color: 'error.main' }}>{row.safetyStock?.toFixed(2) || '-'}</TableCell>
                  <TableCell sx={{ color: 'warning.main' }}>{row.warnStock?.toFixed(2) || '-'}</TableCell>
                  <TableCell>{row.maxStock?.toFixed(2) || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      icon={<lvlCfg.icon sx={{ fontSize: 14 }} />}
                      label={lvlCfg.label}
                      size="small"
                      color={lvlCfg.color}
                      variant={lvl?.level !== 'GREEN' && lvl ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination component={Paper} sx={{ mt: 0 }}
        count={mergedList.length} page={page} onPageChange={(_, p) => setPage(p)}
        rowsPerPage={pageSize} onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
        labelRowsPerPage="每页" rowsPerPageOptions={[10, 20, 50]}
      />
    </Box>
  );
}
