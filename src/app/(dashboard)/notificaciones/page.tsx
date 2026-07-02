'use client'

// ---------- Notificaciones (portado de screen-notificaciones.jsx) ----------
import { useState, useMemo } from 'react'
import { useStore, useMetrics, clientMetrics } from '@/lib/store'

import { fmtCLP, fmtPct } from '@/lib/format'
import { useGo } from '@/lib/nav'
import { Icon } from '@/components/icon'
import { PageHeader, Modal, EmptyState, Field } from '@/components/ui'
import type { Product, Sale, Settings, Cliente } from '@/types'

interface NotifTypeDef {
  icon: string
  color: string
  tint: string
  label: string
}

const NOTIF_TYPES: Record<string, NotifTypeDef> = {
  stock: { icon: 'box', color: 'var(--danger)', tint: 'var(--danger-tint)', label: 'Stock' },
  deuda: { icon: 'receipt', color: 'var(--warn)', tint: 'var(--warn-tint)', label: 'Deuda' },
  cliente: { icon: 'clientes', color: 'var(--info)', tint: 'var(--info-tint)', label: 'Clientes' },
  meta: { icon: 'star', color: 'var(--terra)', tint: 'var(--terra-tint)', label: 'Metas' },
  margen: { icon: 'percent', color: 'oklch(0.50 0.10 70)', tint: 'var(--warn-tint)', label: 'Márgenes' },
  venta: { icon: 'trendUp', color: 'var(--primary-700)', tint: 'var(--primary-tint)', label: 'Ventas' },
}

interface Notif {
  id: string
  type: string
  title: string
  body: string
  action: string
  priority: number
  time: Date
}

type Metrics = ReturnType<typeof useMetrics>

/* Generate smart notifications from live data */
export function buildNotifications(metrics: Metrics, products: Product[], _sales: Sale[], settings: Settings, clientes: Cliente[] = []): Notif[] {
  const notifs: Notif[] = []
  const add = (id: string, type: string, title: string, body: string, action: string, priority = 2) =>
    notifs.push({ id, type, title, body, action, priority, time: new Date() })

  /* Stock alerts */
  const sinStock = products.filter((p) => p.stock === 0)
  const stockBajo = products.filter((p) => p.stock > 0 && p.stock <= p.min)
  if (sinStock.length)
    add('sin_stock', 'stock', `${sinStock.length} producto${sinStock.length > 1 ? 's' : ''} sin stock`,
      sinStock.slice(0, 3).map((p) => p.name).join(', ') + (sinStock.length > 3 ? '…' : ''), 'inventario', 1)
  if (stockBajo.length)
    add('stock_bajo', 'stock', `${stockBajo.length} producto${stockBajo.length > 1 ? 's' : ''} con stock bajo`,
      'Conviene reponer pronto para no quedar sin existencias', 'inventario', 2)

  /* Debt alerts */
  if (metrics.totalDeuda > 0)
    add('deuda', 'deuda', `${fmtCLP(metrics.totalDeuda)} pendiente de cobro`,
      `${metrics.clientesDeudores} cliente${metrics.clientesDeudores !== 1 ? 's' : ''} con ventas a crédito sin pagar`, 'clientes', 1)

  /* Clients about to buy — conteo REAL desde el historial de compras */
  const proxCount = clientes.filter((c) => {
    const cm = clientMetrics(c)
    return cm.daysUntilNext != null && cm.daysUntilNext >= 0 && cm.daysUntilNext <= 7
  }).length
  if (proxCount > 0)
    add('clientes_prox', 'cliente', `${proxCount} cliente${proxCount > 1 ? 's' : ''} próximo${proxCount > 1 ? 's' : ''} a recomprar`,
      'Esta semana es buen momento para contactarlos y generar ventas', 'segmentos', 2)

  /* Low margin warning */
  const lowMargin = products.filter((p) => p.price > 0 && p.marginPct < (settings?.minMargin || 25))
  if (lowMargin.length)
    add('margen_bajo', 'margen', `${lowMargin.length} producto${lowMargin.length > 1 ? 's' : ''} con margen bajo`,
      `Bajo el ${settings?.minMargin || 25}% recomendado — revisa precios o costos`, 'productos', 3)

  /* Top category */
  const topCat = metrics.cats?.[0]
  if (topCat)
    add('top_cat', 'venta', `${topCat.cat} lidera las ventas del mes`,
      `${fmtCLP(topCat.revenue)} en ingresos — margen del ${fmtPct(topCat.marginPct)}`, 'reportes', 4)

  /* Good day alert */
  if (metrics.todayTotal > metrics.totRevenue / 30)
    add('buen_dia', 'venta', '¡Buen día de ventas hoy!',
      `${fmtCLP(metrics.todayTotal)} — sobre el promedio diario del mes`, 'dashboard', 4)

  return notifs.sort((a, b) => a.priority - b.priority)
}

interface ReminderRowData {
  id: string
  type: string
  title: string
  desc: string
  frecuencia: string
  active: boolean
}

/* ── Reminder row ── */
function ReminderRow({ r, onToggle, onDelete }: { r: ReminderRowData; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const t = NOTIF_TYPES[r.type] || NOTIF_TYPES.venta
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 20px', borderBottom: '1px solid var(--line)', opacity: r.active ? 1 : 0.55, transition: 'opacity .2s' }}>
      <span style={{ width: 36, height: 36, borderRadius: 10, background: r.active ? t.tint : 'var(--surface-3)', color: r.active ? t.color : 'var(--ink-3)', display: 'grid', placeItems: 'center', flexShrink: 0, transition: '.2s' }}>
        <Icon name={t.icon} size={17} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>{r.desc}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="chip chip-neutral" style={{ fontSize: 11.5 }}>{r.frecuencia}</span>
        {/* Toggle switch */}
        <button onClick={() => onToggle(r.id)} style={{
          width: 42, height: 24, borderRadius: 20, border: 'none', cursor: 'pointer', position: 'relative',
          background: r.active ? 'var(--primary)' : 'var(--line-2)', transition: 'background .2s', flexShrink: 0,
        }}>
          <span style={{ position: 'absolute', top: 3, left: r.active ? 20 : 3, width: 18, height: 18, borderRadius: 50, background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }}></span>
        </button>
        <button className="btn btn-ghost btn-icon" style={{ width: 30, height: 30 }} onClick={() => onDelete(r.id)}>
          <Icon name="trash" size={14} />
        </button>
      </div>
    </div>
  )
}

/* ── Main screen ── */
export default function NotificacionesPage() {
  const go = useGo()
  const { products, sales, settings, negocioId, clientes } = useStore()
  const m = useMetrics()
  const [tab, setTab] = useState('alertas')
  const [filter, setFilter] = useState('todas')

  const notifs = useMemo(() => buildNotifications(m, products, sales, settings, clientes), [m, products, sales, settings, clientes])

  const [reminders, setReminders] = useState<ReminderRowData[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newR, setNewR] = useState({ type: 'stock', title: '', desc: '', frecuencia: 'Diario' })

  const toggleR = (id: string) => setReminders((rs) => rs.map((r) => (r.id === id ? { ...r, active: !r.active } : r)))
  const deleteR = (id: string) => setReminders((rs) => rs.filter((r) => r.id !== id))
  const addR = () => { setReminders((rs) => [...rs, { ...newR, id: 'r' + Date.now(), active: true }]); setShowNew(false); setNewR({ type: 'stock', title: '', desc: '', frecuencia: 'Diario' }) }

  const filteredNotifs = filter === 'todas' ? notifs : notifs.filter((n) => n.type === filter)

  return (
    <div className="fade-in">
      <PageHeader title="Notificaciones" sub="Alertas inteligentes y recordatorios configurables">
        <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon name="plus" size={16} />Nuevo recordatorio</button>
      </PageHeader>

      {/* Tabs */}
      <div className="seg" style={{ marginBottom: 18 }}>
        <button className={tab === 'alertas' ? 'on' : ''} onClick={() => setTab('alertas')}>
          Alertas activas {notifs.length > 0 && <span style={{ background: 'var(--danger)', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 800, marginLeft: 4 }}>{notifs.length}</span>}
        </button>
        <button className={tab === 'recordatorios' ? 'on' : ''} onClick={() => setTab('recordatorios')}>Recordatorios</button>
      </div>

      {tab === 'alertas' ? (
        <>
          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap' }}>
            {['todas', ...Object.keys(NOTIF_TYPES)].map((k) => {
              const t = NOTIF_TYPES[k]
              const cnt = k === 'todas' ? notifs.length : notifs.filter((n) => n.type === k).length
              return (
                <button key={k} onClick={() => setFilter(k)} className="chip" style={{
                  cursor: 'pointer', border: '1px solid ' + (filter === k ? (t?.color || 'var(--primary)') : 'var(--line)'),
                  background: filter === k ? (t?.tint || 'var(--primary-tint)') : 'var(--surface)',
                  color: filter === k ? (t?.color || 'var(--primary-700)') : 'var(--ink-2)',
                  padding: '6px 13px', fontSize: 13, fontWeight: 700,
                }}>
                  {k === 'todas' ? 'Todas' : t?.label} {cnt > 0 && <span style={{ marginLeft: 4, fontWeight: 800 }}>({cnt})</span>}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredNotifs.length === 0 && (
              <div className="card"><EmptyState icon="bell" title="Sin alertas activas" text="Todo está en orden. Te avisaremos cuando haya algo que revisar." /></div>
            )}
            {filteredNotifs.map((n) => {
              const t = NOTIF_TYPES[n.type] || NOTIF_TYPES.venta
              return (
                <button key={n.id} onClick={() => go(n.action)} className="card" style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px',
                  textAlign: 'left', cursor: 'pointer', border: `1px solid ${t.color}20`, width: '100%',
                  transition: '.14s', fontFamily: 'inherit',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.background = t.tint }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.color + '20'; e.currentTarget.style.background = 'var(--surface)' }}>
                  <span style={{ width: 40, height: 40, borderRadius: 11, background: t.tint, color: t.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon name={t.icon} size={19} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 3 }}>{n.title}</div>
                    <div style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600, lineHeight: 1.35 }}>{n.body}</div>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="chip" style={{ background: t.tint, color: t.color, fontSize: 11.5 }}>{t.label}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>Toca para ver →</span>
                    </div>
                  </div>
                  <span style={{ color: 'var(--ink-3)', flexShrink: 0 }}><Icon name="chevR" size={16} /></span>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13.5, color: 'var(--ink-3)', fontWeight: 600, marginBottom: 14 }}>
            Configura cuándo y cómo quieres recibir recordatorios. Actívalos o desactívalos en cualquier momento.
          </div>
          <div className="card">
            {reminders.map((r) => (
              <ReminderRow key={r.id} r={r} onToggle={toggleR} onDelete={deleteR} />
            ))}
            {reminders.length === 0 && <EmptyState icon="bell" title="Sin recordatorios" text="Agrega tu primer recordatorio para mantenerte al día." />}
          </div>

          <div style={{ marginTop: 14, padding: '14px 18px', background: 'var(--surface-3)', borderRadius: 13, border: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Icon name="alert" size={15} style={{ color: 'var(--ink-3)', marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>
              Los recordatorios por WhatsApp y correo estarán disponibles en la versión conectada de Control Local. Por ahora las alertas aparecen aquí y en el panel de notificaciones.
            </div>
          </div>
        </>
      )}

      {showNew && (
        <Modal title="Nuevo recordatorio" onClose={() => setShowNew(false)} width={480}
          footer={<><button className="btn btn-ghost" onClick={() => setShowNew(false)}>Cancelar</button>
            <button className="btn btn-primary" disabled={!newR.title.trim()} onClick={addR}><Icon name="plus" size={15} />Agregar</button></>}>
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Tipo de alerta">
              <select className="select" value={newR.type} onChange={(e) => setNewR((r) => ({ ...r, type: e.target.value }))}>
                {Object.entries(NOTIF_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Título"><input className="input" value={newR.title} onChange={(e) => setNewR((r) => ({ ...r, title: e.target.value }))} placeholder="Ej: Revisar quesos con stock bajo" autoFocus /></Field>
            <Field label="Descripción"><input className="input" value={newR.desc} onChange={(e) => setNewR((r) => ({ ...r, desc: e.target.value }))} placeholder="Opcional" /></Field>
            <Field label="Frecuencia">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {['Diario', 'Semanal', 'Mensual'].map((fr) => (
                  <button key={fr} onClick={() => setNewR((r) => ({ ...r, frecuencia: fr }))} className="btn" style={{
                    border: '1px solid ' + (newR.frecuencia === fr ? 'var(--primary)' : 'var(--line)'),
                    background: newR.frecuencia === fr ? 'var(--primary-tint)' : 'var(--surface)',
                    color: newR.frecuencia === fr ? 'var(--primary-700)' : 'var(--ink-2)',
                    fontWeight: 700, padding: '10px', fontSize: 13.5,
                  }}>{fr}</button>
                ))}
              </div>
            </Field>
          </div>
        </Modal>
      )}
    </div>
  )
}
