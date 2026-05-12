import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { sq } from '../locale/sq.js'
import { api } from '../services/api.js'

function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function ReportsPage() {
  const today = useMemo(() => new Date(), [])
  const [start, setStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return isoDate(d)
  })
  const [end, setEnd] = useState(() => isoDate(today))
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  const reload = useCallback(async () => {
    setErr('')
    try {
      const data = await api.salesGetByDateRange({ startDate: start, endDate: end })
      setRows(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : sq.reports.loadFailed)
    }
  }, [start, end])

  useEffect(() => {
    let cancelled = false
    const tid = window.setTimeout(() => {
      void (async () => {
        setErr('')
        try {
          const data = await api.salesGetByDateRange({ startDate: start, endDate: end })
          if (!cancelled) setRows(data)
        } catch (e) {
          if (!cancelled) setErr(e instanceof Error ? e.message : sq.reports.loadFailed)
        }
      })()
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(tid)
    }
  }, [start, end])

  async function exportSales() {
    setMsg('')
    try {
      const res = await api.reportsExportSalesToExcel({ startDate: start, endDate: end })
      if (res?.canceled) setMsg(sq.reports.exportCanceled)
      else setMsg(sq.reports.saved(res.path))
    } catch (e) {
      setErr(e instanceof Error ? e.message : sq.reports.exportFailed)
    }
  }

  async function exportProducts() {
    setMsg('')
    try {
      const res = await api.reportsExportProductsToExcel()
      if (res?.canceled) setMsg(sq.reports.exportCanceled)
      else setMsg(sq.reports.saved(res.path))
    } catch (e) {
      setErr(e instanceof Error ? e.message : sq.reports.exportFailed)
    }
  }

  async function exportTodaySales() {
    const t = isoDate(new Date())
    setStart(t)
    setEnd(t)
    setMsg('')
    try {
      const res = await api.reportsExportSalesToExcel({ startDate: t, endDate: t })
      if (res?.canceled) setMsg(sq.reports.exportCanceled)
      else setMsg(sq.reports.saved(res.path))
    } catch (e) {
      setErr(e instanceof Error ? e.message : sq.reports.exportFailed)
    }
  }

  const flatLines = useMemo(() => {
    const out = []
    for (const s of rows) {
      for (const it of s.items) {
        out.push({ sale: s, it })
      }
    }
    return out
  }, [rows])

  const rangeSalesTotal = useMemo(() => {
    const total = rows.reduce((sum, sale) => sum + Number(sale.totalAmount), 0)
    return { total, count: rows.length }
  }, [rows])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{sq.reports.title}</h1>
        <p className="text-sm text-slate-600">{sq.reports.subtitle}</p>
      </div>
      {err ? <p className="text-sm text-rose-600">{err}</p> : null}
      {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}

      <Card title={sq.reports.filters}>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{sq.reports.start}</label>
            <input
              type="date"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{sq.reports.end}</label>
            <input
              type="date"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <Button type="button" variant="secondary" onClick={() => void reload()}>
            {sq.common.refresh}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void exportSales()}>
            {sq.reports.exportSalesRange}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void exportTodaySales()}>
            {sq.reports.exportToday}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void exportProducts()}>
            {sq.reports.exportProducts}
          </Button>
        </div>
      </Card>

      {/* {rows.length > 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            {sq.reports.grandTotalRange}
          </p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-2xl font-bold tabular-nums text-emerald-700">
              €{rangeSalesTotal.total.toFixed(2)}
            </span>
            <span className="text-sm text-slate-600">{sq.reports.invoicesInRange(rangeSalesTotal.count)}</span>
          </p>
        </div>
      ) : null} */}

      <Card title={sq.reports.preview}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-medium">{sq.reports.colSale}</th>
                <th className="py-2 pr-4 font-medium">{sq.reports.colWhen}</th>
                <th className="py-2 pr-4 font-medium">{sq.reports.colCashier}</th>
                <th className="py-2 pr-4 font-medium">{sq.reports.colProduct}</th>
                <th className="py-2 pr-4 font-medium">{sq.reports.colQty}</th>
                <th className="py-2 pr-4 font-medium">{sq.reports.colLine}</th>
                <th className="py-2 font-medium">{sq.reports.colSaleTotal}</th>
              </tr>
            </thead>
            <tbody>
              {flatLines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    {sq.reports.noRows}
                  </td>
                </tr>
              ) : (
                flatLines.map(({ sale, it }) => (
                  <tr key={`${sale.id}-${it.id}`} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-mono text-xs">{sale.id}</td>
                    <td className="py-2 pr-4 text-xs">{sale.createdAt}</td>
                    <td className="py-2 pr-4">{sale.cashierName}</td>
                    <td className="py-2 pr-4">{it.productName}</td>
                    <td className="py-2 pr-4">{it.quantity}</td>
                    <td className="py-2 pr-4">€{it.lineTotal.toFixed(2)}</td>
                    <td className="py-2">€{sale.totalAmount.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {flatLines.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-emerald-200 bg-emerald-50/60 font-semibold text-emerald-900">
                  <td colSpan={6} className="py-3 pr-4 text-right">
                    {sq.reports.tableFooterTotal}
                  </td>
                  <td className="py-3 text-lg tabular-nums">€{rangeSalesTotal.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </Card>
    </div>
  )
}
