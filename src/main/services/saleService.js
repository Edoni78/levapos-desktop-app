import { allRows, getRow, run, persist, lastInsertRowId, getDb } from '../db.js'
import { ERR } from '../locale/sq.js'
import { getSessionUser } from '../session.js'

function requireAuth() {
  const u = getSessionUser()
  if (!u) throw new Error(ERR.unauthorized)
  return u
}

function startEndOfDayIso(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) throw new Error(ERR.invalidDate)
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  const end = new Date(d)
  end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function getTodayTotal() {
  const user = requireAuth()
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const dateStr = `${y}-${m}-${day}`
  const { start, end } = startEndOfDayIso(dateStr)

  const params = [start, end]
  let sql = `SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS count
             FROM sales WHERE created_at >= ? AND created_at <= ?`
  if (user.role === 'Cashier') {
    sql += ' AND user_id = ?'
    params.push(user.id)
  }
  const row = getRow(sql, params)
  return {
    totalAmount: Number(row?.total ?? 0),
    saleCount: Number(row?.count ?? 0),
  }
}

export function getByDateRange(payload) {
  const user = requireAuth()
  const startDate = String(payload?.startDate ?? '').trim()
  const endDate = String(payload?.endDate ?? '').trim()
  if (!startDate || !endDate) throw new Error(ERR.datesRequired)

  const params = [startDate, endDate]
  let sql = `
    SELECT s.id, s.user_id, s.total_amount, s.created_at, u.full_name AS cashier_name
    FROM sales s
    JOIN users u ON u.id = s.user_id
    WHERE date(s.created_at) >= date(?) AND date(s.created_at) <= date(?)
  `
  if (user.role === 'Cashier') {
    sql += ' AND s.user_id = ?'
    params.push(user.id)
  }
  sql += ' ORDER BY s.created_at DESC, s.id DESC'

  const sales = allRows(sql, params)
  const out = []
  for (const s of sales) {
    const items = allRows(
      `SELECT id, sale_id, product_id, product_name, barcode, quantity, unit_price, line_total
       FROM sale_items WHERE sale_id = ? ORDER BY id`,
      [s.id],
    )
    out.push({
      id: Number(s.id),
      userId: Number(s.user_id),
      totalAmount: Number(s.total_amount),
      createdAt: s.created_at,
      cashierName: s.cashier_name,
      items: items.map((i) => ({
        id: Number(i.id),
        saleId: Number(i.sale_id),
        productId: Number(i.product_id),
        productName: i.product_name,
        barcode: i.barcode,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unit_price),
        lineTotal: Number(i.line_total),
      })),
    })
  }
  return out
}

export function createSale(payload) {
  const user = requireAuth()
  const items = payload?.items
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(ERR.cartEmpty)
  }

  const d = getDb()
  const now = new Date().toISOString()
  const resolvedLines = []

  for (const line of items) {
    const productId = Number(line.productId)
    const quantity = Number(line.quantity)
    if (!Number.isInteger(productId) || productId < 1) {
      throw new Error(ERR.invalidCartLine)
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(ERR.invalidQuantity)
    }

    const p = getRow('SELECT * FROM products WHERE id = ?', [productId])
    if (!p) throw new Error(ERR.productNotFound)
    const stock = Number(p.stock_quantity)
    if (stock < quantity) {
      throw new Error(ERR.insufficientStock(p.name))
    }
    const unitPrice = Number(p.price)
    const lineTotal = Math.round(unitPrice * quantity * 100) / 100
    resolvedLines.push({
      productId,
      quantity,
      productName: p.name,
      barcode: p.barcode,
      unitPrice,
      lineTotal,
    })
  }

  const totalAmount =
    Math.round(
      resolvedLines.reduce((sum, l) => sum + l.lineTotal, 0) * 100,
    ) / 100

  d.run('BEGIN IMMEDIATE')
  let saleId
  try {
    run(`INSERT INTO sales (user_id, total_amount, created_at) VALUES (?, ?, ?)`, [
      user.id,
      totalAmount,
      now,
    ])
    saleId = lastInsertRowId()

    for (const l of resolvedLines) {
      run(
        `INSERT INTO sale_items (sale_id, product_id, product_name, barcode, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          l.productId,
          l.productName,
          l.barcode,
          l.quantity,
          l.unitPrice,
          l.lineTotal,
        ],
      )
      run(
        `UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ?`,
        [l.quantity, now, l.productId],
      )
    }

    d.run('COMMIT')
  } catch (e) {
    try {
      d.run('ROLLBACK')
    } catch {
      /* ignore */
    }
    throw e
  }

  persist()

  if (saleId === undefined) {
    throw new Error(ERR.saleNotRecorded)
  }

  const saleRow = getRow('SELECT * FROM sales WHERE id = ?', [saleId])
  const itemsOut = allRows(
    'SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id',
    [saleId],
  )

  return {
    sale: {
      id: saleId,
      userId: user.id,
      totalAmount: saleRow ? Number(saleRow.total_amount) : totalAmount,
      createdAt: saleRow?.created_at ?? now,
    },
    items: itemsOut.map((i) => ({
      productName: i.product_name,
      barcode: i.barcode,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      lineTotal: Number(i.line_total),
    })),
  }
}
