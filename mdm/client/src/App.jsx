import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/auth';
import MainLayout from './layouts/MainLayout';
import SsoAutoLogin from './components/SsoAutoLogin';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Departments from './pages/Departments';
import Employees from './pages/Employees';
import SyncLog from './pages/SyncLog';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <SsoAutoLogin>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="departments" element={<Departments />} />
        <Route path="employees" element={<Employees />} />
        <Route path="sync-log" element={<SyncLog />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </SsoAutoLogin>
  );
}
