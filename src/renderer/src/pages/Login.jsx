import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Card, FormGroup, InputGroup } from '@blueprintjs/core'
import { Button } from '../components/Button.jsx'
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
    <div className="levapos-login-wrap">
      <Card className="levapos-login-card" elevation={2}>
        <h1 className="levapos-page-title">{sq.login.title}</h1>
        <p className="levapos-page-subtitle">{sq.login.subtitle}</p>
        <form onSubmit={onSubmit} style={{ marginTop: 24 }}>
          <FormGroup label={sq.login.username}>
            <InputGroup
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              large
            />
          </FormGroup>
          <FormGroup label={sq.login.password}>
            <InputGroup
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              large
            />
          </FormGroup>
          {error ? <p className="levapos-text-danger">{error}</p> : null}
          <Button type="submit" size="lg" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
            {busy ? sq.login.signingIn : sq.login.signIn}
          </Button>
        </form>
        <p className="levapos-text-xs" style={{ marginTop: 24 }}>
          {sq.login.defaultHint}{' '}
          <span className="levapos-mono">admin</span> / <span className="levapos-mono">admin123</span>
        </p>
      </Card>
    </div>
  )
}
