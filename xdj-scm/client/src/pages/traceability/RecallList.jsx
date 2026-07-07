import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, MenuItem, InputAdornment,
  TablePagination, Chip, Tooltip, Alert, List, ListItem, ListItemText,
} from '@mui/material';
import { Add, Search, Visibility, CheckCircle, AssignmentTurnedIn } from '@mui/icons-material';
import api from '../../lib/api';

const STATUS_MAP = {
  PENDING: { label: '待审批', color: 'warning' },
  APPROVED: { label: '已批准', color: 'info' },
  COMPLETED: { label: '已完成', color: 'success' },
  REJECTED: { label: '已驳回', color: 'error' },
};

export default function RecallList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [dialog, setDialog] = useState({ open: false });
  const [detailDialog, setDetailDialog] = useState({ open: false, data: null });
  const [form, setForm] = useState({});
  const [batches, setBatches] = useState([]);

  const loadList = async () => {
    try {
      const res = await api.get(`/traceability/recalls?page=${page + 1}&pageSize=${rowsPerPage}&keyword=${keyword}&status=${status}`);
      setList(res.data.list || []);
      setTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    api.get('/traceability/batches?page=1&pageSize=999&status=ACTIVE').then((res) => setBatches(res.data.list || [])).catch(console.error);
  }, []);

  useEffect(() => { loadList(); }, [page, rowsPerPage, keyword, status]);

  const handleSearch = () => { setPage(0); };

  const handleOpen = () => {
    setForm({ batchId: '', reason: '', remark: '' });
    setDialog({ open: true });
  };

  const handleSave = async () => {
    try {
      const res = await api.post('/traceability/recalls', form);
      setDialog({ open: false });
      alert(`召回单已创建！召回编号：${res.data.recall.recallNo}\n受影响客户：${res.data.affectedCustomers?.length || 0} 个`);
      loadList();
    } catch (err) { alert(err.message); }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await api.get(`/traceability/recalls/${id}`);
      setDetailDialog({ open: true, data: res.data });
    } catch (err) { alert(err.message); }
  };

  const handleApprove = async (id) => {
    if (!confirm('确认审批通过该召回？')) return;
    try { await api.put(`/traceability/recalls/${id}/approve`); loadList(); } catch (err) { alert(err.message); }
  };

  const handleComplete = async (id) => {
    if (!confirm('确认完成该召回？')) return;
    try { await api.put(`/traceability/recalls/${id}/complete`); loadList(); } catch (err) { alert(err.message); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">召回管理</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpen}>发起召回</Button>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="搜索（召回编号）" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={handleSearch}><Search /></IconButton></InputAdornment> }} />
            </Grid>
            <Grid item xs={3}>
              <TextField select fullWidth size="small" label="状态" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
                <MenuItem value="">全部</MenuItem>
                {Object.entries(STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>召回编号</TableCell><TableCell>批次号</TableCell><TableCell>物料</TableCell>
              <TableCell>供应商</TableCell><TableCell>召回原因</TableCell>
              <TableCell>受影响客户</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.recallNo}</TableCell>
                <TableCell><Chip size="small" label={item.batch?.batchNo} color="primary" variant="outlined" /></TableCell>
                <TableCell>{item.batch?.material?.name}</TableCell>
                <TableCell>{item.batch?.supplier?.name || '-'}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.reason}</TableCell>
                <TableCell>{Array.isArray(item.affectedCustomers) ? item.affectedCustomers.length : 0}</TableCell>
                <TableCell><Chip size="small" label={STATUS_MAP[item.status]?.label || item.status} color={STATUS_MAP[item.status]?.color || 'default'} /></TableCell>
                <TableCell>
                  <Tooltip title="查看"><IconButton size="small" onClick={() => handleViewDetail(item.id)}><Visibility fontSize="small" /></IconButton></Tooltip>
                  {item.status === 'PENDING' && <Tooltip title="审批通过"><IconButton size="small" color="success" onClick={() => handleApprove(item.id)}><CheckCircle fontSize="small" /></IconButton></Tooltip>}
                  {item.status === 'APPROVED' && <Tooltip title="完成召回"><IconButton size="small" color="primary" onClick={() => handleComplete(item.id)}><AssignmentTurnedIn fontSize="small" /></IconButton></Tooltip>}
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>暂无数据</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(e.target.value); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="每页行数："
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count !== -1 ? count : '超过'} 条`}
        />
      </TableContainer>

      {/* 创建召回弹窗 */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false })} maxWidth="md" fullWidth>
        <DialogTitle>发起召回</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>发起召回后将自动冻结相关批次，系统将自动收集受影响客户信息</Alert>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField select fullWidth size="small" label="选择批次" value={form.batchId || ''} onChange={(e) => setForm({ ...form, batchId: e.target.value })}>
                <MenuItem value="">选择</MenuItem>
                {batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.batchNo} - {b.material?.name} (剩余 {b.remainingQty})</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="召回原因" multiline rows={3} value={form.reason || ''} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="备注" value={form.remark || ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false })}>取消</Button>
          <Button variant="contained" color="error" onClick={handleSave}>确认发起召回</Button>
        </DialogActions>
      </Dialog>

      {/* 详情弹窗 */}
      <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, data: null })} maxWidth="md" fullWidth>
        <DialogTitle>召回详情 - {detailDialog.data?.recallNo}</DialogTitle>
        <DialogContent>
          {detailDialog.data && (
            <>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}><Typography><strong>批次：</strong>{detailDialog.data.batch?.batchNo}</Typography></Grid>
                <Grid item xs={6}><Typography><strong>物料：</strong>{detailDialog.data.batch?.material?.name}</Typography></Grid>
                <Grid item xs={6}><Typography><strong>供应商：</strong>{detailDialog.data.batch?.supplier?.name}</Typography></Grid>
                <Grid item xs={6}><Typography><strong>状态：</strong><Chip size="small" label={STATUS_MAP[detailDialog.data.status]?.label} color={STATUS_MAP[detailDialog.data.status]?.color} /></Typography></Grid>
                <Grid item xs={6}><Typography><strong>发起人：</strong>{detailDialog.data.initiator?.name || '-'}</Typography></Grid>
                <Grid item xs={6}><Typography><strong>审批人：</strong>{detailDialog.data.approver?.name || '-'}</Typography></Grid>
                <Grid item xs={12}><Typography><strong>召回原因：</strong>{detailDialog.data.reason}</Typography></Grid>
                {detailDialog.data.remark && <Grid item xs={12}><Typography><strong>备注：</strong>{detailDialog.data.remark}</Typography></Grid>}
              </Grid>

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>受影响客户</Typography>
              {Array.isArray(detailDialog.data.affectedCustomers) && detailDialog.data.affectedCustomers.length > 0 ? (
                <List dense>
                  {detailDialog.data.affectedCustomers.map((c, idx) => (
                    <ListItem key={idx}>
                      <ListItemText primary={`${c.name} (${c.code})`} secondary={`联系人：${c.contactPerson || '-'} | 电话：${c.contactPhone || '-'}`} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">无受影响客户</Typography>
              )}

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>批次流向记录</Typography>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell>日期</TableCell><TableCell>类型</TableCell><TableCell>客户</TableCell><TableCell>数量</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {detailDialog.data.batch?.trackings?.filter((t) => t.customerId).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.createdAt?.slice(0, 16).replace('T', ' ')}</TableCell>
                      <TableCell>{t.movementType}</TableCell>
                      <TableCell>{t.customer?.name}</TableCell>
                      <TableCell>{t.qty}</TableCell>
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
