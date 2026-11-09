/**
 * สร้าง Super Admin คนแรก (รันครั้งเดียวหลัง setup:sheets)
 *   npm run seed:admin
 * จากนั้นให้เปลี่ยนรหัสผ่าน และลบ SEED_ADMIN_* ออกจาก .env
 */
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { SHEETS } from '../server/db/schema.js';

import { normalizeUsername, usernameToAuthEmail } from '../shared/username.js';

const { SEED_ADMIN_USERNAME: rawUsername = 'admin', SEED_ADMIN_PASSWORD: password, SEED_ADMIN_NAME: name = 'System Admin' } = process.env;
if (!password) throw new Error('ตั้งค่า SEED_ADMIN_PASSWORD ก่อน');
const username = normalizeUsername(rawUsername);
const email = usernameToAuthEmail(username);

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username } });
if (error) throw error;

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
const ts = new Date().toISOString();

const user = {
  employee_id: randomUUID(), auth_user_id: data.user.id, employee_code: 'ADMIN', full_name: name, email: '', username,
  department: 'IT', position: 'Administrator', role: 'SUPER_ADMIN', base_id: '', status: 'ACTIVE', created_at: ts, updated_at: ts
};
const adminRow = { admin_id: randomUUID(), auth_user_id: data.user.id, email: username, role: 'SUPER_ADMIN', team_scope: 'ALL', status: 'ACTIVE', created_at: ts };

for (const [def, row] of [[SHEETS.users, user], [SHEETS.adminUsers, adminRow]]) {
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${def.name}!A1`, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [def.columns.map((c) => row[c] ?? '')] }
  });
}
console.log(`✔ สร้าง Super Admin: username = ${username}`);
