import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, FormControl, InputLabel, Select, Alert,
  CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Tooltip, Stack, Avatar, List, ListItem, ListItemText, ListItemAvatar,
  Tabs, Tab, Divider,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  School as TrainingIcon, PersonAdd as EnrollIcon, Cancel as CancelIcon,
  Assignment as ScoreIcon, QrCode as QrCodeIcon,
  HowToReg as SigninIcon, Login as SigninEntryIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import api from '../../hooks/useFetch';
import useCanEdit from '../../hooks/useCanEdit';
import useAuthStore from '../../store/authStore';
import { useSnackbar } from 'notistack';

const statusMap = {
  PLANNED: { label: '计划中', color: 'default' },
  IN_PROGRESS: { label: '进行中', color: 'info' },
  COMPLETED: { label: '已结束', color: 'success' },
  CANCELLED: { label: '已取消', color: 'error' },
};

const enrollStatusMap = {
  ENROLLED: { label: '已报名', color: 'info' },
  SIGNED_IN: { label: '已参训', color: 'success' },
  COMPLETED: { label: '已完成', color: 'success' },
  CANCELLED: { label: '已取消', color: 'default' },
  FAILED: { label: '未通过', color: 'error' },
};

/* ========= 培训表单弹窗 ========= */
function TrainingFormDialog({ open, editing, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', instructor: '', startDate: '', endDate: '', location: '', capacity: 30 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          title: editing.title || '',
          description: editing.description || '',
          instructor: editing.instructor || '',
          startDate: editing.startDate ? new Date(editing.startDate).toISOString().slice(0, 10) : '',
          endDate: editing.endDate ? new Date(editing.endDate).toISOString().slice(0, 10) : '',
          location: editing.location || '',
          capacity: editing.capacity || 30,
        });
      } else {
        setForm({ title: '', description: '', instructor: '', startDate: '', endDate: '', location: '', capacity: 30 });
      }
      setError('');
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    setError('');
    if (!form.title.trim()) { setError('课程名称不能为空'); return; }
    if (!form.startDate) { setError('请选择开始日期'); return; }
    if (!form.endDate) { setError('请选择结束日期'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        instructor: form.instructor || null,
        startDate: form.startDate,
        endDate: form.endDate,
        location: form.location || null,
        capacity: Number(form.capacity) || 30,
      };
      if (editing) {
        await api.put(`/trainings/${editing.id}`, payload);
      } else {
        await api.post('/trainings', payload);
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
      <DialogTitle>{editing ? '编辑培训课程' : '新建培训课程'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField fullWidth label="课程名称" margin="normal" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <TextField fullWidth label="讲师" margin="normal" value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} placeholder="讲师姓名" />
        <TextField fullWidth type="date" label="开始日期" margin="normal" required InputLabelProps={{ shrink: true }} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <TextField fullWidth type="date" label="结束日期" margin="normal" required InputLabelProps={{ shrink: true }} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        <TextField fullWidth label="培训地点" margin="normal" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <TextField fullWidth type="number" label="名额上限" margin="normal" inputProps={{ min: 1 }} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        <TextField fullWidth label="课程描述" margin="normal" multiline rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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

/* ========= 报名弹窗 ========= */
function EnrollDialog({ open, training, employees, onClose, onSave }) {
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setSelectedEmployees([]); setError(''); }
  }, [open]);

  const handleSubmit = async () => {
    if (selectedEmployees.length === 0) { setError('请至少选择一名员工'); return; }
    setSaving(true);
    try {
      // 逐个调用报名接口
      for (const employeeId of selectedEmployees) {
        await api.post(`/trainings/${training.id}/enroll`, { employeeId });
      }
      onSave();
    } catch (err) {
      setError(err.message || '报名失败');
    } finally {
      setSaving(false);
    }
  };

  const enrolledIds = (training?.enrollments || []).filter((e) => e.status === 'ENROLLED' || e.status === 'SIGNED_IN').map((e) => e.employeeId);
  const availableEmployees = employees.filter((emp) => !enrolledIds.includes(emp.id));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>员工报名 - {training?.title}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <FormControl fullWidth margin="normal" required>
          <InputLabel>选择员工（可多选）</InputLabel>
          <Select
            multiple
            value={selectedEmployees}
            onChange={(e) => setSelectedEmployees(e.target.value)}
            label="选择员工（可多选）"
            renderValue={(selected) => {
              const names = selected.map((id) => {
                const emp = employees.find((e) => e.id === id);
                return emp ? emp.name : id;
              });
              return names.join('、');
            }}
          >
            <MenuItem value="" disabled>请选择员工</MenuItem>
            {availableEmployees.map((emp) => (
              <MenuItem key={emp.id} value={emp.id}>{emp.name}（{emp.employeeNo}）- {emp.department?.name || ''}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {selectedEmployees.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            已选 {selectedEmployees.length} 人
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>确认报名</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========= 培训详情/签到二维码弹窗 ========= */
function TrainingDetailDialog({ open, training, onClose, onRefresh, user }) {
  const { enqueueSnackbar } = useSnackbar();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_ADMIN';

  const handleCancelEnroll = async (employeeId) => {
    try {
      await api.post(`/trainings/${training.id}/cancel`, { employeeId });
      enqueueSnackbar('已取消报名', { variant: 'success' });
      onRefresh();
    } catch (err) {
      enqueueSnackbar(err.message || '操作失败', { variant: 'error' });
    }
  };

  // 生成签到码二维码 URL（使用 quickchart.io）
  const qrUrl = training?.signinCode
    ? `https://quickchart.io/qr?text=${encodeURIComponent(training.signinCode)}&size=220&margin=2`
    : null;

  // 签到 URL 链接（方便复制发给员工）
  const signinUrl = training?.signinCode
    ? `${window.location.origin}/training?signin=${training.signinCode}`
    : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrainingIcon color="primary" />
          {training?.title}
          <Chip label={statusMap[training?.status]?.label} color={statusMap[training?.status]?.color || 'default'} size="small" sx={{ ml: 1 }} />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="body2" color="text.secondary">讲师：{training?.instructor || '-'}</Typography>
            <Typography variant="body2" color="text.secondary">
              时间：{training?.startDate ? new Date(training.startDate).toLocaleDateString() : ''} ~ {training?.endDate ? new Date(training.endDate).toLocaleDateString() : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">地点：{training?.location || '-'}</Typography>
            <Typography variant="body2" color="text.secondary">
              名额：{training?.enrollments?.filter((e) => e.status !== 'CANCELLED').length || 0} / {training?.capacity}
            </Typography>
            {training?.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>描述：{training.description}</Typography>
            )}
          </Box>

          {/* 签到二维码区域 */}
          {training?.signinCode && training?.status !== 'COMPLETED' && training?.status !== 'CANCELLED' && (
            <Box sx={{
              border: '2px dashed', borderColor: 'primary.light', borderRadius: 2, p: 2,
              textAlign: 'center', minWidth: 240, bgcolor: 'grey.50',
            }}>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <QrCodeIcon fontSize="small" /> 签到二维码
              </Typography>
              {qrUrl && (
                <img src={qrUrl} alt="签到二维码" style={{ width: 200, height: 200 }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <Box sx={{ mt: 1 }}>
                <Typography variant="h6" color="primary.main" fontWeight="bold" letterSpacing={2}>
                  {training.signinCode}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  请员工扫描二维码或输入上方签到码签到
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 签到统计 */}
        {training?.enrollments && training.enrollments.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <Chip icon={<SigninIcon />} label={`已签到 ${training.enrollments.filter((e) => e.signinTime).length} 人`} color="success" variant="outlined" />
            <Chip icon={<EnrollIcon />} label={`未签到 ${training.enrollments.filter((e) => !e.signinTime && e.status === 'ENROLLED').length} 人`} color="warning" variant="outlined" />
          </Box>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1 }}>报名人员</Typography>
        {(training?.enrollments || []).length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 2 }}>暂无报名</Typography>
        ) : (
          <List dense>
            {training.enrollments.map((enr) => (
              <ListItem key={enr.id} secondaryAction={
                isAdmin && enr.status === 'ENROLLED' && !enr.signinTime && (
                  <Tooltip title="取消报名">
                    <IconButton size="small" color="error" onClick={() => handleCancelEnroll(enr.employeeId)}>
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )
              }>
                <ListItemAvatar><Avatar sx={{ bgcolor: enr.signinTime ? 'success.main' : 'primary.main', width: 32, height: 32, fontSize: 14 }}>{enr.employee?.name?.[0]}</Avatar></ListItemAvatar>
                <ListItemText
                  primary={enr.employee?.name + '（' + enr.employee?.employeeNo + '）'}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{enr.employee?.department?.name || ''} | {enrollStatusMap[enr.status]?.label || enr.status}</span>
                      {enr.signinTime && (
                        <Chip label={`${enr.signinMethod === 'QR' ? '扫码' : '手动'} ${new Date(enr.signinTime).toLocaleTimeString()}`} size="small" color="success" variant="outlined" />
                      )}
                      {enr.score != null && <span> | 成绩: {enr.score}</span>}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========= 扫码/手动签到弹窗 ========= */
function SigninDialog({ open, onClose, onSigned, user }) {
  const [signinCode, setSigninCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (open) { setSigninCode(''); setError(''); }
  }, [open]);

  const handleSubmit = async () => {
    setError('');
    const code = signinCode.trim().toUpperCase();
    if (!code) { setError('请输入或扫描签到码'); return; }
    setSaving(true);
    try {
      const res = await api.post('/trainings/signin', { signinCode: code, method: 'MANUAL' });
      enqueueSnackbar(`签到成功！${res.data.training?.title || ''}`, { variant: 'success' });
      onSigned();
      onClose();
    } catch (err) {
      setError(err.message || '签到失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SigninEntryIcon color="primary" /> 培训签到
        </Box>
      </DialogTitle>
      <DialogContent sx={{ mt: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Alert severity="info" sx={{ mb: 2 }}>
          请扫描培训现场的二维码，或手动输入签到码完成签到。
        </Alert>
        <TextField
          fullWidth
          label="签到码"
          required
          placeholder="请输入8位签到码（如：A1B2C3D4）"
          value={signinCode}
          onChange={(e) => setSigninCode(e.target.value.toUpperCase())}
          margin="normal"
          inputProps={{ maxLength: 8, style: { fontFamily: 'monospace', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.2em' } }}
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving} startIcon={<SigninIcon />}>
          {saving ? <CircularProgress size={20} /> : '立即签到'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========= 学时统计面板 ========= */
function HoursPanel({ data, loading }) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 'bold' }}>排名</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>员工</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>部门</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="center">参训次数</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="center">累计学时</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress /></TableCell></TableRow>
          ) : data.length === 0 ? (
            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>暂无参训记录</TableCell></TableRow>
          ) : data.map((row, idx) => (
            <TableRow key={row.employee?.id || idx} hover>
              <TableCell>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main' }}>
                    {row.employee?.name?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">{row.employee?.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.employee?.employeeNo}</Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>{row.employee?.department?.name || '-'}</TableCell>
              <TableCell align="center">
                <Chip label={`${row.records.length} 次`} size="small" color="primary" variant="outlined" />
              </TableCell>
              <TableCell align="center">
                <Typography variant="h6" fontWeight="bold" color="primary">{row.totalHours}</Typography>
                <Typography variant="caption" color="text.secondary">学时</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/* ========= 主页面 ========= */
export default function TrainingList() {
  const canEdit = useCanEdit();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isEmployee = role === 'EMPLOYEE';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'HR_ADMIN';

  const [trainings, setTrainings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [enrollTarget, setEnrollTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [signinOpen, setSigninOpen] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [tabValue, setTabValue] = useState(0);
  const [hoursData, setHoursData] = useState([]);
  const [hoursLoading, setHoursLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, pageSize: 10 };
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/trainings', { params });
      setTrainings(res.data.data);
      setTotal(res.data.total);
    } catch { setMessage({ type: 'error', text: '加载数据失败' }); }
    finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    api.get('/employees?pageSize=1000').then((res) => setEmployees(res.data.data || [])).catch(() => {});
  }, []);

  // 检查 URL 参数是否有签到码
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('signin');
    if (code) {
      setSigninCodeFromUrl(code);
    }
  }, []);

  const setSigninCodeFromUrl = (code) => {
    setSigninOpen(true);
  };

  const fetchDetail = async (id) => {
    try {
      const res = await api.get(`/trainings/${id}`);
      setDetailTarget(res.data);
    } catch { enqueueSnackbar('加载详情失败', { variant: 'error' }); }
  };

  const fetchHours = async () => {
    setHoursLoading(true);
    try {
      const res = await api.get('/trainings/hours');
      setHoursData(res.data || []);
    } catch { enqueueSnackbar('加载学时失败', { variant: 'error' }); }
    finally { setHoursLoading(false); }
  };

  const handleSave = () => {
    setFormOpen(false);
    setEditing(null);
    enqueueSnackbar(editing ? '培训课程已更新' : '培训课程已创建', { variant: 'success' });
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/trainings/${deleteTarget.id}`);
      enqueueSnackbar('培训课程已删除', { variant: 'success' });
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.message || '删除失败', { variant: 'error' });
      setDeleteTarget(null);
    }
  };

  const handleEnrollSave = () => {
    setEnrollTarget(null);
    enqueueSnackbar('报名成功', { variant: 'success' });
    fetchData();
  };

  const handleOpenEnroll = async (t) => {
    try {
      const res = await api.get(`/trainings/${t.id}`);
      setEnrollTarget(res.data);
    } catch { enqueueSnackbar('加载培训信息失败', { variant: 'error' }); }
  };

  // 员工自报名
  const handleSelfEnroll = async (trainingId) => {
    if (!user?.employee?.id) {
      enqueueSnackbar('未绑定员工信息', { variant: 'error' });
      return;
    }
    try {
      await api.post(`/trainings/${trainingId}/enroll`, { employeeId: user.employee.id });
      enqueueSnackbar('报名成功', { variant: 'success' });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.message || '报名失败', { variant: 'error' });
    }
  };

  // 统计
  const plannedCount = trainings.filter((t) => t.status === 'PLANNED').length;
  const inProgressCount = trainings.filter((t) => t.status === 'IN_PROGRESS').length;
  const completedCount = trainings.filter((t) => t.status === 'COMPLETED').length;

  // 过滤出我的培训（已报名或已签到）
  const myEnrolledIds = employees.find((e) => e.id === user?.employee?.id) ? [] : [];
  const allTrainings = trainings;

  return (
    <Box>
      <PageHeader title="培训管理" breadcrumbs={['培训管理']} />

      <Tabs value={tabValue} onChange={(e, v) => { setTabValue(v); if (v === 1) fetchHours(); }} sx={{ mb: 3 }}>
        <Tab label="课程列表" />
        <Tab label="学时统计" />
      </Tabs>

      {message.text && <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>}

      {tabValue === 0 && (<>
      {/* 统计卡片 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">课程总数</Typography>
            <Typography variant="h4" fontWeight="bold" color="primary">{total}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">计划中</Typography>
            <Typography variant="h4" fontWeight="bold">{plannedCount}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">进行中</Typography>
            <Typography variant="h4" fontWeight="bold" color="info.main">{inProgressCount}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">已结束</Typography>
            <Typography variant="h4" fontWeight="bold" color="success.main">{completedCount}</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 筛选 + 操作 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>状态</InputLabel>
          <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} label="状态">
            <MenuItem value="">全部</MenuItem>
            {Object.entries(statusMap).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        {/* 签到入口按钮（所有用户可见） */}
        <Button
          variant="outlined"
          color="success"
          startIcon={<SigninEntryIcon />}
          onClick={() => setSigninOpen(true)}
        >
          签到入口
        </Button>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setFormOpen(true); }}>新建课程</Button>
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
                <TableCell sx={{ fontWeight: 'bold' }}>课程名称</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>讲师</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>时间</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>地点</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">报名/名额</TableCell>
                {isAdmin && <TableCell sx={{ fontWeight: 'bold' }}>签到码</TableCell>}
                <TableCell sx={{ fontWeight: 'bold' }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allTrainings.length === 0 ? (
                <TableRow><TableCell colSpan={isAdmin ? 8 : 7} align="center" sx={{ py: 4, color: 'text.secondary' }}>暂无培训课程</TableCell></TableRow>
              ) : allTrainings.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrainingIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2" fontWeight="bold">{t.title}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{t.instructor || '-'}</TableCell>
                  <TableCell>{new Date(t.startDate).toLocaleDateString()} ~ {new Date(t.endDate).toLocaleDateString()}</TableCell>
                  <TableCell>{t.location || '-'}</TableCell>
                  <TableCell align="center">
                    <Chip label={`${t.enrollmentCount || 0} / ${t.capacity}`} size="small"
                      color={(t.enrollmentCount || 0) >= t.capacity ? 'error' : 'primary'} variant="outlined" />
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {t.signinCode ? (
                        <Chip icon={<QrCodeIcon />} label={t.signinCode} size="small" color="primary" variant="outlined"
                          onClick={() => fetchDetail(t.id)}
                          sx={{ cursor: 'pointer', fontFamily: 'monospace' }}
                        />
                      ) : '-'}
                    </TableCell>
                  )}
                  <TableCell><Chip label={statusMap[t.status]?.label || t.status} color={statusMap[t.status]?.color || 'default'} size="small" /></TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="查看详情">
                        <IconButton size="small" color="info" onClick={() => fetchDetail(t.id)}>
                          <ScoreIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* 员工：报名 / 签到 */}
                      {isEmployee && t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (
                        <Tooltip title={t.enrollmentCount >= t.capacity ? '名额已满' : '报名'}>
                          <span>
                            <IconButton size="small" color="success"
                              onClick={() => handleSelfEnroll(t.id)}
                              disabled={t.enrollmentCount >= t.capacity}>
                              <EnrollIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}

                      {/* 管理员：报名/编辑/删除 */}
                      {isAdmin && (
                        <>
                          <Tooltip title="员工报名">
                            <IconButton size="small" color="success" onClick={() => handleOpenEnroll(t)} disabled={t.status === 'COMPLETED' || t.status === 'CANCELLED'}>
                              <EnrollIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="编辑">
                            <IconButton size="small" color="primary" onClick={() => { setEditing(t); setFormOpen(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="删除">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(t)}>
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
      )}

      {/* 分页 */}
      {total > 10 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <Typography sx={{ px: 3, py: 1 }}>第 {page} 页 / 共 {Math.ceil(total / 10)} 页</Typography>
          <Button disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(page + 1)}>下一页</Button>
        </Box>
      )}

      </>)}
      {tabValue === 1 && (
        <HoursPanel data={hoursData} loading={hoursLoading} />
      )}

      <TrainingFormDialog open={formOpen} editing={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} />
      <EnrollDialog open={Boolean(enrollTarget)} training={enrollTarget || {}} employees={employees} onClose={() => setEnrollTarget(null)} onSave={handleEnrollSave} />
      <TrainingDetailDialog open={Boolean(detailTarget)} training={detailTarget || {}} onClose={() => setDetailTarget(null)} onRefresh={() => { fetchDetail(detailTarget.id); fetchData(); }} user={user} />
      <SigninDialog open={signinOpen} onClose={() => setSigninOpen(false)} onSigned={fetchData} user={user} />
      <ConfirmDialog open={Boolean(deleteTarget)} title="删除培训课程" message={deleteTarget ? `确定要删除课程「${deleteTarget.title}」吗？` : ''} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}
