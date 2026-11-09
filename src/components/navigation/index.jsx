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
  money: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'
};

/** Bottom Navigation สำหรับ Employee (Mobile-first) */
export function BottomNav({ items }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((it) => (
          <li key={it.to}>
            <NavLink to={it.to} end={it.end}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-xs ${isActive ? 'text-brand-700 font-semibold' : 'text-slate-500'}`}>
              <Icon d={ICONS[it.icon]} />
              {it.label}
            </NavLink>
          </li>
        ))}
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
