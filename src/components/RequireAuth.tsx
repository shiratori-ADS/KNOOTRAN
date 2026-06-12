import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function RequireAuth() {
  const { loading, isAuthenticated, cloudAuthEnabled } = useAuth()

  if (loading) {
    return (
      <div className="authGate">
        <p className="subtle">読み込み中…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!cloudAuthEnabled) {
    return <Outlet />
  }

  return <Outlet />
}
