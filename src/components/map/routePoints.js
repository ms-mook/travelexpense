/** ฟังก์ชันแผนที่ที่ไม่ต้องโหลด Leaflet */
/** สีเส้นทางต่อพนักงาน (แยกกันชัดบนแผนที่สีอ่อน) */
export const ROUTE_COLORS = ['#0f766e', '#2563eb', '#db2777', '#ea580c', '#7c3aed', '#16a34a', '#0891b2', '#ca8a04', '#dc2626', '#4f46e5'];

const has = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && lat !== null && lng !== null;
const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

/** แปลงเที่ยวของวัน → จุดตามลำดับ (ต้นทางเที่ยวแรก แล้วตามด้วยปลายทางของทุกเที่ยว) */
export function tripsToPoints(trips) {
  const pts = [];
  const sorted = [...trips].sort((a, b) => Number(a.sequence_no) - Number(b.sequence_no));
  sorted.forEach((t, i) => {
    const oLat = num(t.origin_lat); const oLng = num(t.origin_lng);
    const dLat = num(t.dest_lat); const dLng = num(t.dest_lng);
    const isHome = (v) => v === true || String(v).toUpperCase() === 'TRUE';
    if (i === 0 && has(oLat, oLng)) pts.push({ lat: oLat, lng: oLng, label: t.origin, home: isHome(t.origin_is_home), start: true });
    if (has(dLat, dLng)) {
      pts.push({ lat: dLat, lng: dLng, label: t.destination, home: isHome(t.destination_is_home), seq: i + 1, trip: t });
    }
  });
  return pts;
}
