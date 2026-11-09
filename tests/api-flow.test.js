/**
 * ทดสอบ API แบบ end-to-end ผ่าน dispatcher จริง โดยใช้ memory adapter แทน Google Sheets
 * ครอบคลุม: RBAC, Ownership, Base scope, Workflow, ล็อก VERIFIED, Audit Log, Soft delete, รายงาน
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../server/app.js';
import { setDb } from '../server/db/index.js';
import { createMemoryAdapter } from '../server/db/memoryAdapter.js';
import { setTokenVerifier } from '../server/middleware/auth.js';

const BKK = '11111111-1111-4111-8111-111111111111';
const KKN = '22222222-2222-4222-8222-222222222222';
const user = (id, role, base) => ({ employee_id: id, auth_user_id: `auth-${id}`, employee_code: id, full_name: id,
  email: `${id}@x.co`, role, base_id: base, status: 'ACTIVE' });

const db = createMemoryAdapter({
  bases: [{ base_id: BKK, base_code: 'BKK', base_name: 'Bangkok', status: 'ACTIVE' },
    { base_id: KKN, base_code: 'KKN', base_name: 'Khon Kaen', status: 'ACTIVE' }],
  users: [user('emp1', 'EMPLOYEE', BKK), user('emp2', 'EMPLOYEE', BKK), user('sec-bkk', 'SECRETARY', ''),
    user('sec-kkn', 'SECRETARY', ''), user('mgmt', 'MANAGEMENT', ''), user('admin', 'SUPER_ADMIN', '')],
  adminUsers: [{ admin_id: 'a1', auth_user_id: 'auth-sec-bkk', team_scope: BKK, status: 'ACTIVE' },
    { admin_id: 'a2', auth_user_id: 'auth-sec-kkn', team_scope: KKN, status: 'ACTIVE' }],
  baseAssignments: [{ assignment_id: 'as1', employee_id: 'emp1', base_id: BKK, effective_from: '2026-01-01', effective_to: '' }],
  allowancePolicies: [
    { policy_id: 'p1', allowance_type: 'DAILY_BASE', allowance_amount: 150, base_id: '', effective_from: '2026-01-01', effective_to: '', status: 'ACTIVE' },
    { policy_id: 'p2', allowance_type: 'DAILY_UPCOUNTRY', allowance_amount: 400, base_id: '', effective_from: '2026-01-01', effective_to: '', status: 'ACTIVE' }
  ]
});
setDb(db);
setTokenVerifier(async (token) => `auth-${token}`); // token = employee_id

async function call(who, method, path, body, headers = {}) {
  const res = {
    statusCode: 200, headers: {}, body: '',
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(b) { this.body = b ?? ''; }
  };
  const req = { method, url: `/api/v1${path}`, headers: { authorization: who ? `Bearer ${who}` : '', ...headers }, body: body ?? {} };
  await handle(req, res, path.split('?')[0]);
  const json = res.body && res.headers['content-type']?.includes('json') ? JSON.parse(res.body) : res.body;
  return { status: res.statusCode, json };
}

let vehicleId; let recordId; let tripId; let trip2Id;

test('ไม่มี token → 401', async () => {
  assert.equal((await call(null, 'GET', '/auth/me')).status, 401);
});

test('Employee จัดการรถของตนเอง และ Other ต้องระบุชนิดน้ำมัน', async () => {
  const bad = await call('emp1', 'POST', '/vehicles', { vehicle_brand: 'Toyota', vehicle_model: 'Yaris', license_plate: '1กข 1234', fuel_type: 'OTHER' });
  assert.equal(bad.status, 400);
  const ok = await call('emp1', 'POST', '/vehicles', { vehicle_brand: 'Toyota', vehicle_model: 'Yaris', license_plate: '1กข 1234', fuel_type: 'GASOHOL_95' });
  assert.equal(ok.status, 201);
  vehicleId = ok.json.data.vehicle_id;
  assert.equal((await call('emp2', 'PATCH', `/vehicles/${vehicleId}`, { vehicle_model: 'Hack' })).status, 403);
});

test('Employee สร้าง Daily Record หลายเที่ยว + ค่าใช้จ่าย, คำนวณ KM ถูกต้อง', async () => {
  const r = await call('emp1', 'POST', '/daily-records', { record_date: '2026-10-15' });
  assert.equal(r.status, 201);
  recordId = r.json.data.daily_record_id;
  assert.equal(r.json.data.base_id, BKK);

  const dup = await call('emp1', 'POST', '/daily-records', { record_date: '2026-10-15' });
  assert.equal(dup.status, 409);

  const t1 = await call('emp1', 'POST', `/daily-records/${recordId}/trips`, { vehicle_id: vehicleId, travel_type: 'BASE', origin: 'Office', destination: 'Site A', distance_km: 25.5 });
  const t2 = await call('emp1', 'POST', `/daily-records/${recordId}/trips`, { vehicle_id: vehicleId, travel_type: 'UPCOUNTRY', origin: 'Site A', destination: 'Ayutthaya', distance_km: 80.25 });
  const t3 = await call('emp1', 'POST', `/daily-records/${recordId}/trips`, { vehicle_id: vehicleId, travel_type: 'BASE', origin: 'x', destination: 'y', distance_km: 1000 });
  assert.equal(t1.status, 201);
  tripId = t1.json.data.trip_id;
  trip2Id = t2.json.data.trip_id;
  assert.equal(t1.json.data.vehicle_model_snapshot, 'Toyota Yaris');
  assert.equal(t2.json.data.sequence_no, 2);

  assert.equal((await call('emp1', 'DELETE', `/trips/${t3.json.data.trip_id}`)).status, 200);
  assert.equal((await call('emp1', 'POST', `/trips/${tripId}/expenses`, { expense_type: 'TOLL', amount: 45 })).status, 201);
  assert.equal((await call('emp1', 'POST', `/trips/${trip2Id}/expenses`, { expense_type: 'PARKING', amount: 20 })).status, 201);

  const d = await call('emp1', 'GET', `/daily-records/${recordId}`);
  assert.equal(d.json.data.summary.base_km, 25.5);
  assert.equal(d.json.data.summary.upcountry_km, 80.25);
  assert.equal(d.json.data.summary.total_km, 105.75);
  assert.equal(d.json.data.summary.expenses.total, 65);
  assert.equal(d.json.data.trips.length, 2);
});

test('พนักงานอื่นดูรายการไม่ได้ / Employee เรียก API Secretary ไม่ได้', async () => {
  assert.equal((await call('emp2', 'GET', `/daily-records/${recordId}`)).status, 403);
  assert.equal((await call('emp1', 'GET', '/secretary/pending')).status, 403);
  assert.equal((await call('emp1', 'GET', '/management/dashboard')).status, 403);
});

test('Idempotency-Key ป้องกันการสร้างซ้ำ', async () => {
  const h = { 'idempotency-key': 'k-123' };
  const a = await call('emp1', 'POST', '/vehicles', { vehicle_brand: 'Honda', vehicle_model: 'City', license_plate: 'x', fuel_type: 'E20' }, h);
  const b = await call('emp1', 'POST', '/vehicles', { vehicle_brand: 'Honda', vehicle_model: 'City', license_plate: 'x', fuel_type: 'E20' }, h);
  assert.equal(a.json.data.vehicle_id, b.json.data.vehicle_id);
  assert.equal(db._store.vehicles.filter((v) => v.vehicle_model === 'City').length, 1);
});

test('Workflow: submit → secretary คนละ Base เข้าไม่ได้ → return พร้อมเหตุผล → แก้ → verify → ล็อก', async () => {
  assert.equal((await call('emp1', 'POST', `/daily-records/${recordId}/submit`)).status, 201);
  // ส่งแล้วพนักงานแก้ไม่ได้
  assert.equal((await call('emp1', 'PATCH', `/trips/${tripId}`, { distance_km: 1 })).status, 422);

  assert.equal((await call('sec-kkn', 'POST', `/secretary/records/${recordId}/verify`)).status, 403);
  const pend = await call('sec-kkn', 'GET', '/secretary/pending');
  assert.equal(pend.json.data.total, 0);
  const pendBkk = await call('sec-bkk', 'GET', '/secretary/pending');
  assert.equal(pendBkk.json.data.total, 1);

  assert.equal((await call('sec-bkk', 'POST', `/secretary/records/${recordId}/return`, {})).status, 400);
  const ret = await call('sec-bkk', 'POST', `/secretary/records/${recordId}/return`, { reason: 'ระยะทางเที่ยวแรกไม่ตรงกับแผนที่' });
  assert.equal(ret.json.data.status, 'RETURNED');

  assert.equal((await call('emp1', 'PATCH', `/trips/${tripId}`, { distance_km: 24 })).status, 200);
  await call('emp1', 'POST', `/daily-records/${recordId}/submit`);

  const noReason = await call('sec-bkk', 'PATCH', `/secretary/trips/${tripId}`, { distance_km: 23.5 });
  assert.equal(noReason.status, 400);
  const edit = await call('sec-bkk', 'PATCH', `/secretary/trips/${tripId}`, { distance_km: 23.5, reason: 'ตรวจกับ Google Maps' });
  assert.equal(edit.status, 200);
  const exps = db._store.expenses.filter((e) => e.trip_id === tripId);
  await call('sec-bkk', 'PATCH', `/secretary/expenses/${exps[0].expense_id}`, { reimbursement_status: 'REIMBURSED', reason: 'จ่ายรอบ 30/10' });

  const v = await call('sec-bkk', 'POST', `/secretary/records/${recordId}/verify`);
  assert.equal(v.json.data.status, 'VERIFIED');
  assert.equal((await call('emp1', 'POST', `/daily-records/${recordId}/trips`, { vehicle_id: vehicleId, travel_type: 'BASE', origin: 'a', destination: 'b', distance_km: 1 })).status, 422);

  const logs = db._store.auditLogs.filter((l) => l.entity_id === tripId && l.action === 'SECRETARY_EDIT');
  assert.equal(logs.length, 1);
  assert.deepEqual(JSON.parse(logs[0].old_value_json), { distance_km: 24 });
  assert.deepEqual(JSON.parse(logs[0].new_value_json), { distance_km: 23.5 });
  assert.equal(logs[0].reason, 'ตรวจกับ Google Maps');
});

test('Monthly actual: Backend คำนวณ actual_total เอง แล้วรายงานผู้บริหารแสดงองค์ประกอบครบ', async () => {
  const m = await call('emp1', 'POST', '/monthly-actuals', { month: '2026-10', fuel_cost: 3000, maintenance_cost: 500, vehicle_wear_cost: 400, other_cost: 100, actual_total: 1 });
  assert.equal(m.json.data.actual_total, 4000);
  await call('emp1', 'POST', `/monthly-actuals/${m.json.data.monthly_actual_id}/submit`);
  await call('sec-bkk', 'POST', `/secretary/monthly-actuals/${m.json.data.monthly_actual_id}/verify`);

  assert.equal((await call('mgmt', 'POST', '/admin/users', {})).status, 403);
  const s = await call('mgmt', 'GET', '/management/summary?month=2026-10');
  const row = s.json.data.employees.find((e) => e.employee_id === 'emp1');
  assert.equal(row.base_km, 23.5);
  assert.equal(row.upcountry_km, 80.25);
  assert.equal(row.upcountry_days, 1);
  assert.equal(row.daily_allowance, 400);
  assert.equal(row.actual_operating_cost, 4065); // 4000 + toll 45 + parking 20
  assert.equal(row.reimbursed_expense, 45);
  assert.equal(row.net_employee_burden, 4020);
  assert.equal(row.expense_gap, 3620);

  const csv = await call('mgmt', 'GET', '/management/export?month=2026-10');
  assert.equal(csv.status, 200);
  assert.ok(String(csv.json).includes('expense_gap'));
});
