import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, profileStatus } = useAuth()
  const { pathname } = useLocation()

  if (loading || (session && profileStatus === 'loading')) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
        <p style={{ color: 'var(--color-muted)' }}>Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // One-time setup for anyone without a profile row (new and pre-existing users).
  if (profileStatus === 'missing' && pathname !== '/profile/edit') {
    return <Navigate to="/profile/edit" replace />
  }

  return <>{children}</>
}
