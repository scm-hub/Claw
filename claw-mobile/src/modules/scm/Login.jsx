import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, TextField, Button, Typography, Alert, InputAdornment, IconButton, Divider, CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff, Agriculture, Fingerprint } from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import api from './api';
import {
  isBiometricEnabled,
  getBiometricUsername,
  authenticateWithBiometric,
  isNativePlatform,
} from '../../shared/biometric';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioUsername, setBioUsername] = useState('');

  useEffect(() => {
    // 检查是否已启用生物认证
    const checkBio = async () => {
      const enabled = await isBiometricEnabled();
      setBioEnabled(enabled);
      if (enabled) {
        const username = await getBiometricUsername();
        setBioUsername(username || '');
      }
    };
    checkBio();
  }, []);

  const handleLogin = async () => {
    if (!form.username || !form.password) { setError('请输入用户名和密码'); return; }
    setLoading(true);
    setError('');
    try {
      // 使用 Portal 统一认证接口（支持工号/手机号/邮箱作为 identifier）
      const loginRes = await api.post('/auth/login', {
        email: form.username,
        password: form.password,
      });
      const { token, user, permissions, systemRoles } = loginRes.data;
      setAuth({
        token,
        user: {
          ...user,
          role: systemRoles?.scm || user.role,
          permissions,
          systemRoles,
        },
      });
      navigate('/scm');
    } catch (e) {
      setError(e.message || '登录失败');
    }
    setLoading(false);
  };

  const handleBiometricLogin = async () => {
    setBioLoading(true);
    setError('');
    try {
      // 1. 执行生物认证
      const success = await authenticateWithBiometric();
      if (!success) {
        setError('生物认证失败或已取消');
        setBioLoading(false);
        return;
      }

      // 2. 检查已有 token 是否仍然有效
      const existingAuth = localStorage.getItem('claw_auth');
      let existingToken = null;
      let existingUser = null;
      if (existingAuth) {
        try {
          const parsed = JSON.parse(existingAuth);
          existingToken = parsed.token;
          existingUser = parsed.user;
        } catch {}
      }

      if (existingToken && existingUser) {
        // 验证 token 是否仍然有效
        try {
          const checkRes = await api.get('/auth/me');
          if (checkRes.success) {
            navigate('/scm');
            return;
          }
        } catch {
          // token 已过期，需要重新登录
        }
      }

      // 3. token 无效 — 提示需要密码登录
      setError('登录已过期，请使用密码重新登录');
      setBioEnabled(false);
    } catch (e) {
      setError(e.message || '生物认证登录失败');
    }
    setBioLoading(false);
  };

  return (
    <Box sx={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', p: 3,
      background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
    }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Agriculture sx={{ fontSize: 56, color: 'white', mb: 1 }} />
        <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>鲜当家SCM</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>供应链管理系统</Typography>
      </Box>

      <Card sx={{ width: '100%', maxWidth: 360 }}>
        <CardContent sx={{ p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* 生物认证登录按钮 — 仅在已启用时显示 */}
          {bioEnabled && (
            <>
              <Button
                fullWidth
                variant="contained"
                size="large"
                color="primary"
                onClick={handleBiometricLogin}
                disabled={bioLoading}
                startIcon={bioLoading ? <CircularProgress size={20} color="inherit" /> : <Fingerprint />}
                sx={{ mb: 2, py: 1.5, fontSize: '1.1rem' }}
              >
                {bioLoading ? '验证中...' : '指纹/面容登录'}
              </Button>
              {bioUsername && (
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center', mb: 2 }}>
                  上次登录: {bioUsername}
                </Typography>
              )}
              <Divider sx={{ mb: 2 }}>或使用密码登录</Divider>
            </>
          )}

          <TextField
            fullWidth
            label="用户名"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            sx={{ mb: 2 }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <TextField
            fullWidth
            label="密码"
            type={showPwd ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPwd(!showPwd)} edge="end">
                    {showPwd ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </Button>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
            {isNativePlatform() ? 'App 版本 v1.0.0' : 'H5 版本'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
