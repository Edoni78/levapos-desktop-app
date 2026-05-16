import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormGroup, HTMLTable, InputGroup } from '@blueprintjs/core'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { PageHeader } from '../components/PageHeader.jsx'
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
    <div className="levapos-page">
      <PageHeader title={sq.reports.title} subtitle={sq.reports.subtitle} />
      {err ? <p className="levapos-text-danger">{err}</p> : null}
      {msg ? <p className="levapos-text-success">{msg}</p> : null}

      <Card title={sq.reports.filters}>
        <div className="levapos-row" style={{ alignItems: 'flex-end' }}>
          <FormGroup label={sq.reports.start}>
            <InputGroup type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </FormGroup>
          <FormGroup label={sq.reports.end}>
            <InputGroup type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </FormGroup>
          <Button type="button" variant="secondary" onClick={() => void reload()}>
            {sq.common.refresh}
          </Button>
        </div>
        <div className="levapos-row levapos-mt-sm">
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

      {rows.length > 0 ? (
        <div className="levapos-summary-banner">
          <p className="levapos-text-xs" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>
            {sq.reports.grandTotalRange}
          </p>
          <p style={{ margin: '8px 0 0', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'baseline' }}>
            <span className="levapos-summary-amount">€{rangeSalesTotal.total.toFixed(2)}</span>
            <span className="levapos-text-muted">{sq.reports.invoicesInRange(rangeSalesTotal.count)}</span>
          </p>
        </div>
      ) : null}

      <Card title={sq.reports.preview}>
        <div className="levapos-table-wrap">
          <HTMLTable striped interactive style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>{sq.reports.colSale}</th>
                <th>{sq.reports.colWhen}</th>
                <th>{sq.reports.colCashier}</th>
                <th>{sq.reports.colProduct}</th>
                <th>{sq.reports.colQty}</th>
                <th>{sq.reports.colLine}</th>
                <th>{sq.reports.colSaleTotal}</th>
              </tr>
            </thead>
            <tbody>
              {flatLines.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24 }} className="levapos-text-muted">
                    {sq.reports.noRows}
                  </td>
                </tr>
              ) : (
                flatLines.map(({ sale, it }) => (
                  <tr key={`${sale.id}-${it.id}`}>
                    <td className="levapos-mono">{sale.id}</td>
                    <td className="levapos-text-xs">{sale.createdAt}</td>
                    <td>{sale.cashierName}</td>
                    <td>{it.productName}</td>
                    <td>{it.quantity}</td>
                    <td>€{it.lineTotal.toFixed(2)}</td>
                    <td>€{sale.totalAmount.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {flatLines.length > 0 ? (
              <tfoot>
                <tr className="levapos-table-footer">
                  <td colSpan={6} style={{ textAlign: 'right' }}>
                    {sq.reports.tableFooterTotal}
                  </td>
                  <td className="levapos-table-footer-total">€{rangeSalesTotal.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            ) : null}
          </HTMLTable>
        </div>
      </Card>
    </div>
  )
}
