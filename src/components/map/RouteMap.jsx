import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { ROUTE_COLORS, tripsToPoints } from './routePoints';

export { ROUTE_COLORS, tripsToPoints };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function pinIcon(color, text, { home = false, faded = false } = {}) {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:${home ? '#fff' : color};color:${home ? color : '#fff'};
      border:2px solid ${color};display:flex;align-items:center;justify-content:center;font:600 12px 'IBM Plex Sans Thai',system-ui;
      box-shadow:0 2px 6px rgba(15,23,42,.25);opacity:${faded ? 0.35 : 1}">${text}</div>`
  });
}

/**
 * แผนที่เส้นทาง (Leaflet + แผนที่ CARTO/OpenStreetMap)
 * routes: [{ id, color, label, points: [{lat,lng,label,seq,home,start}] }]
 * เส้นเชื่อมเป็นลำดับการเดินทาง (เส้นตรงระหว่างจุด ไม่ใช่เส้นถนนจริง)
 */
export default function RouteMap({ routes, focusId = null, height = 360, onSelect }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);

  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false })
      .setView([13.75, 100.5], 6);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    layer.current.clearLayers();
    const bounds = [];
    routes.forEach((r) => {
      const faded = focusId && focusId !== r.id;
      const latlngs = r.points.map((p) => [p.lat, p.lng]);
      if (latlngs.length > 1) {
        L.polyline(latlngs, { color: r.color, weight: faded ? 2 : 4, opacity: faded ? 0.25 : 0.85, dashArray: faded ? '4 6' : null })
          .on('click', () => onSelect?.(r.id)).addTo(layer.current);
      }
      r.points.forEach((p) => {
        const text = p.home ? '⌂' : p.start ? 'S' : p.seq;
        const t = p.trip;
        const popup = `<div style="font:13px 'IBM Plex Sans Thai',system-ui;min-width:160px">
          <b>${esc(r.label)}</b><br/>${p.start ? 'เริ่ม: ' : `จุดที่ ${p.seq}: `}${esc(p.label)}${p.home ? ' <span style="color:#64748b">(ตำแหน่งโดยประมาณ)</span>' : ''}
          ${t ? `<br/><span style="color:#475569">${esc(t.customer_name || '')}${t.ticket_no ? ` · #${esc(t.ticket_no)}` : ''}</span>
          <br/>${Number(t.distance_km || 0).toFixed(1)} กม. · ${t.travel_type === 'BASE' ? 'ในเขต Base' : 'นอก Base'}` : ''}</div>`;
        L.marker([p.lat, p.lng], { icon: pinIcon(r.color, text, { home: p.home, faded }), zIndexOffset: faded ? 0 : 1000 })
          .bindPopup(popup).on('click', () => onSelect?.(r.id)).addTo(layer.current);
        if (!faded) bounds.push([p.lat, p.lng]);
      });
    });
    if (bounds.length === 1) m.setView(bounds[0], 13);
    else if (bounds.length > 1) m.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }, [routes, focusId, onSelect]);

  return <div ref={el} style={{ height }} className="z-0 w-full overflow-hidden rounded-2xl ring-1 ring-slate-200" />;
}
