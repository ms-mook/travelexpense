/**
 * Monitor รายวัน (ไม่ real-time): เส้นทางของพนักงานในวันที่เลือก จากเที่ยวที่บันทึกไว้
 * - Secretary เห็นเฉพาะ Base ในขอบเขต · Management / Super Admin เห็นทั้งหมด
 * - รวมทุกสถานะ (ยกเว้นที่ลบ) เพื่อดูว่าใครบันทึกแล้ว/ยังไม่บันทึก
 */
import { getDb } from '../db/index.js';
import { toBool, toNumber } from '../lib/utils.js';
import { calcRecordSummary } from '../domain/recordSummary.js';
import { baseForDate } from './adminService.js';

const alive = (r) => !toBool(r.is_deleted);
const coord = (v) => (v === '' || v === null || v === undefined ? null : toNumber(v, null));

export async function dayMonitor(ctx, { date, baseId }) {
  const db = getDb();
  const [users, bases, assignments, records, trips, expenses] = await Promise.all([
    db.list('users'), db.list('bases'), db.list('baseAssignments'), db.list('dailyRecords'), db.list('trips'), db.list('expenses')
  ]);
  const baseName = Object.fromEntries(bases.map((b) => [b.base_id, b.base_name]));
  const inScope = (b) => ctx.scope.allBases || ctx.scope.baseIds.includes(b);

  const staff = users
    .filter((u) => u.role === 'EMPLOYEE' && u.status === 'ACTIVE')
    .map((u) => ({ ...u, day_base: baseForDate(assignments, u, date) }))
    .filter((u) => inScope(u.day_base) && (!baseId || u.day_base === baseId));

  const employees = staff.map((u) => {
    const rec = records.find((r) => r.employee_id === u.employee_id && r.record_date === date && alive(r));
    const myTrips = rec ? trips.filter((t) => t.daily_record_id === rec.daily_record_id && alive(t))
      .sort((a, b) => Number(a.sequence_no) - Number(b.sequence_no)) : [];
    const myExp = rec ? expenses.filter((e) => e.daily_record_id === rec.daily_record_id && alive(e)) : [];
    return {
      employee_id: u.employee_id,
      full_name: u.full_name,
      employee_code: u.employee_code,
      base_id: u.day_base,
      base_name: baseName[u.day_base] || '-',
      daily_record_id: rec?.daily_record_id || null,
      status: rec?.status || 'NOT_RECORDED',
      summary: calcRecordSummary(myTrips, myExp),
      trips: myTrips.map((t) => ({
        trip_id: t.trip_id, sequence_no: Number(t.sequence_no), travel_type: t.travel_type,
        origin: t.origin, destination: t.destination, destination_province: t.destination_province,
        customer_name: t.customer_name, job_type: t.job_type, ticket_no: t.ticket_no,
        distance_km: toNumber(t.distance_km), maps_distance_km: coord(t.maps_distance_km),
        origin_is_home: toBool(t.origin_is_home), destination_is_home: toBool(t.destination_is_home),
        origin_lat: coord(t.origin_lat), origin_lng: coord(t.origin_lng), dest_lat: coord(t.dest_lat), dest_lng: coord(t.dest_lng)
      }))
    };
  });
  employees.sort((a, b) => (b.trips.length - a.trips.length) || String(a.full_name).localeCompare(String(b.full_name), 'th'));
  return {
    date,
    totals: {
      employees: employees.length,
      recorded: employees.filter((e) => e.status !== 'NOT_RECORDED').length,
      trips: employees.reduce((s, e) => s + e.trips.length, 0),
      km: Math.round(employees.reduce((s, e) => s + e.summary.total_km, 0) * 100) / 100,
      upcountry_employees: employees.filter((e) => e.summary.upcountry_km > 0).length,
      distance_flags: employees.reduce((s, e) => s + e.summary.distance_flags, 0)
    },
    employees
  };
}

/** สถานที่ที่ไปบ่อย (60 วันล่าสุด) — ใช้ทำชิปแตะเดียวในฟอร์ม */
export async function recentPlaces(ctx, { limit = 12 } = {}) {
  const db = getDb();
  const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
  const [records, trips] = await Promise.all([db.list('dailyRecords'), db.list('trips')]);
  const recIds = new Set(records.filter((r) => r.employee_id === ctx.user.employee_id && alive(r) && r.record_date >= since)
    .map((r) => r.daily_record_id));
  const map = new Map();
  for (const t of trips.filter((x) => recIds.has(x.daily_record_id) && alive(x) && !toBool(x.destination_is_home))) {
    const key = `${t.destination}|${t.destination_province}`;
    const cur = map.get(key) || {
      destination: t.destination, destination_province: t.destination_province || '', customer_name: t.customer_name || '',
      dest_lat: coord(t.dest_lat), dest_lng: coord(t.dest_lng), count: 0, last: ''
    };
    cur.count += 1;
    if (String(t.created_at) > cur.last) { cur.last = String(t.created_at); cur.customer_name = t.customer_name || cur.customer_name; }
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).slice(0, limit);
}
