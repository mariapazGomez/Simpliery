'use client'

import { useState, useEffect, useMemo, useCallback, type CSSProperties, type ReactNode } from 'react'
import { useVentas, type CartItem, type VentaConfirmada, type ClienteRef } from '@/hooks/useVentas'
import { useProductos, type Producto } from '@/hooks/useProductos'
import { useCategorias } from '@/hooks/useCategorias'
import { useConfiguracion } from '@/hooks/useConfiguracion'
import { useClientes, type ClienteDB } from '@/hooks/useClientes'
import { usePermisos } from '@/lib/permisos'
import { fmtCLP, fmtNum, fmtPct, fmtStock, catColor, precioDespachoDe, UNIT_IS_WEIGHT } from '@/lib/format'
import { Icon } from '@/components/icon'
import { PageHeader, EmptyState, SearchBox, CatDot } from '@/components/ui'
import { ComprobanteModal } from '@/components/comprobante'

// ---------------------------------------------------------------------------
// Helpers locales

const TODAY = new Date()

/** Stock state para el nuevo tipo Producto. */
function stockState(p: Producto): 'ok' | 'bajo' | 'sin' {
  return p.stock <= 0 ? 'sin' : p.stock <= p.stock_minimo ? 'bajo' : 'ok'
}

/** Detecta viewport móvil. */
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

// ---------------------------------------------------------------------------
// Tipos locales

interface ClienteForm {
  nombre: string
  numero: string
  correo: string
  direccion: string
  depto: string
  ciudad: string
  clienteId?: string
}

const emptyCliente: ClienteForm = { nombre: '', numero: '', correo: '', direccion: '', depto: '', ciudad: '' }

// ---------------------------------------------------------------------------
// ProductPicker

function ProductPicker({
  tipo, productos, categorias: catNombres,
  onPick,
}: {
  tipo: 'local' | 'despacho'
  productos: Producto[]
  categorias: string[]
  onPick: (p: Producto) => void
}) {
  const [cat, setCat] = useState('Todas')
  const [q, setQ] = useState('')
  const cats = useMemo(() => ['Todas', ...catNombres], [catNombres])
  const list = useMemo(() => {
    return productos
      .filter((p) => (cat === 'Todas' || p.categoria === cat) && p.nombre.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (a.orden ?? 1e9) - (b.orden ?? 1e9) || a.nombre.localeCompare(b.nombre))
      .slice(0, 40)
  }, [productos, cat, q])

  const stockLabel = (p: Producto) => {
    const st = stockState(p)
    return st === 'sin' ? 'Sin stock' : `${fmtStock(p.stock, p.unidad)} ${UNIT_IS_WEIGHT(p.unidad) ? p.unidad : 'u.'}`
  }

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(168px,1fr))', gap: 10, overflowY: 'auto', alignContent: 'start', paddingRight: 2, maxHeight: 440 }}>
        {list.map((p) => {
          const st = stockState(p)
          const precio = tipo === 'despacho' ? precioDespachoDe(p.precio, p.precio_despacho) : p.precio
          return (
            <button
              key={p.id}
              onClick={() => { if (st !== 'sin') onPick(p) }}
              disabled={st === 'sin'}
              className="card"
              style={{ padding: 0, textAlign: 'left', display: 'flex', flexDirection: 'column', cursor: st === 'sin' ? 'not-allowed' : 'pointer', opacity: st === 'sin' ? 0.55 : 1, transition: '.14s', overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--surface)' }}
              onMouseEnter={(e) => { if (st !== 'sin') { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = 'var(--sh-2)' } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              {p.foto_url ? (
                <img src={p.foto_url} alt="" style={{ width: '100%', height: 76, objectFit: 'cover', display: 'block', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '100%', height: 44, background: `${catColor(p.categoria)}18`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <CatDot cat={p.categoria} size={14} />
                </div>
              )}
              <div style={{ padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 11, color: st === 'ok' ? 'var(--ink-3)' : st === 'bajo' ? 'oklch(0.50 0.10 70)' : 'var(--danger)', fontWeight: 700 }}>{stockLabel(p)}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.25, flex: 1 }}>{p.nombre}</div>
                <div className="tnum" style={{ fontWeight: 800, fontSize: 15.5 }}>{fmtCLP(precio)}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ClienteSelector

function ClienteSelector({
  tipo, cliente, setCliente, clientes,
}: {
  tipo: 'local' | 'despacho'
  cliente: ClienteForm
  setCliente: (updater: ClienteForm | ((s: ClienteForm) => ClienteForm)) => void
  clientes: ClienteDB[]
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<ClienteDB | null>(null)
  const set = (k: keyof ClienteForm, v: string) => setCliente((s) => ({ ...s, [k]: v }))

  const suggestions = useMemo(() => {
    if (!q.trim()) return []
    const ql = q.toLowerCase()
    return clientes
      .filter((c) =>
        c.nombre.toLowerCase().includes(ql) ||
        (c.telefono || '').replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
        (c.correo || '').toLowerCase().includes(ql) ||
        (c.ciudad || '').toLowerCase().includes(ql),
      )
      .slice(0, 8)
  }, [clientes, q])

  const pick = (c: ClienteDB) => {
    setSelected(c)
    setCliente({ nombre: c.nombre, numero: c.telefono || '', correo: c.correo || '', direccion: c.direccion || '', depto: c.depto || '', ciudad: c.ciudad || '', clienteId: c.id })
    setQ(c.nombre)
    setOpen(false)
  }
  const clear = () => { setSelected(null); setCliente(emptyCliente); setQ('') }

  useEffect(() => {
    if (selected && !cliente.nombre) { setSelected(null); setQ('') }
  }, [selected, cliente.nombre])

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="clientes" size={13} />
        {tipo === 'local'
          ? <>Cliente <span style={{ fontWeight: 500, color: 'var(--ink-3)' }}>(opcional)</span></>
          : <span style={{ color: 'var(--terra-700)', fontWeight: 800 }}>Datos de despacho <span style={{ fontWeight: 600 }}>*</span></span>}
      </div>

      {!selected ? (
        <div style={{ position: 'relative' }}>
          <div className="input-pre" style={{ alignItems: 'center' }}>
            <span style={{ padding: '0 6px 0 12px', color: 'var(--ink-3)' }}><Icon name="search" size={14} /></span>
            <input
              style={{ padding: '11px 13px 11px 2px', fontSize: 14.5, width: '100%', border: 'none', outline: 'none', background: 'none' }}
              value={q}
              placeholder="Buscar por nombre, teléfono o dirección…"
              onChange={(e) => { setQ(e.target.value); setCliente((s) => ({ ...s, nombre: e.target.value })); setOpen(true) }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 180)}
            />
          </div>
          {open && suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 12, boxShadow: 'var(--sh-3)', zIndex: 60, overflow: 'hidden' }}>
              {suggestions.map((c) => (
                <button key={c.id} onMouseDown={() => pick(c)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', fontFamily: 'inherit' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{c.nombre}</span>
                    <span className="chip chip-neutral" style={{ fontSize: 11 }}>{c.ciudad || 'Sin ciudad'}</span>
                  </div>
                  {c.telefono && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}><Icon name="phone" size={11} style={{ verticalAlign: '-1px', marginRight: 3 }} />{c.telefono}</div>}
                </button>
              ))}
              <button onMouseDown={() => { const n = q.trim(); if (n) { setCliente((s) => ({ ...s, nombre: n })); setQ(n) } setOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--primary-700)', fontWeight: 700, fontSize: 13.5 }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
                <Icon name="plus" size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                Continuar con "{q}" como cliente nuevo
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '10px 14px', background: 'var(--surface-3)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.nombre}</div>
            {selected.ciudad && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{selected.ciudad}</div>}
          </div>
          <button onClick={clear} className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }}><Icon name="x" size={13} /></button>
        </div>
      )}

      {/* Campos manuales para cliente nuevo o despacho */}
      {!selected && (tipo === 'despacho' || cliente.nombre.trim()) && (
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {tipo === 'despacho' && (
            <>
              <input className="input" placeholder="Nombre del destinatario *" value={cliente.nombre} onChange={(e) => set('nombre', e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input className="input" placeholder="Teléfono *" inputMode="tel" value={cliente.numero} onChange={(e) => set('numero', e.target.value)} />
                <input className="input" placeholder="Correo" inputMode="email" value={cliente.correo} onChange={(e) => set('correo', e.target.value)} />
              </div>
              <input className="input" placeholder="Dirección *" value={cliente.direccion} onChange={(e) => set('direccion', e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input className="input" placeholder="Depto / Apto" value={cliente.depto} onChange={(e) => set('depto', e.target.value)} />
                <input className="input" placeholder="Ciudad / Comuna *" value={cliente.ciudad} onChange={(e) => set('ciudad', e.target.value)} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CartItemRow

function QtyInput({ value, unit, onChange }: { value: number; unit: string; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [tmp, setTmp] = useState('')
  const abbrev = unit === 'kg' ? 'kg' : unit === 'gramo' ? 'g' : unit === 'litro' ? 'L' : unit === 'mililitro' ? 'mL' : unit
  const commit = (raw: string) => {
    const v = parseFloat(raw.replace(',', '.'))
    if (!isNaN(v) && v > 0) onChange(Math.round(v * 1000) / 1000)
  }
  if (editing) {
    return (
      <input
        className="tnum"
        autoFocus
        inputMode="decimal"
        value={tmp}
        style={{ width: 64, textAlign: 'center', fontWeight: 800, fontSize: 14, border: '1px solid var(--primary)', borderRadius: 6, padding: '2px 4px', outline: 'none', background: 'var(--surface)' }}
        onChange={(e) => setTmp(e.target.value.replace(/[^0-9.,]/g, ''))}
        onBlur={() => { commit(tmp); setEditing(false) }}
        onKeyDown={(e) => { if (e.key === 'Enter') { commit(tmp); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
      />
    )
  }
  return (
    <button
      onClick={() => { setTmp(String(value)); setEditing(true) }}
      title="Toca para editar cantidad"
      style={{ minWidth: 52, textAlign: 'center', fontWeight: 800, fontSize: 13.5, border: '1px solid var(--line)', borderRadius: 6, padding: '2px 6px', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
    >
      {value}<span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 2 }}>{abbrev}</span>
    </button>
  )
}

function InlinePriceEdit({ value, label, onChange }: { value: number; label: string; onChange: (v: number) => void }) {
  const [edit, setEdit] = useState(false)
  const [tmp, setTmp] = useState('')
  if (edit) {
    return (
      <input
        className="input tnum"
        autoFocus
        inputMode="numeric"
        value={tmp}
        style={{ width: 80, padding: '3px 6px', fontSize: 13, height: 28 }}
        onChange={(e) => setTmp(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={() => { const v = +tmp; if (v > 0) onChange(v); setEdit(false) }}
        onKeyDown={(e) => { if (e.key === 'Enter') { const v = +tmp; if (v > 0) onChange(v); setEdit(false) } if (e.key === 'Escape') setEdit(false) }}
      />
    )
  }
  return (
    <button onClick={() => { setTmp(String(value)); setEdit(true) }} title={label} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 7, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13 }}>
      {fmtCLP(value)}
    </button>
  )
}

function CartItemRow({
  i, verDinero,
  setQtySimple, setQtyDirect, setItemPrice, remove,
}: {
  i: CartItem
  verDinero: boolean
  setQtySimple: (id: string, d: number) => void
  setQtyDirect: (id: string, v: number) => void
  setItemPrice: (id: string, v: number) => void
  remove: (id: string) => void
}) {
  const gain = (i.precio - i.costo) * i.qty
  const gainPct = i.precio ? ((i.precio - i.costo) / i.precio) * 100 : 0
  const priceChanged = i.precio !== i.originalPrecio
  const isWeight = UNIT_IS_WEIGHT(i.unidad)
  const step = isWeight ? 0.5 : 1
  return (
    <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.nombre}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <button className="btn btn-ghost btn-icon" style={{ width: 27, height: 27 }} onClick={() => setQtySimple(i.productId, -step)}><Icon name="minus" size={13} /></button>
          {isWeight
            ? <QtyInput value={i.qty} unit={i.unidad} onChange={(v) => setQtyDirect(i.productId, v)} />
            : <span className="tnum" style={{ width: 20, textAlign: 'center', fontWeight: 800, fontSize: 14 }}>{i.qty}</span>}
          <button className="btn btn-ghost btn-icon" style={{ width: 27, height: 27 }} onClick={() => setQtySimple(i.productId, step)}><Icon name="plus" size={13} /></button>
        </div>
        <div className="tnum" style={{ width: 72, textAlign: 'right', fontWeight: 800, fontSize: 14 }}>{fmtCLP(i.precio * i.qty)}</div>
        <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 24, color: 'var(--ink-3)' }} onClick={() => remove(i.productId)} title="Quitar"><Icon name="x" size={13} /></button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>Precio c/u:</span>
          <InlinePriceEdit value={i.precio} label="Editar precio unitario" onChange={(v) => setItemPrice(i.productId, v)} />
          {priceChanged && <span style={{ fontSize: 11, color: 'var(--warn)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><Icon name="edit" size={11} />Modificado</span>}
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

// ---------------------------------------------------------------------------
// Página principal

export default function VentasPage() {
  const { registrarVenta, submitting } = useVentas()
  const { productos, loading: loadingProd, actualizar: actualizarProducto } = useProductos()
  const { categorias } = useCategorias()
  const { config } = useConfiguracion()
  const { clientes } = useClientes()
  const { puedeVerDinero } = usePermisos()
  const isMobile = useIsMobile()
  const verDinero = puedeVerDinero()

  const catNombres = useMemo(() => categorias.map(c => c.nombre), [categorias])

  const [cart, setCart] = useState<CartItem[]>([])
  const [method, setMethod] = useState('Efectivo')
  const [tipo, setTipo] = useState<'local' | 'despacho'>('local')
  const [cliente, setCliente] = useState<ClienteForm>(emptyCliente)
  const [confirmed, setConfirmed] = useState<VentaConfirmada | null>(null)
  const [mixedPay, setMixedPay] = useState<{ secondary: string; amount: string } | null>(null)
  const [discount, setDiscount] = useState<{ type: 'pct' | 'fixed'; value: string }>({ type: 'pct', value: '' })
  const [mStep, setMStep] = useState<'catalogo' | 'carrito' | 'pago'>('catalogo')
  const [mCat, setMCat] = useState('Todas')
  const [mQuery, setMQuery] = useState('')
  const [showDiscount, setShowDiscount] = useState(false)
  const [showCliente, setShowCliente] = useState(false)
  const draftKey = 'cl_draft_cart_v2'
  const [hasDraft] = useState(() => typeof localStorage !== 'undefined' ? !!localStorage.getItem(draftKey) : false)

  const saveDraft = () => { localStorage.setItem(draftKey, JSON.stringify({ cart, method, tipo })); }
  const loadDraft = () => {
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) || 'null')
      if (d) { setCart((d.cart || []).map((i: CartItem) => ({ ...i }))); setMethod(d.method || 'Efectivo'); setTipo(d.tipo || 'local'); localStorage.removeItem(draftKey) }
    } catch { /* draft inválido */ }
  }

  // Unidades comprometidas en carrito para un producto (anti-sobreventa)
  const baseEnCarro = useCallback((id: string) =>
    cart.filter((i) => i.productId === id).reduce((a, i) => a + i.unidadesBase, 0),
    [cart])

  const add = useCallback((p: Producto) => {
    if (baseEnCarro(p.id) + 1 > p.stock) return
    const basePrecio = p.precio
    const despachoPrecio = precioDespachoDe(p.precio, p.precio_despacho)
    const precio = tipo === 'despacho' ? despachoPrecio : basePrecio
    setCart((c) => {
      const e = c.find((i) => i.productId === p.id)
      if (e) return c.map((i) => i.productId === p.id ? { ...i, qty: i.qty + 1, unidadesBase: i.unidadesBase + 1 } : i)
      return [...c, { productId: p.id, nombre: p.nombre, categoria: p.categoria, precio, costo: p.costo, qty: 1, unidadesBase: 1, originalPrecio: precio, basePrecio, despachoPrecio, unidad: p.unidad, fotoUrl: p.foto_url }]
    })
  }, [baseEnCarro, tipo])

  const applyTipo = (t: 'local' | 'despacho') => {
    setTipo(t)
    setCart((c) => c.map((i) => {
      const precio = t === 'despacho' ? i.despachoPrecio : i.basePrecio
      return { ...i, precio, originalPrecio: precio }
    }))
  }

  const setQtySimple = useCallback((id: string, d: number) => {
    if (d > 0) {
      const p = productos.find((x) => x.id === id)
      if (p && baseEnCarro(id) + d > p.stock) return
    }
    setCart((c) => c.map((i) => {
      if (i.productId !== id) return i
      const min = UNIT_IS_WEIGHT(i.unidad) ? 0.5 : 1
      const newQty = Math.max(min, Math.round((i.qty + d) * 1000) / 1000)
      return { ...i, qty: newQty, unidadesBase: newQty }
    }))
  }, [baseEnCarro, productos])

  const setQtyDirect = useCallback((id: string, v: number) => {
    const p = productos.find((x) => x.id === id)
    if (p && v > p.stock) return
    const clamped = Math.max(0.1, Math.round(v * 1000) / 1000)
    setCart((c) => c.map((i) => i.productId === id ? { ...i, qty: clamped, unidadesBase: clamped } : i))
  }, [productos])

  const setItemPrice = useCallback((id: string, newPrice: number) =>
    setCart((c) => c.map((i) => i.productId === id ? { ...i, precio: Math.max(0, newPrice) } : i)), [])

  const remove = useCallback((id: string) =>
    setCart((c) => c.filter((i) => i.productId !== id)), [])

  const subtotal = cart.reduce((a, i) => a + i.precio * i.qty, 0)
  const costTotal = cart.reduce((a, i) => a + i.costo * i.qty, 0)
  const discAmt = discount.value
    ? (discount.type === 'pct' ? (subtotal * Math.min(100, +discount.value)) / 100 : Math.min(subtotal, +discount.value))
    : 0
  const finalTotal = subtotal - discAmt
  const finalProfit = finalTotal - costTotal
  const finalMargin = finalTotal ? (finalProfit / finalTotal) * 100 : 0
  const marginWarn = cart.length > 0 && finalTotal > 0 && finalMargin < (config.margen_minimo || 25)

  const despachoListo = cliente.nombre.trim().length > 0 && cliente.numero.trim().length > 0 && cliente.direccion.trim().length > 0 && cliente.ciudad.trim().length > 0
  const canConfirm = cart.length > 0 && !submitting && (tipo === 'local' ? true : despachoListo) && (method !== 'Crédito' || cliente.nombre.trim().length > 0)

  const confirm = async () => {
    if (!canConfirm) return
    const clienteRef: ClienteRef = { id: cliente.clienteId, nombre: cliente.nombre, ciudad: cliente.ciudad, telefono: cliente.numero, numero: cliente.numero, correo: cliente.correo, direccion: cliente.direccion, depto: cliente.depto }
    try {
      const venta = await registrarVenta(cart, method, {
        tipo,
        cliente: cliente.nombre.trim() ? clienteRef : null,
        clienteId: cliente.clienteId || null,
        descuento: discAmt > 0 ? { type: discount.type, value: +discount.value, amount: Math.round(discAmt) } : null,
        pagoMixto: mixedPay && +mixedPay.amount > 0 && method !== 'Crédito' ? { metodo: mixedPay.secondary, monto: +mixedPay.amount } : null,
      })
      // Actualizar stock local en useProductos para reflejo inmediato
      for (const item of cart) {
        const p = productos.find(x => x.id === item.productId)
        if (p) await actualizarProducto(p.id, { stock: Math.max(0, p.stock - item.unidadesBase) })
      }
      setConfirmed(venta)
      setCart([])
      setCliente(emptyCliente)
      setDiscount({ type: 'pct', value: '' })
      setMixedPay(null)
      setMStep('catalogo')
      setShowCliente(false)
      setShowDiscount(false)
    } catch (e) {
      window.alert('Error al registrar la venta: ' + (e instanceof Error ? e.message : 'error'))
    }
  }

  const metodosDisponibles = [...(config.metodos_pago || ['Efectivo', 'Transferencia', 'Tarjeta']), 'Crédito']

  const stickyStyle: CSSProperties = { position: 'sticky', top: 84 }

  // ── Flujo móvil ──
  if (isMobile) {
    const listMobile = productos
      .filter((p) => (mCat === 'Todas' || p.categoria === mCat) && p.nombre.toLowerCase().includes(mQuery.toLowerCase()))
      .sort((a, b) => (a.orden ?? 1e9) - (b.orden ?? 1e9) || a.nombre.localeCompare(b.nombre))
    const qtyOf = (id: string) => cart.filter((i) => i.productId === id).reduce((a, i) => a + i.qty, 0)
    const totalItems = cart.reduce((a, i) => a + i.qty, 0)

    return (
      <div className="fade-in" style={{ paddingBottom: 88 }}>
        {/* Catálogo */}
        {mStep === 'catalogo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SearchBox value={mQuery} onChange={setMQuery} placeholder="Buscar producto…" width="100%" />
            <div style={{ display: 'flex', gap: 2, overflowX: 'auto', borderBottom: '1px solid var(--line)', margin: '0 -2px' }}>
              {['Todas', ...catNombres].map((c) => (
                <button key={c} onClick={() => setMCat(c)} style={{ padding: '10px 13px', whiteSpace: 'nowrap', background: 'none', border: 'none', borderBottom: '2px solid ' + (mCat === c ? 'var(--primary)' : 'transparent'), color: mCat === c ? 'var(--primary-700)' : 'var(--ink-3)', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.02em', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {c !== 'Todas' && <CatDot cat={c} size={10} />}{c}
                </button>
              ))}
            </div>
            {listMobile.length === 0 ? (
              <EmptyState icon="box" title="Sin productos" text={mQuery ? 'No hay coincidencias.' : 'Sin productos en esta categoría.'} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(104px,1fr))', gap: 9 }}>
                {listMobile.map((p) => {
                  const st = stockState(p)
                  const q = qtyOf(p.id)
                  return (
                    <button key={p.id} disabled={st === 'sin'} onClick={() => { if (st !== 'sin') add(p) }} className="card" style={{ position: 'relative', padding: 0, overflow: 'hidden', textAlign: 'left', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', opacity: st === 'sin' ? 0.5 : 1, cursor: st === 'sin' ? 'not-allowed' : 'pointer' }}>
                      {q > 0 && <span style={{ position: 'absolute', top: 6, right: 6, minWidth: 24, height: 24, padding: '0 6px', borderRadius: 7, background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 13, display: 'grid', placeItems: 'center', zIndex: 2 }}>{q}</span>}
                      <div style={{ width: '100%', aspectRatio: '1 / 1', flexShrink: 0, background: p.foto_url ? undefined : `${catColor(p.categoria)}18` }}>
                        {p.foto_url ? <img src={p.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}><CatDot cat={p.categoria} size={18} /></div>}
                      </div>
                      <div style={{ background: '#3a4150', color: '#fff', padding: '7px 9px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.nombre}</div>
                        <div className="tnum" style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>{fmtCLP(tipo === 'despacho' ? precioDespachoDe(p.precio, p.precio_despacho) : p.precio)}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Carrito */}
        {mStep === 'carrito' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0 14px' }}>
              <button className="btn btn-ghost btn-icon" onClick={() => setMStep('catalogo')}><Icon name="chevL" size={18} /></button>
              <div style={{ fontWeight: 800, fontSize: 19 }}>Carrito</div>
              <span className="chip chip-neutral" style={{ marginLeft: 'auto' }}>{totalItems} art.</span>
              {cart.length > 0 && <button className="btn btn-ghost btn-icon" onClick={() => setCart([])} title="Vaciar"><Icon name="trash" size={16} /></button>}
            </div>
            {cart.length === 0 ? (
              <EmptyState icon="ventas" title="Carrito vacío" text="Vuelve al catálogo y elige productos." />
            ) : (
              <div className="card">
                {cart.map((i) => <CartItemRow key={i.productId} i={i} setQtySimple={setQtySimple} setQtyDirect={setQtyDirect} remove={remove} setItemPrice={setItemPrice} verDinero={verDinero} />)}
                <div style={{ padding: '14px 18px' }}>
                  {!showDiscount && discAmt === 0 ? (
                    <button className="btn btn-ghost" style={{ color: 'var(--primary-700)', fontWeight: 700, padding: 0 }} onClick={() => setShowDiscount(true)}><Icon name="tag" size={14} />Dar descuento</button>
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
                      <button className="btn btn-ghost btn-icon" style={{ width: 36, height: 36, flexShrink: 0 }} onClick={() => { setDiscount({ type: 'pct', value: '' }); setShowDiscount(false) }}><Icon name="x" size={14} /></button>
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

        {/* Pago */}
        {mStep === 'pago' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0 6px' }}>
              <button className="btn btn-ghost btn-icon" onClick={() => setMStep('carrito')}><Icon name="chevL" size={18} /></button>
              <div style={{ fontWeight: 800, fontSize: 19 }}>Pago</div>
            </div>
            <div style={{ textAlign: 'center', padding: '26px 0 18px' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 700 }}>Total a cobrar</div>
              <div className="tnum" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1, marginTop: 4 }}>{fmtCLP(finalTotal)}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {([{ k: 'local', label: 'En local', icon: 'store' }, { k: 'despacho', label: 'Despacho', icon: 'truck' }] as const).map((t) => (
                <button key={t.k} onClick={() => { applyTipo(t.k); setCliente(emptyCliente); if (t.k === 'despacho') setShowCliente(true) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 8px', border: '2px solid ' + (tipo === t.k ? 'var(--primary)' : 'var(--line)'), borderRadius: 12, background: tipo === t.k ? 'var(--primary-tint)' : 'var(--surface)', color: tipo === t.k ? 'var(--primary-700)' : 'var(--ink-2)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Icon name={t.icon} size={17} />{t.label}
                </button>
              ))}
            </div>
            {!showCliente && tipo === 'local' ? (
              <button className="btn btn-soft" style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }} onClick={() => setShowCliente(true)}><Icon name="clientes" size={16} />Incluir un cliente</button>
            ) : (
              <div style={{ marginBottom: 6 }}>
                <ClienteSelector tipo={tipo} cliente={cliente} setCliente={setCliente} clientes={clientes} />
              </div>
            )}
            <div style={{ margin: '14px 0 8px', fontSize: 13.5, fontWeight: 800, color: 'var(--ink-2)' }}>Método de pago</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {metodosDisponibles.map((mm) => {
                const isCredito = mm === 'Crédito'; const active = method === mm
                return <button key={mm} onClick={() => setMethod(mm)} className="btn" style={{ padding: '12px 4px', fontSize: 12, flexDirection: 'column', gap: 5, height: 66, border: '1px solid ' + (active ? (isCredito ? 'var(--warn)' : 'var(--primary)') : 'var(--line-2)'), background: active ? (isCredito ? 'var(--warn-tint)' : 'var(--primary-tint)') : 'var(--surface)', color: active ? (isCredito ? 'oklch(0.50 0.10 70)' : 'var(--primary-700)') : 'var(--ink-2)' }}><Icon name={mm === 'Efectivo' ? 'cash' : mm === 'Tarjeta' ? 'card' : isCredito ? 'receipt' : 'arrowUp'} size={18} />{mm}</button>
              })}
            </div>
          </div>
        )}

        {/* Barra inferior fija */}
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 46, padding: '10px 14px calc(10px + env(safe-area-inset-bottom))', background: 'var(--surface)', borderTop: '1px solid var(--line)', display: 'flex', gap: 10 }}>
          {mStep === 'catalogo' && (cart.length === 0
            ? <div style={{ flex: 1, textAlign: 'center', padding: '14px', border: '1px solid var(--primary)', borderRadius: 12, color: 'var(--primary-700)', fontWeight: 800, fontSize: 15 }}>Ningún ítem</div>
            : <button className="btn btn-lg" style={{ flex: 1, background: 'var(--primary)', color: '#fff', justifyContent: 'space-between' }} onClick={() => setMStep('carrito')}><span style={{ fontWeight: 800 }}>{totalItems} ítems · {fmtCLP(finalTotal)}</span><Icon name="chevR" size={18} /></button>
          )}
          {mStep === 'carrito' && <button className="btn btn-lg" style={{ flex: 1, background: 'var(--primary)', color: '#fff', justifyContent: 'space-between' }} disabled={cart.length === 0} onClick={() => setMStep('pago')}><span style={{ fontWeight: 800 }}>Continuar · {fmtCLP(finalTotal)}</span><Icon name="chevR" size={18} /></button>}
          {mStep === 'pago' && <button className="btn btn-lg" style={{ flex: 1, background: method === 'Crédito' ? 'var(--warn)' : 'var(--primary)', color: '#fff', justifyContent: 'center' }} disabled={!canConfirm} onClick={confirm}><Icon name={method === 'Crédito' ? 'receipt' : tipo === 'despacho' ? 'truck' : 'check'} size={18} />{submitting ? 'Registrando…' : method === 'Crédito' ? 'Registrar a crédito' : 'Confirmar'} · {fmtCLP(finalTotal)}</button>}
        </div>

        {confirmed && <ComprobanteModal sale={confirmed} negocioNombre={config.nombre_negocio} onClose={() => setConfirmed(null)} />}
      </div>
    )
  }

  // ── Layout desktop ──
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
            {loadingProd
              ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontWeight: 600 }}>Cargando productos…</div>
              : <ProductPicker tipo={tipo} productos={productos} categorias={catNombres} onPick={add} />}
          </div>
        </div>

        {/* Carrito */}
        <div className="card" style={stickyStyle}>
          {/* Tipo de venta */}
          <div style={{ padding: '14px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([{ k: 'local', label: 'Venta en local', icon: 'store' }, { k: 'despacho', label: 'Despacho', icon: 'truck' }] as const).map((t) => (
              <button key={t.k} onClick={() => { applyTipo(t.k); setCliente(emptyCliente) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 8px', border: '2px solid ' + (tipo === t.k ? 'var(--primary)' : 'var(--line)'), borderRadius: 11, background: tipo === t.k ? 'var(--primary-tint)' : 'var(--surface)', color: tipo === t.k ? 'var(--primary-700)' : 'var(--ink-2)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', transition: '.14s', fontFamily: 'inherit' }}>
                <Icon name={t.icon} size={16} />{t.label}
              </button>
            ))}
          </div>
          {tipo === 'despacho' && <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px 0', fontSize: 12, color: 'var(--info)', fontWeight: 700 }}><Icon name="truck" size={13} />Precios de despacho aplicados</div>}

          {/* Cabecera carrito */}
          <div className="card-head" style={{ border: 'none', paddingTop: 10, paddingBottom: 10 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--primary-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center' }}><Icon name="ventas" size={17} /></span>
            <div style={{ flex: 1 }}>
              <div className="card-title">Carrito</div>
              <div className="card-sub">{cart.reduce((a, i) => a + i.qty, 0)} artículos</div>
            </div>
            {cart.length > 0 && <button className="btn btn-ghost btn-icon" onClick={() => setCart([])} title="Vaciar"><Icon name="trash" size={16} /></button>}
          </div>

          {/* Items */}
          <div style={{ maxHeight: 240, overflowY: 'auto', borderTop: '1px solid var(--line)' }}>
            {cart.length === 0
              ? <EmptyState icon="ventas" title="Carrito vacío" text="Elige productos de la izquierda para empezar." />
              : cart.map((i) => <CartItemRow key={i.productId} i={i} setQtySimple={setQtySimple} setQtyDirect={setQtyDirect} remove={remove} setItemPrice={setItemPrice} verDinero={verDinero} />)}
          </div>

          {/* Totales + pago */}
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)', background: 'var(--surface-3)', maxHeight: 440, overflowY: 'auto' }}>
            <Row label="Subtotal" value={fmtCLP(subtotal)} />
            {discAmt > 0 && <Row label={`Descuento ${discount.type === 'pct' ? fmtPct(+discount.value) : fmtCLP(discAmt)}`} value={'−' + fmtCLP(discAmt)} muted />}
            {discAmt > 0 && <Row label="Total con descuento" value={fmtCLP(finalTotal)} strong />}
            {verDinero && <Row label="Costo total" value={fmtCLP(costTotal)} muted />}
            {verDinero && <Row label="Ganancia estimada" value={fmtCLP(finalProfit)} strong tone="primary" />}
            {verDinero && <Row label="Margen de la venta" value={fmtPct(finalMargin)} muted />}
            {verDinero && marginWarn && (
              <div style={{ padding: '8px 10px', background: 'var(--warn-tint)', borderRadius: 9, fontSize: 12, color: 'oklch(0.45 0.10 70)', fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                <Icon name="alert" size={12} />El descuento deja el margen bajo el {config.margen_minimo || 25}%
              </div>
            )}

            {/* Descuento */}
            <div style={{ margin: '10px 0 2px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="tag" size={12} />Descuento <span style={{ fontWeight: 500 }}>(opcional)</span></div>
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
                {!!discount.value && <button className="btn btn-ghost btn-icon" style={{ width: 32, height: 32, flexShrink: 0 }} onClick={() => setDiscount({ type: 'pct', value: '' })}><Icon name="x" size={13} /></button>}
              </div>
            </div>

            {/* Cliente */}
            <ClienteSelector tipo={tipo} cliente={cliente} setCliente={setCliente} clientes={clientes} />

            <div style={{ margin: '14px 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Método de pago</span>
              <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => setMixedPay((v) => (v ? null : { secondary: 'Tarjeta', amount: '' }))}>
                <Icon name="plus" size={12} />{mixedPay ? 'Pago simple' : 'Dividir pago'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7 }}>
              {metodosDisponibles.map((mm) => {
                const isCredito = mm === 'Crédito'; const active = method === mm
                return <button key={mm} onClick={() => setMethod(mm)} className="btn" style={{ padding: '9px 6px', fontSize: 12, flexDirection: 'column', gap: 3, height: 50, border: '1px solid ' + (active ? (isCredito ? 'var(--warn)' : 'var(--primary)') : 'var(--line-2)'), background: active ? (isCredito ? 'var(--warn-tint)' : 'var(--primary-tint)') : 'var(--surface)', color: active ? (isCredito ? 'oklch(0.50 0.10 70)' : 'var(--primary-700)') : 'var(--ink-2)' }}><Icon name={mm === 'Efectivo' ? 'cash' : mm === 'Tarjeta' ? 'card' : isCredito ? 'receipt' : 'arrowUp'} size={16} />{mm}</button>
              })}
            </div>
            {method === 'Crédito' && (
              <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--warn-tint)', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Icon name="alert" size={14} style={{ color: 'oklch(0.50 0.10 70)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'oklch(0.45 0.10 70)', lineHeight: 1.4 }}>La venta quedará pendiente de pago. El cliente aparecerá en la sección <strong>Deudas</strong>. Debes ingresar su nombre.</div>
              </div>
            )}
            {tipo === 'despacho' && !despachoListo && cart.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}><Icon name="alert" size={13} />Para despacho ingresa nombre, teléfono, dirección y comuna del destinatario</div>
            )}
            {method === 'Crédito' && !cliente.nombre.trim() && cart.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}><Icon name="alert" size={13} />Para vender a crédito debes ingresar el nombre del cliente</div>
            )}

            {mixedPay && (
              <div style={{ padding: '11px 13px', background: 'var(--surface-3)', borderRadius: 11, margin: '0 0 8px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8 }}>Segundo método</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select className="select" style={{ flex: 1, fontSize: 13 }} value={mixedPay.secondary} onChange={(e) => setMixedPay((v) => (v ? { ...v, secondary: e.target.value } : v))}>
                    {config.metodos_pago.filter((mt) => mt !== method).map((mt) => <option key={mt}>{mt}</option>)}
                  </select>
                  <div className="input-pre" style={{ flex: 1 }}>
                    <span className="pre" style={{ padding: '0 2px 0 10px', fontSize: 13 }}>$</span>
                    <input className="tnum" inputMode="numeric" value={mixedPay.amount} placeholder="0" style={{ padding: '9px 8px', fontSize: 13 }} onChange={(e) => setMixedPay((v) => (v ? { ...v, amount: e.target.value.replace(/[^0-9]/g, '') } : v))} />
                  </div>
                </div>
                {+mixedPay.amount > 0 && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 5 }}>{method}: {fmtCLP(finalTotal - +mixedPay.amount)} · {mixedPay.secondary}: {fmtCLP(+mixedPay.amount)}</div>}
              </div>
            )}

            <button className="btn btn-lg" style={{ width: '100%', marginTop: 12, background: method === 'Crédito' ? 'var(--warn)' : 'var(--primary)', color: '#fff' }} disabled={!canConfirm} onClick={confirm}>
              <Icon name={method === 'Crédito' ? 'receipt' : tipo === 'despacho' ? 'truck' : 'check'} size={18} />
              {submitting ? 'Registrando…' : method === 'Crédito' ? 'Registrar a crédito' : tipo === 'despacho' ? 'Confirmar despacho' : 'Confirmar venta'} · {fmtCLP(finalTotal)}
            </button>
            <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 9, fontWeight: 600 }}>
              <Icon name="zap" size={12} style={{ verticalAlign: '-2px' }} /> Se descuenta del stock automáticamente
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {cart.length > 0 && <button className="btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }} onClick={saveDraft}><Icon name="download" size={13} />Guardar borrador</button>}
              {hasDraft && <button className="btn btn-soft" style={{ flex: 1, fontSize: 12.5 }} onClick={loadDraft}><Icon name="history" size={13} />Cargar borrador</button>}
            </div>
          </div>
        </div>
      </div>

      {confirmed && <ComprobanteModal sale={confirmed} negocioNombre={config.nombre_negocio} onClose={() => setConfirmed(null)} />}
    </div>
  )
}
