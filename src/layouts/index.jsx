import { useState } from 'react';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { BottomNav, ICONS } from '../components/navigation';
import { ErrorBanner, Modal, Spinner } from '../components/common';
import { ChangePassword } from '../pages/employee/ProfilePage';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABEL } from '../utils/labels';
import { useQuickRecord } from '../hooks/useQuickRecord';

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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-100 via-slate-50 to-slate-100 p-4">
      <Outlet />
    </div>
  );
}

export function EmployeeLayout() {
  const { user } = useAuth();
  const quick = useQuickRecord();
  const initials = String(user?.full_name || '?').trim().slice(0, 1).toUpperCase();
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-28">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2.5">
          <span className="flex items-center gap-2 font-bold text-brand-800"><img src="/icon.svg" alt="" className="h-7 w-7" />Travel Expense</span>
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <span className="hidden max-w-[9rem] truncate sm:inline">{user?.full_name}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{initials}</span>
          </span>
        </div>
      </header>
      {quick.error && <div className="mx-auto max-w-lg px-4 pt-3"><ErrorBanner message={quick.error} /></div>}
      <main className="mx-auto max-w-lg px-4 py-4"><Outlet /></main>
      <BottomNav onFab={quick.start} fabBusy={quick.busy} items={[
        { to: '/', label: 'หน้าหลัก', icon: 'home', end: true },
        { to: '/trips', label: 'การเดินทาง', icon: 'trips' },
        { to: '/expenses', label: 'ค่าใช้จ่าย', icon: 'expenses' },
        { to: '/profile', label: 'โปรไฟล์', icon: 'profile' }
      ]} />
    </div>
  );
}

/** แถบเมนูข้างโทนเข้ม (Secretary / Management / Admin) — มือถือเปิดเป็น drawer */
function StaffLayout({ groups }) {
  const { user, signOut } = useAuth();
  const [pwOpen, setPwOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const initials = String(user?.full_name || '?').trim().slice(0, 1).toUpperCase();

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-2 pb-6 pt-1">
        <img src="/icon.svg" alt="" className="h-9 w-9 rounded-xl ring-1 ring-white/20" />
        <div>
          <p className="font-bold leading-tight text-white">Travel Expense</p>
          <p className="text-[11px] text-brand-200/80">Service Engineer · Thailand</p>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{g.title}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <li key={it.to}>
                  <NavLink to={it.to} end={it.end} onClick={() => setDrawer(false)}
                    className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${isActive
                      ? 'bg-white/10 font-semibold text-white shadow-inner ring-1 ring-white/10'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                    <NavIcon d={ICONS[it.icon]} />
                    {it.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-4 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 font-bold text-white">{initials}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user?.full_name}</p>
            <p className="text-[11px] text-slate-400">{ROLE_LABEL[user?.role]}{user?.username ? ` · @${user.username}` : ''}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="rounded-lg bg-white/10 px-2 py-1.5 text-xs text-slate-200 hover:bg-white/15" onClick={() => setPwOpen(true)}>เปลี่ยนรหัสผ่าน</button>
          <button type="button" className="rounded-lg bg-white/10 px-2 py-1.5 text-xs text-slate-200 hover:bg-rose-500/80" onClick={signOut}>ออกจากระบบ</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="hidden bg-gradient-to-b from-slate-900 via-slate-900 to-brand-900 p-4 md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0">{nav}</aside>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-slate-900 px-4 py-3 text-white md:hidden">
        <button type="button" aria-label="เปิดเมนู" className="rounded-lg p-1.5 hover:bg-white/10" onClick={() => setDrawer(true)}>
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <span className="font-bold">Travel Expense</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold">{initials}</span>
      </header>
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-slate-900/50" />
          <aside className="absolute inset-y-0 left-0 w-72 bg-gradient-to-b from-slate-900 to-brand-900 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>{nav}</aside>
        </div>
      )}

      <main className="min-w-0 flex-1 p-4 md:p-8"><div className="mx-auto max-w-7xl"><Outlet /></div></main>
      <Modal open={pwOpen} title="เปลี่ยนรหัสผ่าน" onClose={() => setPwOpen(false)}><ChangePassword /></Modal>
    </div>
  );
}

const NavIcon = ({ d }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export function SecretaryLayout() {
  const { user } = useAuth();
  const groups = [{
    title: 'งานตรวจสอบ',
    items: [
      { to: '/secretary', label: 'รอตรวจสอบ', icon: 'inbox', end: true },
      { to: '/secretary/records', label: 'ค้นหารายการ', icon: 'trips' },
      { to: '/secretary/monthly', label: 'ค่าใช้จ่ายรายเดือน', icon: 'money' },
      { to: '/secretary/monitor', label: 'Monitor รายวัน', icon: 'pin' },
      { to: '/secretary/audit', label: 'Audit History', icon: 'log' }
    ]
  }];
  if (user?.role === 'SUPER_ADMIN') groups.push({ title: 'ผู้ดูแลระบบ', items: [{ to: '/admin', label: 'กลับหน้า Admin', icon: 'cog', end: true }] });
  return <StaffLayout groups={groups} />;
}

export function AdminLayout() {
  const { user } = useAuth();
  const groups = [{
    title: 'ภาพรวม',
    items: [
      { to: '/management', label: 'Dashboard', icon: 'chart', end: true },
      { to: '/management/monitor', label: 'Monitor รายวัน', icon: 'pin' }
    ]
  }];
  if (user?.role === 'SUPER_ADMIN') {
    groups.push(
      { title: 'งานตรวจสอบ', items: [{ to: '/secretary', label: 'รายการรอตรวจ', icon: 'inbox', end: true }] },
      {
        title: 'ผู้ดูแลระบบ',
        items: [
          { to: '/admin', label: 'ผู้ใช้งาน', icon: 'users', end: true },
          { to: '/admin/bases', label: 'Base', icon: 'map' },
          { to: '/admin/policies', label: 'นโยบายเบี้ยเลี้ยง', icon: 'money' },
          { to: '/admin/settings', label: 'ตั้งค่าระบบ', icon: 'cog' },
          { to: '/admin/audit', label: 'Audit Log', icon: 'log' }
        ]
      }
    );
  }
  return <StaffLayout groups={groups} />;
}
