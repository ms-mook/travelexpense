import { useEffect } from 'react';
import { STATUS_LABEL, STATUS_STYLE } from '../../utils/labels';

export function Spinner({ label = 'กำลังโหลด...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      {label}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
      <span>{message}</span>
      {onRetry && <button type="button" className="font-semibold underline" onClick={onRetry}>ลองใหม่</button>}
    </div>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status] || 'bg-slate-100'}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="card py-10 text-center text-slate-500">
      <p className="font-medium text-slate-700">{title}</p>
      {children && <div className="mt-2 text-sm">{children}</div>}
    </div>
  );
}

export function Field({ label, children, hint, error }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}

export function Modal({ open, title, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" className="btn-ghost px-2 py-1" onClick={onClose} aria-label="ปิด">✕</button>
        </div>
        {children}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/** กล่องขอเหตุผล (ใช้กับ Return / แก้ไขโดย Secretary) */
export function ReasonModal({ open, title, onClose, onConfirm, busy, error, confirmLabel = 'ยืนยัน', danger }) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onConfirm(new FormData(e.currentTarget).get('reason')); }}>
        <Field label="เหตุผล (จำเป็น)">
          <textarea name="reason" required rows={3} className="input" autoFocus />
        </Field>
        <ErrorBanner message={error} />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className={danger ? 'btn-danger' : 'btn-primary'} disabled={busy}>{confirmLabel}</button>
        </div>
      </form>
    </Modal>
  );
}

export function StatCard({ label, value, hint, tone = 'slate' }) {
  const tones = { slate: 'text-slate-900', brand: 'text-brand-700', rose: 'text-rose-600', emerald: 'text-emerald-700', amber: 'text-amber-700' };
  return (
    <div className="card">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
