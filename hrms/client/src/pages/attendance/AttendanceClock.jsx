import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, Chip, Grid, Divider, List, ListItem, ListItemIcon, ListItemText, alpha } from '@mui/material';
import { AccessTime as ClockIcon, Fingerprint as FingerprintIcon, Schedule as ScheduleIcon, Login as LoginIcon, Logout as LogoutIcon, FiberManualRecord as DotIcon } from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';
import { useSnackbar } from 'notistack';

const statusMap = {
  NORMAL: { label: '正常', color: 'success' },
  LATE: { label: '迟到', color: 'warning' },
  EARLY_LEAVE: { label: '早退', color: 'warning' },
  LATE_EARLY: { label: '迟到+早退', color: 'error' },
  ABSENT: { label: '缺勤', color: 'error' },
};

export default function AttendanceClock() {
  const [todayStatus, setTodayStatus] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punching, setPunching] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchTodayStatus();
    return () => clearInterval(timer);
  }, []);

  const fetchTodayStatus = async () => {
    try {
      const data = await api.get('/attendance/today');
      setTodayStatus(data.data);
    } catch {}
  };

  const handlePunch = async () => {
    setPunching(true);
    try {
      const data = await api.post('/attendance/punch');
      setTodayStatus(data.data);
      const punchCount = data.data.punchCount;
      if (punchCount === 1) {
        enqueueSnackbar('打卡成功！已记录上班时间', { variant: 'success' });
      } else {
        enqueueSnackbar(`打卡成功！今日第 ${punchCount} 次打卡`, { variant: 'success' });
      }
    } catch (err) {
      enqueueSnackbar(err.message || '打卡失败', { variant: 'error' });
    } finally {
      setPunching(false);
    }
  };

  const punchRecords = todayStatus?.clockRecords || [];
  const lastPunch = punchRecords.length > 0 ? punchRecords[punchRecords.length - 1] : null;

  return (
    <Box>
      <PageHeader title="考勤打卡" breadcrumbs={['考勤管理', '打卡']} />
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} md={8}>
          {/* 打卡主卡片 */}
          <Card sx={{ textAlign: 'center', py: 4, mb: 3, background: `linear-gradient(135deg, ${alpha('#1976d2', 0.05)} 0%, ${alpha('#1976d2', 0.02)} 100%)` }}>
            <CardContent>
              <ClockIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1, fontVariantNumeric: 'tabular-nums' }}>
                {currentTime.toLocaleTimeString('zh-CN')}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {currentTime.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Typography>

              {/* 单一打卡按钮 */}
              <Button
                variant="contained"
                size="large"
                startIcon={<FingerprintIcon />}
                onClick={handlePunch}
                disabled={punching}
                sx={{
                  px: 6, py: 2, fontSize: 18, borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)',
                  '&:hover': { boxShadow: '0 6px 25px rgba(25, 118, 210, 0.4)' },
                }}
              >
                {punching ? '打卡中...' : '打 卡'}
              </Button>

              {/* 上班/下班卡信息 */}
              {todayStatus && (
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 4 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <LoginIcon sx={{ color: 'success.main', mb: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">上班卡</Typography>
                    <Typography variant="h6" fontWeight="bold" color={todayStatus.clockIn ? 'success.main' : 'text.disabled'}>
                      {todayStatus.clockIn ? new Date(todayStatus.clockIn).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box sx={{ textAlign: 'center' }}>
                    <LogoutIcon sx={{ color: 'info.main', mb: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">下班卡</Typography>
                    <Typography variant="h6" fontWeight="bold" color={todayStatus.clockOut ? 'info.main' : 'text.disabled'}>
                      {todayStatus.clockOut ? new Date(todayStatus.clockOut).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* 状态标签 */}
              {todayStatus?.status && todayStatus.status !== 'NORMAL' && (
                <Chip
                  label={statusMap[todayStatus.status]?.label || todayStatus.status}
                  color={statusMap[todayStatus.status]?.color || 'default'}
                  sx={{ mt: 2 }}
                />
              )}
              {todayStatus?.status === 'NORMAL' && todayStatus.clockIn && (
                <Chip label="正常" color="success" sx={{ mt: 2 }} />
              )}
            </CardContent>
          </Card>

          {/* 今日打卡记录列表 */}
          {punchRecords.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                  <ScheduleIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'text-bottom' }} />
                  今日打卡记录（共 {punchRecords.length} 次）
                </Typography>
                <List dense>
                  {punchRecords.map((record, index) => {
                    const time = new Date(record.clockTime);
                    const isFirst = index === 0;
                    const isLast = index === punchRecords.length - 1;
                    let label = `第 ${index + 1} 次打卡`;
                    let tag = null;
                    if (punchRecords.length > 1) {
                      if (isFirst) tag = <Chip label="上班卡" size="small" color="success" sx={{ ml: 1 }} />;
                      if (isLast && !isFirst) tag = <Chip label="下班卡" size="small" color="info" sx={{ ml: 1 }} />;
                    }

                    return (
                      <ListItem key={record.id} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <DotIcon sx={{ fontSize: 10, color: isFirst ? 'success.main' : isLast ? 'info.main' : 'text.secondary' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2">{label}</Typography>
                              {tag}
                            </Box>
                          }
                          secondary={time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        />
                      </ListItem>
                    );
                  })}
                </List>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  * 上班卡 = 当日最早打卡时间，下班卡 = 当日最晚打卡时间
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
