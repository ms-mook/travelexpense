import { ErrorBanner, PageHeader, Spinner } from '../../components/common';
import { useAction, useAsync } from '../../hooks/useAsync';
import { adminService } from '../../services';

const HELP = {
  MAX_RECEIPT_SIZE_MB: 'ไม่ควรเกิน 3 (Vercel จำกัดขนาด request ~4.5MB และ base64 ทำให้ไฟล์โตขึ้น ~33%)',
  REPORT_STATUSES: 'สถานะที่นับในรายงานผู้บริหาร เช่น VERIFIED หรือ SUBMITTED,VERIFIED',
  INCLUDE_TRIP_EXPENSES_IN_ACTUAL: 'TRUE = รวมค่าทางด่วน/จอดรถรายเที่ยวใน Actual Operating Cost แล้วหักยอดที่จ่ายคืน',
  ALLOWANCE_DAY_RULE: 'UPCOUNTRY_IF_ANY = วันที่มีเที่ยว Upcountry อย่างน้อย 1 เที่ยว ใช้อัตรา Upcountry',
  MONTHLY_CLOSING_DAY: 'วันที่ของเดือนถัดไปที่ต้องส่งข้อมูลครบ'
};

export default function SettingsPage() {
  const { data, loading, error, reload } = useAsync(() => adminService.settings(), []);
  const act = useAction();
  return (
    <div className="max-w-2xl">
      <PageHeader title="ตั้งค่าระบบ" subtitle="ทุกการเปลี่ยนแปลงบันทึกใน Audit Log" />
      {loading && <Spinner />}
      <ErrorBanner message={error || act.error} onRetry={error ? reload : undefined} />
      <div className="space-y-2">
        {data && Object.entries(data).map(([k, v]) => (
          <form key={k} className="card flex flex-wrap items-end gap-2" onSubmit={async (e) => {
            e.preventDefault();
            if (await act.run(() => adminService.updateSetting(k, { Value: new FormData(e.currentTarget).get('Value') }))) reload();
          }}>
            <label className="min-w-0 flex-1">
              <span className="label font-mono text-xs">{k}</span>
              <input name="Value" className="input" defaultValue={v} />
              {HELP[k] && <span className="mt-1 block text-xs text-slate-400">{HELP[k]}</span>}
            </label>
            <button type="submit" className="btn-secondary" disabled={act.busy}>บันทึก</button>
          </form>
        ))}
      </div>
    </div>
  );
}
