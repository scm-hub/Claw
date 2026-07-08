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
const AIHome = lazy(() => import('./modules/ai/AIHome'));

// HRMS 页面
const HRDashboard = lazy(() => import('./modules/hrms/HRDashboard'));
const HRAttendance = lazy(() => import('./modules/hrms/Attendance'));
const HRLeaves = lazy(() => import('./modules/hrms/Leaves'));
const HRSalary = lazy(() => import('./modules/hrms/Salary'));
const HREmployees = lazy(() => import('./modules/hrms/Employees'));

// SCM 模块布局壳（含 AppBar + 底部导航）
const SCMMobileLayout = lazy(() => import('./modules/scm/MobileLayout'));

// SCM 页面（懒加载）
const SCMDashboard = lazy(() => import('./modules/scm/Dashboard'));
const SCMInventory = lazy(() => import('./modules/scm/Inventory'));
const SCMSalesOrders = lazy(() => import('./modules/scm/SalesOrders'));
const SCMSalesPlans = lazy(() => import('./modules/scm/SalesPlans'));
const SCMPurchaseOrders = lazy(() => import('./modules/scm/PurchaseOrders'));
const SCMReceivables = lazy(() => import('./modules/scm/Receivables'));
const SCMPayables = lazy(() => import('./modules/scm/Payables'));
const SCMScanInbound = lazy(() => import('./modules/scm/ScanInbound'));
const SCMStockTake = lazy(() => import('./modules/scm/StockTake'));
const SCMApprovalCenter = lazy(() => import('./modules/scm/ApprovalCenter'));
const SCMSettings = lazy(() => import('./modules/scm/Settings'));

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
          <Route path="profile" element={<Profile />} />

          {/* SCM 模块（使用 SCM 自带的 MobileLayout 布局壳） */}
          <Route path="scm" element={<SCMMobileLayout />}>
            <Route index element={<SCMDashboard />} />
            <Route path="dashboard" element={<SCMDashboard />} />
            <Route path="inventory" element={<SCMInventory />} />
            <Route path="sales-orders" element={<SCMSalesOrders />} />
            <Route path="sales-plans" element={<SCMSalesPlans />} />
            <Route path="purchase-orders" element={<SCMPurchaseOrders />} />
            <Route path="receivables" element={<SCMReceivables />} />
            <Route path="payables" element={<SCMPayables />} />
            <Route path="scan-inbound" element={<SCMScanInbound />} />
            <Route path="stock-take" element={<SCMStockTake />} />
            <Route path="approval-center" element={<SCMApprovalCenter />} />
            <Route path="settings" element={<SCMSettings />} />
          </Route>

          <Route path="hrms" element={<HRDashboard />} />
          <Route path="hrms/attendance" element={<HRAttendance />} />
          <Route path="hrms/leaves" element={<HRLeaves />} />
          <Route path="hrms/salary" element={<HRSalary />} />
          <Route path="hrms/employees" element={<HREmployees />} />
          <Route path="ai/*" element={<AIHome />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/workbench" replace />} />
      </Routes>
    </Suspense>
  );
}
