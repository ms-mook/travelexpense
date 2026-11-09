/**
 * โครงสร้าง Google Sheets (TRAVEL_EXPENSE_DATABASE)
 * - คอลัมน์แรกของทุก Sheet คือ Primary Key (UUID) ยกเว้น 10_settings ที่ใช้ SettingKey
 * - ห้ามอ้างอิงด้วยเลขแถวหรือชื่อ ใช้ ID เท่านั้น
 * - คอลัมน์ที่เพิ่มจากเอกสารแผน (v1.0) ระบุไว้ใน docs/DATABASE_SCHEMA.md
 */
export const SHEETS = {
  users: {
    name: '01_users',
    key: 'employee_id',
    columns: ['employee_id', 'auth_user_id', 'employee_code', 'full_name', 'email', 'department', 'position',
      'role', 'base_id', 'status', 'created_at', 'updated_at']
  },
  bases: {
    name: '02_bases',
    key: 'base_id',
    columns: ['base_id', 'base_code', 'base_name', 'province', 'district', 'description', 'status',
      'created_at', 'updated_at']
  },
  baseAssignments: {
    name: '03_base_assignments',
    key: 'assignment_id',
    columns: ['assignment_id', 'employee_id', 'base_id', 'effective_from', 'effective_to', 'assigned_by', 'created_at']
  },
  vehicles: {
    name: '04_vehicles',
    key: 'vehicle_id',
    columns: ['vehicle_id', 'employee_id', 'vehicle_brand', 'vehicle_model', 'license_plate', 'fuel_type',
      'other_fuel_type', 'active', 'created_at', 'updated_at']
  },
  dailyRecords: {
    name: '05_daily_records',
    key: 'daily_record_id',
    columns: ['daily_record_id', 'employee_id', 'record_date', 'base_id', 'base_name_snapshot', 'status',
      'employee_note', 'secretary_note', 'submitted_at', 'verified_by', 'verified_at', 'created_at', 'updated_at',
      'is_deleted']
  },
  trips: {
    name: '06_trips',
    key: 'trip_id',
    columns: ['trip_id', 'daily_record_id', 'employee_id', 'vehicle_id', 'vehicle_model_snapshot',
      'license_plate_snapshot', 'fuel_type_snapshot', 'sequence_no', 'travel_type', 'origin', 'destination',
      'distance_km', 'odometer_start', 'odometer_end', 'note', 'created_at', 'updated_at', 'is_deleted']
  },
  expenses: {
    name: '07_expenses',
    key: 'expense_id',
    columns: ['expense_id', 'trip_id', 'daily_record_id', 'employee_id', 'expense_type', 'amount',
      'receipt_file_id', 'receipt_name', 'receipt_mime', 'receipt_status', 'reimbursement_status',
      'reimbursed_amount', 'reimbursed_at', 'note', 'created_at', 'updated_at', 'is_deleted']
  },
  monthlyActuals: {
    name: '08_monthly_actuals',
    key: 'monthly_actual_id',
    columns: ['monthly_actual_id', 'employee_id', 'month', 'fuel_cost', 'maintenance_cost', 'vehicle_wear_cost',
      'other_cost', 'actual_total', 'note', 'secretary_note', 'status', 'submitted_at', 'verified_by',
      'verified_at', 'created_at', 'updated_at']
  },
  allowancePolicies: {
    name: '09_allowance_policies',
    key: 'policy_id',
    columns: ['policy_id', 'policy_name', 'base_id', 'allowance_type', 'allowance_amount', 'effective_from',
      'effective_to', 'status', 'created_by', 'created_at', 'updated_at']
  },
  settings: {
    name: '10_settings',
    key: 'SettingKey',
    columns: ['SettingKey', 'Value', 'EffectiveDate', 'Description', 'updated_at']
  },
  auditLogs: {
    name: '11_audit_logs',
    key: 'log_id',
    columns: ['log_id', 'actor_id', 'actor_role', 'action', 'entity_type', 'entity_id', 'old_value_json',
      'new_value_json', 'reason', 'created_at']
  },
  adminUsers: {
    name: '12_admin_users',
    key: 'admin_id',
    columns: ['admin_id', 'auth_user_id', 'email', 'role', 'team_scope', 'status', 'created_at']
  },
  idempotencyKeys: {
    name: '13_idempotency_keys',
    key: 'idempotency_key',
    columns: ['idempotency_key', 'actor_id', 'route', 'status_code', 'response_json', 'created_at']
  }
};

export const ROLES = Object.freeze({
  EMPLOYEE: 'EMPLOYEE',
  SECRETARY: 'SECRETARY',
  MANAGEMENT: 'MANAGEMENT',
  SUPER_ADMIN: 'SUPER_ADMIN'
});

export const RECORD_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  RETURNED: 'RETURNED',
  VERIFIED: 'VERIFIED'
});

export const TRAVEL_TYPES = ['BASE', 'UPCOUNTRY'];
export const EXPENSE_TYPES = ['TOLL', 'PARKING', 'OTHER'];
export const RECEIPT_STATUS = ['NONE', 'UPLOADED', 'VERIFIED'];
export const REIMBURSEMENT_STATUS = ['PENDING', 'REIMBURSED', 'NOT_CLAIMED'];
export const FUEL_TYPES = ['GASOHOL_91', 'GASOHOL_95', 'E20', 'E85', 'BENZINE_95', 'DIESEL', 'DIESEL_B20',
  'HYBRID', 'EV', 'LPG', 'NGV', 'OTHER'];
export const ALLOWANCE_TYPES = ['DAILY_BASE', 'DAILY_UPCOUNTRY', 'PER_KM_REIMBURSE'];

/** ค่าตั้งต้นของ 10_settings (สร้างโดย scripts/setup-sheets.js) */
export const DEFAULT_SETTINGS = [
  ['APP_NAME', 'Travel Expense', 'ชื่อระบบ'],
  ['CURRENCY', 'THB', 'สกุลเงิน'],
  ['DISTANCE_UNIT', 'KM', 'หน่วยระยะทาง'],
  ['MAX_RECEIPT_SIZE_MB', '3', 'ขนาดไฟล์ใบเสร็จสูงสุด (MB) — Vercel จำกัด body ~4.5MB'],
  ['ALLOWED_RECEIPT_TYPES', 'image/jpeg,image/png,image/webp,image/heic,application/pdf', 'ชนิดไฟล์ใบเสร็จที่อนุญาต'],
  ['MONTHLY_CLOSING_DAY', '5', 'วันที่ปิดรอบของเดือนถัดไป'],
  ['REPORT_STATUSES', 'VERIFIED', 'สถานะที่นับในรายงานผู้บริหาร (คั่นด้วย ,)'],
  ['INCLUDE_TRIP_EXPENSES_IN_ACTUAL', 'TRUE', 'รวมค่าทางด่วน/จอดรถ/อื่น ๆ รายเที่ยวใน Actual Operating Cost หรือไม่'],
  ['ALLOWANCE_DAY_RULE', 'UPCOUNTRY_IF_ANY', 'วิธีจัดประเภทวันสำหรับเบี้ยเลี้ยง: UPCOUNTRY_IF_ANY = วันที่มีเที่ยว Upcountry อย่างน้อย 1 เที่ยวใช้อัตรา Upcountry']
];
