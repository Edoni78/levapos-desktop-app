import { useEffect, useState } from 'react'
import { Card } from '../components/Card.jsx'
import { PageHeader } from '../components/PageHeader.jsx'
import { api } from '../services/api.js'
import { useAuth } from '../hooks/useAuth.js'
import { sq } from '../locale/sq.js'

const LOW_STOCK = 10

export function DashboardPage() {
  const { user } = useAuth()
  const [today, setToday] = useState({ totalAmount: 0, saleCount: 0 })
  const [products, setProducts] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const t = await api.salesGetTodayTotal()
        if (!cancelled) setToday(t)
        if (user?.role === 'Admin') {
          const list = await api.productsGetAll({ search: '' })
          if (!cancelled) setProducts(list)
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : sq.dashboard.loadFailed)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.role])

  const lowStock = user?.role === 'Admin' ? products.filter((p) => p.stockQuantity <= LOW_STOCK).length : null

  return (
    <div className="levapos-page">
      <PageHeader title={sq.dashboard.title} subtitle={sq.dashboard.subtitle} />
      {err ? <p className="levapos-text-danger">{err}</p> : null}
      <div className="levapos-grid-4">
        <Card title={sq.dashboard.todaySales} subtitle={sq.dashboard.todaySalesSub}>
          <div className="levapos-stat-value">€{today.totalAmount.toFixed(2)}</div>
        </Card>
        <Card title={sq.dashboard.salesToday} subtitle={sq.dashboard.salesTodaySub}>
          <div className="levapos-stat-value" style={{ color: 'var(--levapos-text)' }}>
            {today.saleCount}
          </div>
        </Card>
        {user?.role === 'Admin' ? (
          <>
            <Card title={sq.dashboard.products} subtitle={sq.dashboard.productsSub}>
              <div className="levapos-stat-value" style={{ color: 'var(--levapos-text)' }}>
                {products.length}
              </div>
            </Card>
            <Card title={sq.dashboard.lowStock} subtitle={sq.dashboard.lowStockSub(LOW_STOCK)}>
              <div className="levapos-stat-value levapos-stat-value-warn">{lowStock ?? 0}</div>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  )
}
