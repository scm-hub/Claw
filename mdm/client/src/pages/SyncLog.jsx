import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Grid, Pagination,
} from '@mui/material';
import api from '../api';

export default function SyncLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState('');
  const [detailDialog, setDetailDialog] = useState(null);

  const pageSize = 20;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, pageSize };
      if (filterType) params.syncType = filterType;
      const res = await api.get('/sync-logs', { params });
      setLogs(res.data);
      setTotal(res.pagination.total);
    } catch (err) {
      setError(err.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, filterType]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const statusColors = { SUCCESS: 'success', PARTIAL: 'warning', FAILED: 'error', RUNNING: 'info' };
  const typeLabels = {
    PULL_FROM_HRMS: '从 HRMS 拉取',
    PUSH_TO_SCM: '推送到 SCM',
    FULL_SYNC: '完整同步',
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>同步日志</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={4}>
          <TextField
            select fullWidth size="small" label="同步类型"
            value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          >
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="PULL_FROM_HRMS">从 HRMS 拉取</MenuItem>
            <MenuItem value="PUSH_TO_SCM">推送到 SCM</MenuItem>
            <MenuItem value="FULL_SYNC">完整同步</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>类型</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>总数</TableCell>
              <TableCell>成功</TableCell>
              <TableCell>失败</TableCell>
              <TableCell>开始时间</TableCell>
              <TableCell>耗时</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => {
              const duration = log.finishedAt
                ? ((new Date(log.finishedAt) - new Date(log.startedAt)) / 1000).toFixed(1) + 's'
                : '进行中...';
              return (
                <TableRow key={log.id} hover>
                  <TableCell>{typeLabels[log.syncType] || log.syncType}</TableCell>
                  <TableCell><Chip size="small" label={log.status} color={statusColors[log.status] || 'default'} /></TableCell>
                  <TableCell>{log.totalRecords}</TableCell>
                  <TableCell sx={{ color: 'success.main' }}>{log.successCount}</TableCell>
                  <TableCell sx={{ color: log.failedCount > 0 ? 'error.main' : 'inherit' }}>{log.failedCount}</TableCell>
                  <TableCell>{new Date(log.startedAt).toLocaleString('zh-CN')}</TableCell>
                  <TableCell>{duration}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => setDetailDialog(log)}>详情</Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {logs.length === 0 && !loading && (
              <TableRow><TableCell colSpan={8} align="center">暂无同步日志</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {total > pageSize && (
        <Box display="flex" justifyContent="center" mt={2}>
          <Pagination
            count={Math.ceil(total / pageSize)}
            page={page}
            onChange={(e, p) => setPage(p)}
            color="primary"
          />
        </Box>
      )}

      <Dialog open={!!detailDialog} onClose={() => setDetailDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>同步日志详情</DialogTitle>
        <DialogContent>
          {detailDialog && (
            <Box>
              <Grid container spacing={2} mb={2}>
                <Grid item xs={6}><Typography variant="body2">类型: {typeLabels[detailDialog.syncType] || detailDialog.syncType}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2">状态: {detailDialog.status}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2">开始: {new Date(detailDialog.startedAt).toLocaleString('zh-CN')}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2">结束: {detailDialog.finishedAt ? new Date(detailDialog.finishedAt).toLocaleString('zh-CN') : '—'}</Typography></Grid>
                <Grid item xs={4}><Typography variant="body2">总数: {detailDialog.totalRecords}</Typography></Grid>
                <Grid item xs={4}><Typography variant="body2">成功: {detailDialog.successCount}</Typography></Grid>
                <Grid item xs={4}><Typography variant="body2">失败: {detailDialog.failedCount}</Typography></Grid>
              </Grid>
              <Typography variant="subtitle2" mt={2} mb={1}>详细信息:</Typography>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto', bgcolor: 'grey.50' }}>
                <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {(() => {
                    try { return JSON.stringify(JSON.parse(detailDialog.details), null, 2); }
                    catch { return detailDialog.details; }
                  })()}
                </pre>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
