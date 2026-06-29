'use client'

import { useState, useMemo, useCallback, type ReactNode } from 'react'
import { Icon } from '@/components/icon'
import { PageHeader, SearchBox, CatDot, MarginBadge, EmptyState, Field, MoneyInput, Modal } from '@/components/ui'
import { PRODUCT_UNITS } from '@/types'
import { fmtCLP, fmtNum, fmtPct } from '@/lib/format'
import { useProductos, type Producto, type InsertProducto } from '@/hooks/useProductos'
import { useCategorias } from '@/hooks/useCategorias'
import { useConfiguracion } from '@/hooks/useConfiguracion'

const UNIT_IS_WEIGHT = (u: string) => ['kg', 'gramo', 'litro', 'mililitro'].includes(u)
const UNIT_LABEL = (u: string) => (({ kg: 'kg', gramo: 'gramos', litro: 'litros', mililitro: 'ml', Unidad: 'unidades', caja: 'cajas', paquete: 'paquetes' } as Record<string, string>)[u] || u)
const UNIT_ABBREV = (u: string) => (({ kg: 'kg', gramo: 'g', litro: 'L', mililitro: 'ml', Unidad: 'u.', caja: 'cajas', paquete: 'paq.' } as Record<string, string>)[u] || u)

interface FormState {
  nombre: string
  categoria: string
  unidad: string
  costo: number | ''
  precio: number | ''
  stock: string
  stock_minimo: string
  foto_url: string
  precio_despacho: number | ''
}

/* ---------- Modal de alta / edición ---------- */
function ProductoForm({
  initial, catNombres, stockMinDefault, margenMin, onSave, onClose,
}: {
  initial?: Producto
  catNombres: string[]
  stockMinDefault: number
  margenMin: number
  onSave: (data: InsertProducto) => Promise<void>
  onClose: () => void
}) {
  const [f, setF] = useState<FormState>(
    initial
      ? {
          nombre: initial.nombre,
          categoria: initial.categoria,
          unidad: initial.unidad,
          costo: initial.costo,
          precio: initial.precio,
          stock: String(initial.stock),
          stock_minimo: String(initial.stock_minimo),
          foto_url: initial.foto_url ?? '',
          precio_despacho: initial.precio_despacho ?? '',
        }
      : {
          nombre: '',
          categoria: catNombres[0] || 'Otros',
          unidad: 'Unidad',
          costo: '',
          precio: '',
          stock: '',
          stock_minimo: String(stockMinDefault),
          foto_url: '',
          precio_despacho: '',
        },
  )
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF(s => ({ ...s, [k]: v }))
  const costo = +f.costo || 0
  const precio = +f.precio || 0
  const margen = precio - costo
  const margen_pct = precio > 0 ? (margen / precio) * 100 : 0
  const valid = !!f.nombre.trim() && precio > 0
  const bajo = margen_pct < margenMin
  const dInput = f.precio_despacho === '' ? null : Math.max(0, +f.precio_despacho || 0) || null

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    try {
      await onSave({
        nombre: f.nombre.trim(),
        categoria: f.categoria,
        unidad: f.unidad,
        costo,
        precio,
        stock: +f.stock || 0,
        stock_minimo: +f.stock_minimo || 0,
        foto_url: f.foto_url || null,
        kg_por_unidad: null,
        precio_despacho: dInput,
        orden: initial?.orden ?? 0,
      })
      onClose()
    } catch (e) {
      window.alert('No se pudo guardar: ' + (e instanceof Error ? e.message : 'error'))
    } finally {
      setSaving(false)
    }
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
          <button className="btn btn-primary" disabled={!valid || saving} onClick={handleSave}>
            <Icon name="check" size={16} />{saving ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Nombre del producto">
          <input className="input" value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Huevo Extra 180u, Almendras 250g" autoFocus />
        </Field>

        {/* Foto */}
        <Field label="Foto del producto" hint="Opcional — aparece en el selector de ventas">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {f.foto_url && (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={f.foto_url} alt="" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', border: '2px solid var(--line)' }} />
                <button onClick={() => set('foto_url', '')} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <Icon name="x" size={12} />
                </button>
              </div>
            )}
            <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '18px 12px', border: '2px dashed var(--line-2)', borderRadius: 12, cursor: 'pointer', background: 'var(--surface-3)', gap: 6, minHeight: 80 }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = ev => set('foto_url', String(ev.target?.result || ''))
                reader.readAsDataURL(file)
              }} />
              <Icon name="download" size={18} style={{ color: 'var(--ink-3)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)' }}>{f.foto_url ? 'Cambiar foto' : 'Subir foto'}</span>
            </label>
          </div>
        </Field>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Categoría">
            <select className="select" value={f.categoria} onChange={e => set('categoria', e.target.value)}>
              {catNombres.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Unidad base" hint="La unidad con la que controlas el stock">
            <select className="select" value={f.unidad} onChange={e => set('unidad', e.target.value)}>
              {(PRODUCT_UNITS.includes(f.unidad as typeof PRODUCT_UNITS[number]) ? PRODUCT_UNITS : [f.unidad, ...PRODUCT_UNITS]).map(u => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Costo (precio de compra)">
            <MoneyInput value={f.costo} onChange={v => set('costo', v)} placeholder="0" />
          </Field>
          <Field label="Precio de venta">
            <MoneyInput value={f.precio} onChange={v => set('precio', v)} placeholder="0" />
          </Field>
        </div>

        {precio > 0 && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: bajo ? 'var(--danger-tint)' : 'var(--ok-tint)', display: 'flex', gap: 14, fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: bajo ? 'var(--danger)' : 'var(--primary-700)' }}>Margen: {fmtCLP(margen)} · {fmtPct(margen_pct)}</span>
            {bajo && <span style={{ color: 'var(--danger)' }}>⚠ Bajo el mínimo ({margenMin}%)</span>}
          </div>
        )}

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={`Stock inicial (${UNIT_LABEL(f.unidad)})`}>
            <input className="input tnum" inputMode="decimal" step={UNIT_IS_WEIGHT(f.unidad) ? '0.001' : '1'} value={f.stock} onChange={e => set('stock', e.target.value)} placeholder="0" />
          </Field>
          <Field label="Stock mínimo (alerta)">
            <input className="input tnum" inputMode="numeric" value={f.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} placeholder="5" />
          </Field>
        </div>

        <Field label="Precio de despacho" hint="Vacío = mismo precio que en local">
          <MoneyInput value={f.precio_despacho} onChange={v => set('precio_despacho', v)} placeholder={`= precio local (${fmtCLP(precio)})`} />
        </Field>
      </div>
    </Modal>
  )
}

/* ---------- Pantalla principal ---------- */
export default function ProductosPage() {
  const { productos, loading, agregar, actualizar, eliminar } = useProductos()
  const { categorias } = useCategorias()
  const { config } = useConfiguracion()

  const catNombres = useMemo(() => categorias.map(c => c.nombre), [categorias])

  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Todas')
  const [form, setForm] = useState(false)
  const [edit, setEdit] = useState<Producto | null>(null)
  const [sort, setSort] = useState<{ k: keyof Producto; dir: number }>({ k: 'nombre', dir: 1 })
  const [dragRow, setDragRow] = useState<string | null>(null)
  const [overRow, setOverRow] = useState<string | null>(null)

  const cats = useMemo(() => ['Todas', ...catNombres], [catNombres])

  const reordenando = cat !== 'Todas' && q.trim() === ''
  const filtered = productos.filter(p =>
    (cat === 'Todas' || p.categoria === cat) &&
    p.nombre.toLowerCase().includes(q.toLowerCase()),
  )
  const list = reordenando
    ? [...filtered].sort((a, b) => (a.orden ?? 1e9) - (b.orden ?? 1e9) || a.nombre.localeCompare(b.nombre))
    : [...filtered].sort((a, b) => {
        const av = a[sort.k]
        const bv = b[sort.k]
        return (typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)) * sort.dir
      })

  const setS = (k: keyof Producto) => setSort(s => s.k === k ? { k, dir: -s.dir } : { k, dir: 1 })
  const Th = ({ k, children, num }: { k: keyof Producto; children: ReactNode; num?: boolean }) => (
    <th className={num ? 'num' : ''} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setS(k)}>
      {children}{sort.k === k && <span style={{ color: 'var(--primary)' }}> {sort.dir > 0 ? '↑' : '↓'}</span>}
    </th>
  )

  const handleAdd = useCallback(async (data: InsertProducto) => {
    await agregar(data)
  }, [agregar])

  const handleEdit = useCallback(async (data: InsertProducto) => {
    if (!edit) return
    await actualizar(edit.id, data)
  }, [edit, actualizar])

  const handleDelete = useCallback(async (p: Producto) => {
    if (!window.confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.\n\nNo afecta tus ventas ya registradas.`)) return
    await eliminar(p.id)
  }, [eliminar])

  const dropRow = useCallback(async (targetId: string) => {
    if (!dragRow || dragRow === targetId) { setDragRow(null); setOverRow(null); return }
    const ordered = [...list]
    const from = ordered.findIndex(p => p.id === dragRow)
    const to = ordered.findIndex(p => p.id === targetId)
    if (from >= 0 && to >= 0) {
      const [moved] = ordered.splice(from, 1)
      ordered.splice(to, 0, moved)
      await Promise.all(ordered.map((p, i) => p.orden !== i + 1 ? actualizar(p.id, { orden: i + 1 }) : Promise.resolve()))
    }
    setDragRow(null); setOverRow(null)
  }, [dragRow, list, actualizar])

  const LOW_STOCK = (p: Producto) => p.stock > 0 && p.stock <= p.stock_minimo
  const OUT_STOCK = (p: Producto) => p.stock <= 0

  return (
    <div className="fade-in">
      <PageHeader title="Productos" sub={`${productos.length} producto${productos.length !== 1 ? 's' : ''} en tu catálogo`}>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar producto…" />
        <button className="btn btn-primary" onClick={() => setForm(true)}>
          <Icon name="plus" size={16} />Agregar
        </button>
      </PageHeader>

      {/* Filtro por categoría */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {cats.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={'chip' + (cat === c ? ' chip-primary' : ' chip-neutral')}
            style={{ cursor: 'pointer', fontFamily: 'inherit', padding: '6px 12px', fontSize: 13 }}
          >
            {c !== 'Todas' && <CatDot cat={c} />}{c}
            {c !== 'Todas' && (
              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--ink-3)', fontWeight: 700 }}>
                {productos.filter(p => p.categoria === c).length}
              </span>
            )}
          </button>
        ))}
        {catNombres.length === 0 && !loading && (
          <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>
            Sin categorías — agrégalas en <a href="/configuracion" style={{ color: 'var(--primary-700)' }}>Configuración</a>
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-3)', fontWeight: 600 }}>Cargando productos…</div>
      ) : list.length === 0 ? (
        <EmptyState
          icon="box"
          title={q || cat !== 'Todas' ? 'Sin resultados' : 'Agrega tu primer producto'}
          text={q || cat !== 'Todas' ? 'Prueba cambiando la búsqueda o el filtro.' : 'Haz clic en "Agregar" para crear tu catálogo.'}
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  {reordenando && <th style={{ width: 24 }} />}
                  <th style={{ width: 48 }} />
                  <Th k="nombre">Producto</Th>
                  <Th k="categoria">Categoría</Th>
                  <Th k="precio" num>Precio</Th>
                  <Th k="costo" num>Costo</Th>
                  <Th k="margen_pct" num>Margen</Th>
                  <Th k="stock" num>Stock</Th>
                  <Th k="vendido" num>Vendido</Th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr
                    key={p.id}
                    draggable={reordenando}
                    onDragStart={reordenando ? () => setDragRow(p.id) : undefined}
                    onDragOver={reordenando ? e => { e.preventDefault(); setOverRow(p.id) } : undefined}
                    onDrop={reordenando ? () => dropRow(p.id) : undefined}
                    style={overRow === p.id ? { background: 'var(--primary-tint)' } : undefined}
                  >
                    {reordenando && (
                      <td style={{ color: 'var(--ink-3)', cursor: 'grab', paddingRight: 4 }}>
                        <Icon name="menu" size={15} />
                      </td>
                    )}
                    <td style={{ paddingRight: 4 }}>
                      {p.foto_url ? (
                        <img src={p.foto_url} alt="" style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}>
                          <Icon name="box" size={16} style={{ color: 'var(--ink-3)' }} />
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nombre}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>
                        {UNIT_ABBREV(p.unidad)}
                        {p.precio_despacho && p.precio_despacho !== p.precio && (
                          <> · desp. {fmtCLP(p.precio_despacho)}</>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CatDot cat={p.categoria} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{p.categoria}</span>
                      </span>
                    </td>
                    <td className="num">{fmtCLP(p.precio)}</td>
                    <td className="num" style={{ color: 'var(--ink-3)' }}>{fmtCLP(p.costo)}</td>
                    <td className="num"><MarginBadge pct={p.margen_pct} minMargin={config.margen_minimo} /></td>
                    <td className="num">
                      <span style={{ fontWeight: 700, color: OUT_STOCK(p) ? 'var(--danger)' : LOW_STOCK(p) ? 'oklch(0.50 0.10 70)' : undefined }}>
                        {fmtNum(p.stock)} {UNIT_ABBREV(p.unidad)}
                      </span>
                      {LOW_STOCK(p) && !OUT_STOCK(p) && <div style={{ fontSize: 11, color: 'oklch(0.50 0.10 70)', fontWeight: 600 }}>stock bajo</div>}
                      {OUT_STOCK(p) && <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>sin stock</div>}
                    </td>
                    <td className="num" style={{ color: 'var(--ink-3)' }}>{fmtNum(p.vendido)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-icon"
                          title="Editar"
                          onClick={() => setEdit(p)}
                          style={{ width: 32, height: 32 }}
                        >
                          <Icon name="edit" size={15} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          title="Eliminar"
                          onClick={() => handleDelete(p)}
                          style={{ width: 32, height: 32, color: 'var(--danger)' }}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal alta */}
      {form && (
        <ProductoForm
          catNombres={catNombres}
          stockMinDefault={config.stock_minimo_default}
          margenMin={config.margen_minimo}
          onSave={handleAdd}
          onClose={() => setForm(false)}
        />
      )}

      {/* Modal edición */}
      {edit && (
        <ProductoForm
          initial={edit}
          catNombres={catNombres}
          stockMinDefault={config.stock_minimo_default}
          margenMin={config.margen_minimo}
          onSave={handleEdit}
          onClose={() => setEdit(null)}
        />
      )}
    </div>
  )
}
