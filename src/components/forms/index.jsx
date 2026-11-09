import { useState } from 'react';
import { ErrorBanner, Field } from '../common';
import { useAction } from '../../hooks/useAsync';
import { expenseService } from '../../services';
import { compressImage, fileToBase64 } from '../../utils/format';
import { EXPENSE_TYPE_LABEL, FUEL_LABEL, TRAVEL_TYPE_LABEL } from '../../utils/labels';

const formData = (e) => Object.fromEntries(new FormData(e.currentTarget).entries());

export function TripForm({ vehicles, initial = {}, onSubmit, onCancel, busy, error }) {
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit(formData(e)); }}>
      <Field label="รถที่ใช้">
        <select name="vehicle_id" className="input" required defaultValue={initial.vehicle_id || vehicles[0]?.vehicle_id}>
          {vehicles.map((v) => <option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_brand} {v.vehicle_model} · {v.license_plate}</option>)}
        </select>
      </Field>
      <Field label="ประเภทการเดินทาง">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(TRAVEL_TYPE_LABEL).map(([k, label]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 rounded-xl p-3 ring-1 ring-slate-300 has-[:checked]:bg-brand-50 has-[:checked]:ring-2 has-[:checked]:ring-brand-600">
              <input type="radio" name="travel_type" value={k} defaultChecked={(initial.travel_type || 'BASE') === k} />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ต้นทาง"><input name="origin" className="input" required maxLength={200} defaultValue={initial.origin} /></Field>
        <Field label="ปลายทาง"><input name="destination" className="input" required maxLength={200} defaultValue={initial.destination} /></Field>
      </div>
      <Field label="ระยะทางจริง (กม.)" hint="ทศนิยมได้ 2 ตำแหน่ง">
        <input name="distance_km" type="number" inputMode="decimal" step="0.01" min="0" max="5000" className="input" required defaultValue={initial.distance_km} />
      </Field>
      <details className="rounded-xl bg-slate-50 p-3 text-sm" open={Boolean(initial.odometer_start)}>
        <summary className="cursor-pointer text-slate-600">เลขไมล์ (ไม่บังคับ)</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="เริ่มต้น"><input name="odometer_start" type="number" inputMode="decimal" step="0.1" min="0" className="input" defaultValue={initial.odometer_start} /></Field>
          <Field label="สิ้นสุด"><input name="odometer_end" type="number" inputMode="decimal" step="0.1" min="0" className="input" defaultValue={initial.odometer_end} /></Field>
        </div>
      </details>
      <Field label="หมายเหตุ"><textarea name="note" rows={2} className="input" maxLength={1000} defaultValue={initial.note} /></Field>
      <ErrorBanner message={error} />
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>ยกเลิก</button>}
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'กำลังบันทึก...' : 'บันทึกเที่ยว'}</button>
      </div>
    </form>
  );
}

export function ExpenseForm({ onSubmit, onCancel, busy, error }) {
  const [receipt, setReceipt] = useState(null);
  const upload = useAction();

  async function pickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await upload.run(async () => {
      const small = await compressImage(file);
      if (small.size > 3 * 1024 * 1024) throw new Error('ไฟล์ใหญ่เกิน 3 MB');
      return expenseService.uploadReceipt({ file_name: small.name, mime_type: small.type, data_base64: await fileToBase64(small) });
    });
    if (res) setReceipt(res);
  }

  return (
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ ...formData(e), receipt: undefined, ...(receipt ? { receipt_file_id: receipt.receipt_file_id, receipt_name: receipt.receipt_name, receipt_mime: receipt.receipt_mime } : {}) });
    }}>
      <Field label="ประเภทค่าใช้จ่าย">
        <select name="expense_type" className="input" required>
          {Object.entries(EXPENSE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="จำนวนเงิน (บาท)">
        <input name="amount" type="number" inputMode="decimal" step="0.01" min="0" className="input" required />
      </Field>
      <Field label="ใบเสร็จ" hint="ถ่ายรูปหรือเลือกไฟล์ (JPG/PNG/PDF) — เก็บแบบ Private">
        <input name="receipt" type="file" accept="image/*,application/pdf" capture="environment" className="block w-full text-sm" onChange={pickFile} disabled={upload.busy} />
        {upload.busy && <span className="mt-1 block text-xs text-slate-500">กำลังอัปโหลด...</span>}
        {receipt && <span className="mt-1 block text-xs text-emerald-700">✓ แนบ {receipt.receipt_name} แล้ว</span>}
      </Field>
      <ErrorBanner message={upload.error} />
      <Field label="หมายเหตุ"><input name="note" className="input" maxLength={1000} /></Field>
      <ErrorBanner message={error} />
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>ยกเลิก</button>
        <button type="submit" className="btn-primary" disabled={busy || upload.busy}>บันทึกค่าใช้จ่าย</button>
      </div>
    </form>
  );
}

export function VehicleForm({ initial = {}, onSubmit, onCancel, busy, error }) {
  const [fuel, setFuel] = useState(initial.fuel_type || 'GASOHOL_95');
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit(formData(e)); }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ยี่ห้อ"><input name="vehicle_brand" className="input" required defaultValue={initial.vehicle_brand} /></Field>
        <Field label="รุ่น"><input name="vehicle_model" className="input" required defaultValue={initial.vehicle_model} /></Field>
      </div>
      <Field label="ทะเบียนรถ"><input name="license_plate" className="input" required defaultValue={initial.license_plate} placeholder="1กข 1234 กรุงเทพฯ" /></Field>
      <Field label="ชนิดน้ำมัน">
        <select name="fuel_type" className="input" value={fuel} onChange={(e) => setFuel(e.target.value)}>
          {Object.entries(FUEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      {fuel === 'OTHER' && (
        <Field label="ระบุชนิดน้ำมัน"><input name="other_fuel_type" className="input" required defaultValue={initial.other_fuel_type} /></Field>
      )}
      <ErrorBanner message={error} />
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>ยกเลิก</button>
        <button type="submit" className="btn-primary" disabled={busy}>บันทึก</button>
      </div>
    </form>
  );
}

/** ปุ่มเปิดใบเสร็จ — ดึงผ่าน Backend พร้อม token (ไม่มีลิงก์ Public) */
export function ReceiptButton({ fileId, name }) {
  const a = useAction();
  if (!fileId) return null;
  return (
    <button type="button" className="text-xs font-semibold text-brand-700 underline" disabled={a.busy}
      onClick={() => {
        // เปิดหน้าต่างทันทีตอนกด (กัน popup blocker บน iOS) แล้วค่อยใส่ไฟล์เมื่อโหลดเสร็จ
        const win = window.open('', '_blank');
        a.run(async () => {
          const { blob } = await expenseService.receiptBlob(fileId);
          const url = URL.createObjectURL(blob);
          if (win) win.location.href = url; else window.location.href = url;
          return true;
        }).then((ok) => { if (!ok && win) win.close(); });
      }}>
      {a.busy ? 'กำลังเปิด...' : `ดูใบเสร็จ${name ? ` (${name})` : ''}`}
      {a.error && <span className="ml-1 text-rose-600">{a.error}</span>}
    </button>
  );
}
