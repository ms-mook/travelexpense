/** Google Service Account auth (ใช้ร่วมกันระหว่าง Sheets และ Drive) — Private Key อยู่ใน Env ฝั่ง Backend เท่านั้น */
let cached;

export async function getGoogleAuth() {
  if (cached) return cached;
  const { google } = await import('googleapis');
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });
  cached = { google, auth };
  return cached;
}
