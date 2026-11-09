# ย้ายระบบจาก ms-mook → tm-tmn

สถานะปัจจุบัน (9 พ.ย. 2026)

| ส่วน | อยู่ที่ |
|---|---|
| GitHub | `ms-mook/travelexpense` |
| Vercel | ทีม **MS** (`ms-1ea6`) · โปรเจกต์ `travelexpense` · region `sin1` |
| Supabase | เชื่อมผ่าน Vercel Integration ของทีม MS |
| Google Sheet / Drive | Drive ของ `mookkysupat@gmail.com` → โฟลเดอร์ `TRAVEL_EXPENSE` |
| Google Service Account | `travelexpense@assignshifts.iam.gserviceaccount.com` (Project `assignshifts`) |

## 1. GitHub (ทำก่อน)
1. `ms-mook/travelexpense` → Settings → Danger Zone → **Transfer ownership** → `tm-tmn`
2. GitHub redirect ลิงก์เก่าให้อัตโนมัติ แต่ควรอัปเดต remote ในเครื่อง: `git remote set-url origin https://github.com/tm-tmn/travelexpense.git`

## 2. Vercel — เลือก 1 ทาง
**ก. ใช้โปรเจกต์เดิม (เร็วสุด)**
- Vercel → travelexpense → Settings → Git → **Disconnect** แล้ว **Connect** ใหม่กับ `tm-tmn/travelexpense`
- ต้องติดตั้ง Vercel GitHub App ให้เข้าถึง repo ใน `tm-tmn` ก่อน
- Environment Variables และ Supabase Integration อยู่ครบ ไม่ต้องใส่ใหม่

**ข. ย้ายไปทีม Vercel ใหม่ของ tm-tmn**
- ต้องใส่ Environment Variables ใหม่ทั้งหมด (ดูข้อ 4) และเชื่อม Supabase Integration ใหม่
- URL จะเปลี่ยน → แจ้งผู้ใช้ / ติดตั้ง PWA ใหม่

## 3. ข้อมูล (ไม่ต้องย้ายก็ใช้ได้)
- Sheet และ Drive อ้างด้วย ID — ย้ายเจ้าของได้ภายหลัง โดยแชร์โฟลเดอร์ `TRAVEL_EXPENSE` ให้บัญชีใหม่เป็น Editor แล้วโอนสิทธิ์ Owner
- Supabase: ผู้ใช้ทุกคน login ด้วยอีเมลภายใน `<username>@travelexpense.local` — **ห้ามเปลี่ยน `shared/username.js`**
- ถ้าย้าย Supabase project ใหม่: ต้องสร้างผู้ใช้ใหม่ทั้งหมด และอัปเดต `auth_user_id` ใน `01_users` / `12_admin_users`

## 4. Environment Variables ที่ต้องมี
| Key | ค่า | หมายเหตุ |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | จาก Supabase | Integration ใส่ให้ |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | จาก Supabase | Integration ใส่ให้ (หรือใช้ `VITE_*`) |
| `GOOGLE_SHEETS_ID` | `18iqby_3ElYsIQmswbxdJvGf-6v4pW-_BQcx8Kc5LSrk` | |
| `GOOGLE_DRIVE_RECEIPT_FOLDER_ID` | `1lV7Ldv5qQVW4QfXnZXVaFEqsWWrxpo7p` | |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `travelexpense@assignshifts.iam.gserviceaccount.com` | |
| `GOOGLE_PRIVATE_KEY` | จาก JSON key | Sensitive |
| `GOOGLE_MAPS_API_KEY` | (ไม่บังคับ) | เปิด Routes API |
| `RECEIPTS_ENABLED` | `false` | เปิดเมื่อทำที่เก็บใบเสร็จเสร็จ |

## 5. ตรวจหลังย้าย
1. `GET /api/v1/health` → `"ok": true`
2. Login ด้วย Super Admin
3. Service Engineer บันทึก 1 เที่ยว → Secretary ยืนยัน → Dashboard เห็นตัวเลข

## 6. งานถัดไปหลังย้าย
- ที่เก็บใบเสร็จ: Supabase Storage (private bucket) แทน Google Drive — บัญชี Gmail ส่วนตัวไม่มี Shared Drive จึงให้ Service Account อัปโหลดไม่ได้
- พิจารณาย้าย Service Account ไป Google Cloud project ของ tm-tmn แทน `assignshifts`
