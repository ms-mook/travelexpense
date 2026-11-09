import { useState } from 'react';
import { ErrorBanner, PageHeader, Spinner, StatCard } from '../../components/common';
import CompareChart from '../../components/dashboard/CompareChart';
import { useAction, useAsync } from '../../hooks/useAsync';
import { reportService } from '../../services';
import { downloadBlob, km, money, thaiMonth, thisMonth } from '../../utils/format';

const gapTone = (v) => (v > 0 ? 'text-rose-600' : 'text-emerald-700');

export default function DashboardPage() {
  const [month, setMonth] = useState(thisMonth());
  const [baseId, setBaseId] = useState('');
  const bases = useAsync(() => reportService.bases(), []);
  const { data, loading, error, reload } = useAsync(() => reportService.dashboard({ month, base_id: baseId, months: 6 }), [month, baseId]);
  const exp = useAction();
  const cur = data?.current;
  const t = cur?.totals;

  return (
    <div className="space-y-4">
      <PageHeader title="ภาพรวมระดับประเทศ" subtitle={`${thaiMonth(month)} · นับเฉพาะสถานะ ${cur?.report_statuses?.join(', ') || 'VERIFIED'}`}
        action={(
          <button type="button" className="btn-secondary" disabled={exp.busy}
            onClick={() => exp.run(async () => { const { blob, filename } = await reportService.exportCsv({ month, base_id: baseId }); downloadBlob(blob, filename || `travel-expense-${month}.csv`); })}>
            ⬇ Export CSV
          </button>
        )} />
      <div className="flex flex-wrap gap-2">
        <input type="month" className="input w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />
        <select className="input w-auto" value={baseId} onChange={(e) => setBaseId(e.target.value)}>
          <option value="">ทุก Base</option>
          {bases.data?.map((b) => <option key={b.base_id} value={b.base_id}>{b.base_name}</option>)}
        </select>
      </div>
      <ErrorBanner message={error || exp.error} onRetry={error ? reload : undefined} />
      {loading && <Spinner />}
      {t && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total KM" value={km(t.total_km)} hint={`Base ${km(t.base_km)} · Upcountry ${km(t.upcountry_km)}`} tone="brand" />
            <StatCard label="Actual Operating Cost" value={money(t.actual_operating_cost)} hint={`${t.employee_count} คน · ${t.working_days} วันทำงาน`} />
            <StatCard label="Reimbursed Expense" value={money(t.reimbursed_expense)} />
            <StatCard label="Net Employee Burden" value={money(t.net_employee_burden)} />
            <StatCard label="Daily Allowance" value={money(t.daily_allowance)} tone="amber" hint={`Base ${t.base_days} วัน · Upcountry ${t.upcountry_days} วัน`} />
            <StatCard label="Expense Gap" value={money(t.expense_gap)} tone={t.expense_gap > 0 ? 'rose' : 'emerald'}
              hint={t.expense_gap > 0 ? 'เบี้ยเลี้ยงไม่พอต่อภาระจริง' : 'เบี้ยเลี้ยงครอบคลุมภาระจริง'} />
            <StatCard label="Trip Expense (Toll/Parking/Other)" value={money(t.trip_expense_total)} hint={`จ่ายคืนแล้ว ${money(t.trip_expense_reimbursed)}`} />
          </div>

          <BaseAllowanceSection t={t} employees={cur.employees} />

          <div className="card text-xs text-slate-600">
            <p className="font-semibold text-slate-700">สูตรที่ใช้</p>
            <p>แยกบัญชี Base / Upcountry: ค่าใช้จ่ายรายเดือนปันส่วนตามสัดส่วนกิโลเมตร (Base KM ÷ Total KM) + ค่าใช้จ่ายรายเที่ยวของแต่ละฝั่ง</p>
            <p>Base Gap = ต้นทุนวันใน Base − เบี้ยเลี้ยงใน Base · Upcountry Gap = ต้นทุนนอก Base − ยอดเบิกคืน (Concur) − เบี้ยเลี้ยงต่างจังหวัด</p>
            <p>Actual Operating Cost = Monthly Actual Total{cur.include_trip_expenses_in_actual ? ' + Trip Expense' : ''}</p>
            <p>Reimbursed Expense = ค่าชดเชยต่อกม.{cur.include_trip_expenses_in_actual ? ' + Trip Expense ที่จ่ายคืนแล้ว' : ''}</p>
            <p>Net Employee Burden = Actual Operating Cost − Reimbursed Expense · Expense Gap = Net Employee Burden − Daily Allowance</p>
          </div>

          <div className="card">
            <p className="mb-3 font-semibold">ภาระสุทธิ vs Daily Allowance (6 เดือน)</p>
            <CompareChart data={data.trend} />
          </div>

          <div className="card overflow-x-auto p-0">
            <p className="p-4 pb-2 font-semibold">เปรียบเทียบตาม Base</p>
            <table className="table-base">
              <thead><tr><th>Base</th><th className="text-right">คน</th><th className="text-right">Base KM</th><th className="text-right">Upcountry KM</th><th className="text-right">Actual</th><th className="text-right">Reimbursed</th><th className="text-right">Net Burden</th><th className="text-right">Allowance</th><th className="text-right">Gap</th></tr></thead>
              <tbody>
                {cur.by_base.map((b) => (
                  <tr key={b.base_id || 'none'}>
                    <td>{b.base_name}</td><td className="text-right">{b.employee_count}</td>
                    <td className="text-right tabular-nums">{km(b.base_km)}</td><td className="text-right tabular-nums">{km(b.upcountry_km)}</td>
                    <td className="text-right tabular-nums">{money(b.actual_operating_cost)}</td><td className="text-right tabular-nums">{money(b.reimbursed_expense)}</td>
                    <td className="text-right tabular-nums">{money(b.net_employee_burden)}</td><td className="text-right tabular-nums">{money(b.daily_allowance)}</td>
                    <td className={`text-right font-semibold tabular-nums ${gapTone(b.expense_gap)}`}>{money(b.expense_gap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card overflow-x-auto p-0">
            <p className="p-4 pb-2 font-semibold">รายพนักงาน</p>
            <table className="table-base">
              <thead><tr><th>พนักงาน</th><th>Base</th><th className="text-right">วัน</th><th className="text-right">Total KM</th><th className="text-right">Monthly Actual</th><th className="text-right">Trip Exp.</th><th className="text-right">Reimbursed</th><th className="text-right">Net Burden</th><th className="text-right">Allowance</th><th className="text-right">Gap</th><th>ข้อสังเกต</th></tr></thead>
              <tbody>
                {cur.employees.map((r) => {
                  const q = r.data_quality;
                  const notes = [
                    q.monthly_actual_missing && 'ยังไม่ส่งค่าใช้จ่ายรายเดือน',
                    q.monthly_actual_not_counted && 'ค่าใช้จ่ายรายเดือนยังไม่ยืนยัน',
                    q.records_not_counted > 0 && `${q.records_not_counted} วันยังไม่ยืนยัน`,
                    q.missing_policy_days > 0 && `${q.missing_policy_days} วันไม่มีนโยบายเบี้ยเลี้ยง`
                  ].filter(Boolean);
                  return (
                    <tr key={r.employee_id}>
                      <td>{r.full_name}<br /><span className="text-xs text-slate-400">{r.employee_code}</span></td>
                      <td>{r.base_name}</td><td className="text-right">{r.working_days}</td>
                      <td className="text-right tabular-nums">{km(r.total_km)}</td>
                      <td className="text-right tabular-nums">{money(r.components.monthly_actual_total)}</td>
                      <td className="text-right tabular-nums">{money(r.components.trip_expense_included)}</td>
                      <td className="text-right tabular-nums">{money(r.reimbursed_expense)}</td>
                      <td className="text-right tabular-nums">{money(r.net_employee_burden)}</td>
                      <td className="text-right tabular-nums">{money(r.daily_allowance)}</td>
                      <td className={`text-right font-semibold tabular-nums ${gapTone(r.expense_gap)}`}>{money(r.expense_gap)}</td>
                      <td className="text-xs text-amber-700">{notes.join(' · ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/** ส่วนที่ตอบคำถามหลัก: เบี้ยเลี้ยงรายวันใน Base พอกับภาระจริงหรือไม่ */
function BaseAllowanceSection({ t, employees }) {
  const b = t.segments.base;
  const u = t.segments.upcountry;
  const allowancePerDay = b.days ? b.allowance / b.days : 0;
  const shortPct = b.employees_with_days ? Math.round((b.employees_short / b.employees_with_days) * 100) : 0;
  const rows = [...employees].filter((r) => r.segments.base.days || r.segments.upcountry.days)
    .sort((x, y) => y.segments.base.gap - x.segments.base.gap);
  return (
    <div className="card space-y-4">
      <div>
        <p className="text-lg font-bold">เบี้ยเลี้ยงใน Base พอหรือไม่?</p>
        <p className="text-sm text-slate-500">วันที่วิ่งในเขต Base เทียบต้นทุนจริงต่อวัน กับเบี้ยเลี้ยงต่อวัน (ครอบคลุมทางด่วน/จอดรถแล้ว)</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="ต้นทุนจริงเฉลี่ย / วัน (Base)" value={money(b.cost_per_day)} tone={b.cost_per_day > allowancePerDay ? 'rose' : 'emerald'} hint={`${b.days} วัน · ${km(b.km)}`} />
        <StatCard label="เบี้ยเลี้ยงเฉลี่ย / วัน (Base)" value={money(allowancePerDay)} hint={`รวม ${money(b.allowance)}`} />
        <StatCard label="ส่วนต่างรวม (Base Gap)" value={money(b.gap)} tone={b.gap > 0 ? 'rose' : 'emerald'} hint={b.gap > 0 ? 'พนักงานออกเงินเองเกินเบี้ยเลี้ยง' : 'เบี้ยเลี้ยงครอบคลุม'} />
        <StatCard label="พนักงานที่เบี้ยเลี้ยงไม่พอ" value={`${b.employees_short} / ${b.employees_with_days} คน`} tone={b.employees_short ? 'amber' : 'emerald'} hint={`${shortPct}% ของคนที่มีวันใน Base`} />
        <StatCard label="นอก Base: ต้นทุน" value={money(u.cost)} hint={`${u.days} วัน · ${km(u.km)}`} />
        <StatCard label="นอก Base: เบี้ยเลี้ยง + เบิกคืน" value={money(u.allowance + u.reimbursed)} hint={`เบี้ยเลี้ยง ${money(u.allowance)} · Concur ${money(u.reimbursed)}`} />
        <StatCard label="นอก Base: ส่วนต่าง" value={money(u.gap)} tone={u.gap > 0 ? 'rose' : 'emerald'} />
        <StatCard label="ต้นทุนเดินทาง / งาน" value={money(t.jobs.cost_per_job)} hint={`${t.jobs.job_count} งาน (จากเลขใบงาน/ประเภทงาน)`} tone="brand" />
      </div>
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>พนักงาน</th><th>Base</th><th className="text-right">วันใน Base</th><th className="text-right">ต้นทุน/วัน</th><th className="text-right">เบี้ยเลี้ยง</th><th className="text-right">Base Gap</th><th className="text-right">วันนอก Base</th><th className="text-right">Upcountry Gap</th><th className="text-right">งาน</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employee_id}>
                  <td>{r.full_name}</td><td>{r.base_name}</td>
                  <td className="text-right">{r.segments.base.days}</td>
                  <td className="text-right tabular-nums">{money(r.segments.base.cost_per_day)}</td>
                  <td className="text-right tabular-nums">{money(r.segments.base.allowance)}</td>
                  <td className={`text-right font-semibold tabular-nums ${gapTone(r.segments.base.gap)}`}>{money(r.segments.base.gap)}</td>
                  <td className="text-right">{r.segments.upcountry.days}</td>
                  <td className={`text-right tabular-nums ${gapTone(r.segments.upcountry.gap)}`}>{money(r.segments.upcountry.gap)}</td>
                  <td className="text-right">{r.jobs.job_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-400">* ค่าน้ำมัน/บำรุงรักษา/สึกหรอรายเดือนปันส่วนตามกิโลเมตร — ตัวเลขแม่นขึ้นเมื่อพนักงานบันทึกครบทุกเที่ยวและส่งค่าใช้จ่ายรายเดือน</p>
    </div>
  );
}
