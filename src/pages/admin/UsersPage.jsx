import { useState } from 'react';
import { ErrorBanner, Field, Modal, PageHeader, Spinner } from '../../components/common';
import { useAction, useAsync } from '../../hooks/useAsync';
import { adminService } from '../../services';
import { thaiDate, today } from '../../utils/format';
import { ROLE_LABEL } from '../../utils/labels';

const form = (e) => Object.fromEntries([...new FormData(e.currentTarget).entries()].filter(([, v]) => v !== ''));

export default function UsersPage() {
  const users = useAsync(() => adminService.users(), []);
  const bases = useAsync(() => adminService.bases(), []);
  const [modal, setModal] = useState(null); // { type: 'create' | 'edit' | 'base' | 'password', user }
  const [q, setQ] = useState('');
  const act = useAction();
  const history = useAsync(() => (modal?.type === 'base' ? adminService.assignments(modal.user.employee_id) : Promise.resolve([])), [modal?.type, modal?.user?.employee_id]);
  const close = () => setModal(null);
  const open = (type, user) => { act.setError(''); setModal({ type, user }); };
  const done = () => { close(); users.reload(); };
  const baseName = (id) => bases.data?.find((b) => b.base_id === id)?.base_name || '-';
  const list = users.data?.filter((u) => !q || `${u.full_name} ${u.username} ${u.email} ${u.employee_code}`.toLowerCase().includes(q.toLowerCase()));

  const BaseSelect = ({ name = 'base_id', defaultValue, required }) => (
    <select name={name} className="input" defaultValue={defaultValue || ''} required={required}>
      <option value="">— ไม่ระบุ —</option>
      {bases.data?.filter((b) => b.status !== 'INACTIVE').map((b) => <option key={b.base_id} value={b.base_id}>{b.base_name}</option>)}
    </select>
  );

  const ScopeField = ({ defaultValue }) => (
    <Field label="ขอบเขต Base ที่ดูแล (Secretary)" hint="ALL = ทุก Base หรือเลือกหลาย Base">
      <select name="team_scope_multi" multiple className="input h-28" defaultValue={String(defaultValue || '').split(',').filter(Boolean)}>
        <option value="ALL">ALL — ทุก Base</option>
        {bases.data?.map((b) => <option key={b.base_id} value={b.base_id}>{b.base_name}</option>)}
      </select>
    </Field>
  );
  const scopeFrom = (e) => {
    const sel = e.currentTarget.elements.team_scope_multi;
    if (!sel) return undefined;
    const vals = [...sel.selectedOptions].map((o) => o.value);
    return vals.includes('ALL') ? 'ALL' : vals.join(',');
  };

  return (
    <div>
      <PageHeader title="ผู้ใช้งาน" action={<button type="button" className="btn-primary" onClick={() => open('create')}>+ เพิ่มผู้ใช้</button>} />
      <input className="input mb-3 max-w-sm" placeholder="ค้นหาชื่อ / username / รหัส" value={q} onChange={(e) => setQ(e.target.value)} />
      {users.loading && <Spinner />}
      <ErrorBanner message={users.error} onRetry={users.reload} />
      {list && (
        <div className="card overflow-x-auto p-0">
          <table className="table-base">
            <thead><tr><th>ชื่อ</th><th>Username</th><th>Role</th><th>Base</th><th>สถานะ</th><th /></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.employee_id} className={u.status === 'SUSPENDED' ? 'opacity-50' : ''}>
                  <td>{u.full_name}<br /><span className="text-xs text-slate-400">{u.employee_code} · {u.position}</span></td>
                  <td className="font-mono text-xs">{u.username || '-'}</td>
                  <td>{ROLE_LABEL[u.role]}{u.role === 'SECRETARY' && <p className="text-xs text-slate-400">scope: {u.team_scope === 'ALL' ? 'ALL' : String(u.team_scope).split(',').filter(Boolean).map(baseName).join(', ') || '-'}</p>}</td>
                  <td>{u.base_name || '-'}</td>
                  <td>{u.status}</td>
                  <td className="whitespace-nowrap">
                    <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => open('edit', u)}>แก้ไข</button>
                    <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => open('base', u)}>ย้าย Base</button>
                    <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => open('password', u)}>รีเซ็ตรหัส</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal?.type === 'create'} title="เพิ่มผู้ใช้" onClose={close}>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          const body = form(e);
          delete body.team_scope_multi;
          body.team_scope = scopeFrom(e);
          if (await act.run(() => adminService.createUser(body))) done();
        }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ชื่อ-นามสกุล"><input name="full_name" className="input" required /></Field>
            <Field label="รหัสพนักงาน"><input name="employee_code" className="input" /></Field>
            <Field label="Username (ใช้ login)" hint="a-z 0-9 . _ - ยาว 3–30 ตัว"><input name="username" className="input font-mono" required pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,29}" autoCapitalize="none" /></Field>
            <Field label="รหัสผ่านเริ่มต้น" hint="อย่างน้อย 8 ตัวอักษร"><input name="password" type="text" minLength={8} className="input" required /></Field>
            <Field label="อีเมลติดต่อ (ไม่บังคับ)"><input name="email" type="email" className="input" /></Field>
            <Field label="แผนก"><input name="department" className="input" /></Field>
            <Field label="ตำแหน่ง"><input name="position" className="input" /></Field>
            <Field label="Role">
              <select name="role" className="input" defaultValue="EMPLOYEE">
                {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Base"><BaseSelect /></Field>
          </div>
          <ScopeField />
          <ErrorBanner message={act.error} />
          <button type="submit" className="btn-primary w-full" disabled={act.busy}>สร้างบัญชี</button>
        </form>
      </Modal>

      <Modal open={modal?.type === 'edit'} title={`แก้ไข — ${modal?.user?.full_name || ''}`} onClose={close}>
        {modal?.type === 'edit' && (
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const body = form(e);
            delete body.team_scope_multi;
            const scope = scopeFrom(e);
            if (scope !== undefined) body.team_scope = scope;
            if (await act.run(() => adminService.updateUser(modal.user.employee_id, body))) done();
          }}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ชื่อ-นามสกุล"><input name="full_name" className="input" defaultValue={modal.user.full_name} /></Field>
              <Field label="รหัสพนักงาน"><input name="employee_code" className="input" defaultValue={modal.user.employee_code} /></Field>
              <Field label="อีเมลติดต่อ"><input name="email" type="email" className="input" defaultValue={modal.user.email} /></Field>
              <Field label="แผนก"><input name="department" className="input" defaultValue={modal.user.department} /></Field>
              <Field label="ตำแหน่ง"><input name="position" className="input" defaultValue={modal.user.position} /></Field>
              <Field label="Role">
                <select name="role" className="input" defaultValue={modal.user.role}>
                  {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="สถานะ">
                <select name="status" className="input" defaultValue={modal.user.status}>
                  <option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED (ระงับ)</option>
                </select>
              </Field>
            </div>
            <ScopeField defaultValue={modal.user.team_scope} />
            <ErrorBanner message={act.error} />
            <button type="submit" className="btn-primary w-full" disabled={act.busy}>บันทึก</button>
          </form>
        )}
      </Modal>

      <Modal open={modal?.type === 'base'} title={`ย้าย Base — ${modal?.user?.full_name || ''}`} onClose={close}>
        {modal?.type === 'base' && (
          <>
            <ul className="mb-4 space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
              {history.data?.length ? history.data.map((h) => (
                <li key={h.assignment_id}>{baseName(h.base_id)} · {thaiDate(h.effective_from)} – {h.effective_to ? thaiDate(h.effective_to) : 'ปัจจุบัน'}</li>
              )) : <li className="text-slate-500">ยังไม่มีประวัติ</li>}
            </ul>
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              if (await act.run(() => adminService.assignBase({ ...form(e), employee_id: modal.user.employee_id }))) done();
            }}>
              <Field label="Base ใหม่"><BaseSelect required /></Field>
              <Field label="มีผลตั้งแต่วันที่" hint="ประวัติเดิมจะถูกปิดในวันก่อนหน้า"><input name="effective_from" type="date" className="input" defaultValue={today()} required /></Field>
              <ErrorBanner message={act.error} />
              <button type="submit" className="btn-primary w-full" disabled={act.busy}>บันทึกการย้าย</button>
            </form>
          </>
        )}
      </Modal>

      <Modal open={modal?.type === 'password'} title={`รีเซ็ตรหัสผ่าน — ${modal?.user?.full_name || ''}`} onClose={close}>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          if (await act.run(() => adminService.resetPassword(modal.user.employee_id, form(e).password))) { close(); window.alert('รีเซ็ตรหัสผ่านแล้ว แจ้งผู้ใช้ให้เปลี่ยนหลังเข้าสู่ระบบ'); }
        }}>
          <Field label="รหัสผ่านใหม่"><input name="password" type="text" minLength={8} className="input" required /></Field>
          <ErrorBanner message={act.error} />
          <button type="submit" className="btn-primary w-full" disabled={act.busy}>รีเซ็ต</button>
        </form>
      </Modal>
    </div>
  );
}
