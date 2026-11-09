/**
 * ตาราง Route ของ /api/v1 — ทุก route ระบุ Role ที่อนุญาตไว้ชัดเจน
 * (ตรวจซ้ำในระดับ service ด้วย Ownership / Base scope)
 */
import { ROLES } from '../db/schema.js';
import { badRequest } from '../lib/errors.js';
import { nowIso, todayTH } from '../lib/utils.js';
import { getDb } from '../db/index.js';
import { validate } from '../validators/validate.js';
import * as S from '../validators/schemas.js';
import * as admin from '../services/adminService.js';
import * as audit from '../services/auditService.js';
import * as daily from '../services/dailyRecordService.js';
import * as monthly from '../services/monthlyActualService.js';
import * as receipts from '../services/receiptService.js';
import * as reports from '../services/reportService.js';
import * as secretary from '../services/secretaryService.js';
import * as settings from '../services/settingsService.js';
import * as vehicles from '../services/vehicleService.js';
import * as maps from '../services/mapsService.js';
import * as geo from '../services/geoService.js';
import * as monitor from '../services/monitorService.js';

const { EMPLOYEE: E, SECRETARY: SEC, MANAGEMENT: M, SUPER_ADMIN: A } = ROLES;
const ALL = [E, SEC, M, A];

const monthParam = (q) => {
  const month = q.month || todayTH().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw badRequest('month ต้องเป็น YYYY-MM');
  return month;
};

const publicUser = (u) => ({
  employee_id: u.employee_id, username: u.username, employee_code: u.employee_code, full_name: u.full_name, email: u.email,
  department: u.department, position: u.position, role: u.role, base_id: u.base_id, status: u.status,
  home_location: u.home_location || ''
});

export const routes = [
  /* ---------- Auth ---------- */
  ['GET', '/auth/me', ALL, async (ctx) => {
    const bases = await admin.listBases();
    const base = bases.find((b) => b.base_id === ctx.user.base_id);
    return { user: { ...publicUser(ctx.user), base_name: base?.base_name || '', base_provinces: base?.provinces || '' },
      scope: ctx.scope, features: { maps_distance: maps.mapsAvailable(), receipts: process.env.RECEIPTS_ENABLED === 'true' } };
  }],
  ['GET', '/bases', ALL, () => admin.listBases()],
  ['GET', '/geo/reverse', ALL, async (ctx, { query }) => {
    const lat = Number(query.lat); const lng = Number(query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw badRequest('ต้องระบุ lat และ lng');
    return (await geo.reverseGeocode(lat, lng)) || { province: null, name: '' };
  }],
  ['GET', '/me/recent-places', [E], (ctx) => monitor.recentPlaces(ctx)],
  ['GET', '/monitor/day', [SEC, M, A], (ctx, { query }) => {
    const date = query.date || todayTH();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw badRequest('date ต้องเป็น YYYY-MM-DD');
    return monitor.dayMonitor(ctx, { date, baseId: query.base_id });
  }],
  ['GET', '/maps/distance', ALL, async (ctx, { query }) => {
    if (!maps.mapsAvailable()) return { available: false, distance_km: null };
    if (!query.origin || !query.destination) throw badRequest('ต้องระบุ origin และ destination');
    return { available: true, distance_km: await maps.drivingDistanceKm(query.origin, query.destination, query.province) };
  }],

  /* ---------- Employee ---------- */
  ['GET', '/users/me', ALL, (ctx) => publicUser(ctx.user)],
  ['PATCH', '/users/me', ALL, async (ctx, { body }) => publicUser(await getDb().update('users', ctx.user.employee_id,
    { ...validate(S.myProfileSchema, body, { partial: true }), updated_at: nowIso() }))],
  ['GET', '/me/overview', [E], (ctx, { query }) => reports.myMonthOverview(ctx, monthParam(query))],
  ['GET', '/me/base-history', [E], (ctx) => admin.listAssignments(ctx.user.employee_id)],

  ['GET', '/vehicles', [E], (ctx, { query }) => vehicles.listMyVehicles(ctx, { includeInactive: query.all === '1' })],
  ['POST', '/vehicles', [E], (ctx, { body }) => vehicles.createVehicle(ctx, validate(S.vehicleSchema, body))],
  ['PATCH', '/vehicles/:id', [E], (ctx, { params, body }) =>
    vehicles.updateVehicle(ctx, params.id, validate(S.vehicleSchema, body, { partial: true }))],

  ['GET', '/daily-records', [E], (ctx, { query }) => daily.listMyRecords(ctx, query)],
  ['POST', '/daily-records', [E], (ctx, { body }) => daily.createRecord(ctx, validate(S.dailyRecordSchema, body))],
  ['GET', '/daily-records/:id', ALL, (ctx, { params }) => daily.getRecordDetail(ctx, params.id)],
  ['PATCH', '/daily-records/:id', [E], (ctx, { params, body }) =>
    daily.updateRecordNote(ctx, params.id, validate({ employee_note: S.dailyRecordSchema.employee_note }, body, { partial: true }))],
  ['DELETE', '/daily-records/:id', [E], (ctx, { params }) => daily.deleteRecord(ctx, params.id)],
  ['POST', '/daily-records/:id/trips', [E], (ctx, { params, body }) => daily.addTrip(ctx, params.id, validate(S.tripSchema, body))],
  ['POST', '/daily-records/:id/submit', [E], (ctx, { params }) => daily.submitRecord(ctx, params.id)],
  ['PATCH', '/trips/:id', [E], (ctx, { params, body }) => daily.updateTrip(ctx, params.id, validate(S.tripSchema, body, { partial: true }))],
  ['DELETE', '/trips/:id', [E], (ctx, { params }) => daily.deleteTrip(ctx, params.id)],
  ['POST', '/trips/:id/expenses', [E], (ctx, { params, body }) => daily.addExpense(ctx, params.id, validate(S.expenseSchema, body))],
  ['DELETE', '/expenses/:id', [E], (ctx, { params }) => daily.deleteExpense(ctx, params.id)],

  ['POST', '/receipts/upload', [E], (ctx, { body }) => {
    if (process.env.RECEIPTS_ENABLED !== 'true') throw badRequest('ระบบแนบใบเสร็จยังไม่เปิดใช้งาน');
    return receipts.uploadReceipt(ctx, validate(S.receiptUploadSchema, body));
  }],
  ['GET', '/receipts/:fileId', ALL, async (ctx, { params, res }) => {
    await receipts.streamReceipt(ctx, params.fileId, res, { assertCanRead: daily.assertCanRead });
    return STREAMED;
  }],

  ['GET', '/monthly-actuals', [E], (ctx) => monthly.listMyMonthlyActuals(ctx)],
  ['POST', '/monthly-actuals', [E], (ctx, { body }) => monthly.upsertMonthlyActual(ctx, validate(S.monthlyActualSchema, body))],
  ['POST', '/monthly-actuals/:id/submit', [E], (ctx, { params }) => monthly.submitMonthlyActual(ctx, params.id)],

  /* ---------- Secretary ---------- */
  ['GET', '/secretary/records', [SEC, A], (ctx, { query }) => secretary.searchRecords(ctx, query)],
  ['GET', '/secretary/pending', [SEC, A], (ctx, { query }) => secretary.searchRecords(ctx, { ...query, status: 'SUBMITTED' })],
  ['PATCH', '/secretary/trips/:id', [SEC, A], (ctx, { params, body }) =>
    secretary.editTrip(ctx, params.id, { ...validate(S.tripSchema, body, { partial: true }), ...validate(S.reasonSchema, body) })],
  ['PATCH', '/secretary/expenses/:id', [SEC, A], (ctx, { params, body }) =>
    secretary.editExpense(ctx, params.id, {
      ...validate({ ...S.expenseSchema, ...S.reimbursementSchema,
        receipt_status: { type: 'enum', values: ['NONE', 'UPLOADED', 'VERIFIED'] } }, body, { partial: true }),
      ...validate(S.reasonSchema, body)
    })],
  ['POST', '/secretary/records/:id/verify', [SEC, A], (ctx, { params, body }) => secretary.verifyRecord(ctx, params.id, body)],
  ['POST', '/secretary/records/:id/return', [SEC, A], (ctx, { params, body }) =>
    secretary.returnRecord(ctx, params.id, validate(S.reasonSchema, body))],
  ['GET', '/secretary/monthly-actuals', [SEC, A], (ctx, { query }) => secretary.listMonthlyActuals(ctx, query)],
  ['PATCH', '/secretary/monthly-actuals/:id', [SEC, A], (ctx, { params, body }) =>
    secretary.editMonthlyActual(ctx, params.id, { ...validate(S.monthlyActualSchema, body, { partial: true }), ...validate(S.reasonSchema, body) })],
  ['POST', '/secretary/monthly-actuals/:id/verify', [SEC, A], (ctx, { params }) => secretary.verifyMonthlyActual(ctx, params.id)],
  ['POST', '/secretary/monthly-actuals/:id/return', [SEC, A], (ctx, { params, body }) =>
    secretary.returnMonthlyActual(ctx, params.id, validate(S.reasonSchema, body))],
  ['GET', '/secretary/audit-logs', [SEC, A], (ctx, { query }) =>
    audit.listAuditLogs({ entityType: query.entity_type, entityId: query.entity_id, limit: Number(query.limit) || 200 })],

  /* ---------- Management (Read-only) ---------- */
  ['GET', '/management/dashboard', [M, A], (ctx, { query }) =>
    reports.dashboard({ month: monthParam(query), baseId: query.base_id, months: Math.min(12, Number(query.months) || 6) })],
  ['GET', '/management/summary', [M, A], (ctx, { query }) =>
    reports.monthlySummary({ month: monthParam(query), baseId: query.base_id, employeeId: query.employee_id })],
  ['GET', '/management/employees', [M, A], async () => (await admin.listUsers()).filter((u) => u.role === E).map((u) =>
    ({ ...publicUser(u), base_name: u.base_name }))],
  ['GET', '/management/bases', [M, A], () => admin.listBases()],
  ['GET', '/management/expenses', [M, A], async (ctx, { query }) => {
    const s = await reports.monthlySummary({ month: monthParam(query), baseId: query.base_id });
    return s.employees.map((r) => ({ employee_id: r.employee_id, full_name: r.full_name, base_name: r.base_name, ...r.trip_expenses }));
  }],
  ['GET', '/management/export', [M, A], async (ctx, { query, res }) => {
    const month = monthParam(query);
    const csv = await reports.exportCsv({ month, baseId: query.base_id });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="travel-expense-${month}.csv"`);
    res.end(csv);
    return STREAMED;
  }],

  /* ---------- Super Admin ---------- */
  ['GET', '/admin/users', [A], () => admin.listUsers()],
  ['POST', '/admin/users', [A], (ctx, { body }) => admin.createUser(ctx, validate(S.userCreateSchema, body))],
  ['PATCH', '/admin/users/:id', [A], (ctx, { params, body }) =>
    admin.updateUser(ctx, params.id, validate(S.userUpdateSchema, body, { partial: true }))],
  ['POST', '/admin/users/:id/reset-password', [A], (ctx, { params, body }) =>
    admin.resetPassword(ctx, params.id, validate({ password: { type: 'string', required: true, max: 72 } }, body).password)],
  ['POST', '/admin/bases', [A], (ctx, { body }) => admin.createBase(ctx, validate(S.baseSchema, body))],
  ['PATCH', '/admin/bases/:id', [A], (ctx, { params, body }) => admin.updateBase(ctx, params.id, validate(S.baseSchema, body, { partial: true }))],
  ['GET', '/admin/base-assignments', [A], (ctx, { query }) => admin.listAssignments(query.employee_id)],
  ['POST', '/admin/base-assignments', [A], (ctx, { body }) => admin.assignBase(ctx, validate(S.baseAssignmentSchema, body))],
  ['GET', '/admin/policies', [A, M], () => admin.listPolicies()],
  ['POST', '/admin/policies', [A], (ctx, { body }) => admin.createPolicy(ctx, validate(S.policySchema, body))],
  ['PATCH', '/admin/policies/:id', [A], (ctx, { params, body }) =>
    admin.updatePolicy(ctx, params.id, { ...validate(S.policySchema, body, { partial: true }), reason: body?.reason })],
  ['GET', '/admin/settings', [A], () => settings.getSettings()],
  ['PATCH', '/admin/settings/:key', [A], (ctx, { params, body }) => admin.updateSetting(ctx, params.key, validate(S.settingSchema, body))],
  ['GET', '/admin/audit-logs', [A], (ctx, { query }) =>
    audit.listAuditLogs({ entityType: query.entity_type, entityId: query.entity_id, actorId: query.actor_id, limit: Number(query.limit) || 500 })]
];

/** handler คืนค่านี้เมื่อเขียน response เองแล้ว (stream / csv) */
export const STREAMED = Symbol('STREAMED');

const compiled = routes.map(([method, path, roles, handler]) => {
  const keys = [];
  const re = new RegExp(`^${path.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  return { method, path, roles, handler, re, keys };
});

export function matchRoute(method, path) {
  let pathMatched = false;
  for (const r of compiled) {
    const m = r.re.exec(path);
    if (!m) continue;
    pathMatched = true;
    if (r.method !== method) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    return { route: r, params };
  }
  return { route: null, pathMatched };
}
