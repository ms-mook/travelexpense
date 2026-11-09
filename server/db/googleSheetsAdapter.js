/**
 * Google Sheets adapter — ใช้งานผ่าน interface เดียวกับ memoryAdapter
 * เพื่อให้ย้ายไป PostgreSQL/Supabase ได้โดยเขียน adapter ใหม่ตัวเดียว
 *
 * ข้อจำกัดที่จัดการไว้:
 *  - Batch: อ่านทั้ง Sheet ครั้งเดียวแล้ว cache สั้น ๆ, เขียนหลายแถวด้วย append ครั้งเดียว / batchUpdate
 *  - Retry: exponential backoff เมื่อเจอ 429 / 5xx
 *  - Concurrency: ก่อน update จะอ่านแถวล่าสุดแบบไม่ใช้ cache และตรวจ updated_at (optimistic lock)
 *  - Injection: เขียนด้วย valueInputOption=RAW ค่าที่ขึ้นต้นด้วย = จะไม่ถูกตีความเป็นสูตร
 */
import { SHEETS } from './schema.js';
import { conflict, notFound } from '../lib/errors.js';
import { sleep } from '../lib/utils.js';
import { getGoogleAuth } from '../lib/googleAuth.js';

const CACHE_TTL_MS = 3000;
const cache = new Map(); // sheetName -> { at, headers, rows }

let sheetsApi;
async function sheets() {
  if (sheetsApi) return sheetsApi;
  const { google, auth } = await getGoogleAuth();
  sheetsApi = google.sheets({ version: 'v4', auth });
  return sheetsApi;
}
const api = () => ({
  spreadsheets: {
    values: {
      get: async (p) => (await sheets()).spreadsheets.values.get(p),
      append: async (p) => (await sheets()).spreadsheets.values.append(p),
      batchUpdate: async (p) => (await sheets()).spreadsheets.values.batchUpdate(p)
    }
  }
});

const spreadsheetId = () => process.env.GOOGLE_SHEETS_ID;

async function withRetry(fn, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.code || err?.response?.status;
      if (![429, 500, 502, 503, 504].includes(Number(status))) throw err;
      await sleep(Math.min(8000, 300 * 2 ** i) + Math.random() * 200);
    }
  }
  throw lastErr;
}

function colLetter(n) {
  let s = '';
  for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function serialize(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function def(table) {
  const d = SHEETS[table];
  if (!d) throw new Error(`Unknown table: ${table}`);
  return d;
}

async function readSheet(table, { fresh = false } = {}) {
  const { name } = def(table);
  const hit = cache.get(name);
  if (!fresh && hit && Date.now() - hit.at < CACHE_TTL_MS) return hit;

  const resp = await withRetry(() =>
    api().spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${name}!A1:ZZ`,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING'
    })
  );
  const [headers = [], ...values] = resp.data.values || [];
  const rows = values.map((r, i) => {
    const obj = { _row: i + 2 };
    headers.forEach((h, c) => { obj[h] = r[c] === undefined ? '' : r[c]; });
    return obj;
  });
  const entry = { at: Date.now(), headers, rows };
  cache.set(name, entry);
  return entry;
}

const strip = ({ _row, ...rest }) => rest;
const invalidate = (table) => cache.delete(def(table).name);

export const googleSheetsAdapter = {
  async list(table) {
    const { rows } = await readSheet(table);
    return rows.map(strip);
  },

  async get(table, id) {
    const { key } = def(table);
    const { rows } = await readSheet(table);
    const row = rows.find((r) => String(r[key]) === String(id));
    return row ? strip(row) : null;
  },

  async insertMany(table, records) {
    if (!records.length) return [];
    const { name } = def(table);
    const { headers } = await readSheet(table);
    await withRetry(() =>
      api().spreadsheets.values.append({
        spreadsheetId: spreadsheetId(),
        range: `${name}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: records.map((rec) => headers.map((h) => serialize(rec[h]))) }
      })
    );
    invalidate(table);
    return records;
  },

  async insert(table, record) {
    await this.insertMany(table, [record]);
    return record;
  },

  /**
   * อัปเดตหลายแถวในครั้งเดียว (batchUpdate)
   * changes: [{ id, patch, expectedUpdatedAt? }]
   */
  async updateMany(table, changes) {
    if (!changes.length) return [];
    const { name, key } = def(table);
    const { headers, rows } = await readSheet(table, { fresh: true });
    const lastCol = colLetter(headers.length - 1);
    const data = [];
    const results = [];
    for (const { id, patch, expectedUpdatedAt } of changes) {
      const row = rows.find((r) => String(r[key]) === String(id));
      if (!row) throw notFound(`ไม่พบ ${table} ${id}`);
      if (expectedUpdatedAt && row.updated_at && String(row.updated_at) !== String(expectedUpdatedAt)) {
        throw conflict(undefined, { id, current_updated_at: row.updated_at });
      }
      const merged = { ...strip(row), ...patch };
      data.push({ range: `${name}!A${row._row}:${lastCol}${row._row}`, values: [headers.map((h) => serialize(merged[h]))] });
      results.push(merged);
    }
    await withRetry(() =>
      api().spreadsheets.values.batchUpdate({
        spreadsheetId: spreadsheetId(),
        requestBody: { valueInputOption: 'RAW', data }
      })
    );
    invalidate(table);
    return results;
  },

  async update(table, id, patch, opts = {}) {
    const [row] = await this.updateMany(table, [{ id, patch, expectedUpdatedAt: opts.expectedUpdatedAt }]);
    return row;
  }
};
