/**
 * Validator ขนาดเล็ก (ไม่พึ่ง library) — ใช้กับทุก input ที่เข้า API
 * rule: { type: 'string'|'number'|'enum'|'date'|'month'|'boolean'|'uuid'|'email', required, max, min, values, decimals }
 * คืนค่าเฉพาะ field ที่ประกาศใน schema (ตัด field แปลกปลอมทิ้ง)
 */
import { badRequest } from '../lib/errors.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function validate(schema, input, { partial = false } = {}) {
  const data = input && typeof input === 'object' ? input : {};
  const out = {};
  const errors = {};
  for (const [field, rule] of Object.entries(schema)) {
    let v = data[field];
    const empty = v === undefined || v === null || v === '';
    if (empty) {
      if (rule.required && !partial) errors[field] = 'จำเป็นต้องกรอก';
      else if (!partial && rule.default !== undefined) out[field] = rule.default;
      else if (data[field] !== undefined && !rule.required) out[field] = '';
      continue;
    }
    switch (rule.type) {
      case 'string':
        v = String(v).trim();
        if (rule.max && v.length > rule.max) errors[field] = `ยาวเกิน ${rule.max} ตัวอักษร`;
        break;
      case 'number': {
        const n = Number(v);
        if (!Number.isFinite(n)) { errors[field] = 'ต้องเป็นตัวเลข'; break; }
        if (rule.min !== undefined && n < rule.min) errors[field] = `ต้องไม่น้อยกว่า ${rule.min}`;
        if (rule.max !== undefined && n > rule.max) errors[field] = `ต้องไม่เกิน ${rule.max}`;
        if (rule.decimals !== undefined && Math.round(n * 10 ** rule.decimals) / 10 ** rule.decimals !== n) {
          errors[field] = `ทศนิยมได้ไม่เกิน ${rule.decimals} ตำแหน่ง`;
        }
        v = n;
        break;
      }
      case 'enum':
        if (!rule.values.includes(v)) errors[field] = `ต้องเป็นหนึ่งใน ${rule.values.join(', ')}`;
        break;
      case 'date':
        if (!isValidDate(String(v))) errors[field] = 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD';
        break;
      case 'month':
        if (!MONTH_RE.test(String(v))) errors[field] = 'รูปแบบเดือนต้องเป็น YYYY-MM';
        break;
      case 'boolean':
        v = v === true || v === 'true' || v === 'TRUE';
        break;
      case 'uuid':
        if (!UUID_RE.test(String(v))) errors[field] = 'รูปแบบ ID ไม่ถูกต้อง';
        break;
      case 'email':
        v = String(v).trim().toLowerCase();
        if (!EMAIL_RE.test(v)) errors[field] = 'รูปแบบอีเมลไม่ถูกต้อง';
        break;
      default:
        break;
    }
    out[field] = v;
  }
  if (Object.keys(errors).length) throw badRequest('ข้อมูลไม่ถูกต้อง', errors);
  return out;
}
