import { getDb } from '../db/index.js';
import { badRequest, notFound } from '../lib/errors.js';
import { nowIso, toBool, uuid } from '../lib/utils.js';
import { assertOwner } from '../middleware/auth.js';

const normalize = (v) => ({ ...v, active: toBool(v.active) });

export async function listMyVehicles(ctx, { includeInactive = false } = {}) {
  const rows = await getDb().list('vehicles');
  return rows.filter((v) => v.employee_id === ctx.user.employee_id).map(normalize)
    .filter((v) => includeInactive || v.active);
}

function checkFuel(input) {
  if (input.fuel_type === 'OTHER' && !input.other_fuel_type) throw badRequest('กรุณาระบุชนิดน้ำมัน (Other)');
  if (input.fuel_type && input.fuel_type !== 'OTHER') input.other_fuel_type = '';
}

export async function createVehicle(ctx, input) {
  checkFuel(input);
  const ts = nowIso();
  const row = { vehicle_id: uuid(), employee_id: ctx.user.employee_id, ...input,
    license_plate: input.license_plate.toUpperCase(), active: input.active ?? true, created_at: ts, updated_at: ts };
  await getDb().insert('vehicles', row);
  return normalize(row);
}

export async function updateVehicle(ctx, vehicleId, patch) {
  const db = getDb();
  const v = await db.get('vehicles', vehicleId);
  if (!v) throw notFound();
  assertOwner(ctx, v.employee_id);
  checkFuel({ ...v, ...patch });
  // แก้ไขรถไม่กระทบประวัติ เพราะ trips เก็บ snapshot ไว้แล้ว
  return normalize(await db.update('vehicles', vehicleId, { ...patch, updated_at: nowIso() }));
}

export function fuelLabel(v) {
  return v.fuel_type === 'OTHER' ? `OTHER:${v.other_fuel_type}` : v.fuel_type;
}
