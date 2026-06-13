'use client'

// ---------- Inventario (portado de screen-inventario.jsx) ----------
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { stockState } from '@/lib/format'
import { Icon } from '@/components/icon'
import { PageHeader, Metric, SearchBox, CatDot, Field, Mini, EmptyState, Modal } from '@/components/ui'
import { StockChip } from '@/components/charts'
import { FormatBreakdown, StockEnCajas } from '@/components/formatos'
import type { Product } from '@/types'

function ReponerModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { reponer } = useStore()
  const sugerido = Math.max(product.min * 2 - product.stock, product.min)
  const [qty, setQty] = useState<number | string>(sugerido)
  return (
    <Modal
      title="Reponer stock"
      sub={product.name}
      onClose={onClose}
      width={420}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!qty} onClick={() => { reponer(product.id, +qty); onClose() }}>
            <Icon name="truck" size={16} />
            Confirmar reposición
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <Mini label="Stock actual" value={product.stock} tone={stockState(product)} />
        <Mini label="Stock mínimo" value={product.min} />
        <Mini label="Quedará en" value={product.stock + (+qty || 0)} tone="ok" />
      </div>
      <Field label="¿Cuántas unidades agregas?" hint={`Sugerencia: ${sugerido} unidades para volver a un nivel cómodo`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-icon" style={{ width: 46, height: 46 }} onClick={() => setQty((q) => Math.max(0, (+q || 0) - 1))}>
            <Icon name="minus" size={18} />
          </button>
          <input className="input tnum" style={{ textAlign: 'center', fontSize: 22, fontWeight: 800, height: 46 }} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))} />
          <button className="btn btn-ghost btn-icon" style={{ width: 46, height: 46 }} onClick={() => setQty((q) => (+q || 0) + 1)}>
            <Icon name="plus" size={18} />
          </button>
        </div>
      </Field>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {[product.min, sugerido, product.min * 3].map((n, i) => (
          <button key={i} className="btn btn-soft" style={{ flex: 1 }} onClick={() => setQty(n)}>
            +{n}
          </button>
        ))}
      </div>
    </Modal>
  )
}

function AjusteModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { ajustarStock } = useStore()
  const [val, setVal] = useState<number | string>(product.stock)
  const [note, setNote] = useState('')
  return (
    <Modal
      title="Ajustar stock"
      sub={product.name}
      onClose={onClose}
      width={420}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { ajustarStock(product.id, +val || 0, note); onClose() }}>
            <Icon name="check" size={16} />
            Guardar ajuste
          </button>
        </>
      }
    >
      <Field label="Stock real contado" hint="Úsalo cuando el conteo físico no coincide con el sistema">
        <input className="input tnum" style={{ fontSize: 18, fontWeight: 800 }} inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, ''))} autoFocus />
      </Field>
      <Field label="Motivo (opcional)">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: merma, producto vencido, conteo" />
      </Field>
    </Modal>
  )
}

export default function InventarioPage() {
  const { products, movements, categorias } = useStore()
  const [cat, setCat] = useState('Todas')
  const [q, setQ] = useState('')
  const [onlyCrit, setOnlyCrit] = useState(false)
  const [repo, setRepo] = useState<Product | null>(null)
  const [aj, setAj] = useState<Product | null>(null)
  const [tab, setTab] = useState<'stock' | 'hist'>('stock')
  // Categorías REALES del negocio (las del store + las que usan los productos).
  const cats = useMemo(() => ['Todas', ...new Set([...categorias, ...products.map((p) => p.cat)])], [categorias, products])

  const reponerList = products.filter((p) => stockState(p) !== 'ok').sort((a, b) => a.stock - a.min - (b.stock - b.min))
  const list = products.filter((p) => (cat === 'Todas' || p.cat === cat) && p.name.toLowerCase().includes(q.toLowerCase()) && (!onlyCrit || stockState(p) !== 'ok'))

  const counts = {
    ok: products.filter((p) => stockState(p) === 'ok').length,
    bajo: products.filter((p) => stockState(p) === 'bajo').length,
    sin: products.filter((p) => stockState(p) === 'sin').length,
  }

  return (
    <div className="fade-in">
      <PageHeader title="Inventario" sub="Controla tu stock y sabe qué reponer">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar producto…" />
      </PageHeader>

      {/* Resumen de stock */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', marginBottom: 18 }}>
        <Metric icon="check" label="Stock OK" value={counts.ok} tone="primary" sub="Productos con buen nivel" />
        <Metric icon="alert" label="Stock bajo" value={counts.bajo} tone="warn" sub="Conviene reponer pronto" />
        <Metric icon="x" label="Sin stock" value={counts.sin} tone="danger" sub="Necesitan reposición urgente" />
        <Metric icon="box" label="Total productos" value={products.length} tone="info" sub="En tu inventario" />
      </div>

      {/* Productos que debes reponer */}
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
                {reponerList.slice(0, 8).map((p) => {
                  const sug = Math.max(p.min * 2 - p.stock, p.min)
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CatDot cat={p.cat} />
                          {p.name}
                        </span>
                      </td>
                      <td className="num tnum" style={{ fontWeight: 800, color: p.stock === 0 ? 'var(--danger)' : 'oklch(0.50 0.10 70)' }}>{p.stock}</td>
                      <td className="num tnum muted">{p.min}</td>
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

      {/* Pestañas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="seg">
          <button className={tab === 'stock' ? 'on' : ''} onClick={() => setTab('stock')}>Todo el stock</button>
          <button className={tab === 'hist' ? 'on' : ''} onClick={() => setTab('hist')}>Movimientos</button>
        </div>
        {tab === 'stock' && (
          <>
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto' }}>
              {cats.map((c) => (
                <button key={c} onClick={() => setCat(c)} className="chip" style={{ border: '1px solid var(--line)', whiteSpace: 'nowrap', cursor: 'pointer', background: cat === c ? 'var(--primary)' : 'var(--surface)', color: cat === c ? '#fff' : 'var(--ink-2)', padding: '6px 13px', fontSize: 13 }}>
                  {c}
                </button>
              ))}
            </div>
            <button onClick={() => setOnlyCrit((v) => !v)} className="chip" style={{ marginLeft: 'auto', cursor: 'pointer', border: '1px solid ' + (onlyCrit ? 'var(--danger)' : 'var(--line-2)'), background: onlyCrit ? 'var(--danger-tint)' : 'var(--surface)', color: onlyCrit ? 'var(--danger)' : 'var(--ink-2)', padding: '7px 13px' }}>
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
                  <th className="num">Inicial</th>
                  <th className="num">Vendido</th>
                  <th className="num">Stock actual</th>
                  <th className="num">Mínimo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const st = stockState(p)
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, maxWidth: 220 }}>{p.name}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--ink-2)', fontWeight: 600 }}>
                          <CatDot cat={p.cat} />
                          {p.cat}
                        </span>
                      </td>
                      <td className="num tnum muted">{p.stock + p.sold}</td>
                      <td className="num tnum muted">{p.sold}</td>
                      <td className="num tnum" style={{ fontWeight: 800, color: st === 'sin' ? 'var(--danger)' : st === 'bajo' ? 'oklch(0.50 0.10 70)' : 'var(--ink)' }}>{p.stock}<StockEnCajas product={p} /></td>
                      <td className="num tnum muted">{p.min}</td>
                      <td><StockChip state={st} /></td>
                      <td className="num">
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost" style={{ padding: '6px 11px', fontSize: 13 }} onClick={() => setAj(p)}>Ajustar</button>
                          <button className="btn btn-soft" style={{ padding: '6px 11px', fontSize: 13 }} onClick={() => setRepo(p)}>
                            <Icon name="plus" size={14} />
                            Reponer
                          </button>
                        </div>
                        <FormatBreakdown product={p} />
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
            {movements.map((mv) => {
              const tone = mv.type === 'Reposición' ? 'primary' : mv.type === 'Venta' ? 'info' : 'warn'
              const bg = ({ primary: 'var(--primary-tint)', info: 'var(--info-tint)', warn: 'var(--warn-tint)' } as Record<string, string>)[tone]
              const fg = ({ primary: 'var(--primary-700)', info: 'var(--info)', warn: 'oklch(0.50 0.10 70)' } as Record<string, string>)[tone]
              return (
                <div key={mv.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 22px', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: bg, color: fg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon name={mv.type === 'Reposición' ? 'truck' : mv.type === 'Venta' ? 'ventas' : 'edit'} size={16} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{mv.product}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{mv.type} · {mv.note}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="tnum" style={{ fontWeight: 800, color: mv.qty > 0 ? 'var(--primary-700)' : 'var(--ink-2)' }}>{mv.qty > 0 ? '+' : ''}{mv.qty} u.</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>{mv.date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} · {mv.date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {repo && <ReponerModal product={repo} onClose={() => setRepo(null)} />}
      {aj && <AjusteModal product={aj} onClose={() => setAj(null)} />}
    </div>
  )
}
