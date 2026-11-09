import { NavLink } from 'react-router-dom';

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  trips: 'M5 17h14M6 17l1.5-6h9L18 17M7 17v2M17 17v2M8.5 11 10 7h4l1.5 4',
  expenses: 'M4 6h16v12H4zM4 10h16M8 15h3',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  inbox: 'M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  users: 'M16 21v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 21v-2a3 3 0 0 0-2-2.8M17 3.2A4 4 0 0 1 17 11',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  log: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  money: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'
};

/** Bottom Navigation สำหรับ Employee (Mobile-first) — ปุ่ม + ตรงกลาง = บันทึกวันนี้ */
export function BottomNav({ items, onFab, fabBusy }) {
  const half = Math.ceil(items.length / 2);
  const link = (it) => (
    <li key={it.to}>
      <NavLink to={it.to} end={it.end}
        className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] transition ${isActive ? 'font-semibold text-brand-700' : 'text-slate-500'}`}>
        {({ isActive }) => (
          <>
            <span className={`flex h-8 w-12 items-center justify-center rounded-full transition ${isActive ? 'bg-brand-50' : ''}`}><Icon d={ICONS[it.icon]} /></span>
            {it.label}
          </>
        )}
      </NavLink>
    </li>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end">
        {items.slice(0, half).map(link)}
        <li className="flex justify-center">
          <button type="button" onClick={onFab} disabled={fabBusy} aria-label="บันทึกการเดินทางวันนี้"
            className="-mt-6 mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-3xl font-light text-white shadow-lg shadow-brand-700/30 ring-4 ring-white transition active:scale-95 disabled:opacity-60">
            {fabBusy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : '+'}
          </button>
        </li>
        {items.slice(half).map(link)}
      </ul>
    </nav>
  );
}

/** Side Navigation สำหรับ Secretary / Management / Admin (PC) และแถบบนสำหรับมือถือ */
export function SideNav({ items }) {
  return (
    <ul className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map((it) => (
        <li key={it.to}>
          <NavLink to={it.to} end={it.end}
            className={({ isActive }) => `flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm ${isActive ? 'bg-brand-50 font-semibold text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Icon d={ICONS[it.icon]} />
            {it.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
