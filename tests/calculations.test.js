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
    { date: '2026-09-30', base_id: 'BKK', distance_km: 100 }, // ก่อนนโยบาย
    { date: '2026-10-05', base_id: 'BKK', distance_km: 50.5 }
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
