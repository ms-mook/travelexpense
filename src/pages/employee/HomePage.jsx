import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBanner, Spinner, StatCard } from '../../components/common';
import { useAsync } from '../../hooks/useAsync';
import { tripService } from '../../services';
import { km, money, thaiMonth, thisMonth } from '../../utils/format';
import { STATUS_LABEL } from '../../utils/labels';

export default function HomePage() {
  const [month, setMonth] = useState(thisMonth());
  const { data, loading, error, reload } = useAsync(() => tripService.overview(month), [month]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">สรุป{thaiMonth(month)}</h1>
        <input type="month" className="input w-auto" value={month} max={thisMonth()} onChange={(e) => setMonth(e.target.value)} />
      </div>
      {loading && <Spinner />}
      <ErrorBanner message={error} onRetry={reload} />
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="ระยะทางรวม" value={km(data.total_km)} tone="brand" />
            <StatCard label="วันทำงาน" value={`${data.working_days} วัน`} hint={`Upcountry ${data.upcountry_days} วัน`} />
            <StatCard label="Base KM" value={km(data.base_km)} />
            <StatCard label="Upcountry KM" value={km(data.upcountry_km)} />
            <StatCard label="ค่าทางด่วน/จอด/อื่น ๆ" value={money(data.trip_expenses.total)} hint={`จ่ายคืนแล้ว ${money(data.trip_expenses.reimbursed)}`} />
            <StatCard label="เบี้ยเลี้ยงโดยประมาณ" value={money(data.daily_allowance)} tone="emerald" />
          </div>
          <div className="card">
            <p className="mb-2 text-sm font-semibold">สถานะรายการเดือนนี้</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {Object.keys(STATUS_LABEL).map((s) => (
                <span key={s} className="rounded-lg bg-slate-100 px-2 py-1">{STATUS_LABEL[s]}: <b>{data.status_count?.[s] || 0}</b></span>
              ))}
            </div>
            {!data.monthly_actual && month < thisMonth() && (
              <p className="mt-3 text-sm text-amber-700">ยังไม่ได้บันทึกค่าใช้จ่ายจริงของเดือนนี้ — <Link className="underline" to="/expenses">บันทึกเลย</Link></p>
            )}
          </div>
          <Link to="/trips?new=1" className="btn-primary w-full py-3 text-base">+ บันทึกการเดินทางวันนี้</Link>
        </>
      )}
    </div>
  );
}
