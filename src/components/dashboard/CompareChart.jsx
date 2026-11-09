import { money, thaiMonth } from '../../utils/format';

/**
 * กราฟแท่งคู่: Net Employee Burden เทียบ Daily Allowance รายเดือน (SVG ไม่พึ่ง library)
 * เส้นประ = Expense Gap (> 0 แปลว่าเบี้ยเลี้ยงไม่พอ)
 */
const SERIES = [
  { key: 'net_employee_burden', label: 'ภาระสุทธิของพนักงาน', color: '#0f766e' },
  { key: 'daily_allowance', label: 'Daily Allowance', color: '#f59e0b' }
];

export default function CompareChart({ data }) {
  const W = 640; const H = 240; const pad = { l: 56, r: 12, t: 12, b: 36 };
  const max = Math.max(1, ...data.flatMap((d) => SERIES.map((s) => Number(d[s.key]) || 0)));
  const step = (W - pad.l - pad.r) / Math.max(1, data.length);
  const bw = Math.min(28, step / 3);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="เปรียบเทียบภาระสุทธิกับเบี้ยเลี้ยงรายเดือน">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#64748b">{Math.round(t).toLocaleString('th-TH')}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + step * i + step / 2;
          return (
            <g key={d.month}>
              {SERIES.map((s, j) => {
                const v = Number(d[s.key]) || 0;
                return (
                  <rect key={s.key} x={cx - bw + j * bw} y={y(v)} width={bw - 2} height={Math.max(0, y(0) - y(v))} rx="3" fill={s.color}>
                    <title>{`${thaiMonth(d.month)} · ${s.label}: ${money(v)}`}</title>
                  </rect>
                );
              })}
              <text x={cx} y={H - 14} textAnchor="middle" fontSize="10" fill="#475569">
                {new Date(`${d.month}-01T00:00:00`).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: s.color }} />{s.label}</span>
        ))}
      </figcaption>
    </figure>
  );
}
