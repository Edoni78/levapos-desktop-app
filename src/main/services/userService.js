import bcrypt from 'bcryptjs'
import { allRows, getRow, run, persist, lastInsertRowId } from '../db.js'
import { ERR } from '../locale/sq.js'
import { getSessionUser } from '../session.js'

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

function requireAdmin() {
  const u = getSessionUser()
  if (!u || u.role !== 'Admin') throw new Error(ERR.forbidden)
  return u
}

export function getAllUsers() {
  requireAdmin()
  const rows = allRows(
    'SELECT id, full_name, username, role, created_at FROM users ORDER BY username COLLATE NOCASE',
    [],
  )
  return rows.map(mapUser)
}

export function createUser(payload) {
  requireAdmin()
  const fullName = String(payload?.fullName ?? '').trim()
  const username = String(payload?.username ?? '').trim()
  const password = String(payload?.password ?? '')
  const role = payload?.role === 'Cashier' ? 'Cashier' : 'Admin'

  if (!fullName || fullName.length > 120) throw new Error(ERR.invalidFullName)
  if (!username || username.length < 2 || username.length > 80) {
    throw new Error(ERR.invalidUsername)
  }
  if (!password || password.length < 4 || password.length > 200) {
    throw new Error(ERR.passwordMin)
  }

  const dup = getRow('SELECT id FROM users WHERE username = ? COLLATE NOCASE', [
    username,
  ])
  if (dup) throw new Error(ERR.usernameExists)

  const hash = bcrypt.hashSync(password, 10)
  const now = new Date().toISOString()
  run(
    `INSERT INTO users (full_name, username, password_hash, role, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [fullName, username, hash, role, now],
  )
  persist()
  const id = lastInsertRowId()
  return mapUser(
    getRow(
      'SELECT id, full_name, username, role, created_at FROM users WHERE id = ?',
      [id],
    ),
  )
}

export function updateUser(payload) {
  requireAdmin()
  const id = Number(payload?.id)
  if (!Number.isInteger(id) || id < 1) throw new Error(ERR.invalidUserId)

  const existing = getRow('SELECT * FROM users WHERE id = ?', [id])
  if (!existing) throw new Error(ERR.userNotFound)

  const fullName =
    payload?.fullName !== undefined
      ? String(payload.fullName).trim()
      : existing.full_name
  const username =
    payload?.username !== undefined
      ? String(payload.username).trim()
      : existing.username
  const role =
    payload?.role === 'Cashier' || payload?.role === 'Admin'
      ? payload.role
      : existing.role

  if (!fullName || fullName.length > 120) throw new Error(ERR.invalidFullName)
  if (!username || username.length < 2 || username.length > 80) {
    throw new Error(ERR.invalidUsername)
  }

  const dup = getRow(
    'SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?',
    [username, id],
  )
  if (dup) throw new Error(ERR.usernameExists)

  if (existing.role === 'Admin' && role === 'Cashier') {
    const admins = allRows(
      "SELECT id FROM users WHERE role = 'Admin' AND id != ?",
      [id],
    )
    if (admins.length === 0) {
      throw new Error(ERR.cannotRemoveLastAdmin)
    }
  }

  const password = payload?.password

  if (password !== undefined && password !== null && String(password).length > 0) {
    if (String(password).length < 4 || String(password).length > 200) {
      throw new Error(ERR.passwordMin)
    }
    const hash = bcrypt.hashSync(String(password), 10)
    run(
      `UPDATE users SET full_name = ?, username = ?, password_hash = ?, role = ? WHERE id = ?`,
      [fullName, username, hash, role, id],
    )
  } else {
    run(`UPDATE users SET full_name = ?, username = ?, role = ? WHERE id = ?`, [
      fullName,
      username,
      role,
      id,
    ])
  }

  persist()
  return mapUser(
    getRow(
      'SELECT id, full_name, username, role, created_at FROM users WHERE id = ?',
      [id],
    ),
  )
}

export function deleteUser(payload) {
  requireAdmin()
  const id = Number(payload?.id)
  if (!Number.isInteger(id) || id < 1) throw new Error(ERR.invalidUserId)

  const me = getSessionUser()
  if (me && me.id === id) throw new Error(ERR.cannotDeleteOwnAccount)

  const existing = getRow('SELECT * FROM users WHERE id = ?', [id])
  if (!existing) throw new Error(ERR.userNotFound)

  if (existing.role === 'Admin') {
    const others = allRows("SELECT id FROM users WHERE role = 'Admin' AND id != ?", [
      id,
    ])
    if (others.length === 0) throw new Error(ERR.cannotDeleteLastAdmin)
  }

  run('DELETE FROM users WHERE id = ?', [id])
  persist()
  return { ok: true }
}
