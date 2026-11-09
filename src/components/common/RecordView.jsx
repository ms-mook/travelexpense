import { ReceiptButton } from '../forms';
import { StatusBadge } from './index';
import { km, money, thaiDate, thaiDateTime } from '../../utils/format';
import { EXPENSE_TYPE_LABEL, RECEIPT_LABEL, REIMBURSE_LABEL, TRAVEL_TYPE_LABEL } from '../../utils/labels';

/**
 * แสดง Daily Record + เที่ยว + ค่าใช้จ่าย
 * tripActions(trip) / expenseActions(expense) ให้หน้าจอแต่ละ Role ใส่ปุ่มของตัวเอง
 */
export default function RecordView({ detail, tripActions, expenseActions, tripFooter }) {
  const { record, trips, summary } = detail;
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

      {trips.map((t) => (
        <div key={t.trip_id} className="card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-400">เที่ยวที่ {t.sequence_no} · {TRAVEL_TYPE_LABEL[t.travel_type]}</p>
              <p className="font-semibold">{t.origin} → {t.destination}</p>
              <p className="text-sm text-slate-500">
                {km(t.distance_km)} · {t.vehicle_model_snapshot} {t.license_plate_snapshot} · {t.fuel_type_snapshot}
                {t.odometer_start !== '' && t.odometer_start !== undefined && ` · ไมล์ ${t.odometer_start}–${t.odometer_end}`}
              </p>
              {t.note && <p className="text-sm text-slate-600">{t.note}</p>}
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
