'use client'

import { useEffect, useMemo, useState } from 'react'
import { useClientes } from '@/hooks/useClientes'
import type { ClienteDB, ClientePatch } from '@/hooks/useClientes'
import { useTransacciones } from '@/hooks/useTransacciones'
import type { VentaRow } from '@/hooks/useTransacciones'
import { useConfiguracion } from '@/hooks/useConfiguracion'
import { fmtCLP, catColor } from '@/lib/format'
import { parseExcel, downloadTemplate } from '@/lib/excel'
import { Icon } from '@/components/icon'
import { PageHeader, Metric, Modal, EmptyState, SearchBox, CatDot, Field } from '@/components/ui'
import { ClienteChip } from '@/components/cliente-chip'

/* ── Types ───────────────────────────────────────── */

interface ClienteMetrics {
  totalGastado: number
  ticketMedio: number
  frecuencia: number | null
  daysSinceLast: number | null
  nextExpected: Date | null
  daysUntilNext: number | null
  categoria: 'VIP' | 'Frecuente' | 'Regular' | 'En riesgo' | 'Nuevo'
  topCats: [string, number][]
  topProductos: { nombre: string; categoria: string; qty: number; total: number }[]
  numCompras: number
}

type EnrichedCliente = ClienteDB & ClienteMetrics

interface Deudor {
  nombre: string
  telefono: string
  ventas: VentaRow[]
  total: number
}

/* ── Pure helpers ─────────────────────────────────── */

function computeMetrics(ventas: VentaRow[]): ClienteMetrics {
  const numCompras = ventas.length
  if (numCompras === 0) {
    return {
      totalGastado: 0, ticketMedio: 0, frecuencia: null, daysSinceLast: null,
      nextExpected: null, daysUntilNext: null, categoria: 'Nuevo',
      topCats: [], topProductos: [], numCompras: 0,
    }
  }
  const sorted = [...ventas].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const totalGastado = ventas.reduce((a, v) => a + v.total, 0)
  const ticketMedio = Math.round(totalGastado / numCompras)

  let frecuencia: number | null = null
  if (sorted.length >= 2) {
    const tiempos = sorted.map(v => new Date(v.created_at).getTime())
    const diffs: number[] = []
    for (let i = 0; i < tiempos.length - 1; i++) diffs.push((tiempos[i] - tiempos[i + 1]) / 86400000)
    frecuencia = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
  }

  const now = Date.now()
  const lastDate = new Date(sorted[0].created_at)
  const daysSinceLast = Math.floor((now - lastDate.getTime()) / 86400000)
  const nextExpected = frecuencia != null ? new Date(lastDate.getTime() + frecuencia * 86400000) : null
  const daysUntilNext = nextExpected != null ? Math.round((nextExpected.getTime() - now) / 86400000) : null

  let categoria: ClienteMetrics['categoria']
  if (numCompras >= 5 && totalGastado >= 100000 && frecuencia != null && frecuencia <= 30) categoria = 'VIP'
  else if (numCompras >= 3 && frecuencia != null && frecuencia <= 45) categoria = 'Frecuente'
  else if (daysSinceLast > 90) categoria = 'En riesgo'
  else if (numCompras <= 1) categoria = 'Nuevo'
  else categoria = 'Regular'

  const catMap: Record<string, number> = {}
  const prodMap: Record<string, { categoria: string; qty: number; total: number }> = {}
  for (const v of ventas) {
    for (const it of v.items) {
      catMap[it.categoria] = (catMap[it.categoria] || 0) + it.precio * it.qty
      if (!prodMap[it.nombre]) prodMap[it.nombre] = { categoria: it.categoria, qty: 0, total: 0 }
      prodMap[it.nombre].qty += it.qty
      prodMap[it.nombre].total += it.precio * it.qty
    }
  }
  const topCats = (Object.entries(catMap) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topProductos = Object.entries(prodMap)
    .map(([nombre, v]) => ({ nombre, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  return { totalGastado, ticketMedio, frecuencia, daysSinceLast, nextExpected, daysUntilNext, categoria, topCats, topProductos, numCompras }
}

function buildVentasCSV(ventas: VentaRow[], label: string) {
  const headers = ['Boleta', 'Fecha', 'Producto', 'Categoría', 'Qty', 'Precio', 'Costo', 'Ganancia', 'Método', 'Cliente']
  const rows: string[][] = []
  for (const v of ventas) {
    const fecha = new Date(v.created_at).toLocaleDateString('es-CL')
    const cliente = v.cliente_snapshot?.nombre || ''
    for (const it of v.items) {
      rows.push([
        String(v.boleta), fecha, it.nombre, it.categoria,
        String(it.qty), String(it.precio), String(it.costo),
        String(Math.round((it.precio - it.costo) * it.qty)),
        v.metodo_pago, cliente,
      ])
    }
  }
  const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ventas_${label}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ── ClienteDetail modal ─────────────────────────── */
function ClienteDetail({
  c,
  ventasDelCliente,
  onClose,
  onActualizar,
  onEliminar,
}: {
  c: EnrichedCliente
  ventasDelCliente: VentaRow[]
  onClose: () => void
  onActualizar: (id: string, patch: ClientePatch) => Promise<void>
  onEliminar: (id: string) => Promise<void>
}) {
  const [nota, setNota] = useState(c.nota || '')
  const [edit, setEdit] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    nombre: c.nombre || '',
    telefono: c.telefono || '',
    correo: c.correo || '',
    direccion: c.direccion || '',
    ciudad: c.ciudad || '',
    depto: c.depto || '',
  })

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const guardarDatos = async () => {
    if (!draft.nombre.trim()) { setToast('El nombre no puede quedar vacío'); return }
    await onActualizar(c.id, {
      nombre: draft.nombre.trim(),
      telefono: draft.telefono.trim() || null,
      correo: draft.correo.trim() || null,
      direccion: draft.direccion.trim() || null,
      ciudad: draft.ciudad.trim() || null,
      depto: draft.depto.trim() || null,
    })
    setToast('Datos del cliente actualizados')
    setEdit(false)
  }

  const eliminarCliente = async () => {
    const deuda = ventasDelCliente.filter(v => v.credito && !v.pagado).reduce((a, v) => a + v.monto_pendiente, 0)
    const aviso = deuda > 0
      ? `${c.nombre} tiene una deuda pendiente de ${fmtCLP(deuda)}. Si lo eliminas, sigue saliendo en Deudores por sus boletas, pero pierdes su ficha y contacto.\n\n¿Eliminar de todas formas?`
      : `Vas a eliminar a ${c.nombre} de tus clientes. Sus ventas quedan en el historial, pero pierdes su ficha y contacto.\n\n¿Eliminar?`
    if (window.confirm(aviso)) { await onEliminar(c.id); onClose() }
  }

  const nextLabel = c.nextExpected
    ? c.daysUntilNext! > 0
      ? `${c.nextExpected.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} · en ${c.daysUntilNext} días`
      : c.daysUntilNext === 0 ? '¡Hoy!'
      : `Hace ${Math.abs(c.daysUntilNext!)} días (atrasada)`
    : 'Sin datos suficientes'
  const nextTone = c.daysUntilNext != null ? (c.daysUntilNext < 0 ? 'danger' : c.daysUntilNext <= 3 ? 'warn' : 'primary') : 'info'
  const maxCat = c.topCats[0]?.[1] || 1

  return (
    <Modal
      title={c.nombre}
      sub={[c.ciudad, c.correo].filter(Boolean).join(' · ')}
      onClose={onClose}
      width={620}
      footer={
        edit ? (
          <>
            <button className="btn btn-ghost" onClick={() => setEdit(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={guardarDatos}>
              <Icon name="check" size={15} />
              Guardar cambios
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--danger)' }} onClick={eliminarCliente}>
              <Icon name="trash" size={15} />
              Eliminar
            </button>
            <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            <button className="btn btn-ghost" onClick={() => setEdit(true)}>
              <Icon name="edit" size={15} />
              Editar datos
            </button>
            <button className="btn btn-primary" onClick={async () => { await onActualizar(c.id, { nota }); onClose() }}>
              <Icon name="check" size={15} />
              Guardar nota
            </button>
          </>
        )
      }
    >
      {toast && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--ok-tint)', color: 'var(--ok)', borderRadius: 10, fontWeight: 700, fontSize: 13.5 }}>
          {toast}
        </div>
      )}
      {edit ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Nombre">
            <input className="input" value={draft.nombre} onChange={(e) => setDraft(d => ({ ...d, nombre: e.target.value }))} placeholder="Nombre del cliente" />
          </Field>
          <Field label="Teléfono">
            <input className="input" value={draft.telefono} onChange={(e) => setDraft(d => ({ ...d, telefono: e.target.value }))} placeholder="+56 9 …" />
          </Field>
          <Field label="Correo">
            <input className="input" type="email" value={draft.correo} onChange={(e) => setDraft(d => ({ ...d, correo: e.target.value }))} placeholder="correo@ejemplo.cl" />
          </Field>
          <Field label="Comuna / Ciudad">
            <input className="input" value={draft.ciudad} onChange={(e) => setDraft(d => ({ ...d, ciudad: e.target.value }))} placeholder="Ej: Ñuñoa" />
          </Field>
          <Field label="Dirección" hint="Necesaria para despachar con OptiRoute.">
            <input className="input" value={draft.direccion} onChange={(e) => setDraft(d => ({ ...d, direccion: e.target.value }))} placeholder="Calle y número" />
          </Field>
          <Field label="Depto / Casa">
            <input className="input" value={draft.depto} onChange={(e) => setDraft(d => ({ ...d, depto: e.target.value }))} placeholder="Ej: Depto 1204" />
          </Field>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <ClienteChip cat={c.categoria} size="lg" />
            <span className="chip chip-neutral">
              <Icon name="clientes" size={13} />
              {c.telefono}
            </span>
            <span className="chip chip-neutral">
              <Icon name="clock" size={13} />
              Cliente desde {new Date(c.created_at).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Total gastado', val: fmtCLP(c.totalGastado) },
              { label: 'Ticket medio', val: fmtCLP(c.ticketMedio) },
              { label: 'Nº compras', val: c.numCompras },
              { label: 'Frec. compra', val: c.frecuencia ? `c/ ${c.frecuencia} días` : '—' },
            ].map((x, i) => (
              <div key={i} className="card" style={{ padding: '12px 13px', border: '1px solid var(--line)' }}>
                <div className="tnum" style={{ fontSize: 19, fontWeight: 800 }}>{x.val}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700, marginTop: 3 }}>{x.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ padding: '14px 16px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="clock" size={13} />
                Próxima compra estimada
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: nextTone === 'danger' ? 'var(--danger)' : nextTone === 'warn' ? 'oklch(0.50 0.10 70)' : 'var(--primary-700)' }}>{nextLabel}</div>
              {c.daysSinceLast != null && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 4 }}>Última compra hace {c.daysSinceLast} días</div>}
            </div>
            <div className="card" style={{ padding: '14px 16px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="tag" size={13} />
                Categorías favoritas
              </div>
              {c.topCats.map(([cat, v], i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <CatDot cat={cat} />
                      {cat}
                    </span>
                    <span className="tnum" style={{ fontWeight: 700, fontSize: 12 }}>{fmtCLP(v)}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg-2)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: (v / maxCat) * 100 + '%', background: catColor(cat), borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="star" size={13} />
              Productos más comprados
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {c.topProductos.slice(0, 4).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface-3)', borderRadius: 9 }}>
                  <span className="tnum" style={{ fontWeight: 800, color: 'var(--ink-3)', width: 16, fontSize: 12 }}>{i + 1}</span>
                  <CatDot cat={p.categoria} />
                  <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5 }}>{p.nombre}</span>
                  <span className="tnum" style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>{p.qty} u.</span>
                  <span className="tnum" style={{ fontWeight: 800, fontSize: 13.5 }}>{fmtCLP(p.total)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="history" size={13} />
              Historial de compras
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 11 }}>
              <table className="tbl" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Productos</th>
                    <th>Método</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasDelCliente.map((v) => (
                    <tr key={v.id}>
                      <td className="tnum">{new Date(v.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                      <td style={{ color: 'var(--ink-2)' }}>
                        {v.items.map(i => i.nombre).join(', ').slice(0, 42)}
                        {v.items.length > 1 ? '…' : ''}
                      </td>
                      <td>
                        <span className="chip chip-neutral" style={{ fontSize: 11 }}>{v.metodo_pago}</span>
                      </td>
                      <td className="num tnum" style={{ fontWeight: 800 }}>{fmtCLP(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <label className="field">
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)' }}>Notas internas</span>
            <textarea className="input" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Cliente prefiere quesos, llama antes de despachar…" style={{ resize: 'vertical' }} />
          </label>
        </>
      )}
    </Modal>
  )
}

/* ── Import modal ────────────────────────────────── */
const CL_HEADERS = ['nombre *', 'telefono', 'correo', 'ciudad', 'direccion', 'depto']
const CL_EXAMPLE = {
  'nombre *': 'María González',
  telefono: '+56912345678',
  correo: 'maria@email.com',
  ciudad: 'Santiago',
  direccion: 'Av. Providencia 1234',
  depto: 'Apto 5B',
}

interface ClienteRow {
  nombre: string; telefono: string; correo: string
  ciudad: string; direccion: string; depto: string
  _errors: string[]; _idx: number
}

function validateClienteRows(raw: Record<string, string>[]): ClienteRow[] {
  return raw.map((r, i) => {
    const nombre = (r['nombre *'] || r['nombre'] || '').trim()
    const errors: string[] = []
    if (!nombre) errors.push('Nombre requerido')
    return {
      nombre,
      telefono: (r['telefono'] || '').trim(),
      correo: (r['correo'] || '').trim(),
      ciudad: (r['ciudad'] || '').trim(),
      direccion: (r['direccion'] || '').trim(),
      depto: (r['depto'] || '').trim(),
      _errors: errors,
      _idx: i + 1,
    }
  })
}

function ImportModal({
  onClose,
  importar,
}: {
  onClose: () => void
  importar: (rows: Pick<import('@/hooks/useClientes').ClienteDB, 'nombre' | 'telefono' | 'correo' | 'ciudad' | 'direccion' | 'depto'>[]) => Promise<void>
}) {
  const [rows, setRows] = useState<ClienteRow[] | null>(null)
  const [drag, setDrag] = useState(false)
  const [fileErr, setFileErr] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const handleFile = async (f: File) => {
    setFileErr(null)
    try {
      const raw = await parseExcel(f)
      setRows(validateClienteRows(raw))
    } catch {
      setFileErr('No se pudo leer el archivo. Usa la plantilla .xlsx o un CSV con las mismas columnas.')
    }
  }

  const errCount = rows?.filter(r => r._errors.length > 0).length ?? 0
  const canImport = rows && rows.length > 0 && errCount === 0

  const doImport = async () => {
    if (!rows || !canImport) return
    setImporting(true)
    try {
      await importar(rows.map(r => ({
        nombre: r.nombre,
        telefono: r.telefono || null,
        correo: r.correo || null,
        ciudad: r.ciudad || null,
        direccion: r.direccion || null,
        depto: r.depto || null,
      })))
      onClose()
    } catch {
      setFileErr('Error al importar — intenta de nuevo')
      setImporting(false)
    }
  }

  return (
    <Modal
      title="Importar clientes"
      sub="Descarga la plantilla, rellénala y súbela aquí"
      onClose={onClose}
      width={700}
      footer={rows ? (
        <>
          <button className="btn btn-ghost" onClick={() => { setRows(null); setFileErr(null) }}>Volver</button>
          <button className="btn btn-primary" disabled={!canImport || importing} onClick={doImport}>
            <Icon name="check" size={15} />
            {importing ? 'Importando…' : errCount > 0 ? `${errCount} error${errCount > 1 ? 'es' : ''} — corrige el archivo` : `Importar ${rows.length} clientes`}
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
          {/* Paso 1 */}
          <div style={{ padding: '12px 16px', background: 'var(--surface-3)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>1</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Descarga la plantilla Excel</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>Rellena los datos y guarda el archivo sin cambiar los encabezados</div>
            </div>
            <button className="btn btn-soft" style={{ flexShrink: 0 }} onClick={() => downloadTemplate('plantilla_clientes.xlsx', CL_HEADERS, CL_EXAMPLE)}>
              <Icon name="download" size={14} />Plantilla .xlsx
            </button>
          </div>

          {/* Paso 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>2</div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Sube el archivo relleno</div>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            style={{ border: `2px dashed ${drag ? 'var(--primary)' : 'var(--line-2)'}`, borderRadius: 14, padding: '28px 24px', textAlign: 'center', background: drag ? 'var(--primary-tint)' : 'var(--surface-3)', transition: '.15s', cursor: 'pointer' }}
            onClick={() => document.getElementById('xl-clientes')?.click()}
          >
            <Icon name="download" size={28} style={{ color: 'var(--ink-3)', marginBottom: 8 }} />
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Arrastra tu archivo aquí</div>
            <div style={{ color: 'var(--ink-3)', fontSize: 13, fontWeight: 600 }}>o haz clic para seleccionar</div>
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 6, fontWeight: 600 }}>Acepta: .xlsx · .csv</div>
          </div>
          <input id="xl-clientes" type="file" accept=".xlsx,.csv,.txt" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
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
            <table className="tbl" style={{ fontSize: 12.5, minWidth: 560 }}>
              <thead>
                <tr>
                  <th style={{ width: 32 }}>#</th>
                  <th>Nombre *</th><th>Teléfono</th><th>Correo</th>
                  <th>Ciudad</th><th>Dirección</th><th>Depto</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._idx} style={{ background: r._errors.length > 0 ? 'color-mix(in srgb, var(--danger) 8%, transparent)' : undefined }}>
                    <td style={{ color: 'var(--ink-3)', fontSize: 11 }}>{r._idx}</td>
                    <td style={{ fontWeight: 700, color: !r.nombre ? 'var(--danger)' : undefined }}>{r.nombre || '(vacío)'}</td>
                    <td>{r.telefono || '—'}</td>
                    <td>{r.correo || '—'}</td>
                    <td>{r.ciudad || '—'}</td>
                    <td>{r.direccion || '—'}</td>
                    <td>{r.depto || '—'}</td>
                    <td>{r._errors.length > 0 && <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 700, whiteSpace: 'nowrap' }}>⚠ {r._errors.join(', ')}</span>}</td>
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

/* ── Export modal ────────────────────────────────── */
function ExportModal({ onClose, ventas }: { onClose: () => void; ventas: VentaRow[] }) {
  const [rango, setRango] = useState('mes')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const periodos: [string, string][] = [
    ['hoy', 'Hoy'], ['semana', 'Esta semana'], ['mes', 'Este mes'],
    ['anio', 'Este año'], ['custom', 'Personalizado'],
  ]
  const getFiltered = () => {
    const now = new Date()
    const d = new Date(now)
    if (rango === 'hoy') { d.setHours(0, 0, 0, 0); return ventas.filter(v => new Date(v.created_at) >= d) }
    if (rango === 'semana') { d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return ventas.filter(v => new Date(v.created_at) >= d) }
    if (rango === 'mes') { d.setDate(1); d.setHours(0, 0, 0, 0); return ventas.filter(v => new Date(v.created_at) >= d) }
    if (rango === 'anio') { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return ventas.filter(v => new Date(v.created_at) >= d) }
    if (rango === 'custom' && desde && hasta) {
      const a = new Date(desde)
      const b = new Date(hasta)
      b.setHours(23, 59, 59)
      return ventas.filter(v => { const t = new Date(v.created_at); return t >= a && t <= b })
    }
    return ventas
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filtered = useMemo(getFiltered, [ventas, rango, desde, hasta])
  const total = filtered.reduce((a, v) => a + v.total, 0)
  const periodoLabel = ({ hoy: 'hoy', semana: 'esta_semana', mes: 'este_mes', anio: 'este_año', custom: 'personalizado' } as Record<string, string>)[rango]

  return (
    <Modal
      title="Exportar ventas"
      sub="Descarga tus ventas en formato CSV (compatible con Excel)"
      onClose={onClose}
      width={500}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!filtered.length} onClick={() => { buildVentasCSV(filtered, periodoLabel); onClose() }}>
            <Icon name="download" size={16} />
            Descargar CSV · {filtered.length} boletas
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8 }}>Período</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {periodos.map(([k, l]) => (
              <button key={k} onClick={() => setRango(k)} className="chip" style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13.5, border: '1px solid ' + (rango === k ? 'var(--primary)' : 'var(--line)'), background: rango === k ? 'var(--primary)' : 'var(--surface)', color: rango === k ? '#fff' : 'var(--ink-2)', fontWeight: 700 }}>
                {l}
              </button>
            ))}
          </div>
          {rango === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <label className="field">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Desde</span>
                <input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} />
              </label>
              <label className="field">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Hasta</span>
                <input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
              </label>
            </div>
          )}
        </div>
        <div className="card" style={{ padding: '14px 16px', background: 'var(--primary-tint)', border: '1px solid var(--primary-tint2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary-700)' }}>
                {filtered.length} boletas · {fmtCLP(total)}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 3 }}>Incluye: Boleta, Fecha, Producto, Categoría, Precio, Costo, Ganancia, Método, Cliente</div>
            </div>
            <Icon name="download" size={22} style={{ color: 'var(--primary-700)' }} />
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <Icon name="alert" size={13} style={{ flexShrink: 0, marginTop: 2 }} />
          Abre el CSV en Excel: Datos → Desde texto/CSV → selecciona UTF-8. Los acentos se muestran correctamente.
        </div>
      </div>
    </Modal>
  )
}

/* ── Saldar deuda modal ──────────────────────────── */
function SaldarModal({
  deudor,
  onClose,
  saldar,
  metodosPago,
}: {
  deudor: Deudor
  onClose: () => void
  saldar: (ventaId: string, monto: number, metodo: string) => Promise<void>
  metodosPago: string[]
}) {
  const [saldos, setSaldos] = useState<Record<string, string | number>>(() =>
    Object.fromEntries(deudor.ventas.map(v => [v.id, v.monto_pendiente]))
  )
  const [metodoPago, setMetodoPago] = useState(metodosPago[0] || 'Efectivo')
  const [guardando, setGuardando] = useState(false)
  const totalAPagar = Object.values(saldos).reduce<number>((a, v) => a + (+v || 0), 0)

  return (
    <Modal
      title="Registrar pago"
      sub={deudor.nombre}
      onClose={onClose}
      width={520}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={guardando || totalAPagar <= 0}
            onClick={async () => {
              setGuardando(true)
              await Promise.all(deudor.ventas.filter(v => +saldos[v.id] > 0).map(v => saldar(v.id, +saldos[v.id], metodoPago)))
              onClose()
            }}
          >
            <Icon name="check" size={16} />
            {guardando ? 'Registrando…' : `Registrar ${fmtCLP(totalAPagar)}`}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div className="card" style={{ flex: 1, padding: '11px 14px', border: '1px solid var(--line)', textAlign: 'center' }}>
          <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: 'var(--danger)' }}>{fmtCLP(deudor.total)}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>Deuda total</div>
        </div>
        <div className="card" style={{ flex: 1, padding: '11px 14px', border: '1px solid var(--line)', textAlign: 'center' }}>
          <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-700)' }}>{fmtCLP(totalAPagar)}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>A registrar ahora</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {deudor.ventas.map(v => (
          <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-3)', borderRadius: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>Boleta N° {v.boleta}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>
                {new Date(v.created_at).toLocaleDateString('es-CL')} · {v.items.length} producto{v.items.length > 1 ? 's' : ''}
              </div>
            </div>
            <div className="tnum" style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 800 }}>{fmtCLP(v.monto_pendiente)}</div>
            <div className="input-pre" style={{ width: 130 }}>
              <span className="pre" style={{ padding: '0 3px 0 10px', fontSize: 13 }}>$</span>
              <input className="tnum" type="number" style={{ padding: '8px 10px 8px 2px', fontSize: 13, fontWeight: 700, width: 80 }} value={saldos[v.id] || ''} onChange={(e) => setSaldos(s => ({ ...s, [v.id]: e.target.value }))} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <Field label="¿Con qué pagó?" hint="Para que cuadren tus flujos de caja.">
          <select className="select" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
            {metodosPago.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Puedes registrar pago total o parcial por cada boleta.</div>
    </Modal>
  )
}

/* ── Deudas panel ────────────────────────────────── */
function DeudasPanel({
  ventas,
  saldar,
  metodosPago,
}: {
  ventas: VentaRow[]
  saldar: (ventaId: string, monto: number, metodo: string) => Promise<void>
  metodosPago: string[]
}) {
  const [deudorSaldar, setDeudorSaldar] = useState<Deudor | null>(null)

  const ventasPendientes = ventas.filter(v => v.credito && !v.pagado)
  const totalDeuda = ventasPendientes.reduce((a, v) => a + v.monto_pendiente, 0)

  const deudoresMap: Record<string, Deudor> = {}
  for (const v of ventasPendientes) {
    const nombre = v.cliente_snapshot?.nombre || 'Sin cliente'
    const telefono = v.cliente_snapshot?.telefono || v.cliente_snapshot?.numero || ''
    if (!deudoresMap[nombre]) deudoresMap[nombre] = { nombre, telefono, ventas: [], total: 0 }
    deudoresMap[nombre].ventas.push(v)
    deudoresMap[nombre].total += v.monto_pendiente
  }
  const deudores = Object.values(deudoresMap).sort((a, b) => b.total - a.total)
  const clientesDeudores = deudores.length
  const historial = [...ventas.filter(v => v.credito)]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 14)

  if (!deudores.length)
    return (
      <div className="card">
        <EmptyState icon="receipt" title="Sin deudas pendientes" text="No hay ventas a crédito pendientes de pago. ¡Todo al día!" action={<span className="chip chip-ok">Al día</span>} />
      </div>
    )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
        <Metric icon="receipt" label="Deuda total pendiente" value={fmtCLP(totalDeuda)} tone="danger" sub={`${clientesDeudores} cliente${clientesDeudores !== 1 ? 's' : ''} con saldo`} />
        <Metric icon="clientes" label="Clientes deudores" value={clientesDeudores} tone="warn" sub="Con pagos pendientes" />
        <Metric icon="cash" label="Boletas a crédito" value={ventasPendientes.length} tone="info" sub="Sin pagar todavía" />
      </div>

      <div className="card">
        <div className="card-head">
          <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--danger-tint)', color: 'var(--danger)', display: 'grid', placeItems: 'center' }}>
            <Icon name="alert" size={18} />
          </span>
          <div style={{ flex: 1 }}>
            <div className="card-title">Clientes con deuda pendiente</div>
            <div className="card-sub">Haz clic en "Saldar" para registrar un pago</div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Cliente</th><th>Teléfono</th>
                <th className="num">Boletas</th><th className="num">Total deuda</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deudores.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700 }}>{d.nombre}</td>
                  <td style={{ color: 'var(--ink-2)', fontWeight: 600, fontSize: 13 }}>{d.telefono || '—'}</td>
                  <td className="num tnum">{d.ventas.length}</td>
                  <td className="num tnum" style={{ fontWeight: 800, color: 'var(--danger)', fontSize: 16 }}>{fmtCLP(d.total)}</td>
                  <td className="num">
                    <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
                      {d.telefono && (
                        <a href={`https://wa.me/${d.telefono.replace(/\D/g, '')}?text=${encodeURIComponent('Hola ' + d.nombre.split(' ')[0] + ', te recordamos que tienes un pago pendiente de ' + fmtCLP(d.total) + '.')}`} target="_blank" rel="noopener noreferrer">
                          <button className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: 13 }}>
                            <Icon name="phone" size={14} />
                            WA
                          </button>
                        </a>
                      )}
                      <button className="btn btn-primary" style={{ padding: '7px 13px', fontSize: 13 }} onClick={() => setDeudorSaldar(d)}>
                        <Icon name="cash" size={14} />
                        Saldar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <Icon name="history" size={17} style={{ color: 'var(--primary-700)' }} />
          <div style={{ flex: 1 }}>
            <div className="card-title">Historial de crédito</div>
            <div className="card-sub">Ventas a crédito recientes</div>
          </div>
        </div>
        <div>
          {historial.map((v, i) => {
            const color = v.pagado ? 'var(--primary-700)' : 'var(--danger)'
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 22px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: v.pagado ? 'var(--ok-tint)' : 'var(--danger-tint)', color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name={v.pagado ? 'check' : 'receipt'} size={15} />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    Boleta N° {v.boleta} · {v.cliente_snapshot?.nombre || 'Sin cliente'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>
                    {new Date(v.created_at).toLocaleDateString('es-CL')} · {v.items.length} producto{v.items.length > 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tnum" style={{ fontWeight: 800, color, fontSize: 15 }}>{fmtCLP(v.monto_pendiente || v.total)}</div>
                  <span className="chip" style={{ fontSize: 11, padding: '2px 8px', background: v.pagado ? 'var(--ok-tint)' : 'var(--danger-tint)', color }}>
                    {v.pagado ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {deudorSaldar && (
        <SaldarModal
          deudor={deudorSaldar}
          onClose={() => setDeudorSaldar(null)}
          saldar={saldar}
          metodosPago={metodosPago}
        />
      )}
    </div>
  )
}

/* ── Main ClientesPage ───────────────────────────── */
export default function ClientesPage() {
  const { clientes, actualizar, eliminar, importar } = useClientes()
  const { ventas, saldar } = useTransacciones()
  const { config } = useConfiguracion()
  const metodosPago = config?.metodos_pago ?? ['Efectivo', 'Transferencia', 'Tarjeta']

  const [tab, setTab] = useState('clientes')
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const [sort, setSort] = useState<{ k: string; dir: number }>({ k: 'totalGastado', dir: -1 })
  const [detail, setDetail] = useState<EnrichedCliente | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)

  // Agrupación de ventas por cliente_id para métricas
  const ventasPorCliente = useMemo(() => {
    const map: Record<string, VentaRow[]> = {}
    for (const v of ventas) {
      if (v.cliente_id) {
        if (!map[v.cliente_id]) map[v.cliente_id] = []
        map[v.cliente_id].push(v)
      }
    }
    return map
  }, [ventas])

  const enriched: EnrichedCliente[] = useMemo(
    () => clientes.map(c => ({ ...c, ...computeMetrics(ventasPorCliente[c.id] ?? []) })),
    [clientes, ventasPorCliente]
  )

  // Métricas globales de deuda
  const ventasPendientes = useMemo(() => ventas.filter(v => v.credito && !v.pagado), [ventas])
  const totalDeuda = useMemo(() => ventasPendientes.reduce((a, v) => a + v.monto_pendiente, 0), [ventasPendientes])
  const clientesDeudores = useMemo(() => {
    const nombres = new Set(ventasPendientes.map(v => v.cliente_snapshot?.nombre).filter(Boolean))
    return nombres.size
  }, [ventasPendientes])

  // Deep-link desde Transacciones: ?cliente=<nombre> abre la ficha de ese cliente.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const param = new URLSearchParams(window.location.search).get('cliente')
    if (!param) return
    const nombre = decodeURIComponent(param)
    const found = enriched.find(c => c.nombre.toLowerCase() === nombre.toLowerCase())
    setQ(nombre)
    if (found) setDetail(found)
    window.history.replaceState(null, '', '/clientes')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cats = ['Todos', 'VIP', 'Frecuente', 'Regular', 'En riesgo', 'Nuevo']
  let list = enriched.filter(c => (filtro === 'Todos' || c.categoria === filtro) && c.nombre.toLowerCase().includes(q.toLowerCase()))
  list = [...list].sort((a, b) => {
    const av = getSortVal(a, sort.k)
    const bv = getSortVal(b, sort.k)
    return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir
  })

  const ticketGen = enriched.length ? Math.round(enriched.reduce((a, c) => a + c.totalGastado, 0) / enriched.length) : 0
  const activos = enriched.filter(c => c.daysSinceLast != null && c.daysSinceLast <= 30).length
  const setS = (k: string) => setSort(s => (s.k === k ? { k, dir: -s.dir } : { k, dir: -1 }))

  const Th = ({ k, children, num }: { k: string; children: React.ReactNode; num?: boolean }) => (
    <th className={num ? 'num' : ''} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setS(k)}>
      {children}
      {sort.k === k && <span style={{ color: 'var(--primary)' }}> {sort.dir < 0 ? '↓' : '↑'}</span>}
    </th>
  )

  return (
    <div className="fade-in">
      <PageHeader title="Clientes" sub={`${clientes.length} clientes registrados`}>
        {totalDeuda > 0 && (
          <span className="chip" style={{ background: 'var(--danger-tint)', color: 'var(--danger)', fontSize: 13, fontWeight: 800, padding: '5px 12px' }}>
            <Icon name="alert" size={13} />
            {fmtCLP(totalDeuda)} pendiente
          </span>
        )}
        <button className="btn btn-ghost" onClick={() => setShowExport(true)}>
          <Icon name="download" size={16} />
          Exportar ventas
        </button>
        <button className="btn btn-ghost" onClick={() => setShowImport(true)}>
          <Icon name="plus" size={16} />
          Importar
        </button>
        <button className="btn btn-primary" onClick={() => setShowImport(true)}>
          <Icon name="clientes" size={16} />
          Agregar cliente
        </button>
      </PageHeader>

      <div className="seg" style={{ marginBottom: 18 }}>
        <button className={tab === 'clientes' ? 'on' : ''} onClick={() => setTab('clientes')}>Clientes</button>
        <button className={tab === 'deudas' ? 'on' : ''} onClick={() => setTab('deudas')}>
          Deudas{' '}
          {clientesDeudores > 0 && (
            <span style={{ background: 'var(--danger)', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 800, marginLeft: 4 }}>{clientesDeudores}</span>
          )}
        </button>
      </div>

      {tab === 'deudas' ? (
        <DeudasPanel ventas={ventas} saldar={saldar} metodosPago={metodosPago} />
      ) : (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', marginBottom: 18 }}>
            <Metric icon="clientes" label="Total clientes" value={clientes.length} tone="primary" sub="En tu base de datos" />
            <Metric icon="cash" label="Ticket medio" value={fmtCLP(ticketGen)} tone="terra" sub="Promedio por cliente" />
            <Metric icon="zap" label="Activos este mes" value={activos} tone="primary" sub="Compraron en los últimos 30 días" />
            <Metric icon="star" label="Clientes VIP" value={enriched.filter(c => c.categoria === 'VIP').length} tone="terra" sub="Alto valor y frecuencia" />
          </div>

          <div style={{ display: 'flex', gap: 9, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <SearchBox value={q} onChange={setQ} placeholder="Buscar cliente…" width={240} />
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto' }}>
              {cats.map(cat => (
                <button key={cat} onClick={() => setFiltro(cat)} className="chip" style={{ whiteSpace: 'nowrap', cursor: 'pointer', padding: '7px 13px', fontSize: 13, border: '1px solid ' + (filtro === cat ? 'var(--primary)' : 'var(--line)'), background: filtro === cat ? 'var(--primary)' : 'var(--surface)', color: filtro === cat ? '#fff' : 'var(--ink-2)', fontWeight: 700 }}>
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{list.length} resultados</div>
          </div>

          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <Th k="nombre">Cliente</Th>
                    <Th k="ciudad">Ciudad</Th>
                    <th>Categoría</th>
                    <Th k="numCompras" num>Compras</Th>
                    <Th k="totalGastado" num>Total gastado</Th>
                    <Th k="ticketMedio" num>Ticket medio</Th>
                    <Th k="daysSinceLast" num>Última compra</Th>
                    <th>Próxima esperada</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(c => {
                    const next = c.nextExpected
                    const late = c.daysUntilNext != null && c.daysUntilNext < 0
                    const soon = c.daysUntilNext != null && c.daysUntilNext >= 0 && c.daysUntilNext <= 3
                    return (
                      <tr
                        key={c.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setDetail(c)}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <td>
                          <div style={{ fontWeight: 700 }}>{c.nombre}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{c.correo}</div>
                        </td>
                        <td style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{c.ciudad}</td>
                        <td><ClienteChip cat={c.categoria} /></td>
                        <td className="num tnum" style={{ fontWeight: 700 }}>{c.numCompras}</td>
                        <td className="num tnum" style={{ fontWeight: 800 }}>{fmtCLP(c.totalGastado)}</td>
                        <td className="num tnum">{fmtCLP(c.ticketMedio)}</td>
                        <td className="num" style={{ color: 'var(--ink-3)', fontWeight: 600, fontSize: 13 }}>
                          {c.daysSinceLast != null ? (c.daysSinceLast === 0 ? 'Hoy' : `Hace ${c.daysSinceLast} días`) : '—'}
                        </td>
                        <td>
                          {next ? (
                            <span style={{ fontSize: 13, fontWeight: 700, color: late ? 'var(--danger)' : soon ? 'oklch(0.50 0.10 70)' : 'var(--ink-2)' }}>
                              {late ? <Icon name="alert" size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} /> : null}
                              {next.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>—</span>
                          )}
                        </td>
                        <td className="num"><Icon name="chevR" size={16} style={{ color: 'var(--ink-3)' }} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {list.length === 0 && (
                <EmptyState
                  icon="clientes"
                  title="Sin clientes"
                  text="Importa una base de clientes o agrégalos manualmente al registrar una venta."
                  action={
                    <button className="btn btn-primary" onClick={() => setShowImport(true)}>
                      <Icon name="plus" size={15} />
                      Importar clientes
                    </button>
                  }
                />
              )}
            </div>
          </div>

          {detail && (
            <ClienteDetail
              c={enriched.find(c => c.id === detail.id) || detail}
              ventasDelCliente={ventasPorCliente[detail.id] ?? []}
              onClose={() => setDetail(null)}
              onActualizar={actualizar}
              onEliminar={eliminar}
            />
          )}
          {showImport && <ImportModal onClose={() => setShowImport(false)} importar={importar} />}
          {showExport && <ExportModal onClose={() => setShowExport(false)} ventas={ventas} />}
        </>
      )}
    </div>
  )
}

function getSortVal(c: EnrichedCliente, k: string): number | string {
  if (k === 'numCompras') return c.numCompras
  const v = (c as unknown as Record<string, unknown>)[k]
  if (typeof v === 'number' || typeof v === 'string') return v
  return 0
}
