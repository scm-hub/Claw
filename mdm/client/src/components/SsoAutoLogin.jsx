import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import HubIcon from '@mui/icons-material/Hub';
import useAuthStore from '../store/auth';
import api from '../api';

/**
 * 从多个来源提取 sso_token（Vite dev server 可能会剥离 location.search）
 */
function extractSsoToken(location) {
  // 方法1: react-router 的 location.search
  const fromRouter = new URLSearchParams(location.search || '').get('sso_token');
  if (fromRouter) return fromRouter;

  // 方法2: 原生 window.location.search
  const fromWindow = new URLSearchParams(window.location.search || '').get('sso_token');
  if (fromWindow) return fromWindow;

  // 方法3: 从完整 href 中手动解析（Vite SPA fallback）
  try {
    const fullHref = window.location.href;
    const qIdx = fullHref.indexOf('?');
    if (qIdx !== -1) {
      const qs = fullHref.substring(qIdx + 1);
      const hIdx = qs.indexOf('#');
      const clean = hIdx === -1 ? qs : qs.substring(0, hIdx);
      const fromHref = new URLSearchParams(clean).get('sso_token');
      if (fromHref) return fromHref;
    }
  } catch (e) {
    console.warn('[SsoAutoLogin] href解析失败:', e);
  }

  return null;
}

/**
 * SSO 自动登录组件
 * 检测 URL 中的 sso_token 参数，自动完成登录，成功后跳转仪表盘。
 * 403 错误时显示无权限提示页面。
 */
export default function SsoAutoLogin({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [ssoError, setSsoError] = useState(null);

  useEffect(() => {
    const ssoToken = extractSsoToken(location);

    console.log('[MDM-SsoAutoLogin] token提取:', {
      hasToken: !!ssoToken,
      length: ssoToken?.length || 0,
    });

    if (!ssoToken) {
      setChecking(false);
      return;
    }

    api
      .post('/auth/sso-login', { ssoToken })
      .then((data) => {
        if (data.success && data.data?.token) {
          login(data.data.token, data.data.user);
          window.history.replaceState({}, '', window.location.pathname);
          navigate('/', { replace: true });
        } else {
          window.history.replaceState({}, '', window.location.pathname);
          navigate('/login', { replace: true });
        }
      })
      .catch((err) => {
        console.error('MDM SSO 登录失败:', err);
        // 403: 无 MDM 权限
        if (err.response?.status === 403) {
          setSsoError(err.response.data.message || '账号未配置主数据管理系统权限');
          setChecking(false);
          return;
        }
        window.history.replaceState({}, '', window.location.pathname);
        navigate('/login', { replace: true });
      })
      .finally(() => setChecking(false));
  }, [navigate, login, location]);

  // 403 无权限提示页面
  if (ssoError) {
    return (
      <Box sx={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh', gap: 3, p: 4,
      }}>
        <HubIcon sx={{ fontSize: 64, color: 'grey.400' }} />
        <Typography variant="h5" color="error" fontWeight="bold">权限不足</Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          {ssoError}
        </Typography>
        <Button variant="contained" href="/" sx={{ mt: 2 }}>
          返回综合平台
        </Button>
      </Box>
    );
  }

  if (checking) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 2 }}>
        <CircularProgress size={48} />
        <Typography variant="body2" color="text.secondary">正在通过统一平台登录...</Typography>
      </Box>
    );
  }

  return children;
}
