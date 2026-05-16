import { NavLink } from 'react-router-dom'
import { Menu, MenuItem } from '@blueprintjs/core'
import { useAuth } from '../hooks/useAuth.js'
import { sq } from '../locale/sq.js'

const adminNav = [
  { to: '/dashboard', label: sq.nav.dashboard, icon: 'dashboard' },
  { to: '/pos', label: sq.nav.pos, icon: 'shopping-cart' },
  { to: '/products', label: sq.nav.products, icon: 'box' },
  { to: '/users', label: sq.nav.users, icon: 'people' },
  { to: '/reports', label: sq.nav.reports, icon: 'chart' },
  { to: '/settings', label: sq.nav.settings, icon: 'cog' },
]

const cashierNav = [
  { to: '/dashboard', label: sq.nav.dashboard, icon: 'dashboard' },
  { to: '/pos', label: sq.nav.pos, icon: 'shopping-cart' },
  { to: '/settings', label: sq.nav.settings, icon: 'cog' },
]

export function Sidebar() {
  const { user } = useAuth()
  const links = user?.role === 'Admin' ? adminNav : cashierNav

  return (
    <aside className="levapos-sidebar">
      <div className="levapos-sidebar-brand">
        <div className="levapos-sidebar-brand-sub">{sq.sidebar.brand}</div>
      </div>
      <Menu className="levapos-sidebar-menu">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <MenuItem icon={l.icon} text={l.label} active={isActive} />
            )}
          </NavLink>
        ))}
      </Menu>
    </aside>
  )
}
