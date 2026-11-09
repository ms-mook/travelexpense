/**
 * รายงานผู้บริหาร — นับเฉพาะรายการที่สถานะอยู่ใน REPORT_STATUSES (ค่าตั้งต้น VERIFIED)
 * แสดงองค์ประกอบของสูตรทุกตัว ไม่ใช่เฉพาะยอดสุทธิ
 */
import { getDb } from '../db/index.js';
import {
  computeDailyAllowance, computeKmReimbursement, monthlyAnalysis, summarizeDistance, summarizeTripExpenses
} from '../domain/calculations.js';
import { round2, toBool } from '../lib/utils.js';
import { baseForDate } from './adminService.js';
import { getTypedSettings } from './settingsService.js';

const alive = (r) => !toBool(r.is_deleted);

async function loadAll() {
  const db = getDb();
  const [users, bases, assignments, records, trips, expenses, actuals, policies, settings] = await Promise.all([
    db.list('users'), db.list('bases'), db.list('baseAssignments'), db.list('dailyRecords'), db.list('trips'),
    db.list('expenses'), db.list('monthlyActuals'), db.list('allowancePolicies'), getTypedSettings()
  ]);
  return { users, bases, assignments, records, trips, expenses, actuals, policies, settings };
}

/** สรุปรายพนักงานของเดือน */
function employeeMonth(data, user, month) {
  const { records, trips, expenses, actuals, policies, settings, assignments } = data;
  const okStatus = settings.reportStatuses;
  const recs = records.filter((r) => r.employee_id === user.employee_id && alive(r) &&
    String(r.record_date).startsWith(month) && okStatus.includes(r.status));
  const recIds = new Set(recs.map((r) => r.daily_record_id));
  const recById = Object.fromEntries(recs.map((r) => [r.daily_record_id, r]));
  const myTrips = trips.filter((t) => recIds.has(t.daily_record_id) && alive(t))
    .map((t) => ({ ...t, date: recById[t.daily_record_id].record_date, base_id: recById[t.daily_record_id].base_id }));
  const myExpenses = expenses.filter((e) => recIds.has(e.daily_record_id) && alive(e));

  const days = recs
    .map((r) => {
      const ts = myTrips.filter((t) => t.daily_record_id === r.daily_record_id);
      return ts.length ? { date: r.record_date, base_id: r.base_id, has_upcountry: ts.some((t) => t.travel_type === 'UPCOUNTRY') } : null;
    })
    .filter(Boolean);

  const distance = summarizeDistance(myTrips);
  const tripExpenses = summarizeTripExpenses(myExpenses);
  const allowance = computeDailyAllowance(days, policies);
  const kmReimbursement = computeKmReimbursement(myTrips, policies);
  const actual = actuals.find((a) => a.employee_id === user.employee_id && a.month === month);
  const actualCounted = actual && okStatus.includes(actual.status);

  const analysis = monthlyAnalysis({
    monthlyActualTotal: actualCounted ? actual.actual_total : 0,
    tripExpenses,
    kmReimbursement,
    dailyAllowance: allowance.amount,
    includeTripExpenses: settings.includeTripExpensesInActual
  });

  const pendingRecords = records.filter((r) => r.employee_id === user.employee_id && alive(r) &&
    String(r.record_date).startsWith(month) && !okStatus.includes(r.status)).length;

  return {
    employee_id: user.employee_id,
    employee_code: user.employee_code,
    full_name: user.full_name,
    base_id: baseForDate(assignments, user, `${month}-01`),
    month,
    working_days: days.length,
    base_days: allowance.base_days,
    upcountry_days: allowance.upcountry_days,
    ...distance,
    trip_expenses: tripExpenses,
    monthly_actual: actual ? {
      status: actual.status, fuel_cost: actual.fuel_cost, maintenance_cost: actual.maintenance_cost,
      vehicle_wear_cost: actual.vehicle_wear_cost, other_cost: actual.other_cost, actual_total: actual.actual_total
    } : null,
    ...analysis,
    data_quality: {
      monthly_actual_missing: !actual,
      monthly_actual_not_counted: Boolean(actual && !actualCounted),
      records_not_counted: pendingRecords,
      missing_policy_days: allowance.missing_policy_days.length
    }
  };
}

const SUM_KEYS = ['working_days', 'base_days', 'upcountry_days', 'base_km', 'upcountry_km', 'total_km',
  'actual_operating_cost', 'reimbursed_expense', 'net_employee_burden', 'daily_allowance', 'expense_gap'];

function aggregate(rows) {
  const t = Object.fromEntries(SUM_KEYS.map((k) => [k, 0]));
  t.trip_expense_total = 0;
  t.trip_expense_reimbursed = 0;
  for (const r of rows) {
    for (const k of SUM_KEYS) t[k] += Number(r[k]) || 0;
    t.trip_expense_total += r.trip_expenses.total;
    t.trip_expense_reimbursed += r.trip_expenses.reimbursed;
  }
  for (const k of Object.keys(t)) t[k] = round2(t[k]);
  t.employee_count = rows.length;
  return t;
}

export async function monthlySummary({ month, baseId, employeeId }, preloaded) {
  const data = preloaded || await loadAll();
  const staff = data.users.filter((u) => u.role === 'EMPLOYEE' && (!employeeId || u.employee_id === employeeId));
  let rows = staff.map((u) => employeeMonth(data, u, month));
  if (baseId) rows = rows.filter((r) => r.base_id === baseId);
  const baseName = Object.fromEntries(data.bases.map((b) => [b.base_id, b.base_name]));
  rows.forEach((r) => { r.base_name = baseName[r.base_id] || '-'; });

  const byBase = Object.values(rows.reduce((acc, r) => {
    (acc[r.base_id] ||= { base_id: r.base_id, base_name: r.base_name, rows: [] }).rows.push(r);
    return acc;
  }, {})).map(({ rows: rs, ...b }) => ({ ...b, ...aggregate(rs) }));

  return {
    month,
    report_statuses: data.settings.reportStatuses,
    include_trip_expenses_in_actual: data.settings.includeTripExpensesInActual,
    totals: aggregate(rows),
    by_base: byBase.sort((a, b) => String(a.base_name).localeCompare(String(b.base_name), 'th')),
    employees: rows
  };
}

const shiftMonth = (m, delta) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
};

export async function dashboard({ month, baseId, months = 6 }) {
  const data = await loadAll(); // อ่านครั้งเดียว ใช้ซ้ำทุกเดือน (ลด API calls)
  const trend = [];
  for (let i = months - 1; i >= 0; i--) {
    const m = shiftMonth(month, -i);
    const s = await monthlySummary({ month: m, baseId }, data);
    trend.push({ month: m, ...s.totals });
  }
  const current = await monthlySummary({ month, baseId }, data);
  return { month, trend, current };
}

/** CSV (UTF-8 BOM ให้ Excel ภาษาไทยเปิดได้) */
export async function exportCsv({ month, baseId }) {
  const s = await monthlySummary({ month, baseId });
  const header = ['month', 'employee_code', 'full_name', 'base', 'working_days', 'base_days', 'upcountry_days',
    'base_km', 'upcountry_km', 'total_km', 'toll', 'parking', 'other_trip_expense', 'trip_expense_total',
    'trip_expense_reimbursed', 'monthly_actual_status', 'fuel_cost', 'maintenance_cost', 'vehicle_wear_cost',
    'other_cost', 'monthly_actual_total', 'km_reimbursement', 'actual_operating_cost', 'reimbursed_expense',
    'net_employee_burden', 'daily_allowance', 'expense_gap', 'records_not_counted', 'missing_policy_days'];
  const esc = (v) => {
    let s2 = String(v ?? '');
    if (/^[=+\-@]/.test(s2) && Number.isNaN(Number(s2))) s2 = `'${s2}`; // กัน CSV injection
    return /[",\n]/.test(s2) ? `"${s2.replace(/"/g, '""')}"` : s2;
  };
  const lines = [header.join(',')];
  for (const r of s.employees) {
    const ma = r.monthly_actual || {};
    lines.push([
      r.month, r.employee_code, r.full_name, r.base_name, r.working_days, r.base_days, r.upcountry_days,
      r.base_km, r.upcountry_km, r.total_km, r.trip_expenses.toll, r.trip_expenses.parking, r.trip_expenses.other,
      r.trip_expenses.total, r.trip_expenses.reimbursed, ma.status || 'MISSING', ma.fuel_cost ?? '',
      ma.maintenance_cost ?? '', ma.vehicle_wear_cost ?? '', ma.other_cost ?? '', ma.actual_total ?? '',
      r.components.km_reimbursement, r.actual_operating_cost, r.reimbursed_expense, r.net_employee_burden,
      r.daily_allowance, r.expense_gap, r.data_quality.records_not_counted, r.data_quality.missing_policy_days
    ].map(esc).join(','));
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}

/** Dashboard ส่วนตัวของพนักงาน (ทุกสถานะ เพื่อให้เห็นภาพเดือนปัจจุบัน) */
export async function myMonthOverview(ctx, month) {
  const data = await loadAll();
  data.settings = { ...data.settings, reportStatuses: ['DRAFT', 'SUBMITTED', 'RETURNED', 'VERIFIED'] };
  const row = employeeMonth(data, ctx.user, month);
  const statusCount = data.records
    .filter((r) => r.employee_id === ctx.user.employee_id && alive(r) && String(r.record_date).startsWith(month))
    .reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});
  return { ...row, status_count: statusCount };
}
