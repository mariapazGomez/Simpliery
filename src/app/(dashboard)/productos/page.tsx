'use client'

// ---------- Productos (portado de screen-productos.jsx) ----------
import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { useStore } from '@/lib/store'
import { useFormats } from '@/lib/formats-store'
import { fmtCLP, fmtNum, fmtPct, precioDespachoDe } from '@/lib/format'
import { Icon } from '@/components/icon'
import { PageHeader, SearchBox, CatDot, MarginBadge, EmptyState, Field, MoneyInput, Modal } from '@/components/ui'
import { FormatManagerModal } from '@/components/formatos'
import { PRODUCT_UNITS } from '@/types'
import type { Product } from '@/types'

type ProductWithExtras = Product & { photo?: string; kgPerUnit?: number; hasFormats?: boolean }

interface PendingVariant {
  id: string
  name: string
  qty: number
  price: number
}

interface FormState {
  name: string
  cat: string
  unit: string
  cost: number | ''
  price: number | ''
  stock: string
  min: string
  photo?: string
  /** Precio fijo de despacho para ESTE producto. Vacío = mismo precio que en local. */
  precioDespacho: number | ''
}

const UNIT_OPTIONS: readonly string[] = PRODUCT_UNITS
const UNIT_IS_WEIGHT = (u: string) => ['kg', 'gramo', 'litro', 'mililitro'].includes(u)
const UNIT_STEP = (u: string) => (UNIT_IS_WEIGHT(u) ? '0.001' : '1')
const UNIT_LABEL = (u: string) => (({ kg: 'kg', gramo: 'gramos', litro: 'litros', mililitro: 'ml', Unidad: 'unidades', caja: 'cajas', paquete: 'paquetes' } as Record<string, string>)[u] || u)
const UNIT_ABBREV = (u: string) => (({ kg: 'kg', gramo: 'g', litro: 'L', mililitro: 'ml', Unidad: 'u.', caja: 'cajas', paquete: 'paq.' } as Record<string, string>)[u] || u)

/* Constructor de variantes en línea — al crear o editar producto */
function VariantsInlineBuilder({ cost, stock, unit = 'Unidad', existingCount = 0, onVariantsChange }: { cost: number; stock: number; unit?: string; existingCount?: number; onVariantsChange: (v: PendingVariant[]) => void }) {
  const [variants, setVariants] = useState<PendingVariant[]>([])
  const [adding, setAdding] = useState(false)
  const [nf, setNf] = useState<{ name: string; qty: string; price: string }>({ name: '', qty: '', price: '' })
  useEffect(() => {
    onVariantsChange(variants)
  }, [variants, onVariantsChange])

  const cpbu = +cost || 0
  const vCost = (qty: number | string) => Math.round(cpbu * (+qty || 0))
  const vMargin = (p: number | string, q: number | string) => (+p || 0) - vCost(q)
  const vMpct = (p: number | string, q: number | string) => ((+p || 0) > 0 ? Math.round((vMargin(p, q) / +p) * 100) : 0)
  const isW = UNIT_IS_WEIGHT(unit)
  const vDisp = (qty: number | string) => ((+qty || 0) > 0 ? Math.floor((+stock || 0) / +qty) : 0)
  const addV = () => {
    if (!nf.name || !nf.qty || !nf.price) return
    setVariants((vs) => [...vs, { id: 'nv' + Date.now(), name: nf.name, qty: +nf.qty, price: +nf.price }])
    setNf({ name: '', qty: '', price: '' })
    setAdding(false)
  }

  return (
    <div style={{ marginTop: 4 }}>
      {existingCount > 0 && (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginBottom: 10, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <Icon name="tag" size={13} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>Este producto ya tiene {existingCount} variante{existingCount !== 1 ? 's' : ''}. Aquí solo agregas <strong>nuevas</strong>; para ver, editar o borrar las existentes usa el botón “Variantes” de la tabla.</span>
        </div>
      )}
      {variants.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: 10 }}>
          <table className="tbl" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>Variante</th>
                <th className="num">{UNIT_LABEL(unit)}</th>
                <th className="num">Precio</th>
                <th className="num">Costo calc.</th>
                <th className="num">Margen</th>
                <th className="num">Disponibles</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 700 }}>{v.name}</td>
                  <td className="num tnum">{v.qty} {UNIT_ABBREV(unit)}</td>
                  <td className="num tnum">{fmtCLP(v.price)}</td>
                  <td className="num tnum muted">{fmtCLP(vCost(v.qty))}</td>
                  <td className="num">
                    <span className="chip tnum" style={{ background: vMpct(v.price, v.qty) >= 25 ? 'var(--ok-tint)' : 'var(--warn-tint)', color: vMpct(v.price, v.qty) >= 25 ? 'var(--primary-700)' : 'oklch(0.50 0.10 70)', fontSize: 11, fontWeight: 800 }}>{vMpct(v.price, v.qty)}%</span>
                  </td>
                  <td className="num tnum muted">{vDisp(v.qty)}</td>
                  <td>
                    <button className="btn btn-ghost btn-icon" style={{ width: 26, height: 26 }} onClick={() => setVariants((vs) => vs.filter((x) => x.id !== v.id))}>
                      <Icon name="trash" size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding ? (
        <div style={{ padding: '13px', background: 'var(--surface-3)', borderRadius: 12, border: '1px dashed var(--primary)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary-700)', marginBottom: 10 }}>Nueva variante</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 9, marginBottom: 9 }}>
            <label className="field">
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)' }}>Nombre</span>
              <input className="input" value={nf.name} onChange={(e) => setNf((f) => ({ ...f, name: e.target.value }))} placeholder="Pack 6 unidades" autoFocus style={{ fontSize: 13.5 }} />
            </label>
            <label className="field">
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)' }}>Cantidad ({UNIT_ABBREV(unit)})</span>
              <input className="input tnum" type="number" step={UNIT_STEP(unit)} value={nf.qty} onChange={(e) => setNf((f) => ({ ...f, qty: e.target.value }))} placeholder={isW ? '0.5' : '6'} style={{ fontSize: 13.5 }} />
            </label>
            <label className="field">
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)' }}>Precio ($)</span>
              <input className="input tnum" type="number" value={nf.price} onChange={(e) => setNf((f) => ({ ...f, price: e.target.value }))} placeholder="2000" style={{ fontSize: 13.5 }} />
            </label>
          </div>
          {nf.qty && nf.price && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {[
                { l: 'Costo calculado', v: fmtCLP(vCost(nf.qty)) },
                { l: 'Ganancia', v: fmtCLP(vMargin(nf.price, nf.qty)) },
                { l: 'Margen', v: vMpct(nf.price, nf.qty) + '%' },
                { l: 'Disponibles', v: vDisp(nf.qty) + ' ' + UNIT_ABBREV(unit) + '(s)' },
              ].map((x, i) => (
                <div key={i} style={{ flex: 1, minWidth: 80, padding: '7px 9px', background: 'var(--surface)', borderRadius: 9, textAlign: 'center', border: '1px solid var(--line)' }}>
                  <div className="tnum" style={{ fontWeight: 800, fontSize: 13 }}>{x.v}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 700, marginTop: 1 }}>{x.l}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 7 }}>
            <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 13 }} disabled={!nf.name || !nf.qty || !nf.price} onClick={addV}>
              <Icon name="check" size={14} />
              Agregar variante
            </button>
            <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 13 }} onClick={() => { setAdding(false); setNf({ name: '', qty: '', price: '' }) }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-soft" style={{ fontSize: 13 }} onClick={() => setAdding(true)}>
          <Icon name="plus" size={14} />
          Agregar variante
        </button>
      )}
    </div>
  )
}

/* ---------- ProductForm modal ---------- */
function ProductForm({ initial, onSave, onClose }: { initial?: ProductWithExtras; onSave: (data: Omit<Product, 'id' | 'margin' | 'marginPct' | 'sold'> & { photo?: string }, variants?: PendingVariant[]) => void; onClose: () => void }) {
  const { settings, categorias, addCategoria } = useStore()
  const { productHasFormats, getFormats } = useFormats()
  const existingVariants = initial ? getFormats(initial.id).length : 0
  const [f, setF] = useState<FormState>(
    initial
      ? { name: initial.name, cat: initial.cat, unit: initial.unit, cost: initial.cost, price: initial.price, stock: String(initial.stock), min: String(initial.min), photo: initial.photo, precioDespacho: initial.precioDespacho || '' }
      : { name: '', cat: categorias[0] || 'Otros', unit: 'Unidad', cost: '', price: '', stock: '', min: String(settings.minStockDefault), precioDespacho: '' },
  )
  const [pendingVariants, setPendingVariants] = useState<PendingVariant[]>([])
  const [showVariants, setShowVariants] = useState(!!(initial && productHasFormats(initial.id)))
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }))
  const cost = +f.cost || 0
  const price = +f.price || 0
  const margin = price - cost
  const marginPct = price ? (margin / price) * 100 : 0
  const valid = !!f.name.trim() && price > 0
  const low = marginPct < settings.minMargin

  // Precio de despacho: fijo si lo definió (>0), si no el mismo precio local.
  const dInput = f.precioDespacho === '' ? undefined : Math.max(0, +f.precioDespacho || 0)
  const dPrice = precioDespachoDe(price, dInput)
  const dSugerido = price > 0 ? Math.round((price * 1.1) / 10) * 10 : 0 // atajo +10%
  const dExtra = dInput && dInput > 0 ? dInput - price : 0

  const handleSave = () => {
    onSave({ name: f.name.trim(), cat: f.cat, unit: f.unit, cost, price, stock: +f.stock || 0, min: +f.min || 0, photo: f.photo, precioDespacho: dInput && dInput > 0 ? dInput : undefined }, pendingVariants)
    onClose()
  }

  return (
    <Modal
      title={initial ? 'Editar producto' : 'Agregar producto'}
      sub="El margen se calcula automáticamente"
      onClose={onClose}
      width={580}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid} onClick={handleSave}>
            <Icon name="check" size={16} />
            Guardar{pendingVariants.length > 0 ? ` + ${pendingVariants.length} variantes` : ''}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Nombre del producto">
          <input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Huevo Extra 180u, Almendras 250g" autoFocus />
        </Field>
        {/* ── Subida de foto ── */}
        <Field label="Foto del producto" hint="Aparece en el selector de ventas para identificarlo rápido (opcional)">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {f.photo ? (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={f.photo} alt="" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', border: '2px solid var(--line)' }} />
                <button onClick={() => set('photo', '')} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 50, background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <Icon name="x" size={12} />
                </button>
              </div>
            ) : null}
            <label
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '18px 12px', border: '2px dashed var(--line-2)', borderRadius: 12, cursor: 'pointer', background: 'var(--surface-3)', gap: 6, minHeight: 80, transition: '.14s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-tint)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.background = 'var(--surface-3)' }}
            >
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = (ev) => set('photo', String(ev.target?.result || ''))
                  reader.readAsDataURL(file)
                }}
              />
              <Icon name="download" size={18} style={{ color: 'var(--ink-3)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)' }}>{f.photo ? 'Cambiar foto' : 'Subir foto'}</span>
              <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500 }}>JPG, PNG · máx 5 MB</span>
            </label>
          </div>
        </Field>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Categoría">
            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              <select className="select" value={f.cat} onChange={(e) => set('cat', e.target.value)}>
                {categorias.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '10px 11px', flexShrink: 0, fontSize: 13 }}
                onClick={() => {
                  const n = window.prompt('Nombre de la nueva categoría:')
                  if (!n?.trim()) return
                  addCategoria(n.trim())
                  set('cat', n.trim())
                }}
                title="Nueva categoría"
              >
                <Icon name="plus" size={14} />
                Nueva
              </button>
            </div>
          </Field>
          <Field label="Unidad base" hint="La unidad con la que controlas el stock">
            <select className="select" value={f.unit} onChange={(e) => set('unit', e.target.value)}>
              {(UNIT_OPTIONS.includes(f.unit) ? UNIT_OPTIONS : [f.unit, ...UNIT_OPTIONS]).map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Costo por unidad base">
            <MoneyInput value={f.cost} onChange={(v) => set('cost', v)} />
          </Field>
          <Field label="Precio de venta (unidad base)">
            <MoneyInput value={f.price} onChange={(v) => set('price', v)} />
          </Field>
        </div>

        {/* Vista previa del margen */}
        <div className="card" style={{ background: low ? 'var(--danger-tint)' : 'var(--primary-tint)', border: 'none', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: low ? 'var(--danger)' : 'var(--primary-700)' }}>Margen de ganancia</div>
            <div className="tnum" style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600, marginTop: 2 }}>{price > 0 ? `Ganas ${fmtCLP(margin)} por ${f.unit || 'unidad'}` : 'Ingresa costo y precio'}</div>
          </div>
          <div className="tnum" style={{ fontSize: 26, fontWeight: 800, color: low ? 'var(--danger)' : 'var(--primary-700)' }}>{price > 0 ? fmtPct(marginPct) : '—'}</div>
        </div>
        {low && price > 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
            <Icon name="alert" size={14} />
            Bajo el mínimo recomendado ({settings.minMargin}%)
          </div>
        )}

        {/* ── Precio fijo de despacho (opcional, por bencina/personal) ── */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
          <Field label="Precio despacho (opcional)" hint="Vacío = mismo precio que en local">
            <MoneyInput value={f.precioDespacho} onChange={(v) => set('precioDespacho', v)} />
            {price > 0 && (
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12, marginTop: 6, padding: '5px 10px' }} onClick={() => set('precioDespacho', dSugerido)}>
                <Icon name="truck" size={12} />
                Sugerir +10% ({fmtCLP(dSugerido)})
              </button>
            )}
          </Field>
          <div className="card" style={{ background: 'var(--info-tint)', border: 'none', padding: '12px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--info)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="truck" size={13} />
              Precio en despacho
            </div>
            <div className="tnum" style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginTop: 2 }}>{price > 0 ? fmtCLP(dPrice) : '—'}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>{price <= 0 ? 'Ingresa el precio base' : dExtra > 0 ? `${fmtCLP(dExtra)} más que en local` : 'Igual que en local'}</div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label={`Stock inicial (${f.unit || 'unidades'})`}>
            <input className="input tnum" inputMode="numeric" value={f.stock} onChange={(e) => set('stock', e.target.value.replace(/[^0-9]/g, ''))} placeholder="180" />
          </Field>
          <Field label="Stock mínimo" hint="Te avisamos al bajar de aquí">
            <input className="input tnum" inputMode="numeric" value={f.min} onChange={(e) => set('min', e.target.value.replace(/[^0-9]/g, ''))} />
          </Field>
        </div>

        {/* ── Variantes ── */}
        <div style={{ borderTop: '2px dashed var(--line-2)', paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: showVariants ? 12 : 0 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon name="tag" size={15} style={{ color: 'var(--terra-700)' }} />
                Variantes de venta
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>Pack 6, Docena 12, Caja 30, Bolsa 250g… Todos descuentan del mismo stock.</div>
            </div>
            <div onClick={() => setShowVariants((v) => !v)} style={{ width: 42, height: 22, borderRadius: 11, cursor: 'pointer', transition: '.2s', position: 'relative', flexShrink: 0, background: showVariants ? 'var(--primary)' : 'var(--line-2)' }}>
              <div style={{ position: 'absolute', top: 2, left: showVariants ? 20 : 2, width: 18, height: 18, borderRadius: 9, background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}></div>
            </div>
          </div>
          {showVariants &&
            (valid ? (
              <VariantsInlineBuilder cost={cost} stock={+f.stock || 0} unit={f.unit} existingCount={existingVariants} onVariantsChange={setPendingVariants} />
            ) : (
              <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, padding: '6px 0' }}>Completa nombre, costo y precio para ver los cálculos.</div>
            ))}
        </div>
      </div>
    </Modal>
  )
}

/* ---------- EditableCell ---------- */
function EditableCell({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  if (editing)
    return (
      <div className="input-pre" style={{ padding: 0, width: 96, marginLeft: 'auto' }}>
        <span className="pre" style={{ padding: '0 2px 0 8px', fontSize: 13 }}>$</span>
        <input
          className="tnum"
          autoFocus
          inputMode="numeric"
          value={fmtNum(v)}
          style={{ padding: '6px 6px 6px 2px', fontSize: 13.5, textAlign: 'right' }}
          onChange={(e) => setV(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
          onBlur={() => { setEditing(false); onSave(v) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { setEditing(false); onSave(v) }
          }}
        />
      </div>
    )
  return (
    <button
      onClick={() => setEditing(true)}
      className="tnum"
      title="Editar"
      style={{ background: 'none', border: '1px dashed transparent', borderRadius: 7, padding: '4px 8px', fontWeight: 700, color: 'var(--ink)', fontSize: 14, marginLeft: 'auto', display: 'block' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--line-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
    >
      {fmtCLP(value)}
    </button>
  )
}

/* ---------- Pantalla Productos ---------- */
export default function ProductosPage() {
  const { products, addProduct, updateProduct, deleteProduct, settings, categorias, addCategoria, renameCategoria, deleteCategoria, reorderCategorias } = useStore()
  const { getFormats, productHasFormats, addFormat, toggleFormats, deleteFormat } = useFormats()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Todas')
  const [form, setForm] = useState(false)
  const [edit, setEdit] = useState<ProductWithExtras | null>(null)
  const [fmtModal, setFmtModal] = useState<ProductWithExtras | null>(null)
  const [sort, setSort] = useState<{ k: keyof Product; dir: number }>({ k: 'name', dir: 1 })
  const [gestionCats, setGestionCats] = useState(false)
  const [dragCat, setDragCat] = useState<string | null>(null)
  const [dragRow, setDragRow] = useState<number | null>(null)
  const [overRow, setOverRow] = useState<number | null>(null)
  const cats = useMemo(() => ['Todas', ...categorias], [categorias])

  // Reordenar productos solo con UNA categoría elegida y sin búsqueda activa.
  const reordenando = cat !== 'Todas' && q.trim() === ''
  const filtered = products.filter((p) => (cat === 'Todas' || p.cat === cat) && p.name.toLowerCase().includes(q.toLowerCase()))
  const list = reordenando
    ? [...filtered].sort((a, b) => (a.orden ?? 1e9) - (b.orden ?? 1e9) || a.name.localeCompare(b.name))
    : [...filtered].sort((a, b) => {
        const k = sort.k
        const av = a[k]
        const bv = b[k]
        return (typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)) * sort.dir
      })
  const setS = (k: keyof Product) => setSort((s) => (s.k === k ? { k, dir: -s.dir } : { k, dir: 1 }))
  const Th = ({ k, children, num }: { k: keyof Product; children: ReactNode; num?: boolean }) => (
    <th className={num ? 'num' : ''} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setS(k)}>
      {children}
      {sort.k === k && <span style={{ color: 'var(--primary)' }}> {sort.dir > 0 ? '↑' : '↓'}</span>}
    </th>
  )

  /* Alta de producto: usa el id REAL que devuelve addProduct para enganchar las variantes
     (sin adivinar el id ni esperar con setTimeout → así no quedan variantes huérfanas). */
  const handleAdd = (data: Omit<Product, 'id' | 'margin' | 'marginPct' | 'sold'> & { photo?: string }, variants: PendingVariant[] = []) => {
    const id = addProduct(data)
    variants.forEach((v) => addFormat(id, { name: v.name, qty: v.qty, price: v.price }))
  }

  /* Edición de producto: guarda los cambios Y agrega las variantes nuevas del builder
     inline (mismo `id`, sin el setTimeout del alta). Las existentes se gestionan aparte. */
  const handleEdit = (data: Omit<Product, 'id' | 'margin' | 'marginPct' | 'sold'> & { photo?: string }, variants: PendingVariant[] = []) => {
    if (!edit) return
    updateProduct(edit.id, data as Partial<Product>)
    variants.forEach((v) => addFormat(edit.id, { name: v.name, qty: v.qty, price: v.price }))
  }

  /* Eliminar producto (con confirmación) — limpia sus variantes; no afecta ventas. */
  const handleDelete = (p: ProductWithExtras) => {
    if (!window.confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.\n\nNo afecta tus ventas ya registradas.`)) return
    getFormats(p.id).forEach((f) => deleteFormat(f.id))
    toggleFormats(p.id, false)
    deleteProduct(p.id)
  }

  /* Reordenar productos dentro de la categoría (drag de filas) → persiste `orden`. */
  const dropRow = (targetId: number) => {
    if (dragRow == null || dragRow === targetId) { setDragRow(null); setOverRow(null); return }
    const ordered = [...list]
    const from = ordered.findIndex((p) => p.id === dragRow)
    const to = ordered.findIndex((p) => p.id === targetId)
    if (from >= 0 && to >= 0) {
      const [moved] = ordered.splice(from, 1)
      ordered.splice(to, 0, moved)
      ordered.forEach((p, i) => { if (p.orden !== i + 1) updateProduct(p.id, { orden: i + 1 }) })
    }
    setDragRow(null); setOverRow(null)
  }

  /* Reordenar categorías (drag de chips, en modo gestión) → manda en el catálogo. */
  const dropCat = (target: string) => {
    if (!dragCat || dragCat === target) { setDragCat(null); return }
    const order = categorias.filter((x) => x !== dragCat)
    const i = order.indexOf(target)
    order.splice(i < 0 ? order.length : i, 0, dragCat)
    reorderCategorias(order)
    setDragCat(null)
  }
  const renombrarCat = (c: string) => {
    const n = window.prompt(`Renombrar la categoría "${c}":`, c)
    if (n && n.trim() && n.trim() !== c) renameCategoria(c, n.trim())
  }
  const borrarCat = (c: string) => {
    if (window.confirm(`¿Borrar la categoría "${c}"? Los productos que la usen pasarán a "Otros".`)) {
      if (cat === c) setCat('Todas')
      deleteCategoria(c)
    }
  }

  return (
    <div className="fade-in">
      <PageHeader title="Productos" sub={`${products.length} productos en tu catálogo`}>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar producto…" />
        <button className="btn btn-primary" onClick={() => setForm(true)}>
          <Icon name="plus" size={16} />
          Agregar producto
        </button>
      </PageHeader>

      {/* Callout de variantes */}
      <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--primary-tint)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="tag" size={17} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--primary-700)' }}>Variantes activas</div>
          <div style={{ fontSize: 12.5, color: 'var(--primary-700)', fontWeight: 600, marginTop: 1 }}>Configura pack 6, docena, caja 30, bolsa 250g… Todos descuentan del mismo stock madre.</div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--primary-700)', fontWeight: 700, whiteSpace: 'nowrap' }}>Botón "Variantes" →</span>
      </div>

      {/* Filtros / gestión de categoría */}
      <div style={{ display: 'flex', gap: 7, marginBottom: gestionCats ? 8 : 16, overflowX: 'auto', paddingBottom: 2, alignItems: 'center' }}>
        {cats.map((c) => {
          const activo = cat === c
          const manage = gestionCats && c !== 'Todas'
          return (
            <div
              key={c}
              draggable={manage}
              onDragStart={manage ? () => setDragCat(c) : undefined}
              onDragOver={manage ? (e) => e.preventDefault() : undefined}
              onDrop={manage ? () => dropCat(c) : undefined}
              onClick={() => setCat(c)}
              className="chip"
              style={{ border: '1px solid ' + (activo ? 'var(--primary)' : 'var(--line)'), whiteSpace: 'nowrap', cursor: manage ? 'grab' : 'pointer', background: activo ? 'var(--primary)' : 'var(--surface)', color: activo ? '#fff' : 'var(--ink-2)', padding: '7px 12px', fontSize: 13, gap: 6, flexShrink: 0, opacity: dragCat === c ? 0.5 : 1 }}
            >
              {manage && <span style={{ opacity: 0.55, cursor: 'grab' }}>⠿</span>}
              {c !== 'Todas' && <CatDot cat={c} />}
              {c}
              {manage && (
                <>
                  <span onClick={(e) => { e.stopPropagation(); renombrarCat(c) }} title="Renombrar" style={{ display: 'grid', placeItems: 'center', cursor: 'pointer', opacity: 0.85 }}>
                    <Icon name="edit" size={12} />
                  </span>
                  <span onClick={(e) => { e.stopPropagation(); borrarCat(c) }} title="Borrar" style={{ display: 'grid', placeItems: 'center', cursor: 'pointer', color: activo ? '#fff' : 'var(--danger)' }}>
                    <Icon name="x" size={13} />
                  </span>
                </>
              )}
            </div>
          )
        })}
        <button
          onClick={() => {
            const n = window.prompt('Nombre de la nueva categoría:')
            if (!n?.trim()) return
            const name = n.trim()
            addCategoria(name)
            setCat(name)
          }}
          className="chip"
          style={{ border: '1px dashed var(--primary)', whiteSpace: 'nowrap', cursor: 'pointer', background: 'var(--primary-tint)', color: 'var(--primary-700)', padding: '7px 12px', fontSize: 13, flexShrink: 0 }}
        >
          <Icon name="plus" size={13} />
          Nueva
        </button>
        <button
          onClick={() => setGestionCats((v) => !v)}
          className="chip"
          title="Renombrar, borrar y ordenar categorías"
          style={{ border: '1px solid ' + (gestionCats ? 'var(--primary)' : 'var(--line)'), whiteSpace: 'nowrap', cursor: 'pointer', background: gestionCats ? 'var(--primary-tint)' : 'var(--surface)', color: gestionCats ? 'var(--primary-700)' : 'var(--ink-2)', padding: '7px 12px', fontSize: 13, flexShrink: 0 }}
        >
          <Icon name={gestionCats ? 'check' : 'config'} size={13} />
          {gestionCats ? 'Listo' : 'Gestionar'}
        </button>
      </div>
      {gestionCats && (
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          ⠿ Arrastra las categorías para ordenarlas · ✏️ renombrar · ✕ borrar. Ese orden se usa también en el catálogo de ventas.
        </div>
      )}

      {reordenando && (
        <div style={{ fontSize: 12.5, color: 'var(--primary-700)', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          ⠿ Arrastra las filas para ordenar los productos de “{cat}”. Ese orden se ve igual en el catálogo de ventas.
        </div>
      )}

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 52 }}></th>
                <Th k="name">Producto</Th>
                <Th k="cat">Categoría</Th>
                <th>Unidad</th>
                <Th k="cost" num>Costo</Th>
                <Th k="price" num>Precio base</Th>
                <Th k="margin" num>Margen $</Th>
                <Th k="marginPct" num>Margen %</Th>
                <th className="num">Variantes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const hasFmt = productHasFormats(p.id)
                const fmtCount = hasFmt ? getFormats(p.id).length : 0
                const pe = p as ProductWithExtras
                const photoEl = pe.photo ? (
                  <img src={pe.photo} alt="" style={{ width: 44, height: 44, borderRadius: 9, objectFit: 'cover', border: '1px solid var(--line)', display: 'block' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 9, background: 'var(--bg-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}>
                    <Icon name="box" size={18} />
                  </div>
                )
                return (
                  <tr
                    key={p.id}
                    onDragOver={reordenando ? (e) => { e.preventDefault(); if (overRow !== p.id) setOverRow(p.id) } : undefined}
                    onDrop={reordenando ? () => dropRow(p.id) : undefined}
                    onDragEnd={reordenando ? () => { setDragRow(null); setOverRow(null) } : undefined}
                    style={reordenando ? { opacity: dragRow === p.id ? 0.4 : 1, boxShadow: overRow === p.id && dragRow !== p.id ? 'inset 0 2px 0 var(--primary)' : undefined } : undefined}
                  >
                    <td style={{ width: 52, paddingRight: 0 }}>
                      {reordenando ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span draggable onDragStart={() => setDragRow(p.id)} title="Arrastra para ordenar" style={{ cursor: 'grab', color: 'var(--ink-3)', fontSize: 15, padding: '0 2px' }}>⠿</span>
                          {photoEl}
                        </div>
                      ) : photoEl}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      {hasFmt && (
                        <div style={{ fontSize: 12, color: 'var(--primary-700)', fontWeight: 700, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="tag" size={11} />
                          {fmtCount} formato{fmtCount !== 1 ? 's' : ''} de venta
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--ink-2)', fontWeight: 600 }}>
                        <CatDot cat={p.cat} />
                        {p.cat}
                      </span>
                    </td>
                    <td className="tnum muted">{p.unit}</td>
                    <td className="num"><EditableCell value={p.cost} onSave={(v) => updateProduct(p.id, { cost: v })} /></td>
                    <td className="num"><EditableCell value={p.price} onSave={(v) => updateProduct(p.id, { price: v })} /></td>
                    <td className="num tnum" style={{ fontWeight: 700 }}>{fmtCLP(p.margin)}</td>
                    <td className="num"><MarginBadge pct={p.marginPct} minMargin={settings.minMargin} /></td>
                    <td className="num">
                      <button onClick={() => setFmtModal(pe)} className="btn" style={{ padding: '6px 12px', fontSize: 12.5, gap: 6, borderRadius: 9, background: hasFmt ? 'var(--primary)' : 'var(--surface-3)', color: hasFmt ? '#fff' : 'var(--ink-2)', border: hasFmt ? 'none' : '1px solid var(--line-2)' }}>
                        <Icon name="tag" size={13} />
                        {hasFmt ? `${fmtCount} var.` : 'Agregar'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => setEdit(pe)} title="Editar">
                          <Icon name="edit" size={15} />
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(pe)} title="Eliminar" style={{ color: 'var(--danger)' }}>
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {list.length === 0 && <EmptyState icon="search" title="Sin resultados" text="No encontramos productos con ese nombre o categoría." />}
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 12, fontWeight: 600, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="edit" size={13} />
          Toca un costo o precio para editarlo al instante.
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="tag" size={13} />
          Clic en "Variantes" para configurar pack 6, docena, caja 30, etc.
        </span>
      </div>

      {form && <ProductForm onSave={handleAdd} onClose={() => setForm(false)} />}
      {edit && <ProductForm initial={edit} onSave={handleEdit} onClose={() => setEdit(null)} />}
      {fmtModal && <FormatManagerModal product={fmtModal} onClose={() => setFmtModal(null)} />}
    </div>
  )
}
