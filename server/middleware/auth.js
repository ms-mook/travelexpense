/**
 * ตรวจ Token ทุกคำขอ → หา employee จาก auth_user_id → สร้าง ctx { user, scope }
 * หมายเหตุ: Role อ่านจาก 01_users ฝั่ง Backend เสมอ ไม่เชื่อ role ที่ส่งมาจาก Client
 */
import { getDb } from '../db/index.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { ROLES } from '../db/schema.js';

const tokenCache = new Map(); // token -> { authUserId, exp }
const TOKEN_CACHE_MS = 60_000;

let verifyToken = async (token) => {
  const hit = tokenCache.get(token);
  if (hit && hit.exp > Date.now()) return hit.authUserId;
  const sb = await supabaseAdmin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) throw unauthorized('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
  tokenCache.set(token, { authUserId: data.user.id, exp: Date.now() + TOKEN_CACHE_MS });
  if (tokenCache.size > 500) tokenCache.delete(tokenCache.keys().next().value);
  return data.user.id;
};

/** ใช้ใน test */
export function setTokenVerifier(fn) { verifyToken = fn; }

export async function authenticate(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw unauthorized();

  const authUserId = await verifyToken(token);
  const db = getDb();
  const users = await db.list('users');
  const user = users.find((u) => u.auth_user_id === authUserId);
  if (!user) throw forbidden('บัญชีนี้ยังไม่ได้ลงทะเบียนในระบบ กรุณาติดต่อผู้ดูแล');
  if (user.status !== 'ACTIVE') throw forbidden('บัญชีถูกระงับการใช้งาน');

  return { user, scope: await resolveScope(user) };
}

/**
 * ขอบเขตข้อมูล: EMPLOYEE = ของตนเอง, SECRETARY = Base ตาม team_scope ใน 12_admin_users,
 * MANAGEMENT / SUPER_ADMIN = ทั้งหมด
 */
async function resolveScope(user) {
  if (user.role === ROLES.MANAGEMENT || user.role === ROLES.SUPER_ADMIN) return { allBases: true, baseIds: [] };
  if (user.role === ROLES.SECRETARY) {
    const admins = await getDb().list('adminUsers');
    const row = admins.find((a) => a.auth_user_id === user.auth_user_id && a.status !== 'SUSPENDED');
    const raw = String(row?.team_scope || '').trim();
    if (raw.toUpperCase() === 'ALL') return { allBases: true, baseIds: [] };
    return { allBases: false, baseIds: raw.split(',').map((s) => s.trim()).filter(Boolean) };
  }
  return { allBases: false, baseIds: [], ownOnly: true };
}

export function requireRole(ctx, ...roles) {
  if (!roles.includes(ctx.user.role)) throw forbidden();
}

/** Secretary เข้าถึงรายการของ Base ที่อยู่ในขอบเขตเท่านั้น */
export function assertBaseInScope(ctx, baseId) {
  if (ctx.scope.allBases) return;
  if (!ctx.scope.baseIds.includes(baseId)) throw forbidden('รายการนี้อยู่นอกขอบเขต Base ที่คุณดูแล');
}

/** Employee เข้าถึงได้เฉพาะของตนเอง */
export function assertOwner(ctx, employeeId) {
  if (ctx.user.employee_id !== employeeId) throw forbidden();
}
