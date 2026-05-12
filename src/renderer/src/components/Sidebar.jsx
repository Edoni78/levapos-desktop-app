import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { sq } from '../locale/sq.js'

const adminNav = [
  { to: '/dashboard', label: sq.nav.dashboard },
  { to: '/pos', label: sq.nav.pos },
  { to: '/products', label: sq.nav.products },
  { to: '/users', label: sq.nav.users },
  { to: '/reports', label: sq.nav.reports },
  { to: '/settings', label: sq.nav.settings },
]

const cashierNav = [
  { to: '/dashboard', label: sq.nav.dashboard },
  { to: '/pos', label: sq.nav.pos },
  { to: '/settings', label: sq.nav.settings },
]

export function Sidebar() {
  const { user } = useAuth()
  const links = user?.role === 'Admin' ? adminNav : cashierNav

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          {sq.sidebar.brand}
        </div>
        <div className="mt-1 text-lg font-bold text-slate-900">{sq.sidebar.market}</div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-emerald-50 text-emerald-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
