/**
 * API dispatcher — ทุกคำขอผ่านขั้นตอน:
 * CORS → match route → authenticate (token) → role check → idempotency → validate (ใน route) → service → JSON
 */
import { getDb } from './db/index.js';
import { ApiError, forbidden } from './lib/errors.js';
import { applyCors, readJsonBody, sendError, sendJson } from './lib/http.js';
import { nowIso } from './lib/utils.js';
import { authenticate } from './middleware/auth.js';
import { STREAMED, matchRoute } from './routes/index.js';

export async function handle(req, res, path) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

  try {
    const url = new URL(req.url, 'http://localhost');
    const query = Object.fromEntries(url.searchParams.entries());
    delete query.__path;
    const cleanPath = `/${String(path || '').replace(/^\/+|\/+$/g, '')}`;

    const { route, params, pathMatched } = matchRoute(req.method, cleanPath);
    if (!route) {
      throw new ApiError(pathMatched ? 405 : 404, pathMatched ? 'METHOD_NOT_ALLOWED' : 'NOT_FOUND', 'ไม่พบ API นี้');
    }

    const ctx = await authenticate(req);
    if (!route.roles.includes(ctx.user.role)) throw forbidden();

    const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readJsonBody(req) : {};

    // Idempotency: ป้องกันการสร้างซ้ำเมื่อ client retry (เน็ตมือถือหลุด)
    const idemKey = req.method === 'POST' ? req.headers['idempotency-key'] : null;
    if (idemKey) {
      const prev = await getDb().get('idempotencyKeys', `${ctx.user.employee_id}:${idemKey}`);
      if (prev) return sendJson(res, Number(prev.status_code), JSON.parse(prev.response_json));
    }

    const data = await route.handler(ctx, { params, query, body, req, res });
    if (data === STREAMED) return undefined;

    const status = req.method === 'POST' ? 201 : 200;
    const payload = { data };
    if (idemKey) {
      await getDb().insert('idempotencyKeys', {
        idempotency_key: `${ctx.user.employee_id}:${idemKey}`, actor_id: ctx.user.employee_id,
        route: `${req.method} ${route.path}`, status_code: status,
        response_json: JSON.stringify(payload).slice(0, 45000), created_at: nowIso()
      });
    }
    return sendJson(res, status, payload);
  } catch (err) {
    if (err instanceof SyntaxError) return sendError(res, new ApiError(400, 'INVALID_JSON', 'รูปแบบ JSON ไม่ถูกต้อง'));
    return sendError(res, err);
  }
}
