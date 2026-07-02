'use client'

import { useState, useMemo } from 'react'
import { useProductos } from '@/hooks/useProductos'
import { useMovimientos } from '@/hooks/useMovimientos'
import { useCategorias } from '@/hooks/useCategorias'
import { stockState } from '@/lib/format'
import { Icon } from '@/components/icon'
import { PageHeader, Metric, SearchBox, CatDot, Field, Mini, EmptyState, Modal } from '@/components/ui'
import { StockChip } from '@/components/charts'
import type { Producto } from '@/hooks/useProductos'
import type { MovimientoStock } from '@/hooks/useMovimientos'

/* ---------- helpers movimientos ---------- */

const TIPO_LABEL: Record<MovimientoStock['tipo'], string> = {
  entrada:    'Reposición',
  salida:     'Salida',
  ajuste:     'Ajuste',
  venta:      'Venta',
  devolucion: 'Devolución',
}
const TIPO_ICON: Record<MovimientoStock['tipo'], string> = {
  entrada:    'truck',
  salida:     'minus',
  ajuste:     'edit',
  venta:      'ventas',
  devolucion: 'history',
}
const TIPO_BG: Record<MovimientoStock['tipo'], string> = {
  entrada:    'var(--primary-tint)',
  venta:      'var(--info-tint)',
  ajuste:     'var(--warn-tint)',
  devolucion: 'var(--primary-tint)',
  salida:     'var(--warn-tint)',
}
const TIPO_FG: Record<MovimientoStock['tipo'], string> = {
  entrada:    'var(--primary-700)',
  venta:      'var(--info)',
  ajuste:     'oklch(0.50 0.10 70)',
  devolucion: 'var(--primary-700)',
  salida:     'oklch(0.50 0.10 70)',
}

function displayQty(mv: MovimientoStock): number {
  if (mv.tipo === 'entrada' || mv.tipo === 'devolucion') return mv.qty
  if (mv.tipo === 'venta' || mv.tipo === 'salida') return -mv.qty
  return mv.qty // ajuste: qty ya es signed (diff)
}

/* ---------- Modales ---------- */

function ReponerModal({
  product,
  onClose,
  reponer,
  recargar,
}: {
  product: Producto
  onClose: () => void
  reponer: (id: string, qty: number, nota?: string) => Promise<void>
  recargar: () => void
}) {
  const sugerido = Math.max(product.stock_minimo * 2 - product.stock, product.stock_minimo)
  const [qty, setQty] = useState<number | string>(sugerido)
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)

  const confirmar = async () => {
    if (!qty) return
    setSaving(true)
    try {
      await reponer(product.id, +qty, nota || undefined)
      recargar()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Reponer stock"
      sub={product.nombre}
      onClose={onClose}
      width={420}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!qty || saving} onClick={confirmar}>
            <Icon name="truck" size={16} />
            Confirmar reposición
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <Mini label="Stock actual" value={product.stock} tone={stockState(product)} />
        <Mini label="Stock mínimo" value={product.stock_minimo} />
        <Mini label="Quedará en" value={product.stock + (+qty || 0)} tone="ok" />
      </div>
      <Field label="¿Cuántas unidades agregas?" hint={`Sugerencia: ${sugerido} unidades para volver a un nivel cómodo`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-icon" style={{ width: 46, height: 46 }} onClick={() => setQty(q => Math.max(0, (+q || 0) - 1))}>
            <Icon name="minus" size={18} />
          </button>
          <input
            className="input tnum"
            style={{ textAlign: 'center', fontSize: 22, fontWeight: 800, height: 46 }}
            inputMode="numeric"
            value={qty}
            onChange={e => setQty(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <button className="btn btn-ghost btn-icon" style={{ width: 46, height: 46 }} onClick={() => setQty(q => (+q || 0) + 1)}>
            <Icon name="plus" size={18} />
          </button>
        </div>
      </Field>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {[product.stock_minimo, sugerido, product.stock_minimo * 3].map((n, i) => (
          <button key={i} className="btn btn-soft" style={{ flex: 1 }} onClick={() => setQty(n)}>
            +{n}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <Field label="Nota (opcional)">
          <input className="input" value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej: compra proveedor, reposición semanal" />
        </Field>
      </div>
    </Modal>
  )
}

function AjusteModal({
  product,
  onClose,
  ajustar,
  recargar,
}: {
  product: Producto
  onClose: () => void
  ajustar: (id: string, nuevoStock: number, nota?: string) => Promise<void>
  recargar: () => void
}) {
  const [val, setVal] = useState<number | string>(product.stock)
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)

  const confirmar = async () => {
    setSaving(true)
    try {
      await ajustar(product.id, +val || 0, nota || undefined)
      recargar()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Ajustar stock"
      sub={product.nombre}
      onClose={onClose}
      width={420}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving} onClick={confirmar}>
            <Icon name="check" size={16} />
            Guardar ajuste
          </button>
        </>
      }
    >
      <Field label="Stock real contado" hint="Úsalo cuando el conteo físico no coincide con el sistema">
        <input
          className="input tnum"
          style={{ fontSize: 18, fontWeight: 800 }}
          inputMode="numeric"
          value={val}
          onChange={e => setVal(e.target.value.replace(/[^0-9]/g, ''))}
          autoFocus
        />
      </Field>
      <Field label="Motivo (opcional)">
        <input className="input" value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej: merma, producto vencido, conteo" />
      </Field>
    </Modal>
  )
}

/* ---------- Página principal ---------- */

export default function InventarioPage() {
  const { productos, reponer, ajustar } = useProductos()
  const { movimientos, recargar } = useMovimientos()
  const { categorias } = useCategorias()

  const [cat, setCat] = useState('Todas')
  const [q, setQ] = useState('')
  const [onlyCrit, setOnlyCrit] = useState(false)
  const [repo, setRepo] = useState<Producto | null>(null)
  const [aj, setAj] = useState<Producto | null>(null)
  const [tab, setTab] = useState<'stock' | 'hist'>('stock')

  const cats = useMemo(
    () => ['Todas', ...new Set([...categorias.map(c => c.nombre), ...productos.map(p => p.categoria)])],
    [categorias, productos],
  )

  const reponerList = productos
    .filter(p => stockState(p) !== 'ok')
    .sort((a, b) => (a.stock - a.stock_minimo) - (b.stock - b.stock_minimo))

  const list = productos.filter(
    p =>
      (cat === 'Todas' || p.categoria === cat) &&
      p.nombre.toLowerCase().includes(q.toLowerCase()) &&
      (!onlyCrit || stockState(p) !== 'ok'),
  )

  const counts = {
    ok:   productos.filter(p => stockState(p) === 'ok').length,
    bajo: productos.filter(p => stockState(p) === 'bajo').length,
    sin:  productos.filter(p => stockState(p) === 'sin').length,
  }

  return (
    <div className="fade-in">
      <PageHeader title="Inventario" sub="Controla tu stock y sabe qué reponer">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar producto…" />
      </PageHeader>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', marginBottom: 18 }}>
        <Metric icon="check" label="Stock OK"        value={counts.ok}         tone="primary" sub="Productos con buen nivel" />
        <Metric icon="alert" label="Stock bajo"       value={counts.bajo}        tone="warn"    sub="Conviene reponer pronto" />
        <Metric icon="x"     label="Sin stock"        value={counts.sin}         tone="danger"  sub="Necesitan reposición urgente" />
        <Metric icon="box"   label="Total productos"  value={productos.length}   tone="info"    sub="En tu inventario" />
      </div>

      {reponerList.length > 0 && (
        <div className="card" style={{ marginBottom: 18, border: '1px solid var(--line-2)', overflow: 'hidden' }}>
          <div className="card-head" style={{ background: 'var(--terra-tint)', borderBottom: '1px solid var(--line)' }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--terra)', color: '#fff', display: 'grid', placeItems: 'center' }}>
              <Icon name="truck" size={18} />
            </span>
            <div style={{ flex: 1 }}>
              <div className="card-title">Productos que debes reponer</div>
              <div className="card-sub">Ordenados por urgencia · {reponerList.length} productos</div>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="num">Stock actual</th>
                  <th className="num">Stock mínimo</th>
                  <th className="num">Sugerencia</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reponerList.slice(0, 8).map(p => {
                  const sug = Math.max(p.stock_minimo * 2 - p.stock, p.stock_minimo)
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CatDot cat={p.categoria} />
                          {p.nombre}
                        </span>
                      </td>
                      <td className="num tnum" style={{ fontWeight: 800, color: p.stock === 0 ? 'var(--danger)' : 'oklch(0.50 0.10 70)' }}>{p.stock}</td>
                      <td className="num tnum muted">{p.stock_minimo}</td>
                      <td className="num tnum" style={{ fontWeight: 700 }}>+{sug} u.</td>
                      <td><StockChip state={stockState(p)} /></td>
                      <td className="num">
                        <button className="btn btn-terra" style={{ padding: '7px 13px' }} onClick={() => setRepo(p)}>
                          <Icon name="plus" size={15} />
                          Reponer
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="seg">
          <button className={tab === 'stock' ? 'on' : ''} onClick={() => setTab('stock')}>Todo el stock</button>
          <button className={tab === 'hist'  ? 'on' : ''} onClick={() => setTab('hist')}>Movimientos</button>
        </div>
        {tab === 'stock' && (
          <>
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto' }}>
              {cats.map(c => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className="chip"
                  style={{
                    border: '1px solid var(--line)', whiteSpace: 'nowrap', cursor: 'pointer',
                    background: cat === c ? 'var(--primary)' : 'var(--surface)',
                    color: cat === c ? '#fff' : 'var(--ink-2)',
                    padding: '6px 13px', fontSize: 13,
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            <button
              onClick={() => setOnlyCrit(v => !v)}
              className="chip"
              style={{
                marginLeft: 'auto', cursor: 'pointer',
                border: '1px solid ' + (onlyCrit ? 'var(--danger)' : 'var(--line-2)'),
                background: onlyCrit ? 'var(--danger-tint)' : 'var(--surface)',
                color: onlyCrit ? 'var(--danger)' : 'var(--ink-2)',
                padding: '7px 13px',
              }}
            >
              <Icon name="filter" size={13} />
              Solo críticos
            </button>
          </>
        )}
      </div>

      {tab === 'stock' ? (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className="num">Stock actual</th>
                  <th className="num">Mínimo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map(p => {
                  const st = stockState(p)
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, maxWidth: 220 }}>{p.nombre}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--ink-2)', fontWeight: 600 }}>
                          <CatDot cat={p.categoria} />
                          {p.categoria}
                        </span>
                      </td>
                      <td className="num tnum" style={{ fontWeight: 800, color: st === 'sin' ? 'var(--danger)' : st === 'bajo' ? 'oklch(0.50 0.10 70)' : 'var(--ink)' }}>
                        {p.stock}
                      </td>
                      <td className="num tnum muted">{p.stock_minimo}</td>
                      <td><StockChip state={st} /></td>
                      <td className="num">
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost" style={{ padding: '6px 11px', fontSize: 13 }} onClick={() => setAj(p)}>Ajustar</button>
                          <button className="btn btn-soft"  style={{ padding: '6px 11px', fontSize: 13 }} onClick={() => setRepo(p)}>
                            <Icon name="plus" size={14} />
                            Reponer
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {list.length === 0 && <EmptyState icon="search" title="Sin resultados" text="Prueba con otra categoría o búsqueda." />}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-head">
            <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-3)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)' }}>
              <Icon name="history" size={16} />
            </span>
            <div style={{ flex: 1 }}>
              <div className="card-title">Historial de movimientos</div>
              <div className="card-sub">Ventas, reposiciones y ajustes recientes</div>
            </div>
          </div>
          <div>
            {movimientos.length === 0 && (
              <EmptyState icon="box" title="Sin movimientos" text="Los movimientos aparecerán aquí al reponer, vender o ajustar stock." />
            )}
            {movimientos.map(mv => {
              const dQty = displayQty(mv)
              const bg   = TIPO_BG[mv.tipo]
              const fg   = TIPO_FG[mv.tipo]
              const fecha = new Date(mv.fecha)
              return (
                <div key={mv.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 22px', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: bg, color: fg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon name={TIPO_ICON[mv.tipo]} size={16} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{mv.producto_nombre}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>
                      {TIPO_LABEL[mv.tipo]}{mv.nota ? ` · ${mv.nota}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="tnum" style={{ fontWeight: 800, color: dQty >= 0 ? 'var(--primary-700)' : 'var(--ink-2)' }}>
                      {dQty > 0 ? '+' : ''}{dQty} u.
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>
                      {fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} · {fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {repo && (
        <ReponerModal product={repo} onClose={() => setRepo(null)} reponer={reponer} recargar={recargar} />
      )}
      {aj && (
        <AjusteModal product={aj} onClose={() => setAj(null)} ajustar={ajustar} recargar={recargar} />
      )}
    </div>
  )
}
