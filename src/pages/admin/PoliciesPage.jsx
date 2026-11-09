import { useState } from 'react';
import { ErrorBanner, Field, Modal, PageHeader, Spinner } from '../../components/common';
import { useAction, useAsync } from '../../hooks/useAsync';
import { adminService } from '../../services';
import { money, thaiDate } from '../../utils/format';
import { ALLOWANCE_TYPE_LABEL } from '../../utils/labels';

export default function PoliciesPage() {
  const { data, loading, error, reload } = useAsync(() => adminService.policies(), []);
  const bases = useAsync(() => adminService.bases(), []);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(null);
  const act = useAction();
  const baseName = (id) => (id ? bases.data?.find((b) => b.base_id === id)?.base_name || id : 'ทุก Base (นโยบายกลาง)');
  const fd = (e) => Object.fromEntries([...new FormData(e.currentTarget).entries()].filter(([, v]) => v !== ''));

  return (
    <div>
      <PageHeader title="นโยบายเบี้ยเลี้ยงและอัตรา"
        subtitle="เปลี่ยนอัตรา = ปิดนโยบายเดิม (Effective To) แล้วสร้างใหม่ เพื่อให้คำนวณย้อนหลังถูกต้อง"
        action={<button type="button" className="btn-primary" onClick={() => { act.setError(''); setOpen(true); }}>+ นโยบายใหม่</button>} />
      {loading && <Spinner />}
      <ErrorBanner message={error || (!open && !closing ? act.error : '')} onRetry={error ? reload : undefined} />
      {data && (
        <div className="card overflow-x-auto p-0">
          <table className="table-base">
            <thead><tr><th>ชื่อ</th><th>ประเภท</th><th>Base</th><th className="text-right">อัตรา</th><th>มีผล</th><th>สถานะ</th><th /></tr></thead>
            <tbody>
              {[...data].sort((a, b) => String(b.effective_from).localeCompare(String(a.effective_from))).map((p) => (
                <tr key={p.policy_id} className={p.status === 'INACTIVE' ? 'opacity-50' : ''}>
                  <td>{p.policy_name}</td>
                  <td>{ALLOWANCE_TYPE_LABEL[p.allowance_type]}</td>
                  <td>{baseName(p.base_id)}</td>
                  <td className="text-right tabular-nums">{money(p.allowance_amount)}{p.allowance_type === 'PER_KM_REIMBURSE' ? '/กม.' : '/วัน'}</td>
                  <td className="whitespace-nowrap text-xs">{thaiDate(p.effective_from)} – {p.effective_to ? thaiDate(p.effective_to) : 'ไม่กำหนด'}</td>
                  <td>{p.status}</td>
                  <td>{!p.effective_to && p.status === 'ACTIVE' && <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => { act.setError(''); setClosing(p); }}>ปิดนโยบาย</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} title="สร้างนโยบาย" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          if (await act.run(() => adminService.createPolicy(fd(e)))) { setOpen(false); reload(); }
        }}>
          <Field label="ชื่อนโยบาย"><input name="policy_name" className="input" required placeholder="เบี้ยเลี้ยง Upcountry 2027" /></Field>
          <Field label="ประเภท">
            <select name="allowance_type" className="input">{Object.entries(ALLOWANCE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </Field>
          <Field label="ใช้กับ Base" hint="เว้นว่าง = ทุก Base (นโยบายเฉพาะ Base มีลำดับเหนือกว่า)">
            <select name="base_id" className="input"><option value="">ทุก Base</option>{bases.data?.map((b) => <option key={b.base_id} value={b.base_id}>{b.base_name}</option>)}</select>
          </Field>
          <Field label="อัตรา (บาท)"><input name="allowance_amount" type="number" step="0.01" min="0" className="input" required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Effective From"><input name="effective_from" type="date" className="input" required /></Field>
            <Field label="Effective To"><input name="effective_to" type="date" className="input" /></Field>
          </div>
          <ErrorBanner message={act.error} />
          <button type="submit" className="btn-primary w-full" disabled={act.busy}>บันทึก</button>
        </form>
      </Modal>

      <Modal open={Boolean(closing)} title={`ปิดนโยบาย — ${closing?.policy_name || ''}`} onClose={() => setClosing(null)}>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          if (await act.run(() => adminService.updatePolicy(closing.policy_id, fd(e)))) { setClosing(null); reload(); }
        }}>
          <Field label="สิ้นสุดผลวันที่"><input name="effective_to" type="date" className="input" required /></Field>
          <Field label="เหตุผล"><input name="reason" className="input" required /></Field>
          <ErrorBanner message={act.error} />
          <button type="submit" className="btn-primary w-full" disabled={act.busy}>ยืนยัน</button>
        </form>
      </Modal>
    </div>
  );
}
