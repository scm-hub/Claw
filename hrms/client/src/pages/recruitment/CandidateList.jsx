import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, Button, Card, CardContent, Grid, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Avatar, Alert,
  IconButton, Tooltip, Divider, Rating, Skeleton, Paper,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Add as AddIcon, Delete as DeleteIcon,
  Edit as EditIcon, CalendarToday, Phone as PhoneIcon,
  Email as EmailIcon, Description as ResumeIcon, Notes as NotesIcon,
  PersonAdd, TrendingUp, ArrowForward as NextIcon, Block as RejectIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';
import { useSnackbar } from 'notistack';
import useAuthStore from '../../store/authStore';

const stageMap = {
  APPLIED: { label: '已投递', color: '#9e9e9e', bg: '#f5f5f5' },
  SCREENING: { label: '筛选中', color: '#1976d2', bg: '#e3f2fd' },
  INTERVIEWED: { label: '面试中', color: '#ed6c02', bg: '#fff3e0' },
  OFFERED: { label: '已发Offer', color: '#2e7d32', bg: '#e8f5e9' },
  HIRED: { label: '已入职', color: '#1565c0', bg: '#e8eaf6' },
  REJECTED: { label: '已拒绝', color: '#c62828', bg: '#ffebee' },
};

const stageOrder = ['APPLIED', 'SCREENING', 'INTERVIEWED', 'OFFERED', 'HIRED', 'REJECTED'];

// 正向流程（不含REJECTED）
const flowStages = ['APPLIED', 'SCREENING', 'INTERVIEWED', 'OFFERED', 'HIRED'];

const getNextStage = (currentStage) => {
  const idx = flowStages.indexOf(currentStage);
  if (idx >= 0 && idx < flowStages.length - 1) return flowStages[idx + 1];
  return null;
};

// 安全提取简历文件名（处理中文乱码）
const getResumeFileName = (resumeFileJson) => {
  if (!resumeFileJson) return null;
  try {
    const info = JSON.parse(resumeFileJson);
    const name = info.originalName || '';
    // 检测乱码：包含常见编码损坏字符
    const isGarbled = /[â€¦â€™â\x80-\x9f]/.test(name) || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(name);
    if (isGarbled || !name) return '简历文件' + (info.mimeType?.includes('pdf') ? '.pdf' : '');
    return name;
  } catch { return null; }
};

export default function CandidateList() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobRes, candRes] = await Promise.all([
        api.get('/recruitment/jobs').then((d) => {
          if (d.data?.data) {
            const found = d.data.data.find((j) => j.id === id);
            return found || null;
          }
          return null;
        }),
        api.get(`/recruitment/jobs/${id}/candidates`),
      ]);
      setJob(jobRes);
      setCandidates(candRes.data || []);
    } catch {
      enqueueSnackbar('加载候选人数据失败', { variant: 'error' });
    } finally { setLoading(false); }
  }, [id, enqueueSnackbar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdvance = async (candidateId) => {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return;
    const next = getNextStage(candidate.stage);
    if (!next) return;
    try {
      const res = await api.put(`/recruitment/candidates/${candidateId}/stage`, { stage: next });
      const updatedData = res.data;
      setCandidates((prev) => prev.map((c) => c.id === candidateId ? { ...c, stage: next } : c));
      // 推进到「已发Offer」时，提示已自动创建入职记录
      if (next === 'OFFERED' && updatedData?.onboardingCreated) {
        enqueueSnackbar(
          `已发Offer！工号 ${updatedData.employeeNo}，入职管理记录已自动创建`,
          { variant: 'success', autoHideDuration: 5000 },
        );
      } else {
        enqueueSnackbar(`已推进到「${stageMap[next].label}」`, { variant: 'success' });
      }
    } catch (err) {
      enqueueSnackbar(err.message || '更新失败', { variant: 'error' });
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      enqueueSnackbar('请填写拒绝理由', { variant: 'warning' });
      return;
    }
    try {
      await api.put(`/recruitment/candidates/${rejectTarget.id}/stage`, {
        stage: 'REJECTED',
        rejectReason: rejectReason.trim(),
      });
      setCandidates((prev) => prev.map((c) => c.id === rejectTarget.id ? { ...c, stage: 'REJECTED', rejectReason: rejectReason.trim() } : c));
      enqueueSnackbar('已拒绝该候选人', { variant: 'info' });
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      enqueueSnackbar(err.message || '操作失败', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/recruitment/candidates/${deleteConfirm.id}`);
      setCandidates((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
      enqueueSnackbar('候选人已删除', { variant: 'success' });
      setDeleteConfirm(null);
    } catch (err) {
      enqueueSnackbar(err.message || '删除失败', { variant: 'error' });
    }
  };

  // 通过认证API下载简历文件（解决浏览器直接跳转不带token的问题）
  const handleDownloadResume = async (candidate, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.get(`/recruitment/candidates/${candidate.id}/resume`, {
        responseType: 'blob',
      });
      const fileName = getResumeFileName(candidate.resumeFile) || '简历文件.pdf';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      enqueueSnackbar(err.message || '下载简历失败', { variant: 'error' });
    }
  };

  // 按阶段分组
  const grouped = {};
  stageOrder.forEach((s) => { grouped[s] = candidates.filter((c) => c.stage === s); });
  const totalCandidates = candidates.length;

  if (loading) {
    return (
      <Box>
        <PageHeader title="候选人管理" breadcrumbs={['招聘管理', '候选人']} />
        <Grid container spacing={2}>
          {stageOrder.map((s) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={s}>
              <Skeleton variant="rounded" height={300} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader title={job ? `${job.title} - 候选人` : '候选人管理'} breadcrumbs={['招聘管理', '候选人']} />

      {/* 顶部栏 */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/recruitment')} size="small" variant="outlined">返回</Button>
        <Chip label={`共 ${totalCandidates} 人`} size="small" color="primary" variant="outlined" />
        <Box sx={{ flex: 1 }} />
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => setAddOpen(true)}>
            添加候选人
          </Button>
        )}
      </Stack>

      {/* 看板视图 */}
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
        {stageOrder.map((stage) => {
          const items = grouped[stage] || [];
          const info = stageMap[stage];
          return (
            <Box key={stage} sx={{ minWidth: 210, maxWidth: 240, flex: '0 0 auto' }}>
              {/* 列头 */}
              <Paper sx={{
                p: 1.5, mb: 1.5, bgcolor: info.bg, borderRadius: 2,
                borderLeft: `4px solid ${info.color}`,
              }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ color: info.color }}>{info.label}</Typography>
                  <Chip label={items.length} size="small" sx={{ bgcolor: 'white', fontWeight: 'bold' }} />
                </Stack>
              </Paper>
              {/* 卡片 */}
              <Stack spacing={1}>
                {items.map((c) => (
                  <Card key={c.id} sx={{
                    cursor: 'pointer', borderRadius: 2,
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: 4 },
                    borderLeft: `3px solid ${info.color}`,
                  }} onClick={() => { setSelected(c); setDetailOpen(true); }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: info.color }}>
                          {c.name?.[0]}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight="bold" noWrap>{c.name}</Typography>
                          {c.rating > 0 && (
                            <Rating value={c.rating} readOnly size="small" max={5} />
                          )}
                        </Box>
                      </Stack>
                      {c.phone && (
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.3 }}>
                          <PhoneIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">{c.phone}</Typography>
                        </Stack>
                      )}
                      {c.email && (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <EmailIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" noWrap>{c.email}</Typography>
                        </Stack>
                      )}
                      {c.interviewDate && (
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                          <CalendarToday sx={{ fontSize: 12, color: 'warning.main' }} />
                          <Typography variant="caption" color="warning.main">
                            {new Date(c.interviewDate).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Stack>
                      )}
                      {c.resumeFile && (
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5, cursor: 'pointer' }}
                          onClick={(e) => handleDownloadResume(c, e)}>
                          <ResumeIcon sx={{ fontSize: 12, color: 'primary.main' }} />
                          <Typography variant="caption" color="primary.main" sx={{
                            textDecoration: 'underline', '&:hover': { opacity: 0.7 },
                          }}>
                            {getResumeFileName(c.resumeFile) || '下载简历'}
                          </Typography>
                        </Stack>
                      )}
                      {/* 流程操作按钮 */}
                      {isAdmin && c.stage !== 'HIRED' && c.stage !== 'REJECTED' && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                          {getNextStage(c.stage) && (
                            <Button
                              size="small" variant="contained"
                              startIcon={<NextIcon sx={{ fontSize: 14 }} />}
                              onClick={(e) => { e.stopPropagation(); handleAdvance(c.id); }}
                              sx={{
                                fontSize: 11, py: 0.3, px: 1, minHeight: 24, borderRadius: 1,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4192 100%)' },
                              }}
                            >
                              {stageMap[getNextStage(c.stage)].label}
                            </Button>
                          )}
                          <Button
                            size="small" variant="outlined" color="error"
                            startIcon={<RejectIcon sx={{ fontSize: 14 }} />}
                            onClick={(e) => { e.stopPropagation(); setRejectTarget(c); setRejectReason(''); }}
                            sx={{ fontSize: 11, py: 0.3, px: 1, minHeight: 24, borderRadius: 1 }}
                          >
                            拒绝
                          </Button>
                          <Tooltip title="删除">
                            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c); }}>
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                      {/* 已拒绝 - 显示拒绝理由 */}
                      {c.stage === 'REJECTED' && c.rejectReason && (
                        <Box sx={{ mt: 1, p: 0.8, bgcolor: '#ffebee', borderRadius: 1 }}>
                          <Typography variant="caption" color="error.main" fontWeight="bold">拒绝理由：</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>{c.rejectReason}</Typography>
                        </Box>
                      )}
                      {/* 已入职 / 已拒绝 - 仍可删除 */}
                      {isAdmin && (c.stage === 'HIRED' || c.stage === 'REJECTED') && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} justifyContent="flex-end">
                          <Tooltip title="删除">
                            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c); }}>
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          );
        })}
      </Box>

      {/* 添加候选人弹窗 */}
      {addOpen && (
        <AddCandidateDialog
          open={addOpen}
          jobId={id}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); fetchData(); }}
        />
      )}

      {/* 候选人详情弹窗 */}
      {detailOpen && selected && (
        <CandidateDetail
          open={detailOpen}
          candidate={selected}
          onClose={() => setDetailOpen(false)}
          onSaved={(updated) => {
            setCandidates((prev) => prev.map((c) => c.id === updated.id ? updated : c));
            setSelected(updated);
            setDetailOpen(false);
            fetchData();
          }}
        />
      )}

      {/* 删除确认 */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          确定要删除候选人「{deleteConfirm?.name}」吗？此操作不可恢复。
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>取消</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>确认删除</Button>
        </DialogActions>
      </Dialog>

      {/* 拒绝理由弹窗 */}
      <Dialog open={!!rejectTarget} onClose={() => { setRejectTarget(null); setRejectReason(''); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <RejectIcon color="error" />
            <Typography>拒绝候选人「{rejectTarget?.name}」</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            拒绝后候选人将移至「已拒绝」归档，请填写拒绝理由。
          </Alert>
          <TextField
            fullWidth multiline rows={3}
            label="拒绝理由 *"
            placeholder="请说明拒绝原因，如：技能不匹配、薪资期望过高等..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRejectTarget(null); setRejectReason(''); }}>取消</Button>
          <Button color="error" variant="contained" onClick={handleReject} disabled={!rejectReason.trim()}>
            确认拒绝
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ========== 添加候选人弹窗 ========== */
function AddCandidateDialog({ open, jobId, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', resume: '', source: '' });
  const [resumeFile, setResumeFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (open) {
      setForm({ name: '', email: '', phone: '', resume: '', source: '' });
      setResumeFile(null);
    }
    setError('');
  }, [open]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setResumeFile(file);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('姓名为必填项'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('jobId', jobId);
      fd.append('name', form.name.trim());
      fd.append('email', form.email);
      fd.append('phone', form.phone);
      fd.append('resume', form.resume);
      fd.append('source', form.source);
      if (resumeFile) fd.append('resumeFile', resumeFile);
      await api.post('/recruitment/candidates', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      enqueueSnackbar('候选人已添加', { variant: 'success' });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || err.message || '添加失败');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>添加候选人</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField fullWidth label="姓名 *" margin="dense" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <TextField fullWidth label="手机号" margin="dense" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <TextField fullWidth label="邮箱" margin="dense" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Stack>
        <TextField fullWidth label="简历链接/说明" margin="dense" multiline rows={2} value={form.resume} onChange={(e) => setForm({ ...form, resume: e.target.value })} />
        {/* 简历文件上传 */}
        <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 42, height: 42, borderRadius: 1.5,
                bgcolor: 'primary.light', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ResumeIcon />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={600}>上传简历附件</Typography>
              <Typography variant="caption" color="text.secondary">
                支持 PDF、DOC、DOCX 格式，最大 10MB
              </Typography>
            </Box>
            <Button variant="outlined" size="small" component="label">
              {resumeFile ? '更换' : '选择文件'}
              <input type="file" hidden accept=".pdf,.doc,.docx" onChange={handleFileChange} />
            </Button>
          </Stack>
          {resumeFile && (
            <Chip
              icon={<ResumeIcon />}
              label={`${resumeFile.name} (${(resumeFile.size / 1024).toFixed(0)} KB)`}
              onDelete={() => setResumeFile(null)}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mt: 1.5 }}
            />
          )}
        </Paper>
        <TextField fullWidth label="来源渠道" margin="dense" placeholder="例如：BOSS直聘、内推、校招..." value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>{saving ? '提交中...' : '添加'}</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========== 候选人详情弹窗 ========== */
function CandidateDetail({ open, candidate, onClose, onSaved }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [showReject, setShowReject] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (candidate) {
      setForm({
        name: candidate.name || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        stage: candidate.stage || 'APPLIED',
        notes: candidate.notes || '',
        interviewDate: candidate.interviewDate ? new Date(candidate.interviewDate).toISOString().slice(0, 16) : '',
        interviewer: candidate.interviewer || '',
        rating: candidate.rating || 0,
        rejectReason: candidate.rejectReason || '',
      });
      setShowReject(false);
      setRejectReasonInput('');
    }
  }, [candidate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/recruitment/candidates/${candidate.id}`, form);
      enqueueSnackbar('已更新', { variant: 'success' });
      onSaved(res.data);
    } catch (err) {
      enqueueSnackbar(err.message || '保存失败', { variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleAdvance = async () => {
    const next = getNextStage(form.stage);
    if (!next) return;
    setSaving(true);
    try {
      const res = await api.put(`/recruitment/candidates/${candidate.id}/stage`, { stage: next });
      const updatedData = res.data;
      setForm((prev) => ({ ...prev, stage: next }));
      // 推进到「已发Offer」时，提示已自动创建入职记录
      if (next === 'OFFERED' && updatedData?.onboardingCreated) {
        enqueueSnackbar(
          `已发Offer！工号 ${updatedData.employeeNo}，入职管理记录已自动创建`,
          { variant: 'success', autoHideDuration: 5000 },
        );
      } else {
        enqueueSnackbar(`已推进到「${stageMap[next].label}」`, { variant: 'success' });
      }
      onSaved(updatedData);
    } catch (err) {
      enqueueSnackbar(err.message || '推进失败', { variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleRejectConfirm = async () => {
    if (!rejectReasonInput.trim()) {
      enqueueSnackbar('请填写拒绝理由', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(`/recruitment/candidates/${candidate.id}/stage`, {
        stage: 'REJECTED',
        rejectReason: rejectReasonInput.trim(),
      });
      setForm((prev) => ({ ...prev, stage: 'REJECTED', rejectReason: rejectReasonInput.trim() }));
      enqueueSnackbar('已拒绝该候选人', { variant: 'info' });
      onSaved(res.data);
    } catch (err) {
      enqueueSnackbar(err.message || '操作失败', { variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleDownloadResume = async () => {
    if (!candidate?.id) return;
    try {
      const res = await api.get(`/recruitment/candidates/${candidate.id}/resume`, {
        responseType: 'blob',
      });
      const fileName = getResumeFileName(candidate.resumeFile) || '简历文件.pdf';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      enqueueSnackbar(err.message || '下载简历失败', { variant: 'error' });
    }
  };

  const info = stageMap[form.stage] || {};
  const currentFlowIdx = flowStages.indexOf(form.stage);
  const isTerminal = form.stage === 'HIRED' || form.stage === 'REJECTED';
  const nextStage = getNextStage(form.stage);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Avatar sx={{ bgcolor: info.color }}>{candidate?.name?.[0]}</Avatar>
          <Box>
            <Typography variant="h6">{candidate?.name}</Typography>
            <Chip label={info.label} size="small" sx={{ bgcolor: info.bg, color: info.color, fontWeight: 'bold' }} />
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {/* 流程进度条 */}
        <Box sx={{ mb: 2.5, mt: 1 }}>
          <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center">
            {flowStages.map((s, idx) => {
              const sInfo = stageMap[s];
              const isCurrent = s === form.stage;
              const isPast = currentFlowIdx >= 0 && idx <= currentFlowIdx && form.stage !== 'REJECTED';
              return (
                <Box key={s} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    px: 1, py: 0.5, borderRadius: 2,
                    bgcolor: isCurrent ? sInfo.bg : isPast ? '#e8f5e9' : 'grey.100',
                    border: isCurrent ? `2px solid ${sInfo.color}` : '2px solid transparent',
                    minWidth: 64,
                  }}>
                    <Typography variant="caption" fontWeight="bold"
                      sx={{ color: isCurrent ? sInfo.color : isPast ? '#2e7d32' : 'text.disabled' }}>
                      {sInfo.label}
                    </Typography>
                    {isCurrent && form.stage !== 'REJECTED' && (
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: sInfo.color, mt: 0.3 }} />
                    )}
                  </Box>
                  {idx < flowStages.length - 1 && (
                    <TrendingUp sx={{ fontSize: 16, color: isPast ? '#2e7d32' : 'grey.400', mx: 0.3, transform: 'rotate(-45deg)' }} />
                  )}
                </Box>
              );
            })}
          </Stack>
          {form.stage === 'REJECTED' && (
            <Box sx={{ mt: 1, p: 1.5, bgcolor: '#ffebee', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="body2" color="error.main" fontWeight="bold">⛔ 已拒绝</Typography>
              {form.rejectReason && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  拒绝理由：{form.rejectReason}
                </Typography>
              )}
            </Box>
          )}
          {form.stage === 'OFFERED' && (
            <Box sx={{ mt: 1, p: 1.5, bgcolor: '#e8f5e9', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="body2" color="success.main" fontWeight="bold">📋 已发Offer — 入职管理记录已自动创建</Typography>
              <Button
                size="small" variant="text" sx={{ mt: 0.5 }}
                onClick={() => { onClose(); navigate('/employees/onboarding'); }}
              >
                前往入职管理 →
              </Button>
            </Box>
          )}
          {form.stage === 'HIRED' && (
            <Box sx={{ mt: 1, p: 1.5, bgcolor: '#e8eaf6', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="body2" color="primary.main" fontWeight="bold">✅ 已入职 — 入职流程已在发Offer时启动</Typography>
              <Button
                size="small" variant="text" sx={{ mt: 0.5 }}
                onClick={() => { onClose(); navigate('/employees/onboarding'); }}
              >
                查看入职管理 →
              </Button>
            </Box>
          )}
        </Box>

        {isAdmin ? (
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth size="small" label="姓名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField fullWidth size="small" label="手机号" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Stack>
            <TextField fullWidth size="small" label="邮箱" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Box>
              <Typography variant="caption" color="text.secondary">综合评价</Typography>
              <Rating value={form.rating} onChange={(e, v) => setForm({ ...form, rating: v })} max={5} />
            </Box>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth size="small" label="面试官" value={form.interviewer} onChange={(e) => setForm({ ...form, interviewer: e.target.value })} />
              <TextField fullWidth size="small" type="datetime-local" label="面试时间" value={form.interviewDate}
                onChange={(e) => setForm({ ...form, interviewDate: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Stack>
            <TextField size="small" label="备注" multiline rows={3} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="面试评价、跟进记录..." />
            {candidate?.resumeFile && (
              <Button size="small" variant="outlined" startIcon={<ResumeIcon />}
                onClick={handleDownloadResume}
                sx={{ textTransform: 'none', justifyContent: 'flex-start' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ResumeIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500 }}>
                    {getResumeFileName(candidate.resumeFile) || '下载简历'}
                  </Typography>
                </Box>
              </Button>
            )}
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <Box><Typography variant="caption" color="text.secondary">手机</Typography><Typography>{candidate?.phone || '-'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">邮箱</Typography><Typography>{candidate?.email || '-'}</Typography></Box>
            </Stack>
            {candidate?.rating > 0 && <Rating value={candidate.rating} readOnly max={5} />}
            {candidate?.interviewDate && (
              <Typography variant="body2">
                面试时间：{new Date(candidate.interviewDate).toLocaleString('zh-CN')}
              </Typography>
            )}
            {candidate?.interviewer && <Typography variant="body2">面试官：{candidate.interviewer}</Typography>}
            {candidate?.notes && (
              <Box sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">备注</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{candidate.notes}</Typography>
              </Box>
            )}
            {candidate?.resume && <Typography variant="body2">简历：{candidate.resume}</Typography>}
            {candidate?.resumeFile && (
              <Button size="small" variant="outlined" startIcon={<ResumeIcon />}
                onClick={handleDownloadResume}
                sx={{ textTransform: 'none', justifyContent: 'flex-start' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ResumeIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500 }}>
                    {getResumeFileName(candidate.resumeFile) || '下载简历'}
                  </Typography>
                </Box>
              </Button>
            )}
          </Stack>
        )}

        {/* 拒绝理由输入区 */}
        {isAdmin && showReject && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
            <TextField
              fullWidth multiline rows={2}
              label="拒绝理由 *"
              placeholder="请说明拒绝原因..."
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              size="small"
              autoFocus
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} justifyContent="flex-end">
              <Button size="small" onClick={() => { setShowReject(false); setRejectReasonInput(''); }}>取消</Button>
              <Button size="small" color="error" variant="contained" onClick={handleRejectConfirm}
                disabled={!rejectReasonInput.trim() || saving}>
                确认拒绝
              </Button>
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>关闭</Button>
        {isAdmin && !isTerminal && !showReject && (
          <>
            <Button color="error" variant="outlined" startIcon={<RejectIcon />}
              onClick={() => setShowReject(true)}>
              拒绝
            </Button>
            {nextStage && (
              <Button variant="contained" startIcon={<NextIcon />}
                onClick={handleAdvance} disabled={saving}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4192 100%)' },
                }}>
                推进到「{stageMap[nextStage].label}」
              </Button>
            )}
          </>
        )}
        {isAdmin && !isTerminal && !showReject && (
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ ml: 'auto !important' }}>
            {saving ? '保存中...' : '保存修改'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
