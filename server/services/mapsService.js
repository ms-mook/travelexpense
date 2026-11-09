/**
 * ระยะทางอ้างอิงจาก Google Maps (Routes API)
 * - เปิดใช้เมื่อตั้ง GOOGLE_MAPS_API_KEY (ฝั่ง Backend เท่านั้น) และเปิด "Routes API" ใน Google Cloud
 * - ไม่มี key → ระบบยังทำงานได้ แค่ไม่คำนวณให้ (พนักงาน/Secretary ใช้ปุ่มเปิด Google Maps แทน)
 * - เรียกแบบ best-effort: timeout สั้น ถ้าล้มเหลวจะไม่ทำให้การบันทึกเที่ยวล้ม
 */
import { round2 } from '../lib/utils.js';

const cache = new Map();

export const mapsAvailable = () => Boolean(process.env.GOOGLE_MAPS_API_KEY);

export async function drivingDistanceKm(origin, destination, destinationProvince, { timeoutMs = 4000 } = {}) {
  if (!mapsAvailable() || !origin || !destination) return null;
  const dest = [destination, destinationProvince].filter(Boolean).join(' ');
  const key = `${origin}|${dest}`;
  if (cache.has(key)) return cache.get(key);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters'
      },
      body: JSON.stringify({
        origin: { address: `${origin}, Thailand` },
        destination: { address: `${dest}, Thailand` },
        travelMode: 'DRIVE',
        regionCode: 'TH',
        languageCode: 'th'
      })
    });
    if (!res.ok) {
      console.warn('[maps] routes api', res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    const meters = data?.routes?.[0]?.distanceMeters;
    const km = Number.isFinite(meters) ? round2(meters / 1000) : null;
    if (km !== null) {
      cache.set(key, km);
      if (cache.size > 500) cache.delete(cache.keys().next().value);
    }
    return km;
  } catch (err) {
    console.warn('[maps] failed', err?.name || err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
