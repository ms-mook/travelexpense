export const STATUS_LABEL = {
  DRAFT: 'ฉบับร่าง', SUBMITTED: 'รอตรวจสอบ', RETURNED: 'ส่งกลับแก้ไข', VERIFIED: 'ยืนยันแล้ว'
};
export const STATUS_STYLE = {
  DRAFT: 'bg-slate-100 text-slate-700', SUBMITTED: 'bg-amber-100 text-amber-800',
  RETURNED: 'bg-rose-100 text-rose-700', VERIFIED: 'bg-emerald-100 text-emerald-800'
};
export const TRAVEL_TYPE_LABEL = { BASE: 'ในเขต Base', UPCOUNTRY: 'ต่างจังหวัด (Upcountry)' };
export const EXPENSE_TYPE_LABEL = { TOLL: 'ค่าทางด่วน', PARKING: 'ค่าจอดรถ', OTHER: 'อื่น ๆ' };
export const REIMBURSE_LABEL = { PENDING: 'รอเบิก', REIMBURSED: 'จ่ายคืนแล้ว', NOT_CLAIMED: 'ไม่เบิก' };
export const RECEIPT_LABEL = { NONE: 'ไม่มีใบเสร็จ', UPLOADED: 'แนบแล้ว', VERIFIED: 'ตรวจแล้ว' };
export const ROLE_LABEL = { EMPLOYEE: 'Service Engineer', SECRETARY: 'Secretary', MANAGEMENT: 'Management', SUPER_ADMIN: 'Super Admin' };
export const FUEL_LABEL = {
  GASOHOL_91: 'แก๊สโซฮอล์ 91', GASOHOL_95: 'แก๊สโซฮอล์ 95', E20: 'E20', E85: 'E85', BENZINE_95: 'เบนซิน 95',
  DIESEL: 'ดีเซล', DIESEL_B20: 'ดีเซล B20', HYBRID: 'ไฮบริด', EV: 'ไฟฟ้า (EV)', LPG: 'LPG', NGV: 'NGV', OTHER: 'อื่น ๆ (ระบุ)'
};
export const ALLOWANCE_TYPE_LABEL = {
  DAILY_BASE: 'เบี้ยเลี้ยงรายวัน (ในเขต Base)', DAILY_UPCOUNTRY: 'เบี้ยเลี้ยงรายวัน (Upcountry)',
  PER_KM_REIMBURSE: 'ค่าชดเชยต่อกิโลเมตร'
};
