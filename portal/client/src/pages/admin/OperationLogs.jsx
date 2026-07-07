import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, InputAdornment, TablePagination,
  Chip, Stack, Tooltip, CircularProgress,
} from '@mui/material';
import {
  Search, Refresh, Assessment, Visibility, Download,
} from '@mui/icons-material';
import api from '../../api';

const ACTION_COLORS = {
  LOGIN: 'success',
  LOGIN_FAILED: 'error',
  LOGOUT: 'default',
  CREATE: 'primary',
  UPDATE: 'warning',
  DELETE: 'error',
  ACCESS_SYSTEM: 'info',
  ACCESS_DENIED: 'error',
  UNKNOWN: 'default',
};

const ACTION_LABELS = {
  LOGIN: '登录',
  LOGIN_FAILED: '登录失败',
  LOGOUT: '登出',
  CREATE: '新增',
  UPDATE: '修改',
  DELETE: '删除',
  ACCESS_SYSTEM: '访问系统',
  ACCESS_DENIED: '拒绝访问',
  UNKNOWN: '未知',
};

export default function OperationLogs() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);

  // 筛选
  const [filters, setFilters] = useState({
    userEmail: '',
    action: '',
    systemCode: '',
    targetType: '',
    startDate: '',
    endDate: '',
  });

  // 统计
  const [stats, setStats] = useState(null);

  // 详情弹窗
  const [detail, setDetail] = useState({ open: false, data: null });

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page + 1, pageSize: rowsPerPage });
      if (filters.userEmail) params.set('userEmail', filters.userEmail);
      if (filters.action) params.set('action', filters.action);
      if (filters.systemCode) params.set('systemCode', filters.systemCode);
      if (filters.targetType) params.set('targetType', filters.targetType);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);

      const resp = await api.get(`/logs?${params.toString()}`);
      setList(resp.data.list || []);
      setTotal(resp.data.total || 0);
    } catch (err) {
      console.error('加载日志失败:', err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters]);

  const loadStats = async () => {
    try {
      const resp = await api.get('/logs/stats');
      setStats(resp.data);
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  };

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadStats(); }, []);

  const handleSearch = () => {
    setPage(0);
    loadList();
  };

  const handleReset = () => {
    setFilters({ userEmail: '', action: '', systemCode: '', targetType: '', startDate: '', endDate: '' });
    setPage(0);
  };

  const handleExport = () => {
    // 导出为 CSV
    const headers = ['时间', '用户', '操作', '系统', '方法', '路径', '对象类型', '对象ID', '状态码', 'IP', '详情'];
    const rows = list.map(r => [
      new Date(r.createdAt).toLocaleString('zh-CN'),
      r.userName ? `${r.userName}(${r.userEmail})` : r.userEmail,
      ACTION_LABELS[r.action] || r.action,
      r.systemCode || '-',
      r.method || '-',
      r.path || '-',
      r.targetType || '-',
      r.targetId || '-',
      r.statusCode || '-',
      r.ip || '-',
      r.detail || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = '\ufeff' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `操作日志_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', { hour12: false });
  };

  return (
    <Box>
      {/* 统计卡片 */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'primary.light', color: 'white' }}>
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>总操作数</Typography>
                <Typography variant="h4" fontWeight={700}>{stats.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>今日操作</Typography>
                <Typography variant="h4" fontWeight={700}>{stats.todayCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">操作类型分布</Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                  {stats.byAction.slice(0, 4).map((a) => (
                    <Chip key={a.action} size="small" label={`${ACTION_LABELS[a.action] || a.action}: ${a.count}`} variant="outlined" />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">操作对象 TOP 5</Typography>
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {(stats.byTarget || []).slice(0, 5).map((t) => (
                    <Typography key={t.targetType} variant="caption">
                      {t.targetType}: {t.count} 次
                    </Typography>
                  ))}
                  {(!stats.byTarget || stats.byTarget.length === 0) && (
                    <Typography variant="caption" color="text.secondary">暂无数据</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 筛选栏 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2.5}>
              <TextField
                size="small" fullWidth label="用户邮箱" value={filters.userEmail}
                onChange={(e) => setFilters({ ...filters, userEmail: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </Grid>
            <Grid item xs={6} md={1.5}>
              <TextField
                size="small" fullWidth select label="操作类型" value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              >
                <MenuItem value="">全部</MenuItem>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={1.5}>
              <TextField
                size="small" fullWidth select label="子系统" value={filters.systemCode}
                onChange={(e) => setFilters({ ...filters, systemCode: e.target.value })}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="hrms">人力系统</MenuItem>
                <MenuItem value="scm">供应链</MenuItem>
                <MenuItem value="MDM">主数据</MenuItem>
                <MenuItem value="ai-service">AI 服务</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} md={1.5}>
              <TextField
                size="small" fullWidth label="操作对象" placeholder="产品/客户/供应商..."
                value={filters.targetType}
                onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </Grid>
            <Grid item xs={6} md={1.5}>
              <TextField
                size="small" fullWidth type="date" label="开始日期"
                value={filters.startDate}
                InputLabelProps={{ shrink: true }}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} md={1.5}>
              <TextField
                size="small" fullWidth type="date" label="结束日期"
                value={filters.endDate}
                InputLabelProps={{ shrink: true }}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={0.5}>
              <Stack direction="row" spacing={1}>
                <IconButton color="primary" onClick={handleSearch} title="搜索">
                  <Search />
                </IconButton>
                <IconButton color="default" onClick={handleReset} title="重置">
                  <Refresh />
                </IconButton>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 工具栏 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">操作日志</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<Refresh />} onClick={() => { loadList(); loadStats(); }}>刷新</Button>
          <Button size="small" startIcon={<Download />} onClick={handleExport}>导出 CSV</Button>
        </Stack>
      </Box>

      {/* 日志表格 */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>时间</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>用户</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>IP</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>操作</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>系统</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>操作对象</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>详情</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>状态</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>查看</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  暂无日志记录
                </TableCell>
              </TableRow>
            ) : (
              list.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                    {formatTime(log.createdAt)}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {log.userName ? (
                      <Tooltip title={log.userEmail}>
                        <span>{log.userName}</span>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption">{log.userEmail}</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                    {log.ip || '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={ACTION_LABELS[log.action] || log.action}
                      color={ACTION_COLORS[log.action] || 'default'}
                      variant={log.action === 'DELETE' ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {log.systemCode ? (
                      <Chip size="small" label={log.systemCode} variant="outlined" />
                    ) : '-'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {log.targetType ? (
                      <Chip size="small" label={log.targetType} color="secondary" variant="outlined" />
                    ) : '-'}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                    {log.detail || '-'}
                  </TableCell>
                  <TableCell>
                    {log.statusCode ? (
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color={log.statusCode >= 200 && log.statusCode < 300 ? 'success.main' : 'error.main'}
                      >
                        {log.statusCode}
                      </Typography>
                    ) : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => setDetail({ open: true, data: log })}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="每页"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </TableContainer>

      {/* 详情弹窗 */}
      <Dialog
        open={detail.open}
        onClose={() => setDetail({ open: false, data: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>操作日志详情</DialogTitle>
        <DialogContent>
          {detail.data && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="时间" value={formatTime(detail.data.createdAt)} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="用户邮箱" value={detail.data.userEmail || '-'} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="用户名" value={detail.data.userName || '-'} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="IP 地址" value={detail.data.ip || '-'} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="操作类型" value={ACTION_LABELS[detail.data.action] || detail.data.action} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="系统" value={detail.data.systemCode || '-'} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth size="small" label="HTTP 方法" value={detail.data.method || '-'} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth size="small" label="状态码" value={detail.data.statusCode || '-'} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth size="small" label="User-Agent" value={detail.data.userAgent || '-'} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="对象类型" value={detail.data.targetType || '-'} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="对象 ID" value={detail.data.targetId || '-'} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="API 路径" value={detail.data.path || '-'} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="操作详情" value={detail.data.detail || '-'} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="请求体 (JSON)"
                  multiline
                  rows={4}
                  value={detail.data.requestBody || '(无)'}
                  InputProps={{ readOnly: true }}
                  sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail({ open: false, data: null })}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
