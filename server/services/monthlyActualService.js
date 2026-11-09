/** ค่าใช้จ่ายจริงรายเดือน (Fuel / Maintenance / Vehicle Wear / Other) */
import { getDb } from '../db/index.js';
import { RECORD_STATUS } from '../db/schema.js';
import { computeActualTotal } from '../domain/calculations.js';
import { employeeCanEdit, nextStatus } from '../domain/workflow.js';
import { invalidState, notFound } from '../lib/errors.js';
import { nowIso, round2, todayTH, uuid } from '../lib/utils.js';
import { assertOwner } from '../middleware/auth.js';
import { writeAudit } from './auditService.js';

const COST_FIELDS = ['fuel_cost', 'maintenance_cost', 'vehicle_wear_cost', 'other_cost'];

export async function listMyMonthlyActuals(ctx) {
  const rows = await getDb().list('monthlyActuals');
  return rows.filter((r) => r.employee_id === ctx.user.employee_id)
    .sort((a, b) => String(b.month).localeCompare(String(a.month)));
}

/** สร้างหรือแก้ไขของเดือนนั้น (1 พนักงาน : 1 แถว / เดือน) — actual_total คำนวณฝั่ง Backend */
export async function upsertMonthlyActual(ctx, input) {
  if (input.month > todayTH().slice(0, 7)) throw invalidState('บันทึกล่วงหน้าไม่ได้');
  const db = getDb();
  const existing = (await db.list('monthlyActuals'))
    .find((r) => r.employee_id === ctx.user.employee_id && r.month === input.month);
  const costs = Object.fromEntries(COST_FIELDS.map((k) => [k, round2(input[k] ?? existing?.[k] ?? 0)]));
  const ts = nowIso();
  if (existing) {
    if (!employeeCanEdit(existing.status)) throw invalidState(`รายการเดือน ${input.month} สถานะ ${existing.status} แก้ไขไม่ได้`);
    return db.update('monthlyActuals', existing.monthly_actual_id, {
      ...costs, actual_total: computeActualTotal(costs), note: input.note ?? existing.note, updated_at: ts
    }, { expectedUpdatedAt: input.updated_at });
  }
  const row = {
    monthly_actual_id: uuid(), employee_id: ctx.user.employee_id, month: input.month, ...costs,
    actual_total: computeActualTotal(costs), note: input.note || '', secretary_note: '', status: RECORD_STATUS.DRAFT,
    submitted_at: '', verified_by: '', verified_at: '', created_at: ts, updated_at: ts
  };
  await db.insert('monthlyActuals', row);
  return row;
}

export async function submitMonthlyActual(ctx, id) {
  const db = getDb();
  const r = await db.get('monthlyActuals', id);
  if (!r) throw notFound();
  assertOwner(ctx, r.employee_id);
  const status = nextStatus('submit', r.status);
  const row = await db.update('monthlyActuals', id, { status, submitted_at: nowIso(), updated_at: nowIso() });
  await writeAudit(ctx, { action: 'SUBMIT', entityType: 'MONTHLY_ACTUAL', entityId: id,
    oldValue: { status: r.status }, newValue: { status } });
  return row;
}

export { COST_FIELDS };
