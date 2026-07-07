import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import useAuthStore from './store/auth.js';
import SsoAutoLogin from './components/SsoAutoLogin.jsx';
import Login from './pages/Login.jsx';
import MainLayout from './pages/MainLayout.jsx';
import ChatAssistant from './pages/ChatAssistant.jsx';
import OrderAssistant from './pages/OrderAssistant.jsx';
import Analytics from './pages/Analytics.jsx';
import Prediction from './pages/Prediction.jsx';

// ErrorBoundary — 防止组件崩溃导致白屏
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('AI Service ErrorBoundary:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" bgcolor="#f5f5f5" gap={2} p={3}>
          <Typography variant="h6" color="error">页面加载出错</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
            {this.state.error?.message || '未知错误'}
          </Typography>
          <Button variant="contained" onClick={() => {
            localStorage.removeItem('ai_token');
            localStorage.removeItem('ai_user');
            window.location.reload();
          }}>重新加载</Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { token } = useAuthStore();

  return (
    <ErrorBoundary>
      {/* /login 路由必须在 SsoAutoLogin 外面，否则失败后会循环 */}
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* 其他路由用 SsoAutoLogin 包裹（自动检测 URL 中的 sso_token） */}
        <Route path="/*" element={
          <SsoAutoLogin>
            {!token ? (
              <Navigate to="/login" replace />
            ) : (
              <Routes>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<ChatAssistant />} />
                  <Route path="order-assistant" element={<OrderAssistant />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="prediction" element={<Prediction />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            )}
          </SsoAutoLogin>
        } />
      </Routes>
    </ErrorBoundary>
  );
}
