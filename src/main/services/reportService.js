import ExcelJS from 'exceljs'
import { BrowserWindow, dialog } from 'electron'
import fs from 'node:fs'
import { allRows } from '../db.js'
import { ERR, EXCEL } from '../locale/sq.js'
import { getSessionUser } from '../session.js'

function requireAdmin() {
  const u = getSessionUser()
  if (!u || u.role !== 'Admin') throw new Error(ERR.forbidden)
  return u
}

function todayIsoDate() {
  const t = new Date()
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const d = String(t.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Dita e biznesit fillon në orën 05:00 (tregu mbyllet në 5 të mëngjesit),
 * prandaj shitjet e bëra para orës 05:00 numërohen te dita e mëparshme.
 */
const BUSINESS_DAY_START_HOUR = 5

/** Data e biznesit YYYY-MM-DD (orë lokale − 5h) nga vlera created_at e SQLite */
function rowCalendarDate(createdAt) {
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) {
    const s = String(createdAt ?? '')
    return s.length >= 10 ? s.slice(0, 10) : s
  }
  const shifted = new Date(d.getTime() - BUSINESS_DAY_START_HOUR * 60 * 60 * 1000)
  const y = shifted.getFullYear()
  const m = String(shifted.getMonth() + 1).padStart(2, '0')
  const day = String(shifted.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Vendos format valute në një qelizë */
function setEuroCell(cell, value) {
  cell.value = value
  cell.numFmt = '#,##0.00'
}

function boldFooterRow(row) {
  row.font = { bold: true }
}

/**
 * @param {Electron.WebContents} webContents
 * @param {{ startDate?: string, endDate?: string }} payload
 */
export async function exportSalesToExcel(webContents, payload = {}) {
  requireAdmin()
  const win = BrowserWindow.fromWebContents(webContents)
  const startDate = String(payload?.startDate ?? todayIsoDate()).trim()
  const endDate = String(payload?.endDate ?? todayIsoDate()).trim()
  if (!startDate || !endDate) throw new Error(ERR.datesRequired)

  const params = [startDate, endDate]
  const sql = `
    SELECT s.id AS sale_id,
           u.full_name AS cashier_name,
           si.product_name,
           si.barcode,
           si.quantity,
           si.unit_price,
           si.line_total,
           s.total_amount AS sale_total,
           s.created_at
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    JOIN users u ON u.id = s.user_id
    WHERE date(s.created_at, 'localtime', '-${BUSINESS_DAY_START_HOUR} hours') >= date(?)
      AND date(s.created_at, 'localtime', '-${BUSINESS_DAY_START_HOUR} hours') <= date(?)
    ORDER BY s.created_at ASC, si.id ASC
  `

  const rows = allRows(sql, params)

  const { canceled, filePath } = await dialog.showSaveDialog(win ?? undefined, {
    title: EXCEL.sales.saveTitle,
    defaultPath: `sales_${startDate}_${endDate}.xlsx`,
    filters: [{ name: EXCEL.dialogFilter, extensions: ['xlsx'] }],
  })
  if (canceled || !filePath) return { canceled: true }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(EXCEL.sales.sheetName)
  ws.columns = EXCEL.sales.columns.map((c) => ({ ...c }))

  for (const r of rows) {
    const dataRow = ws.addRow({
      saleId: r.sale_id,
      cashier: r.cashier_name,
      product: r.product_name,
      barcode: r.barcode,
      qty: r.quantity,
      unit: Number(r.unit_price),
      line: Number(r.line_total),
      saleTotal: Number(r.sale_total),
      date: r.created_at,
    })
    setEuroCell(dataRow.getCell('unit'), Number(r.unit_price))
    setEuroCell(dataRow.getCell('line'), Number(r.line_total))
    setEuroCell(dataRow.getCell('saleTotal'), Number(r.sale_total))
  }

  const grandTotal = rows.reduce((sum, r) => sum + Number(r.line_total), 0)
  const saleCount = new Set(rows.map((r) => r.sale_id)).size
  const daysInData = [...new Set(rows.map((r) => rowCalendarDate(r.created_at)))].filter(Boolean).sort()

  ws.addRow([])

  if (daysInData.length > 1) {
    for (const day of daysInData) {
      const daySum = rows
        .filter((r) => rowCalendarDate(r.created_at) === day)
        .reduce((s, r) => s + Number(r.line_total), 0)
      const dr = ws.addRow({
        saleId: '',
        cashier: EXCEL.sales.footerDayTotal(day),
        product: '',
        barcode: '',
        qty: '',
        unit: '',
        line: daySum,
        saleTotal: '',
        date: '',
      })
      boldFooterRow(dr)
      setEuroCell(dr.getCell('line'), daySum)
    }
    ws.addRow([])
  }

  const countRow = ws.addRow({
    saleId: '',
    cashier: EXCEL.sales.footerSaleCount,
    product: '',
    barcode: '',
    qty: saleCount,
    unit: '',
    line: '',
    saleTotal: '',
    date: '',
  })
  boldFooterRow(countRow)

  const totalLabel =
    startDate === endDate && daysInData.length <= 1
      ? EXCEL.sales.footerGrandSingleDay
      : EXCEL.sales.footerGrandRange
  const totalRow = ws.addRow({
    saleId: '',
    cashier: totalLabel,
    product: '',
    barcode: '',
    qty: '',
    unit: '',
    line: grandTotal,
    saleTotal: '',
    date: '',
  })
  boldFooterRow(totalRow)
  setEuroCell(totalRow.getCell('line'), grandTotal)

  const buf = await wb.xlsx.writeBuffer()
  fs.writeFileSync(filePath, Buffer.from(buf))
  return { canceled: false, path: filePath }
}

/**
 * @param {Electron.WebContents} webContents
 */
export async function exportProductsToExcel(webContents) {
  requireAdmin()
  const win = BrowserWindow.fromWebContents(webContents)
  const rows = allRows(
    'SELECT id, name, barcode, price, cost_price, stock_quantity, created_at, updated_at FROM products ORDER BY name COLLATE NOCASE',
    [],
  )

  const { canceled, filePath } = await dialog.showSaveDialog(win ?? undefined, {
    title: EXCEL.products.saveTitle,
    defaultPath: `products_${todayIsoDate()}.xlsx`,
    filters: [{ name: EXCEL.dialogFilter, extensions: ['xlsx'] }],
  })
  if (canceled || !filePath) return { canceled: true }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(EXCEL.products.sheetName)
  ws.columns = EXCEL.products.columns.map((c) => ({ ...c }))

  for (const r of rows) {
    const selling = Number(r.price)
    const cost = Number(r.cost_price ?? 0)
    const profit = Math.round((selling - cost) * 100) / 100
    const dataRow = ws.addRow({
      id: r.id,
      name: r.name,
      barcode: r.barcode,
      costPrice: cost,
      price: selling,
      profit,
      stock: r.stock_quantity,
      created: r.created_at,
      updated: r.updated_at,
    })
    setEuroCell(dataRow.getCell('costPrice'), cost)
    setEuroCell(dataRow.getCell('price'), selling)
    setEuroCell(dataRow.getCell('profit'), profit)
  }

  ws.addRow([])
  const foot = ws.addRow({
    id: '',
    name: EXCEL.products.footerProductCount,
    barcode: '',
    costPrice: '',
    price: '',
    profit: '',
    stock: rows.length,
    created: '',
    updated: '',
  })
  boldFooterRow(foot)

  const buf = await wb.xlsx.writeBuffer()
  fs.writeFileSync(filePath, Buffer.from(buf))
  return { canceled: false, path: filePath }
}
