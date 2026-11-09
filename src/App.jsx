import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout, AuthLayout, EmployeeLayout, RequireRole, SecretaryLayout } from './layouts';
import LoginPage from './pages/auth/LoginPage';
import HomePage from './pages/employee/HomePage';
import TripsPage from './pages/employee/TripsPage';
import RecordDetailPage from './pages/employee/RecordDetailPage';
import MonthlyExpensePage from './pages/employee/MonthlyExpensePage';
import ProfilePage from './pages/employee/ProfilePage';
import RecordsPage from './pages/secretary/RecordsPage';
import ReviewPage from './pages/secretary/ReviewPage';
import MonthlyReviewPage from './pages/secretary/MonthlyReviewPage';
import AuditPage from './pages/secretary/AuditPage';
import DashboardPage from './pages/management/DashboardPage';
import UsersPage from './pages/admin/UsersPage';
import BasesPage from './pages/admin/BasesPage';
import PoliciesPage from './pages/admin/PoliciesPage';
import SettingsPage from './pages/admin/SettingsPage';
import MonitorPage from './pages/monitor/MonitorPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<RequireRole roles={['EMPLOYEE']}><EmployeeLayout /></RequireRole>}>
        <Route index element={<HomePage />} />
        <Route path="trips" element={<TripsPage />} />
        <Route path="trips/:id" element={<RecordDetailPage />} />
        <Route path="expenses" element={<MonthlyExpensePage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="secretary" element={<RequireRole roles={['SECRETARY', 'SUPER_ADMIN']}><SecretaryLayout /></RequireRole>}>
        <Route index element={<RecordsPage mode="pending" />} />
        <Route path="records" element={<RecordsPage mode="all" />} />
        <Route path="review/:id" element={<ReviewPage />} />
        <Route path="monthly" element={<MonthlyReviewPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="monitor" element={<MonitorPage />} />
      </Route>

      <Route element={<RequireRole roles={['MANAGEMENT', 'SUPER_ADMIN']}><AdminLayout /></RequireRole>}>
        <Route path="management" element={<DashboardPage />} />
        <Route path="management/monitor" element={<MonitorPage />} />
      </Route>

      <Route path="admin" element={<RequireRole roles={['SUPER_ADMIN']}><AdminLayout /></RequireRole>}>
        <Route index element={<UsersPage />} />
        <Route path="bases" element={<BasesPage />} />
        <Route path="policies" element={<PoliciesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="audit" element={<AuditPage admin />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
