import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, MenuItem, TablePagination, Card, CardContent,
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import api from '../../lib/api';

const TYPE_LABELS = { RECEIPT: '收款', PAYMENT: '付款' };
const STATUS_LABELS = { CONFIRMED: '已确认', PENDING: '待确认', CANCELLED: '已撤销' };

export default function PaymentList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [arList, setArList] = useState([]);
  const [apList, setApList] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: page + 1, pageSize: rowsPerPage });
      if (keyword) params.set('keyword', keyword);
      if (paymentType) params.set('paymentType', paymentType);
      const res = await api.get(`/finance/payments?${params}`);
      setList(res.data.list || []);
      setTotal(res.data.total || 0);
    } catch (e) { console.error(e); }
  }, [page, rowsPerPage, keyword, paymentType]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadArAp = async () => {
    try {
      const [arRes, apRes] = await Promise.all([
        api.get('/finance/receivable?status=PENDING&pageSize=999'),
        api.get('/finance/payable?status=PENDING&pageSize=999'),
      ]);
      setArList((arRes.data?.list || []).filter(a => Number(a.balance) > 0));
      setApList((apRes.data?.list || []).filter(a => Number(a.balance) > 0));
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    const { data } = dialog;
    try {
      await api.post('/finance/payments', data);
      setDialog({ open: false, data: null });
      loadData();
    } catch (e) { alert(e.message); }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>收付款记录</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item><TextField size="small" placeholder="编号" value={keyword} onChange={e => setKeyword(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} /></Grid>
          <Grid item><TextField size="small" select label="类型" value={paymentType} onChange={e => setPaymentType(e.target.value)} sx={{ minWidth: 100 }}><MenuItem value="">全部</MenuItem><MenuItem value="RECEIPT">收款</MenuItem><MenuItem value="PAYMENT">付款</MenuItem></TextField></Grid>
          <Grid item><Button variant="contained" onClick={loadData}>查询</Button></Grid>
          <Grid item><Button variant="outlined" startIcon={<Add />} onClick={async () => { await loadArAp(); setDialog({ open: true, data: { paymentType: 'RECEIPT', partyId: '', partyType: 'CUSTOMER', amount: 0, paymentMethod: 'BANK_TRANSFER', bankAccount: '', refArId: '', refApId: '', paymentDate: new Date().toISOString().slice(0, 10), remark: '' } }); }}>新增收付款</Button></Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>编号</TableCell><TableCell>类型</TableCell><TableCell>往来方</TableCell>
              <TableCell>金额</TableCell><TableCell>方式</TableCell><TableCell>日期</TableCell>
              <TableCell>操作人</TableCell><TableCell>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.paymentNo}</TableCell>
                <TableCell><Chip label={TYPE_LABELS[r.paymentType] || r.paymentType} size="small" color={r.paymentType === 'RECEIPT' ? 'success' : 'warning'} /></TableCell>
                <TableCell>{r.partyName || '-'}</TableCell>
                <TableCell>¥{Number(r.amount).toLocaleString()}</TableCell>
                <TableCell>{r.paymentMethod || '-'}</TableCell>
                <TableCell>{r.paymentDate?.slice(0, 10)}</TableCell>
                <TableCell>{r.operator?.name || '-'}</TableCell>
                <TableCell><Chip label={STATUS_LABELS[r.status] || r.status} size="small" color="success" /></TableCell>
              </TableRow>
            ))}
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

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, data: null })} maxWidth="sm" fullWidth>
        <DialogTitle>新增收付款</DialogTitle>
        <DialogContent>
          {dialog.data && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={6}><TextField fullWidth select label="类型" value={dialog.data.paymentType} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, paymentType: e.target.value, partyType: e.target.value === 'RECEIPT' ? 'CUSTOMER' : 'SUPPLIER', refArId: '', refApId: '', partyId: '', amount: 0 } })}><MenuItem value="RECEIPT">收款</MenuItem><MenuItem value="PAYMENT">付款</MenuItem></TextField></Grid>
              <Grid item xs={6}><TextField fullWidth select label="付款方式" value={dialog.data.paymentMethod} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, paymentMethod: e.target.value } })}><MenuItem value="BANK_TRANSFER">银行转账</MenuItem><MenuItem value="CASH">现金</MenuItem><MenuItem value="CHECK">支票</MenuItem><MenuItem value="ALIPAY">支付宝</MenuItem><MenuItem value="WECHAT">微信</MenuItem></TextField></Grid>

              {dialog.data.paymentType === 'RECEIPT' ? (
                <Grid item xs={12}><TextField fullWidth select label="关联应收" value={dialog.data.refArId || ''} onChange={e => { const ar = arList.find(a => a.id === e.target.value); setDialog({ ...dialog, data: { ...dialog.data, refArId: e.target.value, partyId: ar?.customerId || '', amount: ar ? Number(ar.balance) : 0 } }); }}>{arList.map(a => <MenuItem key={a.id} value={a.id}>{a.arNo} - {a.customer?.name} (余额¥{Number(a.balance).toLocaleString()})</MenuItem>)}</TextField></Grid>
              ) : (
                <Grid item xs={12}><TextField fullWidth select label="关联应付" value={dialog.data.refApId || ''} onChange={e => { const ap = apList.find(a => a.id === e.target.value); setDialog({ ...dialog, data: { ...dialog.data, refApId: e.target.value, partyId: ap?.supplierId || '', amount: ap ? Number(ap.balance) : 0 } }); }}>{apList.map(a => <MenuItem key={a.id} value={a.id}>{a.apNo} - {a.supplier?.name} (余额¥{Number(a.balance).toLocaleString()})</MenuItem>)}</TextField></Grid>
              )}

              <Grid item xs={6}><TextField fullWidth label="金额" type="number" value={dialog.data.amount} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, amount: +e.target.value } })} /></Grid>
              <Grid item xs={6}><TextField fullWidth type="date" label="日期" value={dialog.data.paymentDate} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, paymentDate: e.target.value } })} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={6}><TextField fullWidth label="银行账号" value={dialog.data.bankAccount} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, bankAccount: e.target.value } })} /></Grid>
              <Grid item xs={6}><TextField fullWidth label="备注" value={dialog.data.remark} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, remark: e.target.value } })} /></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDialog({ open: false, data: null })}>取消</Button><Button variant="contained" onClick={handleSave}>确认</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
