import { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SyncIcon from '@mui/icons-material/Sync';
import api from '../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleSync = async (type) => {
    setSyncing(type);
    setMessage(null);
    try {
      const endpoint = type === 'pull' ? '/sync/pull-hrms' : type === 'push' ? '/sync/push-scm' : '/sync/full';
      const res = await api.post(endpoint);
      setMessage({ type: 'success', text: `同步完成！${JSON.stringify(res.data).substring(0, 200)}` });
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || '同步失败' });
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;
  }

  const { masterData, scmSync, recentLogs } = data || {};

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>主数据管理仪表盘</Typography>

      {message && <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card><CardContent>
            <Typography color="text.secondary" variant="body2" gutterBottom>部门主数据</Typography>
            <Typography variant="h4" fontWeight="bold" color="primary.main">{masterData?.departments || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card><CardContent>
            <Typography color="text.secondary" variant="body2" gutterBottom>员工主数据</Typography>
            <Typography variant="h4" fontWeight="bold" color="primary.main">{masterData?.employees || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card><CardContent>
            <Typography color="text.secondary" variant="body2" gutterBottom>SCM 已同步</Typography>
            <Typography variant="h4" fontWeight="bold" color="success.main">
              {(scmSync?.deptMappings || 0) + (scmSync?.empMappings || 0)}
            </Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card><CardContent>
            <Typography color="text.secondary" variant="body2" gutterBottom>待同步/失败</Typography>
            <Typography variant="h4" fontWeight="bold" color="error.main">{scmSync?.pending || 0}</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Typography variant="h6" fontWeight="bold" mb={2}>同步操作</Typography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Button
            fullWidth variant="outlined" size="large" startIcon={<CloudDownloadIcon />}
            onClick={() => handleSync('pull')} disabled={!!syncing}
            sx={{ py: 1.5 }}
          >
            {syncing === 'pull' ? <CircularProgress size={20} /> : '从 HRMS 拉取'}
          </Button>
        </Grid>
        <Grid item xs={12} md={4}>
          <Button
            fullWidth variant="outlined" size="large" color="secondary" startIcon={<CloudUploadIcon />}
            onClick={() => handleSync('push')} disabled={!!syncing}
            sx={{ py: 1.5 }}
          >
            {syncing === 'push' ? <CircularProgress size={20} /> : '推送到 SCM'}
          </Button>
        </Grid>
        <Grid item xs={12} md={4}>
          <Button
            fullWidth variant="contained" size="large" startIcon={<SyncIcon />}
            onClick={() => handleSync('full')} disabled={!!syncing}
            sx={{ py: 1.5 }}
          >
            {syncing === 'full' ? <CircularProgress size={20} color="inherit" /> : '完整同步（拉取+推送）'}
          </Button>
        </Grid>
      </Grid>

      <Typography variant="h6" fontWeight="bold" mb={2}>最近同步记录</Typography>
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
            </TableRow>
          </TableHead>
          <TableBody>
            {(recentLogs || []).map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.syncType}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={log.status}
                    color={log.status === 'SUCCESS' ? 'success' : log.status === 'FAILED' ? 'error' : 'warning'}
                  />
                </TableCell>
                <TableCell>{log.totalRecords}</TableCell>
                <TableCell>{log.successCount}</TableCell>
                <TableCell>{log.failedCount}</TableCell>
                <TableCell>{new Date(log.startedAt).toLocaleString('zh-CN')}</TableCell>
              </TableRow>
            ))}
            {(!recentLogs || recentLogs.length === 0) && (
              <TableRow><TableCell colSpan={6} align="center">暂无同步记录</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
