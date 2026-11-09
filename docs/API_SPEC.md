# API_SPEC — /api/v1

> สร้างจากตาราง route ใน `server/routes/index.js` · ทุก endpoint ต้องมี `Authorization: Bearer <Supabase access token>`

## รูปแบบทั่วไป

- Success: `{ "data": ... }` (POST ตอบ 201)
- Error: `{ "error": { "code", "message", "details" } }`

| HTTP | code | ความหมาย |
|---|---|---|
| 400 | VALIDATION_ERROR / INVALID_JSON | ข้อมูลไม่ถูกต้อง (`details` = field → ข้อความ) |
| 401 | UNAUTHORIZED | ไม่มี/หมดอายุ token |
| 403 | FORBIDDEN | Role ไม่อนุญาต, ไม่ใช่เจ้าของ, หรืออยู่นอก Base scope |
| 404 | NOT_FOUND | |
| 409 | CONFLICT | ข้อมูลซ้ำ หรือ `updated_at` ไม่ตรง (มีคนแก้ก่อน) |
| 422 | INVALID_STATE | สถานะไม่อนุญาต เช่น แก้รายการ VERIFIED |

- **Idempotency:** POST ส่ง header `Idempotency-Key: <uuid>` ได้ — คำขอซ้ำด้วย key เดิมจะได้ผลลัพธ์เดิมโดยไม่สร้างข้อมูลใหม่
- **Optimistic lock:** PATCH trips / monthly-actuals ส่ง `updated_at` ที่อ่านล่าสุดมาด้วย → ถ้าไม่ตรงได้ 409
- **Login/Logout:** ทำผ่าน Supabase Auth client (`signInWithPassword` / `signOut`) ฝั่ง Frontend โดยตรง แล้วเรียก `GET /auth/me` เพื่อโหลดโปรไฟล์และ Role จาก Backend

## Endpoints

| Method | Path | Roles |
|---|---|---|
| GET | `/auth/me` | EMPLOYEE, SECRETARY, MANAGEMENT, SUPER_ADMIN |
| GET | `/bases` | EMPLOYEE, SECRETARY, MANAGEMENT, SUPER_ADMIN |
| GET | `/users/me` | EMPLOYEE, SECRETARY, MANAGEMENT, SUPER_ADMIN |
| GET | `/me/overview` | EMPLOYEE |
| GET | `/me/base-history` | EMPLOYEE |
| GET | `/vehicles` | EMPLOYEE |
| POST | `/vehicles` | EMPLOYEE |
| PATCH | `/vehicles/:id` | EMPLOYEE |
| GET | `/daily-records` | EMPLOYEE |
| POST | `/daily-records` | EMPLOYEE |
| GET | `/daily-records/:id` | EMPLOYEE, SECRETARY, MANAGEMENT, SUPER_ADMIN |
| PATCH | `/daily-records/:id` | EMPLOYEE |
| DELETE | `/daily-records/:id` | EMPLOYEE |
| POST | `/daily-records/:id/trips` | EMPLOYEE |
| POST | `/daily-records/:id/submit` | EMPLOYEE |
| PATCH | `/trips/:id` | EMPLOYEE |
| DELETE | `/trips/:id` | EMPLOYEE |
| POST | `/trips/:id/expenses` | EMPLOYEE |
| DELETE | `/expenses/:id` | EMPLOYEE |
| POST | `/receipts/upload` | EMPLOYEE |
| GET | `/receipts/:fileId` | EMPLOYEE, SECRETARY, MANAGEMENT, SUPER_ADMIN |
| GET | `/monthly-actuals` | EMPLOYEE |
| POST | `/monthly-actuals` | EMPLOYEE |
| POST | `/monthly-actuals/:id/submit` | EMPLOYEE |
| GET | `/secretary/records` | SECRETARY, SUPER_ADMIN |
| GET | `/secretary/pending` | SECRETARY, SUPER_ADMIN |
| PATCH | `/secretary/trips/:id` | SECRETARY, SUPER_ADMIN |
| PATCH | `/secretary/expenses/:id` | SECRETARY, SUPER_ADMIN |
| POST | `/secretary/records/:id/verify` | SECRETARY, SUPER_ADMIN |
| POST | `/secretary/records/:id/return` | SECRETARY, SUPER_ADMIN |
| GET | `/secretary/monthly-actuals` | SECRETARY, SUPER_ADMIN |
| PATCH | `/secretary/monthly-actuals/:id` | SECRETARY, SUPER_ADMIN |
| POST | `/secretary/monthly-actuals/:id/verify` | SECRETARY, SUPER_ADMIN |
| POST | `/secretary/monthly-actuals/:id/return` | SECRETARY, SUPER_ADMIN |
| GET | `/secretary/audit-logs` | SECRETARY, SUPER_ADMIN |
| GET | `/management/dashboard` | MANAGEMENT, SUPER_ADMIN |
| GET | `/management/summary` | MANAGEMENT, SUPER_ADMIN |
| GET | `/management/employees` | MANAGEMENT, SUPER_ADMIN |
| GET | `/management/bases` | MANAGEMENT, SUPER_ADMIN |
| GET | `/management/expenses` | MANAGEMENT, SUPER_ADMIN |
| GET | `/management/export` | MANAGEMENT, SUPER_ADMIN |
| GET | `/admin/users` | SUPER_ADMIN |
| POST | `/admin/users` | SUPER_ADMIN |
| PATCH | `/admin/users/:id` | SUPER_ADMIN |
| POST | `/admin/users/:id/reset-password` | SUPER_ADMIN |
| POST | `/admin/bases` | SUPER_ADMIN |
| PATCH | `/admin/bases/:id` | SUPER_ADMIN |
| GET | `/admin/base-assignments` | SUPER_ADMIN |
| POST | `/admin/base-assignments` | SUPER_ADMIN |
| GET | `/admin/policies` | SUPER_ADMIN, MANAGEMENT |
| POST | `/admin/policies` | SUPER_ADMIN |
| PATCH | `/admin/policies/:id` | SUPER_ADMIN |
| GET | `/admin/settings` | SUPER_ADMIN |
| PATCH | `/admin/settings/:key` | SUPER_ADMIN |
| GET | `/admin/audit-logs` | SUPER_ADMIN |

## หมายเหตุสำคัญ

- `POST /receipts/upload` body: `{ file_name, mime_type, data_base64 }` → `{ receipt_file_id, receipt_name, receipt_mime }` แล้วส่ง `receipt_file_id` ไปกับ `POST /trips/:id/expenses` (Backend ตรวจว่าไฟล์เป็นของผู้อัปโหลดจริง)
- `GET /receipts/:fileId` stream ไฟล์ผ่าน Backend หลังตรวจสิทธิ์ของรายการที่ผูกไฟล์ — ไม่มีลิงก์ Public
- `GET /management/export?month=YYYY-MM&base_id=` → CSV (UTF-8 BOM เปิดใน Excel ภาษาไทยได้)
- `GET /secretary/records` รองรับ `status, employee_id, base_id, date_from, date_to, page, page_size`
- `PATCH /secretary/*` ต้องมี `reason` เสมอ และบันทึก Audit Log (ค่าก่อน/หลัง)
