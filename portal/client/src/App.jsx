import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MainLayout from './layouts/MainLayout';
import SystemManage from './pages/admin/SystemManage';
import AccessManage from './pages/admin/AccessManage';
import RoleManage from './pages/admin/RoleManage';
import OperationLogs from './pages/admin/OperationLogs';
import PendingTasks from './pages/workflow/PendingTasks';
import MyFlows from './pages/workflow/MyFlows';
import DoneTasks from './pages/workflow/DoneTasks';
import FlowTemplates from './pages/workflow/FlowTemplates';
import MobileLayoutConfig from './pages/admin/MobileLayoutConfig';
import useAuthStore from './store/auth';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuthStore();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const { checkAuth, token } = useAuthStore();

  useEffect(() => {
    if (token) {
      checkAuth();
    }
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/systems"
        element={
          <AdminRoute>
            <MainLayout>
              <SystemManage />
            </MainLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/access/users"
        element={
          <AdminRoute>
            <MainLayout>
              <AccessManage />
            </MainLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/access/roles"
        element={
          <AdminRoute>
            <MainLayout>
              <RoleManage />
            </MainLayout>
          </AdminRoute>
        }
      />
      {/* 工作台 — 审批相关 */}
      <Route
        path="/workflow/pending"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PendingTasks />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workflow/my-flows"
        element={
          <ProtectedRoute>
            <MainLayout>
              <MyFlows />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workflow/done"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DoneTasks />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* 流程模板管理 — 管理员 */}
      <Route
        path="/workflow/templates"
        element={
          <AdminRoute>
            <MainLayout>
              <FlowTemplates />
            </MainLayout>
          </AdminRoute>
        }
      />
      {/* 移动端布局配置 — 管理员 */}
      <Route
        path="/admin/mobile-layout"
        element={
          <AdminRoute>
            <MainLayout>
              <MobileLayoutConfig />
            </MainLayout>
          </AdminRoute>
        }
      />
      {/* 兼容旧路由 */}
      <Route path="/admin/roles" element={<Navigate to="/admin/access/roles" replace />} />
      <Route path="/admin/access" element={<Navigate to="/admin/access/users" replace />} />
      <Route
        path="/admin/logs"
        element={
          <AdminRoute>
            <MainLayout>
              <OperationLogs />
            </MainLayout>
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
