import { useState, useEffect, Fragment } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Select, MenuItem, InputLabel, FormControl,
  IconButton, TableSortLabel, Tooltip, LinearProgress, Checkbox,
} from '@mui/material';
import { Add, Star, Download, AutoMode, KeyboardArrowDown, KeyboardArrowUp, TrendingUp, Compare } from '@mui/icons-material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { api } from '../lib/api';

function scoreColor(score) { if (score >= 85) return 'success'; if (score >= 70) return 'warning'; return 'error'; }
function gradeText(score) { if (score >= 85) return '优秀'; if (score >= 70) return '良好'; return '不合格'; }
function fmt(v) { return Number(v || 0).toFixed(1); }

const DIMENSIONS = [
  { key: 'deliveryOnTimeRate', label: '准时交付率', weight: '40%' },
  { key: 'qualityPassRate', label: '质量合格率', weight: '30%' },
  { key: 'priceCompetitiveness', label: '价格竞争力', weight: '20%' },
  { key: 'serviceResponse', label: '服务响应', weight: '10%' },
];

export default function SupplierEvalList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [suppliers, setSuppliers] = useState([]);
  const [sort, setSort] = useState('totalScore');
  const [order, setOrder] = useState('desc');
  const [periodFilter, setPeriodFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoPeriod, setAutoPeriod] = useState('');
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoResult, setAutoResult] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [trendOpen, setTrendOpen] = useState(false);
  const [trendData, setTrendData] = useState([]);
  const [trendSupplier, setTrendSupplier] = useState('');
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [compareData, setCompareData] = useState([]);
  const [form, setForm] = useState({ supplierId: '', evalPeriod: '', deliveryOnTimeRate: '', qualityPassRate: '', priceCompetitiveness: '', serviceResponse: '', evalRemark: '' });
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const pageSize = 20;

  const loadData = () => {
    api.get('/extra/supplier-evals', { params: { page, pageSize, sort, order, evalPeriod: periodFilter } })
      .then((res) => { setList(res.data.list || []); setTotal(res.data.total || 0); });
  };
  useEffect(() => {
    loadData();
    api.get('/master/suppliers', { params: { page: 1, pageSize: 999 } }).then((res) => setSuppliers(res.data.list || []));
  }, [page, sort, order, periodFilter]);

  const handleSort = (field) => {
    if (sort === field) { setOrder(order === 'asc' ? 'desc' : 'asc'); }
    else { setSort(field); setOrder('desc'); }
  };

  const handleCreate = () => {
    if (!form.supplierId || !form.evalPeriod) { setSnack({ open: true, msg: '供应商和评估周期必填', sev: 'error' }); return; }
    const payload = {
      supplierId: form.supplierId, evalPeriod: form.evalPeriod,
      deliveryOnTimeRate: Number(form.deliveryOnTimeRate) || 0,
      qualityPassRate: Number(form.qualityPassRate) || 0,
      priceCompetitiveness: Number(form.priceCompetitiveness) || 0,
      serviceResponse: Number(form.serviceResponse) || 0,
      evalRemark: form.evalRemark || null,
    };
    api.post('/extra/supplier-evals', payload).then(() => {
      setSnack({ open: true, msg: '评估创建成功', sev: 'success' }); setCreateOpen(false);
      setForm({ supplierId: '', evalPeriod: '', deliveryOnTimeRate: '', qualityPassRate: '', priceCompetitiveness: '', serviceResponse: '', evalRemark: '' });
      loadData();
    }).catch((e) => setSnack({ open: true, msg: e.response?.data?.message || '失败', sev: 'error' }));
  };

  const handleAutoCalc = () => {
    if (!autoPeriod) { setSnack({ open: true, msg: '请选择评估月份', sev: 'error' }); return; }
    setAutoLoading(true);
    setAutoResult(null);
    api.post('/extra/supplier-evals/auto-calculate', { evalPeriod: autoPeriod }).then((res) => {
      setAutoResult(res.data);
      setSnack({ open: true, msg: res.data.message || '评估完成', sev: 'success' });
      loadData();
    }).catch((e) => {
      setSnack({ open: true, msg: e.response?.data?.message || '评估失败', sev: 'error' });
    }).finally(() => setAutoLoading(false));
  };

  const handleExport = () => {
    api.get('/extra/supplier-evals/export', { params: { evalPeriod: periodFilter }, responseType: 'blob' })
      .then((res) => {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url; a.download = `supplier-eval-${periodFilter || 'all'}.xlsx`;
        a.click(); URL.revokeObjectURL(url);
        setSnack({ open: true, msg: '导出成功', sev: 'success' });
      }).catch(() => setSnack({ open: true, msg: '导出失败', sev: 'error' }));
  };

  const handleTrend = (supplierId, supplierName) => {
    api.get('/extra/supplier-evals', { params: { supplierId, pageSize: 999 } }).then((res) => {
      const sorted = (res.data.list || []).sort((a, b) => a.evalPeriod.localeCompare(b.evalPeriod));
      setTrendData(sorted.map(r => ({
        period: r.evalPeriod,
        准时交付率: Number(r.deliveryOnTimeRate),
        质量合格率: Number(r.qualityPassRate),
        价格竞争力: Number(r.priceCompetitiveness),
        服务响应: Number(r.serviceResponse),
        总分: Number(r.totalScore),
      })));
      setTrendSupplier(supplierName);
      setTrendOpen(true);
    });
  };

  const handleCompare = () => {
    // 从当前列表中取出已勾选的行数据，无需额外请求
    const selected = list.filter(row => compareIds.includes(row.id));
    if (selected.length < 2) {
      setSnack({ open: true, msg: '请选择至少2个供应商进行对比', sev: 'error' });
      return;
    }
    const data = selected.map(r => ({
      supplier: r.supplier?.name || '-',
      准时交付率: Number(r.deliveryOnTimeRate),
      质量合格率: Number(r.qualityPassRate),
      价格竞争力: Number(r.priceCompetitiveness),
      服务响应: Number(r.serviceResponse),
    }));
    setCompareData(data);
    setCompareOpen(true);
  };

  const toggleCompare = (id) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5">供应商评估</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField size="small" type="month" label="周期筛选" InputLabelProps={{ shrink: true }} value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} sx={{ width: 150 }} />
          <Button variant="outlined" startIcon={<Download />} onClick={handleExport}>导出</Button>
          {compareIds.length >= 2 && <Button variant="outlined" color="secondary" startIcon={<Compare />} onClick={handleCompare}>对比({compareIds.length})</Button>}
          <Button variant="outlined" startIcon={<AutoMode />} onClick={() => { setAutoPeriod(''); setAutoResult(null); setAutoOpen(true); }}>自动评估</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>手动新增</Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell padding="checkbox" />
              <TableCell>
                <TableSortLabel active={sort === 'totalScore'} direction={order} onClick={() => handleSort('totalScore')}>
                  排名
                </TableSortLabel>
              </TableCell>
              <TableCell>供应商</TableCell>
              <TableCell>评估周期</TableCell>
              <TableCell>
                <TableSortLabel active={sort === 'deliveryOnTimeRate'} direction={order} onClick={() => handleSort('deliveryOnTimeRate')}>
                  准时交付率<small>(40%)</small>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sort === 'qualityPassRate'} direction={order} onClick={() => handleSort('qualityPassRate')}>
                  质量合格率<small>(30%)</small>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sort === 'priceCompetitiveness'} direction={order} onClick={() => handleSort('priceCompetitiveness')}>
                  价格竞争力<small>(20%)</small>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sort === 'serviceResponse'} direction={order} onClick={() => handleSort('serviceResponse')}>
                  服务响应<small>(10%)</small>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sort === 'totalScore'} direction={order} onClick={() => handleSort('totalScore')}>
                  总分
                </TableSortLabel>
              </TableCell>
              <TableCell>等级</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((row, idx) => {
              const score = Number(row.totalScore);
              const rank = (page - 1) * pageSize + idx + 1;
              const isExpanded = expandedId === row.id;
              return (
                <Fragment key={row.id}>
                  <TableRow
                    sx={{
                      cursor: 'pointer',
                      bgcolor: rank === 1 ? 'rgba(255, 215, 0, 0.08)' : rank <= 3 ? 'rgba(255, 215, 0, 0.04)' : score < 70 ? 'rgba(244, 67, 54, 0.06)' : 'inherit',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : row.id)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small">{isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}</IconButton>
                    </TableCell>
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox size="small" checked={compareIds.includes(row.id)} onChange={() => toggleCompare(row.id)} />
                    </TableCell>
                    <TableCell>
                      {rank <= 3 ? <Chip label={rank} size="small" color="primary" icon={<Star />} /> : rank}
                    </TableCell>
                    <TableCell>{row.supplier?.name || '-'}</TableCell>
                    <TableCell>{row.evalPeriod}</TableCell>
                    <TableCell>{fmt(row.deliveryOnTimeRate)}</TableCell>
                    <TableCell>{fmt(row.qualityPassRate)}</TableCell>
                    <TableCell>{fmt(row.priceCompetitiveness)}</TableCell>
                    <TableCell>{fmt(row.serviceResponse)}</TableCell>
                    <TableCell><Chip label={fmt(row.totalScore)} size="small" color={scoreColor(score)} icon={<Star />} /></TableCell>
                    <TableCell><Chip label={gradeText(score)} size="small" color={scoreColor(score)} variant="outlined" /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                      <Button size="small" startIcon={<TrendingUp />} onClick={() => handleTrend(row.supplierId, row.supplier?.name)}>趋势</Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={12} sx={{ py: 2, bgcolor: 'grey.50' }}>
                        <Grid container spacing={3}>
                          {/* 准时交付率明细 */}
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" gutterBottom>准时交付率明细</Typography>
                            {row.deliveryDetail ? (
                              <Box>
                                <Typography variant="body2">总订单: {row.deliveryDetail.totalOrders} | 按时: {row.deliveryDetail.onTimeOrders}</Typography>
                                <Typography variant="body2" color="textSecondary">按时率: {row.deliveryDetail.rate}</Typography>
                                <Box sx={{ mt: 1, maxHeight: 120, overflow: 'auto' }}>
                                  {(row.deliveryDetail.orders || []).slice(0, 5).map((o, i) => (
                                    <Typography key={i} variant="caption" display="block">
                                      {o.orderNo}: {o.actualDate || '未收货'} {o.onTime ? '✓' : '✗'}
                                    </Typography>
                                  ))}
                                  {(row.deliveryDetail.orders || []).length > 5 && <Typography variant="caption">...共{row.deliveryDetail.orders.length}单</Typography>}
                                </Box>
                              </Box>
                            ) : <Typography variant="body2" color="textSecondary">无数据</Typography>}
                          </Grid>
                          {/* 质量合格率明细 */}
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" gutterBottom>质量合格率明细</Typography>
                            {row.qualityDetail ? (
                              <Box>
                                <Typography variant="body2">已质检数: {row.qualityDetail.totalChecks}</Typography>
                                <Typography variant="body2" color="success.main">合格: {row.qualityDetail.passCount}</Typography>
                                <Typography variant="body2" color="error.main">不合格: {row.qualityDetail.failCount}</Typography>
                                {row.qualityDetail.pendingCount > 0 && <Typography variant="body2" color="textSecondary">未质检: {row.qualityDetail.pendingCount}</Typography>}
                                <Typography variant="body2" color="textSecondary">合格率: {row.qualityDetail.rate}</Typography>
                                {(row.qualityDetail.items || []).map((m, i) => (
                                  <Typography key={i} variant="caption" display="block" sx={{ mt: 0.5 }}>
                                    {m.materialName} ({m.receivedQty}) - {m.pass ? '✅ 合格' : '❌ 不合格'}
                                  </Typography>
                                ))}
                              </Box>
                            ) : <Typography variant="body2" color="textSecondary">无数据</Typography>}
                          </Grid>
                          {/* 价格竞争力明细 */}
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" gutterBottom>价格竞争力明细</Typography>
                            {row.priceDetail ? (
                              <Box>
                                <Typography variant="body2">对比物料数: {row.priceDetail.materialCount}</Typography>
                                <Typography variant="body2" color="textSecondary">平均得分: {row.priceDetail.avgScore}</Typography>
                                <Box sx={{ mt: 1, maxHeight: 120, overflow: 'auto' }}>
                                  {(row.priceDetail.materials || []).slice(0, 5).map((m, i) => (
                                    <Typography key={i} variant="caption" display="block">
                                      {m.materialName || `物料${i+1}`}: 我{m.myAvgPrice} / 均{m.marketAvg} / {m.score}分
                                    </Typography>
                                  ))}
                                  {(row.priceDetail.materials || []).length > 5 && <Typography variant="caption">...共{row.priceDetail.materials.length}项</Typography>}
                                </Box>
                              </Box>
                            ) : <Typography variant="body2" color="textSecondary">无数据</Typography>}
                          </Grid>
                          {/* 服务响应明细 */}
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" gutterBottom>服务响应明细</Typography>
                            {row.serviceDetail ? (
                              <Box>
                                <Typography variant="body2">平均响应: {row.serviceDetail.avgResponseDays} 天</Typography>
                                <Typography variant="body2" color="textSecondary">基准天数: {row.serviceDetail.baselineDays} 天</Typography>
                                <Typography variant="body2">计分订单: {row.serviceDetail.scoredOrders}</Typography>
                                <Typography variant="body2" color="textSecondary">得分: {row.serviceDetail.score}</Typography>
                              </Box>
                            ) : <Typography variant="body2" color="textSecondary">无数据</Typography>}
                          </Grid>
                        </Grid>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {!list.length && <TableRow><TableCell colSpan={12} align="center">暂无数据</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      {total > pageSize && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 1 }}>
          <Button size="small" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <Typography sx={{ lineHeight: '32px' }}>{page} / {Math.ceil(total / pageSize)}</Typography>
          <Button size="small" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(page + 1)}>下一页</Button>
        </Box>
      )}

      {/* 手动新增弹窗 */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增供应商评估（手动）</DialogTitle>
        <DialogContent><Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>供应商</InputLabel><Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} label="供应商">{suppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6}><TextField label="评估周期（如2026-06）" fullWidth size="small" value={form.evalPeriod} onChange={(e) => setForm({ ...form, evalPeriod: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="准时交付率(%)" type="number" fullWidth size="small" value={form.deliveryOnTimeRate} onChange={(e) => setForm({ ...form, deliveryOnTimeRate: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="质量合格率(%)" type="number" fullWidth size="small" value={form.qualityPassRate} onChange={(e) => setForm({ ...form, qualityPassRate: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="价格竞争力(0-100)" type="number" fullWidth size="small" value={form.priceCompetitiveness} onChange={(e) => setForm({ ...form, priceCompetitiveness: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="服务响应(0-100)" type="number" fullWidth size="small" value={form.serviceResponse} onChange={(e) => setForm({ ...form, serviceResponse: e.target.value })} /></Grid>
          <Grid item xs={12}><TextField label="评估备注" fullWidth size="small" multiline rows={2} value={form.evalRemark} onChange={(e) => setForm({ ...form, evalRemark: e.target.value })} /></Grid>
        </Grid></DialogContent>
        <DialogActions><Button onClick={() => setCreateOpen(false)}>取消</Button><Button variant="contained" onClick={handleCreate}>创建</Button></DialogActions>
      </Dialog>

      {/* 自动评估弹窗 */}
      <Dialog open={autoOpen} onClose={() => !autoLoading && setAutoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>自动评估 — 按月取数</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1, mb: 2 }}>
            <TextField type="month" label="评估月份" InputLabelProps={{ shrink: true }} size="small" value={autoPeriod} onChange={(e) => setAutoPeriod(e.target.value)} />
            <Button variant="contained" startIcon={<AutoMode />} onClick={handleAutoCalc} disabled={autoLoading}>
              {autoLoading ? '评估中...' : '开始评估'}
            </Button>
          </Box>
          {autoLoading && <LinearProgress sx={{ mb: 2 }} />}
          {autoResult && autoResult.data && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>{autoResult.message || '评估完成'}（周期: {autoResult.data.evalPeriod || autoPeriod}）</Alert>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead><TableRow>
                    <TableCell>供应商</TableCell><TableCell>准时交付率</TableCell><TableCell>质量合格率</TableCell>
                    <TableCell>价格竞争力</TableCell><TableCell>服务响应</TableCell><TableCell>总分</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {(autoResult.data.results || []).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.supplierName}</TableCell>
                        <TableCell>{r.deliveryScore}</TableCell>
                        <TableCell>{r.qualityScore}</TableCell>
                        <TableCell>{r.priceScore}</TableCell>
                        <TableCell>{r.serviceScore}</TableCell>
                        <TableCell><Chip label={r.totalScore} size="small" color={scoreColor(Number(r.totalScore))} /></TableCell>
                      </TableRow>
                    ))}
                    {!autoResult.data.results?.length && <TableRow><TableCell colSpan={6} align="center">该周期无供应商数据</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setAutoOpen(false)}>关闭</Button></DialogActions>
      </Dialog>

      {/* 趋势图弹窗 */}
      <Dialog open={trendOpen} onClose={() => setTrendOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{trendSupplier} — 评估趋势</DialogTitle>
        <DialogContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis domain={[0, 100]} />
                <RTooltip />
                <Legend />
                <Line type="monotone" dataKey="准时交付率" stroke="#1976d2" strokeWidth={2} />
                <Line type="monotone" dataKey="质量合格率" stroke="#2e7d32" strokeWidth={2} />
                <Line type="monotone" dataKey="价格竞争力" stroke="#ed6c02" strokeWidth={2} />
                <Line type="monotone" dataKey="服务响应" stroke="#9c27b0" strokeWidth={2} />
                <Line type="monotone" dataKey="总分" stroke="#d32f2f" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Typography align="center" sx={{ py: 4 }}>暂无历史数据</Typography>}
        </DialogContent>
        <DialogActions><Button onClick={() => setTrendOpen(false)}>关闭</Button></DialogActions>
      </Dialog>

      {/* 对比雷达图弹窗 */}
      <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>供应商对比</DialogTitle>
        <DialogContent>
          {compareData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={450}>
              <RadarChart data={DIMENSIONS.map(d => {
                const obj = { dimension: d.label };
                compareData.forEach(s => { obj[s.supplier] = s[d.label === '准时交付率' ? '准时交付率' : d.label === '质量合格率' ? '质量合格率' : d.label === '价格竞争力' ? '价格竞争力' : '服务响应']; });
                return obj;
              })}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" />
                <PolarRadiusAxis domain={[0, 100]} />
                {compareData.map((s, i) => {
                  const colors = ['#1976d2', '#d32f2f', '#2e7d32', '#ed6c02', '#9c27b0'];
                  return <Radar key={i} name={s.supplier} dataKey={s.supplier} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.15} strokeWidth={2} />;
                })}
                <Legend />
                <RTooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : <Typography align="center" sx={{ py: 4 }}>请选择至少2个供应商</Typography>}
        </DialogContent>
        <DialogActions><Button onClick={() => setCompareOpen(false)}>关闭</Button></DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snack.sev}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
