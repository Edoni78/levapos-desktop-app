import { Button } from './Button.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { sq } from '../locale/sq.js'

export function TopBar() {
  const { user, logout } = useAuth()
  const roleLabel = user?.role ? sq.roles[user.role] ?? user.role : ''

  return (
    <header className="levapos-topbar">
      <div className="levapos-topbar-tagline">{sq.topBar.tagline}</div>
      <div className="levapos-row">
        <div className="levapos-topbar-user">
          <div className="levapos-topbar-user-name">{user?.fullName ?? '—'}</div>
          <div className="levapos-topbar-user-role">{roleLabel}</div>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => logout()}>
          {sq.topBar.logout}
        </Button>
      </div>
    </header>
  )
}
