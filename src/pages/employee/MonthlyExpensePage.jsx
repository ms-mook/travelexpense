import { useMemo, useState } from 'react';
import { ErrorBanner, Field, PageHeader, Spinner, StatusBadge } from '../../components/common';
import { useAction, useAsync } from '../../hooks/useAsync';
import { expenseService } from '../../services';
import { money, thaiMonth, thisMonth } from '../../utils/format';

const FIELDS = [
  ['fuel_cost', 'ค่าน้ำมัน (Fuel)'],
  ['maintenance_cost', 'ค่าบำรุงรักษา (Maintenance)'],
  ['vehicle_wear_cost', 'ค่าเสื่อม/สึกหรอ (Vehicle Wear)'],
  ['other_cost', 'ค่าใช้จ่ายอื่น (Other)']
];

export default function MonthlyExpensePage() {
  const [month, setMonth] = useState(thisMonth());
  const { data, loading, error, reload } = useAsync(() => expenseService.listMonthly(), []);
  const act = useAction();
  const current = useMemo(() => data?.find((m) => m.month === month), [data, month]);
  const editable = !current || ['DRAFT', 'RETURNED'].includes(current.status);
  const [values, setValues] = useState({});
  const v = (k) => values[`${month}:${k}`] ?? current?.[k] ?? '';
  const total = FIELDS.reduce((s, [k]) => s + (Number(v(k)) || 0), 0);

  async function save(submit) {
    const body = { month, note: v('note') };
    for (const [k] of FIELDS) body[k] = Number(v(k)) || 0;
    if (current) body.updated_at = current.updated_at;
    const saved = await act.run(() => expenseService.saveMonthly(body));
    if (!saved) return; // เก็บค่าที่กรอกไว้ให้แก้ต่อ
    if (submit) await act.run(() => expenseService.submitMonthly(saved.monthly_actual_id));
    setValues({});
    reload();
  }

  return (
    <div className="space-y-3">
      <PageHeader title="ค่าใช้จ่ายจริงรายเดือน" subtitle="กรอกสรุปเมื่อสิ้นเดือน — ไม่รวมค่าทางด่วน/จอดรถที่บันทึกรายเที่ยวแล้ว" />
      <input type="month" className="input" value={month} max={thisMonth()} onChange={(e) => setMonth(e.target.value)} />
      {loading && <Spinner />}
      <ErrorBanner message={error || act.error} onRetry={error ? reload : undefined} />
      {data && (
        <form className="card space-y-3" onSubmit={(e) => { e.preventDefault(); save(false); }}>
          <div className="flex items-center justify-between">
            <p className="font-semibold">{thaiMonth(month)}</p>
            {current && <StatusBadge status={current.status} />}
          </div>
          {current?.status === 'RETURNED' && current.secretary_note && (
            <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">ส่งกลับ: {current.secretary_note}</p>
          )}
          {FIELDS.map(([k, label]) => (
            <Field key={k} label={label}>
              <input type="number" inputMode="decimal" step="0.01" min="0" className="input" disabled={!editable}
                value={v(k)} onChange={(e) => setValues((s) => ({ ...s, [`${month}:${k}`]: e.target.value }))} />
            </Field>
          ))}
          <Field label="หมายเหตุ">
            <textarea rows={2} className="input" disabled={!editable} value={v('note')}
              onChange={(e) => setValues((s) => ({ ...s, [`${month}:note`]: e.target.value }))} />
          </Field>
          <div className="flex items-center justify-between rounded-xl bg-brand-50 p-3">
            <span className="text-sm text-brand-800">Actual Total</span>
            <span className="text-lg font-bold text-brand-800">{money(total)}</span>
          </div>
          {editable && (
            <div className="grid grid-cols-2 gap-2">
              <button type="submit" className="btn-secondary" disabled={act.busy}>บันทึกร่าง</button>
              <button type="button" className="btn-primary" disabled={act.busy}
                onClick={() => window.confirm('ส่งค่าใช้จ่ายเดือนนี้ให้ตรวจสอบ?') && save(true)}>ส่งตรวจสอบ</button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
