# SYSTEM_SPEC

อ้างอิง: *สรุปแผนพัฒนาโปรเจกต์ Travel Expense Web App v1.0 (8 พ.ย. 2026)*

## สถาปัตยกรรม

```
Browser (React + Vite + Tailwind, PWA)
   │  Supabase Auth (email/password) → access token
   ▼
Vercel Function  api/router.js   ← rewrite /api/v1/* (function เดียว)
   │  server/app.js: CORS → route → authenticate → role → idempotency → validate → service
   ├─ server/services/*      Business logic + Ownership/Base scope
   ├─ server/domain/*        สูตรคำนวณ + workflow (pure, มี unit test)
   └─ server/db/index.js     Data Access Layer
         ├─ googleSheetsAdapter  (ใช้งานจริง)
         └─ memoryAdapter        (test)
   Google Drive (Shared Drive, Private) ← ใบเสร็จ ผ่าน Backend เท่านั้น
```

## สถานะตาม Milestone

| Milestone | สถานะในโค้ดนี้ |
|---|---|
| M1 Setup + Login + RBAC | ✅ Supabase Auth, `/auth/me`, middleware ตรวจ token/role ทุก API, route guard ฝั่ง UI |
| M2 Users + Base + Vehicles | ✅ CRUD ผู้ใช้ (สร้างใน Supabase + Sheets), ระงับบัญชี (ban ใน Supabase), Base, ย้าย Base พร้อมประวัติ, รถหลายคัน |
| M3 Daily Record + Multiple Trips | ✅ หลายเที่ยว/วัน, BASE/UPCOUNTRY, snapshot, soft delete, สรุป KM |
| M4 Expenses + Receipt | ✅ TOLL/PARKING/OTHER, อัปโหลด Drive แบบ private, ตรวจเจ้าของไฟล์, ดูผ่าน Backend |
| M5 Secretary + Audit | ✅ คิวรอตรวจ, ค้นหา, แก้ไขพร้อมเหตุผล, Return/Verify, ล็อก VERIFIED, Audit Log |
| M6 Dashboard + Export + PWA | ✅ Dashboard ประเทศ/Base/พนักงาน, trend 6 เดือน, CSV export, manifest + service worker · ⏳ Excel (.xlsx) export, ทดสอบติดตั้งบนเครื่องจริง |

## ความปลอดภัย (ตามข้อกำหนดในแผนข้อ 5)

- Secret ทั้งหมดอยู่ใน Vercel Environment Variables; Frontend ใช้เฉพาะ `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- `.env` อยู่ใน `.gitignore`
- ทุก API ตรวจ token → หา user ใน `01_users` → ตรวจ Role จากตาราง route → ตรวจ Ownership / Base scope ใน service
- Validation ทุก input (ตัด field ที่ไม่ได้ประกาศทิ้ง) · คำนวณยอดรวมฝั่ง Backend
- เขียน Sheets ด้วย `valueInputOption=RAW` (กันสูตรแทรก) · CSV export กัน formula injection
- Service worker ไม่ cache `/api/*`

## ข้อจำกัด Google Sheets และวิธีรับมือ

| ปัญหา | ที่ทำไว้ |
|---|---|
| Quota API | อ่านทั้ง Sheet ครั้งเดียว + cache 3 วินาทีต่อ instance, เขียนหลายแถวด้วย append/batchUpdate ครั้งเดียว, Dashboard โหลดข้อมูลครั้งเดียวแล้วคำนวณ 6 เดือน |
| 429 / 5xx | Retry exponential backoff 5 ครั้ง |
| เขียนชนกัน | Optimistic lock ด้วย `updated_at` (409), อ่านแถวใหม่แบบไม่ใช้ cache ก่อน update และหาแถวด้วย ID ทุกครั้ง |
| กดซ้ำ/เน็ตหลุด | `Idempotency-Key` + Sheet `13_idempotency_keys` |
| ข้อมูลโต | ⚠️ อ่านทั้ง Sheet ทุกคำขอ — เหมาะกับหลักหมื่นแถว เมื่อเกิน ~50,000 แถวใน `06_trips` หรือผู้ใช้พร้อมกันมาก ให้ย้ายไป Postgres โดยเขียน adapter ใหม่ |

## การย้ายไป PostgreSQL / Supabase Database

เขียน `server/db/postgresAdapter.js` ที่มี method `list / get / insert / insertMany / update / updateMany` (signature เดียวกับ memoryAdapter) แล้วสลับใน `server/db/index.js` — services ไม่ต้องแก้ จากนั้นค่อย optimize ด้วย query ที่ filter ใน DB แทนการ `list()` ทั้งตาราง

## Backup & Restore (ข้อเสนอ)

1. Google Sheets: Version history อัตโนมัติ + ตั้ง Apps Script time-trigger คัดลอกไฟล์ทั้ง Spreadsheet ไปโฟลเดอร์ backup รายวัน (เก็บ 30 วัน)
2. Drive ใบเสร็จ: อยู่ใน Shared Drive (ไม่หายเมื่อบัญชีถูกลบ) + ถังขยะเก็บ 30 วัน
3. Export CSV รายเดือนเก็บเป็นหลักฐานหลังปิดรอบ
4. กู้คืน: Restore version ของ Spreadsheet หรือคัดลอกจาก backup → ตรวจผลด้วย `/management/summary` เทียบ CSV เดือนนั้น
