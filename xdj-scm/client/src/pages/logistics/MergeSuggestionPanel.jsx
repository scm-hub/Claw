import { useState } from 'react';
import {
  Box, Typography, Button, Stack, Paper, Chip, Card, CardContent, CardActions,
  CircularProgress, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, InputLabel, FormControl, Grid, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { AutoAwesome, CheckCircle, VisibilityOff, Route, LocalShipping } from '@mui/icons-material';
import { api } from '../../lib/api';

export default function MergeSuggestionPanel({ providers = [], vehicles = [], onMergeSuccess }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [providerId, setProviderId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [noDataMsg, setNoDataMsg] = useState('点击「生成建议」开始智能分析');
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  // 合并确认弹窗
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [mergeShippingDate, setMergeShippingDate] = useState('');
  const [mergeProviderId, setMergeProviderId] = useState('');
  const [mergeVehicleId, setMergeVehicleId] = useState('');
  const [merging, setMerging] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setNoDataMsg('正在分析可拼车订单...');
    try {
      const res = await api.post('/logistics/merge-suggestions', {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        providerId: providerId || undefined,
        vehicleId: vehicleId || undefined,
        maxResults: 10,
      });
      if (res.data?.data?.suggestions?.length > 0) {
        setSuggestions(res.data.data.suggestions);
        setNoDataMsg('');
      } else {
        setSuggestions([]);
        setNoDataMsg(`已分析 ${res.data?.data?.analyzedOrders || 0} 个发货单，暂无可拼车组合`);
      }
    } catch (err) {
      setSnack({ open: true, msg: '生成建议失败: ' + (err.response?.data?.message || err.message), sev: 'error' });
      setNoDataMsg('生成失败，请重试');
    }
    setLoading(false);
  };

  const handleIgnore = (sugId) => {
    setSuggestions(prev => prev.filter(s => s.id !== sugId));
    api.put(`/logistics/merge-suggestions/${sugId}/ignore`).catch(() => {});
  };

  const handleMergeOpen = (sug) => {
    setMergeTarget(sug);
    // 默认取最早的发货日期
    const dates = sug.sourceOrders.map(o => o.shippingDate).filter(Boolean);
    setMergeShippingDate(dates.length > 0 ? dates.sort()[0] : '');
    setMergeProviderId(providerId || '');
    setMergeVehicleId(vehicleId || '');
    setMergeOpen(true);
  };

  const handleMergeConfirm = async () => {
    if (!mergeTarget) return;
    setMerging(true);
    try {
      await api.post('/logistics/merge', {
        sourceOrderIds: mergeTarget.sourceOrders.map(o => o.id),
        suggestionId: mergeTarget.id,
        providerId: mergeProviderId || undefined,
        vehicleId: mergeVehicleId || undefined,
        shippingDate: mergeShippingDate || undefined,
      });
      setSnack({ open: true, msg: `合并成功！已生成合并发货单`, sev: 'success' });
      setMergeOpen(false);
      setMergeTarget(null);
      setMerging(false);
      // 从列表移除已确认的建议
      setSuggestions(prev => prev.filter(s => s.id !== mergeTarget.id));
      if (onMergeSuccess) onMergeSuccess();
    } catch (err) {
      setSnack({ open: true, msg: '合并失败: ' + (err.response?.data?.message || err.message), sev: 'error' });
      setMerging(false);
    }
  };

  return (
    <Box>
      {/* 筛选条件 */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: 1, '&:last-child': { pb: 1 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Typography variant="subtitle2" color="text.secondary">筛选：</Typography>
            <TextField size="small" label="发货日期起" type="date" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
            <TextField size="small" label="发货日期止" type="date" value={dateTo}
              onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
            <FormControl size="small" sx={{ width: 140 }}>
              <InputLabel>承运商</InputLabel>
              <Select value={providerId} onChange={e => setProviderId(e.target.value)} label="承运商">
                <MenuItem value="">全部</MenuItem>
                {providers.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ width: 160 }}>
              <InputLabel>车辆（容量约束）</InputLabel>
              <Select value={vehicleId} onChange={e => setVehicleId(e.target.value)} label="车辆（容量约束）">
                <MenuItem value="">不限</MenuItem>
                {vehicles.map(v => <MenuItem key={v.id} value={v.id}>
                  {v.plateNo} ({v.maxLoadWeight ? Number(v.maxLoadWeight) + '吨' : '未知载重'})
                </MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="contained" color="primary" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}
              onClick={handleGenerate} disabled={loading} sx={{ minWidth: 44, fontSize: '0.8rem', py: 0.75, borderRadius: '10px' }}>
              {loading ? '分析中...' : '生成建议'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* 建议列表 */}
      {loading && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={40} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{noDataMsg}</Typography>
        </Box>
      )}

      {!loading && suggestions.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <AutoAwesome sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">{noDataMsg}</Typography>
        </Box>
      )}

      {!loading && suggestions.map((sug, i) => (
        <Card key={sug.id || i} sx={{ mb: 2, border: '1px solid', borderColor: sug.matchScore >= 80 ? 'success.light' : 'divider' }}>
          <CardContent sx={{ pb: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocalShipping color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={600}>
                  拼车建议 #{i + 1}
                </Typography>
                <Chip label={sug.suggestionNo || ''} size="small" variant="outlined" />
              </Stack>
              <Chip
                label={`匹配度 ${sug.matchScore}%`}
                size="small"
                color={sug.matchScore >= 80 ? 'success' : sug.matchScore >= 65 ? 'warning' : 'default'}
                variant="filled"
              />
            </Stack>

            {/* 路线信息 */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">路线</Typography>
                <Typography variant="body2">{sug.routeDesc || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">总预估</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {sug.totalWeight > 0 ? `${sug.totalWeight}吨` : ''}
                  {sug.totalVolume > 0 ? `${sug.totalWeight ? ' / ' : ''}${sug.totalVolume}m³` : ''}
                  {sug.totalKilometers > 0 ? ` / ${sug.totalKilometers}km` : ''}
                  {sug.estimatedCost > 0 ? ` / ¥${sug.estimatedCost}` : ''}
                </Typography>
              </Box>
              {sug.costSaved > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">节省</Typography>
                  <Typography variant="body2" color="success.main" fontWeight={600}>¥{sug.costSaved}</Typography>
                </Box>
              )}
              {sug.suggestedVehicle && (
                <Box>
                  <Typography variant="caption" color="text.secondary">推荐车辆</Typography>
                  <Typography variant="body2">
                    {sug.suggestedVehicle.plateNo}（利用率 {sug.suggestedVehicle.utilization}%）
                  </Typography>
                </Box>
              )}
            </Box>

            {/* 匹配原因 */}
            {sug.matchReasons?.length > 0 && (
              <Stack direction="row" spacing={0.5} sx={{ mb: 1.5 }} flexWrap="wrap">
                {sug.matchReasons.map((r, ri) => (
                  <Chip key={ri} label={r} size="small" variant="outlined" color="info" />
                ))}
              </Stack>
            )}

            {/* 源单明细表 */}
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 0 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 600, bgcolor: 'grey.50', py: 0.75 } }}>
                    <TableCell>发货单号</TableCell>
                    <TableCell>客户</TableCell>
                    <TableCell>目的地</TableCell>
                    <TableCell align="right">重量(吨)</TableCell>
                    <TableCell align="right">体积(m³)</TableCell>
                    <TableCell>发货日期</TableCell>
                    <TableCell align="right">运费</TableCell>
                    <TableCell align="right">里程(km)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sug.sourceOrders.map((o, oi) => (
                    <TableRow key={o.id || oi}>
                      <TableCell sx={{ fontWeight: 500 }}>{o.shippingNo}</TableCell>
                      <TableCell>{o.customerName}</TableCell>
                      <TableCell>{o.destination || '-'}</TableCell>
                      <TableCell align="right">{o.estimatedWeight || 0}</TableCell>
                      <TableCell align="right">{o.estimatedVolume || 0}</TableCell>
                      <TableCell>{o.shippingDate || '-'}</TableCell>
                      <TableCell align="right">¥{(o.transportCost || 0).toFixed(0)}</TableCell>
                      <TableCell align="right">{o.kilometers || 0}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 700, borderTop: '2px solid', borderColor: 'divider', bgcolor: 'grey.50' } }}>
                    <TableCell colSpan={3}>合计</TableCell>
                    <TableCell align="right">{sug.totalWeight}</TableCell>
                    <TableCell align="right">{sug.totalVolume}</TableCell>
                    <TableCell />
                    <TableCell align="right" color="primary">¥{sug.estimatedCost}</TableCell>
                    <TableCell align="right">{sug.totalKilometers}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
          <CardActions sx={{ pt: 0, justifyContent: 'flex-end', gap: 1 }}>
            <Button size="small" startIcon={<Route />} color="secondary"
              sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
              查看路线
            </Button>
            <Button size="small" startIcon={<VisibilityOff />} color="inherit"
              onClick={() => handleIgnore(sug.id)}
              sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
              忽略
            </Button>
            <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />}
              onClick={() => handleMergeOpen(sug)}
              sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
              合并发货
            </Button>
          </CardActions>
        </Card>
      ))}

      {/* 合并确认弹窗 */}
      <Dialog open={mergeOpen} onClose={() => setMergeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>确认拼车合并</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            将以下 {mergeTarget?.sourceOrders?.length || 0} 个发货单合并为一个发货单：
          </Typography>

          {mergeTarget?.sourceOrders?.map((o, i) => (
            <Paper key={o.id || i} variant="outlined" sx={{ p: 1, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" fontWeight={600}>{o.shippingNo}</Typography>
                <Typography variant="caption" color="text.secondary">{o.customerName} → {o.destination}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2">{o.estimatedWeight || 0}吨 / {o.estimatedVolume || 0}m³</Typography>
                <Typography variant="caption" color="text.secondary">¥{o.transportCost || 0}</Typography>
              </Box>
            </Paper>
          ))}

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={6}><TextField label="发货日期" type="date" fullWidth size="small" value={mergeShippingDate}
              onChange={e => setMergeShippingDate(e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small"><InputLabel>承运商</InputLabel>
                <Select value={mergeProviderId} onChange={e => setMergeProviderId(e.target.value)} label="承运商">
                  <MenuItem value="">不变</MenuItem>
                  {providers.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small"><InputLabel>车辆</InputLabel>
                <Select value={mergeVehicleId} onChange={e => setMergeVehicleId(e.target.value)} label="车辆">
                  <MenuItem value="">不变</MenuItem>
                  {vehicles.filter(v => {
                    if (!mergeProviderId) return true;
                    return v.logisticsProviderId === mergeProviderId;
                  }).map(v => <MenuItem key={v.id} value={v.id}>{v.plateNo} ({v.vehicleType})</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ mt: 2, p: 1.5, bgcolor: 'success.lightest', borderColor: 'success.light' }}>
            <Typography variant="body2" fontWeight={600} color="success.dark">
              💡 合并后源发货单自动标记为「已发货」，费用按比例分摊到各源单。
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeOpen(false)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>取消</Button>
          <Button variant="contained" color="success" onClick={handleMergeConfirm}
            disabled={merging} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
            {merging ? <CircularProgress size={16} color="inherit" /> : '确认合并'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snack.sev} onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
