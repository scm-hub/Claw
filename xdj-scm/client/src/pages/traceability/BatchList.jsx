import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, MenuItem, InputAdornment,
  TablePagination, Chip, Tooltip,
} from '@mui/material';
import { Search, Visibility, Warning, CheckCircle } from '@mui/icons-material';
import api from '../../lib/api';

const STATUS_MAP = {
  ACTIVE: { label: '在用', color: 'success' },
  FROZEN: { label: '冻结', color: 'warning' },
  EXPIRED: { label: '已过期', color: 'error' },
  RECALLED: { label: '已召回', color: 'error' },
  CONSUMED: { label: '已消耗', color: 'default' },
};

const EXPIRY_MAP = {
  NORMAL: { label: '正常', color: 'success' },
  WARNING: { label: '临近过期', color: 'warning' },
  CRITICAL: { label: '即将过期', color: 'error' },
  EXPIRED: { label: '已过期', color: 'error' },
};

export default function BatchList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [expiringDays, setExpiringDays] = useState('');
  const [detailDialog, setDetailDialog] = useState({ open: false, data: null });

  const loadList = async () => {
    try {
      const res = await api.get(`/traceability/batches?page=${page + 1}&pageSize=${rowsPerPage}&keyword=${keyword}&status=${status}&expiringDays=${expiringDays}`);
      setList(res.data.list || []);
      setTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadList(); }, [page, rowsPerPage, keyword, status, expiringDays]);

  const handleSearch = () => { setPage(0); };

  const handleViewDetail = async (id) => {
    try {
      const res = await api.get(`/traceability/batches/${id}`);
      setDetailDialog({ open: true, data: res.data });
    } catch (err) { alert(err.message); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try { await api.put(`/traceability/batches/${id}/status`, { status: newStatus }); loadList(); } catch (err) { alert(err.message); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">批次管理</Typography>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={3}>
              <TextField fullWidth size="small" label="搜索（批次号）" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={handleSearch}><Search /></IconButton></InputAdornment> }} />
            </Grid>
            <Grid item xs={2}>
              <TextField select fullWidth size="small" label="批次状态" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
                <MenuItem value="">全部</MenuItem>
                {Object.entries(STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={2}>
              <TextField select fullWidth size="small" label="临期预警" value={expiringDays} onChange={(e) => { setExpiringDays(e.target.value); setPage(0); }}>
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="7">7天内</MenuItem>
                <MenuItem value="30">30天内</MenuItem>
                <MenuItem value="60">60天内</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>批次号</TableCell><TableCell>物料</TableCell><TableCell>供应商</TableCell>
              <TableCell>生产日期</TableCell><TableCell>过期日期</TableCell><TableCell>剩余天数</TableCell>
              <TableCell>收货量</TableCell><TableCell>剩余量</TableCell>
              <TableCell>批次状态</TableCell><TableCell>临期状态</TableCell><TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell><Chip size="small" label={item.batchNo} color="primary" variant="outlined" /></TableCell>
                <TableCell>{item.material?.name}</TableCell>
                <TableCell>{item.supplier?.name || '-'}</TableCell>
                <TableCell>{item.productionDate?.slice(0, 10) || '-'}</TableCell>
                <TableCell>{item.expiryDate?.slice(0, 10) || '-'}</TableCell>
                <TableCell>
                  {item.daysLeft !== null && (
                    <Chip size="small" label={`${item.daysLeft}天`} color={item.daysLeft < 0 ? 'error' : item.daysLeft <= 7 ? 'error' : item.daysLeft <= 30 ? 'warning' : 'success'} />
                  )}
                </TableCell>
                <TableCell>{item.receivedQty}</TableCell>
                <TableCell>{item.remainingQty}</TableCell>
                <TableCell><Chip size="small" label={STATUS_MAP[item.status]?.label || item.status} color={STATUS_MAP[item.status]?.color || 'default'} /></TableCell>
                <TableCell>{item.expiryDate && <Chip size="small" label={EXPIRY_MAP[item.expiryStatus]?.label} color={EXPIRY_MAP[item.expiryStatus]?.color || 'default'} variant="outlined" />}</TableCell>
                <TableCell>
                  <Tooltip title="查看详情"><IconButton size="small" onClick={() => handleViewDetail(item.id)}><Visibility fontSize="small" /></IconButton></Tooltip>
                  {item.status === 'ACTIVE' && <Tooltip title="冻结"><IconButton size="small" color="warning" onClick={() => handleStatusChange(item.id, 'FROZEN')}><Warning fontSize="small" /></IconButton></Tooltip>}
                  {item.status === 'FROZEN' && <Tooltip title="解冻"><IconButton size="small" color="success" onClick={() => handleStatusChange(item.id, 'ACTIVE')}><CheckCircle fontSize="small" /></IconButton></Tooltip>}
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={11} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>暂无数据</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(e.target.value); setPage(0); }}
          rowsPerPageOptions={[20, 50, 100]}
          labelRowsPerPage="每页行数："
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count !== -1 ? count : '超过'} 条`}
        />
      </TableContainer>

      {/* 详情弹窗 */}
      <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, data: null })} maxWidth="lg" fullWidth>
        <DialogTitle>批次详情 - {detailDialog.data?.batchNo}</DialogTitle>
        <DialogContent>
          {detailDialog.data && (
            <>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={4}><Typography><strong>物料：</strong>{detailDialog.data.material?.name} ({detailDialog.data.material?.code})</Typography></Grid>
                <Grid item xs={4}><Typography><strong>供应商：</strong>{detailDialog.data.supplier?.name || '-'}</Typography></Grid>
                <Grid item xs={4}><Typography><strong>状态：</strong><Chip size="small" label={STATUS_MAP[detailDialog.data.status]?.label} color={STATUS_MAP[detailDialog.data.status]?.color} /></Typography></Grid>
                <Grid item xs={3}><Typography><strong>生产日期：</strong>{detailDialog.data.productionDate?.slice(0, 10) || '-'}</Typography></Grid>
                <Grid item xs={3}><Typography><strong>过期日期：</strong>{detailDialog.data.expiryDate?.slice(0, 10) || '-'}</Typography></Grid>
                <Grid item xs={3}><Typography><strong>收货量：</strong>{detailDialog.data.receivedQty}</Typography></Grid>
                <Grid item xs={3}><Typography><strong>剩余量：</strong>{detailDialog.data.remainingQty}</Typography></Grid>
              </Grid>

              {detailDialog.data.purchaseReceipt && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">采购来源</Typography>
                  <Typography variant="body2">入库编号：{detailDialog.data.purchaseReceipt.receiptNo} | 入库日期：{detailDialog.data.purchaseReceipt.receiptDate?.slice(0, 10)} | 仓库：{detailDialog.data.purchaseReceipt.purchaseOrder?.warehouse?.name || '-'}</Typography>
                  <Typography variant="body2">供应商：{detailDialog.data.purchaseReceipt.purchaseOrder?.supplier?.name}</Typography>
                </Box>
              )}

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>库存移动记录</Typography>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell>编号</TableCell><TableCell>日期</TableCell><TableCell>类型</TableCell>
                  <TableCell>方向</TableCell><TableCell>仓库</TableCell><TableCell>库位</TableCell><TableCell>数量</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {detailDialog.data.stockMovements?.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.movementNo}</TableCell>
                      <TableCell>{m.createdAt?.slice(0, 16).replace('T', ' ')}</TableCell>
                      <TableCell>{m.movementType}</TableCell>
                      <TableCell><Chip size="small" label={m.direction === 'IN' ? '入库' : '出库'} color={m.direction === 'IN' ? 'success' : 'warning'} /></TableCell>
                      <TableCell>{m.warehouse?.name}</TableCell>
                      <TableCell>{m.location?.code || '-'}</TableCell>
                      <TableCell>{m.qty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>追溯记录</Typography>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell>日期</TableCell><TableCell>类型</TableCell><TableCell>客户</TableCell>
                  <TableCell>数量</TableCell><TableCell>操作人</TableCell><TableCell>备注</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {detailDialog.data.trackings?.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.createdAt?.slice(0, 16).replace('T', ' ')}</TableCell>
                      <TableCell>{t.movementType}</TableCell>
                      <TableCell>{t.customer?.name || '-'}</TableCell>
                      <TableCell>{t.qty}</TableCell>
                      <TableCell>{t.operator?.name || '-'}</TableCell>
                      <TableCell>{t.remark || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailDialog({ open: false, data: null })}>关闭</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
