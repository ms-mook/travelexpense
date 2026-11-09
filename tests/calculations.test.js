import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeActualTotal, computeDailyAllowance, computeKmReimbursement, monthlyAnalysis, resolvePolicy,
  summarizeDistance, summarizeTripExpenses
} from '../server/domain/calculations.js';

test('summarizeDistance แยก BASE / UPCOUNTRY และไม่นับ soft delete', () => {
  const r = summarizeDistance([
    { travel_type: 'BASE', distance_km: 12.35 },
    { travel_type: 'BASE', distance_km: '7.1' },
    { travel_type: 'UPCOUNTRY', distance_km: 210.55 },
    { travel_type: 'UPCOUNTRY', distance_km: 999, is_deleted: 'TRUE' }
  ]);
  assert.deepEqual(r, { base_km: 19.45, upcountry_km: 210.55, total_km: 230 });
});

test('summarizeTripExpenses รวม Toll + Parking + Other และแยกสถานะเบิกคืน', () => {
  const r = summarizeTripExpenses([
    { expense_type: 'TOLL', amount: 50, reimbursement_status: 'REIMBURSED', reimbursed_amount: '' },
    { expense_type: 'PARKING', amount: 30, reimbursement_status: 'REIMBURSED', reimbursed_amount: 20 },
    { expense_type: 'OTHER', amount: 15.5, reimbursement_status: 'PENDING' },
    { expense_type: 'TOLL', amount: 100, reimbursement_status: 'NOT_CLAIMED' },
    { expense_type: 'TOLL', amount: 1000, is_deleted: true }
  ]);
  assert.equal(r.toll, 150);
  assert.equal(r.parking, 30);
  assert.equal(r.other, 15.5);
  assert.equal(r.total, 195.5);
  assert.equal(r.reimbursed, 70);
  assert.equal(r.pending, 15.5);
  assert.equal(r.not_claimed, 100);
});

const policies = [
  { policy_id: 'g1', allowance_type: 'DAILY_BASE', allowance_amount: 100, base_id: '', effective_from: '2026-01-01', effective_to: '2026-06-30', status: 'ACTIVE' },
  { policy_id: 'g2', allowance_type: 'DAILY_BASE', allowance_amount: 120, base_id: '', effective_from: '2026-07-01', effective_to: '', status: 'ACTIVE' },
  { policy_id: 'kk', allowance_type: 'DAILY_BASE', allowance_amount: 150, base_id: 'KKN', effective_from: '2026-01-01', effective_to: '', status: 'ACTIVE' },
  { policy_id: 'up', allowance_type: 'DAILY_UPCOUNTRY', allowance_amount: 300, base_id: '', effective_from: '2026-01-01', effective_to: '', status: 'ACTIVE' },
  { policy_id: 'off', allowance_type: 'DAILY_UPCOUNTRY', allowance_amount: 999, base_id: '', effective_from: '2026-01-01', effective_to: '', status: 'INACTIVE' },
  { policy_id: 'km', allowance_type: 'PER_KM_REIMBURSE', allowance_amount: 4, base_id: '', effective_from: '2026-10-01', effective_to: '', status: 'ACTIVE' }
];

test('resolvePolicy ใช้อัตราตามช่วง Effective Date และ Base เฉพาะชนะนโยบายกลาง', () => {
  assert.equal(resolvePolicy(policies, { date: '2026-03-01', baseId: 'BKK', type: 'DAILY_BASE' }).policy_id, 'g1');
  assert.equal(resolvePolicy(policies, { date: '2026-08-01', baseId: 'BKK', type: 'DAILY_BASE' }).policy_id, 'g2');
  assert.equal(resolvePolicy(policies, { date: '2026-08-01', baseId: 'KKN', type: 'DAILY_BASE' }).policy_id, 'kk');
  assert.equal(resolvePolicy(policies, { date: '2025-12-31', baseId: 'BKK', type: 'DAILY_BASE' }), null);
  assert.equal(resolvePolicy(policies, { date: '2026-08-01', baseId: 'BKK', type: 'DAILY_UPCOUNTRY' }).policy_id, 'up');
});

test('computeDailyAllowance ใช้อัตรา Upcountry เมื่อวันนั้นมีเที่ยว Upcountry และรายงานวันที่ไม่มีนโยบาย', () => {
  const r = computeDailyAllowance([
    { date: '2026-06-30', base_id: 'BKK', has_upcountry: false }, // 100
    { date: '2026-07-01', base_id: 'BKK', has_upcountry: false }, // 120
    { date: '2026-07-02', base_id: 'BKK', has_upcountry: true }, // 300
    { date: '2025-01-01', base_id: 'BKK', has_upcountry: false } // ไม่มีนโยบาย
  ], policies);
  assert.equal(r.amount, 520);
  assert.equal(r.base_days, 3);
  assert.equal(r.upcountry_days, 1);
  assert.equal(r.missing_policy_days.length, 1);
});

test('computeKmReimbursement ใช้อัตราต่อกม. ตามวันที่ของเที่ยว', () => {
  const r = computeKmReimbursement([
    { date: '2026-09-30', base_id: 'BKK', travel_type: 'UPCOUNTRY', distance_km: 100 }, // ก่อนนโยบาย
    { date: '2026-10-05', base_id: 'BKK', travel_type: 'UPCOUNTRY', distance_km: 50.5 }
  ], policies);
  assert.equal(r, 202);
});

test('computeActualTotal รวม 4 หมวดและปัดทศนิยม 2 ตำแหน่ง', () => {
  assert.equal(computeActualTotal({ fuel_cost: 0.1, maintenance_cost: 0.2, vehicle_wear_cost: '1', other_cost: '' }), 1.3);
});

test('monthlyAnalysis: Net Burden และ Expense Gap ตามสูตร', () => {
  const r = monthlyAnalysis({
    monthlyActualTotal: 5000,
    tripExpenses: { total: 800, reimbursed: 600 },
    kmReimbursement: 1000,
    dailyAllowance: 2400,
    includeTripExpenses: true
  });
  assert.equal(r.actual_operating_cost, 5800);
  assert.equal(r.reimbursed_expense, 1600);
  assert.equal(r.net_employee_burden, 4200);
  assert.equal(r.expense_gap, 1800);
});

test('monthlyAnalysis: ไม่หักยอดเบิกคืนของ Trip Expense ซ้ำ ถ้าไม่ได้รวมใน Actual ตั้งแต่ต้น', () => {
  const r = monthlyAnalysis({
    monthlyActualTotal: 5000,
    tripExpenses: { total: 800, reimbursed: 600 },
    kmReimbursement: 0,
    dailyAllowance: 2400,
    includeTripExpenses: false
  });
  assert.equal(r.actual_operating_cost, 5000);
  assert.equal(r.reimbursed_expense, 0);
  assert.equal(r.net_employee_burden, 5000);
  assert.equal(r.expense_gap, 2600);
});

import { isValidUsername, loginIdToAuthEmail, usernameToAuthEmail } from '../shared/username.js';

test('username → อีเมลภายใน และตรวจรูปแบบ', () => {
  assert.equal(usernameToAuthEmail(' Somchai.K '), 'somchai.k@travelexpense.local');
  assert.equal(loginIdToAuthEmail('admin@travelexpense.local'), 'admin@travelexpense.local');
  assert.equal(loginIdToAuthEmail('Admin'), 'admin@travelexpense.local');
  assert.ok(isValidUsername('se_bkk01'));
  assert.ok(!isValidUsername('ab'));
  assert.ok(!isValidUsername('ชื่อไทย'));
  assert.ok(!isValidUsername('a b c'));
});

import { segmentAnalysis } from '../server/domain/calculations.js';

test('segmentAnalysis: ปันส่วนค่าใช้จ่ายรายเดือนตาม KM และเทียบเบี้ยเลี้ยง Base 570 / Upcountry 300', () => {
  const trips = [
    { trip_id: 't1', travel_type: 'BASE', distance_km: 300 },
    { trip_id: 't2', travel_type: 'UPCOUNTRY', distance_km: 100 },
    { trip_id: 'x', travel_type: 'BASE', distance_km: 999, is_deleted: true }
  ];
  const expenses = [
    { trip_id: 't1', expense_type: 'TOLL', amount: 200, reimbursement_status: 'NOT_CLAIMED' },
    { trip_id: 't2', expense_type: 'PARKING', amount: 50, reimbursement_status: 'REIMBURSED' }
  ];
  const lines = [
    { type: 'DAILY_BASE', rate: 570 }, { type: 'DAILY_BASE', rate: 570 }, { type: 'DAILY_UPCOUNTRY', rate: 300 }
  ];
  const r = segmentAnalysis({ trips, expenses, monthlyActualTotal: 4000, allowanceLines: lines });
  assert.equal(r.km_share_base, 0.75);
  assert.equal(r.base.allocated_actual, 3000);
  assert.equal(r.base.cost, 3200);
  assert.equal(r.base.allowance, 1140);
  assert.equal(r.base.gap, 2060);
  assert.equal(r.base.cost_per_day, 1600);
  assert.equal(r.upcountry.allocated_actual, 1000);
  assert.equal(r.upcountry.cost, 1050);
  assert.equal(r.upcountry.reimbursed, 50);
  assert.equal(r.upcountry.gap, 700);
});

import { classifyTravelType } from '../shared/provinces.js';
import { distanceCheck } from '../server/domain/recordSummary.js';

test('classifyTravelType จากจังหวัดของ Base', () => {
  const bkk = 'กรุงเทพมหานคร,ปทุมธานี,นนทบุรี';
  assert.equal(classifyTravelType(bkk, 'นนทบุรี'), 'BASE');
  assert.equal(classifyTravelType(bkk, 'ชลบุรี'), 'UPCOUNTRY');
  assert.equal(classifyTravelType('', 'ชลบุรี'), null);
  assert.equal(classifyTravelType(bkk, ''), null);
});

test('distanceCheck ขึ้นธงเมื่อต่างจาก Google Maps เกิน 20%', () => {
  assert.equal(distanceCheck({ distance_km: 130, maps_distance_km: 100 }).flagged, true);
  assert.equal(distanceCheck({ distance_km: 110, maps_distance_km: 100 }).flagged, false);
  assert.equal(distanceCheck({ distance_km: 110, maps_distance_km: '' }), null);
});

import { baseDayBreakdown, breakEvenKm, bucketByJobs, simulateBasePolicy } from '../server/domain/calculations.js';

test('computeKmReimbursement คิดเฉพาะเที่ยว UPCOUNTRY (4.5 บาท/กม.)', () => {
  const pol = [{ policy_id: 'k', allowance_type: 'PER_KM_REIMBURSE', allowance_amount: 4.5, base_id: '', effective_from: '2022-01-01', effective_to: '', status: 'ACTIVE' }];
  const r = computeKmReimbursement([
    { date: '2026-11-01', base_id: 'B', travel_type: 'UPCOUNTRY', distance_km: 100 },
    { date: '2026-11-01', base_id: 'B', travel_type: 'BASE', distance_km: 80 }
  ], pol);
  assert.equal(r, 450);
});

test('baseDayBreakdown + bucketByJobs: วันหลายงานต้นทุนสูงกว่า 570', () => {
  const days = [
    { date: 'd1', allowance: 570, trips: [{ distance_km: 40, ticket_no: 'A' }], expenses: [] },
    { date: 'd2', allowance: 570, trips: [
      { distance_km: 35, origin_is_home: 'TRUE', ticket_no: 'B' }, { distance_km: 30, ticket_no: 'C' },
      { distance_km: 45, destination_is_home: true }
    ], expenses: [{ expense_type: 'TOLL', amount: 100 }, { expense_type: 'PARKING', amount: 40 }] },
    { date: 'd3', allowance: 570, trips: [{ distance_km: 50, job_type: 'PM' }, { distance_km: 50, job_type: 'CORRECTIVE' }, { distance_km: 50, customer_name: 'X' }], expenses: [] }
  ];
  const b = baseDayBreakdown({ days, monthlyActualTotal: 0, totalKm: 300, fallbackCostPerKm: 4.5 });
  assert.equal(b.estimated, true);
  assert.equal(b.cost_per_km, 4.5);
  assert.deepEqual(b.days.map((d) => d.jobs), [1, 2, 3]);
  assert.equal(b.days[1].home_km, 80);
  assert.equal(b.days[1].cost, 635); // 110 กม. × 4.5 + 140
  assert.equal(b.days[1].gap, 65);
  const g = bucketByJobs(b.days);
  assert.equal(g[0].avg_cost, 180);
  assert.equal(g[2].days_over_allowance, 1);
  assert.equal(breakEvenKm(570, 30, 4.5), 120);
  const real = baseDayBreakdown({ days, monthlyActualTotal: 1500, totalKm: 300 });
  assert.equal(real.cost_per_km, 5);
  assert.equal(real.estimated, false);
});

test('simulateBasePolicy: 570 + 4.5/กม. ที่เกิน 80 กม.', () => {
  const rows = [{ km: 60, cost: 300 }, { km: 120, cost: 700 }];
  const cur = simulateBasePolicy(rows, { flat: 570 });
  assert.equal(cur.short_days, 1);
  const neu = simulateBasePolicy(rows, { flat: 570, thresholdKm: 80, perKm: 4.5 });
  assert.equal(neu.company_pay, 1320);
  assert.equal(neu.short_days, 0); // วันที่ 2 ได้ 570 + 40×4.5 = 750 ≥ 700
});
