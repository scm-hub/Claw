import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Chip, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, FormControl, InputLabel, Select, MenuItem, Stack, Alert,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Tooltip, Pagination, Avatar, Skeleton, InputAdornment,
  Divider, alpha,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, Work as WorkIcon, FilterList as FilterIcon,
  PeopleAlt as CandidateIcon, Business as DeptIcon, TrendingUp,
  RocketLaunch, Schedule, AssignmentInd, Hail,
} from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';
import { useSnackbar } from 'notistack';
import useAuthStore from '../../store/authStore';

const statusMap = {
  PENDING: { label: '待开始', color: 'info' },
  OPEN: { label: '招聘中', color: 'success' },
  CLOSED: { label: '已关闭', color: 'default' },
};
const typeMap = { FULL_TIME: '全职', PART_TIME: '兼职', INTERNSHIP: '实习', CONTRACT: '合同制' };
const urgencyMap = {
  LOW: { label: '低', color: 'default' },
  NORMAL: { label: '普通', color: 'primary' },
  HIGH: { label: '紧急', color: 'warning' },
  URGENT: { label: '加急', color: 'error' },
};

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ status: '', type: '', search: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';
  const navigate = useNavigate();
  const pageSize = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      if (filters.search) params.search = filters.search;
      const res = await api.get('/recruitment/jobs', { params });
      setJobs(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch { enqueueSnackbar('加载失败', { variant: 'error' }); }
    finally { setLoading(false); }
  }, [page, filters, enqueueSnackbar]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/recruitment/stats');
      setStats(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/recruitment/jobs/${id}`);
      enqueueSnackbar('岗位已删除', { variant: 'success' });
      setDeleteConfirm(null);
      fetchData();
      fetchStats();
    } catch (err) {
      enqueueSnackbar(err.message || '删除失败', { variant: 'error' });
    }
  };

  const statCards = [
    { label: '总岗位', value: stats?.totalJobs ?? '-', icon: <RocketLaunch />, color: '#1976d2', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { label: '招聘中', value: stats?.openJobs ?? '-', icon: <Schedule />, color: '#2e7d32', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { label: '待开始', value: stats?.pendingJobs ?? '-', icon: <AssignmentInd />, color: '#0288d1', gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)' },
    { label: '已关闭', value: stats?.closedJobs ?? '-', icon: <Hail />, color: '#616161', gradient: 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)' },
  ];

  return (
    <Box>
      <PageHeader title="招聘管理" breadcrumbs={['招聘管理']} />

      {/* 统计卡片 */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 3,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                },
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: 4,
                  background: s.gradient,
                }}
              />
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 44, height: 44, borderRadius: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: s.gradient, color: '#fff',
                      boxShadow: `0 4px 12px ${alpha(s.color, 0.35)}`,
                    }}
                  >
                    {s.icon}
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, mb: 0.3 }}>{s.label}</Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1 }}>{s.value}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 筛选 + 新建 */}
      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 2.5, borderRadius: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}
      >
        <TextField
          size="small"
          placeholder="搜索岗位名称..."
          value={filters.search}
          onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> } }}
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>状态</InputLabel>
          <Select value={filters.status} label="状态" onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
            <MenuItem value="">全部</MenuItem>
            {Object.entries(statusMap).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>类型</InputLabel>
          <Select value={filters.type} label="类型" onChange={(e) => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1); }}>
            <MenuItem value="">全部</MenuItem>
            {Object.entries(typeMap).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 2,
              px: 3,
              boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
              '&:hover': {
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
              },
            }}
          >
            新建招聘
          </Button>
        )}
      </Paper>

      {/* 岗位表格 */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {['岗位名称', '部门', '类型 / 地点', '薪资范围', '招聘时间', '候选人', '状态', '操作'].map((h, i) => (
                  <TableCell
                    key={h}
                    align={i >= 5 ? 'center' : 'left'}
                    sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 13, py: 1.5 }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8} sx={{ py: 2 }}><Skeleton variant="rounded" height={40} /></TableCell></TableRow>
                ))
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                    <Stack spacing={2} alignItems="center">
                      <Box
                        sx={{
                          width: 80, height: 80, borderRadius: 4,
                          background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <WorkIcon sx={{ fontSize: 40, color: '#7c3aed' }} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" color="text.secondary" fontWeight={500}>
                          暂无招聘岗位
                        </Typography>
                        <Typography variant="body2" color="text.disabled">
                          点击「新建招聘」开始发布第一个岗位
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : jobs.map((job, idx) => (
                <TableRow
                  key={job.id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    bgcolor: idx % 2 === 0 ? 'white' : alpha('#667eea', 0.02),
                    transition: 'background-color 0.2s',
                    '&:hover': { bgcolor: alpha('#667eea', 0.06) },
                  }}
                  onClick={() => navigate(`/recruitment/${job.id}/candidates`)}
                >
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar
                        sx={{
                          width: 36, height: 36,
                          bgcolor: alpha('#667eea', 0.1), color: '#667eea',
                          fontSize: 14, fontWeight: 700,
                        }}
                      >
                        {job.title?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" fontWeight={600}>{job.title}</Typography>
                          {job.urgency && job.urgency !== 'NORMAL' && (
                            <Chip label={urgencyMap[job.urgency]?.label} size="small" color={urgencyMap[job.urgency]?.color || 'default'} />
                          )}
                        </Stack>
                        {job.headcount > 1 && (
                          <Typography variant="caption" color="text.secondary">需求 {job.headcount} 人</Typography>
                        )}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <DeptIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      <Typography variant="body2">{job.department}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip label={typeMap[job.type] || job.type} size="small" variant="outlined" sx={{ mr: 1, height: 22 }} />
                    <Typography variant="caption" color="text.secondary">{job.location || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'inline-flex', alignItems: 'center',
                        bgcolor: alpha('#1976d2', 0.06), color: '#1976d2',
                        px: 1.5, py: 0.4, borderRadius: 1, fontWeight: 600, fontSize: 13,
                      }}
                    >
                      {job.salary || '面议'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {job.startDate ? job.startDate.slice(0, 10) : '-'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ~ {job.endDate ? job.endDate.slice(0, 10) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={<CandidateIcon />}
                      label={`${job._count?.candidates || 0} 人`}
                      size="small"
                      color={job._count?.candidates > 0 ? 'primary' : 'default'}
                      variant={job._count?.candidates > 0 ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={statusMap[job.status]?.label}
                      size="small"
                      color={statusMap[job.status]?.color || 'default'}
                      sx={{ fontWeight: 600, minWidth: 72 }}
                    />
                  </TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="查看候选人">
                        <IconButton size="small" color="primary" onClick={() => navigate(`/recruitment/${job.id}/candidates`)}>
                          <CandidateIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {isAdmin && (
                        <>
                          <Tooltip title="编辑">
                            <IconButton size="small" color="info" onClick={() => { setEditing(job); setDialogOpen(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="删除">
                            <IconButton size="small" color="error" onClick={() => setDeleteConfirm(job)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {total > pageSize && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={Math.ceil(total / pageSize)}
            page={page}
            onChange={(e, p) => setPage(p)}
            color="primary"
            shape="rounded"
            size="large"
          />
        </Box>
      )}

      {/* 新建/编辑弹窗 */}
      {dialogOpen && (
        <JobDialog
          open={dialogOpen}
          editing={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={() => { setDialogOpen(false); fetchData(); fetchStats(); }}
        />
      )}

      {/* 删除确认 */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon color="error" /> 确认删除
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" variant="outlined" sx={{ border: 'none', bgcolor: alpha('#ed6c02', 0.06), borderRadius: 2 }}>
            确定要删除岗位「<strong>{deleteConfirm?.title}</strong>」吗？<br />
            该岗位的所有候选人数据也会被删除，此操作不可恢复。
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)}>取消</Button>
          <Button color="error" variant="contained" onClick={() => handleDelete(deleteConfirm?.id)}>确认删除</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ========== 岗位弹窗 ========== */
function JobDialog({ open, editing, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', department: '', location: '', type: 'FULL_TIME', salary: '', description: '', requirements: '', headcount: 1, urgency: 'NORMAL', status: 'OPEN', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    api.get('/departments/flat').then(d => setDepartments(d.data || [])).catch(() => {});
    if (editing) {
      setForm({
        title: editing.title || '',
        department: editing.department || '',
        location: editing.location || '',
        type: editing.type || 'FULL_TIME',
        salary: editing.salary || '',
        description: editing.description || '',
        requirements: editing.requirements || '',
        headcount: editing.headcount || 1,
        urgency: editing.urgency || 'NORMAL',
        status: editing.status || 'OPEN',
        startDate: editing.startDate ? editing.startDate.slice(0, 10) : '',
        endDate: editing.endDate ? editing.endDate.slice(0, 10) : '',
      });
    } else {
      setForm({ title: '', department: '', location: '', type: 'FULL_TIME', salary: '', description: '', requirements: '', headcount: 1, urgency: 'NORMAL', status: 'OPEN', startDate: '', endDate: '' });
    }
    setError('');
  }, [open, editing]);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.department) {
      setError('岗位名称和部门为必填项'); return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/recruitment/jobs/${editing.id}`, form);
      } else {
        await api.post('/recruitment/jobs', form);
      }
      enqueueSnackbar(editing ? '岗位已更新' : '岗位已创建', { variant: 'success' });
      onSaved();
    } catch (err) {
      setError(err.message || '保存失败');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
        }}
      >
        <WorkIcon />
        {editing ? '编辑岗位' : '新建招聘'}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ mb: 1.5, display: 'block' }}>
          基本信息
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={7}>
            <TextField fullWidth label="岗位名称 *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={5}>
            <FormControl fullWidth>
              <InputLabel>部门 *</InputLabel>
              <Select value={form.department} label="部门 *" onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {departments.map((d) => <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth type="number" label="招聘人数" inputProps={{ min: 1 }} value={form.headcount} onChange={(e) => setForm({ ...form, headcount: parseInt(e.target.value) || 1 })} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth label="工作地点" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth label="薪资范围" placeholder="例如：8K-15K" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2.5 }} />

        <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ mb: 1.5, display: 'block' }}>
          其他信息
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4}>
            <FormControl fullWidth>
              <InputLabel>工作类型</InputLabel>
              <Select value={form.type} label="工作类型" onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(typeMap).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={4}>
            <FormControl fullWidth>
              <InputLabel>紧急程度</InputLabel>
              <Select value={form.urgency} label="紧急程度" onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
                {Object.entries(urgencyMap).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth type="date" label="开始日期" InputLabelProps={{ shrink: true }}
              value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth type="date" label="结束日期" InputLabelProps={{ shrink: true }}
              value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </Grid>
          {form.startDate && form.endDate && (
            <Grid item xs={12}>
              <Alert severity={(() => {
                const now = new Date(); const s = new Date(form.startDate); const e = new Date(form.endDate);
                if (now < s) return 'info'; if (now > e) return 'warning'; return 'success';
              })()} variant="outlined" sx={{ borderRadius: 2 }}>
              {(() => {
                const now = new Date(); const s = new Date(form.startDate); const e = new Date(form.endDate);
                if (now < s) return `招聘将于 ${form.startDate} 开始，当前状态：待开始`;
                if (now > e) return `招聘已于 ${form.endDate} 结束，当前状态：已关闭`;
                return `招聘进行中，将于 ${form.endDate} 结束，当前状态：招聘中`;
              })()}
              </Alert>
            </Grid>
          )}
          {editing && (
            <Grid item xs={6} sm={4}>
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select value={form.status} label="状态" onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(statusMap).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField fullWidth label="岗位描述" multiline rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="描述岗位的工作内容和职责..." />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="任职要求" multiline rows={3} value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} placeholder="学历、经验、技能等要求..." />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          {saving ? '保存中...' : (editing ? '保存修改' : '发布招聘')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
