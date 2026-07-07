import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import SsoAutoLogin from './components/SsoAutoLogin';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeDetail from './pages/employees/EmployeeDetail';
import EmployeeForm from './pages/employees/EmployeeForm';
import OnboardingManagement from './pages/employees/OnboardingManagement';
import AttendanceClock from './pages/attendance/AttendanceClock';
import AttendanceRecords from './pages/attendance/AttendanceRecords';
import AttendanceSummary from './pages/attendance/AttendanceSummary';
import LeaveApply from './pages/leaves/LeaveApply';
import LeaveApproval from './pages/leaves/LeaveApproval';
import LeaveBalance from './pages/leaves/LeaveBalance';
import SalaryOverview from './pages/salary/SalaryOverview';
import SalarySlip from './pages/salary/SalarySlip';
import SalaryManage from './pages/payroll/SalaryManage';
import SalaryCalc from './pages/payroll/SalaryCalc';
import JobList from './pages/recruitment/JobList';
import CandidateList from './pages/recruitment/CandidateList';
import PerformanceReview from './pages/performance/PerformanceReview';
import DepartmentTree from './pages/departments/DepartmentTree';
import PositionList from './pages/positions/PositionList';
import ContractList from './pages/contracts/ContractList';
import TrainingList from './pages/training/TrainingList';
import Reports from './pages/reports/Reports';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <SsoAutoLogin>
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="employees" element={<EmployeeList />} />
        <Route path="employees/new" element={<EmployeeForm />} />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        <Route path="employees/:id/edit" element={<EmployeeForm />} />
        <Route path="employees/onboarding" element={<OnboardingManagement />} />
        <Route path="attendance" element={<AttendanceClock />} />
        <Route path="attendance/records" element={<AttendanceRecords />} />
        <Route path="attendance/summary" element={<AttendanceSummary />} />
        <Route path="leaves/apply" element={<LeaveApply />} />
        <Route path="leaves/approval" element={<LeaveApproval />} />
        <Route path="leaves/balance" element={<LeaveBalance />} />
        <Route path="salary" element={<SalaryOverview />} />
        <Route path="salary/my" element={<SalarySlip />} />
        <Route path="payroll" element={<SalaryManage />} />
        <Route path="payroll/calc" element={<SalaryCalc />} />
        <Route path="recruitment" element={<JobList />} />
        <Route path="recruitment/:id/candidates" element={<CandidateList />} />
        <Route path="performance" element={<PerformanceReview />} />
        <Route path="contracts" element={<ContractList />} />
        <Route path="training" element={<TrainingList />} />
        <Route path="departments" element={<DepartmentTree />} />
        <Route path="positions" element={<PositionList />} />
        <Route path="reports" element={<Reports />} />
      </Route>
    </Routes>
    </SsoAutoLogin>
  );
}
