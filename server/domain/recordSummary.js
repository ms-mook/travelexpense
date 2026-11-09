import { summarizeDistance, summarizeTripExpenses } from './calculations.js';
import { toNumber } from '../lib/utils.js';

/** ระยะที่กรอกต่างจาก Google Maps เกินกี่ % ถึงขึ้นธง */
export const DISTANCE_TOLERANCE = 0.2;

export function distanceCheck(trip) {
  const maps = toNumber(trip.maps_distance_km, NaN);
  if (!Number.isFinite(maps) || maps <= 0) return null;
  const claimed = toNumber(trip.distance_km);
  const diffPct = (claimed - maps) / maps;
  return { maps_km: maps, claimed_km: claimed, diff_pct: Math.round(diffPct * 1000) / 10, flagged: Math.abs(diffPct) > DISTANCE_TOLERANCE };
}

export function calcRecordSummary(trips, expenses) {
  const checks = trips.map(distanceCheck).filter(Boolean);
  return {
    trip_count: trips.length,
    ...summarizeDistance(trips),
    expenses: summarizeTripExpenses(expenses),
    distance_flags: checks.filter((c) => c.flagged).length
  };
}
