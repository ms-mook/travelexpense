/**
 * จำลองนโยบายเบี้ยเลี้ยงใน Base (ใช้ทั้ง Dashboard ฝั่ง Browser และ Backend)
 * นโยบาย = เหมาจ่าย flat บาท/วัน + perKm บาท สำหรับ กม. ที่เกิน thresholdKm ในวันนั้น
 * dayRows: [{ km, cost }]
 */
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function simulateBasePolicy(dayRows, { flat = 570, thresholdKm = 0, perKm = 0 } = {}) {
  let pay = 0; let cost = 0; let shortDays = 0;
  for (const d of dayRows) {
    const p = Number(flat || 0) + Math.max(0, Number(d.km || 0) - Number(thresholdKm || 0)) * Number(perKm || 0);
    pay += p; cost += Number(d.cost || 0);
    if (Number(d.cost || 0) > p) shortDays++;
  }
  return { company_pay: r2(pay), employee_cost: r2(cost), gap: r2(cost - pay), short_days: shortDays, days: dayRows.length };
}
