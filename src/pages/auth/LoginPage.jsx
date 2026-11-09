import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ErrorBanner, Field } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { HOME_BY_ROLE } from '../../layouts';

export default function LoginPage() {
  const { session, user, signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (session && user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      await signIn(f.get('username'), f.get('password'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <img src="/icon.svg" alt="" className="mx-auto mb-3 h-20 w-20 rounded-3xl shadow-lg shadow-brand-900/20" />
        <h1 className="text-2xl font-bold tracking-tight text-brand-900">Travel Expense</h1>
        <p className="text-sm text-slate-500">บันทึกการเดินทางและค่าใช้จ่าย Service Engineer</p>
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white/90 p-6 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 backdrop-blur">
        <Field label="Username"><input name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="input" required /></Field>
        <Field label="รหัสผ่าน"><input name="password" type="password" autoComplete="current-password" className="input" required /></Field>
        <ErrorBanner message={error} />
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</button>
        <p className="text-center text-xs text-slate-400">ลืมรหัสผ่าน? ติดต่อผู้ดูแลระบบเพื่อรีเซ็ต</p>
      </form>
    </div>
  );
}
