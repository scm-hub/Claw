import { useState, useEffect } from 'react';
import { Box, Card, CardContent, TextField, Select, MenuItem, InputLabel, FormControl, Button, Grid, Alert, Avatar, Typography, Stack, CircularProgress, ToggleButtonGroup, ToggleButton, InputAdornment } from '@mui/material';
import { Person as PersonIcon, Approval as ApprovalIcon, AccessTime as TimeIcon } from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';

export default function LeaveApply() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type: 'ANNUAL',
    startDate: '',
    endDate: '',
    durationUnit: 'DAY',   // DAY 或 HOUR
    duration: 1,            // 时长数值
    startTime: '',          // 按小时请假时的开始时间
    reason: '',
  });
  const [approverInfo, setApproverInfo] = useState(null);
  const [loadingApprover, setLoadingApprover] = useState(true);

  useEffect(() => {
    const fetchApprover = async () => {
      setLoadingApprover(true);
      try {
        const res = await api.get('/leaves/approver');
        setApproverInfo(res.data);
      } catch {
        setApproverInfo(null);
      } finally {
        setLoadingApprover(false);
      }
    };
    fetchApprover();
  }, []);

  // 当时长类型或开始日期/时长改变时，自动计算结束日期
  useEffect(() => {
    if (!form.startDate) return;
    if (form.durationUnit === 'DAY') {
      // 按天：endDate = startDate + (duration - 1) 天（0.5天和1天都是当天）
      const days = Math.max(0, Math.ceil(form.duration) - 1);
      const end = new Date(form.startDate);
      end.setDate(end.getDate() + days);
      setForm(prev => ({ ...prev, endDate: fmtDate(end) }));
    }
    // 按小时：endDate = startDate（当天）
    if (form.durationUnit === 'HOUR') {
      setForm(prev => ({ ...prev, endDate: form.startDate }));
    }
  }, [form.startDate, form.duration, form.durationUnit]);

  const fmtDate = (d) => {
    if (typeof d === 'string') d = new Date(d);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate || form.startDate,
        duration: form.duration,
        durationUnit: form.durationUnit,
        reason: form.reason,
      };
      if (form.durationUnit === 'HOUR' && form.startTime) {
        payload.startTime = form.startTime;
      }
      const res = await api.post('/leaves', payload);
      const approverName = res.data?.approverInfo?.name;
      enqueueSnackbar(
        approverName
          ? `请假申请已提交，等待 ${approverName} 审批`
          : '请假申请已提交，将由管理员审批',
        { variant: 'success' }
      );
      navigate('/leaves/balance');
    } catch (err) {
      enqueueSnackbar(err.message || '提交失败', { variant: 'error' });
    }
  };

  /** 格式化时长显示 */
  const formatDuration = () => {
    if (form.durationUnit === 'HOUR') {
      return `${form.duration}小时`;
    }
    if (form.duration === 0.5) return '0.5天（半天）';
    return `${form.duration}天`;
  };

  return (
    <Box>
      <PageHeader title="请假申请" breadcrumbs={['请假管理', '申请']} />
      <Grid container spacing={3}>
        {/* 审批人信息 */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ApprovalIcon fontSize="small" color="primary" />
                审批流程
              </Typography>
              {loadingApprover ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : approverInfo?.approver ? (
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
                    {approverInfo.approver.name?.[0] || 'M'}
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      {approverInfo.approver.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {approverInfo.approver.departmentName || approverInfo.departmentName} · 部门经理
                    </Typography>
                  </Box>
                </Stack>
              ) : approverInfo?.needsAdminApproval ? (
                <Alert severity="info">
                  您是本部门的经理，您的请假将由上级部门经理或管理员审批
                </Alert>
              ) : (
                <Alert severity="warning">
                  您所在部门暂未设置部门经理，请假提交后可能无法及时审批
                </Alert>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {approverInfo?.needsAdminApproval
                  ? '部门经理的请假申请将由上级部门经理或系统管理员审批'
                  : '请假申请提交后，将由您所在部门的经理进行审批'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 申请表单 */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box component="form" onSubmit={handleSubmit}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>假别</InputLabel>
                  <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} label="假别">
                    <MenuItem value="ANNUAL">年假</MenuItem>
                    <MenuItem value="SICK">病假</MenuItem>
                    <MenuItem value="PERSONAL">事假</MenuItem>
                    <MenuItem value="MATERNITY">产假</MenuItem>
                    <MenuItem value="OTHER">其他</MenuItem>
                  </Select>
                </FormControl>

                {/* 时长类型选择 */}
                <FormControl fullWidth margin="normal">
                  <InputLabel>时长类型</InputLabel>
                  <Select
                    value={form.durationUnit}
                    onChange={(e) => {
                      const unit = e.target.value;
                      setForm(prev => ({
                        ...prev,
                        durationUnit: unit,
                        duration: unit === 'DAY' ? 1 : 2,
                        startTime: unit === 'HOUR' ? '09:00' : '',
                      }));
                    }}
                    label="时长类型"
                  >
                    <MenuItem value="DAY">按天</MenuItem>
                    <MenuItem value="HOUR">按小时</MenuItem>
                  </Select>
                </FormControl>

                {/* 时长输入 */}
                {form.durationUnit === 'DAY' ? (
                  <FormControl fullWidth margin="normal">
                    <InputLabel>请假天数</InputLabel>
                    <Select
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: parseFloat(e.target.value) })}
                      label="请假天数"
                    >
                      <MenuItem value={0.5}>0.5 天（半天）</MenuItem>
                      <MenuItem value={1}>1 天</MenuItem>
                      <MenuItem value={1.5}>1.5 天</MenuItem>
                      <MenuItem value={2}>2 天</MenuItem>
                      <MenuItem value={3}>3 天</MenuItem>
                      <MenuItem value={4}>4 天</MenuItem>
                      <MenuItem value={5}>5 天</MenuItem>
                      <MenuItem value={7}>7 天</MenuItem>
                      <MenuItem value={10}>10 天</MenuItem>
                      <MenuItem value={14}>14 天</MenuItem>
                      <MenuItem value={15}>15 天</MenuItem>
                      <MenuItem value={30}>30 天</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    fullWidth
                    type="number"
                    label="请假小时数"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: Math.max(1, parseInt(e.target.value) || 1) })}
                    margin="normal"
                    InputProps={{
                      inputProps: { min: 1, max: 24, step: 1 },
                      endAdornment: <InputAdornment position="end">小时</InputAdornment>,
                    }}
                    helperText="请输入 1-24 之间的整数"
                  />
                )}

                <TextField
                  fullWidth
                  type="date"
                  label="开始日期"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  required
                />

                {/* 按小时请假时显示开始时间 */}
                {form.durationUnit === 'HOUR' && (
                  <TextField
                    fullWidth
                    type="time"
                    label="开始时间"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <TimeIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    helperText="请假的起始时间点"
                  />
                )}

                {/* 多天请假时显示结束日期 */}
                {form.durationUnit === 'DAY' && form.duration > 1 && (
                  <TextField
                    fullWidth
                    type="date"
                    label="结束日期"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                )}

                {/* 时长预览 */}
                {form.startDate && (
                  <Alert severity="info" sx={{ mt: 1, mb: 1 }} icon={<TimeIcon fontSize="small" />}>
                    请假时长：<strong>{formatDuration()}</strong>
                    {form.durationUnit === 'HOUR' && form.startTime && (
                      <span>，从 {form.startTime} 开始</span>
                    )}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="请假事由"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  margin="normal"
                  required
                />
                <Box sx={{ mt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!form.startDate || !form.reason || (form.durationUnit === 'HOUR' && !form.startTime)}
                  >
                    提交申请
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
