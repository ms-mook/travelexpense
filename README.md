# Travel Expense Web App

ระบบบันทึกการเดินทางและค่าใช้จ่ายของ Service Engineer ทั่วประเทศ เพื่อเปรียบเทียบภาระค่าใช้จ่ายจริงกับ Daily Allowance และเงินที่บริษัทจ่ายคืน

**Stack:** React + Vite + Tailwind (PWA) · Vercel Functions (`/api/v1`) · Supabase Auth · Google Sheets (DB ระยะแรก) · Google Drive (ใบเสร็จ, Private)

| เอกสาร | เนื้อหา |
|---|---|
| [docs/SYSTEM_SPEC.md](docs/SYSTEM_SPEC.md) | สถาปัตยกรรม ความปลอดภัย สถานะ Milestone ข้อจำกัด Sheets |
| [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md) | สูตรคำนวณ Workflow สิทธิ์ และสมมติฐานที่ต้องยืนยัน |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | โครงสร้าง 13 Sheets |
| [docs/API_SPEC.md](docs/API_SPEC.md) | Endpoint ทั้งหมดและ Role ที่อนุญาต |

## ติดตั้งครั้งแรก

### 1. Supabase (Auth อย่างเดียว)
1. สร้างโปรเจกต์ที่ supabase.com
2. Authentication → Providers → เปิด Email, **ปิด** "Allow new users to sign up" (ให้ Admin สร้างบัญชีเท่านั้น)
3. เก็บ `Project URL`, `anon key`, `service_role key`

### 2. Google Cloud
1. สร้าง Project → เปิด **Google Sheets API** และ **Google Drive API**
2. สร้าง Service Account → สร้าง JSON key (เก็บให้ดี ห้าม commit)
3. สร้าง Spreadsheet ชื่อ `TRAVEL_EXPENSE_DATABASE` → Share ให้อีเมล Service Account เป็น **Editor** (ห้ามเปิดลิงก์สาธารณะ)
4. สร้าง **Shared Drive** (จำเป็น — Service Account ไม่มีพื้นที่ของตัวเอง) → สร้างโฟลเดอร์ `receipts` → เพิ่ม Service Account เป็น **Content manager**

### 3. ตั้งค่า Environment
```bash
cp .env.example .env    # แล้วกรอกค่า
npm install
npm run setup:sheets    # สร้าง 13 Sheets + header + ค่าตั้งต้น
npm run seed:admin      # สร้าง Super Admin คนแรก
```

### 4. รันในเครื่อง
```bash
npm i -g vercel
vercel dev              # รัน Frontend + API ที่ http://localhost:3000
```

### 5. Deploy
1. Push ขึ้น GitHub → Import ใน Vercel (Framework: Vite)
2. ใส่ Environment Variables ทุกตัวใน `.env.example` (ยกเว้น `SEED_*`) — ตัวที่ไม่ขึ้นต้น `VITE_` คือ Secret
3. Deploy

### 6. ตั้งค่าเริ่มใช้งาน (ในหน้า Admin)
1. **Base** — เพิ่ม Bangkok, Khon Kaen, Chiang Mai, Nakhon Si Thammarat ฯลฯ พร้อมเขียนกติกาขอบเขต BASE ในช่องคำอธิบาย
2. **นโยบายเบี้ยเลี้ยง** — สร้าง `DAILY_BASE`, `DAILY_UPCOUNTRY` (และ `PER_KM_REIMBURSE` ถ้ามี) พร้อม Effective From
3. **ผู้ใช้** — สร้าง Secretary (เลือก Base ที่ดูแล), Management, Service Engineer (กำหนด Base)
4. **ตั้งค่าระบบ** — ทบทวน `REPORT_STATUSES`, `INCLUDE_TRIP_EXPENSES_IN_ACTUAL`

## ทดสอบ
```bash
npm test   # unit test สูตรคำนวณ + API flow end-to-end (memory adapter ไม่ต้องต่อ Google)
```
ครอบคลุม: 401/403 ตาม Role, ข้ามพนักงาน, Base scope ของ Secretary, workflow ครบรอบ, ล็อก VERIFIED, Audit Log ค่าก่อน/หลัง, Idempotency, สูตร Net Burden / Expense Gap และการไม่หักซ้ำ

## โครงสร้าง
```
api/router.js            Vercel Function เดียว รับทุก /api/v1/*
server/
  app.js                 dispatcher (auth → role → idempotency → handler)
  routes/index.js        ตาราง route + Role
  middleware/auth.js     ตรวจ token, หา user, Base scope
  services/              business logic ต่อโดเมน
  domain/                สูตรคำนวณ + workflow (pure)
  db/                    Data Access Layer (Sheets / memory)
  validators/            schema validation
src/
  layouts/ pages/{auth,employee,secretary,management,admin}/
  components/{common,forms,navigation,dashboard}/
  services/              เรียก API (หน้าจอไม่เรียก fetch เอง)
scripts/                 setup-sheets, seed-admin
tests/                   node:test
```

## ข้อควรตัดสินใจก่อนใช้งานจริง

ระบบใช้ค่าตั้งต้นไว้แล้ว (ดู 🟡 ใน BUSINESS_RULES) แต่ต้องยืนยันกับฝ่ายบริหาร: นิยาม BASE/UPCOUNTRY, อัตราเบี้ยเลี้ยง, การรวมค่าทางด่วนใน Actual Cost, ขอบเขตของ Secretary แต่ละคน, วันปิดรอบ, นโยบายเก็บข้อมูล
