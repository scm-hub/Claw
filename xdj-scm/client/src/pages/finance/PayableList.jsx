import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  InputAdornment, MenuItem, TablePagination, Card, CardContent,
} from '@mui/material';
import { Search, Visibility } from '@mui/icons-material';
import api from '../../lib/api';

const STATUS_LABELS = { PENDING: '待付款', PARTIAL: '部分付款', SETTLED: '已结清', OVERDUE: '逾期' };
const STATUS_COLORS = { PENDING: 'warning', PARTIAL: 'info', SETTLED: 'success', OVERDUE: 'error' };

export default function PayableList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState({});
  const [detail, setDetail] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: page + 1, pageSize: rowsPerPage });
      if (keyword) params.set('keyword', keyword);
      if (status) params.set('status', status);
      const res = await api.get(`/finance/payable?${params}`);
      setList(res.data.list || []);
      setTotal(res.data.total || 0);
      setSummary(res.data.summary || {});
    } catch (e) { console.error(e); }
  }, [page, rowsPerPage, keyword, status]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>应付账款</Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={3}><Card><CardContent><Typography color="textSecondary" variant="body2">应付总额</Typography><Typography variant="h5" fontWeight={700}>¥{Number(summary.amount || 0).toLocaleString()}</Typography></CardContent></Card></Grid>
        <Grid item xs={3}><Card><CardContent><Typography color="textSecondary" variant="body2">已付金额</Typography><Typography variant="h5" color="success.main" fontWeight={700}>¥{Number(summary.paidAmount || 0).toLocaleString()}</Typography></CardContent></Card></Grid>
        <Grid item xs={3}><Card><CardContent><Typography color="textSecondary" variant="body2">未付余额</Typography><Typography variant="h5" color="error.main" fontWeight={700}>¥{Number(summary.balance || 0).toLocaleString()}</Typography></CardContent></Card></Grid>
        <Grid item xs={3}><Card><CardContent><Typography color="textSecondary" variant="body2">记录数</Typography><Typography variant="h5" fontWeight={700}>{total}</Typography></CardContent></Card></Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item><TextField size="small" placeholder="编号" value={keyword} onChange={e => setKeyword(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} /></Grid>
          <Grid item><TextField size="small" select label="状态" value={status} onChange={e => setStatus(e.target.value)} sx={{ minWidth: 120 }}><MenuItem value="">全部</MenuItem>{Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}</TextField></Grid>
          <Grid item><Button variant="contained" onClick={loadData}>查询</Button></Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>编号</TableCell><TableCell>供应商</TableCell><TableCell>来源</TableCell>
              <TableCell>应付金额</TableCell><TableCell>已付</TableCell><TableCell>余额</TableCell>
              <TableCell>到期日</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.apNo}</TableCell>
                <TableCell>{r.supplier?.name}</TableCell>
                <TableCell>{r.refType === 'PURCHASE_RECEIPT' ? '采购入库' : r.refType}</TableCell>
                <TableCell>¥{Number(r.amount).toLocaleString()}</TableCell>
                <TableCell>¥{Number(r.paidAmount).toLocaleString()}</TableCell>
                <TableCell>¥{Number(r.balance).toLocaleString()}</TableCell>
                <TableCell>{r.dueDate?.slice(0, 10)}</TableCell>
                <TableCell><Chip label={STATUS_LABELS[r.status]} color={STATUS_COLORS[r.status]} size="small" /></TableCell>
                <TableCell><IconButton size="small" onClick={async () => { const res = await api.get(`/finance/payable/${r.id}`); setDetail(res.data); }}><Visibility /></IconButton></TableCell>
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

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>应付账款详情</DialogTitle>
        <DialogContent>
          {detail && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={6}><Typography>编号: {detail.apNo}</Typography></Grid>
              <Grid item xs={6}><Typography>供应商: {detail.supplier?.name}</Typography></Grid>
              <Grid item xs={6}><Typography>来源: {detail.refType}</Typography></Grid>
              <Grid item xs={6}><Typography>状态: <Chip label={STATUS_LABELS[detail.status]} color={STATUS_COLORS[detail.status]} size="small" /></Typography></Grid>
              <Grid item xs={6}><Typography>应付: ¥{Number(detail.amount).toLocaleString()}</Typography></Grid>
              <Grid item xs={6}><Typography>已付: ¥{Number(detail.paidAmount).toLocaleString()}</Typography></Grid>
              <Grid item xs={6}><Typography>余额: ¥{Number(detail.balance).toLocaleString()}</Typography></Grid>
              <Grid item xs={6}><Typography>到期日: {detail.dueDate?.slice(0, 10)}</Typography></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetail(null)}>关闭</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
