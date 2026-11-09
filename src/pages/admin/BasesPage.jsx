import { useState } from 'react';
import { ErrorBanner, Field, Modal, PageHeader, Spinner } from '../../components/common';
import { useAction, useAsync } from '../../hooks/useAsync';
import { adminService } from '../../services';

export default function BasesPage() {
  const { data, loading, error, reload } = useAsync(() => adminService.bases(), []);
  const [modal, setModal] = useState(null);
  const act = useAction();

  return (
    <div>
      <PageHeader title="Base" subtitle="ขอบเขตของ Base ใช้ประกอบการแยก BASE / UPCOUNTRY"
        action={<button type="button" className="btn-primary" onClick={() => { act.setError(''); setModal({}); }}>+ เพิ่ม Base</button>} />
      {loading && <Spinner />}
      <ErrorBanner message={error} onRetry={reload} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((b) => (
          <div key={b.base_id} className={`card ${b.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
            <div className="flex justify-between">
              <div>
                <p className="font-bold">{b.base_name} <span className="text-xs text-slate-400">{b.base_code}</span></p>
                <p className="text-sm text-slate-500">{[b.district, b.province].filter(Boolean).join(', ')}</p>
              </div>
              <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => { act.setError(''); setModal(b); }}>แก้ไข</button>
            </div>
            {b.description && <p className="mt-2 text-sm">{b.description}</p>}
          </div>
        ))}
      </div>
      <Modal open={Boolean(modal)} title={modal?.base_id ? 'แก้ไข Base' : 'เพิ่ม Base'} onClose={() => setModal(null)}>
        {modal && (
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const body = Object.fromEntries(new FormData(e.currentTarget).entries());
            if (await act.run(() => (modal.base_id ? adminService.updateBase(modal.base_id, body) : adminService.createBase(body)))) { setModal(null); reload(); }
          }}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="รหัส"><input name="base_code" className="input" required defaultValue={modal.base_code} placeholder="BKK" /></Field>
              <Field label="ชื่อ Base"><input name="base_name" className="input" required defaultValue={modal.base_name} placeholder="Bangkok" /></Field>
              <Field label="จังหวัด"><input name="province" className="input" defaultValue={modal.province} /></Field>
              <Field label="อำเภอ/เขต"><input name="district" className="input" defaultValue={modal.district} /></Field>
            </div>
            <Field label="ขอบเขตพื้นที่ / กติกา BASE" hint="เช่น รัศมี 80 กม. จากสำนักงาน หรือรายชื่อจังหวัดที่ถือเป็น BASE">
              <textarea name="description" rows={3} className="input" defaultValue={modal.description} />
            </Field>
            <Field label="สถานะ">
              <select name="status" className="input" defaultValue={modal.status || 'ACTIVE'}><option>ACTIVE</option><option>INACTIVE</option></select>
            </Field>
            <ErrorBanner message={act.error} />
            <button type="submit" className="btn-primary w-full" disabled={act.busy}>บันทึก</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
