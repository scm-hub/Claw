import { useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, CircularProgress } from '@mui/material';
import { People as PeopleIcon, Login as LoginIcon } from '@mui/icons-material';

/**
 * HRMS 登录页 — 已改为跳转到统一平台 Portal 登录
 * 用户通过 Portal 登录后，点击 HRMS 系统图标即可自动 SSO 登录
 */
export default function Login() {
  useEffect(() => {
    const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
    const portalUrl = window.location.origin + '/';
    const redirectUrl = `${portalUrl}?redirect=${encodeURIComponent(basePath || '/hrms')}`;
    window.location.replace(redirectUrl);
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1565C0 0%, #1976D2 50%, #42A5F5 100%)',
      }}
    >
      <Card sx={{ maxWidth: 420, width: '90%', borderRadius: 3, textAlign: 'center' }}>
        <CardContent sx={{ p: 4 }}>
          <PeopleIcon sx={{ fontSize: 56, color: 'primary.main' }} />
          <Typography variant="h5" sx={{ mt: 1, fontWeight: 700 }}>
            人力资源管理系统
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            正在跳转到统一平台登录...
          </Typography>
          <CircularProgress size={32} />
          <Box sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              startIcon={<LoginIcon />}
              onClick={() => {
                window.location.href = window.location.origin + '/';
              }}
            >
              手动跳转
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            请通过统一平台登录后进入 HRMS 系统
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
