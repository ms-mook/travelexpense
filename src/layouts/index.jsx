import { Navigate, Outlet } from 'react-router-dom';
import { BottomNav, SideNav } from '../components/navigation';
import { ErrorBanner, Spinner } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABEL } from '../utils/labels';

export const HOME_BY_ROLE = {
  EMPLOYEE: '/', SECRETARY: '/secretary', MANAGEMENT: '/management', SUPER_ADMIN: '/admin'
};

/** ป้องกัน route ตาม Role (เป็นแค่ UX — Backend ตรวจสิทธิ์ซ้ำทุก API) */
export function RequireRole({ roles, children }) {
  const { session, user, loading, error, signOut } = useAuth();
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (!user) {
    return (
      <div className="mx-auto max-w-md p-6">
        <ErrorBanner message={error || 'ไม่พบข้อมูลผู้ใช้'} />
        <button type="button" className="btn-secondary mt-4 w-full" onClick={signOut}>ออกจากระบบ</button>
      </div>
    );
  }
  if (!roles.includes(user.role)) return <Navigate to={HOME_BY_ROLE[user.role] || '/login'} replace />;
  return children;
}

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <Outlet />
    </div>
  );
}

export function EmployeeLayout() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <span className="font-bold text-brand-800">Travel Expense</span>
          <span className="truncate text-sm text-slate-500">{user?.full_name}</span>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-4"><Outlet /></main>
      <BottomNav items={[
        { to: '/', label: 'หน้าหลัก', icon: 'home', end: true },
        { to: '/trips', label: 'การเดินทาง', icon: 'trips' },
        { to: '/expenses', label: 'ค่าใช้จ่าย', icon: 'expenses' },
        { to: '/profile', label: 'โปรไฟล์', icon: 'profile' }
      ]} />
    </div>
  );
}

function StaffLayout({ items }) {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white p-3 md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r md:p-4">
        <div className="mb-3 flex items-center justify-between md:block">
          <div>
            <p className="font-bold text-brand-800">Travel Expense</p>
            <p className="text-xs text-slate-500">{user?.full_name} · {ROLE_LABEL[user?.role]}</p>
          </div>
          <button type="button" className="btn-ghost px-2 py-1 text-xs md:hidden" onClick={signOut}>ออก</button>
        </div>
        <SideNav items={items} />
        <button type="button" className="btn-ghost mt-6 hidden w-full md:flex" onClick={signOut}>ออกจากระบบ</button>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6"><Outlet /></main>
    </div>
  );
}

export function SecretaryLayout() {
  const { user } = useAuth();
  const items = [
    { to: '/secretary', label: 'รอตรวจสอบ', icon: 'inbox', end: true },
    { to: '/secretary/records', label: 'ค้นหารายการ', icon: 'trips' },
    { to: '/secretary/monthly', label: 'ค่าใช้จ่ายรายเดือน', icon: 'money' },
    { to: '/secretary/audit', label: 'Audit History', icon: 'log' }
  ];
  if (user?.role === 'SUPER_ADMIN') items.push({ to: '/admin', label: 'กลับหน้า Admin', icon: 'cog' });
  return <StaffLayout items={items} />;
}

export function AdminLayout() {
  const { user } = useAuth();
  const items = [{ to: '/management', label: 'Dashboard', icon: 'chart', end: true }];
  if (user?.role === 'SUPER_ADMIN') {
    items.push(
      { to: '/admin', label: 'ผู้ใช้งาน', icon: 'users', end: true },
      { to: '/admin/bases', label: 'Base', icon: 'map' },
      { to: '/admin/policies', label: 'นโยบายเบี้ยเลี้ยง', icon: 'money' },
      { to: '/admin/settings', label: 'ตั้งค่าระบบ', icon: 'cog' },
      { to: '/admin/audit', label: 'Audit Log', icon: 'log' },
      { to: '/secretary', label: 'งานตรวจสอบ', icon: 'inbox', end: true }
    );
  }
  return <StaffLayout items={items} />;
}
