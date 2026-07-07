import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Paper, Button, TextField, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
  TablePagination, LinearProgress, IconButton, Tooltip, Tabs, Tab,
} from '@mui/material';
import { Refresh, Edit, Visibility, Warning, Block, CheckCircle } from '@mui/icons-material';
import api from '../../lib/api';

const STATUS_LABELS = { NORMAL: '正常', ATTENTION: '关注', WARNING: '预警', FROZEN: '冻结' };
const STATUS_COLORS = { NORMAL: 'success', ATTENTION: 'info', WARNING: 'warning', FROZEN: 'error' };
const STATUS_ICONS = { NORMAL: <CheckCircle />, ATTENTION: <CheckCircle />, WARNING: <Warning />, FROZEN: <Block /> };
const STATUS_TOOLTIPS = {
  NORMAL: '使用率 < 50% 且无超期欠款。客户可正常下单，无任何限制。',
  ATTENTION: '使用率 50%~80%。客户仍可正常下单，建议关注回款进度。',
  WARNING: '使用率 80%~100%。客户接近额度上限，下单时会有严重警告，建议尽快催款或调整额度。',
  FROZEN: '使用率 ≥ 100% 或存在超期欠款。客户已冻结，无法创建新的销售订单，必须还款或调整额度后才可恢复。',
};

export default function CreditManagement() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, data: null });
  const [detailDialog, setDetailDialog] = useState({ open: false, data: null });
  const [detailTab, setDetailTab] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page + 1, pageSize: rowsPerPage });
      if (keyword) params.set('keyword', keyword);
      const res = await api.get(`/sales/credit/overview?${params}`);
      setList(res.data.list || []);
      setTotal(res.data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, rowsPerPage, keyword]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleEdit = (row) => {
    setEditDialog({ open: true, data: { id: row.id, name: row.name, creditLimit: row.creditLimit, creditPeriod: row.creditPeriod } });
  };

  const handleSaveCredit = async () => {
    try {
      await api.put(`/sales/credit/${editDialog.data.id}`, {
        creditLimit: editDialog.data.creditLimit === '' || editDialog.data.creditLimit === undefined ? 0 : Number(editDialog.data.creditLimit),
        creditPeriod: editDialog.data.creditPeriod === '' || editDialog.data.creditPeriod === undefined ? 0 : Number(editDialog.data.creditPeriod),
      });
      setEditDialog({ open: false, data: null });
      loadData();
    } catch (e) { alert(e.message); }
  };

  const handleViewDetail = async (customerId) => {
    try {
      const res = await api.get(`/sales/credit/${customerId}`);
      setDetailDialog({ open: true, data: res.data });
      setDetailTab(0);
    } catch (e) { alert(e.message); }
  };

  // 汇总
  const summary = list.reduce((acc, c) => {
    acc.totalCredit += c.creditLimit;
    acc.totalUsed += c.usedCredit;
    acc.totalOverdue += c.overdueAmount;
    if (c.creditStatus === 'FROZEN') acc.frozen++;
    if (c.creditStatus === 'WARNING') acc.warning++;
    return acc;
  }, { totalCredit: 0, totalUsed: 0, totalOverdue: 0, frozen: 0, warning: 0 });

  const summaryCards = [
    { label: '信用总额度', value: `¥${summary.totalCredit.toLocaleString()}`, color: '#1976d2' },
    { label: '已用额度', value: `¥${summary.totalUsed.toLocaleString()}`, color: '#ed6c02' },
    { label: '可用额度', value: `¥${Math.max(0, summary.totalCredit - summary.totalUsed).toLocaleString()}`, color: '#2e7d32' },
    { label: '超期金额', value: `¥${summary.totalOverdue.toLocaleString()}`, color: '#d32f2f' },
    { label: '预警客户', value: summary.warning, color: '#ed6c02' },
    { label: '冻结客户', value: summary.frozen, color: '#d32f2f' },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>客户信用管控</Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {summaryCards.map((c) => (
          <Grid item xs={12} sm={6} md={2} key={c.label}>
            <Card sx={{ borderTop: `3px solid ${c.color}` }}>
              <CardContent>
                <Typography variant="caption" color="textSecondary">{c.label}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: c.color }}>{c.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <TextField size="small" placeholder="客户名称/编码" value={keyword} onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()} />
          </Grid>
          <Grid item><Button variant="contained" startIcon={<Refresh />} onClick={() => { setPage(0); loadData(); }}>查询</Button></Grid>
        </Grid>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>客户编码</TableCell><TableCell>客户名称</TableCell><TableCell>联系人</TableCell>
              <TableCell>信用额度</TableCell><TableCell>已用额度</TableCell><TableCell>可用额度</TableCell>
              <TableCell>使用率</TableCell><TableCell>超期</TableCell><TableCell>信用状态</TableCell><TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>{c.code}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.contactPerson || '-'} {c.contactPhone || ''}</TableCell>
                <TableCell>¥{c.creditLimit.toLocaleString()}</TableCell>
                <TableCell>¥{c.usedCredit.toLocaleString()}</TableCell>
                <TableCell>¥{c.availableCredit.toLocaleString()}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title={`${c.usageRatio}%`}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, c.usageRatio)}
                        color={c.usageRatio >= 100 ? 'error' : c.usageRatio >= 80 ? 'warning' : 'success'}
                        sx={{ width: 80 }}
                      />
                    </Tooltip>
                    <Typography variant="body2" fontWeight={600}>{c.usageRatio.toFixed(1)}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>{c.overdueAmount > 0 ? <Chip label={`¥${c.overdueAmount}`} color="error" size="small" /> : '-'}</TableCell>
                <TableCell>
                  <Tooltip title={STATUS_TOOLTIPS[c.creditStatus] || ''} arrow placement="top">
                    <Chip
                      label={STATUS_LABELS[c.creditStatus]}
                      color={STATUS_COLORS[c.creditStatus]}
                      size="small"
                      icon={STATUS_ICONS[c.creditStatus]}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <Button size="small" variant="contained" color="primary" onClick={() => handleViewDetail(c.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>查看</Button>
                    <Button size="small" variant="contained" color="primary" onClick={() => handleEdit(c)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>编辑</Button>
                  </Stack>
                </TableCell>
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
          onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }}
        />
      </TableContainer>

      {/* 编辑信用额度 */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, data: null })} maxWidth="xs" fullWidth>
        <DialogTitle>编辑信用额度 - {editDialog.data?.name}</DialogTitle>
        <DialogContent>
          {editDialog.data && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField fullWidth label="信用额度(元)" type="number" value={editDialog.data.creditLimit ?? ''}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditDialog({ ...editDialog, data: { ...editDialog.data, creditLimit: e.target.value === '' ? '' : Number(e.target.value) } })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="账期(天)" type="number" value={editDialog.data.creditPeriod ?? ''}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditDialog({ ...editDialog, data: { ...editDialog.data, creditPeriod: e.target.value === '' ? '' : Number(e.target.value) } })} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, data: null })}>取消</Button>
          <Button variant="contained" onClick={handleSaveCredit}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 信用详情 */}
      <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, data: null })} maxWidth="md" fullWidth>
        <DialogTitle>客户信用详情 - {detailDialog.data?.customer?.name}</DialogTitle>
        <DialogContent>
          {detailDialog.data && (
            <>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={3}><Card><CardContent><Typography variant="caption">信用额度</Typography><Typography variant="h6">¥{Number(detailDialog.data.customer.creditLimit).toLocaleString()}</Typography></CardContent></Card></Grid>
                <Grid item xs={3}><Card><CardContent><Typography variant="caption">已用额度</Typography><Typography variant="h6" color="warning.main">¥{detailDialog.data.credit.usedCredit.toLocaleString()}</Typography></CardContent></Card></Grid>
                <Grid item xs={3}><Card><CardContent><Typography variant="caption">可用额度</Typography><Typography variant="h6" color="success.main">¥{detailDialog.data.credit.availableCredit.toLocaleString()}</Typography></CardContent></Card></Grid>
                <Grid item xs={3}><Card><CardContent><Typography variant="caption">超期金额</Typography><Typography variant="h6" color="error.main">¥{detailDialog.data.credit.overdueAmount.toLocaleString()}</Typography></CardContent></Card></Grid>
              </Grid>
              <Tabs value={detailTab} onChange={(e, v) => setDetailTab(v)}>
                <Tab label={`应收账款(${detailDialog.data.receivables.length})`} />
                <Tab label={`未完成订单(${detailDialog.data.pendingOrders.length})`} />
              </Tabs>
              {detailTab === 0 ? (
                <TableContainer component={Paper} sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>AR编号</TableCell><TableCell>金额</TableCell><TableCell>余额</TableCell><TableCell>到期日</TableCell><TableCell>状态</TableCell></TableRow></TableHead>
                    <TableBody>
                      {detailDialog.data.receivables.map((ar) => (
                        <TableRow key={ar.id}>
                          <TableCell>{ar.arNo}</TableCell>
                          <TableCell>¥{Number(ar.amount).toLocaleString()}</TableCell>
                          <TableCell>¥{Number(ar.balance).toLocaleString()}</TableCell>
                          <TableCell>{ar.dueDate?.slice(0, 10)}</TableCell>
                          <TableCell>{ar.isOverdue ? <Chip label={`超期${ar.daysOverdue}天`} color="error" size="small" /> : <Chip label="正常" color="success" size="small" />}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <TableContainer component={Paper} sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>订单号</TableCell><TableCell>金额</TableCell><TableCell>状态</TableCell><TableCell>日期</TableCell></TableRow></TableHead>
                    <TableBody>
                      {detailDialog.data.pendingOrders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell>{o.orderNo}</TableCell>
                          <TableCell>¥{Number(o.grandTotal).toLocaleString()}</TableCell>
                          <TableCell><Chip label={o.status} size="small" /></TableCell>
                          <TableCell>{o.orderDate?.slice(0, 10)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailDialog({ open: false, data: null })}>关闭</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
