import { getDb } from '../db/index.js';
import { nowIso, uuid } from '../lib/utils.js';

/** สร้าง audit entry (ยังไม่เขียน) — ใช้รวมเป็น batch ได้ */
export function auditEntry(ctx, { action, entityType, entityId, oldValue, newValue, reason }) {
  return {
    log_id: uuid(),
    actor_id: ctx.user.employee_id,
    actor_role: ctx.user.role,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_value_json: oldValue ? JSON.stringify(oldValue) : '',
    new_value_json: newValue ? JSON.stringify(newValue) : '',
    reason: reason || '',
    created_at: nowIso()
  };
}

export async function writeAudit(ctx, entry) {
  return getDb().insert('auditLogs', auditEntry(ctx, entry));
}

export async function writeAudits(ctx, entries) {
  return getDb().insertMany('auditLogs', entries.map((e) => auditEntry(ctx, e)));
}

/** เก็บเฉพาะ field ที่เปลี่ยนจริง เพื่อให้ old/new อ่านง่าย */
export function diff(before, after) {
  const oldV = {};
  const newV = {};
  for (const k of Object.keys(after)) {
    if (k === 'updated_at') continue;
    if (String(before[k] ?? '') !== String(after[k] ?? '')) { oldV[k] = before[k] ?? ''; newV[k] = after[k]; }
  }
  return { oldV, newV, changed: Object.keys(newV).length > 0 };
}

export async function listAuditLogs({ entityType, entityId, actorId, limit = 200 } = {}) {
  const rows = await getDb().list('auditLogs');
  return rows
    .filter((r) => (!entityType || r.entity_type === entityType) && (!entityId || r.entity_id === entityId) &&
      (!actorId || r.actor_id === actorId))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit);
}
