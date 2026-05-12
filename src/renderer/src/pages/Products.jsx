import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { Input } from '../components/Input.jsx'
import { sq } from '../locale/sq.js'
import { api } from '../services/api.js'

export function ProductsPage() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setErr('')
    try {
      const list = await api.productsGetAll({ search: debounced })
      setRows(list)
    } catch (e) {
      setErr(e instanceof Error ? e.message : sq.products.loadFailed)
    }
  }, [debounced])

  useEffect(() => {
    const tid = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(tid)
  }, [load])

  async function onDelete(id) {
    if (!window.confirm(sq.products.deleteConfirm)) return
    setBusyId(id)
    try {
      await api.productsDelete({ id })
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : sq.products.deleteFailed)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{sq.products.title}</h1>
          <p className="text-sm text-slate-600">{sq.products.subtitle}</p>
        </div>
        <Link to="/products/new">
          <Button type="button" size="lg">
            {sq.products.addProduct}
          </Button>
        </Link>
      </div>

      <Card>
        <div className="mb-4 max-w-md">
          <Input
            placeholder={sq.products.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {err ? <p className="mb-3 text-sm text-rose-600">{err}</p> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-medium">{sq.products.colName}</th>
                <th className="py-2 pr-4 font-medium">{sq.products.colBarcode}</th>
                <th className="py-2 pr-4 font-medium">{sq.products.colPrice}</th>
                <th className="py-2 pr-4 font-medium">{sq.products.colStock}</th>
                <th className="py-2 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium text-slate-900">{p.name}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{p.barcode}</td>
                  <td className="py-3 pr-4">€{p.price.toFixed(2)}</td>
                  <td className="py-3 pr-4">{p.stockQuantity}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/products/${p.id}/edit`}>
                        <Button type="button" size="sm" variant="secondary">
                          {sq.common.edit}
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={busyId === p.id}
                        onClick={() => void onDelete(p.id)}
                      >
                        {sq.common.delete}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
