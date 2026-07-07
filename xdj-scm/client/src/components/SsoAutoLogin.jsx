import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button, Alert } from '@mui/material';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

/**
 * 从多个来源提取 sso_token（Vite SPA 模式可能剥离 location.search）
 */
function extractSsoToken(location) {
  const fromRouter = new URLSearchParams(location.search || '').get('sso_token');
  if (fromRouter) return fromRouter;

  const fromWindow = new URLSearchParams(window.location.search || '').get('sso_token');
  if (fromWindow) return fromWindow;

  try {
    const href = window.location.href;
    const qIdx = href.indexOf('?');
    if (qIdx !== -1) {
      const qs = href.substring(qIdx + 1);
      const hIdx = qs.indexOf('#');
      const clean = hIdx === -1 ? qs : qs.substring(0, hIdx);
      const fromHref = new URLSearchParams(clean).get('sso_token');
      if (fromHref) return fromHref;
    }
  } catch (e) {
    console.warn('[SCM-SsoAutoLogin] href解析失败:', e);
  }

  return null;
}

/**
 * SSO 自动登录组件
 * 检测 URL 中的 sso_token 参数，自动完成登录。
 * 403 时展示错误提示，引导用户联系管理员。
 */
export default function SsoAutoLogin({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ssoToken = extractSsoToken(location);

    if (ssoToken) {
      api
        .post('/auth/sso-login', { ssoToken })
        .then((data) => {
          if (data.success && data.data?.token) {
            setAuth(data.data);
            window.history.replaceState({}, '', window.location.pathname);
            navigate('/');
          } else {
            setError(data.message || '登录失败');
            setChecking(false);
          }
        })
        .catch((err) => {
          console.error('SSO 登录失败:', err);
          const msg = err?.response?.data?.message || err?.message || 'SSO 登录失败';
          setError(msg);
          setChecking(false);
        });
    } else {
      setChecking(false);
    }
  }, [navigate, setAuth, location]);

  if (checking) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 2 }}>
        <CircularProgress size={48} />
        <Typography variant="body2" color="text.secondary">正在通过统一平台登录...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 3, p: 3 }}>
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          <Typography variant="h6">登录失败</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
        <Button variant="contained" onClick={() => window.location.href = '/'}>
          返回综合平台
        </Button>
      </Box>
    );
  }

  return children;
}
