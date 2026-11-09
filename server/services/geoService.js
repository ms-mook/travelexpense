/**
 * พิกัดสำหรับแผนที่ (ไม่ real-time — คำนวณตอนบันทึกเที่ยว)
 * - มี GOOGLE_MAPS_API_KEY → Google Geocoding API (แม่นกว่า)
 * - ไม่มี → OpenStreetMap Nominatim (ฟรี, จำกัด ~1 req/วินาที เหมาะกับทีมขนาดเล็ก)
 * - ทุกการเรียกเป็น best-effort: timeout สั้น ล้มเหลวคืน null ไม่ทำให้การบันทึกล้ม
 * - พิกัดบ้าน: ปัดทศนิยม 2 ตำแหน่ง (~1 กม.) เพื่อความเป็นส่วนตัว (PDPA)
 */
import { PROVINCES } from '../../shared/provinces.js';

const cache = new Map();
const UA = 'TravelExpenseApp/1.0 (internal fleet expense tool)';
const TH_BOUNDS = { minLat: 5.5, maxLat: 20.6, minLng: 97.3, maxLng: 105.7 };

const inThailand = (lat, lng) => lat >= TH_BOUNDS.minLat && lat <= TH_BOUNDS.maxLat && lng >= TH_BOUNDS.minLng && lng <= TH_BOUNDS.maxLng;
export const blurCoord = (n) => (n === '' || n === null || n === undefined ? '' : Math.round(Number(n) * 100) / 100);
const r6 = (n) => Math.round(Number(n) * 1e6) / 1e6;

async function fetchJson(url, opts = {}, timeoutMs = 4000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** ชื่อสถานที่ + จังหวัด → { lat, lng } */
export async function geocode(place, province) {
  if (process.env.GEOCODING_DISABLED === 'true') return null;
  const q = [place, province].filter(Boolean).join(' ').trim();
  if (!q) return null;
  if (cache.has(q)) return cache.get(q);
  let hit = null;
  if (process.env.GOOGLE_MAPS_API_KEY) {
    const p = new URLSearchParams({ address: `${q}, Thailand`, region: 'th', language: 'th', key: process.env.GOOGLE_MAPS_API_KEY });
    const data = await fetchJson(`https://maps.googleapis.com/maps/api/geocode/json?${p}`);
    const loc = data?.results?.[0]?.geometry?.location;
    if (loc) hit = { lat: loc.lat, lng: loc.lng };
  }
  if (!hit) {
    const p = new URLSearchParams({ q, format: 'json', limit: '1', countrycodes: 'th', 'accept-language': 'th' });
    const data = await fetchJson(`https://nominatim.openstreetmap.org/search?${p}`, { headers: { 'User-Agent': UA } });
    if (data?.[0]) hit = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  }
  if (hit && !inThailand(hit.lat, hit.lng)) hit = null;
  if (hit) {
    hit = { lat: r6(hit.lat), lng: r6(hit.lng) };
    cache.set(q, hit);
    if (cache.size > 1000) cache.delete(cache.keys().next().value);
  }
  return hit;
}

const normalizeProvince = (name) => {
  const s = String(name || '').replace(/^จังหวัด/, '').replace(/^จ\./, '').trim();
  if (s === 'กรุงเทพ' || s.startsWith('กรุงเทพ')) return 'กรุงเทพมหานคร';
  return PROVINCES.includes(s) ? s : null;
};

/** พิกัด → { province, name } (ใช้กับปุ่ม "📍 ตำแหน่งปัจจุบัน") */
export async function reverseGeocode(lat, lng) {
  if (process.env.GEOCODING_DISABLED === 'true') return null;
  if (!inThailand(lat, lng)) return null;
  const p = new URLSearchParams({ lat: String(lat), lon: String(lng), format: 'json', zoom: '16', 'accept-language': 'th' });
  const data = await fetchJson(`https://nominatim.openstreetmap.org/reverse?${p}`, { headers: { 'User-Agent': UA } });
  if (!data?.address) return null;
  const a = data.address;
  const province = normalizeProvince(a.province || a.state || a.city);
  const name = data.name || a.amenity || a.building || a.road || a.suburb || a.city_district || '';
  return { province, name, display_name: data.display_name || '' };
}
