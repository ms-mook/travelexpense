import { useState } from 'react';
import { EmptyState, ErrorBanner, Modal, Spinner } from '../../components/common';
import { VehicleForm } from '../../components/forms';
import { useAuth } from '../../contexts/AuthContext';
import { useAction, useAsync } from '../../hooks/useAsync';
import { authService, tripService, vehicleService } from '../../services';
import { supabase } from '../../config/supabase';
import { thaiDate } from '../../utils/format';
import { FUEL_LABEL, ROLE_LABEL } from '../../utils/labels';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const vehicles = useAsync(() => vehicleService.list(true), []);
  const history = useAsync(() => tripService.baseHistory(), []);
  const bases = useAsync(() => authService.bases(), []);
  const [modal, setModal] = useState(null);
  const act = useAction();
  const baseName = (id) => bases.data?.find((b) => b.base_id === id)?.base_name || '-';

  async function save(form) {
    const ok = await act.run(() => (modal.vehicle_id ? vehicleService.update(modal.vehicle_id, form) : vehicleService.create(form)));
    if (ok) { setModal(null); vehicles.reload(); }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="text-lg font-bold">{user.full_name}</p>
        <p className="font-mono text-sm text-slate-500">@{user.username}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-slate-500">รหัสพนักงาน</dt><dd>{user.employee_code || '-'}</dd>
          <dt className="text-slate-500">ตำแหน่ง</dt><dd>{user.position || '-'}</dd>
          <dt className="text-slate-500">สิทธิ์</dt><dd>{ROLE_LABEL[user.role]}</dd>
          <dt className="text-slate-500">Base ปัจจุบัน</dt><dd className="font-semibold">{user.base_name || '-'}</dd>
        </dl>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">รถของฉัน</h2>
          <button type="button" className="btn-primary px-3 py-1.5" onClick={() => { act.setError(''); setModal({}); }}>+ เพิ่มรถ</button>
        </div>
        {vehicles.loading && <Spinner />}
        <ErrorBanner message={vehicles.error} />
        {vehicles.data && !vehicles.data.length && <EmptyState title="ยังไม่มีรถ">เพิ่มรถอย่างน้อย 1 คันก่อนบันทึกการเดินทาง</EmptyState>}
        <ul className="space-y-2">
          {vehicles.data?.map((v) => (
            <li key={v.vehicle_id} className={`card flex items-center justify-between ${v.active ? '' : 'opacity-50'}`}>
              <div>
                <p className="font-semibold">{v.vehicle_brand} {v.vehicle_model}</p>
                <p className="text-sm text-slate-500">{v.license_plate} · {v.fuel_type === 'OTHER' ? v.other_fuel_type : FUEL_LABEL[v.fuel_type]}</p>
              </div>
              <div className="flex gap-1">
                <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => { act.setError(''); setModal(v); }}>แก้ไข</button>
                <button type="button" className="btn-ghost px-2 py-1 text-xs"
                  onClick={async () => { if (await act.run(() => vehicleService.update(v.vehicle_id, { active: !v.active }))) vehicles.reload(); }}>
                  {v.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {history.data?.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-bold">ประวัติ Base</h2>
          <ul className="space-y-1 text-sm">
            {history.data.map((h) => (
              <li key={h.assignment_id}>{baseName(h.base_id)} · {thaiDate(h.effective_from)} – {h.effective_to ? thaiDate(h.effective_to) : 'ปัจจุบัน'}</li>
            ))}
          </ul>
        </section>
      )}

      <ChangePassword />

      <button type="button" className="btn-secondary w-full" onClick={signOut}>ออกจากระบบ</button>

      <Modal open={Boolean(modal)} title={modal?.vehicle_id ? 'แก้ไขรถ' : 'เพิ่มรถ'} onClose={() => setModal(null)}>
        {modal && <VehicleForm initial={modal} onSubmit={save} onCancel={() => setModal(null)} busy={act.busy} error={act.error} />}
      </Modal>
    </div>
  );
}

/** เปลี่ยนรหัสผ่านของตนเอง (ไม่มีรีเซ็ตทางอีเมล — ลืมรหัสให้ติดต่อ Admin) */
export function ChangePassword() {
  const act = useAction();
  const [done, setDone] = useState(false);
  return (
    <form className="card space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const pw = String(f.get('password'));
      setDone(false);
      const ok = await act.run(async () => {
        if (pw.length < 8) throw new Error('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
        if (pw !== f.get('confirm')) throw new Error('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
        const { error } = await supabase.auth.updateUser({ password: pw });
        if (error) throw new Error(error.message);
        return true;
      });
      if (ok) { setDone(true); e.currentTarget?.reset?.(); }
    }}>
      <h2 className="font-bold">เปลี่ยนรหัสผ่าน</h2>
      <input name="password" type="password" autoComplete="new-password" className="input" placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)" required />
      <input name="confirm" type="password" autoComplete="new-password" className="input" placeholder="ยืนยันรหัสผ่านใหม่" required />
      <ErrorBanner message={act.error} />
      {done && <p className="text-sm text-emerald-700">เปลี่ยนรหัสผ่านแล้ว</p>}
      <button type="submit" className="btn-secondary w-full" disabled={act.busy}>บันทึกรหัสผ่านใหม่</button>
    </form>
  );
}
