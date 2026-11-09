/**
 * ใบเสร็จใน Google Drive (Private) — Backend เป็นตัวกลางทั้ง upload / download
 * - โฟลเดอร์ต้องอยู่ใน Shared Drive (Service Account ไม่มีโควตาพื้นที่ของตัวเอง)
 * - ห้ามสร้าง permission แบบ anyone/public
 * - ไฟล์ติด appProperties.employee_id เพื่อยืนยันเจ้าของก่อนผูกกับรายการค่าใช้จ่าย
 */
import { Readable } from 'node:stream';
import { getDb } from '../db/index.js';
import { ROLES } from '../db/schema.js';
import { ApiError, badRequest, forbidden, notFound } from '../lib/errors.js';
import { getGoogleAuth } from '../lib/googleAuth.js';
import { toBool, uuid } from '../lib/utils.js';
import { getTypedSettings } from './settingsService.js';

let driveApi;
async function drive() {
  if (driveApi) return driveApi;
  const { google, auth } = await getGoogleAuth();
  driveApi = google.drive({ version: 'v3', auth });
  return driveApi;
}

/** ตรวจ magic bytes ป้องกันการปลอม mime type */
function sniff(buf) {
  const hex = buf.subarray(0, 12).toString('hex');
  if (hex.startsWith('ffd8ff')) return 'image/jpeg';
  if (hex.startsWith('89504e47')) return 'image/png';
  if (hex.startsWith('25504446')) return 'application/pdf';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.subarray(4, 8).toString() === 'ftyp') return 'image/heic';
  return null;
}

export async function uploadReceipt(ctx, { file_name: fileName, mime_type: mime, data_base64: b64 }) {
  const settings = await getTypedSettings();
  if (!settings.allowedReceiptTypes.includes(mime)) throw badRequest(`ไม่รองรับไฟล์ชนิด ${mime}`);
  const buf = Buffer.from(b64.replace(/^data:[^;]+;base64,/, ''), 'base64');
  if (!buf.length) throw badRequest('ไฟล์ว่าง');
  if (buf.length > settings.maxReceiptBytes) throw badRequest(`ไฟล์ใหญ่เกิน ${settings.raw.MAX_RECEIPT_SIZE_MB} MB`);
  const detected = sniff(buf);
  if (!detected || (detected !== mime && !(detected === 'image/heic' && mime.startsWith('image/')))) {
    throw badRequest('เนื้อหาไฟล์ไม่ตรงกับชนิดไฟล์');
  }

  const safeName = fileName.replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(0, 80);
  const d = await drive();
  const { data } = await d.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: `${ctx.user.employee_code || ctx.user.employee_id}_${Date.now()}_${uuid().slice(0, 8)}_${safeName}`,
      parents: [process.env.GOOGLE_DRIVE_RECEIPT_FOLDER_ID],
      appProperties: { employee_id: ctx.user.employee_id }
    },
    media: { mimeType: mime, body: Readable.from(buf) },
    fields: 'id,name,mimeType,size'
  });
  return { receipt_file_id: data.id, receipt_name: fileName, receipt_mime: mime, size: Number(data.size || buf.length) };
}

export async function assertReceiptOwnedBy(fileId, employeeId) {
  const d = await drive();
  try {
    const { data } = await d.files.get({ fileId, fields: 'id,appProperties,trashed', supportsAllDrives: true });
    if (data.trashed || data.appProperties?.employee_id !== employeeId) throw forbidden('ไม่สามารถใช้ไฟล์ใบเสร็จนี้ได้');
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw badRequest('ไม่พบไฟล์ใบเสร็จ');
  }
}

/** ดาวน์โหลดใบเสร็จ — ตรวจสิทธิ์จากรายการค่าใช้จ่ายที่ผูกไฟล์อยู่ */
export async function streamReceipt(ctx, fileId, res, { assertCanRead }) {
  const db = getDb();
  const expense = (await db.list('expenses')).find((e) => e.receipt_file_id === fileId && !toBool(e.is_deleted));
  if (!expense) {
    // ไฟล์ที่อัปโหลดแล้วแต่ยังไม่ผูก — ให้เจ้าของดูได้คนเดียว
    if (ctx.user.role !== ROLES.EMPLOYEE) throw notFound();
    await assertReceiptOwnedBy(fileId, ctx.user.employee_id);
  } else {
    const record = await db.get('dailyRecords', expense.daily_record_id);
    if (!record) throw notFound();
    assertCanRead(ctx, record);
  }
  const d = await drive();
  const meta = await d.files.get({ fileId, fields: 'mimeType,name', supportsAllDrives: true });
  const file = await d.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'stream' });
  res.statusCode = 200;
  res.setHeader('Content-Type', meta.data.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(meta.data.name)}`);
  res.setHeader('Cache-Control', 'private, no-store');
  await new Promise((resolve, reject) => {
    file.data.on('error', reject).on('end', resolve).pipe(res);
  });
}
