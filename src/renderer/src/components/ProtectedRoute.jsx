import { Navigate, useLocation } from 'react-router-dom'
import { Spinner } from '@blueprintjs/core'
import { useAuth } from '../hooks/useAuth.js'
import { sq } from '../locale/sq.js'

export function ProtectedRoute({ children, adminOnly }) {
  const { user, booting } = useAuth()
  const location = useLocation()

  if (booting) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={40} />
        <span className="levapos-text-muted" style={{ marginLeft: 12 }}>{sq.loading}</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (adminOnly && user.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
