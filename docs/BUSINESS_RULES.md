# BUSINESS_RULES

> ข้อที่มี 🟡 คือ **สมมติฐานตั้งต้น** ที่ระบบใช้ไปก่อน เพราะเอกสารแผนหัวข้อ 12 ยังไม่ได้ตัดสิน — ทุกข้อปรับได้จากหน้า Admin (Settings / Policies) โดยไม่ต้องแก้โค้ด เว้นแต่ระบุไว้

## 0. การเข้าสู่ระบบ (Username + Password)

- ผู้ใช้ login ด้วย **username + password** — ไม่ใช้อีเมลบริษัท และระบบไม่ส่งอีเมลใด ๆ
- เบื้องหลัง Supabase Auth ต้องมีอีเมล ระบบจึงแปลงเป็นอีเมลภายใน `<username>@travelexpense.local` (โดเมนที่ไม่มีอยู่จริง) — กำหนดใน `shared/username.js` **ห้ามเปลี่ยนหลังมีผู้ใช้แล้ว**
- Username: a-z 0-9 . _ - ยาว 3–30 ตัว ไม่สนตัวพิมพ์เล็ก/ใหญ่ ห้ามซ้ำ
- บัญชีสร้างโดย Super Admin เท่านั้น (ยืนยันอัตโนมัติ) · ลืมรหัสผ่าน → Admin รีเซ็ต · ผู้ใช้เปลี่ยนรหัสเองได้ที่หน้าโปรไฟล์/เมนูด้านข้าง
- ช่อง `email` ใน 01_users เป็นอีเมลติดต่อ (ไม่บังคับ) ไม่เกี่ยวกับการ login

## 0.1 นโยบายเบี้ยเลี้ยงปัจจุบัน (ข้อมูลจากผู้ใช้ 9 พ.ย. 2026)

| ประเภทวัน | เบี้ยเลี้ยง | ค่าทางด่วน/จอดรถ | ช่องทาง |
|---|---|---|---|
| วิ่งในเขต Base | **570 บาท/วัน** | รวมอยู่ใน 570 แล้ว (ไม่เบิกแยก) | ระบบนี้ |
| ออกนอก Base | **300 บาท/วัน** (แทน 570) + **ค่าน้ำมัน 4.5 บาท/กม.** | เบิกแยก | SAP Concur |

Base และจังหวัดที่นับเป็นในเขต Base:

| Base | จังหวัด |
|---|---|
| Bangkok & Metro | กรุงเทพมหานคร, ปทุมธานี, นนทบุรี |
| Khon Kaen | ขอนแก่น |
| Chiang Mai | เชียงใหม่ |
| Nakhon Si Thammarat | นครศรีธรรมราช |
| Chonburi | ชลบุรี |

- **จัดประเภทเที่ยวอัตโนมัติ:** จังหวัดปลายทางอยู่ในรายชื่อจังหวัดของ Base (snapshot ของ Daily Record) = BASE, นอกนั้น = UPCOUNTRY — Backend คำนวณเอง ไม่รับค่าจาก Client (ยกเว้น Base ที่ยังไม่ตั้งจังหวัด) · Secretary override ได้พร้อมเหตุผล
- **วันละ 1 อัตรา:** วันที่มีเที่ยว UPCOUNTRY อย่างน้อย 1 เที่ยว = วันนอก Base (300) นอกนั้น = วันใน Base (570)
- **สถานะเบิกตั้งต้นของค่าใช้จ่ายรายเที่ยว:** เที่ยว BASE → `NOT_CLAIMED` (รวมในเบี้ยเลี้ยง) · เที่ยว UPCOUNTRY → `PENDING` (รอเบิก Concur) → Secretary เปลี่ยนเป็น `REIMBURSED` เมื่อได้รับเงิน
- ค่าน้ำมันนอก Base เบิก Concur **4.5 บาท/กม.** (นโยบาย `PER_KM_REIMBURSE`) — **คิดเฉพาะเที่ยว UPCOUNTRY** เที่ยวในเขต Base ไม่ได้ค่าต่อกม.
- ประเด็นหลักของทีม: ฝั่ง Upcountry ไม่ขาดทุน แต่ **Base กรุงเทพฯ+ปริมณฑล วันที่มีมากกว่า 1 งาน และวิ่งไกลจากที่พัก** ทำให้ 570 ไม่พอ → ดูข้อ 0.5

## 0.2 "เบี้ยเลี้ยงใน Base พอหรือไม่" (Segment analysis)

ค่าใช้จ่ายจริงรายเดือนไม่ได้แยกรายเที่ยว จึงปันส่วนตามกิโลเมตร:

```
ส่วนของ Base        = Monthly Actual × (Base KM ÷ Total KM)
ต้นทุนวันใน Base     = ส่วนของ Base + ค่าใช้จ่ายรายเที่ยว BASE
Base Gap            = ต้นทุนวันใน Base − (570 × วันใน Base)          > 0 = เบี้ยเลี้ยงไม่พอ
ต้นทุนวันนอก Base    = ส่วนที่เหลือ + ค่าใช้จ่ายรายเที่ยว UPCOUNTRY
Upcountry Gap       = ต้นทุนนอก Base − ยอดเบิกคืน − ค่าชดเชยต่อกม. − (300 × วันนอก Base)
```

## 0.5 วันใน Base รายวัน (หลายงาน / ไกลจากบ้าน)

```
ต้นทุนต่อกม. (คน)  = Monthly Actual ÷ Total KM   (ยังไม่มี Monthly Actual ที่นับได้ → FALLBACK_COST_PER_KM = 4.5 และระบุว่าเป็นค่าประมาณ)
ต้นทุนของวัน       = KM ของวัน × ต้นทุนต่อกม. + ทางด่วน/จอดรถของวัน
งานต่อวัน          = เลขใบงานไม่ซ้ำ → เที่ยวที่ระบุประเภทงาน/ลูกค้า → เที่ยวที่ปลายทางไม่ใช่บ้าน
จุดคุ้มทุน (กม./วัน) = (เบี้ยเลี้ยง/วัน − ทางด่วน/จอดเฉลี่ยต่อวัน) ÷ ต้นทุนต่อกม.
```

- จัดกลุ่มวันเป็น 1 / 2 / 3+ งาน → กม. เฉลี่ย, กม. ขาบ้าน, ต้นทุนเฉลี่ย, ส่วนต่าง, จำนวนวันที่ขาดทุน
- **กม. ขาบ้าน** = เที่ยวที่พนักงานกด "ออกจากบ้าน" หรือ "กลับบ้าน" (ที่พักเก็บเป็นย่าน/เขตใน `home_location` — ไม่ต้องใส่เลขที่บ้าน, PDPA)
- **จำลองนโยบาย** บน Dashboard: เหมาจ่าย/วัน + บาท/กม. ส่วนที่เกิน N กม. ต่อวัน → บริษัทจ่ายเพิ่มเท่าไร, วันที่ยังขาดทุนเหลือเท่าไร

## 0.3 ความน่าเชื่อถือของระยะทาง (อ้างอิง Google Maps)

- ทุกเที่ยวมีลิงก์เปิดเส้นทางใน Google Maps (ไม่ต้องใช้ API key)
- ถ้าตั้ง `GOOGLE_MAPS_API_KEY` (Routes API) ระบบคำนวณ `maps_distance_km` อัตโนมัติตอนบันทึก และขึ้นธงเมื่อระยะที่กรอกต่างเกิน **±20%**

## 0.4 งานที่ได้ (Cost per job)

- ทุกเที่ยวระบุ ลูกค้า / ประเภทงาน (PM, Corrective, Installation, Training, Delivery, Meeting, Other) / เลขใบงาน ได้
- จำนวนงาน = จำนวนเลขใบงานที่ไม่ซ้ำ (ถ้าไม่มีใช้จำนวนเที่ยวที่ระบุประเภทงาน) · ต้นทุนต่องาน = Actual Operating Cost ÷ จำนวนงาน

## 1. ระยะทาง

- Base KM = ผลรวม `distance_km` ของเที่ยว `BASE`
- Upcountry KM = ผลรวม `distance_km` ของเที่ยว `UPCOUNTRY`
- Total KM = Base KM + Upcountry KM
- ไม่นับเที่ยวที่ `is_deleted = TRUE`
- ระยะทางเป็นกิโลเมตร ทศนิยม 2 ตำแหน่ง (0–5,000 กม./เที่ยว) — เลขไมล์เป็นข้อมูลเสริม ถ้ากรอกต้อง `odometer_end ≥ odometer_start`

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
