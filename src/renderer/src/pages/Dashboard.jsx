import { useEffect, useState } from 'react'
import { Card } from '../components/Card.jsx'
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{sq.dashboard.title}</h1>
        <p className="text-sm text-slate-600">{sq.dashboard.subtitle}</p>
      </div>
      {err ? <p className="text-sm text-rose-600">{err}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title={sq.dashboard.todaySales} subtitle={sq.dashboard.todaySalesSub}>
          <div className="text-3xl font-bold text-emerald-700">
            €{today.totalAmount.toFixed(2)}
          </div>
        </Card>
        <Card title={sq.dashboard.salesToday} subtitle={sq.dashboard.salesTodaySub}>
          <div className="text-3xl font-bold text-slate-900">{today.saleCount}</div>
        </Card>
        {user?.role === 'Admin' ? (
          <>
            <Card title={sq.dashboard.products} subtitle={sq.dashboard.productsSub}>
              <div className="text-3xl font-bold text-slate-900">{products.length}</div>
            </Card>
            <Card title={sq.dashboard.lowStock} subtitle={sq.dashboard.lowStockSub(LOW_STOCK)}>
              <div className="text-3xl font-bold text-amber-700">{lowStock ?? 0}</div>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  )
}
