import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Divider, InputAdornment, IconButton, Alert,
} from '@mui/material';
import { Search, ArrowForward, ArrowBack, Person, Factory, LocalShipping } from '@mui/icons-material';
import api from '../../lib/api';

/** 内置时间线组件（替代 @mui/lab，兼容 MUI v6） */
function Timeline({ children, sx }) {
  return <Box sx={{ display: 'flex', flexDirection: 'column', px: 2, ...sx }}>{children}</Box>;
}
function TimelineItem({ children }) {
  return <Box sx={{ display: 'flex', position: 'relative', minHeight: 60 }}>{children}</Box>;
}
function TimelineOppositeContent({ children, sx }) {
  return <Box sx={{ flex: '0 0 140px', fontSize: 12, color: 'text.secondary', pt: 1, ...sx }}>{children}</Box>;
}
function TimelineSeparator({ children }) {
  return <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>{children}</Box>;
}
function TimelineDot({ color = 'grey' }) {
  const colors = { primary: '#1976d2', secondary: '#9e9e9e', error: '#d32f2f', success: '#2e7d32', warning: '#ed6c02', grey: '#9e9e9e' };
  return <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: colors[color] || colors.grey, border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.12)', mt: 0.8 }} />;
}
function TimelineConnector() {
  return <Box sx={{ flex: 1, width: 2, bgcolor: 'divider', my: 0.5 }} />;
}
function TimelineContent({ children }) {
  return <Box sx={{ flex: 1, pt: 1 }}>{children}</Box>;
}

export default function BatchTrace() {
  const [mode, setMode] = useState('forward');
  const [batchNo, setBatchNo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [result, setResult] = useState(null);
  const [reverseResults, setReverseResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/master/customers?page=1&pageSize=999').then((res) => {
      setCustomers(res.data.list || []);
    }).catch(console.error);
  }, []);

  const handleForward = async () => {
    if (!batchNo) return;
    setLoading(true);
    try {
      const batches = await api.get(`/traceability/batches?page=1&pageSize=999&keyword=${batchNo}`);
      if (!batches.data.list?.length) { alert('未找到批次'); setLoading(false); return; }
      const batchId = batches.data.list[0].id;
      const res = await api.get(`/traceability/trace/${batchId}/forward`);
      setResult(res.data);
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  const handleReverse = async () => {
    if (!customerId && !batchNo) { alert('请输入客户或批次号'); return; }
    setLoading(true);
    try {
      const res = await api.get(`/traceability/trace/reverse?customerId=${customerId}&batchNo=${batchNo}`);
      setReverseResults(res.data || []);
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>批次追溯</Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={3}>
              <Button fullWidth variant={mode === 'forward' ? 'contained' : 'outlined'} startIcon={<ArrowForward />} onClick={() => setMode('forward')}>
                正向追溯（批次→客户）
              </Button>
            </Grid>
            <Grid item xs={3}>
              <Button fullWidth variant={mode === 'reverse' ? 'contained' : 'outlined'} startIcon={<ArrowBack />} onClick={() => setMode('reverse')}>
                反向追溯（客户→供应商）
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {mode === 'forward' ? (
        <>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={8}>
                  <TextField fullWidth size="small" label="输入批次号" value={batchNo} onChange={(e) => setBatchNo(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleForward()}
                    InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={handleForward}><Search /></IconButton></InputAdornment> }} />
                </Grid>
                <Grid item xs={4}><Button variant="contained" fullWidth onClick={handleForward} disabled={loading}>查询</Button></Grid>
              </Grid>
            </CardContent>
          </Card>

          {result && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                批次 <strong>{result.batch.batchNo}</strong> - 物料：{result.batch.material?.name} | 供应商：{result.batch.supplier?.name || '-'}
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}><Factory fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />采购来源</Typography>
                    {result.source ? (
                      <Box>
                        <Typography variant="body2">入库编号：{result.source.receiptNo}</Typography>
                        <Typography variant="body2">入库日期：{result.source.receiptDate?.slice(0, 10)}</Typography>
                        <Typography variant="body2">供应商：{result.source.supplier?.name}</Typography>
                        <Typography variant="body2">收货仓库：{result.source.warehouse?.name}</Typography>
                        <Typography variant="body2">收货数量：{result.source.receivedQty}</Typography>
                      </Box>
                    ) : <Typography color="text.secondary">无采购来源</Typography>}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}><Person fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />受影响客户 ({result.affectedCustomers?.length || 0})</Typography>
                    {result.affectedCustomers?.length > 0 ? (
                      result.affectedCustomers.map((c) => (
                        <Box key={c.id} sx={{ mb: 1 }}>
                          <Chip size="small" label={c.name} color="primary" variant="outlined" />
                          <Typography variant="caption" display="block">联系人：{c.contactPerson || '-'} | 电话：{c.contactPhone || '-'}</Typography>
                        </Box>
                      ))
                    ) : <Typography color="text.secondary">暂无客户流向</Typography>}
                  </Paper>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}><LocalShipping fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />流向时间线</Typography>
              <Timeline>
                {result.trackings?.map((t, idx) => (
                  <TimelineItem key={t.id}>
                    <TimelineOppositeContent sx={{ fontSize: 12 }}>{t.createdAt?.slice(0, 16).replace('T', ' ')}</TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot color={t.customerId ? 'error' : 'primary'} />
                      {idx < result.trackings.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant="body2"><strong>{t.movementType}</strong> - 数量：{t.qty}</Typography>
                      {t.customer && <Typography variant="caption">客户：{t.customer.name}</Typography>}
                      {t.remark && <Typography variant="caption" display="block">{t.remark}</Typography>}
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>库存移动记录</Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead><TableRow>
                    <TableCell>编号</TableCell><TableCell>日期</TableCell><TableCell>类型</TableCell>
                    <TableCell>方向</TableCell><TableCell>仓库</TableCell><TableCell>数量</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {result.movements?.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.movementNo}</TableCell>
                        <TableCell>{m.createdAt?.slice(0, 16).replace('T', ' ')}</TableCell>
                        <TableCell>{m.movementType}</TableCell>
                        <TableCell><Chip size="small" label={m.direction === 'IN' ? '入库' : '出库'} color={m.direction === 'IN' ? 'success' : 'warning'} /></TableCell>
                        <TableCell>{m.warehouse?.name}</TableCell>
                        <TableCell>{m.qty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </>
      ) : (
        <>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={5}>
                  <TextField select fullWidth size="small" label="选择客户" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                    <MenuItem value="">全部客户</MenuItem>
                    {customers.map((c) => <MenuItem key={c.id} value={c.id}>{c.code} - {c.name}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={5}>
                  <TextField fullWidth size="small" label="或输入批次号" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
                </Grid>
                <Grid item xs={2}><Button variant="contained" fullWidth onClick={handleReverse} disabled={loading}>查询</Button></Grid>
              </Grid>
            </CardContent>
          </Card>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>追溯日期</TableCell><TableCell>批次号</TableCell><TableCell>物料</TableCell>
                <TableCell>客户</TableCell><TableCell>供应商</TableCell><TableCell>数量</TableCell>
                <TableCell>采购来源</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {reverseResults.map((t, idx) => (
                  <TableRow key={t.id || idx}>
                    <TableCell>{t.createdAt?.slice(0, 16).replace('T', ' ')}</TableCell>
                    <TableCell><Chip size="small" label={t.batch?.batchNo} color="primary" variant="outlined" /></TableCell>
                    <TableCell>{t.batch?.material?.name}</TableCell>
                    <TableCell>{t.customer?.name || '-'}</TableCell>
                    <TableCell>{t.batch?.supplier?.name || '-'}</TableCell>
                    <TableCell>{t.qty}</TableCell>
                    <TableCell>{t.batch?.purchaseReceipt?.receiptNo || '-'}</TableCell>
                  </TableRow>
                ))}
                {reverseResults.length === 0 && <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>请输入查询条件</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
