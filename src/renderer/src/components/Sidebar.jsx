import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon } from '@blueprintjs/core'
import { useAuth } from '../hooks/useAuth.js'
import { sq } from '../locale/sq.js'

const SIDEBAR_STORAGE_KEY = 'levapos-sidebar-expanded'

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

function readExpandedPreference() {
  try {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored === '1') return true
    if (stored === '0') return false
  } catch {
    /* ignore */
  }
  return false
}

export function Sidebar() {
  const { user } = useAuth()
  const links = user?.role === 'Admin' ? adminNav : cashierNav
  const [expanded, setExpanded] = useState(readExpandedPreference)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, expanded ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [expanded])

  function toggleExpanded() {
    setExpanded((open) => !open)
  }

  return (
    <aside
      className={
        expanded
          ? 'levapos-sidebar levapos-sidebar--expanded'
          : 'levapos-sidebar levapos-sidebar--collapsed'
      }
    >
      <button
        type="button"
        className="levapos-sidebar-toggle"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-label={expanded ? sq.sidebar.collapse : sq.sidebar.expand}
        title={expanded ? sq.sidebar.collapse : sq.sidebar.expand}
      >
        <Icon icon={expanded ? 'chevron-left' : 'chevron-right'} size={18} />
      </button>

      {expanded ? (
        <div className="levapos-sidebar-brand">
          <div className="levapos-sidebar-brand-sub">{sq.sidebar.brand}</div>
        </div>
      ) : null}

      <nav className="levapos-sidebar-nav" aria-label={sq.sidebar.navLabel}>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              isActive
                ? 'levapos-sidebar-link levapos-sidebar-link--active'
                : 'levapos-sidebar-link'
            }
            title={!expanded ? l.label : undefined}
          >
            <Icon icon={l.icon} size={20} className="levapos-sidebar-link-icon" />
            {expanded ? (
              <span className="levapos-sidebar-link-label">{l.label}</span>
            ) : null}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
