'use client'

// ---------- Ventas: registro rápido tipo carrito (portado de screen-ventas.jsx) ----------
import { useState, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react'
import { useStore, useMetrics, clientMetrics, TODAY } from '@/lib/store'
import { useFormats } from '@/lib/formats-store'
import { fmtCLP, fmtNum, fmtPct, catColor, stockState } from '@/lib/format'
import { puedeVerDinero } from '@/lib/permisos'
import { Icon } from '@/components/icon'
import { PageHeader, EmptyState, SearchBox, CatDot } from '@/components/ui'
import { FormatPicker } from '@/components/formatos'
import { ComprobanteModal } from '@/components/comprobante'
import { CATEGORIES } from '@/lib/data'
import type { Product, Format, Cliente, SaleItem, Sale } from '@/types'

type ProductWithKg = Product & { kgPerUnit?: number; photo?: string }

/** Item del carrito: extiende SaleItem con metadatos de UI. */
interface CartLine {
  productId: number
  name: string
  cat: string
  price: number
  cost: number
  qty: number
  formatId?: string
  baseUnitsPerItem?: number
  baseName?: string
  displayFormat?: string
  originalPrice?: number
  unit?: string
}

/** Datos del cliente capturados en el formulario de venta. */
interface ClienteForm {
  nombre: string
  numero: string
  correo: string
  direccion: string
  depto: string
  ciudad: string
}

const emptyCliente: ClienteForm = { nombre: '', numero: '', correo: '', direccion: '', depto: '', ciudad: '' }

/** Detecta viewport móvil para mostrar el flujo de venta por pasos (estilo Kyte). */
function useIsMobile(bp = 760) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${bp}px)`)
    const on = () => setMobile(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [bp])
  return mobile
}

function ProductPicker({ onPick, onPickFormat }: { onPick: (p: ProductWithKg) => void; onPickFormat: (p: ProductWithKg, fmt: Format, qty: number) => void }) {
  const { products } = useStore()
  const { productHasFormats } = useFormats()
  const [cat, setCat] = useState('Todas')
  const [q, setQ] = useState('')
  const [activeFmt, setActiveFmt] = useState<ProductWithKg | null>(null)
  const cats = useMemo(() => ['Todas', ...new Set([...products.map((p) => p.cat), ...CATEGORIES])], [products])
  const list = useMemo(() => (products as ProductWithKg[]).filter((p) => (cat === 'Todas' || p.cat === cat) && p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 40), [products, cat, q])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
      <SearchBox value={q} onChange={setQ} placeholder="Buscar producto…" width="100%" />
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 }}>
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className="chip" style={{ border: '1px solid var(--line)', whiteSpace: 'nowrap', cursor: 'pointer', background: cat === c ? 'var(--primary)' : 'var(--surface)', color: cat === c ? '#fff' : 'var(--ink-2)', padding: '6px 13px', fontSize: 13 }}>
            {c !== 'Todas' && <CatDot cat={c} />}
            {c}
          </button>
        ))}
      </div>
      {/* FormatPicker en línea — se muestra al tocar un producto con formatos */}
      {activeFmt && (
        <FormatPicker
          product={activeFmt}
          onPick={(product, fmt, qty) => {
            onPickFormat(product, fmt, qty)
            setActiveFmt(null)
          }}
          onCancel={() => setActiveFmt(null)}
        />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(158px,1fr))', gap: 10, overflowY: 'auto', alignContent: 'start', paddingRight: 2, maxHeight: 440 }}>
        {list.map((p) => {
          const st = stockState(p)
          const hasFmt = productHasFormats(p.id)
          return (
            <button
              key={p.id}
              onClick={() => {
                if (st === 'sin') return
                if (hasFmt) {
                  setActiveFmt(activeFmt?.id === p.id ? null : p)
                } else {
                  onPick(p)
                }
              }}
              disabled={st === 'sin'}
              className="card"
              style={{ padding: '0', textAlign: 'left', display: 'flex', flexDirection: 'column', cursor: st === 'sin' ? 'not-allowed' : 'pointer', opacity: st === 'sin' ? 0.55 : 1, transition: '.14s', overflow: 'hidden', border: `1px solid ${activeFmt?.id === p.id ? 'var(--primary)' : 'var(--line)'}`, background: activeFmt?.id === p.id ? 'var(--primary-tint)' : 'var(--surface)' }}
              onMouseEnter={(e) => {
                if (st !== 'sin' && activeFmt?.id !== p.id) {
                  e.currentTarget.style.borderColor = 'var(--primary)'
                  e.currentTarget.style.boxShadow = 'var(--sh-2)'
                }
              }}
              onMouseLeave={(e) => {
                if (activeFmt?.id !== p.id) {
                  e.currentTarget.style.borderColor = 'var(--line)'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              {/* Foto del producto */}
              {p.photo ? (
                <img src={p.photo} alt="" style={{ width: '100%', height: 88, objectFit: 'cover', display: 'block', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '100%', height: 52, background: `${catColor(p.cat)}18`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <CatDot cat={p.cat} size={14} />
                </div>
              )}
              <div style={{ padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>{hasFmt && <span style={{ fontSize: 9.5, fontWeight: 800, background: 'var(--primary)', color: '#fff', padding: '1px 5px', borderRadius: 4 }}>FORMATOS</span>}</div>
                  <span className="tnum" style={{ fontSize: 11, color: st === 'ok' ? 'var(--ink-3)' : st === 'bajo' ? 'oklch(0.50 0.10 70)' : 'var(--danger)', fontWeight: 700 }}>{st === 'sin' ? 'Sin stock' : `${p.stock} u.`}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.25, flex: 1 }}>{p.name}</div>
                <div className="tnum" style={{ fontWeight: 800, fontSize: 15.5, color: 'var(--ink)' }}>{hasFmt ? 'Varios precios' : fmtCLP(p.price)}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Autocompletado de cliente ─────────────────────── */
function ClienteSelector({ tipo, cliente, setCliente }: { tipo: 'local' | 'despacho'; cliente: ClienteForm; setCliente: (updater: ClienteForm | ((s: ClienteForm) => ClienteForm)) => void }) {
  const { clientes } = useStore()
  const m = useMetrics()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Cliente | null>(null)
  const set = (k: keyof ClienteForm, v: string) => setCliente((s) => ({ ...s, [k]: v }))

  const suggestions = useMemo(() => {
    if (!q.trim()) return []
    const ql = q.toLowerCase()
    return clientes
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(ql) ||
          (c.telefono || '').replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
          (c.correo || '').toLowerCase().includes(ql) ||
          (c.ciudad || '').toLowerCase().includes(ql) ||
          (c.direccion || '').toLowerCase().includes(ql),
      )
      .slice(0, 8)
  }, [clientes, q])

  const pickCliente = (c: Cliente) => {
    setSelected(c)
    setCliente({ nombre: c.nombre, numero: c.telefono || '', correo: c.correo || '', direccion: c.direccion || '', depto: '', ciudad: c.ciudad || '' })
    setQ(c.nombre)
    setOpen(false)
  }
  const clear = () => {
    setSelected(null)
    setCliente(emptyCliente)
    setQ('')
  }

  // deuda del cliente seleccionado
  const clientDeuda = selected ? m.deudaPorCliente[selected.nombre]?.total || 0 : 0

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="clientes" size={13} />
        {tipo === 'local' ? (
          <>
            Cliente <span style={{ fontWeight: 500, color: 'var(--ink-3)' }}>(opcional)</span>
          </>
        ) : (
          <span style={{ color: 'var(--terra-700)', fontWeight: 800 }}>
            Datos de despacho <span style={{ fontWeight: 600 }}>*</span>
          </span>
        )}
      </div>

      {/* Campo de autocompletado */}
      {!selected ? (
        <div style={{ position: 'relative' }}>
          <div className="input-pre" style={{ alignItems: 'center' }}>
            <span style={{ padding: '0 6px 0 12px', color: 'var(--ink-3)' }}>
              <Icon name="search" size={14} />
            </span>
            <input
              style={{ padding: '11px 13px 11px 2px', fontSize: 14.5, width: '100%', border: 'none', outline: 'none', background: 'none' }}
              value={q}
              placeholder="Buscar por nombre, teléfono o dirección…"
              onChange={(e) => {
                setQ(e.target.value)
                setCliente((s) => ({ ...s, nombre: e.target.value }))
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 180)}
            />
          </div>
          {open && suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 12, boxShadow: 'var(--sh-3)', zIndex: 60, overflow: 'hidden' }}>
              {suggestions.map((c) => {
                const met = clientMetrics(c)
                return (
                  <button key={c.id} onMouseDown={() => pickCliente(c)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', fontFamily: 'inherit' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{c.nombre}</span>
                      <span className="chip chip-neutral" style={{ fontSize: 11 }}>{c.ciudad || 'Sin ciudad'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {c.telefono && (
                        <span>
                          <Icon name="phone" size={11} style={{ verticalAlign: '-1px', marginRight: 3 }} />
                          {c.telefono}
                        </span>
                      )}
                      {c.direccion && (
                        <span>
                          <Icon name="store" size={11} style={{ verticalAlign: '-1px', marginRight: 3 }} />
                          {c.direccion}
                        </span>
                      )}
                      {met.ticketMedio > 0 && <span style={{ marginLeft: 'auto' }}>Ticket prom. {fmtCLP(met.ticketMedio)}</span>}
                    </div>
                  </button>
                )
              })}
              <button
                onMouseDown={() => {
                  const n = q.trim()
                  if (n) {
                    setCliente((s) => ({ ...s, nombre: n }))
                    setQ(n)
                  }
                  setOpen(false)
                }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--primary-700)', fontWeight: 700, fontSize: 13.5 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <Icon name="plus" size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                Continuar con "{q}" como cliente nuevo
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '11px 14px', background: 'var(--primary-tint)', borderRadius: 11, border: '1px solid var(--primary-tint2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--primary-700)' }}>{selected.nombre}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600, marginTop: 2 }}>{[selected.telefono, selected.ciudad].filter(Boolean).join(' · ')}</div>
              {clientDeuda > 0 && <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 800, marginTop: 3 }}>⚠️ Deuda pendiente: {fmtCLP(clientDeuda)}</div>}
            </div>
            <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={clear}>
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Campos extra de despacho */}
      {tipo === 'despacho' && (
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label className="field">
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Teléfono</span>
              <input className="input" style={{ fontSize: 14 }} value={cliente.numero} onChange={(e) => set('numero', e.target.value)} placeholder="+56 9 XXXX XXXX" />
            </label>
            <label className="field">
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Correo</span>
              <input className="input" style={{ fontSize: 14 }} type="email" value={cliente.correo} onChange={(e) => set('correo', e.target.value)} placeholder="correo@ejemplo.com" />
            </label>
          </div>
          <label className="field">
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Dirección</span>
            <input className="input" style={{ fontSize: 14 }} value={cliente.direccion} onChange={(e) => set('direccion', e.target.value)} placeholder="Calle, número" />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label className="field">
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Depto/Piso</span>
              <input className="input" style={{ fontSize: 14 }} value={cliente.depto} onChange={(e) => set('depto', e.target.value)} placeholder="Dpto 403" />
            </label>
            <label className="field">
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Ciudad</span>
              <input className="input" style={{ fontSize: 14 }} value={cliente.ciudad} onChange={(e) => set('ciudad', e.target.value)} placeholder="Santiago" />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Edición de precio en línea ─────────────── */
function InlinePriceEdit({ value, onChange, label }: { value: number; onChange: (v: number) => void; label?: string }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  if (editing)
    return (
      <div className="input-pre" style={{ width: 100, marginLeft: 'auto' }}>
        <span className="pre" style={{ padding: '0 2px 0 8px', fontSize: 12 }}>$</span>
        <input
          className="tnum"
          autoFocus
          inputMode="numeric"
          style={{ padding: '5px 6px 5px 2px', fontSize: 13, textAlign: 'right', width: '100%' }}
          value={fmtNum(v)}
          onChange={(e) => setV(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
          onBlur={() => {
            setEditing(false)
            onChange(v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setEditing(false)
              onChange(v)
            }
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      </div>
    )
  return (
    <button
      onClick={() => setEditing(true)}
      title={label || 'Editar precio'}
      style={{ background: 'none', border: '1px dashed transparent', borderRadius: 7, padding: '3px 6px', fontWeight: 800, fontSize: 13, color: 'var(--ink)', cursor: 'pointer', transition: '.12s', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--primary)'
        e.currentTarget.style.color = 'var(--primary-700)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'transparent'
        e.currentTarget.style.color = 'var(--ink)'
      }}
    >
      <span className="tnum">{fmtCLP(value)}</span>
      <Icon name="edit" size={11} style={{ opacity: 0.5 }} />
    </button>
  )
}

function CartItemRow({ i, setQty, setQtySimple, remove, setItemPrice, verDinero = true }: { i: CartLine; setQty: (id: number, fmt: string, d: number) => void; setQtySimple: (id: number, d: number) => void; remove: (id: number) => void; setItemPrice: (id: number, fid: string | undefined, v: number) => void; verDinero?: boolean }) {
  const isKg = /kg|kilo|gram|gr|g\b/i.test(i.unit || '')
  const priceChanged = i.price !== i.originalPrice
  const gain = (i.price - i.cost) * i.qty
  const gainPct = i.price ? ((i.price - i.cost) / i.price) * 100 : 0
  return (
    <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--line)' }}>
      {/* Fila superior: nombre + cantidad + total */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {i.name}
            {i.baseUnitsPerItem && <span style={{ fontSize: 11, color: 'var(--primary-700)', fontWeight: 700, marginLeft: 6 }}>−{i.baseUnitsPerItem * i.qty} u. base</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <button className="btn btn-ghost btn-icon" style={{ width: 27, height: 27 }} onClick={() => (i.formatId ? setQty(i.productId, i.formatId, -1) : setQtySimple(i.productId, -1))}>
            <Icon name="minus" size={13} />
          </button>
          <span className="tnum" style={{ width: 20, textAlign: 'center', fontWeight: 800, fontSize: 14 }}>{i.qty}</span>
          <button className="btn btn-ghost btn-icon" style={{ width: 27, height: 27 }} onClick={() => (i.formatId ? setQty(i.productId, i.formatId, 1) : setQtySimple(i.productId, 1))}>
            <Icon name="plus" size={13} />
          </button>
        </div>
        <div className="tnum" style={{ width: 72, textAlign: 'right', fontWeight: 800, fontSize: 14 }}>{fmtCLP(i.price * i.qty)}</div>
        <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 24, color: 'var(--ink-3)' }} onClick={() => remove(i.productId)} title="Quitar">
          <Icon name="x" size={13} />
        </button>
      </div>
      {/* Fila de precio: siempre editable */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>Precio{isKg ? ' por kg' : ' c/u'}:</span>
          <InlinePriceEdit value={i.price} label={isKg ? 'Editar precio por kg' : 'Editar precio unitario'} onChange={(v) => setItemPrice(i.productId, i.formatId, v)} />
          {priceChanged && (
            <span style={{ fontSize: 11, color: 'var(--warn)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Icon name="edit" size={11} />
              Modificado
            </span>
          )}
        </div>
        {verDinero && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="tnum" style={{ fontSize: 12, color: gain < 0 ? 'var(--danger)' : gain > 0 ? 'var(--primary-700)' : 'var(--ink-3)', fontWeight: 700 }}>Gan. {fmtCLP(gain)}</span>
            <span className="tnum" style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>{fmtPct(gainPct)}</span>
            {gainPct < 0 && <span className="chip chip-danger" style={{ fontSize: 11, padding: '2px 7px' }}>Pérdida</span>}
            {gainPct > 0 && gainPct < 15 && <span className="chip chip-warn" style={{ fontSize: 11, padding: '2px 7px' }}>Margen bajo</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, muted, strong, tone }: { label: ReactNode; value: ReactNode; muted?: boolean; strong?: boolean; tone?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span style={{ fontSize: 13.5, color: muted ? 'var(--ink-3)' : 'var(--ink-2)', fontWeight: strong ? 800 : 600 }}>{label}</span>
      <span className="tnum" style={{ fontSize: strong ? 16 : 14, fontWeight: strong ? 800 : 700, color: tone === 'primary' ? 'var(--primary-700)' : 'var(--ink)' }}>{value}</span>
    </div>
  )
}

/** Venta confirmada con descuento para el comprobante. */
type ConfirmedSale = Sale & { descuento?: { type: string; value: number; amount: number } | null }

export default function VentasPage() {
  const { registrarVenta, settings, toast, products, rol, addDespacho } = useStore()
  const { productHasFormats } = useFormats()
  const isMobile = useIsMobile()
  const verDinero = puedeVerDinero(rol)
  const [cart, setCart] = useState<CartLine[]>([])
  const [method, setMethod] = useState('Efectivo')
  const [tipo, setTipo] = useState<'local' | 'despacho'>('local')
  const [cliente, setCliente] = useState<ClienteForm>(emptyCliente)
  const [confirmed, setConfirmed] = useState<ConfirmedSale | null>(null)
  const [mixedPay, setMixedPay] = useState<{ secondary: string; amount: string } | null>(null)
  const [discount, setDiscount] = useState<{ type: 'pct' | 'fixed'; value: string }>({ type: 'pct', value: '' })
  // Estado del flujo móvil por pasos (catálogo → carrito → pago)
  const [mStep, setMStep] = useState<'catalogo' | 'carrito' | 'pago'>('catalogo')
  const [mCat, setMCat] = useState('Todas')
  const [mQuery, setMQuery] = useState('')
  const [mFmt, setMFmt] = useState<ProductWithKg | null>(null)
  const [showDiscount, setShowDiscount] = useState(false)
  const [showCliente, setShowCliente] = useState(false)
  const draftKey = 'cl_draft_cart'
  const [hasDraft] = useState(() => (typeof localStorage !== 'undefined' ? !!localStorage.getItem(draftKey) : false))

  const saveDraft = () => {
    localStorage.setItem(draftKey, JSON.stringify({ cart, method, tipo }))
    toast('Borrador guardado')
  }
  const loadDraft = () => {
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) || 'null')
      if (d) {
        setCart((d.cart || []).map((i: CartLine) => ({ ...i })))
        setMethod(d.method || 'Efectivo')
        setTipo(d.tipo || 'local')
        localStorage.removeItem(draftKey)
        toast('Borrador cargado')
      }
    } catch {
      /* draft inválido — ignorar */
    }
  }

  const add = (p: ProductWithKg) => {
    // No permitir vender más de lo que hay en stock (evita descuadres al anular).
    const enCarro = cart.filter((i) => i.productId === p.id && !i.formatId).reduce((a, i) => a + i.qty, 0)
    if (enCarro >= p.stock) {
      toast(`Sin stock suficiente de ${p.name} · quedan ${p.stock}`)
      return
    }
    setCart((c) => {
      const e = c.find((i) => i.productId === p.id && !i.formatId)
      if (e) return c.map((i) => (i.productId === p.id && !i.formatId ? { ...i, qty: i.qty + 1 } : i))
      return [...c, { productId: p.id, name: p.name, cat: p.cat, price: p.price, cost: p.cost, qty: 1 }]
    })
  }
  const addFormat = (p: ProductWithKg, fmt: Format, qty: number) =>
    setCart((c) => {
      const cartName = `${p.name} — ${fmt.name}`
      const e = c.find((i) => i.productId === p.id && i.formatId === fmt.id)
      const itemCost = p.cost * fmt.qty
      if (e) return c.map((i) => (i.productId === p.id && i.formatId === fmt.id ? { ...i, qty: i.qty + qty } : i))
      return [...c, { productId: p.id, name: cartName, baseName: p.name, displayFormat: fmt.name, cat: p.cat, price: fmt.price, originalPrice: fmt.price, cost: itemCost, qty, formatId: fmt.id, baseUnitsPerItem: fmt.qty, unit: p.unit }]
    })
  const setQty = (id: number, fmt: string, d: number) => setCart((c) => c.map((i) => (i.productId === id && i.formatId === fmt ? { ...i, qty: Math.max(1, i.qty + d) } : i)))
  const setQtySimple = (id: number, d: number) =>
    setCart((c) =>
      c.map((i) => {
        if (i.productId !== id || i.formatId) return i
        const max = products.find((x) => x.id === id)?.stock ?? Infinity
        return { ...i, qty: Math.max(1, Math.min(max, i.qty + d)) }
      }),
    )
  const setItemPrice = (id: number, fid: string | undefined, newPrice: number) => setCart((c) => c.map((i) => (i.productId === id && (i.formatId || null) === (fid || null) ? { ...i, price: Math.max(0, +newPrice || 0) } : i)))
  const remove = (id: number) => setCart((c) => c.filter((i) => i.productId !== id))

  const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0)
  const costTotal = cart.reduce((a, i) => a + i.cost * i.qty, 0)
  const discAmt = discount.value ? (discount.type === 'pct' ? (subtotal * Math.min(100, +discount.value)) / 100 : Math.min(subtotal, +discount.value)) : 0
  const finalTotal = subtotal - discAmt
  const finalProfit = finalTotal - costTotal
  const finalMargin = finalTotal ? (finalProfit / finalTotal) * 100 : 0
  const marginWarn = cart.length > 0 && finalTotal > 0 && finalMargin < (settings.minMargin || 25)

  // Para despacho exigimos nombre + dirección + comuna (OptiRoute necesita geocodificar).
  const despachoListo = cliente.nombre.trim().length > 0 && cliente.direccion.trim().length > 0 && cliente.ciudad.trim().length > 0
  const canConfirm = cart.length > 0 && (tipo === 'local' ? true : despachoListo) && (method !== 'Crédito' || cliente.nombre.trim().length > 0)

  const confirm = async () => {
    if (!canConfirm) return
    const clienteRef = { nombre: cliente.nombre, ciudad: cliente.ciudad, telefono: cliente.numero, numero: cliente.numero, correo: cliente.correo, direccion: cliente.direccion }
    const items: SaleItem[] = cart.map((i) => ({ productId: i.productId, name: i.name, cat: i.cat, qty: i.qty, price: i.price, cost: i.cost, formatId: i.formatId, baseUnitsPerItem: i.baseUnitsPerItem }))
    const sale = await registrarVenta(items, method, { tipo, cliente: cliente.nombre.trim() ? clienteRef : null })
    const confirmedSale: ConfirmedSale = { ...sale, descuento: discAmt > 0 ? { type: discount.type, value: +discount.value, amount: discAmt } : null }
    setConfirmed(confirmedSale)
    // Si es despacho, crea el despacho persistente (pendiente de enviar a OptiRoute).
    if (tipo === 'despacho') {
      addDespacho({
        id: 'desp_' + sale.id,
        saleId: sale.id,
        boleta: sale.boleta,
        fecha: sale.date,
        cliente: cliente.nombre,
        telefono: cliente.numero,
        correo: cliente.correo,
        direccion: cliente.direccion,
        depto: cliente.depto,
        ciudad: cliente.ciudad,
        nota: '',
        repartidor: 'Sin asignar',
        estado: 'pendiente',
        items: sale.items,
        total: sale.total,
        method,
      })
    }
    setCart([])
    setCliente(emptyCliente)
    setDiscount({ type: 'pct', value: '' })
    setMStep('catalogo')
    setShowCliente(false)
    setShowDiscount(false)
  }

  const stickyStyle: CSSProperties = { position: 'sticky', top: 84 }

  // ── Flujo móvil por pasos (estilo Kyte): catálogo → carrito → pago ──
  if (isMobile) {
    const cats = ['Todas', ...new Set([...products.map((p) => p.cat), ...CATEGORIES])]
    const list = (products as ProductWithKg[]).filter((p) => (mCat === 'Todas' || p.cat === mCat) && p.name.toLowerCase().includes(mQuery.toLowerCase()))
    const qtyOf = (id: number) => cart.filter((i) => i.productId === id).reduce((a, i) => a + i.qty, 0)
    const totalItems = cart.reduce((a, i) => a + i.qty, 0)

    return (
      <div className="fade-in" style={{ paddingBottom: 88 }}>
        {/* ───── Paso 1: Catálogo ───── */}
        {mStep === 'catalogo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SearchBox value={mQuery} onChange={setMQuery} placeholder="Buscar producto…" width="100%" />
            <div style={{ display: 'flex', gap: 2, overflowX: 'auto', borderBottom: '1px solid var(--line)', margin: '0 -2px' }}>
              {cats.map((c) => (
                <button
                  key={c}
                  onClick={() => setMCat(c)}
                  style={{ padding: '10px 13px', whiteSpace: 'nowrap', background: 'none', border: 'none', borderBottom: '2px solid ' + (mCat === c ? 'var(--primary)' : 'transparent'), color: mCat === c ? 'var(--primary-700)' : 'var(--ink-3)', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.02em', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {c !== 'Todas' && <CatDot cat={c} size={10} />}
                  {c}
                </button>
              ))}
            </div>

            {mFmt && (
              <FormatPicker
                product={mFmt}
                onPick={(product, fmt, qty) => {
                  addFormat(product, fmt, qty)
                  setMFmt(null)
                }}
                onCancel={() => setMFmt(null)}
              />
            )}

            {list.length === 0 ? (
              <EmptyState icon="box" title="Sin productos" text={mQuery ? 'No hay coincidencias con tu búsqueda.' : 'Aún no tienes productos en esta categoría.'} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(104px,1fr))', gap: 9 }}>
                {list.map((p) => {
                  const st = stockState(p)
                  const hasFmt = productHasFormats(p.id)
                  const q = qtyOf(p.id)
                  return (
                    <button
                      key={p.id}
                      disabled={st === 'sin'}
                      onClick={() => {
                        if (st === 'sin') return
                        if (hasFmt) setMFmt((m) => (m?.id === p.id ? null : p))
                        else add(p)
                      }}
                      className="card"
                      style={{ position: 'relative', padding: 0, overflow: 'hidden', textAlign: 'left', border: '1px solid ' + (mFmt?.id === p.id ? 'var(--primary)' : 'var(--line)'), display: 'flex', flexDirection: 'column', opacity: st === 'sin' ? 0.5 : 1, cursor: st === 'sin' ? 'not-allowed' : 'pointer' }}
                    >
                      {q > 0 && (
                        <span style={{ position: 'absolute', top: 6, right: 6, minWidth: 24, height: 24, padding: '0 6px', borderRadius: 7, background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 13, display: 'grid', placeItems: 'center', zIndex: 2 }}>{q}</span>
                      )}
                      <div style={{ width: '100%', aspectRatio: '1 / 1', flexShrink: 0, background: p.photo ? undefined : `${catColor(p.cat)}18` }}>
                        {p.photo ? (
                          <img src={p.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                            <CatDot cat={p.cat} size={18} />
                          </div>
                        )}
                      </div>
                      <div style={{ background: '#3a4150', color: '#fff', padding: '7px 9px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</div>
                        <div className="tnum" style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>{hasFmt ? 'Varios' : fmtCLP(p.price)}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ───── Paso 2: Carrito ───── */}
        {mStep === 'carrito' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0 14px' }}>
              <button className="btn btn-ghost btn-icon" onClick={() => setMStep('catalogo')} aria-label="Volver">
                <Icon name="chevL" size={18} />
              </button>
              <div style={{ fontWeight: 800, fontSize: 19 }}>Carrito</div>
              <span className="chip chip-neutral" style={{ marginLeft: 'auto' }}>{totalItems} art.</span>
              {cart.length > 0 && (
                <button className="btn btn-ghost btn-icon" onClick={() => setCart([])} title="Vaciar">
                  <Icon name="trash" size={16} />
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <EmptyState icon="ventas" title="Carrito vacío" text="Vuelve al catálogo y elige productos." />
            ) : (
              <div className="card">
                {cart.map((i) => (
                  <CartItemRow key={i.productId + (i.formatId || '')} i={i} setQty={setQty} setQtySimple={setQtySimple} remove={remove} setItemPrice={setItemPrice} verDinero={verDinero} />
                ))}
                <div style={{ padding: '14px 18px' }}>
                  {!showDiscount && discAmt === 0 ? (
                    <button className="btn btn-ghost" style={{ color: 'var(--primary-700)', fontWeight: 700, padding: 0 }} onClick={() => setShowDiscount(true)}>
                      <Icon name="tag" size={14} />
                      Dar descuento
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      <div className="seg" style={{ flexShrink: 0, padding: '2px' }}>
                        <button className={discount.type === 'pct' ? 'on' : ''} onClick={() => setDiscount((d) => ({ ...d, type: 'pct' }))} style={{ padding: '6px 11px', fontSize: 12 }}>%</button>
                        <button className={discount.type === 'fixed' ? 'on' : ''} onClick={() => setDiscount((d) => ({ ...d, type: 'fixed' }))} style={{ padding: '6px 11px', fontSize: 12 }}>$</button>
                      </div>
                      <div className="input-pre" style={{ flex: 1 }}>
                        {discount.type === 'fixed' && <span className="pre" style={{ paddingLeft: 10, paddingRight: 3, fontSize: 13 }}>$</span>}
                        <input className="tnum" inputMode="numeric" placeholder="Descuento" value={discount.value} onChange={(e) => setDiscount((d) => ({ ...d, value: e.target.value.replace(/[^0-9.]/g, '') }))} style={{ padding: '9px 8px 9px ' + (discount.type === 'fixed' ? '2' : '10') + 'px', fontSize: 14, border: 'none', outline: 'none', background: 'none', width: '100%' }} />
                        {discount.type === 'pct' && <span style={{ padding: '0 8px 0 0', color: 'var(--ink-3)', fontWeight: 700, fontSize: 13 }}>%</span>}
                      </div>
                      <button className="btn btn-ghost btn-icon" style={{ width: 36, height: 36, flexShrink: 0 }} onClick={() => { setDiscount({ type: 'pct', value: '' }); setShowDiscount(false) }}>
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  )}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                    <Row label="Subtotal" value={fmtCLP(subtotal)} />
                    {discAmt > 0 && <Row label="Descuento" value={'−' + fmtCLP(discAmt)} muted />}
                    <Row label="TOTAL" value={fmtCLP(finalTotal)} strong tone="primary" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ───── Paso 3: Pago ───── */}
        {mStep === 'pago' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0 6px' }}>
              <button className="btn btn-ghost btn-icon" onClick={() => setMStep('carrito')} aria-label="Volver">
                <Icon name="chevL" size={18} />
              </button>
              <div style={{ fontWeight: 800, fontSize: 19 }}>Pago</div>
            </div>

            <div style={{ textAlign: 'center', padding: '26px 0 18px' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 700 }}>Total a cobrar</div>
              <div className="tnum" style={{ fontSize: 40, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1, marginTop: 4 }}>{fmtCLP(finalTotal)}</div>
            </div>

            {/* Tipo de venta */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {([{ k: 'local', label: 'En local', icon: 'store' }, { k: 'despacho', label: 'Despacho', icon: 'truck' }] as const).map((t) => (
                <button
                  key={t.k}
                  onClick={() => { setTipo(t.k); setCliente(emptyCliente); if (t.k === 'despacho') setShowCliente(true) }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 8px', border: '2px solid ' + (tipo === t.k ? 'var(--primary)' : 'var(--line)'), borderRadius: 12, background: tipo === t.k ? 'var(--primary-tint)' : 'var(--surface)', color: tipo === t.k ? 'var(--primary-700)' : 'var(--ink-2)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Icon name={t.icon} size={17} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Cliente */}
            {!showCliente && tipo === 'local' ? (
              <button className="btn btn-soft" style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }} onClick={() => setShowCliente(true)}>
                <Icon name="clientes" size={16} />
                Incluir un cliente
              </button>
            ) : (
              <div style={{ marginBottom: 6 }}>
                <ClienteSelector tipo={tipo} cliente={cliente} setCliente={setCliente} />
              </div>
            )}

            {/* Método de pago */}
            <div style={{ margin: '14px 0 8px', fontSize: 13.5, fontWeight: 800, color: 'var(--ink-2)' }}>Método de pago</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[...settings.methods, 'Crédito'].map((mm) => {
                const isCredito = mm === 'Crédito'
                const active = method === mm
                return (
                  <button key={mm} onClick={() => setMethod(mm)} className="btn" style={{ padding: '12px 4px', fontSize: 12, flexDirection: 'column', gap: 5, height: 66, border: '1px solid ' + (active ? (isCredito ? 'var(--warn)' : 'var(--primary)') : 'var(--line-2)'), background: active ? (isCredito ? 'var(--warn-tint)' : 'var(--primary-tint)') : 'var(--surface)', color: active ? (isCredito ? 'oklch(0.50 0.10 70)' : 'var(--primary-700)') : 'var(--ink-2)' }}>
                    <Icon name={mm === 'Efectivo' ? 'cash' : mm === 'Tarjeta' ? 'card' : isCredito ? 'receipt' : 'arrowUp'} size={18} />
                    {mm}
                  </button>
                )
              })}
            </div>

            {method === 'Crédito' && (
              <div style={{ marginTop: 12, padding: '11px 13px', background: 'var(--warn-tint)', borderRadius: 11, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Icon name="alert" size={14} style={{ color: 'oklch(0.50 0.10 70)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'oklch(0.45 0.10 70)', lineHeight: 1.4 }}>La venta quedará pendiente. El cliente aparecerá en <strong>Deudores</strong>. Debes ingresar su nombre.</div>
              </div>
            )}

            {verDinero && marginWarn && (
              <div style={{ padding: '9px 11px', background: 'var(--warn-tint)', borderRadius: 10, fontSize: 12, color: 'oklch(0.45 0.10 70)', fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center', marginTop: 12 }}>
                <Icon name="alert" size={13} />
                El margen de esta venta queda bajo el {settings.minMargin || 25}%
              </div>
            )}
          </div>
        )}

        {/* ───── Barra inferior fija (acción del paso) ───── */}
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 46, padding: '10px 14px calc(10px + env(safe-area-inset-bottom))', background: 'var(--surface)', borderTop: '1px solid var(--line)', display: 'flex', gap: 10 }}>
          {mStep === 'catalogo' && (
            cart.length === 0 ? (
              <div style={{ flex: 1, textAlign: 'center', padding: '14px', border: '1px solid var(--primary)', borderRadius: 12, color: 'var(--primary-700)', fontWeight: 800, fontSize: 15 }}>Ningún ítem</div>
            ) : (
              <button className="btn btn-lg" style={{ flex: 1, background: 'var(--primary)', color: '#fff', justifyContent: 'space-between' }} onClick={() => setMStep('carrito')}>
                <span style={{ fontWeight: 800 }}>{totalItems} {totalItems === 1 ? 'ítem' : 'ítems'} · {fmtCLP(finalTotal)}</span>
                <Icon name="chevR" size={18} />
              </button>
            )
          )}
          {mStep === 'carrito' && (
            <button className="btn btn-lg" style={{ flex: 1, background: 'var(--primary)', color: '#fff', justifyContent: 'space-between' }} disabled={cart.length === 0} onClick={() => setMStep('pago')}>
              <span style={{ fontWeight: 800 }}>Continuar · {fmtCLP(finalTotal)}</span>
              <Icon name="chevR" size={18} />
            </button>
          )}
          {mStep === 'pago' && (
            <button className="btn btn-lg" style={{ flex: 1, background: method === 'Crédito' ? 'var(--warn)' : 'var(--primary)', color: '#fff', justifyContent: 'center' }} disabled={!canConfirm} onClick={confirm}>
              <Icon name={method === 'Crédito' ? 'receipt' : tipo === 'despacho' ? 'truck' : 'check'} size={18} />
              {method === 'Crédito' ? 'Registrar a crédito' : 'Confirmar'} · {fmtCLP(finalTotal)}
            </button>
          )}
        </div>

        {confirmed && <ComprobanteModal sale={confirmed} onClose={() => setConfirmed(null)} />}
      </div>
    )
  }

  return (
    <div className="fade-in">
      <PageHeader title="Registrar venta" sub="Agrega productos y confirma. Los totales se calculan solos.">
        <div className="chip chip-neutral">
          <Icon name="clock" size={13} />
          {TODAY.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </PageHeader>

      <div className="grid ventas-grid" style={{ gridTemplateColumns: '1.55fr 1fr', alignItems: 'start' }}>
        {/* Selector de productos */}
        <div className="card">
          <div className="card-head">
            <div style={{ flex: 1 }}>
              <div className="card-title">Elige los productos</div>
              <div className="card-sub">Toca un producto para sumarlo al carrito</div>
            </div>
          </div>
          <div className="card-pad">
            <ProductPicker onPick={add} onPickFormat={addFormat} />
          </div>
        </div>

        {/* Carrito */}
        <div className="card" style={stickyStyle}>
          {/* Tipo de venta */}
          <div style={{ padding: '14px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([{ k: 'local', label: 'Venta en local', icon: 'store' }, { k: 'despacho', label: 'Despacho', icon: 'truck' }] as const).map((t) => (
              <button
                key={t.k}
                onClick={() => {
                  setTipo(t.k)
                  setCliente(emptyCliente)
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 8px', border: '2px solid ' + (tipo === t.k ? 'var(--primary)' : 'var(--line)'), borderRadius: 11, background: tipo === t.k ? 'var(--primary-tint)' : 'var(--surface)', color: tipo === t.k ? 'var(--primary-700)' : 'var(--ink-2)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', transition: '.14s', fontFamily: 'inherit' }}
              >
                <Icon name={t.icon} size={16} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Cabecera del carrito */}
          <div className="card-head" style={{ border: 'none', paddingTop: 10, paddingBottom: 10 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--primary-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center' }}>
              <Icon name="ventas" size={17} />
            </span>
            <div style={{ flex: 1 }}>
              <div className="card-title">Carrito</div>
              <div className="card-sub">{cart.reduce((a, i) => a + i.qty, 0)} artículos</div>
            </div>
            {cart.length > 0 && (
              <button className="btn btn-ghost btn-icon" onClick={() => setCart([])} title="Vaciar">
                <Icon name="trash" size={16} />
              </button>
            )}
          </div>

          {/* Items */}
          <div style={{ maxHeight: 240, overflowY: 'auto', borderTop: '1px solid var(--line)' }}>
            {cart.length === 0 ? (
              <EmptyState icon="ventas" title="Carrito vacío" text="Elige productos de la izquierda para empezar." />
            ) : (
              cart.map((i) => <CartItemRow key={i.productId + (i.formatId || '')} i={i} setQty={setQty} setQtySimple={setQtySimple} remove={remove} setItemPrice={setItemPrice} verDinero={verDinero} />)
            )}
          </div>

          {/* Totales + cliente + pago */}
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)', background: 'var(--surface-3)', maxHeight: 440, overflowY: 'auto' }}>
            <Row label="Subtotal" value={fmtCLP(subtotal)} />
            {discAmt > 0 && <Row label={`Descuento ${discount.type === 'pct' ? fmtPct(+discount.value) : fmtCLP(discAmt)}`} value={'−' + fmtCLP(discAmt)} muted />}
            {discAmt > 0 && <Row label="Total con descuento" value={fmtCLP(finalTotal)} strong />}
            {verDinero && <Row label="Costo total" value={fmtCLP(costTotal)} muted />}
            {verDinero && <Row label="Ganancia estimada" value={fmtCLP(finalProfit)} strong tone="primary" />}
            {verDinero && <Row label="Margen de la venta" value={fmtPct(finalMargin)} muted />}
            {verDinero && marginWarn && (
              <div style={{ padding: '8px 10px', background: 'var(--warn-tint)', borderRadius: 9, fontSize: 12, color: 'oklch(0.45 0.10 70)', fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                <Icon name="alert" size={12} />
                El descuento deja el margen bajo el {settings.minMargin || 25}%
              </div>
            )}

            {/* Sección de descuento */}
            <div style={{ margin: '10px 0 2px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name="tag" size={12} />
                Descuento <span style={{ fontWeight: 500 }}>(opcional)</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div className="seg" style={{ flexShrink: 0, padding: '2px' }}>
                  <button className={discount.type === 'pct' ? 'on' : ''} onClick={() => setDiscount((d) => ({ ...d, type: 'pct' }))} style={{ padding: '5px 10px', fontSize: 12 }}>%</button>
                  <button className={discount.type === 'fixed' ? 'on' : ''} onClick={() => setDiscount((d) => ({ ...d, type: 'fixed' }))} style={{ padding: '5px 10px', fontSize: 12 }}>$</button>
                </div>
                <div className="input-pre" style={{ flex: 1 }}>
                  {discount.type === 'fixed' && <span className="pre" style={{ paddingLeft: 10, paddingRight: 3, fontSize: 13 }}>$</span>}
                  <input className="tnum" inputMode="numeric" placeholder="0" value={discount.value} onChange={(e) => setDiscount((d) => ({ ...d, value: e.target.value.replace(/[^0-9.]/g, '') }))} style={{ padding: '7px 8px 7px ' + (discount.type === 'fixed' ? '2' : '10') + 'px', fontSize: 14, border: 'none', outline: 'none', background: 'none', width: '100%' }} />
                  {discount.type === 'pct' && <span style={{ padding: '0 8px 0 0', color: 'var(--ink-3)', fontWeight: 700, fontSize: 13 }}>%</span>}
                </div>
                {!!discount.value && (
                  <button className="btn btn-ghost btn-icon" style={{ width: 32, height: 32, flexShrink: 0 }} onClick={() => setDiscount({ type: 'pct', value: '' })}>
                    <Icon name="x" size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Selector de cliente */}
            <ClienteSelector tipo={tipo} cliente={cliente} setCliente={setCliente} />

            <div style={{ margin: '14px 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Método de pago</span>
              <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => setMixedPay((v) => (v ? null : { secondary: 'Tarjeta', amount: '' }))}>
                <Icon name="plus" size={12} />
                {mixedPay ? 'Pago simple' : 'Dividir pago'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7 }}>
              {[...settings.methods, 'Crédito'].map((mm) => {
                const isCredito = mm === 'Crédito'
                const active = method === mm
                return (
                  <button key={mm} onClick={() => setMethod(mm)} className="btn" style={{ padding: '9px 6px', fontSize: 12, flexDirection: 'column', gap: 3, height: 50, border: '1px solid ' + (active ? (isCredito ? 'var(--warn)' : 'var(--primary)') : 'var(--line-2)'), background: active ? (isCredito ? 'var(--warn-tint)' : 'var(--primary-tint)') : 'var(--surface)', color: active ? (isCredito ? 'oklch(0.50 0.10 70)' : 'var(--primary-700)') : 'var(--ink-2)' }}>
                    <Icon name={mm === 'Efectivo' ? 'cash' : mm === 'Tarjeta' ? 'card' : isCredito ? 'receipt' : 'arrowUp'} size={16} />
                    {mm}
                  </button>
                )
              })}
            </div>
            {method === 'Crédito' && (
              <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--warn-tint)', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Icon name="alert" size={14} style={{ color: 'oklch(0.50 0.10 70)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'oklch(0.45 0.10 70)', lineHeight: 1.4 }}>
                  La venta quedará pendiente de pago. El cliente aparecerá en la sección <strong>Deudas</strong>. Debes ingresar su nombre.
                </div>
              </div>
            )}

            {tipo === 'despacho' && !despachoListo && cart.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <Icon name="alert" size={13} />
                Para despacho ingresa nombre, dirección y comuna del destinatario
              </div>
            )}
            {method === 'Crédito' && !cliente.nombre.trim() && cart.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <Icon name="alert" size={13} />
                Para vender a crédito debes ingresar el nombre del cliente
              </div>
            )}

            {mixedPay && (
              <div style={{ padding: '11px 13px', background: 'var(--surface-3)', borderRadius: 11, margin: '0 0 8px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8 }}>Segundo método</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select className="select" style={{ flex: 1, fontSize: 13 }} value={mixedPay.secondary} onChange={(e) => setMixedPay((v) => (v ? { ...v, secondary: e.target.value } : v))}>
                    {settings.methods.filter((mt) => mt !== method).map((mt) => (
                      <option key={mt}>{mt}</option>
                    ))}
                  </select>
                  <div className="input-pre" style={{ flex: 1 }}>
                    <span className="pre" style={{ padding: '0 2px 0 10px', fontSize: 13 }}>$</span>
                    <input className="tnum" inputMode="numeric" value={mixedPay.amount} placeholder="0" style={{ padding: '9px 8px', fontSize: 13 }} onChange={(e) => setMixedPay((v) => (v ? { ...v, amount: e.target.value.replace(/[^0-9]/g, '') } : v))} />
                  </div>
                </div>
                {+mixedPay.amount > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 5 }}>
                    {method}: {fmtCLP(finalTotal - +mixedPay.amount)} · {mixedPay.secondary}: {fmtCLP(+mixedPay.amount)}
                  </div>
                )}
              </div>
            )}

            <button className="btn btn-lg" style={{ width: '100%', marginTop: 12, background: method === 'Crédito' ? 'var(--warn)' : 'var(--primary)', color: '#fff' }} disabled={!canConfirm} onClick={confirm}>
              <Icon name={method === 'Crédito' ? 'receipt' : tipo === 'despacho' ? 'truck' : 'check'} size={18} />
              {method === 'Crédito' ? 'Registrar a crédito' : tipo === 'despacho' ? 'Confirmar despacho' : 'Confirmar venta'} · {fmtCLP(finalTotal)}
            </button>
            <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 9, fontWeight: 600 }}>
              <Icon name="zap" size={12} style={{ verticalAlign: '-2px' }} /> Se descuenta del stock automáticamente
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {cart.length > 0 && (
                <button className="btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }} onClick={saveDraft}>
                  <Icon name="download" size={13} />
                  Guardar borrador
                </button>
              )}
              {hasDraft && (
                <button className="btn btn-soft" style={{ flex: 1, fontSize: 12.5 }} onClick={loadDraft}>
                  <Icon name="history" size={13} />
                  Cargar borrador
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de comprobante */}
      {confirmed && <ComprobanteModal sale={confirmed} onClose={() => setConfirmed(null)} />}
    </div>
  )
}
