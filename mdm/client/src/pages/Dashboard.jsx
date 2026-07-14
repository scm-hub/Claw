import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Button, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  Divider, Tabs, Tab,
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SyncIcon from '@mui/icons-material/Sync';
import HubIcon from '@mui/icons-material/Hub';
import api from '../api';

const STATUS_MAP = {
  SUCCESS: '成功',
  FAILED: '失败',
  PARTIAL: '部分成功',
  IN_PROGRESS: '进行中',
  PENDING: '待执行',
  SKIPPED: '已跳过',
};

const ENTITY_MAP = {
  MATERIAL: '物料',
  SUPPLIER: '供应商',
  CUSTOMER: '客户',
  EMPLOYEE: '员工',
  DEPARTMENT: '部门',
  WAREHOUSE: '仓库',
  ALL: '全部',
};

const getStatusColor = (s) => {
  if (s === 'SUCCESS') return 'success';
  if (s === 'FAILED') return 'error';
  if (s === 'PARTIAL') return 'warning';
  if (s === 'IN_PROGRESS') return 'info';
  return 'default';
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [kingdeeStatus, setKingdeeStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [message, setMessage] = useState(null);
  const [asyncTask, setAsyncTask] = useState(null);
  const [syncTab, setSyncTab] = useState(0);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, kdRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/kingdee/status'),
      ]);
      setData(dashRes.data);
      setKingdeeStatus(kdRes.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // 轮询异步全量同步任务状态
  useEffect(() => {
    if (!asyncTask?.taskId) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/kingdee/sync-tasks/${asyncTask.taskId}`);
        const task = res.data?.data;
        if (!task) return;
        setAsyncTask((prev) => ({ ...prev, ...task }));
        if (task.status === 'SUCCESS' || task.status === 'PARTIAL') {
          clearInterval(interval);
          setSyncing(null);
          const text = `全量同步完成！共处理 ${task.total || 0} 条记录（成功 ${task.processed || 0}，失败 ${task.failed || 0}）`;
          setMessage({
            type: task.status === 'PARTIAL' ? 'warning' : 'success',
            text,
          });
          fetchDashboard();
          // 5 秒后自动关闭任务状态提示
          setTimeout(() => {
            setAsyncTask(null);
          }, 5000);
        } else if (task.status === 'FAILED') {
          clearInterval(interval);
          setSyncing(null);
          setMessage({ type: 'error', text: `全量同步失败：${task.error || '未知错误'}` });
        }
      } catch (err) {
        console.error('轮询任务状态失败:', err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [asyncTask?.taskId]);

  const handleSync = async (type) => {
    setMessage(null);
    const isFullSync = type.endsWith('-full');

    if (isFullSync) {
      // 异步全量同步：启动后台任务后由 useEffect 轮询状态
      const entityMap = {
        'kd-pull-customers-full': 'customer',
        'kd-pull-suppliers-full': 'supplier',
        'kd-pull-materials-full': 'material',
        'kd-pull-warehouses-full': 'warehouse',
        'kd-pull-receive-send-types-full': 'receiveSendType',
        'kd-pull-all-full': 'all',
      };
      const entityType = entityMap[type];
      if (!entityType) {
        setMessage({ type: 'error', text: '未知同步类型' });
        return;
      }
      setSyncing(type);
      try {
        const res = await api.post('/kingdee/sync-tasks', { entityType, full: true });
        const taskId = res.data?.data?.taskId;
        setAsyncTask({ taskId, entityType, status: 'PENDING' });
        setMessage({ type: 'info', text: '全量同步任务已启动，后台正在处理，请等待完成...' });
      } catch (err) {
        setMessage({ type: 'error', text: err.response?.data?.message || err.message || '启动失败' });
        setSyncing(null);
      }
      return;
    }

    // 同步流程（原有）
    setSyncing(type);
    try {
      const endpoints = {
        'pull-hrms': '/sync/pull-hrms',
        'push-scm': '/sync/push-scm',
        'full': '/sync/full',
        'kd-pull-all': '/kingdee/pull-all?full=true',
        'kd-push-all': '/kingdee/push-all',
        'kd-pull-customers': '/kingdee/pull-customers',
        'kd-pull-suppliers': '/kingdee/pull-suppliers',
        'kd-pull-materials': '/kingdee/pull-materials',
        'kd-pull-warehouses': '/kingdee/pull-warehouses',
        'kd-pull-receive-send-types': '/kingdee/pull-receive-send-types',
        'kd-push-depts': '/kingdee/push-departments',
        'kd-push-emps': '/kingdee/push-employees',
      };
      const endpoint = endpoints[type];
      if (!endpoint) throw new Error('未知同步类型');
      const res = await api.post(endpoint);
      setMessage({ type: 'success', text: `同步完成！共处理 ${res.data?.data?.total || 0} 条记录` });
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || '同步失败' });
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;
  }

  const { masterData, scmSync, recentLogs } = data || {};
  const kdCounts = kingdeeStatus?.counts || {};

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>主数据管理仪表盘</Typography>

      {message && <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

      {asyncTask && (
        <Alert
          severity={
            asyncTask.status === 'SUCCESS'
              ? 'success'
              : asyncTask.status === 'FAILED'
              ? 'error'
              : asyncTask.status === 'PARTIAL'
              ? 'warning'
              : 'info'
          }
          sx={{ mb: 2 }}
          icon={
            asyncTask.status === 'PENDING' || asyncTask.status === 'RUNNING' ? (
              <CircularProgress size={20} />
            ) : undefined
          }
          onClose={() => setAsyncTask(null)}
        >
          全量同步任务
          {asyncTask.status === 'PENDING'
            ? '等待中'
            : asyncTask.status === 'RUNNING'
            ? '运行中'
            : asyncTask.status === 'SUCCESS'
            ? '已完成'
            : asyncTask.status === 'FAILED'
            ? '已失败'
            : asyncTask.status === 'PARTIAL'
            ? '部分完成'
            : STATUS_MAP[asyncTask.status] || asyncTask.status}
          ：{asyncTask.entityType === 'all' ? '全部' : ENTITY_MAP[asyncTask.entityType.toUpperCase()] || asyncTask.entityType}
          {asyncTask.total > 0 &&
            `，已处理 ${asyncTask.processed || 0} / ${asyncTask.total} 条`}
        </Alert>
      )}

      {/* 统计卡片 */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={4} md={2}>
          <Card><CardContent>
            <Typography color="text.secondary" variant="body2" gutterBottom>部门</Typography>
            <Typography variant="h4" fontWeight="bold" color="primary.main">{masterData?.departments || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card><CardContent>
            <Typography color="text.secondary" variant="body2" gutterBottom>员工</Typography>
            <Typography variant="h4" fontWeight="bold" color="primary.main">{masterData?.employees || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card><CardContent>
            <Typography color="text.secondary" variant="body2" gutterBottom>金蝶客户</Typography>
            <Typography variant="h4" fontWeight="bold" color="warning.main">{kdCounts.customer || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card><CardContent>
            <Typography color="text.secondary" variant="body2" gutterBottom>金蝶供应商</Typography>
            <Typography variant="h4" fontWeight="bold" color="warning.main">{kdCounts.supplier || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card><CardContent>
            <Typography color="text.secondary" variant="body2" gutterBottom>金蝶物料</Typography>
            <Typography variant="h4" fontWeight="bold" color="warning.main">{kdCounts.material || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/kingdee-warehouses')}><CardContent>
            <Typography color="text.secondary" variant="body2" gutterBottom>金蝶仓库</Typography>
            <Typography variant="h4" fontWeight="bold" color="warning.main">{kdCounts.warehouse || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/kingdee-receive-send-types')}><CardContent>
            <Typography color="text.secondary" variant="body2" gutterBottom>金蝶收发类别</Typography>
            <Typography variant="h4" fontWeight="bold" color="info.main">{kdCounts.receiveSendType || 0}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card><CardContent>
            <Typography color="text.secondary" variant="body2" gutterBottom>SCM已同步</Typography>
            <Typography variant="h4" fontWeight="bold" color="success.main">
              {(scmSync?.deptMappings || 0) + (scmSync?.empMappings || 0)}
            </Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      {/* 同步操作 Tabs */}
      <Tabs value={syncTab} onChange={(e, v) => setSyncTab(v)} sx={{ mb: 2 }}>
        <Tab label="HRMS ↔ SCM" />
        <Tab label="金蝶云星空" icon={<HubIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 1: HRMS ↔ SCM */}
      {syncTab === 0 && (
        <>
          <Typography variant="h6" fontWeight="bold" mb={2}>数据同步操作</Typography>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={4}>
              <Button fullWidth variant="outlined" size="large" startIcon={<CloudDownloadIcon />}
                onClick={() => handleSync('pull-hrms')} disabled={!!syncing || !!asyncTask} sx={{ py: 1.5 }}>
                {syncing === 'pull-hrms' ? <CircularProgress size={20} /> : '从 HRMS 拉取'}
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button fullWidth variant="outlined" size="large" color="secondary" startIcon={<CloudUploadIcon />}
                onClick={() => handleSync('push-scm')} disabled={!!syncing || !!asyncTask} sx={{ py: 1.5 }}>
                {syncing === 'push-scm' ? <CircularProgress size={20} /> : '推送到 SCM'}
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button fullWidth variant="contained" size="large" startIcon={<SyncIcon />}
                onClick={() => handleSync('full')} disabled={!!syncing || !!asyncTask} sx={{ py: 1.5 }}>
                {syncing === 'full' ? <CircularProgress size={20} color="inherit" /> : '完整同步（拉取+推送）'}
              </Button>
            </Grid>
          </Grid>
        </>
      )}

      {/* Tab 2: 金蝶云星空 */}
      {syncTab === 1 && (
        <>
          {/* 金蝶同步状态 */}
          {kingdeeStatus?.config && (
            <Alert severity="info" sx={{ mb: 2 }}>
              上次同步：{kingdeeStatus.config.lastSyncAt
                ? new Date(kingdeeStatus.config.lastSyncAt).toLocaleString('zh-CN')
                : '从未同步'}
              {kingdeeStatus.config.autoSync ? ' · 自动同步：每天一次' : ''}
            </Alert>
          )}

          <Typography variant="subtitle1" fontWeight="bold" mb={1} color="text.secondary">
            从金蝶拉取基础数据（增量同步）
          </Typography>
          <Grid container spacing={1.5} mb={2}>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button fullWidth variant="outlined" color="warning" size="medium"
                onClick={() => handleSync('kd-pull-customers')} disabled={!!syncing || !!asyncTask}
                startIcon={<CloudDownloadIcon />}>
                {syncing === 'kd-pull-customers' ? <CircularProgress size={16} /> : '拉取客户'}
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button fullWidth variant="outlined" color="warning" size="medium"
                onClick={() => handleSync('kd-pull-suppliers')} disabled={!!syncing || !!asyncTask}
                startIcon={<CloudDownloadIcon />}>
                {syncing === 'kd-pull-suppliers' ? <CircularProgress size={16} /> : '拉取供应商'}
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button fullWidth variant="outlined" color="warning" size="medium"
                onClick={() => handleSync('kd-pull-materials')} disabled={!!syncing || !!asyncTask}
                startIcon={<CloudDownloadIcon />}>
                {syncing === 'kd-pull-materials' ? <CircularProgress size={16} /> : '拉取物料产品'}
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button fullWidth variant="outlined" color="warning" size="medium"
                onClick={() => handleSync('kd-pull-warehouses')} disabled={!!syncing || !!asyncTask}
                startIcon={<CloudDownloadIcon />}>
                {syncing === 'kd-pull-warehouses' ? <CircularProgress size={16} /> : '拉取仓库'}
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button fullWidth variant="outlined" color="info" size="medium"
                onClick={() => handleSync('kd-pull-receive-send-types')} disabled={!!syncing || !!asyncTask}
                startIcon={<CloudDownloadIcon />}>
                {syncing === 'kd-pull-receive-send-types' ? <CircularProgress size={16} /> : '拉取收发类别'}
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button fullWidth variant="contained" color="warning" size="medium"
                onClick={() => handleSync('kd-pull-all')} disabled={!!syncing || !!asyncTask}
                startIcon={<SyncIcon />}>
                {syncing === 'kd-pull-all' ? <CircularProgress size={16} color="inherit" /> : '全部拉取'}
              </Button>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" fontWeight="bold" mb={1} color="error.light">
            全量同步（忽略上次同步时间，拉取所有数据）
          </Typography>
          <Grid container spacing={1.5} mb={2}>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button fullWidth variant="outlined" color="error" size="medium"
                onClick={() => handleSync('kd-pull-customers-full')} disabled={!!syncing || !!asyncTask}
                startIcon={<CloudDownloadIcon />}>
                {syncing === 'kd-pull-customers-full' ? <CircularProgress size={16} /> : '全量拉取客户'}
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button fullWidth variant="outlined" color="error" size="medium"
                onClick={() => handleSync('kd-pull-suppliers-full')} disabled={!!syncing || !!asyncTask}
                startIcon={<CloudDownloadIcon />}>
                {syncing === 'kd-pull-suppliers-full' ? <CircularProgress size={16} /> : '全量拉取供应商'}
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button fullWidth variant="outlined" color="error" size="medium"
                onClick={() => handleSync('kd-pull-materials-full')} disabled={!!syncing || !!asyncTask}
                startIcon={<CloudDownloadIcon />}>
                {syncing === 'kd-pull-materials-full' ? <CircularProgress size={16} /> : '全量拉取物料产品'}
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button fullWidth variant="outlined" color="error" size="medium"
                onClick={() => handleSync('kd-pull-warehouses-full')} disabled={!!syncing || !!asyncTask}
                startIcon={<CloudDownloadIcon />}>
                {syncing === 'kd-pull-warehouses-full' ? <CircularProgress size={16} /> : '全量拉取仓库'}
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button fullWidth variant="outlined" color="error" size="medium"
                onClick={() => handleSync('kd-pull-receive-send-types-full')} disabled={!!syncing || !!asyncTask}
                startIcon={<CloudDownloadIcon />}>
                {syncing === 'kd-pull-receive-send-types-full' ? <CircularProgress size={16} /> : '全量拉取收发类别'}
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <Button fullWidth variant="contained" color="error" size="medium"
                onClick={() => handleSync('kd-pull-all-full')} disabled={!!syncing || !!asyncTask}
                startIcon={<SyncIcon />}>
                {syncing === 'kd-pull-all-full' ? <CircularProgress size={16} color="inherit" /> : '全量全部拉取'}
              </Button>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" fontWeight="bold" mb={1} mt={2} color="text.secondary">
            推送数据到金蝶
          </Typography>
          <Grid container spacing={1.5} mb={2}>
            <Grid item xs={6} sm={4} md={3}>
              <Button fullWidth variant="outlined" color="info" size="medium"
                onClick={() => handleSync('kd-push-depts')} disabled={!!syncing || !!asyncTask}
                startIcon={<CloudUploadIcon />}>
                {syncing === 'kd-push-depts' ? <CircularProgress size={16} /> : '推送部门'}
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <Button fullWidth variant="outlined" color="info" size="medium"
                onClick={() => handleSync('kd-push-emps')} disabled={!!syncing || !!asyncTask}
                startIcon={<CloudUploadIcon />}>
                {syncing === 'kd-push-emps' ? <CircularProgress size={16} /> : '推送员工'}
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <Button fullWidth variant="contained" color="info" size="medium"
                onClick={() => handleSync('kd-push-all')} disabled={!!syncing || !!asyncTask}
                startIcon={<SyncIcon />}>
                {syncing === 'kd-push-all' ? <CircularProgress size={16} color="inherit" /> : '全部推送'}
              </Button>
            </Grid>
          </Grid>
        </>
      )}

      {/* 最近同步记录 */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" fontWeight="bold" mb={2}>最近同步记录</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>类型</TableCell>
              <TableCell>对象</TableCell>
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
                <TableCell>
                  <Chip size="small" label={
                    log.syncType?.includes('KINGDEE') ? '金蝶' :
                    log.syncType?.includes('PULL') ? '拉取' :
                    log.syncType?.includes('PUSH') ? '推送' : log.syncType
                  } color={
                    log.syncType?.includes('KINGDEE') ? 'warning' :
                    log.syncType?.includes('PULL') ? 'primary' : 'secondary'
                  } variant="outlined" />
                </TableCell>
                <TableCell>{ENTITY_MAP[log.entityType] || log.entityType}</TableCell>
                <TableCell>
                  <Chip size="small" label={STATUS_MAP[log.status] || log.status}
                    color={getStatusColor(log.status)} />
                </TableCell>
                <TableCell>{log.totalRecords}</TableCell>
                <TableCell>{log.successCount}</TableCell>
                <TableCell>{log.failedCount}</TableCell>
                <TableCell>{new Date(log.startedAt).toLocaleString('zh-CN')}</TableCell>
              </TableRow>
            ))}
            {(!recentLogs || recentLogs.length === 0) && (
              <TableRow><TableCell colSpan={7} align="center">暂无同步记录</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
