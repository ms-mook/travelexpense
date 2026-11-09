/**
 * Username login — ใช้ร่วมกันทั้ง Frontend และ Backend
 *
 * Supabase Auth ต้องมีอีเมล จึงแปลง username → อีเมลภายในที่ไม่มีอยู่จริง (โดเมน .local)
 * ระบบไม่ส่งอีเมลใด ๆ: Admin สร้างบัญชีแบบยืนยันแล้ว และรีเซ็ตรหัสผ่านให้เอง
 * ⚠ ห้ามเปลี่ยน USERNAME_DOMAIN หลังมีผู้ใช้แล้ว ไม่เช่นนั้นบัญชีเดิมจะ login ไม่ได้
 */
export const USERNAME_DOMAIN = 'travelexpense.local';

/** 3–30 ตัว: a-z 0-9 . _ - ขึ้นต้นด้วยตัวอักษรหรือตัวเลข */
export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export const normalizeUsername = (u) => String(u || '').trim().toLowerCase();

export function isValidUsername(u) {
  return USERNAME_RE.test(normalizeUsername(u));
}

export function usernameToAuthEmail(u) {
  return `${normalizeUsername(u)}@${USERNAME_DOMAIN}`;
}

/** ช่อง login รับได้ทั้ง username และอีเมลเต็ม (เผื่อบัญชีที่สร้างจาก Supabase Dashboard) */
export function loginIdToAuthEmail(id) {
  const v = normalizeUsername(id);
  return v.includes('@') ? v : usernameToAuthEmail(v);
}
