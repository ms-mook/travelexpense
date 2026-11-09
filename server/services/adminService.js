/** Super Admin: ผู้ใช้, Base, การมอบหมาย Base, นโยบายเบี้ยเลี้ยง, ตั้งค่าระบบ */
import { getDb } from '../db/index.js';
import { ROLES } from '../db/schema.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { inEffectiveRange, nowIso, todayTH, uuid } from '../lib/utils.js';
import { isValidUsername, normalizeUsername, usernameToAuthEmail } from '../../shared/username.js';
import { diff, writeAudit } from './auditService.js';

/* ---------------- Users ---------------- */

export async function listUsers() {
  const db = getDb();
  const [users, admins, bases] = await Promise.all([db.list('users'), db.list('adminUsers'), db.list('bases')]);
  return users.map((u) => ({
    ...u,
    base_name: bases.find((b) => b.base_id === u.base_id)?.base_name || '',
    team_scope: admins.find((a) => a.auth_user_id === u.auth_user_id)?.team_scope || ''
  }));
}

export async function createUser(ctx, input) {
  const db = getDb();
  const users = await db.list('users');
  const username = normalizeUsername(input.username);
  if (!isValidUsername(username)) throw badRequest('Username ต้องยาว 3–30 ตัว ใช้ได้เฉพาะ a-z 0-9 . _ -');
  if (users.some((u) => normalizeUsername(u.username) === username)) throw conflict('Username นี้มีในระบบแล้ว');
  if (input.password.length < 8) throw badRequest('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
  if (input.base_id && !(await db.get('bases', input.base_id))) throw badRequest('ไม่พบ Base ที่ระบุ');

  const sb = await supabaseAdmin();
  const { data, error } = await sb.auth.admin.createUser({
    email: usernameToAuthEmail(username), password: input.password, email_confirm: true,
    user_metadata: { username, full_name: input.full_name }
  });
  if (error) throw badRequest(`สร้างบัญชี Auth ไม่สำเร็จ: ${error.message}`);

  const ts = nowIso();
  const user = {
    employee_id: uuid(),
    auth_user_id: data.user.id,
    employee_code: input.employee_code || '',
    full_name: input.full_name,
    username,
    email: input.email || '',
    department: input.department || '',
    position: input.position || '',
    role: input.role,
    base_id: input.base_id || '',
    status: 'ACTIVE',
    created_at: ts,
    updated_at: ts
  };
  await db.insert('users', user);

  if (input.base_id) {
    await db.insert('baseAssignments', {
      assignment_id: uuid(), employee_id: user.employee_id, base_id: input.base_id,
      effective_from: todayTH(), effective_to: '', assigned_by: ctx.user.employee_id, created_at: ts
    });
  }
  if (input.role !== ROLES.EMPLOYEE) {
    await db.insert('adminUsers', {
      admin_id: uuid(), auth_user_id: user.auth_user_id, email: user.username, role: user.role,
      team_scope: input.team_scope || (input.role === ROLES.SECRETARY ? '' : 'ALL'), status: 'ACTIVE', created_at: ts
    });
  }
  await writeAudit(ctx, { action: 'CREATE', entityType: 'USER', entityId: user.employee_id, newValue: user });
  return user;
}

export async function updateUser(ctx, employeeId, patch) {
  const db = getDb();
  const before = await db.get('users', employeeId);
  if (!before) throw notFound();
  if (employeeId === ctx.user.employee_id && (patch.status === 'SUSPENDED' || (patch.role && patch.role !== before.role))) {
    throw badRequest('ไม่สามารถระงับหรือเปลี่ยน Role ของบัญชีตนเองได้');
  }
  const { team_scope: teamScope, ...userPatch } = patch;
  const after = await db.update('users', employeeId, { ...userPatch, updated_at: nowIso() });

  if (patch.status && patch.status !== before.status) {
    const sb = await supabaseAdmin();
    await sb.auth.admin.updateUserById(before.auth_user_id, {
      ban_duration: patch.status === 'SUSPENDED' ? '876000h' : 'none'
    });
  }

  const admins = await db.list('adminUsers');
  const adminRow = admins.find((a) => a.auth_user_id === before.auth_user_id);
  const role = after.role;
  if (role !== ROLES.EMPLOYEE) {
    const scopePatch = { role, status: after.status, ...(teamScope !== undefined ? { team_scope: teamScope } : {}) };
    if (adminRow) await db.update('adminUsers', adminRow.admin_id, scopePatch);
    else await db.insert('adminUsers', { admin_id: uuid(), auth_user_id: after.auth_user_id, email: after.username,
      team_scope: teamScope || '', created_at: nowIso(), ...scopePatch });
  } else if (adminRow) {
    await db.update('adminUsers', adminRow.admin_id, { status: 'SUSPENDED' });
  }

  const { oldV, newV } = diff(before, { ...after, ...(teamScope !== undefined ? { team_scope: teamScope } : {}) });
  await writeAudit(ctx, { action: 'UPDATE', entityType: 'USER', entityId: employeeId, oldValue: oldV, newValue: newV });
  return after;
}

export async function resetPassword(ctx, employeeId, newPassword) {
  if (!newPassword || newPassword.length < 8) throw badRequest('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
  const user = await getDb().get('users', employeeId);
  if (!user) throw notFound();
  const sb = await supabaseAdmin();
  const { error } = await sb.auth.admin.updateUserById(user.auth_user_id, { password: newPassword });
  if (error) throw badRequest(error.message);
  await writeAudit(ctx, { action: 'RESET_PASSWORD', entityType: 'USER', entityId: employeeId });
  return { ok: true };
}

/* ---------------- Bases ---------------- */

export const listBases = () => getDb().list('bases');

export async function createBase(ctx, input) {
  const db = getDb();
  const bases = await db.list('bases');
  if (bases.some((b) => b.base_code === input.base_code)) throw conflict('รหัส Base ซ้ำ');
  const ts = nowIso();
  const base = { base_id: uuid(), ...input, created_at: ts, updated_at: ts };
  await db.insert('bases', base);
  await writeAudit(ctx, { action: 'CREATE', entityType: 'BASE', entityId: base.base_id, newValue: base });
  return base;
}

export async function updateBase(ctx, baseId, patch) {
  const db = getDb();
  const before = await db.get('bases', baseId);
  if (!before) throw notFound();
  const after = await db.update('bases', baseId, { ...patch, updated_at: nowIso() });
  const { oldV, newV } = diff(before, after);
  await writeAudit(ctx, { action: 'UPDATE', entityType: 'BASE', entityId: baseId, oldValue: oldV, newValue: newV });
  return after;
}

/* ---------------- Base assignments (ย้าย Base พร้อมประวัติ) ---------------- */

export async function listAssignments(employeeId) {
  const rows = await getDb().list('baseAssignments');
  return rows.filter((r) => !employeeId || r.employee_id === employeeId)
    .sort((a, b) => String(b.effective_from).localeCompare(String(a.effective_from)));
}

const dayBefore = (d) => new Date(Date.parse(`${d}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);

export async function assignBase(ctx, { employee_id: employeeId, base_id: baseId, effective_from: from }) {
  const db = getDb();
  if (!(await db.get('users', employeeId))) throw notFound('ไม่พบพนักงาน');
  if (!(await db.get('bases', baseId))) throw notFound('ไม่พบ Base');
  const history = await listAssignments(employeeId);
  if (history.some((h) => h.effective_from >= from)) {
    throw badRequest('วันที่มีผลต้องหลังจากการมอบหมาย Base ครั้งล่าสุด');
  }
  const open = history.filter((h) => !h.effective_to || h.effective_to >= from);
  if (open.length) {
    await db.updateMany('baseAssignments', open.map((h) => ({ id: h.assignment_id, patch: { effective_to: dayBefore(from) } })));
  }
  const row = { assignment_id: uuid(), employee_id: employeeId, base_id: baseId, effective_from: from,
    effective_to: '', assigned_by: ctx.user.employee_id, created_at: nowIso() };
  await db.insert('baseAssignments', row);
  if (from <= todayTH()) await db.update('users', employeeId, { base_id: baseId, updated_at: nowIso() });
  await writeAudit(ctx, { action: 'ASSIGN_BASE', entityType: 'USER', entityId: employeeId, newValue: row });
  return row;
}

/** Base ของพนักงาน ณ วันที่ (ใช้ snapshot ลง Daily Record) */
export function baseForDate(assignments, user, date) {
  const hit = assignments
    .filter((a) => a.employee_id === user.employee_id && inEffectiveRange(date, a.effective_from, a.effective_to))
    .sort((a, b) => String(b.effective_from).localeCompare(String(a.effective_from)))[0];
  return hit?.base_id || user.base_id || '';
}

/* ---------------- Allowance policies ---------------- */

export const listPolicies = () => getDb().list('allowancePolicies');

export async function createPolicy(ctx, input) {
  if (input.effective_to && input.effective_to < input.effective_from) throw badRequest('Effective To ต้องไม่ก่อน Effective From');
  const ts = nowIso();
  const row = { policy_id: uuid(), ...input, base_id: input.base_id || '', created_by: ctx.user.employee_id,
    created_at: ts, updated_at: ts };
  await getDb().insert('allowancePolicies', row);
  await writeAudit(ctx, { action: 'CREATE', entityType: 'POLICY', entityId: row.policy_id, newValue: row });
  return row;
}

/** แก้นโยบายได้เฉพาะ effective_to / status / ชื่อ — เปลี่ยนอัตราให้สร้างนโยบายใหม่ เพื่อให้คำนวณย้อนหลังถูกต้อง */
export async function updatePolicy(ctx, policyId, patch) {
  const db = getDb();
  const before = await db.get('allowancePolicies', policyId);
  if (!before) throw notFound();
  const allowed = {};
  for (const k of ['policy_name', 'effective_to', 'status']) if (patch[k] !== undefined) allowed[k] = patch[k];
  const after = await db.update('allowancePolicies', policyId, { ...allowed, updated_at: nowIso() });
  const { oldV, newV } = diff(before, after);
  await writeAudit(ctx, { action: 'UPDATE', entityType: 'POLICY', entityId: policyId, oldValue: oldV, newValue: newV,
    reason: patch.reason });
  return after;
}

/* ---------------- Settings ---------------- */

export async function updateSetting(ctx, key, { Value, EffectiveDate }) {
  const db = getDb();
  const before = await db.get('settings', key);
  const row = { SettingKey: key, Value, EffectiveDate: EffectiveDate || todayTH(), updated_at: nowIso() };
  if (before) await db.update('settings', key, row);
  else await db.insert('settings', { ...row, Description: '' });
  await writeAudit(ctx, { action: 'UPDATE', entityType: 'SETTING', entityId: key,
    oldValue: before ? { Value: before.Value } : null, newValue: { Value } });
  return row;
}
