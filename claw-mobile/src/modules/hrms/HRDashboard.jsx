import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from './api';

export default function HRDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats').catch(() => null),
      api.get('/attendance/today').catch(() => null),
    ]).then(([statsRes, todayRes]) => {
      if (statsRes?.success) setStats(statsRes.data);
      if (todayRes?.success) setToday(todayRes.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 2, pb: 8 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>人力资源</Typography>

      {/* 考勤状态 */}
      <Card sx={{ mb: 2, background: 'linear-gradient(135deg, #1976d2, #42a5f5)', color: '#fff' }}>
        <CardContent>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>今日考勤</Typography>
          {today ? (
            <Box sx={{ mt: 1 }}>
              <Typography variant="h5">
                {today.clockIn ? '已打卡 ✅' : '未打卡'}
              </Typography>
              {today.clockIn && (
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  上班: {new Date(today.clockIn).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  {today.clockOut && ` | 下班: ${new Date(today.clockOut).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`}
                </Typography>
              )}
            </Box>
          ) : (
            <Typography variant="body2" sx={{ mt: 1 }}>加载中...</Typography>
          )}
        </CardContent>
      </Card>

      {/* 快捷入口 */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Button fullWidth variant="outlined" onClick={() => navigate('/hrms/attendance')}>打卡记录</Button>
        </Grid>
        <Grid item xs={6}>
          <Button fullWidth variant="outlined" onClick={() => navigate('/hrms/leaves')}>请假申请</Button>
        </Grid>
        <Grid item xs={6}>
          <Button fullWidth variant="outlined" onClick={() => navigate('/hrms/salary')}>我的薪资</Button>
        </Grid>
        <Grid item xs={6}>
          <Button fullWidth variant="outlined" onClick={() => navigate('/hrms/employees')}>员工查询</Button>
        </Grid>
      </Grid>

      {/* 统计数据 */}
      {stats && (
        <Grid container spacing={2}>
          {stats.totalEmployees !== undefined && (
            <Grid item xs={6}>
              <Card><CardContent>
                <Typography color="text.secondary" variant="body2">总员工</Typography>
                <Typography variant="h5">{stats.totalEmployees}</Typography>
              </CardContent></Card>
            </Grid>
          )}
          {stats.todayAttendance !== undefined && (
            <Grid item xs={6}>
              <Card><CardContent>
                <Typography color="text.secondary" variant="body2">今日出勤</Typography>
                <Typography variant="h5">{stats.todayAttendance}</Typography>
              </CardContent></Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
