import { useState } from 'react';
import { ErrorBanner, PageHeader, Spinner } from '../../components/common';
import { useAsync } from '../../hooks/useAsync';
import { adminService, secretaryService } from '../../services';
import { thaiDateTime } from '../../utils/format';

const ENTITY_TYPES = ['', 'DAILY_RECORD', 'TRIP', 'EXPENSE', 'MONTHLY_ACTUAL', 'USER', 'BASE', 'POLICY', 'SETTING'];

function JsonCell({ value }) {
  if (!value) return <span className="text-slate-300">-</span>;
  try {
    const obj = JSON.parse(value);
    return (
      <ul className="text-xs">
        {Object.entries(obj).slice(0, 8).map(([k, v]) => <li key={k}><span className="text-slate-500">{k}:</span> {String(typeof v === 'object' ? JSON.stringify(v) : v)}</li>)}
      </ul>
    );
  } catch {
    return <span className="text-xs">{value}</span>;
  }
}

export default function AuditPage({ admin = false }) {
  const [entityType, setEntityType] = useState('');
  const { data, loading, error, reload } = useAsync(
    () => (admin ? adminService.auditLogs({ entity_type: entityType }) : secretaryService.auditLogs({ entity_type: entityType })),
    [entityType, admin]
  );
  return (
    <div>
      <PageHeader title="Audit History" subtitle="ค่าก่อน/หลังแก้ไข ผู้แก้ไข เวลา และเหตุผล" />
      <select className="input mb-3 w-auto" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
        {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t || 'ทุกประเภท'}</option>)}
      </select>
      {loading && <Spinner />}
      <ErrorBanner message={error} onRetry={reload} />
      {data && (
        <div className="card overflow-x-auto p-0">
          <table className="table-base">
            <thead><tr><th>เวลา</th><th>ผู้ทำ</th><th>การกระทำ</th><th>ข้อมูล</th><th>ค่าเดิม</th><th>ค่าใหม่</th><th>เหตุผล</th></tr></thead>
            <tbody>
              {data.map((l) => (
                <tr key={l.log_id}>
                  <td className="whitespace-nowrap text-xs">{thaiDateTime(l.created_at)}</td>
                  <td className="text-xs">{l.actor_role}<br /><span className="text-slate-400">{String(l.actor_id).slice(0, 8)}</span></td>
                  <td className="font-semibold">{l.action}</td>
                  <td className="text-xs">{l.entity_type}<br /><span className="text-slate-400">{String(l.entity_id).slice(0, 8)}</span></td>
                  <td><JsonCell value={l.old_value_json} /></td>
                  <td><JsonCell value={l.new_value_json} /></td>
                  <td className="text-xs">{l.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
