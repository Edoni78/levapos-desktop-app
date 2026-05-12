import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { Input } from '../components/Input.jsx'
import { Modal } from '../components/Modal.jsx'
import { PosNumericPad } from '../components/PosNumericPad.jsx'
import { api } from '../services/api.js'
import { useAuth } from '../hooks/useAuth.js'
import { sq } from '../locale/sq.js'

function lineTotal(unit, qty) {
  return Math.round(unit * qty * 100) / 100
}

function roundMoney(n) {
  return Math.round(n * 100) / 100
}

function parseMoneyInput(s) {
  const t = String(s ?? '').trim().replace(',', '.')
  if (!t) return 0
  const n = Number.parseFloat(t)
  return Number.isFinite(n) ? n : 0
}

/** Large amount display (~50–60px cap on wide screens) */
const POS_BIG_AMOUNT_STYLE = { fontSize: 'clamp(2.5rem, 6vw, 3.75rem)' }

export function PosPage() {
  const { user } = useAuth()
  const barcodeRef = useRef(null)
  const tenderRef = useRef(null)
  const [barcode, setBarcode] = useState('')
  const [tender, setTender] = useState('')
  const [numTarget, setNumTarget] = useState('barcode')
  const [lastLookup, setLastLookup] = useState('')
  const [cart, setCart] = useState([])
  const [banner, setBanner] = useState('')
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [quickProducts, setQuickProducts] = useState([])
  const [changeInfo, setChangeInfo] = useState(null)

  const cartTotal = useMemo(
    () =>
      Math.round(
        cart.reduce((s, l) => s + lineTotal(l.product.price, l.quantity), 0) * 100,
      ) / 100,
    [cart],
  )

  const focusBarcode = useCallback(() => {
    barcodeRef.current?.focus()
  }, [])

  useEffect(() => {
    let cancelled = false
    const tid = window.setTimeout(() => {
      ;(async () => {
        try {
          const list = await api.productsGetAll({ posQuickPick: true, limit: 40 })
          if (!cancelled) setQuickProducts(list)
        } catch {
          if (!cancelled) setQuickProducts([])
        }
      })()
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(tid)
    }
  }, [])

  useEffect(() => {
    if (receipt) return
    const id = window.setInterval(() => {
      if (receipt) return
      if (document.activeElement?.closest('[data-pos-keep-focus]')) return
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return
      }
      focusBarcode()
    }, 800)
    return () => window.clearInterval(id)
  }, [focusBarcode, receipt])

  const addProductToCart = useCallback((product) => {
    if (!product) return
    if (product.stockQuantity < 1) {
      setBanner(sq.pos.outOfStock(product.name))
      return
    }
    setBanner('')
    setChangeInfo(null)
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.product.id === product.id)
      if (idx >= 0) {
        const next = [...prev]
        const line = next[idx]
        if (line.quantity + 1 > product.stockQuantity) {
          setBanner(sq.pos.exceedStock(product.name))
          return prev
        }
        next[idx] = { ...line, quantity: line.quantity + 1 }
        return next
      }
      return [...prev, { product, quantity: 1 }]
    })
  }, [])

  async function addByBarcode(code) {
    const trimmed = String(code).trim()
    if (!trimmed) return
    setLastLookup(trimmed)
    setBanner('')
    setChangeInfo(null)
    try {
      const product = await api.productsGetByBarcode({ barcode: trimmed })
      if (!product) {
        setBanner(sq.errors.productNotFound)
        return
      }
      addProductToCart(product)
    } catch (e) {
      const msg = e instanceof Error ? e.message : sq.pos.lookupFailed
      if (msg.includes(sq.errors.forbidden)) {
        setBanner(sq.pos.forbiddenLookup)
      } else {
        setBanner(msg === sq.errors.productNotFound ? sq.errors.productNotFound : msg)
      }
    } finally {
      setBarcode('')
      focusBarcode()
    }
  }

  function onBarcodeKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void addByBarcode(barcode)
    }
  }

  function onTenderKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      applyTenderAndChange()
    }
  }

  function applyTenderAndChange() {
    const paid = roundMoney(parseMoneyInput(tender))
    const total = roundMoney(cartTotal)
    if (cart.length === 0) {
      setChangeInfo(null)
      setBanner(sq.pos.cartEmpty)
      return
    }
    if (paid <= 0) {
      setChangeInfo(null)
      setBanner(sq.pos.enterPaid)
      return
    }
    setBanner('')
    if (paid >= total) {
      setChangeInfo({ paid, total, change: roundMoney(paid - total), shortfall: null })
    } else {
      setChangeInfo({ paid, total, change: null, shortfall: roundMoney(total - paid) })
    }
  }

  function appendDigit(d) {
    if (numTarget === 'barcode') {
      if (d === '.') return
      if (/^[0-9]$/.test(d)) setBarcode((b) => b + d)
      return
    }
    if (numTarget === 'tender') {
      if (d === '.') {
        setTender((t) => (t.includes('.') ? t : t + '.'))
        return
      }
      if (/^[0-9]$/.test(d)) setTender((t) => t + d)
    }
  }

  function clearNumField() {
    if (numTarget === 'barcode') setBarcode('')
    else {
      setTender('')
      setChangeInfo(null)
    }
  }

  function backspaceNumField() {
    if (numTarget === 'barcode') setBarcode((b) => b.slice(0, -1))
    else setTender((t) => t.slice(0, -1))
  }

  function bumpQty(productId, delta) {
    setChangeInfo(null)
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.product.id === productId)
      if (idx < 0) return prev
      const line = prev[idx]
      const nextQty = line.quantity + delta
      if (nextQty <= 0) return prev.filter((l) => l.product.id !== productId)
      if (nextQty > line.product.stockQuantity) {
        setBanner(sq.pos.exceedStock(line.product.name))
        return prev
      }
      const copy = [...prev]
      copy[idx] = { ...line, quantity: nextQty }
      return copy
    })
  }

  function removeLine(productId) {
    setChangeInfo(null)
    setCart((prev) => prev.filter((l) => l.product.id !== productId))
  }

  function clearCart() {
    setCart([])
    setBanner('')
    setTender('')
    setChangeInfo(null)
    focusBarcode()
  }

  async function finishSale() {
    if (cart.length === 0) return
    setBusy(true)
    setBanner('')
    try {
      const items = cart.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
      }))
      const res = await api.salesCreate({ items })
      setReceipt(res)
      setCart([])
      setTender('')
      setChangeInfo(null)
      focusBarcode()
    } catch (e) {
      setBanner(e instanceof Error ? e.message : sq.pos.saleFailed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{sq.pos.title}</h1>
          <p className="text-sm text-slate-600">{sq.pos.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={clearCart}>
            {sq.pos.clearCart}
          </Button>
          <Button type="button" size="lg" disabled={busy || cart.length === 0} onClick={finishSale}>
            {sq.pos.finishSale}
          </Button>
        </div>
      </div>

      {banner ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>{banner}</span>
          {banner === sq.errors.productNotFound && user?.role === 'Admin' ? (
            <span className="ml-2">
              <Link
                className="font-semibold text-emerald-800 underline"
                to={`/products/new?barcode=${encodeURIComponent(lastLookup)}`}
              >
                {sq.pos.registerProduct}
              </Link>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card title={sq.pos.cart}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-medium">{sq.pos.colProduct}</th>
                    <th className="py-2 pr-4 font-medium">{sq.pos.colPrice}</th>
                    <th className="py-2 pr-4 font-medium">{sq.pos.colQty}</th>
                    <th className="py-2 pr-4 font-medium">{sq.pos.colLine}</th>
                    <th className="py-2 font-medium"> </th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        {sq.pos.emptyCart}
                      </td>
                    </tr>
                  ) : (
                    cart.map((line) => (
                      <tr key={line.product.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-medium text-slate-900">{line.product.name}</td>
                        <td className="py-3 pr-4">€{line.product.price.toFixed(2)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => bumpQty(line.product.id, -1)}
                            >
                              −
                            </Button>
                            <span className="w-8 text-center font-semibold">{line.quantity}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => bumpQty(line.product.id, 1)}
                            >
                              +
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-semibold">
                          €{lineTotal(line.product.price, line.quantity).toFixed(2)}
                        </td>
                        <td className="py-3">
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => removeLine(line.product.id)}
                          >
                            {sq.pos.remove}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={sq.pos.quickProducts} subtitle={sq.pos.quickProductsSub}>
            {quickProducts.length === 0 ? (
              <p className="text-sm text-slate-500">{sq.pos.noQuickProducts}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {quickProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProductToCart(p)}
                    className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm ring-emerald-500/0 transition hover:border-emerald-300 hover:ring-2 hover:ring-emerald-500/20 active:scale-[0.99]"
                  >
                    <span className="line-clamp-2 text-sm font-semibold text-slate-900">{p.name}</span>
                    <span className="mt-2 text-lg font-bold text-emerald-700">€{p.price.toFixed(2)}</span>
                    <span className="mt-1 text-xs text-slate-500">{sq.pos.stockLabel(p.stockQuantity)}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-white to-emerald-50/50 px-4 py-6 text-center shadow-md">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {sq.pos.totalDue}
              </div>
              <div
                className="mt-2 font-extrabold leading-none tracking-tight text-emerald-700"
                style={POS_BIG_AMOUNT_STYLE}
              >
                €{cartTotal.toFixed(2)}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-white to-emerald-50/50 px-4 py-6 text-center shadow-md">
              {changeInfo ? (
                changeInfo.shortfall != null ? (
                  <>
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      {sq.pos.stillToCollect}
                    </div>
                    <div
                      className="mt-2 font-extrabold leading-none tracking-tight text-amber-700"
                      style={POS_BIG_AMOUNT_STYLE}
                    >
                      €{changeInfo.shortfall.toFixed(2)}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {sq.pos.paidDue(changeInfo.paid, changeInfo.total)}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {sq.pos.changeToReturn}
                    </div>
                    <div
                      className="mt-2 font-extrabold leading-none tracking-tight text-emerald-700"
                      style={POS_BIG_AMOUNT_STYLE}
                    >
                      €{changeInfo.change.toFixed(2)}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {sq.pos.paidSale(changeInfo.paid, changeInfo.total)}
                    </p>
                  </>
                )
              ) : (
                <>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {sq.pos.changeToReturn}
                  </div>
                  <div
                    className="mt-2 font-extrabold leading-none text-slate-300"
                    style={POS_BIG_AMOUNT_STYLE}
                  >
                    €—
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{sq.pos.changeHint}</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card title={sq.pos.barcode} subtitle={sq.pos.barcodeSub}>
            <div className="flex flex-wrap gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  ref={barcodeRef}
                  id="barcode"
                  placeholder={sq.pos.barcodePlaceholder}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onFocus={() => setNumTarget('barcode')}
                  onKeyDown={onBarcodeKeyDown}
                  className="font-mono"
                />
              </div>
              <Button type="button" size="lg" onClick={() => void addByBarcode(barcode)}>
                {sq.pos.add}
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {sq.pos.numpadTarget}{' '}
              <span className="font-semibold text-emerald-800">
                {numTarget === 'tender' ? sq.pos.targetPaid : sq.pos.targetBarcode}
              </span>
            </p>
          </Card>

          <Card title={sq.pos.payment} subtitle={sq.pos.paymentSub}>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {sq.pos.customerPaid}
            </label>
            <Input
              ref={tenderRef}
              id="tender"
              inputMode="decimal"
              autoComplete="off"
              placeholder={sq.pos.paymentPlaceholder}
              value={tender}
              onChange={(e) => {
                setTender(e.target.value)
                setChangeInfo(null)
              }}
              onFocus={() => setNumTarget('tender')}
              onKeyDown={onTenderKeyDown}
              className="text-lg font-semibold"
            />
            <p className="mt-2 text-xs text-slate-500">
              {sq.pos.paymentTip} <span className="font-semibold">{sq.pos.enterKey}</span>.
            </p>
          </Card>

          <PosNumericPad
            onDigit={appendDigit}
            onClear={clearNumField}
            onBackspace={backspaceNumField}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setNumTarget('barcode')
                focusBarcode()
              }}
            >
              {sq.pos.targetBarcodeBtn}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setNumTarget('tender')
                tenderRef.current?.focus()
              }}
            >
              {sq.pos.targetPaidBtn}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={!!receipt}
        title={sq.pos.receipt}
        onClose={() => setReceipt(null)}
        footer={
          <Button type="button" onClick={() => setReceipt(null)}>
            {sq.pos.nextCustomer}
          </Button>
        }
      >
        {receipt ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{sq.pos.saleId}</span>
              <span className="font-mono font-semibold">{receipt.sale.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{sq.pos.total}</span>
              <span className="text-lg font-bold text-emerald-700">
                €{Number(receipt.sale.totalAmount).toFixed(2)}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="mb-2 font-semibold text-slate-800">{sq.pos.lines}</div>
              <ul className="space-y-2">
                {receipt.items.map((i, idx) => (
                  <li key={`${i.barcode}-${idx}`} className="flex justify-between gap-4">
                    <span>
                      {i.productName} ×{i.quantity}
                    </span>
                    <span className="font-medium">€{Number(i.lineTotal).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
