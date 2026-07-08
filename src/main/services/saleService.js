import bcrypt from 'bcryptjs'
import { allRows, getRow, run, persist, lastInsertRowId, getDb } from '../db.js'
import { ERR } from '../locale/sq.js'
import { getSessionUser } from '../session.js'

function requireAuth() {
  const u = getSessionUser()
  if (!u) throw new Error(ERR.unauthorized)
  return u
}

function requireAdmin() {
  const u = requireAuth()
  if (u.role !== 'Admin') throw new Error(ERR.forbidden)
  return u
}

function verifyAdminPassword(password) {
  const admin = requireAdmin()
  const pwd = String(password ?? '')
  if (!pwd) throw new Error(ERR.adminPasswordRequired)
  if (pwd.length > 200) throw new Error(ERR.invalidAdminPassword)
  const row = getRow('SELECT password_hash FROM users WHERE id = ?', [admin.id])
  if (!row || !bcrypt.compareSync(pwd, row.password_hash)) {
    throw new Error(ERR.invalidAdminPassword)
  }
}

/**
 * Dita e biznesit fillon në orën 05:00 (jo në mesnatë), sepse tregu mbyllet
 * në orën 5 të mëngjesit. Shitjet e bëra midis 00:00 dhe 04:59 i përkasin
 * ditës së mëparshme.
 */
const BUSINESS_DAY_START_HOUR = 5

/** Shprehja SQL që kthen datën e biznesit për një shitje (kolona created_at UTC → orë lokale − 5h). */
const SALE_BUSINESS_DATE = `date(created_at, 'localtime', '-${BUSINESS_DAY_START_HOUR} hours')`

/** Data e biznesit (YYYY-MM-DD, orë lokale) për një çast të dhënë. */
function businessDateString(date = new Date()) {
  const shifted = new Date(date.getTime() - BUSINESS_DAY_START_HOUR * 60 * 60 * 1000)
  const y = shifted.getFullYear()
  const m = String(shifted.getMonth() + 1).padStart(2, '0')
  const d = String(shifted.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getTodayTotal() {
  const user = requireAuth()
  const bizDate = businessDateString()

  const params = [bizDate]
  let sql = `SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS count
             FROM sales WHERE ${SALE_BUSINESS_DATE} = date(?)`
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

function roundMoney(n) {
  return Math.round(n * 100) / 100
}

function resolveUnitCost(row) {
  if (row.unit_cost != null && row.unit_cost !== '') {
    return Number(row.unit_cost)
  }
  return Number(row.product_cost_price ?? 0)
}

function mapSaleItem(row) {
  const quantity = Number(row.quantity)
  const unitPrice = Number(row.unit_price)
  const lineTotal = Number(row.line_total)
  const unitCost = resolveUnitCost(row)
  const lineCost = roundMoney(unitCost * quantity)
  const lineProfit = roundMoney(lineTotal - lineCost)
  return {
    id: Number(row.id),
    saleId: Number(row.sale_id),
    productId: Number(row.product_id),
    productName: row.product_name,
    barcode: row.barcode,
    quantity,
    unitPrice,
    unitCost,
    lineTotal,
    lineCost,
    lineProfit,
  }
}

function mapSaleWithItems(s) {
  const items = allRows(
    `SELECT si.id, si.sale_id, si.product_id, si.product_name, si.barcode,
            si.quantity, si.unit_price, si.line_total, si.unit_cost,
            p.cost_price AS product_cost_price
     FROM sale_items si
     LEFT JOIN products p ON p.id = si.product_id
     WHERE si.sale_id = ?
     ORDER BY si.id`,
    [s.id],
  )
  const mappedItems = items.map(mapSaleItem)
  const totalCost = roundMoney(mappedItems.reduce((sum, i) => sum + i.lineCost, 0))
  const totalProfit = roundMoney(mappedItems.reduce((sum, i) => sum + i.lineProfit, 0))
  return {
    sale: {
      id: Number(s.id),
      userId: Number(s.user_id),
      totalAmount: Number(s.total_amount),
      createdAt: s.created_at,
      cashierName: s.cashier_name,
      totalCost,
      totalProfit,
    },
    items: mappedItems,
  }
}

export function getLastSale() {
  const sales = getRecentSales({ limit: 1 })
  return sales[0] ?? null
}

export function getRecentSales(payload = {}) {
  const user = requireAuth()
  const rawLimit = Number(payload?.limit)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.floor(rawLimit), 1), 500)
    : 200

  const params = []
  let sql = `
    SELECT s.id, s.user_id, s.total_amount, s.created_at, u.full_name AS cashier_name
    FROM sales s
    JOIN users u ON u.id = s.user_id
  `
  if (user.role === 'Cashier') {
    sql += ' WHERE s.user_id = ?'
    params.push(user.id)
  }
  sql += ' ORDER BY s.created_at DESC, s.id DESC LIMIT ?'
  params.push(limit)

  const sales = allRows(sql, params)
  return sales.map((s) => mapSaleWithItems(s))
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
    WHERE date(s.created_at, 'localtime', '-${BUSINESS_DAY_START_HOUR} hours') >= date(?)
      AND date(s.created_at, 'localtime', '-${BUSINESS_DAY_START_HOUR} hours') <= date(?)
  `
  if (user.role === 'Cashier') {
    sql += ' AND s.user_id = ?'
    params.push(user.id)
  }
  sql += ' ORDER BY s.created_at DESC, s.id DESC'

  const sales = allRows(sql, params)
  return sales.map((s) => {
    const mapped = mapSaleWithItems(s)
    return {
      id: mapped.sale.id,
      userId: mapped.sale.userId,
      totalAmount: mapped.sale.totalAmount,
      totalCost: mapped.sale.totalCost,
      totalProfit: mapped.sale.totalProfit,
      createdAt: mapped.sale.createdAt,
      cashierName: mapped.sale.cashierName,
      items: mapped.items,
    }
  })
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
    let unitPrice = Number(p.price)
    if (line.unitPrice !== undefined && line.unitPrice !== null && line.unitPrice !== '') {
      const override = Number(line.unitPrice)
      if (!Number.isFinite(override) || override < 0) {
        throw new Error(ERR.invalidPrice)
      }
      unitPrice = roundMoney(override)
    }
    const unitCost = Number(p.cost_price ?? 0)
    const lineTotal = roundMoney(unitPrice * quantity)
    resolvedLines.push({
      productId,
      quantity,
      productName: p.name,
      barcode: p.barcode,
      unitPrice,
      unitCost,
      lineTotal,
    })
  }

  const computedTotal =
    Math.round(
      resolvedLines.reduce((sum, l) => sum + l.lineTotal, 0) * 100,
    ) / 100

  // Totali mund të ndryshohet me dorë në POS. E shpërndajmë proporcionalisht
  // te rreshtat, që line_total-et të mbledhen saktësisht sa totali (raportet
  // dhe fitimi mbeten koherente).
  let totalAmount = computedTotal
  const rawOverride = payload?.totalOverride
  if (rawOverride !== undefined && rawOverride !== null && rawOverride !== '') {
    const target = Number(rawOverride)
    if (!Number.isFinite(target) || target < 0) {
      throw new Error(ERR.invalidPrice)
    }
    const roundedTarget = roundMoney(target)
    if (roundedTarget !== computedTotal && computedTotal > 0) {
      const factor = roundedTarget / computedTotal
      let running = 0
      for (let i = 0; i < resolvedLines.length; i += 1) {
        const l = resolvedLines[i]
        const newLineTotal =
          i === resolvedLines.length - 1
            ? roundMoney(roundedTarget - running)
            : roundMoney(l.lineTotal * factor)
        running = roundMoney(running + newLineTotal)
        l.lineTotal = newLineTotal
        l.unitPrice = l.quantity > 0 ? roundMoney(newLineTotal / l.quantity) : 0
      }
    }
    totalAmount = roundedTarget
  }

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
        `INSERT INTO sale_items (sale_id, product_id, product_name, barcode, quantity, unit_price, unit_cost, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          l.productId,
          l.productName,
          l.barcode,
          l.quantity,
          l.unitPrice,
          l.unitCost,
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

export function deleteSalesByDateRange(payload) {
  verifyAdminPassword(payload?.password)

  const startDate = String(payload?.startDate ?? '').trim()
  const endDate = String(payload?.endDate ?? '').trim()
  if (!startDate || !endDate) throw new Error(ERR.datesRequired)

  const sales = allRows(
    `SELECT id FROM sales
     WHERE ${SALE_BUSINESS_DATE} >= date(?) AND ${SALE_BUSINESS_DATE} <= date(?)`,
    [startDate, endDate],
  )
  if (sales.length === 0) throw new Error(ERR.noSalesInRange)

  const d = getDb()
  const now = new Date().toISOString()
  let deletedItems = 0

  d.run('BEGIN IMMEDIATE')
  try {
    for (const sale of sales) {
      const items = allRows(
        'SELECT product_id, quantity FROM sale_items WHERE sale_id = ?',
        [sale.id],
      )
      for (const item of items) {
        run(
          `UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = ?
           WHERE id = ?`,
          [item.quantity, now, item.product_id],
        )
        deletedItems += 1
      }
      run('DELETE FROM sale_items WHERE sale_id = ?', [sale.id])
    }
    run(
      `DELETE FROM sales
       WHERE ${SALE_BUSINESS_DATE} >= date(?) AND ${SALE_BUSINESS_DATE} <= date(?)`,
      [startDate, endDate],
    )
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
  return { deletedSales: sales.length, deletedItems }
}
