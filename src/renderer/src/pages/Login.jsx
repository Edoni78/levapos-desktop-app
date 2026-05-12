import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button } from '../components/Button.jsx'
import { Input } from '../components/Input.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { sq } from '../locale/sq.js'

export function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) {
    const to = location.state?.from?.pathname || '/dashboard'
    return <Navigate to={to} replace />
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : sq.login.loginFailed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{sq.login.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{sq.login.subtitle}</p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <Input
            label={sq.login.username}
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            label={sq.login.password}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? sq.login.signingIn : sq.login.signIn}
          </Button>
        </form>
        <p className="mt-6 text-xs text-slate-500">
          {sq.login.defaultHint} <span className="font-mono">admin</span> /{' '}
          <span className="font-mono">admin123</span>
        </p>
      </div>
    </div>
  )
}
