import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Stack, Avatar, Divider, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress, Tabs, Tab, Badge,
} from '@mui/material';
import {
  Check as ApproveIcon, Close as RejectIcon,
  EventNote as LeaveIcon, AccessTime as TimeIcon,
  Person as PersonIcon, FilterAlt as FilterIcon,
  Chat as CommentIcon, Approval as ApprovalIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';
import { useSnackbar } from 'notistack';
import useAuthStore from '../../store/authStore';

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
      return leave.duration / 8;
    }
    return leave.duration;
  }
  const s = new Date(leave.startDate);
  const e = new Date(leave.endDate);
  return Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

/** 格式化时长显示 */
function formatDuration(leave) {
  if (leave.durationUnit === 'HOUR') {
    return `${leave.duration}小时`;
  }
  if (leave.duration === 0.5) return '0.5天';
  return `${leave.duration}天`;
}

/** 格式化日期 */
function fmtDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 审批确认弹窗 */
function ApprovalDialog({ open, leave, action, loading, onClose, onConfirm }) {
  const [comment, setComment] = useState('');
  const isApprove = action === 'APPROVED';

  useEffect(() => {
    if (open) setComment('');
  }, [open]);

  if (!leave) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {isApprove ? '审批通过' : '驳回请假'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {leave.employee?.name} · {typeMap[leave.type]?.label || leave.type} · {formatDuration(leave)}
          </Typography>
        </Box>
        <TextField
          fullWidth
          multiline
          rows={2}
          label="审批意见（可选）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={isApprove ? '同意' : '请填写驳回原因…'}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>取消</Button>
        <Button
          variant="contained"
          color={isApprove ? 'success' : 'error'}
          disabled={loading}
          onClick={() => onConfirm(leave.id, action, comment)}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : (isApprove ? '确认通过' : '确认驳回')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function LeaveApproval() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0); // 0=待审批 1=已审批
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogLeave, setDialogLeave] = useState(null);
  const [dialogAction, setDialogAction] = useState('APPROVED');
  const [actionLoading, setActionLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuthStore();
  const isManager = user?.role === 'MANAGER';

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, processedRes] = await Promise.all([
        api.get('/leaves/pending'),
        api.get('/leaves/pending?status=APPROVED,REJECTED'),
      ]);
      const pending = pendingRes.data || [];
      const processed = processedRes.data || [];
      setLeaves([...pending, ...processed]);
    } catch (err) {
      enqueueSnackbar(err.message || '加载失败', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING');
  const processedLeaves = leaves.filter((l) => l.status !== 'PENDING');

  const handleOpenDialog = (leave, action) => {
    setDialogLeave(leave);
    setDialogAction(action);
    setDialogOpen(true);
  };

  const handleConfirm = async (leaveId, status, comment) => {
    setActionLoading(true);
    try {
      await api.put(`/leaves/${leaveId}/approve`, {
        status,
        comment: comment || (status === 'APPROVED' ? '审批通过' : '审批驳回'),
      });
      enqueueSnackbar(status === 'APPROVED' ? '已通过' : '已驳回', { variant: 'success' });
      fetchLeaves();
      setDialogOpen(false);
    } catch (err) {
      enqueueSnackbar(err.message || '操作失败', { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const currentList = tab === 0 ? pendingLeaves : processedLeaves;

  return (
    <Box>
      <PageHeader
        title="请假审批"
        subtitle="审批员工请假申请"
        breadcrumbs={['请假管理', '审批']}
      />

      {/* 审批流程说明 */}
      {isManager && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} icon={<ApprovalIcon />}>
          以下为您所管理部门的员工请假申请，您作为部门经理负责审批
        </Alert>
      )}

      {/* 统计概览 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
              <Avatar sx={{ bgcolor: 'warning.light' }}><TimeIcon /></Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">{pendingLeaves.length}</Typography>
                <Typography variant="body2" color="text.secondary">待审批</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
              <Avatar sx={{ bgcolor: 'success.light' }}><ApproveIcon /></Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">{processedLeaves.filter((l) => l.status === 'APPROVED').length}</Typography>
                <Typography variant="body2" color="text.secondary">已通过</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
              <Avatar sx={{ bgcolor: 'error.light' }}><RejectIcon /></Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">{processedLeaves.filter((l) => l.status === 'REJECTED').length}</Typography>
                <Typography variant="body2" color="text.secondary">已驳回</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tab 切换 */}
      <Card sx={{ borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab
              label={
                <Badge badgeContent={pendingLeaves.length} color="warning" max={99}>
                  待审批
                </Badge>
              }
            />
            <Tab label="已审批" />
          </Tabs>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : currentList.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <LeaveIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {tab === 0 ? '暂无待审批请假' : '暂无已审批记录'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>员工</TableCell>
                  <TableCell>假别</TableCell>
                  <TableCell>起止日期</TableCell>
                  <TableCell align="center">时长</TableCell>
                  <TableCell>请假事由</TableCell>
                  <TableCell align="center">状态</TableCell>
                  {tab === 0 && <TableCell align="center">操作</TableCell>}
                  {tab === 1 && <TableCell>审批意见</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {currentList.map((leave) => {
                  const days = calcDays(leave.startDate, leave.endDate);
                  const typeInfo = typeMap[leave.type] || { label: leave.type, color: 'default' };
                  const statusInfo = statusMap[leave.status] || { label: leave.status, color: 'default' };

                  return (
                    <TableRow key={leave.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: 'primary.main' }}>
                            {(leave.employee?.name || '?')[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {leave.employee?.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {leave.employee?.department?.name || '未分配部门'}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
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
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {leave.reason || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={statusInfo.label} size="small" color={statusInfo.color} />
                      </TableCell>
                      {tab === 0 && (
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="通过">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleOpenDialog(leave, 'APPROVED')}
                              >
                                <ApproveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="驳回">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleOpenDialog(leave, 'REJECTED')}
                              >
                                <RejectIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      )}
                      {tab === 1 && (
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {leave.comment || '-'}
                          </Typography>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* 审批确认弹窗 */}
      <ApprovalDialog
        open={dialogOpen}
        leave={dialogLeave}
        action={dialogAction}
        loading={actionLoading}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
      />
    </Box>
  );
}
