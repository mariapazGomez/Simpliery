'use client'

// ---------- Clientes: analytics, import, export (portado de screen-clientes.jsx) ----------
import { useMemo, useState } from 'react'
import { useStore, useMetrics, clientMetrics, buildSalesCSV } from '@/lib/store'
import { fmtCLP, catColor } from '@/lib/format'
import { Icon } from '@/components/icon'
import { PageHeader, Metric, Modal, EmptyState, SearchBox, CatDot, Field } from '@/components/ui'
import { ClienteChip } from '@/components/cliente-chip'
import type { Cliente, ClientMetrics, Sale } from '@/types'

type EnrichedCliente = Cliente & ClientMetrics

interface Deudor {
  nombre: string
  telefono: string
  ventas: Sale[]
  total: number
}

/* ── Cliente detail modal ────────────────────────────── */
function ClienteDetail({ c, onClose }: { c: Cliente; onClose: () => void }) {
  const { updateCliente } = useStore()
  const m = useMemo(() => clientMetrics(c), [c])
  const [nota, setNota] = useState(c.nota || '')
  const nextLabel = m.nextExpected
    ? m.daysUntilNext! > 0
      ? `${m.nextExpected.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} · en ${m.daysUntilNext} días`
      : m.daysUntilNext === 0
      ? '¡Hoy!'
      : `Hace ${Math.abs(m.daysUntilNext!)} días (atrasada)`
    : 'Sin datos suficientes'
  const nextTone = m.daysUntilNext != null ? (m.daysUntilNext < 0 ? 'danger' : m.daysUntilNext <= 3 ? 'warn' : 'primary') : 'info'
  const maxCat = m.topCats[0]?.[1] || 1
  return (
    <Modal
      title={c.nombre}
      sub={c.ciudad + ' · ' + c.correo}
      onClose={onClose}
      width={620}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              updateCliente(c.id, { nota })
              onClose()
            }}
          >
            <Icon name="check" size={15} />
            Guardar nota
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <ClienteChip cat={m.categoria} size="lg" />
        <span className="chip chip-neutral">
          <Icon name="clientes" size={13} />
          {c.telefono}
        </span>
        <span className="chip chip-neutral">
          <Icon name="clock" size={13} />
          Cliente desde {c.createdAt.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total gastado', val: fmtCLP(m.totalGastado), tone: 'terra' },
          { label: 'Ticket medio', val: fmtCLP(m.ticketMedio), tone: 'primary' },
          { label: 'Nº compras', val: c.compras.length, tone: 'info' },
          { label: 'Frec. compra', val: m.frecuencia ? `c/ ${m.frecuencia} días` : '—', tone: 'primary' },
        ].map((x, i) => (
          <div key={i} className="card" style={{ padding: '12px 13px', border: '1px solid var(--line)' }}>
            <div className="tnum" style={{ fontSize: 19, fontWeight: 800 }}>
              {x.val}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700, marginTop: 3 }}>{x.label}</div>
          </div>
        ))}
      </div>

      {/* Next purchase + behavior */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: '14px 16px', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="clock" size={13} />
            Próxima compra estimada
          </div>
          <div style={{ fontWeight: 800, fontSize: 15, color: nextTone === 'danger' ? 'var(--danger)' : nextTone === 'warn' ? 'oklch(0.50 0.10 70)' : 'var(--primary-700)' }}>{nextLabel}</div>
          {m.daysSinceLast != null && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 4 }}>Última compra hace {m.daysSinceLast} días</div>}
        </div>
        <div className="card" style={{ padding: '14px 16px', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="tag" size={13} />
            Categorías favoritas
          </div>
          {m.topCats.map(([cat, v], i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <CatDot cat={cat} />
                  {cat}
                </span>
                <span className="tnum" style={{ fontWeight: 700, fontSize: 12 }}>
                  {fmtCLP(v)}
                </span>
              </div>
              <div style={{ height: 5, background: 'var(--bg-2)', borderRadius: 4 }}>
                <div style={{ height: '100%', width: (v / maxCat) * 100 + '%', background: catColor(cat), borderRadius: 4 }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top products */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="star" size={13} />
          Productos más comprados
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {m.topProductos.slice(0, 4).map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface-3)', borderRadius: 9 }}>
              <span className="tnum" style={{ fontWeight: 800, color: 'var(--ink-3)', width: 16, fontSize: 12 }}>
                {i + 1}
              </span>
              <CatDot cat={p.cat} />
              <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5 }}>{p.name}</span>
              <span className="tnum" style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>
                {p.qty} u.
              </span>
              <span className="tnum" style={{ fontWeight: 800, fontSize: 13.5 }}>
                {fmtCLP(p.total)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase history */}
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
              {c.compras.map((v) => (
                <tr key={v.id}>
                  <td className="tnum">{v.date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                  <td style={{ color: 'var(--ink-2)' }}>
                    {v.items.map((i) => i.name).join(', ').slice(0, 42)}
                    {v.items.length > 1 ? '…' : ''}
                  </td>
                  <td>
                    <span className="chip chip-neutral" style={{ fontSize: 11 }}>
                      {v.method}
                    </span>
                  </td>
                  <td className="num tnum" style={{ fontWeight: 800 }}>
                    {fmtCLP(v.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota */}
      <label className="field">
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)' }}>Notas internas</span>
        <textarea className="input" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Cliente prefiere quesos, llama antes de despachar…" style={{ resize: 'vertical' }} />
      </label>
    </Modal>
  )
}

/* ── Import modal ───────────────────────────────────── */
interface CsvPreview {
  headers: string[]
  rows: Record<string, string>[]
}
type Mapping = { nombre: string; telefono: string; correo: string; ciudad: string }

function ImportModal({ onClose }: { onClose: () => void }) {
  const { addClientes, toast } = useStore()
  const [preview, setPreview] = useState<CsvPreview | null>(null)
  const [drag, setDrag] = useState(false)
  const [mapping, setMapping] = useState<Mapping>({ nombre: '', telefono: '', correo: '', ciudad: '' })
  const parseCSV = (text: string): CsvPreview => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    const sep = lines[0].includes(';') ? ';' : ','
    const headers = lines[0].split(sep).map((h) => h.replace(/["\s]/g, '').toLowerCase())
    const rows = lines
      .slice(1)
      .map((l) => {
        const cols = l.split(sep)
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => (obj[h] = (cols[i] || '').replace(/"/g, '').trim()))
        return obj
      })
      .filter((r) => Object.values(r).some((v) => v))
    return { headers, rows }
  }
  const handleFile = (f: File) => {
    const r = new FileReader()
    r.onload = (e) => {
      try {
        const { headers, rows } = parseCSV(String(e.target?.result ?? ''))
        const autoMap: Mapping = { nombre: '', telefono: '', correo: '', ciudad: '' }
        headers.forEach((h) => {
          if (/nombre|name/i.test(h)) autoMap.nombre = h
          else if (/tel[eé]?fono|phone|cel/i.test(h)) autoMap.telefono = h
          else if (/correo|email/i.test(h)) autoMap.correo = h
          else if (/ciudad|city/i.test(h)) autoMap.ciudad = h
        })
        setMapping(autoMap)
        setPreview({ headers, rows })
      } catch {
        toast('Error al leer el archivo — revisa que sea CSV', 'alert')
      }
    }
    r.readAsText(f, 'UTF-8')
  }
  const doImport = () => {
    if (!preview) return
    const clientes: Cliente[] = preview.rows.map((r, i) => ({
      id: 'imp' + Date.now() + i,
      nombre: r[mapping.nombre] || 'Sin nombre',
      telefono: r[mapping.telefono] || '',
      correo: r[mapping.correo] || '',
      ciudad: r[mapping.ciudad] || '',
      createdAt: new Date(),
      nota: '',
      compras: [],
    }))
    addClientes(clientes)
    onClose()
  }
  return (
    <Modal
      title="Importar clientes"
      sub="Sube un archivo CSV para agregar clientes al sistema"
      onClose={onClose}
      width={580}
      footer={
        preview ? (
          <>
            <button className="btn btn-ghost" onClick={() => setPreview(null)}>
              Volver
            </button>
            <button className="btn btn-primary" onClick={doImport}>
              <Icon name="check" size={15} />
              Importar {preview.rows.length} clientes
            </button>
          </>
        ) : (
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
        )
      }
    >
      {!preview ? (
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
            style={{ border: `2px dashed ${drag ? 'var(--primary)' : 'var(--line-2)'}`, borderRadius: 16, padding: '36px 24px', textAlign: 'center', background: drag ? 'var(--primary-tint)' : 'var(--surface-3)', transition: '.15s', cursor: 'pointer' }}
            onClick={() => document.getElementById('csv-input')?.click()}
          >
            <Icon name="download" size={32} style={{ color: 'var(--ink-3)', marginBottom: 10 }} />
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Arrastra tu archivo aquí</div>
            <div style={{ color: 'var(--ink-3)', fontSize: 13.5, fontWeight: 600 }}>o haz clic para seleccionar</div>
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 8, fontWeight: 600 }}>Formatos: CSV · TXT · Excel guardado como CSV</div>
          </div>
          <input
            id="csv-input"
            type="file"
            accept=".csv,.txt"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0])
            }}
          />
          <div style={{ marginTop: 16, padding: '13px 16px', background: 'var(--surface-3)', borderRadius: 11 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Columnas reconocidas automáticamente:</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['nombre', 'telefono', 'correo', 'ciudad'].map((k) => (
                <span key={k} className="chip chip-neutral">
                  {k}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, fontWeight: 600 }}>💡 Exporta tu lista de Excel como CSV y súbela directo. Las columnas se mapean solas.</div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="chip chip-ok">
              <Icon name="check" size={12} />
              {preview.rows.length} clientes detectados
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>Columnas del archivo: {preview.headers.join(', ')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {(Object.entries(mapping) as [keyof Mapping, string][]).map(([field, val]) => (
              <label key={field} className="field">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'capitalize' }}>{field}</span>
                <select className="select" value={val} onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}>
                  <option value="">(no importar)</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 10 }}>
            <table className="tbl" style={{ fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Ciudad</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    <td>{r[mapping.nombre] || '—'}</td>
                    <td>{r[mapping.telefono] || '—'}</td>
                    <td>{r[mapping.correo] || '—'}</td>
                    <td>{r[mapping.ciudad] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > 5 && <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', marginTop: 8, fontWeight: 600 }}>...y {preview.rows.length - 5} más</div>}
        </div>
      )}
    </Modal>
  )
}

/* ── Export modal ────────────────────────────────────── */
function ExportModal({ onClose }: { onClose: () => void }) {
  const { sales } = useStore()
  const [rango, setRango] = useState('mes')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const periodos: [string, string][] = [
    ['hoy', 'Hoy'],
    ['semana', 'Esta semana'],
    ['mes', 'Este mes'],
    ['anio', 'Este año'],
    ['custom', 'Personalizado'],
  ]
  const getFiltered = () => {
    const now = new Date()
    const d = new Date(now)
    if (rango === 'hoy') {
      d.setHours(0, 0, 0, 0)
      return sales.filter((s) => s.date >= d)
    }
    if (rango === 'semana') {
      d.setDate(d.getDate() - d.getDay())
      d.setHours(0, 0, 0, 0)
      return sales.filter((s) => s.date >= d)
    }
    if (rango === 'mes') {
      d.setDate(1)
      d.setHours(0, 0, 0, 0)
      return sales.filter((s) => s.date >= d)
    }
    if (rango === 'anio') {
      d.setMonth(0, 1)
      d.setHours(0, 0, 0, 0)
      return sales.filter((s) => s.date >= d)
    }
    if (rango === 'custom' && desde && hasta) {
      const a = new Date(desde)
      const b = new Date(hasta)
      b.setHours(23, 59, 59)
      return sales.filter((s) => s.date >= a && s.date <= b)
    }
    return sales
  }
  const filtered = useMemo(getFiltered, [sales, rango, desde, hasta])
  const total = filtered.reduce((a, s) => a + s.total, 0)
  const periodoLabel = ({ hoy: 'hoy', semana: 'esta_semana', mes: 'este_mes', anio: 'este_año', custom: 'personalizado' } as Record<string, string>)[rango]
  return (
    <Modal
      title="Exportar ventas"
      sub="Descarga tus ventas en formato CSV (compatible con Excel)"
      onClose={onClose}
      width={500}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            disabled={!filtered.length}
            onClick={() => {
              buildSalesCSV(filtered, periodoLabel)
              onClose()
            }}
          >
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

/* ── Saldar deuda modal ────────────────────────── */
function SaldarModal({ deudor, onClose }: { deudor: Deudor; onClose: () => void }) {
  const { saldarDeuda, settings } = useStore()
  const [saldos, setSaldos] = useState<Record<string, string | number>>(() => Object.fromEntries(deudor.ventas.map((s) => [s.id, s.montoPendiente || s.total])))
  const [metodoPago, setMetodoPago] = useState(settings.methods[0] || 'Efectivo')
  const totalAPagar = Object.values(saldos).reduce<number>((a, v) => a + (+v || 0), 0)
  return (
    <Modal
      title="Registrar pago"
      sub={deudor.nombre}
      onClose={onClose}
      width={520}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              deudor.ventas.forEach((s) => {
                if (+saldos[s.id] > 0) saldarDeuda(s.id, +saldos[s.id], metodoPago)
              })
              onClose()
            }}
          >
            <Icon name="check" size={16} />
            Registrar {fmtCLP(totalAPagar)}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div className="card" style={{ flex: 1, padding: '11px 14px', border: '1px solid var(--line)', textAlign: 'center' }}>
          <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: 'var(--danger)' }}>
            {fmtCLP(deudor.total)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>Deuda total</div>
        </div>
        <div className="card" style={{ flex: 1, padding: '11px 14px', border: '1px solid var(--line)', textAlign: 'center' }}>
          <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-700)' }}>
            {fmtCLP(totalAPagar)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>A registrar ahora</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {deudor.ventas.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-3)', borderRadius: 11 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>Boleta N° {s.boleta}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>
                {s.date.toLocaleDateString('es-CL')} · {s.items.length} producto{s.items.length > 1 ? 's' : ''}
              </div>
            </div>
            <div className="tnum" style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 800 }}>
              {fmtCLP(s.montoPendiente || s.total)}
            </div>
            <div className="input-pre" style={{ width: 130 }}>
              <span className="pre" style={{ padding: '0 3px 0 10px', fontSize: 13 }}>
                $
              </span>
              <input className="tnum" type="number" style={{ padding: '8px 10px 8px 2px', fontSize: 13, fontWeight: 700, width: 80 }} value={saldos[s.id] || ''} onChange={(e) => setSaldos((v) => ({ ...v, [s.id]: e.target.value }))} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <Field label="¿Con qué pagó?" hint="Para que cuadren tus flujos de caja.">
          <select className="select" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
            {settings.methods.map((mth) => (
              <option key={mth} value={mth}>{mth}</option>
            ))}
          </select>
        </Field>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Puedes registrar pago total o parcial por cada boleta.</div>
    </Modal>
  )
}

/* ── Deudas panel ──────────────────────────────── */
function DeudasPanel() {
  const m = useMetrics()
  const { sales } = useStore()
  const [saldar, setSaldar] = useState<Deudor | null>(null)
  const deudores = Object.values(m.deudaPorCliente || {}).sort((a, b) => b.total - a.total)
  const historial = [...(m.deudaPendiente || []), ...((sales || []).filter((s) => s.credito && s.pagado))].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 14)
  if (!deudores.length)
    return (
      <div className="card">
        <EmptyState icon="receipt" title="Sin deudas pendientes" text="No hay ventas a crédito pendientes de pago. ¡Todo al día!" action={<span className="chip chip-ok">Al día</span>} />
      </div>
    )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
        <Metric icon="receipt" label="Deuda total pendiente" value={fmtCLP(m.totalDeuda)} tone="danger" sub={`${m.clientesDeudores} cliente${m.clientesDeudores !== 1 ? 's' : ''} con saldo`} />
        <Metric icon="clientes" label="Clientes deudores" value={m.clientesDeudores} tone="warn" sub="Con pagos pendientes" />
        <Metric icon="cash" label="Boletas a crédito" value={(m.deudaPendiente || []).length} tone="info" sub="Sin pagar todavía" />
      </div>
      <div className="card">
        <div className="card-head">
          <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--danger-tint)', color: 'var(--danger)', display: 'grid', placeItems: 'center' }}>
            <Icon name="alert" size={18} />
          </span>
          <div style={{ flex: 1 }}>
            <div className="card-title">Clientes con deuda pendiente</div>
            <div className="card-sub">Haz clic en “Saldar” para registrar un pago</div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th className="num">Boletas</th>
                <th className="num">Total deuda</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deudores.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700 }}>{d.nombre}</td>
                  <td style={{ color: 'var(--ink-2)', fontWeight: 600, fontSize: 13 }}>{d.telefono || '—'}</td>
                  <td className="num tnum">{d.ventas.length}</td>
                  <td className="num tnum" style={{ fontWeight: 800, color: 'var(--danger)', fontSize: 16 }}>
                    {fmtCLP(d.total)}
                  </td>
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
                      <button className="btn btn-primary" style={{ padding: '7px 13px', fontSize: 13 }} onClick={() => setSaldar(d)}>
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
          {historial.map((s, i) => {
            const paid = s.pagado
            const color = paid ? 'var(--primary-700)' : 'var(--danger)'
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 22px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: paid ? 'var(--ok-tint)' : 'var(--danger-tint)', color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name={paid ? 'check' : 'receipt'} size={15} />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    Boleta N° {s.boleta} · {s.cliente?.nombre || 'Sin cliente'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>
                    {s.date.toLocaleDateString('es-CL')} · {s.items.length} producto{s.items.length > 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tnum" style={{ fontWeight: 800, color, fontSize: 15 }}>
                    {fmtCLP(s.montoPendiente || s.total)}
                  </div>
                  <span className="chip" style={{ fontSize: 11, padding: '2px 8px', background: paid ? 'var(--ok-tint)' : 'var(--danger-tint)', color }}>
                    {paid ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {saldar && <SaldarModal deudor={saldar} onClose={() => setSaldar(null)} />}
    </div>
  )
}

/* ── Main Clientes screen ─────────────────────────── */
export default function ClientesPage() {
  const { clientes } = useStore()
  const m = useMetrics()
  const [tab, setTab] = useState('clientes')
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const [sort, setSort] = useState<{ k: string; dir: number }>({ k: 'totalGastado', dir: -1 })
  const [detail, setDetail] = useState<EnrichedCliente | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const cats = ['Todos', 'VIP', 'Frecuente', 'Regular', 'En riesgo', 'Nuevo']
  const enriched: EnrichedCliente[] = useMemo(() => clientes.map((c) => ({ ...c, ...clientMetrics(c) })), [clientes])
  let list = enriched.filter((c) => (filtro === 'Todos' || c.categoria === filtro) && c.nombre.toLowerCase().includes(q.toLowerCase()))
  list = [...list].sort((a, b) => {
    const av = getSortVal(a, sort.k)
    const bv = getSortVal(b, sort.k)
    return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir
  })
  const ticketGen = enriched.length ? Math.round(enriched.reduce((a, c) => a + c.totalGastado, 0) / enriched.length) : 0
  const activos = enriched.filter((c) => c.daysSinceLast != null && c.daysSinceLast <= 30).length
  const setS = (k: string) => setSort((s) => (s.k === k ? { k, dir: -s.dir } : { k, dir: -1 }))
  const Th = ({ k, children, num }: { k: string; children: React.ReactNode; num?: boolean }) => (
    <th className={num ? 'num' : ''} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setS(k)}>
      {children}
      {sort.k === k && <span style={{ color: 'var(--primary)' }}> {sort.dir < 0 ? '↓' : '↑'}</span>}
    </th>
  )
  return (
    <div className="fade-in">
      <PageHeader title="Clientes" sub={`${clientes.length} clientes registrados`}>
        {m.totalDeuda > 0 && (
          <span className="chip" style={{ background: 'var(--danger-tint)', color: 'var(--danger)', fontSize: 13, fontWeight: 800, padding: '5px 12px' }}>
            <Icon name="alert" size={13} />
            {fmtCLP(m.totalDeuda)} pendiente
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
        <button className={tab === 'clientes' ? 'on' : ''} onClick={() => setTab('clientes')}>
          Clientes
        </button>
        <button className={tab === 'deudas' ? 'on' : ''} onClick={() => setTab('deudas')}>
          Deudas{' '}
          {m.clientesDeudores > 0 && (
            <span style={{ background: 'var(--danger)', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 800, marginLeft: 4 }}>{m.clientesDeudores}</span>
          )}
        </button>
      </div>
      {tab === 'deudas' ? (
        <DeudasPanel />
      ) : (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', marginBottom: 18 }}>
            <Metric icon="clientes" label="Total clientes" value={clientes.length} tone="primary" sub="En tu base de datos" />
            <Metric icon="cash" label="Ticket medio" value={fmtCLP(ticketGen)} tone="terra" sub="Promedio por cliente" />
            <Metric icon="zap" label="Activos este mes" value={activos} tone="primary" sub="Compraron en los últimos 30 días" />
            <Metric icon="star" label="Clientes VIP" value={enriched.filter((c) => c.categoria === 'VIP').length} tone="terra" sub="Alto valor y frecuencia" />
          </div>

          <div style={{ display: 'flex', gap: 9, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <SearchBox value={q} onChange={setQ} placeholder="Buscar cliente…" width={240} />
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto' }}>
              {cats.map((c) => (
                <button key={c} onClick={() => setFiltro(c)} className="chip" style={{ whiteSpace: 'nowrap', cursor: 'pointer', padding: '7px 13px', fontSize: 13, border: '1px solid ' + (filtro === c ? 'var(--primary)' : 'var(--line)'), background: filtro === c ? 'var(--primary)' : 'var(--surface)', color: filtro === c ? '#fff' : 'var(--ink-2)', fontWeight: 700 }}>
                  {c}
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
                    <Th k="compras.length" num>
                      Compras
                    </Th>
                    <Th k="totalGastado" num>
                      Total gastado
                    </Th>
                    <Th k="ticketMedio" num>
                      Ticket medio
                    </Th>
                    <Th k="daysSinceLast" num>
                      Última compra
                    </Th>
                    <th>Próxima esperada</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => {
                    const next = c.nextExpected
                    const late = c.daysUntilNext != null && c.daysUntilNext < 0
                    const soon = c.daysUntilNext != null && c.daysUntilNext >= 0 && c.daysUntilNext <= 3
                    return (
                      <tr
                        key={c.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setDetail(c)}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      >
                        <td>
                          <div style={{ fontWeight: 700 }}>{c.nombre}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{c.correo}</div>
                        </td>
                        <td style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{c.ciudad}</td>
                        <td>
                          <ClienteChip cat={c.categoria} />
                        </td>
                        <td className="num tnum" style={{ fontWeight: 700 }}>
                          {c.compras.length}
                        </td>
                        <td className="num tnum" style={{ fontWeight: 800 }}>
                          {fmtCLP(c.totalGastado)}
                        </td>
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
                        <td className="num">
                          <Icon name="chevR" size={16} style={{ color: 'var(--ink-3)' }} />
                        </td>
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

          {detail && <ClienteDetail c={enriched.find((c) => c.id === detail.id) || detail} onClose={() => setDetail(null)} />}
          {showImport && <ImportModal onClose={() => setShowImport(false)} />}
          {showExport && <ExportModal onClose={() => setShowExport(false)} />}
        </>
      )}
    </div>
  )
}

/** Acceso a campo ordenable, incluyendo el caso especial 'compras.length'. */
function getSortVal(c: EnrichedCliente, k: string): number | string {
  if (k === 'compras.length') return c.compras.length
  const v = (c as unknown as Record<string, unknown>)[k]
  if (typeof v === 'number' || typeof v === 'string') return v
  return 0
}
