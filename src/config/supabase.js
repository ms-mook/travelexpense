import { createClient } from '@supabase/supabase-js';

// ใช้เฉพาะ anon key (เปิดเผยได้) — Service Role Key อยู่ฝั่ง Backend เท่านั้น
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});
