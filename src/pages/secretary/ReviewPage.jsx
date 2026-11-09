import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorBanner, Field, Modal, ReasonModal, Spinner } from '../../components/common';
import RecordView from '../../components/common/RecordView';
import { useAction, useAsync } from '../../hooks/useAsync';
import { secretaryService, tripService } from '../../services';
import { thaiDateTime } from '../../utils/format';
import { EXPENSE_TYPE_LABEL, RECEIPT_LABEL, REIMBURSE_LABEL, TRAVEL_TYPE_LABEL } from '../../utils/labels';
import { JOB_TYPES, PROVINCES } from '../../../shared/provinces';

export default function ReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => tripService.getRecord(id), [id]);
  const audit = useAsync(() => secretaryService.auditLogs({ entity_id: id }), [id]);
  const [editTrip, setEditTrip] = useState(null);
  const [editExpense, setEditExpense] = useState(null);
  const [returning, setReturning] = useState(false);
  const act = useAction();

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  const { status } = data.record;
  const canEdit = ['SUBMITTED', 'VERIFIED'].includes(status);

  const done = () => { setEditTrip(null); setEditExpense(null); setReturning(false); reload(); audit.reload(); };
  const formBody = (e) => Object.fromEntries(new FormData(e.currentTarget).entries());

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <button type="button" className="text-sm text-brand-700" onClick={() => navigate(-1)}>← กลับ</button>
      <ErrorBanner message={!editTrip && !editExpense && !returning ? act.error : ''} />
      <RecordView
        detail={data}
        tripActions={(t) => canEdit && <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => { act.setError(''); setEditTrip(t); }}>แก้ไข</button>}
        expenseActions={(e) => canEdit && <button type="button" className="text-xs text-brand-700" onClick={() => { act.setError(''); setEditExpense(e); }}>แก้ไข/เบิก</button>}
      />

      {status === 'SUBMITTED' && (
        <div className="sticky bottom-3 grid grid-cols-2 gap-2 rounded-2xl bg-white/90 p-2 shadow-lg ring-1 ring-slate-200 backdrop-blur">
          <button type="button" className="btn-secondary text-rose-600" onClick={() => { act.setError(''); setReturning(true); }}>ส่งกลับแก้ไข</button>
          <button type="button" className="btn-primary" disabled={act.busy}
            onClick={async () => { if (window.confirm('ยืนยันรายการนี้? พนักงานจะแก้ไขเองไม่ได้อีก') && await act.run(() => secretaryService.verify(id))) done(); }}>
            ✓ ยืนยัน (Verify)
          </button>
        </div>
      )}

      <section className="card">
        <h2 className="mb-2 font-bold">ประวัติการแก้ไข</h2>
        {!audit.data?.length && <p className="text-sm text-slate-500">ยังไม่มี</p>}
        <ul className="space-y-2 text-sm">
          {audit.data?.map((l) => (
            <li key={l.log_id} className="rounded-lg bg-slate-50 p-2">
              <b>{l.action}</b> · {l.actor_role} · {thaiDateTime(l.created_at)}
              {l.reason && <p className="text-slate-600">เหตุผล: {l.reason}</p>}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-400">ประวัติการแก้ไขรายเที่ยวดูได้ที่เมนู Audit History</p>
      </section>

      <Modal open={Boolean(editTrip)} title="แก้ไขเที่ยว (Secretary)" onClose={() => setEditTrip(null)}>
        {editTrip && (
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            if (await act.run(() => secretaryService.editTrip(editTrip.trip_id, { ...formBody(e), updated_at: editTrip.updated_at }))) done();
          }}>
            <Field label="ประเภท">
              <select name="travel_type" className="input" defaultValue="">
                <option value="">อัตโนมัติตามจังหวัด (ปัจจุบัน: {TRAVEL_TYPE_LABEL[editTrip.travel_type]})</option>
                {Object.entries(TRAVEL_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>กำหนดเอง: {v}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ต้นทาง"><input name="origin" className="input" defaultValue={editTrip.origin} /></Field>
              <Field label="ปลายทาง"><input name="destination" className="input" defaultValue={editTrip.destination} /></Field>
            </div>
            <Field label="จังหวัดปลายทาง" hint="เปลี่ยนจังหวัดแล้วระบบจัดประเภท BASE/UPCOUNTRY ใหม่ให้ (ถ้า Base ตั้งจังหวัดไว้)">
              <select name="destination_province" className="input" defaultValue={editTrip.destination_province || ''}>
                <option value="">— ไม่ระบุ —</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="ระยะทาง (กม.)"><input name="distance_km" type="number" step="0.01" min="0" className="input" defaultValue={editTrip.distance_km} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ลูกค้า"><input name="customer_name" className="input" defaultValue={editTrip.customer_name} /></Field>
              <Field label="เลขใบงาน"><input name="ticket_no" className="input" defaultValue={editTrip.ticket_no} /></Field>
            </div>
            <Field label="ประเภทงาน">
              <select name="job_type" className="input" defaultValue={editTrip.job_type || ''}>
                <option value="">— ไม่ระบุ —</option>
                {Object.entries(JOB_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="เหตุผลการแก้ไข (จำเป็น)"><textarea name="reason" required rows={2} className="input" /></Field>
            <ErrorBanner message={act.error} />
            <button type="submit" className="btn-primary w-full" disabled={act.busy}>บันทึกการแก้ไข</button>
          </form>
        )}
      </Modal>

      <Modal open={Boolean(editExpense)} title="แก้ไขค่าใช้จ่าย / สถานะเบิก" onClose={() => setEditExpense(null)}>
        {editExpense && (
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            if (await act.run(() => secretaryService.editExpense(editExpense.expense_id, formBody(e)))) done();
          }}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ประเภท">
                <select name="expense_type" className="input" defaultValue={editExpense.expense_type}>
                  {Object.entries(EXPENSE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="จำนวนเงิน"><input name="amount" type="number" step="0.01" min="0" className="input" defaultValue={editExpense.amount} /></Field>
              <Field label="สถานะใบเสร็จ">
                <select name="receipt_status" className="input" defaultValue={editExpense.receipt_status}>
                  {Object.entries(RECEIPT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="สถานะการเบิก">
                <select name="reimbursement_status" className="input" defaultValue={editExpense.reimbursement_status}>
                  {Object.entries(REIMBURSE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            </div>
            <Field label="ยอดที่จ่ายคืนจริง" hint="เว้นว่าง = จ่ายคืนเต็มจำนวน">
              <input name="reimbursed_amount" type="number" step="0.01" min="0" className="input" defaultValue={editExpense.reimbursed_amount} />
            </Field>
            <Field label="เหตุผล (จำเป็น)"><textarea name="reason" required rows={2} className="input" /></Field>
            <ErrorBanner message={act.error} />
            <button type="submit" className="btn-primary w-full" disabled={act.busy}>บันทึก</button>
          </form>
        )}
      </Modal>

      <ReasonModal open={returning} title="ส่งกลับให้พนักงานแก้ไข" danger confirmLabel="ส่งกลับ" busy={act.busy} error={act.error}
        onClose={() => setReturning(false)}
        onConfirm={async (reason) => { if (await act.run(() => secretaryService.returnRecord(id, reason))) done(); }} />
    </div>
  );
}
