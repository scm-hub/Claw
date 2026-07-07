import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Card, CardContent, TextField, Button, Typography, Alert, Paper,
} from '@mui/material';
import HubIcon from '@mui/icons-material/Hub';
import useAuthStore from '../store/auth';
import api from '../api';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [ssoToken, setSsoToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!ssoToken.trim()) {
      setError('请输入 SSO 令牌');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/sso-login', { ssoToken: ssoToken.trim() });
      if (res.success && res.data?.token) {
        login(res.data.token, res.data.user);
        navigate('/');
      } else {
        setError(res.message || 'SSO令牌验证失败');
      }
    } catch (err) {
      setError(err.response?.data?.message || '登录请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center"
      sx={{ background: 'linear-gradient(135deg, #7B1FA2 0%, #4A148C 100%)' }}>
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 3, boxShadow: 8 }}>
          <CardContent sx={{ p: 4 }}>
            <Box display="flex" flexDirection="column" alignItems="center" gap={1} mb={3}>
              <HubIcon sx={{ fontSize: 48, color: 'primary.main' }} />
              <Typography variant="h5" fontWeight="bold">
                鲜当家主数据管理系统
              </Typography>
              <Typography variant="body2" color="text.secondary">
                请通过统一门户 SSO 登录
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TextField
              fullWidth
              label="SSO 令牌"
              multiline
              rows={3}
              value={ssoToken}
              onChange={(e) => setSsoToken(e.target.value)}
              placeholder="从统一门户获取的 SSO 令牌"
              sx={{ mb: 2 }}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleLogin}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? '登录中...' : '登录'}
            </Button>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">
                提示：请先登录统一门户 (http://192.168.21.34:5174)，点击「主数据管理」系统卡片即可自动跳转登录。
              </Typography>
            </Paper>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
