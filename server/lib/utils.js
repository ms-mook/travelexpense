import { randomUUID } from 'node:crypto';

export const uuid = () => randomUUID();
export const nowIso = () => new Date().toISOString();

/** วันที่ปัจจุบันตามเวลาไทย (YYYY-MM-DD) */
export const todayTH = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

/** ปัดเป็นทศนิยม 2 ตำแหน่ง ป้องกัน floating error */
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const toNumber = (v, fallback = 0) => {
  if (v === '' || v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const toBool = (v) => v === true || String(v).toUpperCase() === 'TRUE';

export const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

/** วันที่ d (YYYY-MM-DD) อยู่ในช่วง [from, to] หรือไม่ (to ว่าง = ไม่มีวันสิ้นสุด) */
export const inEffectiveRange = (d, from, to) => (!from || d >= from) && (!to || d <= to);

export const monthOf = (date) => String(date).slice(0, 7);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
