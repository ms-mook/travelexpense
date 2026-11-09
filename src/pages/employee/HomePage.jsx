import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBanner, Spinner, StatusBadge } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { useQuickRecord } from '../../hooks/useQuickRecord';
import { tripService } from '../../services';
import { km, money, num2, thaiMonth, thisMonth, today } from '../../utils/format';
import { STATUS_LABEL } from '../../utils/labels';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'สวัสดีตอนเช้า' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
};

function MiniStat({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(thisMonth());
  const quick = useQuickRecord();
  const { data, loading, error, reload } = useAsync(() => tripService.overview(month), [month]);
  const todayRec = useAsync(() => tripService.listRecords({ month: thisMonth() })
    .then((rows) => rows.find((r) => r.record_date === today()) || null), []);
  const isCurrent = month === thisMonth();
  const rec = todayRec.data;
  const pending = (data?.status_count?.DRAFT || 0) + (data?.status_count?.RETURNED || 0);

  return (
    <div className="space-y-4">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-700 to-brand-900 p-5 text-white shadow-lg shadow-brand-900/20">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-10 h-32 w-32 rounded-full bg-white/5" />
        <p className="text-sm text-brand-100">{greeting()}</p>
        <p className="text-xl font-bold">{user?.full_name?.split(' ')[0]}</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-brand-100">ระยะทาง{isCurrent ? 'เดือนนี้' : ` ${thaiMonth(month)}`}</p>
            <p className="text-4xl font-bold tabular-nums">{data ? num2(data.total_km) : '–'}<span className="ml-1 text-base font-medium text-brand-100">กม.</span></p>
          </div>
          <input type="month" aria-label="เลือกเดือน" className="rounded-xl border-0 bg-white/15 px-2 py-1.5 text-sm text-white [color-scheme:dark] focus:ring-2 focus:ring-white/50"
            value={month} max={thisMonth()} onChange={(e) => setMonth(e.target.value)} />
        </div>
        {data && (
          <div className="mt-3 flex gap-2 text-xs">
            <span className="rounded-full bg-white/15 px-2.5 py-1">ใน Base {num2(data.base_km)} กม.</span>
            <span className="rounded-full bg-white/15 px-2.5 py-1">นอก Base {num2(data.upcountry_km)} กม.</span>
          </div>
        )}
      </section>

      {/* วันนี้ */}
      {isCurrent && (
        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="font-semibold">วันนี้</p>
            {rec && <StatusBadge status={rec.status} />}
          </div>
          {todayRec.loading ? <p className="py-3 text-sm text-slate-400">กำลังโหลด...</p> : rec ? (
            <>
              <p className="mt-1 text-sm text-slate-500">{rec.summary.trip_count} เที่ยว · {km(rec.summary.total_km)} · ค่าใช้จ่าย {money(rec.summary.expenses.total)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link to={`/trips/${rec.daily_record_id}`} className="btn-secondary">ดูรายการวันนี้</Link>
                {['DRAFT', 'RETURNED'].includes(rec.status)
                  ? <button type="button" className="btn-primary" onClick={quick.start} disabled={quick.busy}>+ เพิ่มเที่ยว</button>
                  : <span className="btn bg-emerald-50 text-emerald-700">ส่งแล้ว ✓</span>}
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-500">ยังไม่ได้บันทึกการเดินทางของวันนี้</p>
              <button type="button" className="btn-primary mt-3 w-full py-3 text-base" onClick={quick.start} disabled={quick.busy}>
                {quick.busy ? 'กำลังเปิด...' : '🚗 เริ่มบันทึกวันนี้'}
              </button>
            </>
          )}
          <ErrorBanner message={quick.error} />
        </section>
      )}

      {loading && <Spinner />}
      <ErrorBanner message={error} onRetry={reload} />
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="วันทำงาน" value={`${data.working_days} วัน`} sub={`ใน Base ${data.base_days} · นอก Base ${data.upcountry_days}`} />
            <MiniStat label="เบี้ยเลี้ยงโดยประมาณ" value={money(data.daily_allowance)} sub="ตามนโยบาย ณ วันที่เดินทาง" />
            <MiniStat label="ทางด่วน / จอดรถ / อื่น ๆ" value={money(data.trip_expenses.total)} sub={`จ่ายคืนแล้ว ${money(data.trip_expenses.reimbursed)}`} />
            <MiniStat label="งานที่ไป" value={`${data.jobs?.job_count || 0} งาน`} sub={data.jobs?.customer_count ? `${data.jobs.customer_count} ลูกค้า` : 'ระบุเลขใบงานเพื่อนับงาน'} />
          </div>

          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="mb-2 text-sm font-semibold">สถานะรายการ{isCurrent ? 'เดือนนี้' : ''}</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {Object.keys(STATUS_LABEL).map((s) => (
                <Link key={s} to="/trips" className="rounded-xl bg-slate-50 py-2 hover:bg-slate-100">
                  <p className="text-lg font-bold">{data.status_count?.[s] || 0}</p>
                  <p className="text-[10px] text-slate-500">{STATUS_LABEL[s]}</p>
                </Link>
              ))}
            </div>
            {pending > 0 && <p className="mt-3 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">มี {pending} รายการที่ยังไม่ได้ส่งตรวจ หรือถูกส่งกลับให้แก้ไข</p>}
            {!data.monthly_actual && month < thisMonth() && (
              <p className="mt-3 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">ยังไม่ได้บันทึกค่าใช้จ่ายจริงของเดือนนี้ — <Link className="font-semibold underline" to="/expenses">บันทึกเลย</Link></p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
