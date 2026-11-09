import { useState } from 'react';
import { ErrorBanner, Field } from '../common';
import { useAction } from '../../hooks/useAsync';
import { expenseService, mapsService } from '../../services';
import { JOB_TYPES, PROVINCES, classifyTravelType, googleMapsDirUrl, parseProvinces } from '../../../shared/provinces';
import { compressImage, fileToBase64 } from '../../utils/format';
import { EXPENSE_TYPE_LABEL, FUEL_LABEL, TRAVEL_TYPE_LABEL } from '../../utils/labels';

const formData = (e) => Object.fromEntries(new FormData(e.currentTarget).entries());

const isTrue = (v) => v === true || String(v).toUpperCase() === 'TRUE';

function HomeToggle({ label, active, disabled, onClick }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm ring-1 disabled:opacity-40 ${active ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-700 ring-slate-300'}`}>
      {label}{active ? ' ✓' : ''}
    </button>
  );
}

/** หัวข้อของแต่ละส่วนในฟอร์ม */
function Section({ n, title, hint, children }) {
  return (
    <section className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-xs text-white">{n}</span>
        {title}
      </p>
      {hint && <p className="-mt-1 mb-2 text-xs text-slate-500">{hint}</p>}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/**
 * ฟอร์มเที่ยวเดินทาง แบ่ง 4 ส่วน: ไปไหน → ไปทำอะไร → ระยะทาง → รถ/อื่น ๆ
 * ประเภท BASE/UPCOUNTRY คำนวณจากจังหวัดปลายทาง (Backend ตรวจซ้ำ)
 */
export function TripForm({ vehicles, initial = {}, defaultOrigin = '', homeLocation = '', isFirstTrip = false, baseName = '', baseProvinces = '', mapsAvailable = false,
  onSubmit, onCancel, busy, error }) {
  const startFromHome = initial.trip_id ? isTrue(initial.origin_is_home) : (isFirstTrip && Boolean(homeLocation));
  const [originHome, setOriginHome] = useState(startFromHome);
  const [destHome, setDestHome] = useState(isTrue(initial.destination_is_home));
  const [origin, setOrigin] = useState(initial.origin ?? (startFromHome ? homeLocation : defaultOrigin));
  const [destination, setDestination] = useState(initial.destination || '');
  const [province, setProvince] = useState(initial.destination_province || '');
  const [distance, setDistance] = useState(initial.distance_km ?? '');
  const [manualType, setManualType] = useState(initial.travel_type || 'BASE');
  const maps = useAction();
  const [mapsKm, setMapsKm] = useState(null);
  const auto = classifyTravelType(baseProvinces, province);
  const hasBaseProvinces = parseProvinces(baseProvinces).length > 0;
  const travelType = hasBaseProvinces ? auto : manualType;
  const mapsUrl = googleMapsDirUrl(origin, destination, province);

  async function calcDistance() {
    const r = await maps.run(() => mapsService.distance(origin, destination, province));
    if (r?.distance_km) { setMapsKm(r.distance_km); if (!distance) setDistance(r.distance_km); }
    else if (r) maps.setError('Google Maps หาเส้นทางไม่เจอ ลองระบุปลายทางให้ชัดขึ้น หรือกรอกระยะเอง');
  }

  return (
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      const body = formData(e);
      if (!hasBaseProvinces) body.travel_type = manualType;
      onSubmit(body);
    }}>
      <Section n="1" title="ไปไหน" hint="ต้นทางเที่ยวแรกของวันมักเป็นบ้านหรือสำนักงาน เที่ยวถัดไประบบเติมจากปลายทางเที่ยวก่อนให้">
        <input type="hidden" name="origin_is_home" value={String(originHome)} />
        <input type="hidden" name="destination_is_home" value={String(destHome)} />
        <div className="grid grid-cols-2 gap-2">
          <HomeToggle label="🏠 ออกจากบ้าน" active={originHome} disabled={!homeLocation && !originHome}
            onClick={() => { const v = !originHome; setOriginHome(v); if (v && homeLocation) setOrigin(homeLocation); }} />
          <HomeToggle label="🏠 กลับบ้าน" active={destHome} disabled={!homeLocation && !destHome}
            onClick={() => { const v = !destHome; setDestHome(v); if (v && homeLocation) setDestination(homeLocation); }} />
        </div>
        {!homeLocation && <p className="text-xs text-slate-500">ตั้ง “ที่พักอาศัย” ในหน้าโปรไฟล์ เพื่อใช้ปุ่มออกจากบ้าน/กลับบ้าน — ช่วยวัดว่าระยะขาไป-กลับบ้านทำให้เบี้ยเลี้ยงไม่พอแค่ไหน</p>}
        <Field label="ต้นทาง">
          <input name="origin" className="input" required maxLength={200} value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="เช่น สำนักงาน Sysmex ขอนแก่น" />
        </Field>
        <Field label="ปลายทาง (ชื่อสถานที่)">
          <input name="destination" className="input" required maxLength={200} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="เช่น โรงพยาบาลศรีนครินทร์" />
        </Field>
        <Field label="จังหวัดปลายทาง">
          <select name="destination_province" className="input" required={hasBaseProvinces} value={province} onChange={(e) => setProvince(e.target.value)}>
            <option value="">— เลือกจังหวัด —</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        {hasBaseProvinces ? (
          travelType && (
            <div className={`rounded-xl p-3 text-sm ${travelType === 'BASE' ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'}`}>
              {travelType === 'BASE'
                ? <>✓ <b>ในเขต Base {baseName}</b> · ค่าทางด่วน/จอดรถรวมอยู่ในเบี้ยเลี้ยงรายวันแล้ว</>
                : <>↗ <b>นอก Base (Upcountry)</b> · ได้เบี้ยเลี้ยงต่างจังหวัดแทน และค่าใช้จ่ายเบิกผ่าน SAP Concur</>}
            </div>
          )
        ) : (
          <Field label="ประเภทการเดินทาง" hint="Base นี้ยังไม่ได้ตั้งจังหวัด — กรุณาเลือกเอง">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TRAVEL_TYPE_LABEL).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setManualType(k)}
                  className={`rounded-xl p-3 text-sm ring-1 ${manualType === k ? 'bg-brand-50 ring-2 ring-brand-600' : 'ring-slate-300'}`}>{label}</button>
              ))}
            </div>
          </Field>
        )}
      </Section>

      <Section n="2" title="ไปทำอะไร" hint="ใช้วิเคราะห์ต้นทุนต่องานและต่อลูกค้า (ไม่บังคับ แต่แนะนำให้กรอก)">
        <Field label="ลูกค้า / หน่วยงาน">
          <input name="customer_name" className="input" maxLength={200} defaultValue={initial.customer_name} placeholder="เช่น รพ.ขอนแก่น — ห้องแล็บ" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ประเภทงาน">
            <select name="job_type" className="input" defaultValue={initial.job_type || ''}>
              <option value="">— ไม่ระบุ —</option>
              {Object.entries(JOB_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="เลขใบงาน / Ticket">
            <input name="ticket_no" className="input" maxLength={60} defaultValue={initial.ticket_no} placeholder="เช่น SR-240115" />
          </Field>
        </div>
      </Section>

      <Section n="3" title="ระยะทาง" hint="อ้างอิงระยะตาม Google Maps — Secretary จะตรวจเทียบกับเส้นทางนี้">
        <div className="flex flex-wrap gap-2">
          <a href={mapsUrl} target="_blank" rel="noreferrer"
            className={`btn-secondary px-3 py-2 text-xs ${destination ? '' : 'pointer-events-none opacity-50'}`}>🗺 เปิดเส้นทางใน Google Maps</a>
          {mapsAvailable && (
            <button type="button" className="btn-secondary px-3 py-2 text-xs" disabled={!origin || !destination || maps.busy} onClick={calcDistance}>
              {maps.busy ? 'กำลังคำนวณ...' : '⚡ ให้ระบบคำนวณระยะ'}
            </button>
          )}
        </div>
        {mapsKm && <p className="text-xs text-slate-600">Google Maps: <b>{mapsKm} กม.</b></p>}
        <ErrorBanner message={maps.error} />
        <Field label="ระยะทางจริงที่ขับ (กม.)" hint="ขับเที่ยวเดียว ถ้าขับกลับให้เพิ่มเป็นอีกเที่ยว · ทศนิยมได้ 2 ตำแหน่ง">
          <input name="distance_km" type="number" inputMode="decimal" step="0.01" min="0" max="5000" className="input" required
            value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="เช่น 24.5" />
        </Field>
      </Section>

      <Section n="4" title="รถและรายละเอียดอื่น">
        <Field label="รถที่ใช้">
          <select name="vehicle_id" className="input" required defaultValue={initial.vehicle_id || vehicles[0]?.vehicle_id}>
            {vehicles.map((v) => <option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_brand} {v.vehicle_model} · {v.license_plate}</option>)}
          </select>
        </Field>
        <details className="rounded-xl bg-white p-3 text-sm ring-1 ring-slate-200" open={Boolean(initial.odometer_start)}>
          <summary className="cursor-pointer text-slate-600">เลขไมล์ (ไม่บังคับ)</summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="เริ่มต้น"><input name="odometer_start" type="number" inputMode="decimal" step="0.1" min="0" className="input" defaultValue={initial.odometer_start} /></Field>
            <Field label="สิ้นสุด"><input name="odometer_end" type="number" inputMode="decimal" step="0.1" min="0" className="input" defaultValue={initial.odometer_end} /></Field>
          </div>
        </details>
        <Field label="หมายเหตุ"><textarea name="note" rows={2} className="input" maxLength={1000} defaultValue={initial.note} /></Field>
      </Section>

      <ErrorBanner message={error} />
      <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 bg-white px-1 pb-1 pt-2">
        {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>ยกเลิก</button>}
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'กำลังบันทึก...' : 'บันทึกเที่ยว'}</button>
      </div>
    </form>
  );
}

export function ExpenseForm({ travelType, receiptsEnabled = false, onSubmit, onCancel, busy, error }) {
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
      <p className={`rounded-xl p-3 text-xs ${travelType === 'BASE' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
        {travelType === 'BASE'
          ? 'เที่ยวในเขต Base: ค่าใช้จ่ายนี้รวมอยู่ในเบี้ยเลี้ยงรายวันแล้ว (ไม่เบิกแยก) — บันทึกไว้เพื่อวิเคราะห์ว่าเบี้ยเลี้ยงพอหรือไม่'
          : 'เที่ยวนอก Base: บันทึกไว้เพื่อติดตามการเบิกผ่าน SAP Concur — Secretary จะอัปเดตสถานะเมื่อได้รับเงินคืน'}
      </p>
      <Field label="ประเภทค่าใช้จ่าย">
        <select name="expense_type" className="input" required>
          {Object.entries(EXPENSE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="จำนวนเงิน (บาท)">
        <input name="amount" type="number" inputMode="decimal" step="0.01" min="0" className="input" required />
      </Field>
      {receiptsEnabled ? (
        <Field label="ใบเสร็จ" hint="ถ่ายรูปหรือเลือกไฟล์ (JPG/PNG/PDF) — เก็บแบบ Private">
          <input name="receipt" type="file" accept="image/*,application/pdf" capture="environment" className="block w-full text-sm" onChange={pickFile} disabled={upload.busy} />
          {upload.busy && <span className="mt-1 block text-xs text-slate-500">กำลังอัปโหลด...</span>}
          {receipt && <span className="mt-1 block text-xs text-emerald-700">✓ แนบ {receipt.receipt_name} แล้ว</span>}
        </Field>
      ) : (
        <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-600">📎 การแนบรูปใบเสร็จจะเปิดใช้เร็ว ๆ นี้ — ตอนนี้บันทึกยอดเงินไว้ก่อน แล้วเก็บใบเสร็จตัวจริงไว้</p>
      )}
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
