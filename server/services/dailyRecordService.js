/** Daily Record + Trips + Expenses (ฝั่ง Employee) */
import { getDb } from '../db/index.js';
import { RECORD_STATUS, ROLES } from '../db/schema.js';
import { calcRecordSummary } from '../domain/recordSummary.js';
import { employeeCanEdit, nextStatus } from '../domain/workflow.js';
import { badRequest, conflict, forbidden, invalidState, notFound } from '../lib/errors.js';
import { nowIso, round2, toBool, todayTH, uuid } from '../lib/utils.js';
import { assertBaseInScope, assertOwner } from '../middleware/auth.js';
import { baseForDate } from './adminService.js';
import { writeAudit } from './auditService.js';
import { assertReceiptOwnedBy } from './receiptService.js';
import { fuelLabel } from './vehicleService.js';
import { drivingDistanceKm } from './mapsService.js';
import { classifyTravelType } from '../../shared/provinces.js';

/**
 * ประเภทเที่ยวกำหนดจากจังหวัดปลายทางเทียบกับจังหวัดของ Base (snapshot ของ Daily Record)
 * Base ที่ยังไม่ตั้งจังหวัด → ใช้ค่าที่ผู้ใช้เลือก (ต้องเลือก)
 */
export async function resolveTravelType(record, destinationProvince, requested) {
  const base = record.base_id ? await getDb().get('bases', record.base_id) : null;
  const auto = classifyTravelType(base?.provinces, destinationProvince);
  if (auto) return auto;
  if (base?.provinces && !destinationProvince) throw badRequest('กรุณาเลือกจังหวัดปลายทาง');
  if (!requested) throw badRequest('กรุณาเลือกประเภทการเดินทาง (BASE / UPCOUNTRY)');
  return requested;
}

/** ระยะทางอ้างอิงจาก Google Maps (ถ้าตั้ง API key) — ไม่ทำให้การบันทึกล้มถ้าเรียกไม่สำเร็จ */
async function mapsDistance(t) {
  const km = await drivingDistanceKm(t.origin, t.destination, t.destination_province);
  return km === null ? '' : km;
}

const alive = (r) => !toBool(r.is_deleted);

/** ตรวจสิทธิ์อ่าน Daily Record ตาม Role */
export function assertCanRead(ctx, record) {
  const { role } = ctx.user;
  if (role === ROLES.EMPLOYEE) return assertOwner(ctx, record.employee_id);
  if (role === ROLES.SECRETARY) return assertBaseInScope(ctx, record.base_id);
  if (role === ROLES.MANAGEMENT || role === ROLES.SUPER_ADMIN) return undefined;
  throw forbidden();
}

async function loadRecord(id) {
  const r = await getDb().get('dailyRecords', id);
  if (!r || toBool(r.is_deleted)) throw notFound('ไม่พบรายการประจำวัน');
  return r;
}

async function loadOwnEditableRecord(ctx, id) {
  const r = await loadRecord(id);
  assertOwner(ctx, r.employee_id);
  if (!employeeCanEdit(r.status)) throw invalidState(`รายการสถานะ ${r.status} แก้ไขไม่ได้`);
  return r;
}

async function touchRecord(id) {
  await getDb().update('dailyRecords', id, { updated_at: nowIso() });
}

/** รายละเอียดรายการ + เที่ยว + ค่าใช้จ่าย + สรุป */
export async function getRecordDetail(ctx, id) {
  const db = getDb();
  const record = await loadRecord(id);
  assertCanRead(ctx, record);
  const [trips, expenses, users, base] = await Promise.all([
    db.list('trips'), db.list('expenses'), db.list('users'), record.base_id ? db.get('bases', record.base_id) : null
  ]);
  const myTrips = trips.filter((t) => t.daily_record_id === id && alive(t))
    .sort((a, b) => Number(a.sequence_no) - Number(b.sequence_no));
  const myExpenses = expenses.filter((e) => e.daily_record_id === id && alive(e));
  const employee = users.find((u) => u.employee_id === record.employee_id);
  return {
    record: { ...record, employee_name: employee?.full_name || '' },
    base_provinces: base?.provinces || '',
    trips: myTrips.map((t) => ({ ...t, expenses: myExpenses.filter((e) => e.trip_id === t.trip_id) })),
    summary: calcRecordSummary(myTrips, myExpenses)
  };
}

export async function listMyRecords(ctx, { month, status } = {}) {
  const db = getDb();
  const [records, trips, expenses] = await Promise.all([db.list('dailyRecords'), db.list('trips'), db.list('expenses')]);
  return records
    .filter((r) => r.employee_id === ctx.user.employee_id && alive(r) &&
      (!month || String(r.record_date).startsWith(month)) && (!status || r.status === status))
    .sort((a, b) => String(b.record_date).localeCompare(String(a.record_date)))
    .map((r) => ({
      ...r,
      summary: calcRecordSummary(
        trips.filter((t) => t.daily_record_id === r.daily_record_id && alive(t)),
        expenses.filter((e) => e.daily_record_id === r.daily_record_id && alive(e))
      )
    }));
}

export async function createRecord(ctx, { record_date: date, employee_note: note }) {
  if (date > todayTH()) throw badRequest('ไม่สามารถบันทึกล่วงหน้าได้');
  const db = getDb();
  const [records, assignments, bases] = await Promise.all([db.list('dailyRecords'), db.list('baseAssignments'), db.list('bases')]);
  const dup = records.find((r) => r.employee_id === ctx.user.employee_id && r.record_date === date && alive(r));
  if (dup) throw conflict('มีรายการของวันนี้อยู่แล้ว', { daily_record_id: dup.daily_record_id });

  const baseId = baseForDate(assignments, ctx.user, date);
  if (!baseId) throw badRequest('ยังไม่ได้กำหนด Base ให้บัญชีนี้ กรุณาติดต่อผู้ดูแล');
  const ts = nowIso();
  const row = {
    daily_record_id: uuid(), employee_id: ctx.user.employee_id, record_date: date, base_id: baseId,
    base_name_snapshot: bases.find((b) => b.base_id === baseId)?.base_name || '',
    status: RECORD_STATUS.DRAFT, employee_note: note || '', secretary_note: '', submitted_at: '',
    verified_by: '', verified_at: '', created_at: ts, updated_at: ts, is_deleted: false
  };
  await db.insert('dailyRecords', row);
  return row;
}

export async function updateRecordNote(ctx, id, { employee_note: note }) {
  await loadOwnEditableRecord(ctx, id);
  return getDb().update('dailyRecords', id, { employee_note: note ?? '', updated_at: nowIso() });
}

/** Soft delete ทั้งวัน (เฉพาะ DRAFT) */
export async function deleteRecord(ctx, id) {
  const r = await loadOwnEditableRecord(ctx, id);
  if (r.status !== RECORD_STATUS.DRAFT) throw invalidState('ลบได้เฉพาะรายการ DRAFT');
  await getDb().update('dailyRecords', id, { is_deleted: true, updated_at: nowIso() });
  await writeAudit(ctx, { action: 'SOFT_DELETE', entityType: 'DAILY_RECORD', entityId: id, oldValue: r });
  return { ok: true };
}

/* ---------------- Trips ---------------- */

function checkOdometer(t) {
  if (t.odometer_start !== '' && t.odometer_end !== '' && t.odometer_start !== undefined && t.odometer_end !== undefined &&
    Number(t.odometer_end) < Number(t.odometer_start)) {
    throw badRequest('เลขไมล์สิ้นสุดต้องไม่น้อยกว่าเลขไมล์เริ่มต้น');
  }
}

async function vehicleSnapshot(ctx, vehicleId) {
  const v = await getDb().get('vehicles', vehicleId);
  if (!v || v.employee_id !== ctx.user.employee_id) throw badRequest('ไม่พบรถคันนี้ในบัญชีของคุณ');
  if (!toBool(v.active)) throw badRequest('รถคันนี้ถูกปิดการใช้งาน');
  return {
    vehicle_model_snapshot: `${v.vehicle_brand} ${v.vehicle_model}`.trim(),
    license_plate_snapshot: v.license_plate,
    fuel_type_snapshot: fuelLabel(v)
  };
}

export async function addTrip(ctx, recordId, input) {
  const record = await loadOwnEditableRecord(ctx, recordId);
  checkOdometer(input);
  const db = getDb();
  const trips = (await db.list('trips')).filter((t) => t.daily_record_id === recordId);
  const seq = trips.reduce((m, t) => Math.max(m, Number(t.sequence_no) || 0), 0) + 1;
  const ts = nowIso();
  const { updated_at: _ignored, ...data } = input;
  const row = {
    trip_id: uuid(), daily_record_id: recordId, employee_id: ctx.user.employee_id,
    ...(await vehicleSnapshot(ctx, input.vehicle_id)), ...data,
    travel_type: await resolveTravelType(record, input.destination_province, input.travel_type),
    distance_km: round2(input.distance_km), sequence_no: seq, created_at: ts, updated_at: ts, is_deleted: false
  };
  row.maps_distance_km = await mapsDistance(row);
  await db.insert('trips', row);
  await touchRecord(recordId);
  return row;
}

async function loadOwnEditableTrip(ctx, tripId) {
  const t = await getDb().get('trips', tripId);
  if (!t || toBool(t.is_deleted)) throw notFound('ไม่พบเที่ยวเดินทาง');
  assertOwner(ctx, t.employee_id);
  await loadOwnEditableRecord(ctx, t.daily_record_id);
  return t;
}

export async function updateTrip(ctx, tripId, patch) {
  const t = await loadOwnEditableTrip(ctx, tripId);
  const { updated_at: expected, ...data } = patch;
  checkOdometer({ ...t, ...data });
  if (data.vehicle_id && data.vehicle_id !== t.vehicle_id) Object.assign(data, await vehicleSnapshot(ctx, data.vehicle_id));
  if (data.distance_km !== undefined) data.distance_km = round2(data.distance_km);
  const merged = { ...t, ...data };
  if (data.destination_province !== undefined || data.travel_type !== undefined) {
    const record = await getDb().get('dailyRecords', t.daily_record_id);
    data.travel_type = await resolveTravelType(record, merged.destination_province, merged.travel_type);
  }
  if (['origin', 'destination', 'destination_province'].some((k) => data[k] !== undefined && data[k] !== t[k])) {
    data.maps_distance_km = await mapsDistance(merged);
  }
  const row = await getDb().update('trips', tripId, { ...data, updated_at: nowIso() }, { expectedUpdatedAt: expected });
  await touchRecord(t.daily_record_id);
  return row;
}

/** Soft delete เที่ยว + ค่าใช้จ่ายในเที่ยว */
export async function deleteTrip(ctx, tripId) {
  const t = await loadOwnEditableTrip(ctx, tripId);
  const db = getDb();
  const ts = nowIso();
  await db.update('trips', tripId, { is_deleted: true, updated_at: ts });
  const exps = (await db.list('expenses')).filter((e) => e.trip_id === tripId && alive(e));
  if (exps.length) await db.updateMany('expenses', exps.map((e) => ({ id: e.expense_id, patch: { is_deleted: true, updated_at: ts } })));
  await touchRecord(t.daily_record_id);
  await writeAudit(ctx, { action: 'SOFT_DELETE', entityType: 'TRIP', entityId: tripId, oldValue: t });
  return { ok: true };
}

/* ---------------- Expenses ---------------- */

export async function addExpense(ctx, tripId, input) {
  const t = await loadOwnEditableTrip(ctx, tripId);
  if (input.receipt_file_id) await assertReceiptOwnedBy(input.receipt_file_id, ctx.user.employee_id);
  const ts = nowIso();
  const row = {
    expense_id: uuid(), trip_id: tripId, daily_record_id: t.daily_record_id, employee_id: ctx.user.employee_id,
    ...input, amount: round2(input.amount),
    receipt_status: input.receipt_file_id ? 'UPLOADED' : 'NONE',
    // ในเขต Base: รวมในเบี้ยเลี้ยงรายวันแล้ว ไม่เบิกแยก · นอก Base: รอเบิกผ่าน SAP Concur
    reimbursement_status: t.travel_type === 'BASE' ? 'NOT_CLAIMED' : 'PENDING', reimbursed_amount: '', reimbursed_at: '',
    created_at: ts, updated_at: ts, is_deleted: false
  };
  await getDb().insert('expenses', row);
  await touchRecord(t.daily_record_id);
  return row;
}

export async function deleteExpense(ctx, expenseId) {
  const db = getDb();
  const e = await db.get('expenses', expenseId);
  if (!e || toBool(e.is_deleted)) throw notFound();
  assertOwner(ctx, e.employee_id);
  await loadOwnEditableRecord(ctx, e.daily_record_id);
  await db.update('expenses', expenseId, { is_deleted: true, updated_at: nowIso() });
  await writeAudit(ctx, { action: 'SOFT_DELETE', entityType: 'EXPENSE', entityId: expenseId, oldValue: e });
  return { ok: true };
}

/* ---------------- Submit ---------------- */

export async function submitRecord(ctx, id) {
  const r = await loadOwnEditableRecord(ctx, id);
  const trips = (await getDb().list('trips')).filter((t) => t.daily_record_id === id && alive(t));
  if (!trips.length) throw badRequest('ต้องมีอย่างน้อย 1 เที่ยวก่อนส่งตรวจ');
  const status = nextStatus('submit', r.status);
  const row = await getDb().update('dailyRecords', id, { status, submitted_at: nowIso(), updated_at: nowIso() });
  await writeAudit(ctx, { action: 'SUBMIT', entityType: 'DAILY_RECORD', entityId: id,
    oldValue: { status: r.status }, newValue: { status } });
  return row;
}
