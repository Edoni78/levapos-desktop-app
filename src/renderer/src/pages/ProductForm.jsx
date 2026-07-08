import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { Input } from '../components/Input.jsx'
import { PageHeader } from '../components/PageHeader.jsx'
import { sq } from '../locale/sq.js'
import { api } from '../services/api.js'

function parseMoneyField(s) {
  const t = String(s ?? '').trim().replace(',', '.')
  if (!t) return 0
  const n = Number.parseFloat(t)
  return Number.isFinite(n) ? n : NaN
}

export function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(id)

  const [name, setName] = useState('')
  const [barcode, setBarcode] = useState(
    () => (isEdit ? '' : (searchParams.get('barcode') ?? '')),
  )
  const [costPrice, setCostPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [stock, setStock] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(isEdit)

  const profitPreview = useMemo(() => {
    const sell = parseMoneyField(sellingPrice)
    const cost = parseMoneyField(costPrice)
    if (!Number.isFinite(sell) || !Number.isFinite(cost)) return null
    return Math.round((sell - cost) * 100) / 100
  }, [sellingPrice, costPrice])

  useEffect(() => {
    if (!isEdit) return

    let cancelled = false
    const tid = window.setTimeout(() => {
      ;(async () => {
        try {
          const list = await api.productsGetAll({ search: '' })
          const p = list.find((x) => String(x.id) === String(id))
          if (!p) throw new Error(sq.errors.productNotFound)
          if (!cancelled) {
            setName(p.name)
            setBarcode(p.barcode)
            setCostPrice(String(p.costPrice ?? 0))
            setSellingPrice(String(p.price))
            setStock(String(p.stockQuantity))
          }
        } catch (e) {
          if (!cancelled) setErr(e instanceof Error ? e.message : sq.productForm.loadFailed)
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(tid)
    }
  }, [id, isEdit])

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    const costNum = parseMoneyField(costPrice)
    const sellNum = parseMoneyField(sellingPrice)
    const stockNum = Number(stock)
    if (!Number.isFinite(costNum) || costNum < 0 || !Number.isFinite(sellNum) || sellNum < 0) {
      setErr(sq.productForm.saveFailed)
      return
    }
    try {
      if (isEdit) {
        await api.productsUpdate({
          id: Number(id),
          name,
          barcode,
          costPrice: costNum,
          price: sellNum,
          stockQuantity: stockNum,
        })
      } else {
        await api.productsCreate({
          name,
          barcode,
          costPrice: costNum,
          price: sellNum,
          stockQuantity: stockNum,
        })
      }
      navigate('/products')
    } catch (e) {
      setErr(e instanceof Error ? e.message : sq.productForm.saveFailed)
    }
  }

  if (loading) {
    return <p className="levapos-text-muted">{sq.loading}</p>
  }

  return (
    <div className="levapos-page levapos-form-narrow">
      <PageHeader
        title={isEdit ? sq.productForm.edit : sq.productForm.add}
        actions={
          <Link to="/products" style={{ textDecoration: 'none' }}>
            <Button type="button" variant="secondary">
              {sq.common.back}
            </Button>
          </Link>
        }
      />
      <Card>
        <form onSubmit={onSubmit}>
          <Input label={sq.productForm.name} value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label={sq.productForm.barcode}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            required
          />
          <Input
            label={sq.productForm.costPrice}
            inputMode="decimal"
            autoComplete="off"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            required
          />
          <Input
            label={sq.productForm.sellingPrice}
            inputMode="decimal"
            autoComplete="off"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            required
          />
          {profitPreview != null ? (
            <p
              className={
                profitPreview < 0
                  ? 'levapos-product-profit-preview levapos-text-danger'
                  : 'levapos-product-profit-preview levapos-text-success'
              }
            >
              {sq.productForm.profitPreview(profitPreview)}
            </p>
          ) : null}
          <Input
            label={sq.productForm.stock}
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
          />
          {err ? <p className="levapos-text-danger">{err}</p> : null}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button type="submit" size="lg">
              {sq.productForm.save}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
