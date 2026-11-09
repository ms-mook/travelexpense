import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorBanner, Field, Modal, PageHeader, Spinner, StatusBadge } from '../../components/common';
import { useAction, useAsync } from '../../hooks/useAsync';
import { tripService } from '../../services';
import { km, money, thaiDate, thisMonth, today } from '../../utils/format';

export default function TripsPage() {
  const [params, setParams] = useSearchParams();
  const [month, setMonth] = useState(thisMonth());
  const [open, setOpen] = useState(params.get('new') === '1');
  const navigate = useNavigate();
  const create = useAction();
  const { data, loading, error, reload } = useAsync(() => tripService.listRecords({ month }), [month]);

  useEffect(() => { if (params.get('new')) setParams({}, { replace: true }); }, []); // eslint-disable-line

  async function onCreate(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    const rec = await create.run(async () => {
      try {
        return await tripService.createRecord(f);
      } catch (err) {
        // มีรายการของวันนั้นอยู่แล้ว → พาไปหน้ารายการเดิม
        if (err.status === 409 && err.details?.daily_record_id) return { daily_record_id: err.details.daily_record_id };
        throw err;
      }
    });
    if (rec) navigate(`/trips/${rec.daily_record_id}${rec.status ? '?add=1' : ''}`);
  }

  return (
    <div>
      <PageHeader title="การเดินทาง" action={<button type="button" className="btn-primary" onClick={() => setOpen(true)}>+ วันใหม่</button>} />
      <input type="month" className="input mb-3" value={month} max={thisMonth()} onChange={(e) => setMonth(e.target.value)} />
      {loading && <Spinner />}
      <ErrorBanner message={error} onRetry={reload} />
      {data && !data.length && <EmptyState title="ยังไม่มีรายการในเดือนนี้">กด “+ วันใหม่” เพื่อเริ่มบันทึก</EmptyState>}
      <ul className="space-y-2">
        {data?.map((r) => (
          <li key={r.daily_record_id}>
            <Link to={`/trips/${r.daily_record_id}`} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-300 active:scale-[.99]">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                <span className="text-xl font-bold leading-none">{Number(String(r.record_date).slice(8, 10))}</span>
                <span className="text-[10px]">{new Date(`${r.record_date}T00:00:00`).toLocaleDateString('th-TH', { weekday: 'short' })}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold tabular-nums">{km(r.summary.total_km)}</p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-xs text-slate-500">{r.summary.trip_count} เที่ยว
                  {r.summary.upcountry_km > 0 && <span className="text-amber-700"> · นอก Base {km(r.summary.upcountry_km)}</span>}
                  {r.summary.expenses.total > 0 && ` · ${money(r.summary.expenses.total)}`}
                </p>
                {r.status === 'RETURNED' && r.secretary_note && <p className="mt-1 truncate text-xs text-rose-600">เหตุผล: {r.secretary_note}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <Modal open={open} title="บันทึกการเดินทางของวัน" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={onCreate}>
          <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
            1 วัน = 1 รายการ · เลือกวันที่ แล้วระบบจะพาไปเพิ่ม <b>เที่ยวเดินทาง</b> ทีละเที่ยว
            (ต้นทาง → ปลายทาง, ลูกค้า, ระยะทาง) จากนั้นค่อยใส่ค่าทางด่วน/จอดรถ
          </p>
          <Field label="วันที่เดินทาง"><input name="record_date" type="date" className="input" defaultValue={today()} max={today()} required /></Field>
          <Field label="หมายเหตุของวัน (ไม่บังคับ)" hint="เช่น ออกต่างจังหวัด 2 วัน / รถเข้าศูนย์">
            <textarea name="employee_note" rows={2} className="input" />
          </Field>
          <ErrorBanner message={create.error} />
          <button type="submit" className="btn-primary w-full" disabled={create.busy}>ถัดไป: เพิ่มเที่ยวแรก →</button>
        </form>
      </Modal>
    </div>
  );
}
