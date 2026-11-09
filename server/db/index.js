/**
 * Data Access Layer — Business logic เรียกผ่าน `db` เท่านั้น ห้ามเรียก googleapis ตรง
 * การย้ายฐานข้อมูล: สร้าง postgresAdapter ที่มี method list/get/insert/insertMany/update/updateMany
 * แล้วสลับใน getDb() โดยไม่ต้องแก้ services
 */
import { googleSheetsAdapter } from './googleSheetsAdapter.js';

let current = null;

export function getDb() {
  if (!current) current = googleSheetsAdapter;
  return current;
}

/** ใช้ใน test เพื่อฉีด memory adapter */
export function setDb(adapter) {
  current = adapter;
}
