import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, MenuItem, TablePagination,
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import api from '../../lib/api';

const STATUS_LABELS = { ISSUED: '已开具', CANCELLED: '已作废' };
const STATUS_COLORS = { ISSUED: 'success', CANCELLED: 'error' };
const DIR_LABELS = { SALES: '销项(开票)', PURCHASE: '进项(收票)' };
const TYPE_LABELS = { VAT_SPECIAL: '增值税专票', VAT_NORMAL: '增值税普票', ELECTRONIC: '电子发票' };

export default function InvoiceList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [direction, setDirection] = useState('');
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [arList, setArList] = useState([]);
  const [apList, setApList] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: page + 1, pageSize: rowsPerPage });
      if (keyword) params.set('keyword', keyword);
      if (status) params.set('status', status);
      if (direction) params.set('direction', direction);
      const res = await api.get(`/finance/invoices?${params}`);
      setList(res.data.list || []);
      setTotal(res.data.total || 0);
    } catch (e) { console.error(e); }
  }, [page, rowsPerPage, keyword, status, direction]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadArAp = async () => {
    try {
      const [arRes, apRes] = await Promise.all([
        api.get('/finance/receivable?pageSize=999'),
        api.get('/finance/payable?pageSize=999'),
      ]);
      setArList(arRes.data?.list || []);
      setApList(apRes.data?.list || []);
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    const { data } = dialog;
    try {
      await api.post('/finance/invoices', data);
      setDialog({ open: false, data: null });
      loadData();
    } catch (e) { alert(e.message); }
  };

  const handleCancel = async (id) => {
    if (!confirm('确认作废该发票？')) return;
    try { await api.put(`/finance/invoices/${id}/cancel`); loadData(); }
    catch (e) { alert(e.message); }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>发票管理</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item><TextField size="small" placeholder="发票号" value={keyword} onChange={e => setKeyword(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} /></Grid>
          <Grid item><TextField size="small" select label="方向" value={direction} onChange={e => setDirection(e.target.value)} sx={{ minWidth: 120 }}><MenuItem value="">全部</MenuItem><MenuItem value="SALES">销项</MenuItem><MenuItem value="PURCHASE">进项</MenuItem></TextField></Grid>
          <Grid item><TextField size="small" select label="状态" value={status} onChange={e => setStatus(e.target.value)} sx={{ minWidth: 100 }}><MenuItem value="">全部</MenuItem><MenuItem value="ISSUED">已开具</MenuItem><MenuItem value="CANCELLED">已作废</MenuItem></TextField></Grid>
          <Grid item><Button variant="contained" onClick={loadData}>查询</Button></Grid>
          <Grid item><Button variant="outlined" startIcon={<Add />} onClick={async () => { await loadArAp(); setDialog({ open: true, data: { invoiceNo: '', invoiceType: 'VAT_SPECIAL', direction: 'SALES', partyId: '', partyType: 'CUSTOMER', amount: 0, taxAmount: 0, invoiceDate: new Date().toISOString().slice(0, 10), relatedArId: '', relatedApId: '' } }); }}>开具发票</Button></Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>发票号</TableCell><TableCell>方向</TableCell><TableCell>类型</TableCell>
              <TableCell>金额</TableCell><TableCell>税额</TableCell><TableCell>价税合计</TableCell>
              <TableCell>开票日期</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.invoiceNo}</TableCell>
                <TableCell><Chip label={DIR_LABELS[r.direction] || r.direction} size="small" color={r.direction === 'SALES' ? 'primary' : 'default'} /></TableCell>
                <TableCell>{TYPE_LABELS[r.invoiceType] || r.invoiceType}</TableCell>
                <TableCell>¥{Number(r.amount).toLocaleString()}</TableCell>
                <TableCell>¥{Number(r.taxAmount).toLocaleString()}</TableCell>
                <TableCell>¥{Number(r.grandTotal).toLocaleString()}</TableCell>
                <TableCell>{r.invoiceDate?.slice(0, 10)}</TableCell>
                <TableCell><Chip label={STATUS_LABELS[r.status]} color={STATUS_COLORS[r.status]} size="small" /></TableCell>
                <TableCell>{r.status === 'ISSUED' && <Button size="small" color="error" onClick={() => handleCancel(r.id)}>作废</Button>}</TableCell>
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
        <DialogTitle>开具发票</DialogTitle>
        <DialogContent>
          {dialog.data && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={6}><TextField fullWidth label="发票号" value={dialog.data.invoiceNo} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, invoiceNo: e.target.value } })} placeholder="留空自动生成" /></Grid>
              <Grid item xs={6}><TextField fullWidth select label="方向" value={dialog.data.direction} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, direction: e.target.value, partyType: e.target.value === 'SALES' ? 'CUSTOMER' : 'SUPPLIER', relatedArId: '', relatedApId: '' } })}><MenuItem value="SALES">销项(开票)</MenuItem><MenuItem value="PURCHASE">进项(收票)</MenuItem></TextField></Grid>
              <Grid item xs={6}><TextField fullWidth select label="发票类型" value={dialog.data.invoiceType} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, invoiceType: e.target.value } })}><MenuItem value="VAT_SPECIAL">增值税专票</MenuItem><MenuItem value="VAT_NORMAL">增值税普票</MenuItem><MenuItem value="ELECTRONIC">电子发票</MenuItem></TextField></Grid>
              <Grid item xs={6}><TextField fullWidth type="date" label="开票日期" value={dialog.data.invoiceDate} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, invoiceDate: e.target.value } })} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={6}><TextField fullWidth label="金额(不含税)" type="number" value={dialog.data.amount} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, amount: +e.target.value } })} /></Grid>
              <Grid item xs={6}><TextField fullWidth label="税额" type="number" value={dialog.data.taxAmount} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, taxAmount: +e.target.value } })} /></Grid>
              {dialog.data.direction === 'SALES' ? (
                <Grid item xs={12}><TextField fullWidth select label="关联应收" value={dialog.data.relatedArId || ''} onChange={e => { const ar = arList.find(a => a.id === e.target.value); setDialog({ ...dialog, data: { ...dialog.data, relatedArId: e.target.value, partyId: ar?.customerId || '', amount: ar ? Number(ar.amount) : 0 } }); }}>{arList.map(a => <MenuItem key={a.id} value={a.id}>{a.arNo} - {a.customer?.name} (¥{Number(a.amount).toLocaleString()})</MenuItem>)}</TextField></Grid>
              ) : (
                <Grid item xs={12}><TextField fullWidth select label="关联应付" value={dialog.data.relatedApId || ''} onChange={e => { const ap = apList.find(a => a.id === e.target.value); setDialog({ ...dialog, data: { ...dialog.data, relatedApId: e.target.value, partyId: ap?.supplierId || '', amount: ap ? Number(ap.amount) : 0 } }); }}>{apList.map(a => <MenuItem key={a.id} value={a.id}>{a.apNo} - {a.supplier?.name} (¥{Number(a.amount).toLocaleString()})</MenuItem>)}</TextField></Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDialog({ open: false, data: null })}>取消</Button><Button variant="contained" onClick={handleSave}>开具</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
