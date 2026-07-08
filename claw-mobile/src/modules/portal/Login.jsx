import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

// server.url 模式下，WebView 从远程加载，同源请求，直接用 /api
const API_BASE = '/api';

export default function Login() {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!account || !password) {
      setError('请输入账号和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // 1. Portal 统一认证
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account, password }),
      });
      const loginData = await loginRes.json();
      if (!loginData.success) {
        throw new Error(loginData.message || '登录失败');
      }
      const { token, user, permissions, systemRoles } = loginData.data;

      // 2. 通过 SSO 在 SCM 后端注册/同步用户（确保 SCM 认识这个 token）
      try {
        await fetch(`${API_BASE}/auth/sso-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ssoToken: token }),
        });
      } catch {
        // SSO 同步失败不阻塞登录
      }

      setAuth({
        ...user,
        role: systemRoles?.scm || user.role,
        permissions,
        systemRoles,
      }, token);
      navigate('/workbench', { replace: true });
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setError('无法连接服务器，请检查手机网络');
      } else {
        setError(err.message || '登录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        p: 3,
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
      }}
    >
      <Typography variant="h4" sx={{ color: '#fff', mb: 1, fontWeight: 700 }}>
        鲜当家
      </Typography>
      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 4 }}>
        综合管理平台
      </Typography>

      <Box
        component="form"
        onSubmit={handleLogin}
        sx={{
          width: '100%',
          maxWidth: 360,
          bgcolor: '#fff',
          borderRadius: 3,
          p: 3,
          boxShadow: 4,
        }}
      >
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          fullWidth
          label="账号（工号/手机号/邮箱）"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          sx={{ mb: 2 }}
          autoFocus
        />
        <TextField
          fullWidth
          type="password"
          label="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Button
          fullWidth
          variant="contained"
          size="large"
          type="submit"
          disabled={loading}
          sx={{ py: 1.5 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : '登录'}
        </Button>
      </Box>
    </Box>
  );
}
