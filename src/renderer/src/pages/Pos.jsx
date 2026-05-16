import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button as BpButton, Callout, HTMLTable } from '@blueprintjs/core'
import { Button } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { Input } from '../components/Input.jsx'
import { Modal } from '../components/Modal.jsx'
import { PageHeader } from '../components/PageHeader.jsx'
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

export function PosPage() {
  const { user } = useAuth()
  const barcodeRef = useRef(null)
  const tenderRef = useRef(null)
  const [barcode, setBarcode] = useState('')
  const [tender, setTender] = useState('')
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

  const addByBarcode = useCallback(
    async (code) => {
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
    },
    [addProductToCart, focusBarcode],
  )

  useEffect(() => {
    if (receipt) return

    let buffer = ''
    let lastKeyTime = 0
    const scanGapMs = 80

    function isTenderFocused() {
      const el = document.activeElement
      return el?.id === 'tender' || el === tenderRef.current
    }

    function isBarcodeFocused() {
      const el = document.activeElement
      return el?.id === 'barcode' || el === barcodeRef.current
    }

    function onKeyDown(e) {
      if (isTenderFocused() || isBarcodeFocused()) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === 'Enter') {
        if (buffer.length > 0) {
          e.preventDefault()
          e.stopPropagation()
          const code = buffer
          buffer = ''
          lastKeyTime = 0
          setBarcode(code)
          void addByBarcode(code)
        }
        return
      }

      if (e.key === 'Backspace') {
        if (buffer.length > 0) {
          e.preventDefault()
          buffer = buffer.slice(0, -1)
          setBarcode(buffer)
        }
        return
      }

      if (e.key.length === 1 && !e.repeat) {
        const now = Date.now()
        if (buffer.length > 0 && now - lastKeyTime > scanGapMs) {
          buffer = ''
        }
        lastKeyTime = now
        buffer += e.key
        setBarcode(buffer)
        focusBarcode()
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [receipt, addByBarcode, focusBarcode])

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
    <div className="levapos-page levapos-pos-page">
      <PageHeader
        title={sq.pos.title}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={clearCart}>
              {sq.pos.clearCart}
            </Button>
            <Button type="button" size="lg" disabled={busy || cart.length === 0} onClick={finishSale}>
              {sq.pos.finishSale}
            </Button>
          </>
        }
      />

      {banner ? (
        <Callout intent="warning" className="levapos-callout-warn">
          {banner}
          {banner === sq.errors.productNotFound && user?.role === 'Admin' ? (
            <>
              {' '}
              <Link
                className="levapos-link"
                to={`/products/new?barcode=${encodeURIComponent(lastLookup)}`}
              >
                {sq.pos.registerProduct}
              </Link>
            </>
          ) : null}
        </Callout>
      ) : null}

      <div className="levapos-pos-layout">
        <div className="levapos-cart-panel">
          <Card title={sq.pos.cart} className="levapos-pos-card">
            <div className="levapos-pos-card-inner">
              <div className="levapos-pos-inputs">
                <div className="levapos-pos-input-barcode">
                  <div className="levapos-pos-barcode-row">
                    <Input
                      ref={barcodeRef}
                      id="barcode"
                      label={sq.pos.barcode}
                      placeholder={sq.pos.barcodePlaceholder}
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyDown={onBarcodeKeyDown}
                      className="levapos-mono levapos-flex-1"
                    />
                    <Button type="button" size="lg" onClick={() => void addByBarcode(barcode)}>
                      {sq.pos.add}
                    </Button>
                  </div>
                </div>
                <div className="levapos-pos-input-payment">
                  <Input
                    ref={tenderRef}
                    id="tender"
                    label={sq.pos.customerPaid}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={sq.pos.paymentPlaceholder}
                    value={tender}
                    onChange={(e) => {
                      setTender(e.target.value)
                      setChangeInfo(null)
                    }}
                    onKeyDown={onTenderKeyDown}
                  />
                </div>
              </div>

              <div className="levapos-pos-workspace">
                <div className="levapos-cart-body">
              {cart.length === 0 ? (
                <p className="levapos-cart-empty">{sq.pos.emptyCart}</p>
              ) : (
                <div className="levapos-table-wrap">
                  <HTMLTable striped className="levapos-cart-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '42%' }}>{sq.pos.colProduct}</th>
                        <th>{sq.pos.colPrice}</th>
                        <th>{sq.pos.colQty}</th>
                        <th>{sq.pos.colLine}</th>
                        <th style={{ width: 100 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((line) => (
                        <tr key={line.product.id}>
                          <td>
                            <div className="levapos-cart-product">{line.product.name}</div>
                          </td>
                          <td>
                            <span className="levapos-cart-money">€{line.product.price.toFixed(2)}</span>
                          </td>
                          <td>
                            <div className="levapos-cart-qty">
                              <Button
                                type="button"
                                size="lg"
                                variant="secondary"
                                onClick={() => bumpQty(line.product.id, -1)}
                              >
                                −
                              </Button>
                              <span className="levapos-cart-qty-value">{line.quantity}</span>
                              <Button
                                type="button"
                                size="lg"
                                variant="secondary"
                                onClick={() => bumpQty(line.product.id, 1)}
                              >
                                +
                              </Button>
                            </div>
                          </td>
                          <td>
                            <span className="levapos-cart-line-total">
                              €{lineTotal(line.product.price, line.quantity).toFixed(2)}
                            </span>
                          </td>
                          <td>
                            <Button
                              type="button"
                              variant="danger"
                              onClick={() => removeLine(line.product.id)}
                            >
                              {sq.pos.remove}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </HTMLTable>
                </div>
              )}
                  <p className="levapos-cart-customer-brand" aria-hidden="true">
                    {sq.sidebar.brand}
                  </p>
                </div>

                <aside className="levapos-pos-quick-sidebar">
                  <div className="levapos-pos-quick-heading">{sq.pos.quickProducts}</div>
                  <p className="levapos-pos-quick-sub">{sq.pos.quickProductsSub}</p>
                  {quickProducts.length === 0 ? (
                    <p className="levapos-text-muted levapos-pos-quick-empty">{sq.pos.noQuickProducts}</p>
                  ) : (
                    <div className="levapos-quick-grid">
                      {quickProducts.map((p) => (
                        <BpButton
                          key={p.id}
                          type="button"
                          className="levapos-quick-btn"
                          onClick={() => addProductToCart(p)}
                        >
                          <span className="line-clamp-2" style={{ fontWeight: 600 }}>
                            {p.name}
                          </span>
                          <span className="levapos-quick-price">€{p.price.toFixed(2)}</span>
                          <span className="levapos-quick-stock">{sq.pos.stockLabel(p.stockQuantity)}</span>
                        </BpButton>
                      ))}
                    </div>
                  )}
                </aside>
              </div>

              <div className="levapos-cart-totals">
                <div className="levapos-total-card">
                <div className="levapos-total-card-label">{sq.pos.totalDue}</div>
                <div className="levapos-amount-lg">€{cartTotal.toFixed(2)}</div>
              </div>

              <div className="levapos-total-card">
                {changeInfo ? (
                  changeInfo.shortfall != null ? (
                    <>
                      <div className="levapos-total-card-label levapos-amount-warn">
                        {sq.pos.stillToCollect}
                      </div>
                      <div className="levapos-amount-lg levapos-amount-warn">
                        €{changeInfo.shortfall.toFixed(2)}
                      </div>
                      <p className="levapos-text-xs levapos-mt-sm">
                        {sq.pos.paidDue(changeInfo.paid, changeInfo.total)}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="levapos-total-card-label">{sq.pos.changeToReturn}</div>
                      <div className="levapos-amount-lg">€{changeInfo.change.toFixed(2)}</div>
                      <p className="levapos-text-xs levapos-mt-sm">
                        {sq.pos.paidSale(changeInfo.paid, changeInfo.total)}
                      </p>
                    </>
                  )
                ) : (
                  <>
                    <div className="levapos-total-card-label">{sq.pos.changeToReturn}</div>
                    <div className="levapos-amount-lg levapos-amount-muted">€—</div>
                    <p className="levapos-text-xs levapos-mt-sm">{sq.pos.changeHint}</p>
                  </>
                )}
                  </div>
                </div>
            </div>
          </Card>
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
          <div style={{ fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="levapos-text-muted">{sq.pos.saleId}</span>
              <span className="levapos-mono"><strong>{receipt.sale.id}</strong></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span className="levapos-text-muted">{sq.pos.total}</span>
              <span className="levapos-amount-lg" style={{ fontSize: '1.25rem' }}>
                €{Number(receipt.sale.totalAmount).toFixed(2)}
              </span>
            </div>
            <hr />
            <p style={{ fontWeight: 600, margin: '12px 0 8px' }}>{sq.pos.lines}</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {receipt.items.map((i, idx) => (
                <li
                  key={`${i.barcode}-${idx}`}
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}
                >
                  <span>
                    {i.productName} ×{i.quantity}
                  </span>
                  <span>€{Number(i.lineTotal).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
