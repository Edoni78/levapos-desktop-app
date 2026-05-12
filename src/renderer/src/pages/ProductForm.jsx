import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { Input } from '../components/Input.jsx'
import { sq } from '../locale/sq.js'
import { api } from '../services/api.js'

export function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(id)

  const [name, setName] = useState('')
  const [barcode, setBarcode] = useState(
    () => (isEdit ? '' : (searchParams.get('barcode') ?? '')),
  )
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(isEdit)

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
            setPrice(String(p.price))
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
    try {
      const priceNum = Number(price)
      const stockNum = Number(stock)
      if (isEdit) {
        await api.productsUpdate({
          id: Number(id),
          name,
          barcode,
          price: priceNum,
          stockQuantity: stockNum,
        })
      } else {
        await api.productsCreate({
          name,
          barcode,
          price: priceNum,
          stockQuantity: stockNum,
        })
      }
      navigate('/products')
    } catch (e) {
      setErr(e instanceof Error ? e.message : sq.productForm.saveFailed)
    }
  }

  if (loading) {
    return <div className="text-slate-500">{sq.loading}</div>
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">
          {isEdit ? sq.productForm.edit : sq.productForm.add}
        </h1>
        <Link to="/products">
          <Button type="button" variant="secondary">
            {sq.common.back}
          </Button>
        </Link>
      </div>
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input label={sq.productForm.name} value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label={sq.productForm.barcode}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            required
          />
          <Input
            label={sq.productForm.price}
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <Input
            label={sq.productForm.stock}
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
          />
          {err ? <p className="text-sm text-rose-600">{err}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="submit" size="lg">
              {sq.productForm.save}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
