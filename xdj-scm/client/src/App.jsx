import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import SsoAutoLogin from './components/SsoAutoLogin';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/dashboard/Dashboard';

// 基础数据管理
import MaterialGradeList from './pages/master/MaterialGradeList';
import MaterialGroupList from './pages/master/MaterialGroupList';
import MaterialList from './pages/master/MaterialList';
import CustomerList from './pages/master/CustomerList';
import SupplierList from './pages/master/SupplierList';
import WarehouseList from './pages/master/WarehouseList';
import AddressList from './pages/master/AddressList';
import EmployeeList from './pages/master/EmployeeList';
import DepartmentList from './pages/master/DepartmentList';
import PurchaserAssignment from './pages/master/PurchaserAssignment';
import PrintTemplateList from './pages/master/PrintTemplateList';
import VehicleTypeList from './pages/master/VehicleTypeList';

// 采购管理
import PurchasePlanList from './pages/purchase/PurchasePlanList';
import PurchaseOrderList from './pages/purchase/PurchaseOrderList';
import ReceiptList from './pages/purchase/ReceiptList';

// WMS仓储管理
import ZoneLocationList from './pages/wms/ZoneLocationList';
import StockMovementList from './pages/wms/StockMovementList';
import StockTakeList from './pages/wms/StockTakeList';
import InventoryList from './pages/wms/InventoryList';

// 批次追溯
import BatchList from './pages/traceability/BatchList';
import BatchTrace from './pages/traceability/BatchTrace';
import RecallList from './pages/traceability/RecallList';
import StockAgeAnalysis from './pages/traceability/StockAgeAnalysis';

// 销售管理
import SalesPlanList from './pages/sales/SalesPlanList';
import SalesOrderList from './pages/sales/SalesOrderList';
import PriceListPage from './pages/sales/PriceListPage';
import CreditManagement from './pages/sales/CreditManagement';
import DemandAggregation from './pages/sales/DemandAggregation';

// 财务结算
import ReceivableList from './pages/finance/ReceivableList';
import PayableList from './pages/finance/PayableList';
import InvoiceList from './pages/finance/InvoiceList';
import PaymentList from './pages/finance/PaymentList';

// 成本引擎
import CostConfigList from './pages/cost/CostConfigList';
import StandardCostList from './pages/cost/StandardCostList';

// 物流管理
import LogisticsProviderList from './pages/logistics/LogisticsProviderList';
import WaybillList from './pages/logistics/WaybillList';
import DeliveryRouteList from './pages/logistics/DeliveryRouteList';
import ShippingOrderList from './pages/logistics/ShippingOrderList';

// 冷链监控
import TemperatureDashboard from './pages/coldchain/TemperatureDashboard';
import SensorList from './pages/coldchain/SensorList';

// 其他模块
import BarcodeScan from './pages/BarcodeScan';
import ContractList from './pages/ContractList';
import AfterSalesList from './pages/AfterSalesList';
import ApprovalList from './pages/ApprovalList';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import AlertList from './pages/AlertList';
import SupplierEvalList from './pages/SupplierEvalList';

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <SsoAutoLogin>
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />

        {/* 基础数据 */}
        <Route path="master/material-grades" element={<MaterialGradeList />} />
        <Route path="master/material-groups" element={<MaterialGroupList />} />
        <Route path="master/materials" element={<MaterialList />} />
        <Route path="master/customers" element={<CustomerList />} />
        <Route path="master/suppliers" element={<SupplierList />} />
        <Route path="master/warehouses" element={<WarehouseList />} />
        <Route path="master/employees" element={<EmployeeList />} />
        <Route path="master/departments" element={<DepartmentList />} />
        <Route path="master/purchaser-assignments" element={<PurchaserAssignment />} />
        <Route path="master/providers" element={<LogisticsProviderList />} />
        <Route path="master/print-templates" element={<PrintTemplateList />} />
        <Route path="master/vehicle-types" element={<VehicleTypeList />} />

        {/* 采购管理 */}
        <Route path="purchase/plans" element={<PurchasePlanList />} />
        <Route path="purchase/orders" element={<PurchaseOrderList />} />
        <Route path="purchase/receipts" element={<ReceiptList />} />

        {/* 销售管理 */}
        <Route path="sales/plans" element={<SalesPlanList />} />
        <Route path="sales/orders" element={<SalesOrderList />} />
        <Route path="sales/prices" element={<PriceListPage />} />
        <Route path="sales/credit" element={<CreditManagement />} />
        <Route path="sales/demand-aggregation" element={<DemandAggregation />} />

        {/* 仓储WMS */}
        <Route path="wms/inventory" element={<InventoryList />} />
        <Route path="wms/zones" element={<ZoneLocationList />} />
        <Route path="wms/movements" element={<StockMovementList />} />
        <Route path="wms/stock-takes" element={<StockTakeList />} />

        {/* 批次追溯 */}
        <Route path="traceability/batches" element={<BatchList />} />
        <Route path="traceability/trace" element={<BatchTrace />} />
        <Route path="traceability/recall" element={<RecallList />} />
        <Route path="traceability/stock-age" element={<StockAgeAnalysis />} />

        {/* 财务结算 */}
        <Route path="finance/receivable" element={<ReceivableList />} />
        <Route path="finance/payable" element={<PayableList />} />
        <Route path="finance/invoices" element={<InvoiceList />} />
        <Route path="finance/payments" element={<PaymentList />} />

        {/* 成本引擎 */}
        <Route path="cost/config" element={<CostConfigList />} />
        <Route path="cost/standard" element={<StandardCostList />} />

        {/* 物流管理 */}
        <Route path="logistics/waybills" element={<WaybillList />} />
        <Route path="logistics/routes" element={<DeliveryRouteList />} />
        <Route path="logistics/shipping-orders" element={<ShippingOrderList />} />

        {/* 冷链监控 */}
        <Route path="coldchain/dashboard" element={<TemperatureDashboard />} />
        <Route path="coldchain/sensors" element={<SensorList />} />

        {/* 其他模块 */}
        <Route path="barcode" element={<BarcodeScan />} />
        <Route path="contract" element={<ContractList />} />
        <Route path="aftersales" element={<AfterSalesList />} />
        <Route path="approval" element={<ApprovalList />} />
        <Route path="analytics" element={<AnalyticsDashboard />} />
        <Route path="alert" element={<AlertList />} />
        <Route path="supplier-eval" element={<SupplierEvalList />} />

        {/* 系统设置 — 用户管理已迁移到统一平台 Portal */}
        <Route path="settings/users" element={<Navigate to="/" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </SsoAutoLogin>
  );
}
