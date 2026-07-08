import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import UnifiedLayout from './shared/UnifiedLayout';
import useAuthStore from './store/authStore';

// 登录页
const Login = lazy(() => import('./modules/portal/Login'));

// 各模块首页（懒加载）
const Workbench = lazy(() => import('./modules/portal/Workbench'));
const Profile = lazy(() => import('./modules/portal/Profile'));
const SCMHome = lazy(() => import('./modules/scm/SCMHome'));
const HRHome = lazy(() => import('./modules/hrms/HRHome'));
const AIHome = lazy(() => import('./modules/ai/AIHome'));

function Loading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}

function ProtectedRoute({ children }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  if (!isAuth) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* 登录 */}
        <Route path="/login" element={<Login />} />

        {/* 主布局（需登录） */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <UnifiedLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/workbench" replace />} />
          <Route path="workbench" element={<Workbench />} />
          <Route path="scm/*" element={<SCMHome />} />
          <Route path="hrms/*" element={<HRHome />} />
          <Route path="ai/*" element={<AIHome />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/workbench" replace />} />
      </Routes>
    </Suspense>
  );
}
