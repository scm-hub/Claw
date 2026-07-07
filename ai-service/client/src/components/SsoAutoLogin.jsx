import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box, Typography, Alert, Button } from '@mui/material';
import api from '../api/index.js';
import useAuthStore from '../store/auth.js';

/**
 * 从多个来源提取 sso_token
 * Vite 开发服务器在 SPA 模式下会剥离 location.search，所以需要多重 fallback。
 */
function extractSsoToken(location) {
  // 方法1: react-router 的 location.search（标准方式，适用于生产环境）
  const fromRouterSearch = new URLSearchParams(location.search || '').get('sso_token');
  if (fromRouterSearch) return fromRouterSearch;

  // 方法2: 原生 window.location.search（绕过 react-router）
  const fromWindowSearch = new URLSearchParams(window.location.search || '').get('sso_token');
  if (fromWindowSearch) return fromWindowSearch;

  // 方法3: 从完整 href 中手动解析（Vite dev server SPA 模式的最终 fallback）
  try {
    const fullHref = window.location.href;
    const questionIdx = fullHref.indexOf('?');
    if (questionIdx !== -1) {
      const queryString = fullHref.substring(questionIdx + 1);
      const hashIdx = queryString.indexOf('#');
      const cleanQuery = hashIdx === -1 ? queryString : queryString.substring(0, hashIdx);
      const fromHref = new URLSearchParams(cleanQuery).get('sso_token');
      if (fromHref) return fromHref;
    }
  } catch {
    // ignore parse errors
  }

  return null;
}

export default function SsoAutoLogin({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const ssoToken = extractSsoToken(location);

    if (!ssoToken) return; // 无 token，直接渲染 children
    if (status !== 'idle') return; // 已经处理过，避免重复执行

    setStatus('loading');

    api.ssoLogin(ssoToken)
      .then((resp) => {
        if (resp.success && resp.data?.token) {
          login(resp.data.token, resp.data.user);
          // 清除 URL 中的 token 参数（安全考虑 + 防止刷新重复提交）
          window.history.replaceState({}, document.title, window.location.pathname);
          setStatus('done');
        } else {
          setErrorMsg(resp.message || resp.error || 'SSO 验证失败');
          setStatus('error');
        }
      })
      .catch((err) => {
        setErrorMsg(err.message || '网络请求失败，请检查网络连接后重试');
        setStatus('error');
      });
  }, [status, navigate, login, location.search]);

  if (status === 'loading') {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" gap={2}>
        <CircularProgress />
        <Typography color="text.secondary">正在验证 SSO 登录...</Typography>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto', mt: 8, px: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">SSO 自动登录失败</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>原因：{errorMsg}</Typography>
        </Alert>
        <Button variant="contained" onClick={() => navigate(import.meta.env.BASE_URL + 'login', { replace: true })} sx={{ mt: 2 }}>
          前往手动登录页
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
