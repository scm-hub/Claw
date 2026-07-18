import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, InputAdornment, MenuItem, TablePagination, Card, CardContent,
} from '@mui/material';
import { Search, Send, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import api from '../../lib/api';

const STATUS_LABELS = { PENDING: '待付款', SUBMITTED: '已提交待付款', PARTIAL: '部分付款', SETTLED: '已结清', OVERDUE: '逾期' };
const STATUS_COLORS = { PENDING: 'warning', SUBMITTED: 'info', PARTIAL: 'info', SETTLED: 'success', OVERDUE: 'error' };
const REF_TYPE_LABELS = { PURCHASE_RECEIPT: '采购入库', MANUAL: '手动创建' };

const COL_COUNT = 10; // 展开图标 + 编号 + 供应商 + 来源 + 应付金额 + 已付 + 余额 + 到期日 + 状态 + 操作

export default function PayableList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState({});
  const [expandedId, setExpandedId] = useState(null);

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
  // 翻页时收起展开状态
  useEffect(() => { setExpandedId(null); }, [page, rowsPerPage]);

  const handleSubmit = async (id) => {
    try {
      await api.put(`/finance/payable/${id}/submit`);
      loadData();
    } catch (err) { alert(err.data?.message || err.message); }
  };

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
          <Grid item><TextField size="small" select label="状态" value={status} onChange={e => setStatus(e.target.value)} sx={{ minWidth: 140 }}><MenuItem value="">全部</MenuItem>{Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}</TextField></Grid>
          <Grid item><Button variant="contained" onClick={loadData}>查询</Button></Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell padding="checkbox" sx={{ width: 36 }} />
              <TableCell sx={{ fontWeight: 600 }}>编号</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>供应商</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>来源</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>应付金额</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>已付</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>余额</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>到期日</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">状态</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COL_COUNT} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              list.map((r) => {
                const isOpen = expandedId === r.id;
                return (
                  <Fragment key={r.id}>
                    {/* === 主行 === */}
                    <TableRow
                      hover
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => setExpandedId(isOpen ? null : r.id)}
                    >
                      <TableCell padding="checkbox" sx={{ width: 36 }}>
                        <IconButton size="small" sx={{ p: 0.5 }}>
                          {isOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: isOpen ? 600 : 400 }}>
                        {r.apNo}
                      </TableCell>
                      <TableCell>{r.supplier?.name}</TableCell>
                      <TableCell>{REF_TYPE_LABELS[r.refType] || r.refType}</TableCell>
                      <TableCell>¥{Number(r.amount).toLocaleString()}</TableCell>
                      <TableCell>¥{Number(r.paidAmount).toLocaleString()}</TableCell>
                      <TableCell sx={{ color: Number(r.balance) > 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                        ¥{Number(r.balance).toLocaleString()}
                      </TableCell>
                      <TableCell>{r.dueDate?.slice(0, 10)}</TableCell>
                      <TableCell align="center">
                        <Chip label={STATUS_LABELS[r.status]} color={STATUS_COLORS[r.status]} size="small" />
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        {r.status === 'PENDING' && (
                          <Button size="small" variant="contained" color="primary"
                            onClick={() => handleSubmit(r.id)}
                            sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}
                            startIcon={<Send fontSize="small" />}>
                            提交
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* === 展开明细行 === */}
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={COL_COUNT} sx={{ py: 0, bgcolor: 'grey.50' }}>
                          <Box sx={{ px: 2, py: 2 }}>
                            <Grid container spacing={2}>
                              <Grid item xs={3}>
                                <Typography variant="caption" color="text.secondary">应付编号</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{r.apNo}</Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="caption" color="text.secondary">供应商</Typography>
                                <Typography variant="body2" fontWeight={500}>{r.supplier?.name}</Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="caption" color="text.secondary">联系方式</Typography>
                                <Typography variant="body2">{r.supplier?.contactPhone || '-'}</Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="caption" color="text.secondary">来源类型</Typography>
                                <Typography variant="body2">{REF_TYPE_LABELS[r.refType] || r.refType}</Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="caption" color="text.secondary">应付金额</Typography>
                                <Typography variant="body2" fontWeight={600} color="primary.main">¥{Number(r.amount).toLocaleString()}</Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="caption" color="text.secondary">已付金额</Typography>
                                <Typography variant="body2" color="success.main">¥{Number(r.paidAmount).toLocaleString()}</Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="caption" color="text.secondary">未付余额</Typography>
                                <Typography variant="body2" fontWeight={600} color={Number(r.balance) > 0 ? 'error.main' : 'success.main'}>¥{Number(r.balance).toLocaleString()}</Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="caption" color="text.secondary">到期日</Typography>
                                <Typography variant="body2">{r.dueDate?.slice(0, 10)}</Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="caption" color="text.secondary">状态</Typography>
                                <Chip label={STATUS_LABELS[r.status]} color={STATUS_COLORS[r.status]} size="small" />
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="caption" color="text.secondary">关联发票</Typography>
                                <Typography variant="body2">{r.invoice?.invoiceNo || '未关联'}</Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="caption" color="text.secondary">创建时间</Typography>
                                <Typography variant="body2">{new Date(r.createdAt).toLocaleString('zh-CN')}</Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
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
    </Box>
  );
}
