import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext.js'
import { api } from '../services/api.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    let cancelled = false
    const tid = window.setTimeout(() => {
      ;(async () => {
        try {
          const u = await api.getCurrentUser()
          if (!cancelled) setUser(u ?? null)
        } catch {
          if (!cancelled) setUser(null)
        } finally {
          if (!cancelled) setBooting(false)
        }
      })()
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(tid)
    }
  }, [])

  const refresh = useCallback(async () => {
    const u = await api.getCurrentUser()
    setUser(u ?? null)
  }, [])

  const login = useCallback(async (username, password) => {
    const u = await api.login({ username, password })
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      booting,
      login,
      logout,
      refresh,
    }),
    [user, booting, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
