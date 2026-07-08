'use client'

// ---------- Transacciones: historial de ventas con detalle completo ----------
import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTransacciones, type VentaRow, type VentaUpdatePatch, type EditItem, type ClienteSnap } from '@/hooks/useTransacciones'
import { useConfiguracion } from '@/hooks/useConfiguracion'
import { useProductos, type Producto } from '@/hooks/useProductos'
import { useGo } from '@/lib/nav'
import { fmtCLP } from '@/lib/format'
import { exportVentasExcel, parseExcel, downloadTemplate } from '@/lib/excel'
import { type BolataImport } from '@/hooks/useTransacciones'
import { Icon } from '@/components/icon'
import { PageHeader, Metric, Modal, EmptyState, SearchBox, CatDot, Field } from '@/components/ui'

type Filtro = 'todas' | 'local' | 'despacho' | 'credito'

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'local', label: 'Mostrador' },
  { id: 'despacho', label: 'Despachos' },
  { id: 'credito', label: 'A crédito' },
]

function fechaHora(d: Date) {
  return {
    fecha: d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' }),
    hora: d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
  }
}

export default function TransaccionesPage() {
  const { ventas, anular, actualizar, importarMasivoVentas } = useTransacciones()
  const { config } = useConfiguracion()
  const { productos } = useProductos()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [q, setQ] = useState('')
  const [detalle, setDetalle] = useState<VentaRow | null>(null)
  const [editar, setEditar] = useState<VentaRow | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase()
    const lista = ventas.filter((s) => {
      if (filtro === 'local' && s.tipo !== 'local') return false
      if (filtro === 'despacho' && s.tipo !== 'despacho') return false
      if (filtro === 'credito' && !s.credito) return false
      if (!term) return true
      const enCliente = (s.cliente_snapshot?.nombre || '').toLowerCase().includes(term)
      const enBoleta = String(s.boleta).includes(term)
      const enProducto = s.items.some((it) => it.nombre.toLowerCase().includes(term))
      return enCliente || enBoleta || enProducto
    })
    return sortOrder === 'desc'
      ? [...lista].sort((a, b) => b.created_at.localeCompare(a.created_at))
      : [...lista].sort((a, b) => a.created_at.localeCompare(b.created_at))
  }, [ventas, filtro, q, sortOrder])

  const m = useMemo(() => {
    const monto = filtradas.reduce((a, s) => a + s.total, 0)
    const credito = filtradas.filter((s) => s.credito && !s.pagado)
    return {
      count: filtradas.length,
      monto,
      ticket: filtradas.length ? monto / filtradas.length : 0,
      pendiente: credito.reduce((a, s) => a + s.monto_pendiente, 0),
      pendienteN: credito.length,
    }
  }, [filtradas])

  return (
    <div className="fade-in">
      <PageHeader title="Transacciones" sub="Historial de ventas. Haz clic en una para ver el detalle completo.">
        <div className="chip chip-neutral tnum" style={{ fontSize: 13 }}>
          <Icon name="receipt" size={13} />
          {m.count} transaccion{m.count === 1 ? '' : 'es'}
        </div>
        <button
          className="btn btn-soft"
          style={{ fontSize: 13 }}
          onClick={() => setShowImport(true)}
        >
          <Icon name="arrowUp" size={15} />
          Importar
        </button>
        <button
          className="btn btn-soft"
          style={{ fontSize: 13 }}
          disabled={filtradas.length === 0}
          onClick={() => exportVentasExcel(filtradas, `ventas_${new Date().toISOString().slice(0, 10)}.xlsx`)}
        >
          <Icon name="download" size={15} />
          Exportar
        </button>
      </PageHeader>

      {/* Métricas */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 18 }}>
        <Metric icon="receipt" label="Transacciones" value={m.count} tone="primary" />
        <Metric icon="cash" label="Monto total" value={fmtCLP(m.monto)} tone="info" />
        <Metric icon="reportes" label="Ticket promedio" value={fmtCLP(Math.round(m.ticket))} tone="terra" />
        <Metric icon="alert" label="Por cobrar (fiado)" value={fmtCLP(m.pendiente)} sub={m.pendienteN > 0 ? `${m.pendienteN} a crédito` : 'Todo cobrado'} tone={m.pendiente > 0 ? 'warn' : 'primary'} />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={'btn ' + (filtro === f.id ? 'btn-primary' : 'btn-ghost')}
              style={{ fontSize: 13, padding: '7px 14px' }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <SearchBox value={q} onChange={setQ} placeholder="Buscar boleta, cliente o producto…" width={260} />
        </div>
      </div>

      {/* Lista */}
      <div className="card">
        {filtradas.length === 0 ? (
          <EmptyState icon="receipt" title="Sin transacciones" text="No hay ventas que coincidan con el filtro o la búsqueda." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Encabezado (solo desktop) */}
            <div className="tx-head" style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px 130px 40px', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <div>Boleta</div>
              <div>Cliente / Detalle</div>
              <button
                onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 'inherit', fontWeight: 'inherit', color: 'var(--primary)', textTransform: 'inherit', letterSpacing: 'inherit' }}
              >
                Fecha
                <Icon name={sortOrder === 'desc' ? 'chevD' : 'arrowUp'} size={13} />
              </button>
              <div style={{ textAlign: 'right' }}>Total</div>
              <div />
            </div>
            {filtradas.map((s) => {
              const { fecha, hora } = fechaHora(new Date(s.created_at))
              const nProd = s.items.reduce((a, it) => a + it.qty, 0)
              const cliente = s.cliente_snapshot?.nombre || 'Venta de mostrador'
              return (
                <button
                  key={s.id}
                  onClick={() => setDetalle(s)}
                  className="tx-row"
                  style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px 130px 40px', gap: 12, alignItems: 'center', padding: '14px 18px', background: 'none', border: 'none', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'var(--line)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                >
                  <div className="tnum" style={{ fontWeight: 800, fontSize: 13.5 }}>N° {s.boleta}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cliente}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                      <span>{nProd} producto{nProd === 1 ? '' : 's'}</span>
                      <span>·</span>
                      <span className="chip chip-neutral" style={{ padding: '1px 8px', fontSize: 11 }}>
                        <Icon name={s.tipo === 'despacho' ? 'truck' : 'store'} size={11} />{s.tipo === 'despacho' ? 'Despacho' : 'Mostrador'}
                      </span>
                      {s.credito ? (
                        <span className={'chip ' + (s.pagado ? 'chip-ok' : 'chip-danger')} style={{ padding: '1px 8px', fontSize: 11 }}>{s.pagado ? 'Crédito pagado' : 'Fiado pendiente'}</span>
                      ) : (
                        <span className="chip chip-neutral" style={{ padding: '1px 8px', fontSize: 11 }}>{s.metodo_pago}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600 }}>
                    <div>{fecha}</div>
                    <div style={{ color: 'var(--ink-3)', fontSize: 11.5 }}>{hora}</div>
                  </div>
                  <div className="tnum" style={{ textAlign: 'right', fontWeight: 800, fontSize: 15 }}>{fmtCLP(s.total)}</div>
                  <div style={{ display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}><Icon name="chevR" size={16} /></div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {showImport && (
        <ImportVentasModal
          onClose={() => setShowImport(false)}
          importarMasivoVentas={importarMasivoVentas}
        />
      )}

      {detalle && (
        <DetalleModal
          venta={detalle}
          onClose={() => setDetalle(null)}
          onEditar={(v) => { setDetalle(null); setEditar(v) }}
          onAnular={anular}
        />
      )}
      {editar && (
        <EditarModal
          venta={editar}
          onClose={() => setEditar(null)}
          actualizar={actualizar}
          metodosPago={config.metodos_pago}
          productos={productos}
        />
      )}

      <style>{'@media(max-width:640px){.tx-head{display:none!important}.tx-row{grid-template-columns:1fr auto!important}.tx-row>:nth-child(3){display:none}.tx-row>:nth-child(5){display:none}}'}</style>
    </div>
  )
}

/* ---------- Import masivo de ventas ---------- */

const IV_HEADERS = [
  'Boleta *', 'Fecha *', 'Hora', 'Categoría', 'Producto *',
  'Cantidad *', 'Precio Unitario *', 'Costo Item',
  'Método Pago', 'Tipo Venta', 'Cliente', 'Ciudad',
  'Teléfono', 'Correo', 'Descuento Boleta', 'Total Boleta',
]
const IV_EXAMPLE: Record<string, string> = {
  'Boleta': '46736', 'Fecha': '07-07-2026', 'Hora': '06:53',
  'Categoría': 'Huevos', 'Producto': 'Extra — 30 un.', 'Cantidad': '2',
  'Precio Unitario': '8550', 'Costo Item': '6150', 'Método Pago': 'Efectivo',
  'Tipo Venta': 'local', 'Cliente': '', 'Ciudad': '', 'Teléfono': '',
  'Correo': '', 'Descuento Boleta': '0', 'Total Boleta': '17100',
}

interface VIRow {
  idx: number
  boleta: number | null
  fechaISO: string | null
  fechaDisplay: string
  categoria: string
  nombre: string
  qty: number | null
  precio: number | null
  costoUnitario: number | null
  metodoPago: string
  tipo: 'local' | 'despacho'
  clienteNombre: string
  ciudad: string
  telefono: string
  correo: string
  descuento: number
  errors: string[]
}

function parseHoraStr(hora: string): { h: number; m: number } | null {
  const s = hora.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ')
  const pm = /p\s*m/.test(s)
  const am = /a\s*m/.test(s)
  const m = s.match(/(\d{1,2}):(\d{2})/)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (pm && h < 12) h += 12
  if (am && h === 12) h = 0
  return (h <= 23 && min <= 59) ? { h, m: min } : null
}

function parseFechaISO(fecha: string, hora: string): string | null {
  const fm = fecha.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (!fm) return null
  const [, dd, mm, yyyy] = fm
  const t = parseHoraStr(hora) ?? { h: 12, m: 0 }
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}:00`
}

function parseNumIV(s: string): number | null {
  const v = Number(s.trim().replace(',', '.'))
  return isNaN(v) ? null : v
}

function validateVentasRows(raw: Record<string, string>[]): VIRow[] {
  return raw.map((r, idx) => {
    const errors: string[] = []

    const boletaRaw = (r['boleta *'] ?? r['boleta'] ?? '').trim()
    const boletaNum = boletaRaw ? parseInt(boletaRaw, 10) : null
    if (!boletaRaw) errors.push('Boleta requerida')
    else if (!boletaNum || boletaNum <= 0 || !Number.isInteger(boletaNum)) errors.push('Boleta debe ser número entero positivo')

    const fechaRaw = (r['fecha *'] ?? r['fecha'] ?? '').trim()
    const horaRaw = (r['hora'] ?? '').trim()
    const fechaISO = fechaRaw ? parseFechaISO(fechaRaw, horaRaw) : null
    if (!fechaRaw) errors.push('Fecha requerida')
    else if (!fechaISO) errors.push('Fecha inválida (DD-MM-YYYY)')

    const nombre = (r['producto *'] ?? r['producto'] ?? '').trim()
    if (!nombre) errors.push('Producto requerido')

    const qtyRaw = (r['cantidad *'] ?? r['cantidad'] ?? '').trim()
    const qty = qtyRaw ? parseNumIV(qtyRaw) : null
    if (!qtyRaw) errors.push('Cantidad requerida')
    else if (qty === null || qty <= 0) errors.push('Cantidad debe ser > 0')

    const precioRaw = (r['precio unitario *'] ?? r['precio unitario'] ?? '').trim()
    const precio = precioRaw ? parseNumIV(precioRaw) : null
    if (!precioRaw) errors.push('Precio Unitario requerido')
    else if (precio === null || precio < 0) errors.push('Precio Unitario inválido')

    const costoRaw = (r['costo item'] ?? '').trim()
    const costoUnitario = costoRaw ? parseNumIV(costoRaw) : null

    const descuentoRaw = (r['descuento boleta'] ?? '0').trim()
    const descuento = parseNumIV(descuentoRaw) ?? 0

    const tipoRaw = (r['tipo venta'] ?? '').trim().toLowerCase()

    return {
      idx,
      boleta: boletaNum && boletaNum > 0 ? boletaNum : null,
      fechaISO,
      fechaDisplay: fechaRaw,
      categoria: (r['categoria'] ?? '').trim(),
      nombre,
      qty,
      precio,
      costoUnitario,
      metodoPago: (r['metodo pago'] ?? 'Efectivo').trim() || 'Efectivo',
      tipo: tipoRaw === 'despacho' ? 'despacho' : 'local',
      clienteNombre: (r['cliente'] ?? '').trim(),
      ciudad: (r['ciudad'] ?? '').trim(),
      telefono: (r['telefono'] ?? '').trim(),
      correo: (r['correo'] ?? '').trim(),
      descuento,
      errors,
    }
  })
}

function buildBoletas(rows: VIRow[]): BolataImport[] {
  const map = new Map<number, VIRow[]>()
  for (const r of rows) {
    if (r.boleta === null) continue
    const existing = map.get(r.boleta) ?? []
    existing.push(r)
    map.set(r.boleta, existing)
  }
  const result: BolataImport[] = []
  for (const [boleta, bRows] of map) {
    const first = bRows[0]
    const items = bRows
      .filter(r => r.nombre && r.qty !== null && r.precio !== null)
      .map(r => ({
        nombre: r.nombre,
        categoria: r.categoria,
        qty: r.qty!,
        precio: r.precio!,
        costo_unitario: r.costoUnitario ?? 0,
      }))
    const subtotal = items.reduce((a, i) => a + i.precio * i.qty, 0)
    const descuento = first.descuento
    const total = Math.max(0, subtotal - descuento)
    const costo = items.reduce((a, i) => a + i.costo_unitario * i.qty, 0)
    result.push({
      boleta,
      created_at: first.fechaISO ?? new Date().toISOString(),
      tipo: first.tipo,
      metodo_pago: first.metodoPago,
      total,
      costo,
      ganancia: total - costo,
      descuento,
      cliente: first.clienteNombre
        ? { nombre: first.clienteNombre, ciudad: first.ciudad || undefined, telefono: first.telefono || undefined, correo: first.correo || undefined }
        : null,
      items,
    })
  }
  return result
}

function ImportVentasModal({ onClose, importarMasivoVentas }: {
  onClose: () => void
  importarMasivoVentas: (boletas: BolataImport[]) => Promise<void>
}) {
  const [rows, setRows] = useState<VIRow[]>([])
  const [step, setStep] = useState<'template' | 'preview'>('template')
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const hasErrors = rows.some(r => r.errors.length > 0)
  const boletas = !hasErrors ? buildBoletas(rows.filter(r => r.errors.length === 0)) : []
  const nBoletas = new Set(rows.filter(r => r.boleta !== null).map(r => r.boleta)).size

  async function handleFile(file: File) {
    setErrorMsg(null)
    try {
      const raw = await parseExcel(file)
      if (raw.length === 0) { setErrorMsg('El archivo está vacío o sin datos.'); return }
      const validated = validateVentasRows(raw)
      setRows(validated)
      setStep('preview')
    } catch {
      setErrorMsg('No se pudo leer el archivo. Usa el formato .xlsx de la plantilla.')
    }
  }

  async function handleImport() {
    if (hasErrors || boletas.length === 0) return
    setImporting(true)
    setErrorMsg(null)
    try {
      await importarMasivoVentas(boletas)
      onClose()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Error al importar')
    } finally {
      setImporting(false)
    }
  }

  const dropProps = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragging(true) },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault(); setDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
  }

  return (
    <Modal
      title="Importar ventas"
      sub="Carga masiva de ventas históricas. No modifica el stock existente."
      onClose={onClose}
      width={700}
      footer={
        step === 'preview' ? (
          <>
            <button className="btn btn-ghost" onClick={() => setStep('template')}>Volver</button>
            <button
              className="btn btn-primary"
              disabled={hasErrors || boletas.length === 0 || importing}
              onClick={handleImport}
            >
              <Icon name="check" size={16} />
              {importing ? 'Importando…' : `Importar ${nBoletas} boleta${nBoletas !== 1 ? 's' : ''}`}
            </button>
          </>
        ) : (
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        )
      }
    >
      {step === 'template' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'var(--surface-3)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Paso 1 — Descarga la plantilla</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600, lineHeight: 1.6 }}>
              Una fila por línea de producto. Agrupa items de la misma boleta repitiendo el mismo número en la columna <strong>Boleta</strong>.
              Los campos marcados con <strong>*</strong> son obligatorios. <strong>Costo Item</strong> es el <strong>costo unitario</strong> del producto (igual al formato del export).
            </div>
            <button
              className="btn btn-soft"
              style={{ alignSelf: 'flex-start', fontSize: 13.5 }}
              onClick={() => downloadTemplate('plantilla_ventas.xlsx', IV_HEADERS, IV_EXAMPLE)}
            >
              <Icon name="download" size={15} />Descargar plantilla Excel
            </button>
          </div>

          <div style={{ background: 'var(--surface-3)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Paso 2 — Sube el archivo</div>
            <div
              {...dropProps}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--line)'}`,
                borderRadius: 10, padding: '28px 20px', textAlign: 'center',
                cursor: 'pointer', transition: 'border-color .15s',
                background: dragging ? 'var(--primary-tint)' : 'transparent',
              }}
            >
              <Icon name="arrowUp" size={28} style={{ color: 'var(--ink-3)', marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontSize: 14 }}>Arrastra aquí el archivo</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 4 }}>o haz clic para seleccionar (.xlsx o .csv)</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>
          </div>

          {errorMsg && (
            <div style={{ padding: '10px 14px', background: 'var(--danger-tint, oklch(0.97 0.02 10))', borderRadius: 10, fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>
              <Icon name="alert" size={14} /> {errorMsg}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{rows.length} filas · {nBoletas} boleta{nBoletas !== 1 ? 's' : ''}</span>
            {hasErrors
              ? <span className="chip chip-danger" style={{ fontSize: 12 }}><Icon name="alert" size={12} /> Hay errores — corrígelos antes de importar</span>
              : <span className="chip chip-ok" style={{ fontSize: 12 }}><Icon name="check" size={12} /> Sin errores</span>
            }
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12.5 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-3)', fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                  {['Boleta', 'Fecha', 'Producto', 'Cant.', 'Precio', 'Método', 'Errores'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.idx}
                    style={{ borderTop: '1px solid var(--line)', background: r.errors.length > 0 ? 'oklch(0.97 0.02 10)' : 'var(--surface)' }}
                  >
                    <td style={{ padding: '7px 10px', fontWeight: 800 }}>{r.boleta ?? '—'}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--ink-2)' }}>{r.fechaDisplay || '—'}</td>
                    <td style={{ padding: '7px 10px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre || '—'}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right' }}>{r.qty ?? '—'}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right' }}>{r.precio != null ? fmtCLP(r.precio) : '—'}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--ink-2)' }}>{r.metodoPago}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--danger)', fontWeight: 700 }}>
                      {r.errors.length > 0 ? r.errors.join(' · ') : <span style={{ color: 'var(--ok)' }}><Icon name="check" size={13} /></span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {errorMsg && (
            <div style={{ padding: '10px 14px', background: 'oklch(0.97 0.02 10)', borderRadius: 10, fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>
              <Icon name="alert" size={14} /> {errorMsg}
            </div>
          )}

          {!hasErrors && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, lineHeight: 1.6 }}>
              <Icon name="alert" size={13} /> Esta importación <strong>no modifica el stock</strong> de los productos. Es solo para registrar ventas históricas.
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

/* ---------- Detalle de una transacción ---------- */
function DetalleModal({ venta, onClose, onEditar, onAnular }: {
  venta: VentaRow
  onClose: () => void
  onEditar: (v: VentaRow) => void
  onAnular: (id: string) => Promise<void>
}) {
  const go = useGo()
  const { fecha, hora } = fechaHora(new Date(venta.created_at))
  const cl = venta.cliente_snapshot
  const totalPagado = venta.pagos.reduce((a, p) => a + p.monto, 0)

  const eliminar = async () => {
    if (window.confirm(`¿Eliminar la transacción N° ${venta.boleta}? Se repondrá el stock de los productos vendidos. Esta acción no se puede deshacer.`)) {
      await onAnular(venta.id)
      onClose()
    }
  }

  return (
    <Modal
      title={`Boleta N° ${venta.boleta}`}
      sub={`${fecha} · ${hora}`}
      onClose={onClose}
      width={580}
      footer={
        <>
          {cl && (
            <button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={() => { go(`/clientes?cliente=${encodeURIComponent(cl.nombre)}`); onClose() }}>
              <Icon name="clientes" size={16} />Ver cliente
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => onEditar(venta)}>
            <Icon name="edit" size={16} />Editar
          </button>
          <button className="btn" style={{ background: 'var(--danger)', color: '#fff' }} onClick={eliminar}>
            <Icon name="trash" size={16} />Eliminar
          </button>
        </>
      }
    >
      {/* Resumen superior */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <span className="chip chip-neutral" style={{ fontSize: 12.5 }}>
          <Icon name={venta.tipo === 'despacho' ? 'truck' : 'store'} size={13} />
          {venta.tipo === 'despacho' ? 'Despacho' : 'Mostrador'}
        </span>
        <span className="chip chip-neutral" style={{ fontSize: 12.5 }}>
          <Icon name={venta.metodo_pago === 'Tarjeta' ? 'card' : venta.metodo_pago === 'Crédito' ? 'receipt' : 'cash'} size={13} />
          {venta.metodo_pago}
        </span>
        {venta.credito && (
          <span className={'chip ' + (venta.pagado ? 'chip-ok' : 'chip-danger')} style={{ fontSize: 12.5 }}>
            {venta.pagado ? 'Pagado' : `Pendiente ${fmtCLP(venta.monto_pendiente)}`}
          </span>
        )}
      </div>

      {/* Cliente */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Cliente</div>
        {cl ? (
          <div className="card" style={{ padding: '12px 14px', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{cl.nombre}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>
              {(cl.telefono || cl.numero) && <span><Icon name="bell" size={12} /> {cl.telefono || cl.numero}</span>}
              {cl.ciudad && <span><Icon name="store" size={12} /> {cl.ciudad}</span>}
              {cl.correo && <span>{cl.correo}</span>}
            </div>
            {cl.direccion && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{cl.direccion}</div>}
          </div>
        ) : (
          <div style={{ fontSize: 13.5, color: 'var(--ink-3)', fontWeight: 600 }}>Venta de mostrador (sin cliente registrado).</div>
        )}
      </div>

      {/* Productos */}
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Productos</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 11, overflow: 'hidden', border: '1px solid var(--line)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 54px 90px 100px', gap: 8, padding: '8px 12px', background: 'var(--surface-3)', fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase' }}>
          <div>Producto</div>
          <div style={{ textAlign: 'center' }}>Cant.</div>
          <div style={{ textAlign: 'right' }}>Precio</div>
          <div style={{ textAlign: 'right' }}>Subtotal</div>
        </div>
        {venta.items.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 54px 90px 100px', gap: 8, padding: '10px 12px', alignItems: 'center', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <CatDot cat={it.categoria} />
              <span style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.nombre}</span>
            </div>
            <div className="tnum" style={{ textAlign: 'center', fontWeight: 700, fontSize: 13.5 }}>{it.qty}</div>
            <div className="tnum" style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink-2)' }}>{fmtCLP(it.precio)}</div>
            <div className="tnum" style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5 }}>{fmtCLP(it.precio * it.qty)}</div>
          </div>
        ))}
      </div>

      {/* Totales */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <Linea label="Total venta" value={fmtCLP(venta.total)} bold />
        <Linea label="Ganancia estimada" value={fmtCLP(venta.ganancia)} tone="primary" />
        {venta.credito && (
          <>
            <Linea label="Abonado" value={fmtCLP(totalPagado)} />
            <Linea label="Saldo pendiente" value={fmtCLP(venta.monto_pendiente)} tone={venta.pagado ? 'primary' : 'danger'} />
          </>
        )}
      </div>

      {/* Historial de pagos del fiado */}
      {venta.credito && venta.pagos.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Abonos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {venta.pagos.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
                <span>{new Date(p.created_at).toLocaleDateString('es-CL')}{p.metodo ? ` · ${p.metodo}` : ''}</span>
                <span className="tnum" style={{ fontWeight: 700 }}>{fmtCLP(p.monto)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ---------- Picker para agregar una línea a una boleta ---------- */
function AgregarLineaProducto({ tipo, onAdd, onCancel, cabeBase, productos }: {
  tipo: 'local' | 'despacho'
  onAdd: (it: EditItem) => void
  onCancel: () => void
  cabeBase: (productoId: string, delta: number) => boolean
  productos: Producto[]
}) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const lista = productos.filter((p) => p.nombre.toLowerCase().includes(q.toLowerCase()) && p.activo).slice(0, 8)
  const selProd = sel != null ? productos.find((p) => p.id === sel) : null
  const precio = (p: Producto) => tipo === 'despacho' ? (p.precio_despacho ?? p.precio) : p.precio

  const addSimple = (p: Producto) => {
    if (!cabeBase(p.id, 1)) return
    onAdd({ producto_id: p.id, nombre: p.nombre, categoria: p.categoria, qty: 1, precio: precio(p), costo: p.costo, unidades_base: 1 })
  }

  if (selProd) {
    return (
      <div style={{ padding: 12, background: 'var(--surface-3)', borderRadius: 11, border: '1px dashed var(--primary)', display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={() => setSel(null)}><Icon name="chevR" size={14} style={{ transform: 'rotate(180deg)' }} /></button>
          <span style={{ fontWeight: 800, fontSize: 14, flex: 1 }}>{selProd.nombre}</span>
        </div>
        <button className="btn btn-ghost" style={{ justifyContent: 'space-between', fontSize: 13.5 }} disabled={!cabeBase(selProd.id, 1)} onClick={() => addSimple(selProd)}>
          <span style={{ fontWeight: 700 }}>1 unidad</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{cabeBase(selProd.id, 1) ? fmtCLP(precio(selProd)) : 'sin stock'}</span>
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 12, background: 'var(--surface-3)', borderRadius: 11, border: '1px dashed var(--primary)', display: 'grid', gap: 10 }}>
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" autoFocus />
      <div style={{ display: 'grid', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
        {lista.map((p) => {
          const sinStock = p.stock <= 0
          return (
            <button key={p.id} className="btn btn-ghost" style={{ justifyContent: 'space-between', fontSize: 13.5, opacity: sinStock ? 0.5 : 1 }} disabled={sinStock} onClick={() => addSimple(p)}>
              <span style={{ fontWeight: 700 }}>{p.nombre}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{`${p.stock} u · ${fmtCLP(precio(p))}`}</span>
            </button>
          )
        })}
        {lista.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, padding: 6 }}>Sin productos que coincidan.</div>}
      </div>
      <button className="btn btn-ghost" style={{ fontSize: 13, alignSelf: 'flex-start' }} onClick={onCancel}>Cancelar</button>
    </div>
  )
}

/* ---------- Editar una transacción ---------- */
function EditarModal({ venta, onClose, actualizar, metodosPago, productos }: {
  venta: VentaRow
  onClose: () => void
  actualizar: (id: string, patch: VentaUpdatePatch, items?: EditItem[]) => Promise<void>
  metodosPago: string[]
  productos: Producto[]
}) {
  const cl = venta.cliente_snapshot
  const [tipo, setTipo] = useState<'local' | 'despacho'>(venta.tipo)
  const [metodo, setMetodo] = useState(venta.metodo_pago)
  const [editItems, setEditItems] = useState<EditItem[]>(
    venta.items.map(i => ({ producto_id: i.producto_id, nombre: i.nombre, categoria: i.categoria, qty: i.qty, precio: i.precio, costo: i.costo, unidades_base: i.unidades_base }))
  )
  const [agregando, setAgregando] = useState(false)
  const [conCliente, setConCliente] = useState(!!cl)
  const [nombre, setNombre] = useState(cl?.nombre || '')
  const [telefono, setTelefono] = useState(cl?.telefono || cl?.numero || '')
  const [ciudad, setCiudad] = useState(cl?.ciudad || '')
  const [direccion, setDireccion] = useState(cl?.direccion || '')
  const [depto, setDepto] = useState(cl?.depto || '')
  const [correo, setCorreo] = useState(cl?.correo || '')
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Despacho lock state — loaded on mount when tipo=despacho
  const [despachoEstado, setDespachoEstado] = useState<{ estado: string; optiroute_id: string | null } | null>(null)
  useEffect(() => {
    if (venta.tipo !== 'despacho') return
    const supabase = createClient()
    supabase
      .from('despachos')
      .select('estado, optiroute_id')
      .eq('venta_id', venta.id)
      .maybeSingle()
      .then(({ data }: { data: { estado: string; optiroute_id: string | null } | null }) => { if (data) setDespachoEstado(data) })
  }, [venta.id, venta.tipo])
  const bloqueado = !!despachoEstado && (despachoEstado.estado === 'en_ruta' || despachoEstado.estado === 'entregado' || !!despachoEstado.optiroute_id)

  const toast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3500) }

  const metodos = [...new Set([...metodosPago, venta.metodo_pago])]

  // Stock budget: current stock + what this venta originally reserved
  const presupuestoBase = (productoId: string) => {
    const prod = productos.find((p) => p.id === productoId)
    if (!prod) return 0
    const reservado = venta.items.filter(i => i.producto_id === productoId).reduce((a, i) => a + i.unidades_base, 0)
    return prod.stock + reservado
  }
  const currentEditBase = (productoId: string) =>
    editItems.filter(i => i.producto_id === productoId).reduce((a, i) => a + i.unidades_base, 0)
  const cabeBase = (productoId: string, delta: number) =>
    currentEditBase(productoId) + delta <= presupuestoBase(productoId) + 1e-9

  const setQty = (idx: number, nueva: number) => {
    setEditItems(its => its.map((it, i) => i === idx ? { ...it, qty: Math.max(1, nueva), unidades_base: Math.max(1, nueva) } : it))
  }
  const incQty = (idx: number) => {
    const it = editItems[idx]
    if (!it.producto_id || !cabeBase(it.producto_id, 1)) { toast('No hay stock para sumar otra unidad'); return }
    setQty(idx, it.qty + 1)
  }
  const quitar = (idx: number) => setEditItems(its => its.filter((_, i) => i !== idx))
  const agregarItem = (it: EditItem) => { setEditItems(its => [...its, it]); setAgregando(false) }

  const bruto = editItems.reduce((a, i) => a + i.precio * i.qty, 0)
  const costoTotal = editItems.reduce((a, i) => a + i.costo * i.qty, 0)
  const descMonto = venta.descuento_tipo
    ? venta.descuento_tipo === 'pct'
      ? Math.round((bruto * (venta.descuento_valor ?? 0)) / 100)
      : Math.min(venta.descuento_valor ?? 0, bruto)
    : 0
  const total = bruto - descMonto

  const despachoListo = nombre.trim() && direccion.trim() && ciudad.trim() && telefono.trim()
  const faltaDespacho = tipo === 'despacho' && (!conCliente || !despachoListo)
  const sinItems = editItems.length === 0

  const guardar = async () => {
    if (faltaDespacho) { toast('Para un despacho faltan datos: nombre, dirección, comuna y teléfono.'); return }
    if (sinItems) { toast('La boleta debe tener al menos un producto.'); return }

    const clienteSnap: ClienteSnap | null = conCliente && nombre.trim()
      ? {
          id: cl?.id,
          nombre: nombre.trim(),
          telefono: telefono.trim() || undefined,
          ciudad: ciudad.trim() || undefined,
          direccion: direccion.trim() || undefined,
          correo: correo.trim() || undefined,
          depto: depto.trim() || undefined,
        }
      : null

    const esCredito = metodo === 'Crédito'
    const totalPagado = venta.pagos.reduce((a, p) => a + p.monto, 0)

    const itemsCambiaron = !(
      editItems.length === venta.items.length &&
      editItems.every((ei, j) => {
        const vi = venta.items[j]
        return ei.producto_id === vi.producto_id && ei.qty === vi.qty && ei.precio === vi.precio
      })
    )

    setGuardando(true)
    try {
      await actualizar(
        venta.id,
        {
          tipo,
          metodo_pago: metodo,
          cliente_snapshot: clienteSnap,
          credito: esCredito,
          pagado: esCredito ? totalPagado >= total : true,
          monto_pendiente: esCredito ? Math.max(0, total - totalPagado) : 0,
          ...(metodo !== venta.metodo_pago ? { pago_mixto_metodo: null, pago_mixto_monto: null } : {}),
          ...(itemsCambiaron ? { total, costo: costoTotal, ganancia: total - costoTotal } : {}),
        },
        itemsCambiaron ? editItems : undefined,
      )
      onClose()
    } catch {
      toast('Error al guardar los cambios')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      title={`Editar boleta N° ${venta.boleta}`}
      sub="Edita productos, tipo, pago y datos del cliente de esta venta."
      onClose={onClose}
      width={560}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={guardar} disabled={faltaDespacho || sinItems || guardando}>
            <Icon name="check" size={16} />{guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {bloqueado && (
          <div style={{ fontSize: 12.5, color: 'oklch(0.50 0.10 70)', fontWeight: 700, lineHeight: 1.5, background: 'var(--warn-tint)', borderRadius: 10, padding: '10px 12px' }}>
            <Icon name="truck" size={13} /> Este despacho ya {despachoEstado?.estado === 'entregado' ? 'fue entregado' : despachoEstado?.optiroute_id ? 'fue enviado a OptiRoute' : 'salió a ruta'}: no puedes cambiar los productos ni el tipo. Sí puedes corregir el pago y los datos de contacto.
          </div>
        )}

        {/* ── Productos ── */}
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-2)', flex: 1 }}>Productos</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)' }}>{editItems.length} línea{editItems.length !== 1 ? 's' : ''}</span>
          </div>
          {editItems.map((it, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--surface-3)', borderRadius: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.nombre}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{fmtCLP(it.precio)} c/u · {fmtCLP(it.precio * it.qty)}</div>
              </div>
              {!bloqueado ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={() => (it.qty <= 1 ? quitar(idx) : setQty(idx, it.qty - 1))}><Icon name={it.qty <= 1 ? 'trash' : 'minus'} size={13} /></button>
                  <span className="tnum" style={{ minWidth: 26, textAlign: 'center', fontWeight: 800, fontSize: 14 }}>{it.qty}</span>
                  <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={() => incQty(idx)}><Icon name="plus" size={13} /></button>
                </div>
              ) : (
                <span className="tnum" style={{ fontWeight: 800, fontSize: 14 }}>×{it.qty}</span>
              )}
              {!bloqueado && <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28, color: 'var(--danger)' }} onClick={() => quitar(idx)}><Icon name="trash" size={13} /></button>}
            </div>
          ))}
          {sinItems && <div style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 700 }}>La boleta quedó sin productos. Agrega al menos uno.</div>}

          {!bloqueado && (agregando ? (
            <AgregarLineaProducto tipo={tipo} onAdd={agregarItem} onCancel={() => setAgregando(false)} cabeBase={cabeBase} productos={productos} />
          ) : (
            <button className="btn btn-soft" style={{ fontSize: 13.5, alignSelf: 'flex-start' }} onClick={() => setAgregando(true)}><Icon name="plus" size={15} />Agregar producto</button>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 2px 0', borderTop: '1px solid var(--line)', marginTop: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)' }}>{descMonto > 0 ? `Total (con descuento ${fmtCLP(descMonto)})` : 'Total'}</span>
            <span className="tnum" style={{ fontWeight: 800, fontSize: 16 }}>{fmtCLP(total)}</span>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Tipo de venta">
            <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value as 'local' | 'despacho')} disabled={bloqueado}>
              <option value="local">Mostrador</option>
              <option value="despacho">Despacho</option>
            </select>
          </Field>
          <Field label="Método de pago">
            <select className="select" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              {metodos.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
            </select>
          </Field>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: 'var(--ink-2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={conCliente} onChange={(e) => setConCliente(e.target.checked)} />
          Asociar datos de cliente a esta venta
        </label>

        {conCliente && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Nombre"><input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del cliente" /></Field>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Teléfono"><input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></Field>
              <Field label="Ciudad"><input className="input" value={ciudad} onChange={(e) => setCiudad(e.target.value)} /></Field>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Field label="Dirección" hint="Necesaria para despachos."><input className="input" value={direccion} onChange={(e) => setDireccion(e.target.value)} /></Field>
              <Field label="Depto / casa"><input className="input" value={depto} onChange={(e) => setDepto(e.target.value)} placeholder="Opcional" /></Field>
            </div>
            <Field label="Correo"><input className="input" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} /></Field>
          </div>
        )}

        {faltaDespacho && (
          <div style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 700, lineHeight: 1.5 }}>
            <Icon name="alert" size={13} /> Para guardar como <strong>despacho</strong> necesitas nombre, dirección, comuna y teléfono del cliente.
          </div>
        )}

        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, lineHeight: 1.5 }}>
          <Icon name="alert" size={13} /> Si pasas esta venta a <strong>despacho</strong>, se crea el pedido en Despachos; si la vuelves a mostrador, se quita. Para cambiar la ficha permanente del cliente, usa <strong>&ldquo;Ver cliente&rdquo;</strong> → Clientes.
        </div>

        {toastMsg && (
          <div style={{ padding: '10px 14px', background: 'var(--warn-tint)', borderRadius: 10, fontSize: 13, fontWeight: 700, color: 'oklch(0.50 0.10 70)' }}>
            <Icon name="alert" size={14} /> {toastMsg}
          </div>
        )}
      </div>
    </Modal>
  )
}

function Linea({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: 'primary' | 'danger' }) {
  const color = tone === 'primary' ? 'var(--primary-700)' : tone === 'danger' ? 'var(--danger)' : 'var(--ink)'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: bold ? 15 : 13.5, fontWeight: bold ? 800 : 600, color: bold ? 'var(--ink)' : 'var(--ink-2)' }}>{label}</span>
      <span className="tnum" style={{ fontSize: bold ? 18 : 14, fontWeight: 800, color }}>{value}</span>
    </div>
  )
}
