/** Supabase client ฝั่ง Backend (Service Role) — ห้าม import ไฟล์นี้จาก src/ */
let client;

export async function supabaseAdmin() {
  if (client) return client;
  const { createClient } = await import('@supabase/supabase-js');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return client;
}
