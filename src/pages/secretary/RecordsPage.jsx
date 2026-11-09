import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorBanner, PageHeader, Spinner, StatusBadge } from '../../components/common';
import { useAsync } from '../../hooks/useAsync';
import { authService, secretaryService } from '../../services';
import { km, money, thaiDate, thaiDateTime } from '../../utils/format';
import { STATUS_LABEL } from '../../utils/labels';

/** mode = 'pending' (รอตรวจ) | 'all' (ค้นหา) */
export default function RecordsPage({ mode = 'pending' }) {
  const [filters, setFilters] = useState({ base_id: '', status: '', date_from: '', date_to: '', page: 1 });
  const bases = useAsync(() => authService.bases(), []);
  const { data, loading, error, reload } = useAsync(
    () => (mode === 'pending' ? secretaryService.pending(filters) : secretaryService.records(filters)),
    [mode, JSON.stringify(filters)]
  );
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));

  return (
    <div>
      <PageHeader title={mode === 'pending' ? 'รายการรอตรวจสอบ' : 'ค้นหารายการ'} subtitle={data ? `${data.total} รายการ` : ''} />
      <div className="card mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        <select className="input" value={filters.base_id} onChange={set('base_id')}>
          <option value="">ทุก Base</option>
          {bases.data?.map((b) => <option key={b.base_id} value={b.base_id}>{b.base_name}</option>)}
        </select>
        {mode === 'all' && (
          <select className="input" value={filters.status} onChange={set('status')}>
            <option value="">ทุกสถานะ</option>
            {['SUBMITTED', 'RETURNED', 'VERIFIED'].map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        )}
        <input type="date" className="input" value={filters.date_from} onChange={set('date_from')} aria-label="ตั้งแต่วันที่" />
        <input type="date" className="input" value={filters.date_to} onChange={set('date_to')} aria-label="ถึงวันที่" />
      </div>
      {loading && <Spinner />}
      <ErrorBanner message={error} onRetry={reload} />
      {data && !data.items.length && <EmptyState title="ไม่มีรายการ" />}
      {data?.items.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="table-base">
            <thead>
              <tr><th>วันที่</th><th>พนักงาน</th><th>Base</th><th>เที่ยว</th><th className="text-right">Base KM</th><th className="text-right">Upcountry KM</th><th className="text-right">ค่าใช้จ่าย</th><th>ส่งเมื่อ</th><th>สถานะ</th><th /></tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.daily_record_id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap">{thaiDate(r.record_date)}</td>
                  <td>{r.employee_name}</td>
                  <td>{r.base_name_snapshot}</td>
                  <td>{r.summary.trip_count}</td>
                  <td className="text-right tabular-nums">{km(r.summary.base_km)}</td>
                  <td className="text-right tabular-nums">{km(r.summary.upcountry_km)}</td>
                  <td className="text-right tabular-nums">{money(r.summary.expenses.total)}</td>
                  <td className="whitespace-nowrap text-xs text-slate-500">{thaiDateTime(r.submitted_at)}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><Link className="font-semibold text-brand-700" to={`/secretary/review/${r.daily_record_id}`}>ตรวจ →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > data.page_size && (
        <div className="mt-3 flex justify-center gap-2">
          <button type="button" className="btn-secondary" disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>ก่อนหน้า</button>
          <span className="self-center text-sm">หน้า {data.page}</span>
          <button type="button" className="btn-secondary" disabled={data.page * data.page_size >= data.total} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>ถัดไป</button>
        </div>
      )}
    </div>
  );
}
