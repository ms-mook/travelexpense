/** Secretary: ตรวจสอบ แก้ไขพร้อมเหตุผล ส่งกลับ ยืนยัน — ทุกการเปลี่ยนแปลงบันทึก Audit Log */
import { getDb } from '../db/index.js';
import { calcRecordSummary } from '../domain/recordSummary.js';
import { computeActualTotal } from '../domain/calculations.js';
import { nextStatus, secretaryCanEdit } from '../domain/workflow.js';
import { badRequest, invalidState, notFound } from '../lib/errors.js';
import { nowIso, round2, toBool } from '../lib/utils.js';
import { assertBaseInScope } from '../middleware/auth.js';
import { baseForDate } from './adminService.js';
import { diff, writeAudit } from './auditService.js';
import { COST_FIELDS } from './monthlyActualService.js';
import { resolveTravelType } from './dailyRecordService.js';

const alive = (r) => !toBool(r.is_deleted);
const inScope = (ctx, baseId) => ctx.scope.allBases || ctx.scope.baseIds.includes(baseId);
const requireReason = (reason) => {
  if (!reason || !String(reason).trim()) throw badRequest('กรุณาระบุเหตุผล');
  return String(reason).trim();
};

export async function searchRecords(ctx, q = {}) {
  const db = getDb();
  const [records, trips, expenses, users] = await Promise.all([
    db.list('dailyRecords'), db.list('trips'), db.list('expenses'), db.list('users')
  ]);
  const name = Object.fromEntries(users.map((u) => [u.employee_id, u.full_name]));
  const rows = records.filter((r) => alive(r) && inScope(ctx, r.base_id) &&
    (!q.status || r.status === q.status) && (!q.employee_id || r.employee_id === q.employee_id) &&
    (!q.base_id || r.base_id === q.base_id) && (!q.date_from || r.record_date >= q.date_from) &&
    (!q.date_to || r.record_date <= q.date_to) && r.status !== 'DRAFT');
  rows.sort((a, b) => String(a.submitted_at || a.record_date).localeCompare(String(b.submitted_at || b.record_date)));
  const page = Math.max(1, Number(q.page) || 1);
  const size = Math.min(200, Number(q.page_size) || 50);
  return {
    total: rows.length,
    page,
    page_size: size,
    items: rows.slice((page - 1) * size, page * size).map((r) => ({
      ...r,
      employee_name: name[r.employee_id] || '',
      summary: calcRecordSummary(
        trips.filter((t) => t.daily_record_id === r.daily_record_id && alive(t)),
        expenses.filter((e) => e.daily_record_id === r.daily_record_id && alive(e))
      )
    }))
  };
}

async function loadRecordForSecretary(ctx, id) {
  const r = await getDb().get('dailyRecords', id);
  if (!r || !alive(r)) throw notFound();
  assertBaseInScope(ctx, r.base_id);
  return r;
}

export async function editTrip(ctx, tripId, patch) {
  const reason = requireReason(patch.reason);
  const db = getDb();
  const t = await db.get('trips', tripId);
  if (!t || !alive(t)) throw notFound();
  const r = await loadRecordForSecretary(ctx, t.daily_record_id);
  if (!secretaryCanEdit(r.status)) throw invalidState('แก้ไขได้เฉพาะรายการที่ส่งตรวจแล้ว');
  const allowed = {};
  for (const k of ['travel_type', 'origin', 'destination', 'destination_province', 'distance_km', 'odometer_start',
    'odometer_end', 'note', 'customer_name', 'job_type', 'ticket_no']) {
    if (patch[k] !== undefined) allowed[k] = k === 'distance_km' ? round2(patch[k]) : patch[k];
  }
  // เปลี่ยนจังหวัดแต่ไม่ได้ระบุประเภท → คำนวณใหม่ตามจังหวัดของ Base (Secretary ระบุประเภทเองเพื่อ override ได้)
  if (!allowed.travel_type) delete allowed.travel_type;
  if (allowed.destination_province !== undefined && !patch.travel_type) {
    allowed.travel_type = await resolveTravelType(r, allowed.destination_province, t.travel_type);
  }
  const { oldV, newV, changed } = diff(t, allowed);
  if (!changed) return t;
  const row = await db.update('trips', tripId, { ...allowed, updated_at: nowIso() }, { expectedUpdatedAt: patch.updated_at });
  await writeAudit(ctx, { action: 'SECRETARY_EDIT', entityType: 'TRIP', entityId: tripId, oldValue: oldV, newValue: newV, reason });
  return row;
}

export async function editExpense(ctx, expenseId, patch) {
  const reason = requireReason(patch.reason);
  const db = getDb();
  const e = await db.get('expenses', expenseId);
  if (!e || !alive(e)) throw notFound();
  const r = await loadRecordForSecretary(ctx, e.daily_record_id);
  if (!secretaryCanEdit(r.status)) throw invalidState('แก้ไขได้เฉพาะรายการที่ส่งตรวจแล้ว');
  const allowed = {};
  for (const k of ['expense_type', 'amount', 'receipt_status', 'reimbursement_status', 'reimbursed_amount', 'note']) {
    if (patch[k] !== undefined) allowed[k] = ['amount', 'reimbursed_amount'].includes(k) && patch[k] !== '' ? round2(patch[k]) : patch[k];
  }
  if (allowed.reimbursement_status === 'REIMBURSED' && e.reimbursement_status !== 'REIMBURSED') allowed.reimbursed_at = nowIso();
  const { oldV, newV, changed } = diff(e, allowed);
  if (!changed) return e;
  const row = await db.update('expenses', expenseId, { ...allowed, updated_at: nowIso() });
  await writeAudit(ctx, { action: 'SECRETARY_EDIT', entityType: 'EXPENSE', entityId: expenseId, oldValue: oldV, newValue: newV, reason });
  return row;
}

export async function verifyRecord(ctx, id, { reason } = {}) {
  const r = await loadRecordForSecretary(ctx, id);
  const status = nextStatus('verify', r.status);
  const ts = nowIso();
  const row = await getDb().update('dailyRecords', id, { status, verified_by: ctx.user.employee_id, verified_at: ts, updated_at: ts });
  await writeAudit(ctx, { action: 'VERIFY', entityType: 'DAILY_RECORD', entityId: id,
    oldValue: { status: r.status }, newValue: { status }, reason });
  return row;
}

export async function returnRecord(ctx, id, { reason }) {
  const why = requireReason(reason);
  const r = await loadRecordForSecretary(ctx, id);
  const status = nextStatus('return', r.status);
  const row = await getDb().update('dailyRecords', id, { status, secretary_note: why, updated_at: nowIso() });
  await writeAudit(ctx, { action: 'RETURN', entityType: 'DAILY_RECORD', entityId: id,
    oldValue: { status: r.status }, newValue: { status }, reason: why });
  return row;
}

/* ---------------- Monthly actuals ---------------- */

async function monthlyScopeBase(ma) {
  const db = getDb();
  const [user, assignments] = await Promise.all([db.get('users', ma.employee_id), db.list('baseAssignments')]);
  return { user, baseId: user ? baseForDate(assignments, user, `${ma.month}-01`) : '' };
}

export async function listMonthlyActuals(ctx, q = {}) {
  const db = getDb();
  const [rows, users, assignments] = await Promise.all([db.list('monthlyActuals'), db.list('users'), db.list('baseAssignments')]);
  return rows
    .filter((m) => m.status !== 'DRAFT' && (!q.status || m.status === q.status) && (!q.month || m.month === q.month))
    .map((m) => {
      const u = users.find((x) => x.employee_id === m.employee_id);
      return { ...m, employee_name: u?.full_name || '', base_id: u ? baseForDate(assignments, u, `${m.month}-01`) : '' };
    })
    .filter((m) => inScope(ctx, m.base_id));
}

async function loadMonthly(ctx, id) {
  const m = await getDb().get('monthlyActuals', id);
  if (!m) throw notFound();
  const { baseId } = await monthlyScopeBase(m);
  assertBaseInScope(ctx, baseId);
  return m;
}

export async function editMonthlyActual(ctx, id, patch) {
  const reason = requireReason(patch.reason);
  const m = await loadMonthly(ctx, id);
  if (!secretaryCanEdit(m.status)) throw invalidState('แก้ไขได้เฉพาะรายการที่ส่งตรวจแล้ว');
  const allowed = {};
  for (const k of COST_FIELDS) if (patch[k] !== undefined) allowed[k] = round2(patch[k]);
  const merged = { ...m, ...allowed };
  allowed.actual_total = computeActualTotal(merged);
  const { oldV, newV, changed } = diff(m, allowed);
  if (!changed) return m;
  const row = await getDb().update('monthlyActuals', id, { ...allowed, updated_at: nowIso() });
  await writeAudit(ctx, { action: 'SECRETARY_EDIT', entityType: 'MONTHLY_ACTUAL', entityId: id, oldValue: oldV, newValue: newV, reason });
  return row;
}

export async function verifyMonthlyActual(ctx, id) {
  const m = await loadMonthly(ctx, id);
  const status = nextStatus('verify', m.status);
  const ts = nowIso();
  const row = await getDb().update('monthlyActuals', id, { status, verified_by: ctx.user.employee_id, verified_at: ts, updated_at: ts });
  await writeAudit(ctx, { action: 'VERIFY', entityType: 'MONTHLY_ACTUAL', entityId: id, oldValue: { status: m.status }, newValue: { status } });
  return row;
}

export async function returnMonthlyActual(ctx, id, { reason }) {
  const why = requireReason(reason);
  const m = await loadMonthly(ctx, id);
  const status = nextStatus('return', m.status);
  const row = await getDb().update('monthlyActuals', id, { status, secretary_note: why, updated_at: nowIso() });
  await writeAudit(ctx, { action: 'RETURN', entityType: 'MONTHLY_ACTUAL', entityId: id, oldValue: { status: m.status }, newValue: { status }, reason: why });
  return row;
}
