import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, FormControl, InputLabel, Select, Alert,
  CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Tooltip, Stack, Rating,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Send as SendIcon, RateReview as ReviewIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import api from '../../hooks/useFetch';
import useCanEdit from '../../hooks/useCanEdit';
import useAuthStore from '../../store/authStore';
import { useSnackbar } from 'notistack';

const statusMap = {
  DRAFT: { label: '草稿', color: 'default' },
  SELF_REVIEW: { label: '自评中', color: 'info' },
  MGR_REVIEW: { label: '待上级评价', color: 'warning' },
  COMPLETED: { label: '已完成', color: 'success' },
};

const ratingLabels = { 1: '不合格', 2: '待改进', 3: '合格', 4: '良好', 5: '优秀' };

/* ========= 绩效表单弹窗（管理员用） ========= */
function PerformanceFormDialog({ open, editing, employees, onClose, onSave }) {
  const [form, setForm] = useState({
    employeeId: '', period: '', kpiScore: 0,
    selfRating: '', selfSummary: '',
    mgrRating: '', mgrComments: '',
    finalRating: '', comments: '', status: 'DRAFT',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          employeeId: editing.employeeId || '',
          period: editing.period || '',
          kpiScore: editing.kpiScore || 0,
          selfRating: editing.selfRating ?? '',
          selfSummary: editing.selfSummary || '',
          mgrRating: editing.mgrRating ?? '',
          mgrComments: editing.mgrComments || '',
          finalRating: editing.finalRating ?? '',
          comments: editing.comments || '',
          status: editing.status || 'DRAFT',
        });
      } else {
        setForm({ employeeId: '', period: '', kpiScore: 0,
          selfRating: '', selfSummary: '',
          mgrRating: '', mgrComments: '',
          finalRating: '', comments: '', status: 'DRAFT' });
      }
      setError('');
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    setError('');
    if (!form.employeeId) { setError('请选择员工'); return; }
    if (!form.period) { setError('请填写考核周期'); return; }
    setSaving(true);
    try {
      const payload = {
        employeeId: form.employeeId,
        period: form.period,
        kpiScore: Number(form.kpiScore) || 0,
        selfRating: form.selfRating ? Number(form.selfRating) : null,
        selfSummary: form.selfSummary || null,
        mgrRating: form.mgrRating ? Number(form.mgrRating) : null,
        mgrComments: form.mgrComments || null,
        finalRating: form.finalRating ? Number(form.finalRating) : null,
        comments: form.comments || null,
        status: form.status,
      };
      if (editing) {
        await api.put(`/performance/${editing.id}`, payload);
      } else {
        await api.post('/performance', payload);
      }
      onSave();
    } catch (err) {
      setError(err.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? '编辑绩效' : '新建绩效'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <FormControl fullWidth margin="normal" required>
          <InputLabel>员工</InputLabel>
          <Select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} label="员工">
            <MenuItem value="" disabled>请选择员工</MenuItem>
            {employees.map((emp) => (
              <MenuItem key={emp.id} value={emp.id}>{emp.name}（{emp.employeeNo}）</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField fullWidth label="考核周期" margin="normal" required placeholder="如：2026-Q1" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} />
        <TextField fullWidth type="number" label="KPI得分" margin="normal" inputProps={{ min: 0, max: 100 }} value={form.kpiScore} onChange={(e) => setForm({ ...form, kpiScore: e.target.value })} />
        <TextField fullWidth type="number" label="自评分数（1-5）" margin="normal" inputProps={{ min: 1, max: 5 }} value={form.selfRating} onChange={(e) => setForm({ ...form, selfRating: e.target.value })} />
        <TextField fullWidth label="自评总结" margin="normal" multiline rows={2} value={form.selfSummary} onChange={(e) => setForm({ ...form, selfSummary: e.target.value })} />
        <TextField fullWidth type="number" label="经理评分（1-5）" margin="normal" inputProps={{ min: 1, max: 5 }} value={form.mgrRating} onChange={(e) => setForm({ ...form, mgrRating: e.target.value })} />
        <TextField fullWidth label="经理评语" margin="normal" multiline rows={2} value={form.mgrComments} onChange={(e) => setForm({ ...form, mgrComments: e.target.value })} />
        <TextField fullWidth type="number" label="最终评分（1-5）" margin="normal" inputProps={{ min: 1, max: 5 }} value={form.finalRating} onChange={(e) => setForm({ ...form, finalRating: e.target.value })} />
        <FormControl fullWidth margin="normal">
          <InputLabel>状态</InputLabel>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} label="状态">
            {Object.entries(statusMap).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField fullWidth label="评语" margin="normal" multiline rows={2} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : editing ? '保存' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========= 员工自评弹窗 ========= */
function SelfReviewDialog({ open, perf, onClose, onSaved }) {
  const [selfRating, setSelfRating] = useState('');
  const [selfSummary, setSelfSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (open && perf) {
      setSelfRating(perf.selfRating ?? '');
      setSelfSummary(perf.selfSummary || '');
      setError('');
    }
  }, [open, perf]);

  const handleSubmit = async () => {
    setError('');
    if (!selfRating) { setError('请填写自评分数'); return; }
    if (!selfSummary.trim()) { setError('请填写自评总结'); return; }
    setSaving(true);
    try {
      await api.patch(`/performance/${perf.id}/self-submit`, {
        selfRating: Number(selfRating),
        selfSummary,
      });
      enqueueSnackbar('自评已提交，等待上级评价', { variant: 'success' });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || '提交失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>填写自评</DialogTitle>
      <DialogContent sx={{ mt: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          fullWidth type="number" label="自评分数（1-5）" required
          inputProps={{ min: 1, max: 5 }}
          value={selfRating} onChange={(e) => setSelfRating(e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth label="自评总结" required placeholder="请填写本考核周期的工作总结、自我评价..."
          multiline rows={4}
          value={selfSummary} onChange={(e) => setSelfSummary(e.target.value)}
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : '提交自评'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========= 经理评审弹窗 ========= */
function MgrReviewDialog({ open, perf, onClose, onSaved }) {
  const [mgrRating, setMgrRating] = useState('');
  const [mgrComments, setMgrComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (open && perf) {
      setMgrRating(perf.mgrRating ?? '');
      setMgrComments(perf.mgrComments || '');
      setError('');
    }
  }, [open, perf]);

  const handleSubmit = async () => {
    setError('');
    if (!mgrRating) { setError('请填写经理评分'); return; }
    setSaving(true);
    try {
      await api.patch(`/performance/${perf.id}/mgr-submit`, {
        mgrRating: Number(mgrRating),
        mgrComments,
        finalRating: Number(mgrRating),
      });
      enqueueSnackbar('评审已提交，绩效已完成', { variant: 'success' });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || '提交失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>经理评审 - {perf?.employee?.name}</DialogTitle>
      <DialogContent sx={{ mt: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          fullWidth type="number" label="经理评分（1-5）" required
          inputProps={{ min: 1, max: 5 }}
          value={mgrRating} onChange={(e) => setMgrRating(e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth label="经理评语" placeholder="请填写对下属的绩效考核评语..."
          multiline rows={4}
          value={mgrComments} onChange={(e) => setMgrComments(e.target.value)}
          margin="normal"
        />
        {perf && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">员工自评</Typography>
            <Typography variant="body2">分数：{perf.selfRating || '-'}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>总结：{perf.selfSummary || '-'}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : '提交评审'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========= 主页面 ========= */
export default function PerformanceReview() {
  const canEdit = useCanEdit();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isEmployee = role === 'EMPLOYEE';
  const isManager = role === 'MANAGER';
  const isAdmin = role === 'HR_ADMIN' || role === 'SUPER_ADMIN';

  const [performances, setPerformances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selfReviewTarget, setSelfReviewTarget] = useState(null);
  const [mgrReviewTarget, setMgrReviewTarget] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const { enqueueSnackbar } = useSnackbar();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, pageSize };
      if (isEmployee && user?.employeeId) {
        params.employeeId = user.employeeId;
      }
      if (filterPeriod) params.period = filterPeriod;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/performance', { params });
      setPerformances(res.data.data);
      setTotal(res.data.total);
    } catch { setMessage({ type: 'error', text: '加载数据失败' }); }
    finally { setLoading(false); }
  }, [page, pageSize, filterPeriod, filterStatus, isEmployee, user?.employeeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    api.get('/employees?pageSize=1000').then((res) => setEmployees(res.data.data || [])).catch(() => {});
  }, []);

  const handleSave = () => {
    setFormOpen(false);
    setEditing(null);
    enqueueSnackbar(editing ? '绩效已更新' : '绩效已创建', { variant: 'success' });
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/performance/${deleteTarget.id}`);
      enqueueSnackbar('绩效记录已删除', { variant: 'success' });
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.message || '删除失败', { variant: 'error' });
      setDeleteTarget(null);
    }
  };

  // 统计
  const avgRating = performances.length > 0
    ? (performances.reduce((s, p) => s + (p.finalRating || p.mgrRating || 0), 0) / performances.filter((p) => p.finalRating || p.mgrRating).length || 0).toFixed(1)
    : '-';
  const completedCount = performances.filter((p) => p.status === 'COMPLETED').length;
  const pendingCount = performances.filter((p) => p.status === 'MGR_REVIEW').length;

  return (
    <Box>
      <PageHeader title={isEmployee ? '我的绩效' : isManager ? '团队绩效' : '绩效管理'} breadcrumbs={['绩效管理']} />

      {message.text && <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>}

      {/* 统计卡片 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">绩效记录</Typography>
            <Typography variant="h4" fontWeight="bold" color="primary">{total}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">平均评分</Typography>
            <Typography variant="h4" fontWeight="bold" color="secondary">{avgRating}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">已完成</Typography>
            <Typography variant="h4" fontWeight="bold" color="success.main">{completedCount}</Typography>
          </CardContent>
        </Card>
        {isManager && (
          <Card sx={{ flex: 1, minWidth: 140 }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="body2" color="text.secondary">待评审</Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">{pendingCount}</Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* 筛选 + 操作 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField size="small" label="考核周期" placeholder="如：2026-Q1" value={filterPeriod} onChange={(e) => { setFilterPeriod(e.target.value); setPage(1); }} sx={{ minWidth: 160 }} />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>状态</InputLabel>
          <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} label="状态">
            <MenuItem value="">全部</MenuItem>
            {Object.entries(statusMap).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setFormOpen(true); }}>新建绩效</Button>
        )}
      </Box>

      {/* 表格 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>员工</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>部门</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>考核周期</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>KPI得分</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>自评</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>经理评分</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>最终评分</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {performances.length === 0 ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>暂无绩效记录</TableCell></TableRow>
              ) : performances.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>{p.employee?.name || '-'}</TableCell>
                  <TableCell>{p.employee?.department?.name || '-'}</TableCell>
                  <TableCell>{p.period}</TableCell>
                  <TableCell>{p.kpiScore}</TableCell>
                  <TableCell>
                    {p.selfRating ? <Rating value={p.selfRating} readOnly size="small" /> : '-'}
                    {p.selfSummary ? <Typography variant="caption" display="block" color="text.secondary" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.selfSummary}</Typography> : null}
                  </TableCell>
                  <TableCell>
                    {p.mgrRating ? <Rating value={p.mgrRating} readOnly size="small" /> : '-'}
                  </TableCell>
                  <TableCell>
                    {p.finalRating ? (
                      <Chip icon={<ReviewIcon />} label={`${p.finalRating} - ${ratingLabels[p.finalRating] || ''}`} size="small"
                        color={p.finalRating >= 4 ? 'success' : p.finalRating >= 3 ? 'warning' : 'error'} />
                    ) : '待评定'}
                  </TableCell>
                  <TableCell><Chip label={statusMap[p.status]?.label || p.status} color={statusMap[p.status]?.color || 'default'} size="small" /></TableCell>
                  <TableCell align="center">
                    {/* 员工：草稿/自评中 → 填写自评 */}
                    {isEmployee && (p.status === 'DRAFT' || p.status === 'SELF_REVIEW') && (
                      <Tooltip title="填写自评"><IconButton size="small" color="primary" onClick={() => setSelfReviewTarget(p)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    )}
                    {/* 经理：待上级评价 → 评审 */}
                    {isManager && p.status === 'MGR_REVIEW' && (
                      <Tooltip title="评审"><IconButton size="small" color="warning" onClick={() => setMgrReviewTarget(p)}><SendIcon fontSize="small" /></IconButton></Tooltip>
                    )}
                    {/* 管理员：编辑/删除 */}
                    {isAdmin && (
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="编辑"><IconButton size="small" color="primary" onClick={() => { setEditing(p); setFormOpen(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => setDeleteTarget(p)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </Stack>
                    )}
                    {/* 已完成：所有人可查看 */}
                    {p.status === 'COMPLETED' && (
                      <Tooltip title="查看详情"><IconButton size="small" onClick={() => setSelfReviewTarget(p)}><ReviewIcon fontSize="small" /></IconButton></Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 分页 */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2 }}>
        <FormControl size="small">
          <Select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
            <MenuItem value={10}>每页 10 条</MenuItem>
            <MenuItem value={20}>每页 20 条</MenuItem>
            <MenuItem value={50}>每页 50 条</MenuItem>
          </Select>
        </FormControl>
        <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
        <Typography sx={{ px: 3, py: 1 }}>第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页</Typography>
        <Button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(page + 1)}>下一页</Button>
      </Box>

      {/* 弹窗 */}
      <PerformanceFormDialog open={formOpen} editing={editing} employees={employees} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} />
      <SelfReviewDialog open={Boolean(selfReviewTarget)} perf={selfReviewTarget} onClose={() => setSelfReviewTarget(null)} onSaved={fetchData} />
      <MgrReviewDialog open={Boolean(mgrReviewTarget)} perf={mgrReviewTarget} onClose={() => setMgrReviewTarget(null)} onSaved={fetchData} />
      <ConfirmDialog open={Boolean(deleteTarget)} title="删除绩效" message={deleteTarget ? `确定要删除 ${deleteTarget.employee?.name} 的绩效记录吗？` : ''} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}
