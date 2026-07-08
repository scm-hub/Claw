import React from 'react';
import { Box, Typography, Card, CardContent, Grid } from '@mui/material';
import useAuthStore from '../../store/authStore';

export default function Workbench() {
  const user = useAuthStore((s) => s.user);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        你好，{user?.employee?.name || user?.email || '用户'}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">待办审批</Typography>
              <Typography variant="h5">--</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">今日消息</Typography>
              <Typography variant="h5">--</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
        更多功能开发中...
      </Typography>
    </Box>
  );
}
