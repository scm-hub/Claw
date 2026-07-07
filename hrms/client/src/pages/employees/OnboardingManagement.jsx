import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Chip, Button, Card, CardContent, Grid, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Avatar, Alert, IconButton, Tooltip, Divider, Paper,
  Stepper, Step, StepLabel, StepContent,
  List, ListItem, ListItemIcon, ListItemText,
  FormControl, InputLabel, Select, MenuItem,
  Collapse, Badge,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon,
  HowToReg as OnboardIcon, CheckCircle as DoneIcon,
  Cancel as RejectIcon, Send as SubmitIcon,
  ArrowForward as NextIcon, ArrowBack as BackIcon,
  Description as MaterialIcon,
  People as PeopleIcon, TrendingUp,
  FilterList as FilterIcon,
  Search as SearchIcon, RestartAlt as ResetIcon,
  PersonAdd as MentorIcon, Schedule as ScheduleIcon,
  History as HistoryIcon, RadioButtonUnchecked,
  Upload as UploadIcon, Edit as EditIcon,
  Check as CheckIcon, Close as CloseIcon,
  RadioButtonChecked,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';
import useAuthStore from '../../store/authStore';
import useCanEdit from '../../hooks/useCanEdit';

// 流程步骤
const STEPS = [
  { key: 'PENDING', label: '提交入职材料', description: '新员工提交身份证、学历证、体检报告等入职材料', status: 'MATERIAL_SUBMIT' },
  { key: 'MATERIAL_REVIEW', label: 'HR审核材料', description: 'HR审核材料是否齐全合规', status: 'HR_REVIEW' },
  { key: 'DEPT_CONFIRM', label: '部门确认到岗', description: '部门负责人确认新员工已到岗', status: 'DEPT_CONFIRM' },
  { key: 'ADMIN_PROCESS', label: '行政IT办理', description: '办理工牌、邮箱、系统账号、工位等', status: 'ADMIN_PROCESS' },
];

// 状态映射
const STATUS_MAP = {
  PENDING: { label: '待提交材料', color: '#ed6c02', bg: '#fff3e0' },
  MATERIAL_REVIEW: { label: 'HR审核中', color: '#1976d2', bg: '#e3f2fd' },
  DEPT_CONFIRM: { label: '部门确认中', color: '#7b1fa2', bg: '#f3e5f5' },
  ADMIN_PROCESS: { label: '行政IT办理中', color: '#0097a7', bg: '#e0f7fa' },
  COMPLETED: { label: '已完成', color: '#2e7d32', bg: '#e8f5e9' },
  REJECTED: { label: '已驳回', color: '#d32f2f', bg: '#ffebee' },
};

// 材料状态映射
const MATERIAL_STATUS = {
  PENDING: { label: '待提交', color: '#9e9e9e', icon: <RadioButtonUnchecked sx={{ fontSize: 18 }} /> },
  SUBMITTED: { label: '已提交', color: '#1976d2', icon: <UploadIcon sx={{ fontSize: 18, color: '#1976d2' }} /> },
  APPROVED: { label: '已审核', color: '#2e7d32', icon: <CheckIcon sx={{ fontSize: 18, color: '#2e7d32' }} /> },
  REJECTED: { label: '不合格', color: '#d32f2f', icon: <CloseIcon sx={{ fontSize: 18, color: '#d32f2f' }} /> },
};

// 获取显示信息（优先用 employee，fallback 到 candidate 信息）
const getDisplayInfo = (r) => ({
  name: r.employee?.name || r.candidateName || '未知',
  employeeNo: r.employee?.employeeNo || '待创建',
  deptName: r.employee?.department?.name || r.candidateDept?.name || '待分配',
  positionTitle: r.employee?.positionTitle || r.candidatePositionTitle || '',
  avatarInitial: (r.employee?.name || r.candidateName || '?')[0],
});

export default function OnboardingManagement() {
  const canEdit = useCanEdit();
  const { enqueueSnackbar } = useSnackbar();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ pending: 0, materialReview: 0, deptConfirm: 0, adminProcess: 0, completed: 0, rejected: 0 });

  const [statusFilter, setStatusFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      if (statusFilter) params.status = statusFilter;
      if (searchText) params.search = searchText;
      const res = await api.get('/onboarding', { params });
      setRecords(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      enqueueSnackbar(err.message || '加载失败', { variant: 'error' });
    } finally { setLoading(false); }
  }, [page, pageSize, statusFilter, searchText]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/onboarding/stats');
      setStats(res.data || {});
    } catch {}
  }, []);

  useEffect(() => { fetchData(); fetchStats(); }, [fetchData, fetchStats]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/onboarding/${deleteConfirm.id}`);
      enqueueSnackbar('入职记录已删除', { variant: 'success' });
      setDeleteConfirm(null);
      fetchData(); fetchStats();
    } catch (err) {
      enqueueSnackbar(err.message || '删除失败', { variant: 'error' });
    }
  };

  // 获取流程步骤索引
  const getStepIndex = (status) => {
    const map = { PENDING: 0, MATERIAL_REVIEW: 1, DEPT_CONFIRM: 2, ADMIN_PROCESS: 3, COMPLETED: 4, REJECTED: -1 };
    return map[status] ?? -1;
  };

  // 获取材料完成率
  const getMaterialProgress = (materials) => {
    if (!materials || materials.length === 0) return { submitted: 0, total: 0, required: 0, requiredSubmitted: 0 };
    const required = materials.filter((m) => m.required);
    const requiredSubmitted = required.filter((m) => m.status === 'SUBMITTED' || m.status === 'APPROVED');
    const submitted = materials.filter((m) => m.status === 'SUBMITTED' || m.status === 'APPROVED');
    return { submitted: submitted.length, total: materials.length, required: required.length, requiredSubmitted: requiredSubmitted.length };
  };

  const statCards = [
    { label: '待提交材料', value: stats.pending, color: '#ed6c02', gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', icon: '📋' },
    { label: 'HR审核中', value: stats.materialReview, color: '#1976d2', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '🔍' },
    { label: '部门确认中', value: stats.deptConfirm, color: '#7b1fa2', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', icon: '✋' },
    { label: '行政IT办理', value: stats.adminProcess, color: '#0097a7', gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)', icon: '🔧' },
    { label: '已完成', value: stats.completed, color: '#2e7d32', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', icon: '✅' },
  ];

  return (
    <Box>
      <PageHeader title="入职管理" subtitle="审批流 + 材料采集，管理新员工入职全流程" />

      {/* 统计卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s) => (
          <Grid item xs={12} sm={6} md={2.4} key={s.label} sx={{ maxWidth: '20%', flexBasis: '20%' }}>
            <Card sx={{
              background: s.gradient, color: '#fff', borderRadius: 3,
              transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' },
            }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, '&:last-child': { pb: 2 } }}>
                <Box>
                  <Typography variant="h3" fontWeight="bold">{s.value}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>{s.label}</Typography>
                </Box>
                <Typography sx={{ fontSize: 32, opacity: 0.5 }}>{s.icon}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 筛选栏 */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField size="small" placeholder="搜索姓名/工号" value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
            sx={{ minWidth: 200 }}
            InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} /> }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>状态</InputLabel>
            <Select value={statusFilter} label="状态"
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <MenuItem value="">全部</MenuItem>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button size="small" startIcon={<ResetIcon />}
            onClick={() => { setStatusFilter(''); setSearchText(''); setPage(1); }}>
            重置
          </Button>
          {isAdmin && (
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{
                ml: 'auto !important',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4192 100%)' },
              }}>
              新建入职
            </Button>
          )}
        </Stack>
      </Paper>

      {/* 列表 */}
      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Card sx={{ borderRadius: 3 }}><CardContent><Box sx={{ height: 120 }}><Typography>&nbsp;</Typography></Box></CardContent></Card>
            </Grid>
          ))}
        </Grid>
      ) : records.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 3 }}>
          <OnboardIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">暂无入职记录</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            点击「新建入职」开始管理新员工入职流程
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {records.map((r) => {
            const info = STATUS_MAP[r.status] || {};
            const stepIdx = getStepIndex(r.status);
            const matProgress = getMaterialProgress(r.materials);
            return (
              <Grid item xs={12} md={6} key={r.id}>
                {(() => { const di = getDisplayInfo(r); return (
                <Card sx={{
                  borderRadius: 3, cursor: 'pointer',
                  borderLeft: `4px solid ${info.color}`,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 },
                }}
                  onClick={() => { setSelectedRecord(r); setDetailOpen(true); }}>
                  <CardContent>
                    {/* 头部 */}
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ bgcolor: info.color, width: 44, height: 44, fontSize: 18 }}>
                          {di.avatarInitial}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">{di.name}</Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" color="text.secondary">{di.employeeNo}</Typography>
                            <Typography variant="caption" color="text.secondary">{di.deptName}</Typography>
                          </Stack>
                        </Box>
                      </Stack>
                      <Chip label={info.label} size="small"
                        sx={{ bgcolor: info.bg, color: info.color, fontWeight: 'bold', fontSize: 12 }} />
                    </Stack>

                    {/* 流程进度条 */}
                    <Box sx={{ mt: 2, mb: 1 }}>
                      <Stack direction="row" spacing={0} sx={{ position: 'relative' }}>
                        {STEPS.map((s, i) => (
                          <Box key={s.key} sx={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                            <Box sx={{
                              width: 28, height: 28, borderRadius: '50%',
                              bgcolor: i < stepIdx ? '#2e7d32' : i === stepIdx ? info.color : '#e0e0e0',
                              color: i <= stepIdx ? '#fff' : '#999',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              mx: 'auto', fontSize: 12, fontWeight: 'bold',
                            }}>
                              {i < stepIdx ? '✓' : i + 1}
                            </Box>
                            <Typography variant="caption" sx={{ fontSize: 10, display: 'block', mt: 0.5, color: i === stepIdx ? info.color : '#999' }}>
                              {s.label.length > 4 ? s.label.slice(0, 4) : s.label}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>

                    {/* 材料进度 */}
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                      <MaterialIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        材料 {matProgress.requiredSubmitted}/{matProgress.required}（必填）
                      </Typography>
                      {r.hireDate && (
                        <>
                          <Box sx={{ flex: 1 }} />
                          <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(r.hireDate).toLocaleDateString('zh-CN')}
                          </Typography>
                        </>
                      )}
                    </Stack>

                    {/* 操作 */}
                    {isAdmin && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} justifyContent="flex-end"
                        onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="删除">
                          <IconButton size="small" color="error"
                            onClick={() => setDeleteConfirm(r)}>
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  </CardContent>
                </Card>
                ); })()}
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* 分页 */}
      {total > pageSize && (
        <Stack direction="row" justifyContent="center" spacing={1} sx={{ mt: 3 }}>
          <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
          <Typography sx={{ alignSelf: 'center' }}>{page} / {Math.ceil(total / pageSize)}</Typography>
          <Button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)}>下一页</Button>
        </Stack>
      )}

      {/* 新建入职弹窗 */}
      <CreateOnboardingDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); fetchData(); fetchStats(); }}
      />

      {/* 详情弹窗 */}
      <OnboardingDetailDialog
        open={detailOpen}
        record={selectedRecord}
        onClose={() => { setDetailOpen(false); setSelectedRecord(null); }}
        onUpdate={(updated) => { setSelectedRecord(updated); fetchData(); fetchStats(); }}
      />

      {/* 删除确认 */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          确定要删除「{deleteConfirm?.employee?.name || deleteConfirm?.candidateName}」的入职记录吗？
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>取消</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>确认删除</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ========== 新建入职弹窗 ========== */
function CreateOnboardingDialog({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ employeeId: '', hireDate: '', mentorId: '', notes: '' });
  const [employees, setEmployees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (open) {
      setForm({ employeeId: '', hireDate: '', mentorId: '', notes: '' });
      setError('');
      api.get('/employees', { params: { pageSize: 999, status: 'ACTIVE' } })
        .then((res) => setEmployees(res.data.data || []))
        .catch(() => {});
    }
  }, [open]);

  const handleSave = async () => {
    if (!form.employeeId || !form.hireDate) {
      setError('员工和入职日期为必填项');
      return;
    }
    setSaving(true);
    try {
      await api.post('/onboarding', form);
      enqueueSnackbar('入职记录已创建，流程进入「提交入职材料」步骤', { variant: 'success' });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || err.message || '创建失败');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <OnboardIcon color="primary" />
          <Typography>新建入职记录</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>选择员工 *</InputLabel>
            <Select value={form.employeeId} label="选择员工 *"
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              {employees.map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  {e.name}（{e.employeeNo}）- {e.department?.name || '无部门'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth type="date" label="入职日期 *" value={form.hireDate}
            onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
            InputLabelProps={{ shrink: true }} />
          <FormControl fullWidth>
            <InputLabel>入职导师</InputLabel>
            <Select value={form.mentorId} label="入职导师"
              onChange={(e) => setForm({ ...form, mentorId: e.target.value })}>
              <MenuItem value="">无</MenuItem>
              {employees.filter((e) => e.id !== form.employeeId).map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  {e.name}（{e.employeeNo}）
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth multiline rows={2} label="备注" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="入职相关备注信息..." />
          <Alert severity="info" sx={{ mt: 1 }}>
            创建后将自动进入「提交入职材料」步骤，需完成材料提交后方可推进到HR审核。
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? '创建中...' : '创建入职记录'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========== 入职详情弹窗（核心：流程时间线 + 材料卡片 + 审批操作） ========== */
function OnboardingDetailDialog({ open, record, onClose, onUpdate }) {
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

  // 判断当前用户是否可以操作指定步骤（按步骤精细化控制权限）
  const canOperateStep = (stepKey) => {
    // 管理员可操作所有步骤
    if (isAdmin) return true;
    switch (stepKey) {
      case 'DEPT_CONFIRM':
        // 部门确认：该部门负责人可操作（兼容候选人模式和员工模式）
        return user?.employee?.id === (record?.employee?.department?.managerId || record?.candidateDept?.managerId);
      case 'ADMIN_PROCESS':
        // 行政IT办理：HR（非admin的HR角色）也可操作
        return user?.role === 'HR';
      default:
        return false;
    }
  };

  useEffect(() => {
    if (record) {
      setNotes(record.notes || '');
      setEditNotes(false);
      setRejectReason('');
      setShowRejectInput(false);
    }
  }, [record]);

  if (!record) return null;

  const di = getDisplayInfo(record);
  const info = STATUS_MAP[record.status] || {};
  const stepIdx = getStepIndex(record.status);

  // 获取当前步骤的索引
  function getStepIndex(status) {
    const map = { PENDING: 0, MATERIAL_REVIEW: 1, DEPT_CONFIRM: 2, ADMIN_PROCESS: 3, COMPLETED: 4, REJECTED: -1 };
    return map[status] ?? -1;
  }

  // 刷新数据
  const refreshData = async () => {
    try {
      const res = await api.get(`/onboarding/${record.id}`);
      onUpdate(res.data);
    } catch (err) {
      enqueueSnackbar(err.message || '刷新失败', { variant: 'error' });
    }
  };

  // 步骤1：提交材料
  const handleSubmitMaterials = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/onboarding/${record.id}/submit-materials`, {
        materials: record.materials,
      });
      enqueueSnackbar('材料已提交，进入HR审核阶段', { variant: 'success' });
      onUpdate(res.data);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message || '提交失败', { variant: 'error' });
    } finally { setSaving(false); }
  };

  // 步骤2：HR审核通过
  const handleHrApprove = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/onboarding/${record.id}/hr-approve`);
      enqueueSnackbar('HR审核通过，已推送至部门确认', { variant: 'success' });
      onUpdate(res.data);
    } catch (err) {
      enqueueSnackbar(err.message || '操作失败', { variant: 'error' });
    } finally { setSaving(false); }
  };

  // 步骤2：HR审核驳回
  const handleHrReject = async () => {
    if (!rejectReason.trim()) {
      enqueueSnackbar('请填写驳回理由', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(`/onboarding/${record.id}/hr-reject`, { reason: rejectReason.trim() });
      enqueueSnackbar('已驳回，材料退回重新提交', { variant: 'info' });
      onUpdate(res.data);
      setShowRejectInput(false);
      setRejectReason('');
    } catch (err) {
      enqueueSnackbar(err.message || '操作失败', { variant: 'error' });
    } finally { setSaving(false); }
  };

  // 步骤3：部门确认通过
  const handleDeptConfirm = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/onboarding/${record.id}/dept-confirm`);
      enqueueSnackbar('部门已确认到岗，进入行政IT办理', { variant: 'success' });
      onUpdate(res.data);
    } catch (err) {
      enqueueSnackbar(err.message || '操作失败', { variant: 'error' });
    } finally { setSaving(false); }
  };

  // 步骤3：部门确认驳回
  const handleDeptReject = async () => {
    if (!rejectReason.trim()) {
      enqueueSnackbar('请填写驳回理由', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(`/onboarding/${record.id}/dept-reject`, { reason: rejectReason.trim() });
      enqueueSnackbar('已驳回，退回HR审核', { variant: 'info' });
      onUpdate(res.data);
      setShowRejectInput(false);
      setRejectReason('');
    } catch (err) {
      enqueueSnackbar(err.message || '操作失败', { variant: 'error' });
    } finally { setSaving(false); }
  };

  // 步骤4：行政IT完成
  const handleAdminComplete = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/onboarding/${record.id}/admin-complete`);
      enqueueSnackbar('入职流程全部完成！', { variant: 'success' });
      onUpdate(res.data);
    } catch (err) {
      enqueueSnackbar(err.message || '操作失败', { variant: 'error' });
    } finally { setSaving(false); }
  };

  // 更新单个材料状态
  const handleMaterialStatusChange = async (materialId, newStatus) => {
    try {
      const res = await api.put(`/onboarding/${record.id}/materials/${materialId}`, { status: newStatus });
      onUpdate(res.data);
    } catch (err) {
      enqueueSnackbar(err.message || '更新失败', { variant: 'error' });
    }
  };

  // 保存备注
  const handleSaveNotes = async () => {
    try {
      const res = await api.put(`/onboarding/${record.id}`, { notes });
      enqueueSnackbar('备注已更新', { variant: 'success' });
      setEditNotes(false);
      onUpdate(res.data);
    } catch (err) {
      enqueueSnackbar(err.message || '更新失败', { variant: 'error' });
    }
  };

  // 材料统计
  const materials = record.materials || [];
  const requiredMaterials = materials.filter((m) => m.required);
  const requiredSubmitted = requiredMaterials.filter((m) => m.status === 'SUBMITTED' || m.status === 'APPROVED');
  const allRequiredSubmitted = requiredMaterials.length > 0 && requiredSubmitted.length === requiredMaterials.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { minHeight: '80vh' } }}>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: info.color, width: 48, height: 48, fontSize: 20 }}>
            {di.avatarInitial}
          </Avatar>
          <Box>
            <Typography variant="h6">{di.name} 的入职流程</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {di.employeeNo} · {di.deptName}
              </Typography>
              <Chip label={info.label} size="small"
                sx={{ bgcolor: info.bg, color: info.color, fontWeight: 'bold' }} />
            </Stack>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', gap: 3 }}>
        {/* 左侧：流程时间线 */}
        <Box sx={{ flex: '0 0 280px', borderRight: '1px solid #e0e0e0', pr: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
            <NextIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
            流程进度
          </Typography>

          <Stepper activeStep={stepIdx} orientation="vertical" sx={{ '& .MuiStepLabel-label': { fontSize: 13 } }}>
            {STEPS.map((s, i) => {
              const isCompleted = i < stepIdx;
              const isCurrent = i === stepIdx;
              const isPending = i > stepIdx;
              return (
                <Step key={s.key} completed={isCompleted} active={isCurrent}>
                  <StepLabel
                    StepIconProps={{
                      sx: {
                        color: isCompleted ? '#2e7d32' : isCurrent ? info.color : '#ccc',
                        '& .MuiStepIcon-text': { fill: '#fff' },
                      },
                    }}
                  >
                    <Typography variant="body2" fontWeight={isCurrent ? 'bold' : 'normal'}
                      sx={{ color: isCurrent ? info.color : isCompleted ? '#2e7d32' : '#999' }}>
                      {s.label}
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {s.description}
                    </Typography>

                    {/* 当前步骤的操作按钮 —— 按步骤+身份动态判断权限 */}
                    {canOperateStep(s.key) && isCurrent && (
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        {s.key === 'PENDING' && (
                          <>
                            <Button size="small" variant="contained" fullWidth
                              disabled={saving || !allRequiredSubmitted}
                              onClick={handleSubmitMaterials}
                              startIcon={<SubmitIcon />}
                              sx={{
                                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                '&:hover': { background: 'linear-gradient(135deg, #38d96b 0%, #2ee8c7 100%)' },
                                '&.Mui-disabled': { background: '#e0e0e0', color: '#999' },
                              }}>
                              {!allRequiredSubmitted ? '必填材料未齐' : '提交材料'}
                            </Button>
                            {!allRequiredSubmitted && (
                              <Typography variant="caption" color="error.main">
                                请先将所有必填材料标记为「已提交」
                              </Typography>
                            )}
                          </>
                        )}
                        {s.key === 'MATERIAL_REVIEW' && (
                          <>
                            <Button size="small" variant="contained" fullWidth
                              disabled={saving} onClick={handleHrApprove}
                              startIcon={<CheckIcon />}
                              sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', '&:hover': { background: 'linear-gradient(135deg, #38d96b 0%, #2ee8c7 100%)' } }}>
                              审核通过 → 推至部门
                            </Button>
                            {!showRejectInput ? (
                              <Button size="small" variant="outlined" color="error" fullWidth
                                onClick={() => setShowRejectInput(true)}
                                startIcon={<RejectIcon />}>
                                驳回退回
                              </Button>
                            ) : (
                              <Box sx={{ mt: 1 }}>
                                <TextField size="small" fullWidth multiline rows={2}
                                  placeholder="请填写驳回理由（必填）"
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)} />
                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                  <Button size="small" onClick={() => { setShowRejectInput(false); setRejectReason(''); }}>取消</Button>
                                  <Button size="small" variant="contained" color="error" disabled={saving}
                                    onClick={handleHrReject}>确认驳回</Button>
                                </Stack>
                              </Box>
                            )}
                          </>
                        )}
                        {s.key === 'DEPT_CONFIRM' && (
                          <>
                            <Button size="small" variant="contained" fullWidth
                              disabled={saving} onClick={handleDeptConfirm}
                              startIcon={<CheckIcon />}
                              sx={{ background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', color: '#fff', '&:hover': { background: 'linear-gradient(135deg, #917cc1 0%, #ebb1da 100%)' } }}>
                              确认到岗 → 推至行政
                            </Button>
                            {!showRejectInput ? (
                              <Button size="small" variant="outlined" color="error" fullWidth
                                onClick={() => setShowRejectInput(true)}
                                startIcon={<RejectIcon />}>
                                驳回退回
                              </Button>
                            ) : (
                              <Box sx={{ mt: 1 }}>
                                <TextField size="small" fullWidth multiline rows={2}
                                  placeholder="请填写驳回理由（必填）"
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)} />
                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                  <Button size="small" onClick={() => { setShowRejectInput(false); setRejectReason(''); }}>取消</Button>
                                  <Button size="small" variant="contained" color="error" disabled={saving}
                                    onClick={handleDeptReject}>确认驳回</Button>
                                </Stack>
                              </Box>
                            )}
                          </>
                        )}
                        {s.key === 'ADMIN_PROCESS' && (
                          <Button size="small" variant="contained" fullWidth
                            disabled={saving} onClick={handleAdminComplete}
                            startIcon={<DoneIcon />}
                            sx={{ background: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)', '&:hover': { background: 'linear-gradient(135deg, #78e6ed 0%, #5595ee 100%)' } }}>
                            完成入职手续
                          </Button>
                        )}
                      </Stack>
                    )}
                  </StepContent>
                </Step>
              );
            })}
          </Stepper>

          {/* 已完成状态 */}
          {record.status === 'COMPLETED' && (
            <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 2, textAlign: 'center' }}>
              <DoneIcon sx={{ fontSize: 32, color: '#2e7d32', mb: 0.5 }} />
              <Typography variant="body2" fontWeight="bold" color="#2e7d32">入职流程已完成</Typography>
              {record.completedAt && (
                <Typography variant="caption" color="text.secondary">
                  {new Date(record.completedAt).toLocaleString('zh-CN')}
                </Typography>
              )}
            </Box>
          )}

          {/* 已驳回状态 */}
          {record.status === 'REJECTED' && record.rejectReason && (
            <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, textAlign: 'center' }}>
              <RejectIcon sx={{ fontSize: 32, color: '#d32f2f', mb: 0.5 }} />
              <Typography variant="body2" fontWeight="bold" color="#d32f2f">已驳回</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                理由：{record.rejectReason}
              </Typography>
            </Box>
          )}

          {/* 审批历史 */}
          {record.approvalRecords && record.approvalRecords.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                <HistoryIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                审批记录
              </Typography>
              <List dense disablePadding>
                {record.approvalRecords.map((a, i) => (
                  <ListItem key={i} disableGutters sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      {a.action === 'CREATE' || a.action === 'SUBMIT' || a.action === 'APPROVE' || a.action === 'COMPLETE'
                        ? <CheckIcon sx={{ fontSize: 16, color: '#2e7d32' }} />
                        : <CloseIcon sx={{ fontSize: 16, color: '#d32f2f' }} />
                      }
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="caption" sx={{ fontSize: 11 }}>
                          <strong>{a.operator}</strong> · {a.action === 'CREATE' ? '创建' : a.action === 'SUBMIT' ? '提交' : a.action === 'APPROVE' ? '通过' : a.action === 'REJECT' ? '驳回' : a.action === 'COMPLETE' ? '完成' : a.action}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                          {new Date(a.timestamp).toLocaleString('zh-CN')} {a.remark ? `— ${a.remark}` : ''}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>

        {/* 右侧：材料卡片 + 基本信息 */}
        <Box sx={{ flex: 1 }}>
          {/* 基本信息横条 */}
          <Stack direction="row" spacing={3} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
            <Paper sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, flex: '1 1 auto', minWidth: 100 }} elevation={0}>
              <Typography variant="caption" color="text.secondary">入职日期</Typography>
              <Typography variant="body1" fontWeight="bold">
                {record.hireDate ? new Date(record.hireDate).toLocaleDateString('zh-CN') : '-'}
              </Typography>
            </Paper>
            <Paper sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, flex: '1 1 auto', minWidth: 100 }} elevation={0}>
              <Typography variant="caption" color="text.secondary">入职导师</Typography>
              <Typography variant="body1" fontWeight="bold">
                {record.mentor?.name || '未指定'}
              </Typography>
            </Paper>
            <Paper sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, flex: '1 1 auto', minWidth: 100 }} elevation={0}>
              <Typography variant="caption" color="text.secondary">材料进度</Typography>
              <Typography variant="body1" fontWeight="bold"
                sx={{ color: allRequiredSubmitted ? '#2e7d32' : '#ed6c02' }}>
                {requiredSubmitted.length}/{requiredMaterials.length}
              </Typography>
            </Paper>
          </Stack>

          {/* 材料清单 */}
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            <MaterialIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'text-bottom' }} />
            入职材料清单
          </Typography>

          <Grid container spacing={1.5}>
            {materials.map((m) => {
              const mInfo = MATERIAL_STATUS[m.status] || MATERIAL_STATUS.PENDING;
              return (
                <Grid item xs={12} sm={6} key={m.id}>
                  <Card sx={{
                    borderRadius: 2,
                    border: `1px solid ${mInfo.color}30`,
                    bgcolor: m.status === 'APPROVED' ? '#f1f8e9' : m.status === 'REJECTED' ? '#ffebee' : '#fff',
                    transition: 'all 0.2s',
                  }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          {mInfo.icon}
                          <Box>
                            <Typography variant="body2" fontWeight={500} sx={{
                              textDecoration: m.status === 'APPROVED' ? 'line-through' : 'none',
                              color: m.status === 'APPROVED' ? 'text.disabled' : 'text.primary',
                            }}>
                              {m.name}
                            </Typography>
                            {m.required && (
                              <Typography variant="caption" color="error.main" sx={{ fontSize: 10 }}>必填</Typography>
                            )}
                          </Box>
                        </Stack>
                        <Chip label={mInfo.label} size="small"
                          sx={{ bgcolor: `${mInfo.color}15`, color: mInfo.color, fontSize: 11, fontWeight: 'bold', height: 24 }} />
                      </Stack>

                      {/* HR审核阶段可操作材料状态 */}
                      {isAdmin && (record.status === 'PENDING' || record.status === 'MATERIAL_REVIEW') && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} justifyContent="flex-end">
                          {m.status === 'PENDING' && (
                            <Button size="small" variant="text"
                              onClick={() => handleMaterialStatusChange(m.id, 'SUBMITTED')}
                              sx={{ fontSize: 11, color: '#1976d2', minWidth: 0, p: '2px 8px' }}>
                              标记已提交
                            </Button>
                          )}
                          {m.status === 'SUBMITTED' && record.status === 'MATERIAL_REVIEW' && (
                            <>
                              <Button size="small" variant="text"
                                onClick={() => handleMaterialStatusChange(m.id, 'APPROVED')}
                                sx={{ fontSize: 11, color: '#2e7d32', minWidth: 0, p: '2px 8px' }}>
                                合格
                              </Button>
                              <Button size="small" variant="text"
                                onClick={() => handleMaterialStatusChange(m.id, 'REJECTED')}
                                sx={{ fontSize: 11, color: '#d32f2f', minWidth: 0, p: '2px 8px' }}>
                                不合格
                              </Button>
                            </>
                          )}
                          {(m.status === 'REJECTED') && (
                            <Button size="small" variant="text"
                              onClick={() => handleMaterialStatusChange(m.id, 'PENDING')}
                              sx={{ fontSize: 11, color: '#1976d2', minWidth: 0, p: '2px 8px' }}>
                              重新提交
                            </Button>
                          )}
                        </Stack>
                      )}

                      {/* 不合格备注 */}
                      {m.remark && m.status === 'REJECTED' && (
                        <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5, fontSize: 10 }}>
                          {m.remark}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* 备注 */}
          <Box sx={{ mt: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2">
                <EditIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                备注
              </Typography>
              {isAdmin && !editNotes && (
                <Button size="small" onClick={() => setEditNotes(true)}>编辑</Button>
              )}
            </Stack>
            {editNotes ? (
              <Stack spacing={1}>
                <TextField fullWidth multiline rows={3} value={notes}
                  onChange={(e) => setNotes(e.target.value)} size="small" />
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" onClick={() => { setEditNotes(false); setNotes(record.notes || ''); }}>取消</Button>
                  <Button size="small" variant="contained" onClick={handleSaveNotes}>保存</Button>
                </Stack>
              </Stack>
            ) : (
              <Paper sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }} elevation={0}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: record.notes ? 'text.primary' : 'text.disabled' }}>
                  {record.notes || '暂无备注'}
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
