# BUSINESS_RULES

> ข้อที่มี 🟡 คือ **สมมติฐานตั้งต้น** ที่ระบบใช้ไปก่อน เพราะเอกสารแผนหัวข้อ 12 ยังไม่ได้ตัดสิน — ทุกข้อปรับได้จากหน้า Admin (Settings / Policies) โดยไม่ต้องแก้โค้ด เว้นแต่ระบุไว้

## 1. ระยะทาง

- Base KM = ผลรวม `distance_km` ของเที่ยว `BASE`
- Upcountry KM = ผลรวม `distance_km` ของเที่ยว `UPCOUNTRY`
- Total KM = Base KM + Upcountry KM
- ไม่นับเที่ยวที่ `is_deleted = TRUE`
- ระยะทางเป็นกิโลเมตร ทศนิยม 2 ตำแหน่ง (0–5,000 กม./เที่ยว) — เลขไมล์เป็นข้อมูลเสริม ถ้ากรอกต้อง `odometer_end ≥ odometer_start`
- 🟡 พนักงานเลือก BASE / UPCOUNTRY เองตามกติกาที่อธิบายไว้ในช่อง Description ของ Base และ Secretary แก้ได้พร้อมเหตุผล (ยังไม่คำนวณอัตโนมัติจากพิกัด)

## 2. ค่าใช้จ่ายรายเที่ยว

- Trip Expense = TOLL + PARKING + OTHER
- `receipt_status` (NONE / UPLOADED / VERIFIED) แยกจาก `reimbursement_status` (PENDING / REIMBURSED / NOT_CLAIMED)
- `reimbursed_amount` ว่าง + สถานะ REIMBURSED = จ่ายคืนเต็มจำนวน

## 3. ค่าใช้จ่ายจริงรายเดือน

- 1 พนักงาน : 1 แถว / เดือน
- `actual_total = fuel + maintenance + vehicle_wear + other` — **Backend คำนวณเสมอ** ไม่รับค่าจาก Client
- ค่าใช้จ่ายรายเดือน **ไม่ควรรวม** ค่าทางด่วน/จอดรถที่บันทึกรายเที่ยวไปแล้ว (ข้อความกำกับบนหน้าจอ)

## 4. การวิเคราะห์รายเดือน (สูตรหลัก)

```
Actual Operating Cost = Monthly Actual Total + Trip Expense*        (*ถ้า INCLUDE_TRIP_EXPENSES_IN_ACTUAL = TRUE)
Reimbursed Expense    = KM Reimbursement + Trip Expense ที่จ่ายคืนแล้ว*
Net Employee Burden   = Actual Operating Cost − Reimbursed Expense
Expense Gap           = Net Employee Burden − Daily Allowance        (> 0 = เบี้ยเลี้ยงไม่พอ)
```

**กันการนับซ้ำ:** ถ้า `INCLUDE_TRIP_EXPENSES_IN_ACTUAL = FALSE` (Trip Expense ไม่อยู่ใน Actual ตั้งแต่ต้น) ระบบจะ **ไม่หัก** ยอดจ่ายคืนของ Trip Expense ออก — ตรงกับข้อควรระวังในแผนข้อ 3

🟡 ค่าตั้งต้น `TRUE`: ถือว่าค่าทางด่วน/จอดรถที่พนักงานจ่ายเป็นภาระจริง และยอดที่บริษัทจ่ายคืนเป็นตัวหัก

รายงานแสดงองค์ประกอบทุกตัว (`components`) ไม่ใช่เฉพาะยอดสุทธิ

## 5. Daily Allowance

- นับเฉพาะวันที่มี Daily Record ที่สถานะอยู่ใน `REPORT_STATUSES` และมีเที่ยวอย่างน้อย 1 เที่ยว
- 🟡 `ALLOWANCE_DAY_RULE = UPCOUNTRY_IF_ANY`: วันที่มีเที่ยว Upcountry ≥ 1 เที่ยว ใช้อัตรา `DAILY_UPCOUNTRY` นอกนั้นใช้ `DAILY_BASE` (1 วันได้ 1 อัตรา)
- เลือกนโยบายตาม **วันที่ของรายการ** (Effective From/To) → เปลี่ยนอัตราแล้วคำนวณย้อนหลังยังถูกต้อง
- นโยบายเฉพาะ Base ชนะนโยบายกลาง (base_id ว่าง); ถ้าซ้อนกันใช้ฉบับ effective_from ล่าสุด
- วันที่ไม่มีนโยบายรองรับ จะแจ้งใน `data_quality.missing_policy_days` (ไม่เดาอัตรา)
- `PER_KM_REIMBURSE` (ถ้ามี) = Σ distance_km × อัตรา ณ วันที่ของเที่ยว
- เปลี่ยนอัตรา = ปิดนโยบายเดิมด้วย Effective To แล้วสร้างใหม่ (แก้จำนวนเงินของนโยบายเดิมไม่ได้)

## 6. Workflow และสิทธิ์

```
DRAFT ──submit──▶ SUBMITTED ──verify──▶ VERIFIED
   ▲                  │
   └── RETURNED ◀─return (ต้องมีเหตุผล)
```

| การกระทำ | ใครทำได้ | สถานะที่อนุญาต |
|---|---|---|
| เพิ่ม/แก้/ลบเที่ยวและค่าใช้จ่าย | Employee (เจ้าของ) | DRAFT, RETURNED |
| ลบทั้งวัน (soft) | Employee (เจ้าของ) | DRAFT |
| Submit | Employee (เจ้าของ) | DRAFT, RETURNED (ต้องมี ≥ 1 เที่ยว) |
| แก้ไขพร้อมเหตุผล | Secretary (Base ในขอบเขต) | SUBMITTED, VERIFIED |
| Return / Verify | Secretary (Base ในขอบเขต) | SUBMITTED |
| ดูรายงาน | Management / Super Admin | Read-only |

- Daily Record 1 รายการ / พนักงาน / วัน · บันทึกล่วงหน้าไม่ได้
- Base ของ Daily Record = snapshot จาก `03_base_assignments` ณ วันที่บันทึก (ย้าย Base ภายหลังไม่กระทบประวัติ)
- ข้อมูลรถ/ทะเบียน/ชนิดน้ำมัน snapshot ลงเที่ยวทุกครั้ง
- Secretary ขอบเขตตาม `12_admin_users.team_scope` (`ALL` หรือ base_id คั่นด้วย `,`) — 🟡 ไม่มีแถว = ไม่เห็นข้อมูลใดเลย (ปลอดภัยไว้ก่อน)
- 🟡 รายงานผู้บริหารนับเฉพาะ `VERIFIED` (ตั้งค่า `REPORT_STATUSES`)

## 7. Audit Log

บันทึก: SUBMIT, RETURN, VERIFY, SECRETARY_EDIT (ค่าก่อน/หลังเฉพาะ field ที่เปลี่ยน + เหตุผล), SOFT_DELETE, การจัดการผู้ใช้/Base/นโยบาย/ตั้งค่า, RESET_PASSWORD (ไม่เก็บรหัสผ่าน)

## 8. ใบเสร็จ

- 🟡 ชนิดไฟล์: JPEG, PNG, WEBP, HEIC, PDF · ขนาดสูงสุด 3 MB (Frontend ย่อรูปให้อัตโนมัติ)
- ตรวจ magic bytes ฝั่ง Backend ป้องกันการปลอม mime type
- ดูได้: เจ้าของ, Secretary ใน Base scope, Management, Super Admin
