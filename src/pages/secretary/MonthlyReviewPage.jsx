import { useState } from 'react';
import { EmptyState, ErrorBanner, Field, Modal, PageHeader, ReasonModal, Spinner, StatusBadge } from '../../components/common';
import { useAction, useAsync } from '../../hooks/useAsync';
import { secretaryService } from '../../services';
import { money, thaiMonth, thisMonth } from '../../utils/format';
import { STATUS_LABEL } from '../../utils/labels';

const COSTS = [['fuel_cost', 'น้ำมัน'], ['maintenance_cost', 'บำรุงรักษา'], ['vehicle_wear_cost', 'สึกหรอ'], ['other_cost', 'อื่น ๆ']];

export default function MonthlyReviewPage() {
  const [month, setMonth] = useState(thisMonth());
  const [status, setStatus] = useState('SUBMITTED');
  const { data, loading, error, reload } = useAsync(() => secretaryService.monthly({ month, status }), [month, status]);
  const [edit, setEdit] = useState(null);
  const [ret, setRet] = useState(null);
  const act = useAction();
  const done = () => { setEdit(null); setRet(null); reload(); };

  return (
    <div>
      <PageHeader title="ค่าใช้จ่ายจริงรายเดือน" subtitle={thaiMonth(month)} />
      <div className="card mb-3 flex flex-wrap gap-2">
        <input type="month" className="input w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">ทุกสถานะ</option>
          {['SUBMITTED', 'RETURNED', 'VERIFIED'].map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      {loading && <Spinner />}
      <ErrorBanner message={error || (!edit && !ret ? act.error : '')} onRetry={error ? reload : undefined} />
      {data && !data.length && <EmptyState title="ไม่มีรายการ" />}
      {data?.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="table-base">
            <thead><tr><th>พนักงาน</th>{COSTS.map(([, l]) => <th key={l} className="text-right">{l}</th>)}<th className="text-right">รวม</th><th>สถานะ</th><th /></tr></thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.monthly_actual_id}>
                  <td>{m.employee_name}{m.note && <p className="text-xs text-slate-500">{m.note}</p>}</td>
                  {COSTS.map(([k]) => <td key={k} className="text-right tabular-nums">{money(m[k])}</td>)}
                  <td className="text-right font-semibold tabular-nums">{money(m.actual_total)}</td>
                  <td><StatusBadge status={m.status} /></td>
                  <td className="whitespace-nowrap">
                    {['SUBMITTED', 'VERIFIED'].includes(m.status) && <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => { act.setError(''); setEdit(m); }}>แก้ไข</button>}
                    {m.status === 'SUBMITTED' && (
                      <>
                        <button type="button" className="btn-ghost px-2 py-1 text-xs text-rose-600" onClick={() => { act.setError(''); setRet(m); }}>ส่งกลับ</button>
                        <button type="button" className="btn-primary px-2 py-1 text-xs" disabled={act.busy}
                          onClick={async () => { if (await act.run(() => secretaryService.verifyMonthly(m.monthly_actual_id))) done(); }}>ยืนยัน</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(edit)} title={`แก้ไข — ${edit?.employee_name || ''}`} onClose={() => setEdit(null)}>
        {edit && (
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const body = Object.fromEntries(new FormData(e.currentTarget).entries());
            if (await act.run(() => secretaryService.editMonthly(edit.monthly_actual_id, body))) done();
          }}>
            <div className="grid grid-cols-2 gap-3">
              {COSTS.map(([k, l]) => <Field key={k} label={l}><input name={k} type="number" step="0.01" min="0" className="input" defaultValue={edit[k]} /></Field>)}
            </div>
            <Field label="เหตุผล (จำเป็น)"><textarea name="reason" rows={2} required className="input" /></Field>
            <ErrorBanner message={act.error} />
            <button type="submit" className="btn-primary w-full" disabled={act.busy}>บันทึก</button>
          </form>
        )}
      </Modal>
      <ReasonModal open={Boolean(ret)} title="ส่งกลับแก้ไข" danger confirmLabel="ส่งกลับ" busy={act.busy} error={act.error}
        onClose={() => setRet(null)}
        onConfirm={async (reason) => { if (await act.run(() => secretaryService.returnMonthly(ret.monthly_actual_id, reason))) done(); }} />
    </div>
  );
}
