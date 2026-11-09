import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorBanner, PageHeader, Spinner, StatCard, StatusBadge } from '../../components/common';
import RouteMap, { ROUTE_COLORS, tripsToPoints } from '../../components/map/RouteMap';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { authService, monitorService } from '../../services';
import { km, thaiDate, today } from '../../utils/format';
import { JOB_TYPES } from '../../../shared/provinces';

const shiftDay = (d, n) => {
  const t = new Date(`${d}T00:00:00`);
  t.setDate(t.getDate() + n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

/** Monitor รายวัน — เส้นทางที่พนักงานบันทึกไว้ (ไม่ใช่ตำแหน่ง real-time) */
export default function MonitorPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(today());
  const [baseId, setBaseId] = useState('');
  const [focus, setFocus] = useState(null);
  const bases = useAsync(() => authService.bases(), []);
  const { data, loading, error, reload } = useAsync(() => monitorService.day({ date, base_id: baseId }), [date, baseId]);

  const colored = useMemo(() => (data?.employees || []).map((e, i) => ({ ...e, color: ROUTE_COLORS[i % ROUTE_COLORS.length] })), [data]);
  const routes = useMemo(() => colored.filter((e) => e.trips.length)
    .map((e) => ({ id: e.employee_id, color: e.color, label: e.full_name, points: tripsToPoints(e.trips) })), [colored]);
  const missingCoords = colored.reduce((s, e) => s + e.trips.filter((t) => t.dest_lat === null).length, 0);
  const onSelect = useCallback((id) => setFocus((f) => (f === id ? null : id)), []);
  const focused = colored.find((e) => e.employee_id === focus);
  const reviewPath = (id) => (user?.role === 'SECRETARY' || user?.role === 'SUPER_ADMIN' ? `/secretary/review/${id}` : null);

  return (
    <div className="space-y-4">
      <PageHeader title="Monitor รายวัน" subtitle={`${thaiDate(date)} · เส้นทางจากรายการที่พนักงานบันทึก (ไม่ใช่ตำแหน่งแบบ real-time)`} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl bg-white ring-1 ring-slate-300">
          <button type="button" className="px-3 py-2.5 text-slate-600 hover:text-brand-700" aria-label="วันก่อนหน้า" onClick={() => setDate(shiftDay(date, -1))}>‹</button>
          <input type="date" className="border-0 bg-transparent py-2 text-sm focus:ring-0" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          <button type="button" className="px-3 py-2.5 text-slate-600 hover:text-brand-700 disabled:opacity-30" aria-label="วันถัดไป" disabled={date >= today()} onClick={() => setDate(shiftDay(date, 1))}>›</button>
        </div>
        <button type="button" className="btn-ghost" onClick={() => setDate(today())}>วันนี้</button>
        <select className="input w-auto" value={baseId} onChange={(e) => { setBaseId(e.target.value); setFocus(null); }}>
          <option value="">ทุก Base</option>
          {bases.data?.map((b) => <option key={b.base_id} value={b.base_id}>{b.base_name}</option>)}
        </select>
      </div>

      <ErrorBanner message={error} onRetry={reload} />
      {loading && <Spinner />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="บันทึกแล้ว" value={`${data.totals.recorded} / ${data.totals.employees} คน`} tone="brand" />
            <StatCard label="เที่ยวทั้งหมด" value={data.totals.trips} />
            <StatCard label="ระยะทางรวม" value={km(data.totals.km)} />
            <StatCard label="ออกนอก Base" value={`${data.totals.upcountry_employees} คน`} tone={data.totals.upcountry_employees ? 'amber' : 'slate'} />
            <StatCard label="ระยะต่างจาก Maps" value={`${data.totals.distance_flags} เที่ยว`} tone={data.totals.distance_flags ? 'rose' : 'emerald'} />
          </div>

          {!data.employees.length ? <EmptyState title="ไม่มีพนักงานใน Base ที่เลือก" /> : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-2 lg:order-1">
                <RouteMap routes={routes} focusId={focus} onSelect={onSelect} height={520} />
                <p className="text-xs text-slate-400">
                  เส้นเชื่อมแสดงลำดับการเดินทาง (เส้นตรงระหว่างจุด) · ⌂ = บ้าน แสดงตำแหน่งโดยประมาณ ~1 กม.
                  {missingCoords > 0 && ` · ${missingCoords} จุดหาพิกัดไม่พบ จึงไม่แสดงบนแผนที่`}
                </p>
              </div>

              <div className="space-y-2 lg:order-2 lg:max-h-[560px] lg:overflow-y-auto lg:pr-1">
                {colored.map((e) => (
                  <button key={e.employee_id} type="button" onClick={() => onSelect(e.employee_id)}
                    className={`card w-full text-left transition hover:ring-brand-300 ${focus === e.employee_id ? 'ring-2 ring-brand-600' : ''} ${e.trips.length ? '' : 'opacity-60'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: e.color }} />
                        <span className="truncate font-semibold">{e.full_name}</span>
                      </div>
                      {e.status === 'NOT_RECORDED'
                        ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">ยังไม่บันทึก</span>
                        : <StatusBadge status={e.status} />}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {e.base_name} · {e.trips.length} เที่ยว · {km(e.summary.total_km)}
                      {e.summary.upcountry_km > 0 && <span className="text-amber-700"> · นอก Base {km(e.summary.upcountry_km)}</span>}
                      {e.summary.distance_flags > 0 && <span className="text-rose-600"> · ⚠ {e.summary.distance_flags}</span>}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {focused && focused.trips.length > 0 && (
            <div className="card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold"><span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: focused.color }} />{focused.full_name} — ลำดับการเดินทาง</p>
                {reviewPath(focused.daily_record_id) && <Link className="btn-secondary px-3 py-1.5 text-xs" to={reviewPath(focused.daily_record_id)}>เปิดรายการเพื่อตรวจ →</Link>}
              </div>
              <ol className="relative space-y-3 border-l-2 border-slate-200 pl-5">
                {focused.trips.map((t) => (
                  <li key={t.trip_id} className="relative">
                    <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: focused.color }}>{t.sequence_no}</span>
                    <p className="text-sm font-semibold">{t.origin_is_home && '🏠 '}{t.origin} → {t.destination_is_home && '🏠 '}{t.destination}
                      {t.destination_province && <span className="font-normal text-slate-500"> ({t.destination_province})</span>}</p>
                    <p className="text-xs text-slate-500">
                      {km(t.distance_km)}{t.maps_distance_km ? ` · Maps ${km(t.maps_distance_km)}` : ''} ·{' '}
                      <span className={t.travel_type === 'BASE' ? 'text-emerald-700' : 'text-amber-700'}>{t.travel_type === 'BASE' ? 'ในเขต Base' : 'นอก Base'}</span>
                      {(t.customer_name || t.job_type || t.ticket_no) && ` · ${[t.customer_name, JOB_TYPES[t.job_type], t.ticket_no && `#${t.ticket_no}`].filter(Boolean).join(' · ')}`}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
}
