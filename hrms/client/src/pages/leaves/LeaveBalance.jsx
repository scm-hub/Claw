import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, Stack, Avatar, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Tooltip, IconButton, CircularProgress, Alert, InputAdornment,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Replay as ResubmitIcon,
  EventNote as LeaveIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';
import { useSnackbar } from 'notistack';

const typeMap = {
  ANNUAL: { label: '年假', color: 'primary' },
  SICK: { label: '病假', color: 'error' },
  PERSONAL: { label: '事假', color: 'warning' },
  MATERNITY: { label: '产假', color: 'secondary' },
  OTHER: { label: '其他', color: 'default' },
};

const statusMap = {
  PENDING: { label: '待审批', color: 'warning' },
  APPROVED: { label: '已通过', color: 'success' },
  REJECTED: { label: '已驳回', color: 'error' },
};

/** 计算请假天数（兼容旧数据） */
function calcDays(leave) {
  if (leave.duration != null && leave.durationUnit) {
    if (leave.durationUnit === 'HOUR') {
      return leave.duration / 8; // 8小时 = 1天
    }
    return leave.duration;
  }
  // 旧数据兼容
  const s = new Date(leave.startDate);
  const e = new Date(leave.endDate);
  return Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

/** 格式化时长显示 */
function formatDuration(leave) {
  if (leave.durationUnit === 'HOUR') {
    const text = `${leave.duration}小时`;
    return leave.startTime ? `${text}（${leave.startTime}起）` : text;
  }
  if (leave.duration === 0.5) return '0.5天（半天）';
  return `${leave.duration}天`;
}

/** 格式化日期 */
function fmtDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 重新申请弹窗 */
function ResubmitDialog({ open, leave, loading, onClose, onConfirm }) {
  const [form, setForm] = useState({
    type: 'ANNUAL',
    startDate: '',
    endDate: '',
    durationUnit: 'DAY',
    duration: 1,
    startTime: '',
    reason: '',
  });

  useEffect(() => {
    if (open && leave) {
      setForm({
        type: leave.type || 'ANNUAL',
        startDate: leave.startDate ? fmtDate(leave.startDate) : '',
        endDate: leave.endDate ? fmtDate(leave.endDate) : '',
        durationUnit: leave.durationUnit || 'DAY',
        duration: leave.duration ?? 1,
        startTime: leave.startTime || '',
        reason: leave.reason || '',
      });
    }
  }, [open, leave]);

  if (!leave) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>重新申请请假</DialogTitle>
      <DialogContent>
        {leave.comment && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={500}>上次驳回原因：</Typography>
            <Typography variant="body2">{leave.comment}</Typography>
          </Alert>
        )}
        <FormControl fullWidth margin="normal">
          <InputLabel>假别</InputLabel>
          <Select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            label="假别"
          >
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>取消</Button>
        <Button
          variant="contained"
          disabled={loading || !form.startDate || !form.reason || (form.durationUnit === 'HOUR' && !form.startTime)}
          onClick={() => onConfirm(leave.id, form)}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : '重新提交'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function LeaveBalance() {
  const [balance, setBalance] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(true);
  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [resubmitLeave, setResubmitLeave] = useState(null);
  const [resubmitLoading, setResubmitLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const fetchBalance = useCallback(async () => {
    try {
      const data = await api.get('/leaves/balance', { params: { year: new Date().getFullYear() } });
      setBalance(data.data);
    } catch {}
  }, []);

  const fetchLeaves = useCallback(async () => {
    setLeavesLoading(true);
    try {
      const data = await api.get('/leaves');
      setLeaves(data.data || []);
    } catch {
      enqueueSnackbar('加载请假记录失败', { variant: 'error' });
    } finally {
      setLeavesLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchBalance();
    fetchLeaves();
  }, [fetchBalance, fetchLeaves]);

  const handleResubmit = async (leaveId, form) => {
    setResubmitLoading(true);
    try {
      const payload = {
        startDate: form.startDate,
        endDate: form.endDate || form.startDate,
        duration: form.duration,
        durationUnit: form.durationUnit,
        reason: form.reason,
      };
      if (form.durationUnit === 'HOUR' && form.startTime) {
        payload.startTime = form.startTime;
      }
      await api.put(`/leaves/${leaveId}/resubmit`, payload);
      enqueueSnackbar('重新申请已提交', { variant: 'success' });
      setResubmitOpen(false);
      setResubmitLeave(null);
      fetchLeaves();
      fetchBalance();
    } catch (err) {
      enqueueSnackbar(err.message || '重新申请失败', { variant: 'error' });
    } finally {
      setResubmitLoading(false);
    }
  };

  return (
    <Box>
      <PageHeader title="我的请假" breadcrumbs={['请假管理', '我的请假']} />

      {/* 假期余额 */}
      <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>假期余额</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {balance && Object.entries(balance).map(([type, info]) => {
          const typeInfo = typeMap[type] || { label: type, color: 'default' };
          const ratio = info.total > 0 ? info.used / info.total : 0;
          const remaining = (info.total - info.used).toFixed(1);
          return (
            <Grid item xs={12} sm={6} md={4} key={type}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
                  <Avatar sx={{ bgcolor: `${typeInfo.color}.light`, width: 44, height: 44 }}>
                    <LeaveIcon />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{typeInfo.label}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      总额 {info.total} 天 · 已用 {info.used.toFixed(1)} 天 · 剩余 <Box component="span" fontWeight={700} color={info.total - info.used <= 2 ? 'error.main' : 'text.primary'}>{remaining}</Box> 天
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={ratio * 100}
                      sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                      color={ratio > 0.8 ? 'error' : 'primary'}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* 请假记录 */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="h6" fontWeight={600}>请假记录</Typography>
        <Tooltip title="刷新">
          <IconButton size="small" onClick={fetchLeaves}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Card sx={{ borderRadius: 2 }}>
        {leavesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : leaves.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <LeaveIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">暂无请假记录</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>假别</TableCell>
                  <TableCell>起止日期</TableCell>
                  <TableCell align="center">时长</TableCell>
                  <TableCell>请假事由</TableCell>
                  <TableCell align="center">状态</TableCell>
                  <TableCell>审批人</TableCell>
                  <TableCell>审批意见</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaves.map((leave) => {
                  const days = calcDays(leave);
                  const typeInfo = typeMap[leave.type] || { label: leave.type, color: 'default' };
                  const statusInfo = statusMap[leave.status] || { label: leave.status, color: 'default' };
                  const isRejected = leave.status === 'REJECTED';

                  return (
                    <TableRow key={leave.id} hover>
                      <TableCell>
                        <Chip label={typeInfo.label} size="small" color={typeInfo.color} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {fmtDate(leave.startDate)}
                          {leave.durationUnit === 'DAY' && leave.duration > 1
                            ? ` ~ ${fmtDate(leave.endDate)}`
                            : ''}
                        </Typography>
                        {leave.durationUnit === 'HOUR' && leave.startTime && (
                          <Typography variant="caption" color="text.secondary">
                            {leave.startTime} 起
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={formatDuration(leave)}
                          size="small"
                          variant="outlined"
                          color={leave.durationUnit === 'HOUR' ? 'secondary' : 'primary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {leave.reason || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={statusInfo.label} size="small" color={statusInfo.color} />
                      </TableCell>
                      <TableCell>
                        {leave.status === 'PENDING' ? (
                          <Typography variant="body2" color="text.secondary">
                            {leave.employeeId === leave.employee?.department?.managerId
                              ? '上级部门经理'
                              : leave.employee?.department?.name
                                ? `${leave.employee.department.name} 经理`
                                : '-'}
                          </Typography>
                        ) : leave.approver ? (
                          <Typography variant="body2">{leave.approver.name}</Typography>
                        ) : (
                          <Typography variant="body2" color="text.disabled">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {isRejected && leave.comment ? (
                          <Tooltip title={leave.comment} arrow>
                            <Typography
                              variant="body2"
                              color="error.main"
                              sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {leave.comment}
                            </Typography>
                          </Tooltip>
                        ) : leave.status === 'APPROVED' && leave.approver ? (
                          <Typography variant="body2" color="text.secondary">
                            {leave.approver.name} 审批通过
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {isRejected && (
                          <Tooltip title="重新申请">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                setResubmitLeave(leave);
                                setResubmitOpen(true);
                              }}
                            >
                              <ResubmitIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!isRejected && (
                          <Typography variant="body2" color="text.disabled">-</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* 重新申请弹窗 */}
      <ResubmitDialog
        open={resubmitOpen}
        leave={resubmitLeave}
        loading={resubmitLoading}
        onClose={() => { setResubmitOpen(false); setResubmitLeave(null); }}
        onConfirm={handleResubmit}
      />
    </Box>
  );
}
