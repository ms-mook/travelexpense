/**
 * หลักการคำนวณ (ดู docs/BUSINESS_RULES.md)
 * ฟังก์ชันในไฟล์นี้เป็น pure function ไม่แตะฐานข้อมูล — ทดสอบได้ด้วย tests/calculations.test.js
 */
import { inEffectiveRange, round2, toBool, toNumber } from '../lib/utils.js';

const alive = (r) => !toBool(r.is_deleted);

/** Base KM / Upcountry KM / Total KM (ไม่รวมรายการ Soft Delete) */
export function summarizeDistance(trips) {
  let base = 0;
  let up = 0;
  for (const t of trips.filter(alive)) {
    const km = toNumber(t.distance_km);
    if (t.travel_type === 'BASE') base += km;
    else if (t.travel_type === 'UPCOUNTRY') up += km;
  }
  return { base_km: round2(base), upcountry_km: round2(up), total_km: round2(base + up) };
}

/** Trip Expense = Toll + Parking + Other */
export function summarizeTripExpenses(expenses) {
  const out = { toll: 0, parking: 0, other: 0, total: 0, reimbursed: 0, pending: 0, not_claimed: 0 };
  for (const e of expenses.filter(alive)) {
    const amt = toNumber(e.amount);
    if (e.expense_type === 'TOLL') out.toll += amt;
    else if (e.expense_type === 'PARKING') out.parking += amt;
    else out.other += amt;
    out.total += amt;
    if (e.reimbursement_status === 'REIMBURSED') {
      // reimbursed_amount ว่าง = จ่ายคืนเต็มจำนวน
      out.reimbursed += e.reimbursed_amount === '' || e.reimbursed_amount == null ? amt : toNumber(e.reimbursed_amount);
    } else if (e.reimbursement_status === 'NOT_CLAIMED') out.not_claimed += amt;
    else out.pending += amt;
  }
  for (const k of Object.keys(out)) out[k] = round2(out[k]);
  return out;
}

/**
 * หานโยบายที่มีผล ณ วันที่ — นโยบายเฉพาะ Base ชนะนโยบายกลาง (base_id ว่าง)
 * ถ้าซ้อนกันหลายฉบับ ใช้ฉบับที่ effective_from ล่าสุด
 */
export function resolvePolicy(policies, { date, baseId, type }) {
  const candidates = policies.filter(
    (p) => p.allowance_type === type && (p.status || 'ACTIVE') === 'ACTIVE' &&
      inEffectiveRange(date, p.effective_from, p.effective_to) &&
      (!p.base_id || p.base_id === baseId)
  );
  candidates.sort((a, b) => {
    const spec = (b.base_id ? 1 : 0) - (a.base_id ? 1 : 0);
    return spec || String(b.effective_from).localeCompare(String(a.effective_from));
  });
  return candidates[0] || null;
}

/**
 * Daily Allowance
 * days: [{ date, base_id, has_upcountry }] — 1 แถวต่อ 1 วันที่มีเที่ยวเดินทาง
 * กติกาตั้งต้น (ALLOWANCE_DAY_RULE=UPCOUNTRY_IF_ANY): วันที่มีเที่ยว Upcountry ใช้อัตรา DAILY_UPCOUNTRY
 */
export function computeDailyAllowance(days, policies) {
  let amount = 0;
  let baseDays = 0;
  let upDays = 0;
  const missing = [];
  const lines = [];
  for (const d of days) {
    const type = d.has_upcountry ? 'DAILY_UPCOUNTRY' : 'DAILY_BASE';
    if (d.has_upcountry) upDays++; else baseDays++;
    const p = resolvePolicy(policies, { date: d.date, baseId: d.base_id, type });
    if (!p) { missing.push({ date: d.date, type }); continue; }
    const rate = toNumber(p.allowance_amount);
    amount += rate;
    lines.push({ date: d.date, type, policy_id: p.policy_id, rate });
  }
  return { base_days: baseDays, upcountry_days: upDays, amount: round2(amount), lines, missing_policy_days: missing };
}

/** เงินชดเชยต่อกิโลเมตร (ถ้ามีนโยบาย PER_KM_REIMBURSE) — trips ต้องมี date และ base_id */
export function computeKmReimbursement(trips, policies) {
  let amount = 0;
  for (const t of trips.filter(alive)) {
    const p = resolvePolicy(policies, { date: t.date, baseId: t.base_id, type: 'PER_KM_REIMBURSE' });
    if (p) amount += toNumber(t.distance_km) * toNumber(p.allowance_amount);
  }
  return round2(amount);
}

/** Actual Total ของ Monthly Actual (คำนวณใหม่ฝั่ง Backend เสมอ ไม่เชื่อค่าจาก Client) */
export function computeActualTotal(m) {
  return round2(toNumber(m.fuel_cost) + toNumber(m.maintenance_cost) + toNumber(m.vehicle_wear_cost) + toNumber(m.other_cost));
}

/**
 * การวิเคราะห์รายเดือน — คืนค่าองค์ประกอบทั้งหมด ไม่ใช่เฉพาะยอดสุทธิ
 *
 *   Actual Operating Cost = Monthly Actual Total (+ Trip Expense ถ้า includeTripExpenses)
 *   Reimbursed Expense    = KM Reimbursement (+ Trip Expense ที่จ่ายคืนแล้ว เฉพาะเมื่อรวม Trip Expense ใน Actual)
 *   Net Employee Burden   = Actual Operating Cost − Reimbursed Expense
 *   Expense Gap           = Net Employee Burden − Daily Allowance   (> 0 แปลว่าเบี้ยเลี้ยงไม่พอ)
 *
 * ป้องกันการนับซ้ำ: ถ้า Trip Expense ไม่ได้อยู่ใน Actual ตั้งแต่ต้น จะไม่หักยอดจ่ายคืนของมัน
 */
export function monthlyAnalysis({ monthlyActualTotal, tripExpenses, kmReimbursement = 0, dailyAllowance = 0, includeTripExpenses = true }) {
  const tripTotal = includeTripExpenses ? toNumber(tripExpenses?.total) : 0;
  const tripReimbursed = includeTripExpenses ? toNumber(tripExpenses?.reimbursed) : 0;
  const actualOperatingCost = round2(toNumber(monthlyActualTotal) + tripTotal);
  const reimbursedExpense = round2(tripReimbursed + toNumber(kmReimbursement));
  const netEmployeeBurden = round2(actualOperatingCost - reimbursedExpense);
  const expenseGap = round2(netEmployeeBurden - toNumber(dailyAllowance));
  return {
    components: {
      monthly_actual_total: round2(toNumber(monthlyActualTotal)),
      trip_expense_included: round2(tripTotal),
      trip_expense_reimbursed: round2(tripReimbursed),
      km_reimbursement: round2(toNumber(kmReimbursement)),
      include_trip_expenses: includeTripExpenses
    },
    actual_operating_cost: actualOperatingCost,
    reimbursed_expense: reimbursedExpense,
    net_employee_burden: netEmployeeBurden,
    daily_allowance: round2(toNumber(dailyAllowance)),
    expense_gap: expenseGap
  };
}
