import { getDb } from '../db/index.js';
import { DEFAULT_SETTINGS } from '../db/schema.js';
import { toBool } from '../lib/utils.js';

const defaults = Object.fromEntries(DEFAULT_SETTINGS.map(([k, v]) => [k, v]));

export async function getSettings() {
  const rows = await getDb().list('settings');
  const map = { ...defaults };
  for (const r of rows) map[r.SettingKey] = String(r.Value);
  return map;
}

export async function getTypedSettings() {
  const s = await getSettings();
  return {
    raw: s,
    maxReceiptBytes: Number(s.MAX_RECEIPT_SIZE_MB || 3) * 1024 * 1024,
    allowedReceiptTypes: String(s.ALLOWED_RECEIPT_TYPES).split(',').map((x) => x.trim()),
    reportStatuses: String(s.REPORT_STATUSES || 'VERIFIED').split(',').map((x) => x.trim()),
    includeTripExpensesInActual: toBool(s.INCLUDE_TRIP_EXPENSES_IN_ACTUAL ?? 'TRUE'),
    fallbackCostPerKm: Number(s.FALLBACK_COST_PER_KM || 4.5)
  };
}
