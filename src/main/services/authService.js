import bcrypt from 'bcryptjs'
import { getRow, run, persist } from '../db.js'
import { ERR } from '../locale/sq.js'
import { setSessionUser, clearSession, getSessionUser } from '../session.js'

function mapUser(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    fullName: row.full_name,
    username: row.username,
    role: row.role,
    createdAt: row.created_at,
  }
}

export function seedDefaultAdmin() {
  const existing = getRow('SELECT id FROM users LIMIT 1', [])
  if (existing) return

  const hash = bcrypt.hashSync('admin123', 10)
  const now = new Date().toISOString()
  run(
    `INSERT INTO users (full_name, username, password_hash, role, created_at)
     VALUES (?, ?, ?, 'Admin', ?)`,
    ['Administrator', 'admin', hash, now],
  )
  persist()
}

export function login(payload) {
  const username = String(payload?.username ?? '').trim()
  const password = String(payload?.password ?? '')
  if (!username || !password) {
    throw new Error(ERR.requiredUsernamePassword)
  }
  if (username.length > 80) throw new Error(ERR.invalidUsernamePassword)
  if (password.length > 200) throw new Error(ERR.invalidUsernamePassword)

  const row = getRow('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [
    username,
  ])
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    throw new Error(ERR.invalidLogin)
  }

  const user = mapUser(row)
  setSessionUser(user)
  return user
}

export function logout() {
  clearSession()
}

export function getCurrentUser() {
  return getSessionUser()
}
