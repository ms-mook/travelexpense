import { Suspense, lazy, useMemo } from 'react';
import { ReceiptButton } from '../forms';
import { tripsToPoints } from '../map/routePoints';

const RouteMap = lazy(() => import('../map/RouteMap'));
import { StatusBadge } from './index';
import { km, money, thaiDate, thaiDateTime } from '../../utils/format';
import { EXPENSE_TYPE_LABEL, RECEIPT_LABEL, REIMBURSE_LABEL, TRAVEL_TYPE_LABEL } from '../../utils/labels';
import { JOB_TYPES, googleMapsDirUrl } from '../../../shared/provinces';

const isHome = (v) => v === true || String(v).toUpperCase() === 'TRUE';

/** เทียบระยะที่กรอกกับ Google Maps (ถ้ามี) — ต่างเกิน 20% ขึ้นสีแดง */
function DistanceCheck({ trip }) {
  const maps = Number(trip.maps_distance_km);
  const url = googleMapsDirUrl(trip.origin, trip.destination, trip.destination_province);
  const diff = maps > 0 ? ((Number(trip.distance_km) - maps) / maps) * 100 : null;
  const flagged = diff !== null && Math.abs(diff) > 20;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
      {diff !== null && (
        <span className={`rounded-md px-1.5 py-0.5 ${flagged ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
          Google Maps {km(maps)} ({diff > 0 ? '+' : ''}{diff.toFixed(0)}%){flagged ? ' ⚠ ต่างเกิน 20%' : ' ✓'}
        </span>
      )}
      <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">ดูเส้นทางใน Google Maps</a>
    </p>
  );
}

/**
 * แสดง Daily Record + เที่ยว + ค่าใช้จ่าย
 * tripActions(trip) / expenseActions(expense) ให้หน้าจอแต่ละ Role ใส่ปุ่มของตัวเอง
 */
export default function RecordView({ detail, tripActions, expenseActions, tripFooter }) {
  const { record, trips, summary } = detail;
  const routes = useMemo(() => {
    const points = tripsToPoints(trips);
    return points.length ? [{ id: record.daily_record_id, color: '#0f766e', label: record.employee_name || 'เส้นทางวันนี้', points }] : [];
  }, [trips, record.daily_record_id, record.employee_name]);
  return (
    <div className="space-y-3">
      <div className="card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-bold">{thaiDate(record.record_date)}</p>
            <p className="text-sm text-slate-500">{record.employee_name} · Base {record.base_name_snapshot || '-'}</p>
          </div>
          <StatusBadge status={record.status} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-slate-50 p-2"><p className="text-xs text-slate-500">Base</p><p className="font-semibold">{km(summary.base_km)}</p></div>
          <div className="rounded-xl bg-slate-50 p-2"><p className="text-xs text-slate-500">Upcountry</p><p className="font-semibold">{km(summary.upcountry_km)}</p></div>
          <div className="rounded-xl bg-brand-50 p-2"><p className="text-xs text-brand-700">รวม</p><p className="font-bold text-brand-800">{km(summary.total_km)}</p></div>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          ค่าใช้จ่ายรายเที่ยว {money(summary.expenses.total)} (ทางด่วน {money(summary.expenses.toll)} · จอดรถ {money(summary.expenses.parking)} · อื่น ๆ {money(summary.expenses.other)})
        </p>
        {record.employee_note && <p className="mt-2 text-sm">📝 {record.employee_note}</p>}
        {record.secretary_note && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">Secretary: {record.secretary_note}</p>}
        {record.verified_at && <p className="mt-2 text-xs text-emerald-700">ยืนยันเมื่อ {thaiDateTime(record.verified_at)}</p>}
      </div>

      {routes.length > 0 && (
        <Suspense fallback={<div className="h-[220px] animate-pulse rounded-2xl bg-slate-100" />}>
          <RouteMap routes={routes} height={220} />
        </Suspense>
      )}

      {trips.map((t) => (
        <div key={t.trip_id} className="card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-400">
                เที่ยวที่ {t.sequence_no}
                <span className={`rounded-full px-2 py-0.5 ${t.travel_type === 'BASE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{TRAVEL_TYPE_LABEL[t.travel_type]}</span>
              </p>
              <p className="font-semibold">{isHome(t.origin_is_home) && '🏠 '}{t.origin} → {isHome(t.destination_is_home) && '🏠 '}{t.destination}{t.destination_province && <span className="font-normal text-slate-500"> ({t.destination_province})</span>}</p>
              {(t.customer_name || t.job_type || t.ticket_no) && (
                <p className="text-sm text-slate-700">
                  {[t.customer_name, JOB_TYPES[t.job_type], t.ticket_no && `#${t.ticket_no}`].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="text-sm text-slate-500">
                {km(t.distance_km)} · {t.vehicle_model_snapshot} {t.license_plate_snapshot} · {t.fuel_type_snapshot}
                {t.odometer_start !== '' && t.odometer_start !== undefined && ` · ไมล์ ${t.odometer_start}–${t.odometer_end}`}
              </p>
              {t.note && <p className="text-sm text-slate-600">{t.note}</p>}
              <DistanceCheck trip={t} />
            </div>
            <div className="flex shrink-0 gap-1">{tripActions?.(t)}</div>
          </div>
          {t.expenses.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl bg-slate-50 px-3">
              {t.expenses.map((e) => (
                <li key={e.expense_id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div>
                    <p>{EXPENSE_TYPE_LABEL[e.expense_type]} <b>{money(e.amount)}</b></p>
                    <p className="text-xs text-slate-500">
                      {RECEIPT_LABEL[e.receipt_status]} · {REIMBURSE_LABEL[e.reimbursement_status]}
                      {e.note && ` · ${e.note}`}
                    </p>
                    <ReceiptButton fileId={e.receipt_file_id} />
                  </div>
                  <div className="flex shrink-0 gap-1">{expenseActions?.(e)}</div>
                </li>
              ))}
            </ul>
          )}
          {tripFooter?.(t)}
        </div>
      ))}
    </div>
  );
}
