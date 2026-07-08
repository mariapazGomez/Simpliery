'use client'

import { useState, useMemo, useCallback, type ReactNode } from 'react'
import { Icon } from '@/components/icon'
import { PageHeader, SearchBox, CatDot, MarginBadge, EmptyState, Field, MoneyInput, Modal } from '@/components/ui'
import { PRODUCT_UNITS } from '@/types'
import { fmtCLP, fmtNum, fmtPct, fmtStock } from '@/lib/format'
import { parseExcel, downloadTemplate } from '@/lib/excel'
import { useProductos, type Producto, type InsertProducto } from '@/hooks/useProductos'
import { useCategorias, type Categoria } from '@/hooks/useCategorias'
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

/* ---------- Barra de categorías + gestión ---------- */
function CategoriaBar({
  categorias, productos, cat, onSelect, agregar, renombrar, eliminar,
}: {
  categorias: Categoria[]
  productos: Producto[]
  cat: string
  onSelect: (c: string) => void
  agregar: (nombre: string) => Promise<void>
  renombrar: (id: string, nombre: string) => Promise<void>
  eliminar: (id: string) => Promise<void>
}) {
  const [showNueva,     setShowNueva]     = useState(false)
  const [showGestionar, setShowGestionar] = useState(false)
  const [newCat,        setNewCat]        = useState('')
  const [renamingId,    setRenamingId]    = useState<string | null>(null)
  const [renameVal,     setRenameVal]     = useState('')

  const countFor = (nombre: string) => productos.filter(p => p.categoria === nombre).length

  const errMsg = (e: unknown) => (e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error desconocido')

  const handleAdd = async () => {
    if (!newCat.trim()) return
    try {
      await agregar(newCat.trim())
      setNewCat('')
      setShowNueva(false)
    } catch (e) {
      window.alert('No se pudo crear la categoría: ' + errMsg(e))
    }
  }

  const handleRename = async (id: string) => {
    if (!renameVal.trim()) return
    try {
      await renombrar(id, renameVal.trim())
      setRenamingId(null)
    } catch (e) {
      window.alert('No se pudo renombrar: ' + errMsg(e))
    }
  }

  const handleDelete = async (c: Categoria) => {
    if (!window.confirm(`¿Borrar "${c.nombre}"? Los productos perderán su categoría.`)) return
    try {
      await eliminar(c.id)
    } catch (e) {
      window.alert('No se pudo eliminar: ' + errMsg(e))
    }
  }

  return (
    <>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: '13px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        {/* Chips de filtro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => onSelect('Todas')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 999, border: `1px solid ${cat === 'Todas' ? 'var(--ink)' : 'var(--line)'}`, background: cat === 'Todas' ? 'var(--ink)' : 'var(--surface)', color: cat === 'Todas' ? 'var(--surface)' : 'var(--ink)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Todas
            <span style={{ fontSize: 12, fontWeight: 500, color: cat === 'Todas' ? 'var(--ink-3)' : 'var(--ink-3)' }}>{productos.length}</span>
          </button>
          {categorias.map(c => {
            const sel = cat === c.nombre
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.nombre)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 999, border: `1px solid ${sel ? 'var(--line-2)' : 'var(--line)'}`, background: sel ? 'var(--surface-3)' : 'var(--surface)', color: 'var(--ink)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <CatDot cat={c.nombre} />
                {c.nombre}
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-3)' }}>{countFor(c.nombre)}</span>
              </button>
            )
          })}
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setShowNueva(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <Icon name="plus" size={14} />Nueva
          </button>
          <button
            onClick={() => setShowGestionar(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, border: 'none', background: 'var(--surface-3)', color: 'var(--ink-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <Icon name="config" size={14} />Gestionar
          </button>
        </div>
      </div>

      {/* Modal: nueva categoría */}
      {showNueva && (
        <Modal
          title="Nueva categoría"
          sub="Agrupa tus productos con una nueva categoría"
          onClose={() => { setShowNueva(false); setNewCat('') }}
          width={400}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setShowNueva(false); setNewCat('') }}>Cancelar</button>
              <button className="btn btn-primary" disabled={!newCat.trim()} onClick={handleAdd}>
                <Icon name="plus" size={16} />Crear
              </button>
            </>
          }
        >
          <Field label="Nombre de la categoría">
            <input
              className="input"
              value={newCat}
              autoFocus
              onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              placeholder="Ej: Lácteos, Bebidas, Snacks…"
            />
          </Field>
        </Modal>
      )}

      {/* Modal: gestionar categorías */}
      {showGestionar && (
        <Modal
          title="Gestionar categorías"
          sub="Renombra o elimina las categorías existentes"
          onClose={() => { setShowGestionar(false); setRenamingId(null) }}
          width={480}
          footer={
            <button className="btn btn-ghost" onClick={() => { setShowGestionar(false); setRenamingId(null) }}>Cerrar</button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {categorias.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-3)', fontWeight: 600, fontSize: 14 }}>
                Sin categorías. Crea una con el botón "Nueva".
              </div>
            )}
            {categorias.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface-3)' }}>
                {renamingId === c.id ? (
                  <>
                    <input
                      className="input"
                      style={{ flex: 1, height: 34 }}
                      value={renameVal}
                      autoFocus
                      onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(c.id); if (e.key === 'Escape') setRenamingId(null) }}
                    />
                    <button className="btn btn-primary btn-icon" style={{ width: 34, height: 34, flexShrink: 0 }} onClick={() => handleRename(c.id)}><Icon name="check" size={14} /></button>
                    <button className="btn btn-ghost btn-icon" style={{ width: 34, height: 34, flexShrink: 0 }} onClick={() => setRenamingId(null)}><Icon name="x" size={14} /></button>
                  </>
                ) : (
                  <>
                    <CatDot cat={c.nombre} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{c.nombre}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{countFor(c.nombre)} prod.</span>
                    <button className="btn btn-ghost btn-icon" style={{ width: 32, height: 32 }} title="Renombrar" onClick={() => { setRenamingId(c.id); setRenameVal(c.nombre) }}>
                      <Icon name="edit" size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon" style={{ width: 32, height: 32, color: 'var(--danger)' }} title="Eliminar" onClick={() => handleDelete(c)}>
                      <Icon name="trash" size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  )
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

/* ---------- Import masivo ---------- */
const PR_HEADERS = ['nombre *', 'categoria', 'unidad *', 'precio *', 'costo', 'stock', 'stock_minimo', 'precio_despacho']
const PR_EXAMPLE = {
  'nombre *': 'Queso Gouda',
  categoria: 'Quesos',
  'unidad *': 'kg',
  'precio *': '15000',
  costo: '9000',
  stock: '5',
  stock_minimo: '2',
  precio_despacho: '16500',
}

const UNITS_NORM: Record<string, string> = Object.fromEntries(
  PRODUCT_UNITS.map((u) => [u.toLowerCase(), u]),
)

interface ProdRow {
  nombre: string; categoria: string; unidad: string; precio: number
  costo: number; stock: number; stock_minimo: number; precio_despacho: number | null
  _errors: string[]; _idx: number
}

function validateProdRows(raw: Record<string, string>[]): ProdRow[] {
  return raw.map((r, i) => {
    const nombre = (r['nombre *'] || r['nombre'] || '').trim()
    const unidadRaw = (r['unidad *'] || r['unidad'] || '').trim()
    const unidad = UNITS_NORM[unidadRaw.toLowerCase()] ?? unidadRaw
    const precio = parseFloat((r['precio *'] || r['precio'] || '').replace(',', '.').replace(/[^0-9.]/g, ''))
    const costo = parseFloat((r['costo'] || '0').replace(',', '.').replace(/[^0-9.]/g, '')) || 0
    const stock = parseFloat((r['stock'] || '0').replace(',', '.')) || 0
    const stock_minimo = parseFloat((r['stock_minimo'] || '0').replace(',', '.')) || 0
    const dpRaw = (r['precio_despacho'] || '').trim()
    const precio_despacho = dpRaw ? (parseFloat(dpRaw.replace(',', '.').replace(/[^0-9.]/g, '')) || null) : null

    const errors: string[] = []
    if (!nombre) errors.push('Nombre requerido')
    if (!unidad || !UNITS_NORM[unidad.toLowerCase()]) errors.push(`Unidad inválida (usa: ${PRODUCT_UNITS.join(', ')})`)
    if (isNaN(precio) || precio <= 0) errors.push('Precio debe ser mayor a 0')

    return { nombre, categoria: (r['categoria'] || '').trim(), unidad, precio: isNaN(precio) ? 0 : precio, costo, stock, stock_minimo, precio_despacho, _errors: errors, _idx: i + 1 }
  })
}

function ImportProductosModal({
  onClose,
  importarMasivo,
}: {
  onClose: () => void
  importarMasivo: (rows: InsertProducto[]) => Promise<void>
}) {
  const [rows, setRows] = useState<ProdRow[] | null>(null)
  const [drag, setDrag] = useState(false)
  const [fileErr, setFileErr] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const handleFile = async (f: File) => {
    setFileErr(null)
    try {
      const raw = await parseExcel(f)
      setRows(validateProdRows(raw))
    } catch {
      setFileErr('No se pudo leer el archivo. Usa la plantilla .xlsx o un CSV con las mismas columnas.')
    }
  }

  const errCount = rows?.filter((r) => r._errors.length > 0).length ?? 0
  const canImport = rows && rows.length > 0 && errCount === 0

  const doImport = async () => {
    if (!rows || !canImport) return
    setImporting(true)
    try {
      await importarMasivo(rows.map((r) => ({
        nombre: r.nombre, categoria: r.categoria, unidad: r.unidad,
        precio: r.precio, costo: r.costo, stock: r.stock,
        stock_minimo: r.stock_minimo, precio_despacho: r.precio_despacho,
        foto_url: null, kg_por_unidad: null, orden: 0,
      })))
      onClose()
    } catch {
      setFileErr('Error al importar — intenta de nuevo')
      setImporting(false)
    }
  }

  return (
    <Modal
      title="Importar productos"
      sub="Descarga la plantilla, rellénala y súbela aquí"
      onClose={onClose}
      width={780}
      footer={rows ? (
        <>
          <button className="btn btn-ghost" onClick={() => { setRows(null); setFileErr(null) }}>Volver</button>
          <button className="btn btn-primary" disabled={!canImport || importing} onClick={doImport}>
            <Icon name="check" size={15} />
            {importing ? 'Importando…' : errCount > 0 ? `${errCount} error${errCount > 1 ? 'es' : ''} — corrige el archivo` : `Importar ${rows.length} productos`}
          </button>
        </>
      ) : (
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
      )}
    >
      {fileErr && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--danger-tint)', color: 'var(--danger)', borderRadius: 10, fontWeight: 700, fontSize: 13.5 }}>
          {fileErr}
        </div>
      )}
      {!rows ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '12px 16px', background: 'var(--surface-3)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>1</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Descarga la plantilla Excel</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>Rellena los datos y guarda el archivo sin cambiar los encabezados</div>
            </div>
            <button className="btn btn-soft" style={{ flexShrink: 0 }} onClick={() => downloadTemplate('plantilla_productos.xlsx', PR_HEADERS, PR_EXAMPLE)}>
              <Icon name="download" size={14} />Plantilla .xlsx
            </button>
          </div>
          <div style={{ padding: '10px 14px', background: 'var(--warn-tint)', borderRadius: 10, fontSize: 12.5, color: 'oklch(0.45 0.10 70)', fontWeight: 700, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Icon name="alert" size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>Unidades válidas: <b>{PRODUCT_UNITS.join(' · ')}</b>. Los campos con * son obligatorios.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>2</div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Sube el archivo relleno</div>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            style={{ border: `2px dashed ${drag ? 'var(--primary)' : 'var(--line-2)'}`, borderRadius: 14, padding: '28px 24px', textAlign: 'center', background: drag ? 'var(--primary-tint)' : 'var(--surface-3)', transition: '.15s', cursor: 'pointer' }}
            onClick={() => document.getElementById('xl-productos')?.click()}
          >
            <Icon name="download" size={28} style={{ color: 'var(--ink-3)', marginBottom: 8 }} />
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Arrastra tu archivo aquí</div>
            <div style={{ color: 'var(--ink-3)', fontSize: 13, fontWeight: 600 }}>o haz clic para seleccionar</div>
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 6, fontWeight: 600 }}>Acepta: .xlsx · .csv</div>
          </div>
          <input id="xl-productos" type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <span className={`chip ${errCount === 0 ? 'chip-ok' : 'chip-danger'}`}>
              <Icon name={errCount === 0 ? 'check' : 'alert'} size={12} />
              {rows.length} fila{rows.length !== 1 ? 's' : ''}{errCount > 0 ? ` · ${errCount} con error` : ' — sin errores'}
            </span>
            {errCount > 0 && <span style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 700 }}>Corrige el Excel y vuelve a subir</span>}
          </div>
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 340, border: '1px solid var(--line)', borderRadius: 10 }}>
            <table className="tbl" style={{ fontSize: 12.5, minWidth: 680 }}>
              <thead>
                <tr>
                  <th style={{ width: 32 }}>#</th>
                  <th>Nombre *</th><th>Categoría</th><th>Unidad *</th>
                  <th className="num">Precio *</th><th className="num">Costo</th>
                  <th className="num">Stock</th><th className="num">Stock min.</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._idx} style={{ background: r._errors.length > 0 ? 'color-mix(in srgb, var(--danger) 8%, transparent)' : undefined }}>
                    <td style={{ color: 'var(--ink-3)', fontSize: 11 }}>{r._idx}</td>
                    <td style={{ fontWeight: 700, color: !r.nombre ? 'var(--danger)' : undefined }}>{r.nombre || '(vacío)'}</td>
                    <td>{r.categoria || '—'}</td>
                    <td style={{ color: r._errors.some(e => e.includes('Unidad')) ? 'var(--danger)' : undefined }}>{r.unidad || '—'}</td>
                    <td className="num tnum" style={{ color: !r.precio ? 'var(--danger)' : undefined }}>{r.precio > 0 ? fmtCLP(r.precio) : '—'}</td>
                    <td className="num tnum">{r.costo > 0 ? fmtCLP(r.costo) : '—'}</td>
                    <td className="num tnum">{r.stock}</td>
                    <td className="num tnum">{r.stock_minimo}</td>
                    <td>{r._errors.length > 0 && <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 700, whiteSpace: 'nowrap' }}>⚠ {r._errors.join('; ')}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ---------- Pantalla principal ---------- */
export default function ProductosPage() {
  const { productos, loading, agregar, actualizar, eliminar, importarMasivo } = useProductos()
  const { categorias, agregar: agregarCat, renombrar: renombrarCat, eliminar: eliminarCat } = useCategorias()
  const { config } = useConfiguracion()

  const catNombres = useMemo(() => categorias.map(c => c.nombre), [categorias])

  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Todas')
  const [form, setForm] = useState(false)
  const [edit, setEdit] = useState<Producto | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [sort, setSort] = useState<{ k: keyof Producto; dir: number }>({ k: 'nombre', dir: 1 })
  const [dragRow, setDragRow] = useState<string | null>(null)
  const [overRow, setOverRow] = useState<string | null>(null)

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
        <button className="btn btn-soft" onClick={() => setShowImport(true)}>
          <Icon name="download" size={16} />Importar
        </button>
        <button className="btn btn-primary" onClick={() => setForm(true)}>
          <Icon name="plus" size={16} />Agregar
        </button>
      </PageHeader>

      <CategoriaBar
        categorias={categorias}
        productos={productos}
        cat={cat}
        onSelect={setCat}
        agregar={agregarCat}
        renombrar={renombrarCat}
        eliminar={eliminarCat}
      />

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
                        {fmtStock(p.stock, p.unidad)} {UNIT_ABBREV(p.unidad)}
                      </span>
                      {LOW_STOCK(p) && !OUT_STOCK(p) && <div style={{ fontSize: 11, color: 'oklch(0.50 0.10 70)', fontWeight: 600 }}>stock bajo</div>}
                      {OUT_STOCK(p) && <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>sin stock</div>}
                    </td>
                    <td className="num" style={{ color: 'var(--ink-3)' }}>{fmtNum(p.vendido)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-icon" title="Editar" onClick={() => setEdit(p)} style={{ width: 32, height: 32 }}>
                          <Icon name="edit" size={15} />
                        </button>
                        <button className="btn btn-ghost btn-icon" title="Eliminar" onClick={() => handleDelete(p)} style={{ width: 32, height: 32, color: 'var(--danger)' }}>
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

      {/* Modal importación masiva */}
      {showImport && (
        <ImportProductosModal
          onClose={() => setShowImport(false)}
          importarMasivo={importarMasivo}
        />
      )}
    </div>
  )
}
