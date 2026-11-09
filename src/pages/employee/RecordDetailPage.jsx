import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState, ErrorBanner, Modal, Spinner } from '../../components/common';
import RecordView from '../../components/common/RecordView';
import { ExpenseForm, TripForm } from '../../components/forms';
import { useAction, useAsync } from '../../hooks/useAsync';
import { expenseService, tripService, vehicleService } from '../../services';

export default function RecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user, features } = useAuth();
  const { data, loading, error, reload } = useAsync(() => tripService.getRecord(id), [id]);
  const vehicles = useAsync(() => vehicleService.list(), []);
  const [tripModal, setTripModal] = useState(null); // { mode: 'new' } | { mode: 'edit', trip }
  const [expenseTrip, setExpenseTrip] = useState(null);
  const act = useAction();

  // มาจากการสร้างวันใหม่ (?add=1) → เปิดฟอร์มเที่ยวแรกให้ทันที
  useEffect(() => {
    if (params.get('add') === '1' && data && vehicles.data?.length) {
      setTripModal({ mode: 'new' });
      setParams({}, { replace: true });
    }
  }, [params, data, vehicles.data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;

  const editable = ['DRAFT', 'RETURNED'].includes(data.record.status);
  const hasVehicle = vehicles.data?.length > 0;
  const lastTrip = data.trips[data.trips.length - 1];
  const step = !data.trips.length ? 1 : 2;

  async function saveTrip(form) {
    const ok = await act.run(() => (tripModal.mode === 'edit'
      ? tripService.updateTrip(tripModal.trip.trip_id, { ...form, updated_at: tripModal.trip.updated_at })
      : tripService.addTrip(id, form)));
    if (ok) { setTripModal(null); reload(); }
  }

  async function saveExpense(form) {
    const ok = await act.run(() => expenseService.add(expenseTrip.trip_id, form));
    if (ok) { setExpenseTrip(null); reload(); }
  }

  const confirmRun = async (msg, fn) => { if (window.confirm(msg) && await act.run(fn)) reload(); };

  return (
    <div className="space-y-3 pb-4">
      <Link to="/trips" className="text-sm text-brand-700">← กลับ</Link>
      <ErrorBanner message={!tripModal && !expenseTrip ? act.error : ''} />
      <RecordView
        detail={data}
        tripActions={(t) => editable && (
          <>
            <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => { act.setError(''); setTripModal({ mode: 'edit', trip: t }); }}>แก้ไข</button>
            <button type="button" className="btn-ghost px-2 py-1 text-xs text-rose-600" onClick={() => confirmRun('ลบเที่ยวนี้และค่าใช้จ่ายในเที่ยว?', () => tripService.deleteTrip(t.trip_id))}>ลบ</button>
          </>
        )}
        expenseActions={(e) => editable && (
          <button type="button" className="text-xs text-rose-600" onClick={() => confirmRun('ลบค่าใช้จ่ายนี้?', () => expenseService.remove(e.expense_id))}>ลบ</button>
        )}
        tripFooter={(t) => editable && (
          <button type="button" className="mt-3 text-sm font-semibold text-brand-700" onClick={() => { act.setError(''); setExpenseTrip(t); }}>+ ค่าทางด่วน / จอดรถ / อื่น ๆ</button>
        )}
      />

      {editable && (
        <div className="card">
          <p className="mb-2 text-sm font-semibold">วิธีบันทึกวันนี้</p>
          <ol className="space-y-2 text-sm">
            {[
              ['เพิ่มเที่ยว', 'ทุกครั้งที่ขับจากจุดหนึ่งไปอีกจุด = 1 เที่ยว (ไป-กลับ = 2 เที่ยว) วันเดียวเพิ่มได้หลายเที่ยว'],
              ['ใส่ค่าทางด่วน/จอดรถ (ถ้ามี)', 'กด “+ ค่าทางด่วน / จอดรถ / อื่น ๆ” ใต้เที่ยวนั้น'],
              ['ส่งตรวจสอบ', 'เมื่อครบทุกเที่ยวของวัน กดส่ง — Secretary จะตรวจเทียบกับ Google Maps']
            ].map(([t, d], i) => (
              <li key={t} className={`flex gap-3 ${i + 1 < step ? 'opacity-50' : ''}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i + 1 === step ? 'bg-brand-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {i + 1 < step ? '✓' : i + 1}
                </span>
                <span><b>{t}</b><br /><span className="text-slate-500">{d}</span></span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {!data.trips.length && !editable && <EmptyState title="ยังไม่มีเที่ยวเดินทาง" />}

      {editable && (
        <div className="space-y-2">
          {!hasVehicle && !vehicles.loading && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">ยังไม่มีรถในระบบ — <Link className="underline" to="/profile">เพิ่มรถก่อน</Link></p>
          )}
          <button type="button" className={`${data.trips.length ? 'btn-secondary' : 'btn-primary'} w-full py-3`} disabled={!hasVehicle} onClick={() => { act.setError(''); setTripModal({ mode: 'new' }); }}>
            + เพิ่มเที่ยว{data.trips.length ? 'ถัดไป' : 'แรกของวัน'}
          </button>
          <button type="button" className="btn-primary w-full py-3" disabled={!data.trips.length || act.busy}
            onClick={() => confirmRun('ส่งรายการให้ Secretary ตรวจสอบ? หลังส่งจะแก้ไขไม่ได้จนกว่าจะถูกส่งกลับ', () => tripService.submitRecord(id))}>
            ส่งตรวจสอบ
          </button>
          {data.record.status === 'DRAFT' && (
            <button type="button" className="btn-ghost w-full text-rose-600"
              onClick={async () => { if (window.confirm('ลบรายการของวันนี้?') && await act.run(() => tripService.deleteRecord(id))) navigate('/trips'); }}>
              ลบรายการวันนี้
            </button>
          )}
        </div>
      )}

      <Modal open={Boolean(tripModal)} title={tripModal?.mode === 'edit' ? 'แก้ไขเที่ยว' : 'เพิ่มเที่ยวเดินทาง'} onClose={() => setTripModal(null)}>
        {tripModal && (
          <TripForm vehicles={vehicles.data || []} initial={tripModal.trip} onSubmit={saveTrip}
            defaultOrigin={lastTrip?.destination || ''} homeLocation={user?.home_location || ''} isFirstTrip={!data.trips.length}
            baseName={data.record.base_name_snapshot}
            baseProvinces={data.base_provinces}
            mapsAvailable={features.maps_distance}
            onCancel={() => setTripModal(null)} busy={act.busy} error={act.error} />
        )}
      </Modal>
      <Modal open={Boolean(expenseTrip)} title="เพิ่มค่าใช้จ่าย" onClose={() => setExpenseTrip(null)}>
        {expenseTrip && <ExpenseForm travelType={expenseTrip.travel_type} onSubmit={saveExpense} onCancel={() => setExpenseTrip(null)} busy={act.busy} error={act.error} />}
      </Modal>
    </div>
  );
}
