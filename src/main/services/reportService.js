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

/** Data YYYY-MM-DD nga vlera created_at e SQLite */
function rowCalendarDate(createdAt) {
  const s = String(createdAt ?? '')
  if (s.length >= 10) return s.slice(0, 10)
  return s
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
    WHERE date(s.created_at) >= date(?) AND date(s.created_at) <= date(?)
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
    'SELECT id, name, barcode, price, stock_quantity, created_at, updated_at FROM products ORDER BY name COLLATE NOCASE',
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
    const dataRow = ws.addRow({
      id: r.id,
      name: r.name,
      barcode: r.barcode,
      price: Number(r.price),
      stock: r.stock_quantity,
      created: r.created_at,
      updated: r.updated_at,
    })
    setEuroCell(dataRow.getCell('price'), Number(r.price))
  }

  ws.addRow([])
  const foot = ws.addRow({
    id: '',
    name: EXCEL.products.footerProductCount,
    barcode: '',
    price: '',
    stock: rows.length,
    created: '',
    updated: '',
  })
  boldFooterRow(foot)

  const buf = await wb.xlsx.writeBuffer()
  fs.writeFileSync(filePath, Buffer.from(buf))
  return { canceled: false, path: filePath }
}
