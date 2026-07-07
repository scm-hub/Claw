import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import MobileLayout from './components/MobileLayout';
import Inventory from './pages/Inventory';
import SalesOrders from './pages/SalesOrders';
import SalesPlans from './pages/SalesPlans';
import PurchaseOrders from './pages/PurchaseOrders';
import Receivables from './pages/Receivables';
import Payables from './pages/Payables';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import ScanInbound from './pages/ScanInbound';
import StockTake from './pages/StockTake';
import ApprovalCenter from './pages/ApprovalCenter';

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><MobileLayout /></ProtectedRoute>}>
        {/* 通用页面 */}
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="settings" element={<Settings />} />
        
        {/* 销售相关 */}
        <Route path="sales-orders" element={<SalesOrders />} />
        <Route path="sales-plans" element={<SalesPlans />} />
        <Route path="receivables" element={<Receivables />} />
        
        {/* 采购相关 */}
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="payables" element={<Payables />} />
        
        {/* 仓储相关 */}
        <Route path="scan-inbound" element={<ScanInbound />} />
        <Route path="stock-take" element={<StockTake />} />
        
        {/* 管理相关 */}
        <Route path="approval-center" element={<ApprovalCenter />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
