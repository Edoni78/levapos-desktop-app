import { allRows, getRow, run, persist, lastInsertRowId } from '../db.js'
import { ERR } from '../locale/sq.js'
import { getSessionUser } from '../session.js'

function mapProduct(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    name: row.name,
    barcode: row.barcode,
    price: Number(row.price),
    stockQuantity: Number(row.stock_quantity),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function requireAdmin() {
  const u = getSessionUser()
  if (!u || u.role !== 'Admin') throw new Error(ERR.forbidden)
  return u
}

function requireAuth() {
  const u = getSessionUser()
  if (!u) throw new Error(ERR.unauthorized)
  return u
}

export function getAllProducts(payload = {}) {
  const quick = payload?.posQuickPick === true
  if (quick) {
    requireAuth()
    const rawLimit = Number(payload?.limit)
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.floor(rawLimit), 1), 80)
      : 48
    const rows = allRows(
      `SELECT * FROM products WHERE stock_quantity > 0
       ORDER BY name COLLATE NOCASE LIMIT ?`,
      [limit],
    )
    return rows.map(mapProduct)
  }

  requireAdmin()
  const q = String(payload?.search ?? '').trim()
  if (q) {
    const esc = q.replace(/[%_]/g, '')
    if (!esc) {
      const rows = allRows('SELECT * FROM products ORDER BY name COLLATE NOCASE', [])
      return rows.map(mapProduct)
    }
    const like = `%${esc}%`
    const rows = allRows(
      `SELECT * FROM products
       WHERE name LIKE ? COLLATE NOCASE OR barcode LIKE ? COLLATE NOCASE
       ORDER BY name COLLATE NOCASE`,
      [like, like],
    )
    return rows.map(mapProduct)
  }
  const rows = allRows('SELECT * FROM products ORDER BY name COLLATE NOCASE', [])
  return rows.map(mapProduct)
}

export function getProductByBarcode(payload) {
  requireAuth()
  const barcode = String(payload?.barcode ?? '').trim()
  if (!barcode) throw new Error(ERR.barcodeRequired)
  const row = getRow('SELECT * FROM products WHERE barcode = ? COLLATE NOCASE', [
    barcode,
  ])
  return mapProduct(row)
}

export function createProduct(payload) {
  requireAdmin()
  const name = String(payload?.name ?? '').trim()
  const barcode = String(payload?.barcode ?? '').trim()
  const price = Number(payload?.price)
  const stockQuantity = Number(payload?.stockQuantity ?? payload?.stock ?? 0)

  if (!name || name.length > 200) throw new Error(ERR.invalidProductName)
  if (!barcode || barcode.length > 64) throw new Error(ERR.invalidBarcode)
  if (!Number.isFinite(price) || price < 0) throw new Error(ERR.invalidPrice)
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
    throw new Error(ERR.invalidStock)
  }

  const dup = getRow('SELECT id FROM products WHERE barcode = ? COLLATE NOCASE', [
    barcode,
  ])
  if (dup) throw new Error(ERR.barcodeExists)

  const now = new Date().toISOString()
  run(
    `INSERT INTO products (name, barcode, price, stock_quantity, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, barcode, price, stockQuantity, now, now],
  )
  persist()
  const id = lastInsertRowId()
  return mapProduct(getRow('SELECT * FROM products WHERE id = ?', [id]))
}

export function updateProduct(payload) {
  requireAdmin()
  const id = Number(payload?.id)
  if (!Number.isInteger(id) || id < 1) throw new Error(ERR.invalidProductId)

  const existing = getRow('SELECT * FROM products WHERE id = ?', [id])
  if (!existing) throw new Error(ERR.productNotFound)

  const name =
    payload?.name !== undefined
      ? String(payload.name).trim()
      : existing.name
  const barcode =
    payload?.barcode !== undefined
      ? String(payload.barcode).trim()
      : existing.barcode
  const price =
    payload?.price !== undefined ? Number(payload.price) : Number(existing.price)
  const stockQuantity =
    payload?.stockQuantity !== undefined
      ? Number(payload.stockQuantity)
      : Number(existing.stock_quantity)

  if (!name || name.length > 200) throw new Error(ERR.invalidProductName)
  if (!barcode || barcode.length > 64) throw new Error(ERR.invalidBarcode)
  if (!Number.isFinite(price) || price < 0) throw new Error(ERR.invalidPrice)
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
    throw new Error(ERR.invalidStock)
  }

  const dup = getRow(
    'SELECT id FROM products WHERE barcode = ? COLLATE NOCASE AND id != ?',
    [barcode, id],
  )
  if (dup) throw new Error(ERR.barcodeExists)

  const now = new Date().toISOString()
  run(
    `UPDATE products SET name = ?, barcode = ?, price = ?, stock_quantity = ?, updated_at = ?
     WHERE id = ?`,
    [name, barcode, price, stockQuantity, now, id],
  )
  persist()
  return mapProduct(getRow('SELECT * FROM products WHERE id = ?', [id]))
}

export function deleteProduct(payload) {
  requireAdmin()
  const id = Number(payload?.id)
  if (!Number.isInteger(id) || id < 1) throw new Error(ERR.invalidProductId)

  const existing = getRow('SELECT id FROM products WHERE id = ?', [id])
  if (!existing) throw new Error(ERR.productNotFound)

  run('DELETE FROM products WHERE id = ?', [id])
  persist()
  return { ok: true }
}
