import { Button } from './Button.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { sq } from '../locale/sq.js'

export function TopBar() {
  const { user, logout } = useAuth()
  const roleLabel = user?.role ? sq.roles[user.role] ?? user.role : ''

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="text-sm text-slate-500">{sq.topBar.tagline}</div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-900">
            {user?.fullName ?? '—'}
          </div>
          <div className="text-xs text-slate-500">{roleLabel}</div>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => logout()}>
          {sq.topBar.logout}
        </Button>
      </div>
    </header>
  )
}
