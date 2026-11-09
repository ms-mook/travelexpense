/**
 * สร้าง Sheet ทั้ง 13 แผ่นพร้อม header และค่าตั้งต้นใน 10_settings
 * รันซ้ำได้ (idempotent): จะเพิ่มเฉพาะ Sheet/คอลัมน์ที่ยังไม่มี ไม่ลบข้อมูลเดิม
 *   npm run setup:sheets
 */
import { google } from 'googleapis';
import { DEFAULT_SETTINGS, SHEETS } from '../server/db/schema.js';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

const meta = await sheets.spreadsheets.get({ spreadsheetId });
const existing = new Set(meta.data.sheets.map((s) => s.properties.title));

const toAdd = Object.values(SHEETS).filter((d) => !existing.has(d.name));
if (toAdd.length) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: toAdd.map((d) => ({
        addSheet: { properties: { title: d.name, gridProperties: { frozenRowCount: 1 } } }
      }))
    }
  });
  console.log('Created sheets:', toAdd.map((d) => d.name).join(', '));
}

for (const d of Object.values(SHEETS)) {
  const { data } = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${d.name}!1:1` });
  const headers = data.values?.[0] || [];
  const missing = d.columns.filter((c) => !headers.includes(c));
  if (missing.length) {
    const next = [...headers, ...missing];
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${d.name}!A1`, valueInputOption: 'RAW', requestBody: { values: [next] }
    });
    console.log(`${d.name}: added columns ${missing.join(', ')}`);
  }
}

const { data: st } = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEETS.settings.name}!A2:A` });
const haveKeys = new Set((st.values || []).map((r) => r[0]));
const today = new Date().toISOString().slice(0, 10);
const rows = DEFAULT_SETTINGS.filter(([k]) => !haveKeys.has(k)).map(([k, v, desc]) => [k, v, today, desc, new Date().toISOString()]);
if (rows.length) {
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${SHEETS.settings.name}!A1`, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows }
  });
  console.log(`Inserted ${rows.length} default settings`);
}
console.log('✔ Spreadsheet พร้อมใช้งาน');
