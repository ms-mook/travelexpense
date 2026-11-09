/**
 * Vercel Function เดียวสำหรับ /api/v1/* (rewrite ใน vercel.json)
 * ใช้ function เดียวเพื่อลด cold start และไม่ชนเพดานจำนวน function ของแพลน Hobby
 */
import { handle } from '../server/app.js';

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.searchParams.get('__path') ?? url.pathname.replace(/^\/api\/v1/, '').replace(/^\/api\/router/, '');
  return handle(req, res, path);
}
