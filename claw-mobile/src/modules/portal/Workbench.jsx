import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Badge, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function Workbench() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(null);
  const [unreadCount, setUnreadCount] = useState(null);

  useEffect(() => {
    // 获取待办审批数量
    const token = useAuthStore.getState().token;
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    fetch('/api/workflow/tasks/pending', { headers })
      .then(r => r.json())
      .then(d => { if (d.success) setPendingCount(d.data?.total || d.data?.length || 0); })
      .catch(() => {});
    fetch('/api/workflow/notifications/unread-count', { headers })
      .then(r => r.json())
      .then(d => { if (d.success) setUnreadCount(d.data?.count || 0); })
      .catch(() => {});
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        你好，{user?.employee?.name || user?.email || '用户'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {user?.employee?.departmentName || ''} · {user?.employee?.positionTitle || ''}
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Card sx={{ cursor: 'pointer', bgcolor: '#e3f2fd' }} onClick={() => navigate('/scm')}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h4">📦</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>供应链管理</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card sx={{ cursor: 'pointer', bgcolor: '#e8f5e9' }} onClick={() => navigate('/hrms')}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h4">👥</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>人力资源</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card sx={{ cursor: 'pointer', bgcolor: '#fff3e0' }} onClick={() => navigate('/ai')}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h4">🤖</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>AI 助手</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card sx={{ cursor: 'pointer', bgcolor: '#fce4ec' }} onClick={() => navigate('/profile')}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Badge badgeContent={pendingCount || 0} color="error">
                <Typography variant="h4">📋</Typography>
              </Badge>
              <Typography variant="body2" sx={{ mt: 1 }}>待办审批</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {(pendingCount !== null || unreadCount !== null) && (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>待处理</Typography>
            {pendingCount !== null && (
              <Typography variant="body2">待审批: <strong>{pendingCount}</strong> 项</Typography>
            )}
            {unreadCount !== null && (
              <Typography variant="body2">未读消息: <strong>{unreadCount}</strong> 条</Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
