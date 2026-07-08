import { useCallback, useEffect, useMemo, useState } from 'react'
import { Callout, FormGroup, HTMLTable, InputGroup, Intent } from '@blueprintjs/core'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { Input } from '../components/Input.jsx'
import { Modal } from '../components/Modal.jsx'
import { PageHeader } from '../components/PageHeader.jsx'
import { sq } from '../locale/sq.js'
import { api } from '../services/api.js'
import {
  businessToday,
  formatRangeLabel,
  getPresetRange,
  isoDate,
  REPORT_PRESET_IDS,
} from '../utils/reportDatePresets.js'

const PRESET_LABELS = {
  today: () => sq.reports.presetToday,
  yesterday: () => sq.reports.presetYesterday,
  thisWeek: () => sq.reports.presetThisWeek,
  lastWeek: () => sq.reports.presetLastWeek,
  thisMonth: () => sq.reports.presetThisMonth,
  lastMonth: () => sq.reports.presetLastMonth,
  custom: () => sq.reports.presetCustom,
}

const PERIOD_TOTAL_LABELS = {
  today: () => sq.reports.totalToday,
  yesterday: () => sq.reports.totalYesterday,
  thisWeek: () => sq.reports.totalThisWeek,
  lastWeek: () => sq.reports.totalLastWeek,
  thisMonth: () => sq.reports.totalThisMonth,
  lastMonth: () => sq.reports.totalLastMonth,
  custom: () => sq.reports.grandTotalRange,
}

function defaultThisMonth() {
  return getPresetRange('thisMonth')
}

export function ReportsPage() {
  const initial = useMemo(() => defaultThisMonth(), [])
  const [activePreset, setActivePreset] = useState('thisMonth')
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearPassword, setClearPassword] = useState('')
  const [clearErr, setClearErr] = useState('')
  const [clearBusy, setClearBusy] = useState(false)

  const rangeLabel = useMemo(() => formatRangeLabel(start, end), [start, end])
  const periodTotalLabel =
    PERIOD_TOTAL_LABELS[activePreset]?.() ?? sq.reports.grandTotalRange

  const loadData = useCallback(async (startDate, endDate) => {
    setLoading(true)
    setErr('')
    try {
      const data = await api.salesGetByDateRange({ startDate, endDate })
      setRows(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : sq.reports.loadFailed)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData(start, end)
  }, [start, end, loadData])

  function applyPreset(presetId) {
    if (presetId === 'custom') {
      setActivePreset('custom')
      return
    }
    const range = getPresetRange(presetId)
    if (!range) return
    setActivePreset(presetId)
    setStart(range.start)
    setEnd(range.end)
  }

  function onStartChange(value) {
    setStart(value)
    setActivePreset('custom')
    if (value > end) setEnd(value)
  }

  function onEndChange(value) {
    setEnd(value)
    setActivePreset('custom')
    if (value < start) setStart(value)
  }

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

  function openClearModal() {
    setClearPassword('')
    setClearErr('')
    setClearOpen(true)
  }

  function closeClearModal() {
    if (clearBusy) return
    setClearOpen(false)
    setClearPassword('')
    setClearErr('')
  }

  async function confirmClearSales() {
    if (rangeSalesTotal.count === 0) {
      setClearErr(sq.reports.clearNoSales)
      return
    }
    setClearBusy(true)
    setClearErr('')
    setErr('')
    try {
      const res = await api.salesDeleteByDateRange({
        startDate: start,
        endDate: end,
        password: clearPassword,
      })
      setClearOpen(false)
      setClearPassword('')
      setMsg(sq.reports.clearSuccess(res.deletedSales))
      await loadData(start, end)
    } catch (e) {
      setClearErr(e instanceof Error ? e.message : sq.reports.clearFailed)
    } finally {
      setClearBusy(false)
    }
  }

  async function exportTodaySales() {
    const t = isoDate(businessToday())
    applyPreset('today')
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

  const rangeEarnings = useMemo(() => {
    let cost = 0
    let profit = 0
    for (const sale of rows) {
      if (sale.totalCost != null && sale.totalProfit != null) {
        cost += Number(sale.totalCost)
        profit += Number(sale.totalProfit)
      } else if (sale.items) {
        for (const it of sale.items) {
          cost += Number(it.lineCost ?? 0)
          profit += Number(it.lineProfit ?? 0)
        }
      }
    }
    return {
      cost: Math.round(cost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
    }
  }, [rows])

  return (
    <div className="levapos-page levapos-reports-page">
      <PageHeader title={sq.reports.title} subtitle={sq.reports.subtitle} />

      {err ? <p className="levapos-text-danger">{err}</p> : null}
      {msg ? <p className="levapos-text-success">{msg}</p> : null}

      <Card title={sq.reports.filters} className="levapos-reports-filters-card">
        <div className="levapos-reports-filters">
          <div className="levapos-reports-filter-block">
            <span className="levapos-reports-filter-label">{sq.reports.periodQuick}</span>
            <div className="levapos-reports-preset-grid" role="group" aria-label={sq.reports.periodQuick}>
              {REPORT_PRESET_IDS.map((id) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={activePreset === id ? 'primary' : 'secondary'}
                  className="levapos-reports-preset-btn"
                  onClick={() => applyPreset(id)}
                >
                  {PRESET_LABELS[id]()}
                </Button>
              ))}
            </div>
          </div>

          <div className="levapos-reports-range-display">
            <span className="levapos-reports-range-display-label">{sq.reports.rangeShowing}</span>
            <span className="levapos-reports-range-display-value">{rangeLabel}</span>
            {loading ? (
              <span className="levapos-reports-loading">{sq.loading}</span>
            ) : null}
          </div>

          {activePreset === 'custom' ? (
            <div className="levapos-reports-filter-block levapos-reports-custom-dates">
              <span className="levapos-reports-filter-label">{sq.reports.customRange}</span>
              <div className="levapos-reports-date-row">
                <FormGroup label={sq.reports.start}>
                  <InputGroup
                    type="date"
                    value={start}
                    max={end}
                    onChange={(e) => onStartChange(e.target.value)}
                  />
                </FormGroup>
                <span className="levapos-reports-date-sep" aria-hidden="true">
                  →
                </span>
                <FormGroup label={sq.reports.end}>
                  <InputGroup
                    type="date"
                    value={end}
                    min={start}
                    onChange={(e) => onEndChange(e.target.value)}
                  />
                </FormGroup>
                <Button type="button" variant="secondary" onClick={() => void loadData(start, end)}>
                  {sq.common.refresh}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="levapos-reports-export-row">
            <Button type="button" onClick={() => void exportSales()}>
              {sq.reports.exportSalesRange}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void exportTodaySales()}>
              {sq.reports.exportToday}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void exportProducts()}>
              {sq.reports.exportProducts}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={loading || rangeSalesTotal.count === 0}
              onClick={openClearModal}
            >
              {sq.reports.clearSales}
            </Button>
          </div>
        </div>
      </Card>

      <div className="levapos-summary-banner levapos-reports-summary">
        <p className="levapos-reports-summary-period">{periodTotalLabel}</p>
        <p className="levapos-reports-summary-range">{rangeLabel}</p>
        <p className="levapos-reports-summary-totals">
          <span className="levapos-summary-amount">€{rangeSalesTotal.total.toFixed(2)}</span>
          <span className="levapos-text-muted">{sq.reports.invoicesInRange(rangeSalesTotal.count)}</span>
          {!loading && rangeSalesTotal.count > 0 ? (
            <span
              className={
                rangeEarnings.profit < 0
                  ? 'levapos-reports-profit levapos-text-danger'
                  : 'levapos-reports-profit levapos-text-success'
              }
              title={sq.reports.profitHint}
            >
              {sq.reports.periodProfit}: €{rangeEarnings.profit.toFixed(2)}
              <span className="levapos-reports-profit-cost">
                {' '}
                ({sq.reports.periodCost}: €{rangeEarnings.cost.toFixed(2)})
              </span>
            </span>
          ) : null}
        </p>
      </div>

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
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24 }} className="levapos-text-muted">
                    {sq.loading}
                  </td>
                </tr>
              ) : flatLines.length === 0 ? (
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
            {!loading && flatLines.length > 0 ? (
              <tfoot>
                <tr className="levapos-table-footer">
                  <td colSpan={6} style={{ textAlign: 'right' }}>
                    {sq.reports.tableFooterProfit}
                  </td>
                  <td
                    className={
                      rangeEarnings.profit < 0
                        ? 'levapos-table-footer-total levapos-text-danger'
                        : 'levapos-table-footer-total levapos-text-success'
                    }
                  >
                    €{rangeEarnings.profit.toFixed(2)}
                  </td>
                </tr>
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

      <Modal
        open={clearOpen}
        title={sq.reports.clearModalTitle}
        onClose={closeClearModal}
        footer={
          <>
            <Button type="button" variant="secondary" disabled={clearBusy} onClick={closeClearModal}>
              {sq.reports.clearCancel}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={clearBusy || !clearPassword.trim() || rangeSalesTotal.count === 0}
              onClick={() => void confirmClearSales()}
            >
              {sq.reports.clearConfirm}
            </Button>
          </>
        }
      >
        <Callout intent={Intent.DANGER} className="levapos-mb-md">
          {sq.reports.clearModalWarning}
        </Callout>
        <p className="levapos-reports-clear-meta">{sq.reports.clearModalRange(rangeLabel)}</p>
        <p className="levapos-reports-clear-meta levapos-mb-md">
          {sq.reports.clearModalCount(rangeSalesTotal.count)}
        </p>
        <Input
          id="reports-clear-password"
          type="password"
          label={sq.reports.clearAdminPassword}
          placeholder={sq.reports.clearAdminPasswordPlaceholder}
          value={clearPassword}
          onChange={(e) => {
            setClearPassword(e.target.value)
            setClearErr('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && clearPassword.trim() && !clearBusy) {
              e.preventDefault()
              void confirmClearSales()
            }
          }}
          autoComplete="current-password"
          error={clearErr || undefined}
        />
      </Modal>
    </div>
  )
}
