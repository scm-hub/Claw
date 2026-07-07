import { useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, CircularProgress } from '@mui/material';
import { Agriculture, Login as LoginIcon } from '@mui/icons-material';

/**
 * SCM 登录页 — 已改为跳转到统一平台 Portal 登录
 * 用户通过 Portal 登录后，点击 SCM 系统图标即可自动 SSO 登录
 */
export default function Login() {
  // 自动跳转到 Portal 登录页
  useEffect(() => {
    // 获取当前 SCM 的 base path（/scm 或根路径）
    const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
    // Portal 在根路径
    const portalUrl = window.location.origin + '/';
    // 带 redirect 参数，登录后可自动跳回 SCM
    const redirectUrl = `${portalUrl}?redirect=${encodeURIComponent(basePath || '/scm')}`;
    window.location.replace(redirectUrl);
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #43A047 100%)',
      }}
    >
      <Card sx={{ maxWidth: 420, width: '90%', borderRadius: 3, textAlign: 'center' }}>
        <CardContent sx={{ p: 4 }}>
          <Agriculture sx={{ fontSize: 56, color: 'primary.main' }} />
          <Typography variant="h5" sx={{ mt: 1, fontWeight: 700 }}>
            鲜当家供应链管理系统
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
            请通过统一平台登录后进入 SCM 系统
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
