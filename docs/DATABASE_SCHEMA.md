# DATABASE_SCHEMA — TRAVEL_EXPENSE_DATABASE (Google Sheets)

> สร้างจาก `server/db/schema.js` (แหล่งความจริงเดียว) — รัน `npm run setup:sheets` เพื่อสร้าง Sheet/คอลัมน์อัตโนมัติ

มาตรฐาน: PK = UUID · FK ใช้ ID เท่านั้น (ห้ามเลขแถว/ชื่อ) · วันที่ `YYYY-MM-DD` · Timestamp ISO 8601 (UTC) · เงิน THB ทศนิยม 2 · ระยะทาง KM ทศนิยม 2 · Soft delete ด้วย `is_deleted`

Sheet ต้องแชร์ให้ Service Account เป็น Editor เท่านั้น ห้ามเปิด "Anyone with the link"

## 01_users

Primary key: `employee_id`

| คอลัมน์ | หมายเหตุ |
|---|---|
| `employee_id` |  |
| `auth_user_id` |  |
| `employee_code` |  |
| `full_name` |  |
| `email` |  |
| `department` |  |
| `position` |  |
| `role` |  |
| `base_id` |  |
| `status` |  |
| `created_at` |  |
| `updated_at` |  |
| `username` | เพิ่มจากแผน v1.0 |
| `home_location` | เพิ่มจากแผน v1.0 |

## 02_bases

Primary key: `base_id`

| คอลัมน์ | หมายเหตุ |
|---|---|
| `base_id` |  |
| `base_code` |  |
| `base_name` |  |
| `province` |  |
| `district` |  |
| `description` |  |
| `status` |  |
| `created_at` | เพิ่มจากแผน v1.0 |
| `updated_at` | เพิ่มจากแผน v1.0 |
| `provinces` | เพิ่มจากแผน v1.0 |

## 03_base_assignments

Primary key: `assignment_id`

| คอลัมน์ | หมายเหตุ |
|---|---|
| `assignment_id` |  |
| `employee_id` |  |
| `base_id` |  |
| `effective_from` |  |
| `effective_to` |  |
| `assigned_by` |  |
| `created_at` |  |

## 04_vehicles

Primary key: `vehicle_id`

| คอลัมน์ | หมายเหตุ |
|---|---|
| `vehicle_id` |  |
| `employee_id` |  |
| `vehicle_brand` |  |
| `vehicle_model` |  |
| `license_plate` |  |
| `fuel_type` |  |
| `other_fuel_type` |  |
| `active` |  |
| `created_at` |  |
| `updated_at` |  |

## 05_daily_records

Primary key: `daily_record_id`

| คอลัมน์ | หมายเหตุ |
|---|---|
| `daily_record_id` |  |
| `employee_id` |  |
| `record_date` |  |
| `base_id` |  |
| `base_name_snapshot` | เพิ่มจากแผน v1.0 |
| `status` |  |
| `employee_note` |  |
| `secretary_note` | เพิ่มจากแผน v1.0 |
| `submitted_at` |  |
| `verified_by` |  |
| `verified_at` |  |
| `created_at` |  |
| `updated_at` |  |
| `is_deleted` |  |

## 06_trips

Primary key: `trip_id`

| คอลัมน์ | หมายเหตุ |
|---|---|
| `trip_id` |  |
| `daily_record_id` |  |
| `employee_id` |  |
| `vehicle_id` |  |
| `vehicle_model_snapshot` |  |
| `license_plate_snapshot` | เพิ่มจากแผน v1.0 |
| `fuel_type_snapshot` |  |
| `sequence_no` |  |
| `travel_type` |  |
| `origin` |  |
| `destination` |  |
| `distance_km` |  |
| `odometer_start` |  |
| `odometer_end` |  |
| `note` |  |
| `created_at` |  |
| `updated_at` |  |
| `is_deleted` |  |
| `destination_province` | เพิ่มจากแผน v1.0 |
| `customer_name` | เพิ่มจากแผน v1.0 |
| `job_type` | เพิ่มจากแผน v1.0 |
| `ticket_no` | เพิ่มจากแผน v1.0 |
| `maps_distance_km` | เพิ่มจากแผน v1.0 |
| `origin_is_home` | เพิ่มจากแผน v1.0 |
| `destination_is_home` | เพิ่มจากแผน v1.0 |

## 07_expenses

Primary key: `expense_id`

| คอลัมน์ | หมายเหตุ |
|---|---|
| `expense_id` |  |
| `trip_id` |  |
| `daily_record_id` | เพิ่มจากแผน v1.0 |
| `employee_id` |  |
| `expense_type` |  |
| `amount` |  |
| `receipt_file_id` |  |
| `receipt_name` |  |
| `receipt_mime` | เพิ่มจากแผน v1.0 |
| `receipt_status` |  |
| `reimbursement_status` |  |
| `reimbursed_amount` | เพิ่มจากแผน v1.0 |
| `reimbursed_at` | เพิ่มจากแผน v1.0 |
| `note` |  |
| `created_at` |  |
| `updated_at` | เพิ่มจากแผน v1.0 |
| `is_deleted` | เพิ่มจากแผน v1.0 |

## 08_monthly_actuals

Primary key: `monthly_actual_id`

| คอลัมน์ | หมายเหตุ |
|---|---|
| `monthly_actual_id` |  |
| `employee_id` |  |
| `month` |  |
| `fuel_cost` |  |
| `maintenance_cost` |  |
| `vehicle_wear_cost` |  |
| `other_cost` |  |
| `actual_total` |  |
| `note` |  |
| `secretary_note` | เพิ่มจากแผน v1.0 |
| `status` |  |
| `submitted_at` |  |
| `verified_by` |  |
| `verified_at` | เพิ่มจากแผน v1.0 |
| `created_at` |  |
| `updated_at` |  |

## 09_allowance_policies

Primary key: `policy_id`

| คอลัมน์ | หมายเหตุ |
|---|---|
| `policy_id` |  |
| `policy_name` |  |
| `base_id` |  |
| `allowance_type` |  |
| `allowance_amount` |  |
| `effective_from` |  |
| `effective_to` |  |
| `status` |  |
| `created_by` |  |
| `created_at` |  |
| `updated_at` | เพิ่มจากแผน v1.0 |

## 10_settings

Primary key: `SettingKey`

| คอลัมน์ | หมายเหตุ |
|---|---|
| `SettingKey` |  |
| `Value` |  |
| `EffectiveDate` |  |
| `Description` | เพิ่มจากแผน v1.0 |
| `updated_at` | เพิ่มจากแผน v1.0 |

## 11_audit_logs

Primary key: `log_id`

| คอลัมน์ | หมายเหตุ |
|---|---|
| `log_id` |  |
| `actor_id` |  |
| `actor_role` |  |
| `action` |  |
| `entity_type` |  |
| `entity_id` |  |
| `old_value_json` |  |
| `new_value_json` |  |
| `reason` |  |
| `created_at` |  |

## 12_admin_users

Primary key: `admin_id`

| คอลัมน์ | หมายเหตุ |
|---|---|
| `admin_id` |  |
| `auth_user_id` |  |
| `email` |  |
| `role` |  |
| `team_scope` |  |
| `status` |  |
| `created_at` |  |

## 13_idempotency_keys

Primary key: `idempotency_key`

| คอลัมน์ | หมายเหตุ |
|---|---|
| `idempotency_key` |  |
| `actor_id` |  |
| `route` |  |
| `status_code` |  |
| `response_json` |  |
| `created_at` |  |

Sheet ที่เพิ่มจากแผน v1.0 — เก็บผลของคำขอ POST ที่มี `Idempotency-Key` เพื่อกันการสร้างซ้ำเมื่อ client retry (ล้างข้อมูลเก่ากว่า 30 วันได้)

## ความสัมพันธ์หลัก

```
01_users ─┬─< 03_base_assignments >── 02_bases ──< 09_allowance_policies (base_id ว่าง = ทุก Base)
          ├─< 04_vehicles
          ├─< 05_daily_records ──< 06_trips ──< 07_expenses
          └─< 08_monthly_actuals
12_admin_users (team_scope ของ Secretary) ── auth_user_id ── 01_users
11_audit_logs : เก็บ old/new ของทุกการเปลี่ยนแปลงสำคัญ
```
