import { supabase } from '../config/supabase';

const BASE = '/api/v1';

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || `HTTP ${status}`);
    this.status = status;
    this.code = body?.error?.code;
    this.details = body?.error?.details;
  }
}

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** POST สร้างข้อมูลแนบ Idempotency-Key อัตโนมัติ ป้องกันการบันทึกซ้ำเมื่อเน็ตหลุดแล้วกดซ้ำ */
export async function api(path, { method = 'GET', body, idempotent = method === 'POST', raw = false } = {}) {
  const headers = { ...(await authHeader()) };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotent) headers['Idempotency-Key'] = crypto.randomUUID();
  const init = { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined };
  let res;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch (netErr) {
    // เน็ตมือถือหลุด: retry 1 ครั้งด้วย Idempotency-Key เดิม → Backend ไม่สร้างข้อมูลซ้ำ
    await new Promise((r) => setTimeout(r, 1500));
    try {
      res = await fetch(`${BASE}${path}`, init);
    } catch {
      throw new ApiError(0, { error: { message: 'เชื่อมต่อเครือข่ายไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต' } });
    }
  }
  if (raw) {
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
    return res;
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) await supabase.auth.signOut();
    throw new ApiError(res.status, json);
  }
  return json?.data;
}

export const qs = (o) => {
  const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined && v !== null));
  const s = p.toString();
  return s ? `?${s}` : '';
};

/** เปิดไฟล์ (ใบเสร็จ/CSV) ที่ต้องแนบ token — ดาวน์โหลดเป็น blob */
export async function fetchBlob(path) {
  const res = await api(path, { raw: true, idempotent: false });
  return { blob: await res.blob(), filename: /filename="?([^";]+)/.exec(res.headers.get('Content-Disposition') || '')?.[1] };
}
