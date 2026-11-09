/**
 * Workflow สถานะ: DRAFT → SUBMITTED → (RETURNED → SUBMITTED)* → VERIFIED
 * ใช้ได้ทั้ง Daily Record และ Monthly Actual
 */
import { RECORD_STATUS as S } from '../db/schema.js';
import { invalidState } from '../lib/errors.js';

/** Employee แก้ไขได้เฉพาะ DRAFT / RETURNED — VERIFIED ล็อก */
export const employeeCanEdit = (status) => status === S.DRAFT || status === S.RETURNED;

/** Secretary แก้ไขได้เมื่อส่งตรวจแล้ว (ต้องระบุเหตุผลเสมอ) */
export const secretaryCanEdit = (status) => status === S.SUBMITTED || status === S.VERIFIED;

const TRANSITIONS = {
  submit: { from: [S.DRAFT, S.RETURNED], to: S.SUBMITTED },
  return: { from: [S.SUBMITTED], to: S.RETURNED },
  verify: { from: [S.SUBMITTED], to: S.VERIFIED }
};

export function nextStatus(action, current) {
  const t = TRANSITIONS[action];
  if (!t) throw new Error(`Unknown action ${action}`);
  if (!t.from.includes(current)) {
    throw invalidState(`ไม่สามารถ ${action} รายการที่มีสถานะ ${current} ได้`);
  }
  return t.to;
}
