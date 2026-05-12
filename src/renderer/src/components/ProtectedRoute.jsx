import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { sq } from '../locale/sq.js'

export function ProtectedRoute({ children, adminOnly }) {
  const { user, booting } = useAuth()
  const location = useLocation()

  if (booting) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        {sq.loading}
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
