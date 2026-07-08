import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HTMLTable } from '@blueprintjs/core'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { Input } from '../components/Input.jsx'
import { PageHeader } from '../components/PageHeader.jsx'
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
    <div className="levapos-page">
      <PageHeader
        title={sq.products.title}
        subtitle={sq.products.subtitle}
        actions={
          <Link to="/products/new" style={{ textDecoration: 'none' }}>
            <Button type="button" size="lg">
              {sq.products.addProduct}
            </Button>
          </Link>
        }
      />

      <Card>
        <div className="levapos-mb-md" style={{ maxWidth: 400 }}>
          <Input
            placeholder={sq.products.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {err ? <p className="levapos-text-danger">{err}</p> : null}
        <div className="levapos-table-wrap">
          <HTMLTable striped interactive style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>{sq.products.colName}</th>
                <th>{sq.products.colBarcode}</th>
                <th>{sq.products.colCostPrice}</th>
                <th>{sq.products.colSellingPrice}</th>
                <th>{sq.products.colProfit}</th>
                <th>{sq.products.colStock}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="levapos-mono">{p.barcode}</td>
                  <td>€{(p.costPrice ?? 0).toFixed(2)}</td>
                  <td>€{p.price.toFixed(2)}</td>
                  <td
                    className={
                      (p.profit ?? 0) < 0
                        ? 'levapos-product-profit levapos-text-danger'
                        : 'levapos-product-profit levapos-text-success'
                    }
                  >
                    €{(p.profit ?? 0).toFixed(2)}
                  </td>
                  <td>{p.stockQuantity}</td>
                  <td>
                    <div className="levapos-row">
                      <Link to={`/products/${p.id}/edit`} style={{ textDecoration: 'none' }}>
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
          </HTMLTable>
        </div>
      </Card>
    </div>
  )
}
