import { createClient } from '@supabase/supabase-js';

// ใช้เฉพาะ anon/publishable key (เปิดเผยได้) — Service Role Key อยู่ฝั่ง Backend เท่านั้น
// รองรับทั้ง VITE_* และ NEXT_PUBLIC_* (ชื่อที่ Supabase Integration บน Vercel สร้างให้)
const env = import.meta.env;
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error('Supabase env ไม่ครบ: ต้องมี VITE_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL และ anon key');
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true }
});
