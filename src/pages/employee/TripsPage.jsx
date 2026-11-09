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
    if (rec) navigate(`/trips/${rec.daily_record_id}`);
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
            <Link to={`/trips/${r.daily_record_id}`} className="card flex items-center justify-between gap-3 hover:ring-brand-300">
              <div>
                <p className="font-semibold">{thaiDate(r.record_date)}</p>
                <p className="text-sm text-slate-500">{r.summary.trip_count} เที่ยว · {km(r.summary.total_km)} · {money(r.summary.expenses.total)}</p>
                {r.status === 'RETURNED' && r.secretary_note && <p className="mt-1 text-xs text-rose-600">เหตุผล: {r.secretary_note}</p>}
              </div>
              <StatusBadge status={r.status} />
            </Link>
          </li>
        ))}
      </ul>

      <Modal open={open} title="เพิ่มรายการประจำวัน" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={onCreate}>
          <Field label="วันที่"><input name="record_date" type="date" className="input" defaultValue={today()} max={today()} required /></Field>
          <Field label="หมายเหตุ"><textarea name="employee_note" rows={2} className="input" /></Field>
          <ErrorBanner message={create.error} />
          <button type="submit" className="btn-primary w-full" disabled={create.busy}>สร้างรายการ</button>
        </form>
      </Modal>
    </div>
  );
}
