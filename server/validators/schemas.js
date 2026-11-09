import { ALLOWANCE_TYPES, EXPENSE_TYPES, FUEL_TYPES, REIMBURSEMENT_STATUS, ROLES, TRAVEL_TYPES } from '../db/schema.js';

const money = { type: 'number', min: 0, max: 10_000_000, decimals: 2 };

export const vehicleSchema = {
  vehicle_brand: { type: 'string', required: true, max: 60 },
  vehicle_model: { type: 'string', required: true, max: 60 },
  license_plate: { type: 'string', required: true, max: 30 },
  fuel_type: { type: 'enum', values: FUEL_TYPES, required: true },
  other_fuel_type: { type: 'string', max: 60 },
  active: { type: 'boolean', default: true }
};

export const dailyRecordSchema = {
  record_date: { type: 'date', required: true },
  employee_note: { type: 'string', max: 1000 }
};

export const tripSchema = {
  vehicle_id: { type: 'uuid', required: true },
  travel_type: { type: 'enum', values: TRAVEL_TYPES, required: true },
  origin: { type: 'string', required: true, max: 200 },
  destination: { type: 'string', required: true, max: 200 },
  distance_km: { type: 'number', required: true, min: 0, max: 5000, decimals: 2 },
  odometer_start: { type: 'number', min: 0, decimals: 1 },
  odometer_end: { type: 'number', min: 0, decimals: 1 },
  note: { type: 'string', max: 1000 },
  updated_at: { type: 'string' }
};

export const expenseSchema = {
  expense_type: { type: 'enum', values: EXPENSE_TYPES, required: true },
  amount: { ...money, required: true },
  receipt_file_id: { type: 'string', max: 200 },
  receipt_name: { type: 'string', max: 200 },
  receipt_mime: { type: 'string', max: 100 },
  note: { type: 'string', max: 1000 }
};

export const reimbursementSchema = {
  reimbursement_status: { type: 'enum', values: REIMBURSEMENT_STATUS, required: true },
  reimbursed_amount: money,
  reason: { type: 'string', max: 500 }
};

export const monthlyActualSchema = {
  month: { type: 'month', required: true },
  fuel_cost: { ...money, default: 0 },
  maintenance_cost: { ...money, default: 0 },
  vehicle_wear_cost: { ...money, default: 0 },
  other_cost: { ...money, default: 0 },
  note: { type: 'string', max: 1000 },
  updated_at: { type: 'string' }
};

export const reasonSchema = { reason: { type: 'string', required: true, max: 500 } };

export const userCreateSchema = {
  email: { type: 'email', required: true },
  password: { type: 'string', required: true, max: 72 },
  full_name: { type: 'string', required: true, max: 120 },
  employee_code: { type: 'string', max: 30 },
  department: { type: 'string', max: 80 },
  position: { type: 'string', max: 80 },
  role: { type: 'enum', values: Object.values(ROLES), required: true },
  base_id: { type: 'uuid' },
  team_scope: { type: 'string', max: 2000 }
};

export const userUpdateSchema = {
  full_name: { type: 'string', max: 120 },
  employee_code: { type: 'string', max: 30 },
  department: { type: 'string', max: 80 },
  position: { type: 'string', max: 80 },
  role: { type: 'enum', values: Object.values(ROLES) },
  status: { type: 'enum', values: ['ACTIVE', 'SUSPENDED'] },
  team_scope: { type: 'string', max: 2000 }
};

export const baseSchema = {
  base_code: { type: 'string', required: true, max: 20 },
  base_name: { type: 'string', required: true, max: 100 },
  province: { type: 'string', max: 80 },
  district: { type: 'string', max: 80 },
  description: { type: 'string', max: 1000 },
  status: { type: 'enum', values: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
};

export const baseAssignmentSchema = {
  employee_id: { type: 'uuid', required: true },
  base_id: { type: 'uuid', required: true },
  effective_from: { type: 'date', required: true }
};

export const policySchema = {
  policy_name: { type: 'string', required: true, max: 120 },
  base_id: { type: 'uuid' },
  allowance_type: { type: 'enum', values: ALLOWANCE_TYPES, required: true },
  allowance_amount: { ...money, required: true },
  effective_from: { type: 'date', required: true },
  effective_to: { type: 'date' },
  status: { type: 'enum', values: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
};

export const settingSchema = {
  Value: { type: 'string', required: true, max: 500 },
  EffectiveDate: { type: 'date' }
};

export const receiptUploadSchema = {
  file_name: { type: 'string', required: true, max: 200 },
  mime_type: { type: 'string', required: true, max: 100 },
  data_base64: { type: 'string', required: true }
};
