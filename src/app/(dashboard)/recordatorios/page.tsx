'use client'

// ---------- Recordatorios (portado de screen-recordatorios.jsx) ----------
import { useState, useMemo } from 'react'
import { useStore, useMetrics } from '@/lib/store'
import { fmtCLP } from '@/lib/format'
import { useGo } from '@/lib/nav'
import { Icon } from '@/components/icon'
import { PageHeader, Metric, Modal, EmptyState, Field } from '@/components/ui'
import type { Product, Cliente } from '@/types'

interface ReminderTypeDef {
  icon: string
  color: string
  tint: string
  label: string
}

type Priority = 'alta' | 'media' | 'baja'

interface ReminderLink {
  screen: string
}

interface Reminder {
  id: string
  type: string
  title: string
  desc: string
  due: Date
  priority: Priority
  status: string
  link: ReminderLink | null
  createdAt: Date
}

const REMINDER_TYPES: Record<string, ReminderTypeDef> = {
  factura: { icon: 'receipt', color: 'var(--terra)', tint: 'var(--terra-tint)', label: 'Factura pendiente' },
  cliente: { icon: 'clientes', color: 'var(--info)', tint: 'var(--info-tint)', label: 'Cliente' },
  stock: { icon: 'box', color: 'var(--danger)', tint: 'var(--danger-tint)', label: 'Stock' },
  gasto: { icon: 'tag', color: 'oklch(0.50 0.10 70)', tint: 'var(--warn-tint)', label: 'Gasto' },
  nomina: { icon: 'clientes', color: 'var(--primary-700)', tint: 'var(--primary-tint)', label: 'Nómina' },
  arriendo: { icon: 'store', color: 'oklch(0.60 0.10 280)', tint: 'oklch(0.94 0.02 280)', label: 'Arriendo' },
  meta: { icon: 'star', color: 'var(--terra)', tint: 'var(--terra-tint)', label: 'Meta' },
  tarea: { icon: 'check', color: 'var(--ink-2)', tint: 'var(--surface-3)', label: 'Tarea' },
}

const PRIORITIES: Record<Priority, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' }
const STATUSES: Record<string, string> = { pendiente: 'Pendiente', en_proceso: 'En proceso', completado: 'Completado', vencido: 'Vencido', pospuesto: 'Pospuesto' }

export function seedReminders(products: Product[], _clientes: Cliente[]): Reminder[] {
  const r: Reminder[] = []
  let id = 1
  const add = (type: string, title: string, desc: string, due: Date, priority: Priority = 'media', status = 'pendiente', link: ReminderLink | null = null) =>
    r.push({ id: 'rem' + id++, type, title, desc, due: new Date(due), priority, status, link, createdAt: new Date() })

  // Auto from stock
  const sinStock = products.filter((p) => p.stock <= 0).slice(0, 3)
  sinStock.forEach((p) => add('stock', `Reponer ${p.name}`, 'Sin stock disponible. Conviene reponer antes de perder ventas.', new Date(2026, 5, 9), 'alta', 'pendiente', { screen: 'inventario' }))

  // Auto from clientes próximos
  add('cliente', '5 clientes próximos a recomprar', 'Esta semana es buen momento para contactarlos y generar ventas.', new Date(2026, 5, 10), 'media', 'pendiente', { screen: 'segmentos' })

  // Factura pendiente
  add('factura', 'Emitir factura a Distribuidora Pérez', 'Venta #46198 por $42.000 — cliente solicitó factura.', new Date(2026, 5, 12), 'alta', 'pendiente', { screen: 'ventas' })
  add('factura', 'Factura pendiente: Comercial Soto', 'Venta #46201 por $87.500 — plazo estimado fin de semana.', new Date(2026, 5, 14), 'alta', 'pendiente', { screen: 'ventas' })

  // Gastos
  add('gasto', 'Pagar cuenta de servicios básicos', 'Luz y agua del local — vence el 12 de junio.', new Date(2026, 5, 12), 'media', 'pendiente', { screen: 'finanzas' })
  add('arriendo', 'Arriendo de junio pendiente', '$420.000 — vence el 15 de junio.', new Date(2026, 5, 15), 'alta', 'pendiente', { screen: 'finanzas' })
  add('nomina', 'Pago nómina semanal', 'Camila y Diego — $280.000 en total.', new Date(2026, 5, 13), 'alta', 'pendiente', { screen: 'finanzas' })

  // Meta
  add('meta', 'Revisar avance meta financiera', 'Meta $5.000.000 — faltan 76 días. Vas al 42%.', new Date(2026, 5, 11), 'baja', 'pendiente', { screen: 'finanzas' })

  // Manual tasks (completed)
  add('tarea', 'Llamar proveedor de frutos secos', 'Coordinar entrega semanal.', new Date(2026, 5, 7), 'baja', 'completado', null)
  add('tarea', 'Actualizar precios quesos', 'El proveedor subió costos un 8%.', new Date(2026, 5, 8), 'media', 'completado', { screen: 'productos' })

  return r
}

function ReminderCard({
  r,
  onComplete,
  onPostpone,
  onDelete,
  go,
}: {
  r: Reminder
  onComplete: (id: string) => void
  onPostpone: (id: string) => void
  onDelete: (id: string) => void
  go: (screen: string) => void
}) {
  const t = REMINDER_TYPES[r.type] || REMINDER_TYPES.tarea
  const isOverdue = r.status !== 'completado' && r.due < new Date()
  const isDone = r.status === 'completado'
  const daysLeft = Math.ceil((r.due.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="card" style={{ opacity: isDone ? 0.6 : 1, border: `1px solid ${isOverdue ? 'var(--danger)' : t.color}20`, transition: 'opacity .2s' }}>
      <div style={{ display: 'flex', gap: 14, padding: '15px 18px', alignItems: 'flex-start' }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: isDone ? 'var(--surface-3)' : t.tint, color: isDone ? 'var(--ink-3)' : t.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name={isDone ? 'check' : t.icon} size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 14.5, lineHeight: 1.2, flex: 1 }}>{r.title}</span>
            <span className="chip" style={{
              fontSize: 11.5, padding: '2px 8px',
              background: r.priority === 'alta' ? 'var(--danger-tint)' : r.priority === 'media' ? 'var(--warn-tint)' : 'var(--surface-3)',
              color: r.priority === 'alta' ? 'var(--danger)' : r.priority === 'media' ? 'oklch(0.50 0.10 70)' : 'var(--ink-3)',
            }}>
              {PRIORITIES[r.priority]}
            </span>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 8, lineHeight: 1.35 }}>{r.desc}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="chip" style={{ background: t.tint, color: t.color, fontSize: 11.5 }}>{t.label}</span>
            {!isDone && (
              <span className="chip" style={{
                background: isOverdue ? 'var(--danger-tint)' : daysLeft <= 2 ? 'var(--warn-tint)' : 'var(--surface-3)',
                color: isOverdue ? 'var(--danger)' : daysLeft <= 2 ? 'oklch(0.50 0.10 70)' : 'var(--ink-3)', fontSize: 11.5,
              }}>
                <Icon name="clock" size={12} />
                {isOverdue ? `Vencido hace ${Math.abs(daysLeft)}d` : daysLeft === 0 ? 'Hoy' : daysLeft === 1 ? 'Mañana' : `En ${daysLeft}d`}
              </span>
            )}
            <span className="chip chip-neutral" style={{ fontSize: 11.5 }}>{STATUSES[r.status] || r.status}</span>
          </div>
        </div>
        {!isDone && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            {r.link && <button className="btn btn-soft" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => go(r.link!.screen)}><Icon name="chevR" size={13} />Ver</button>}
            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => onComplete(r.id)}><Icon name="check" size={13} />Listo</button>
            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => onPostpone(r.id)}>Posponer</button>
          </div>
        )}
        {isDone && <button className="btn btn-ghost btn-icon" style={{ width: 30, height: 30 }} onClick={() => onDelete(r.id)}><Icon name="trash" size={14} /></button>}
      </div>
    </div>
  )
}

interface NewReminderForm {
  type: string
  title: string
  desc: string
  due: string
  priority: Priority
}

function NewReminderModal({ onClose, onSave }: { onClose: () => void; onSave: (r: Reminder) => void }) {
  const [f, setF] = useState<NewReminderForm>({ type: 'tarea', title: '', desc: '', due: '', priority: 'media' })
  const set = <K extends keyof NewReminderForm>(k: K, v: NewReminderForm[K]) => setF((s) => ({ ...s, [k]: v }))
  const valid = f.title.trim() && f.due
  return (
    <Modal title="Nuevo recordatorio" sub="Crea una tarea o recordatorio para tu negocio" onClose={onClose} width={520}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => { onSave({ ...f, id: 'rem' + Date.now(), due: new Date(f.due), status: 'pendiente', link: null, createdAt: new Date() }); onClose() }}><Icon name="plus" size={15} />Agregar</button></>}>
      <div style={{ display: 'grid', gap: 13 }}>
        <Field label="Tipo">
          <select className="select" value={f.type} onChange={(e) => set('type', e.target.value)}>
            {Object.entries(REMINDER_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Título"><input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Ej: Llamar proveedor de huevos" autoFocus /></Field>
        <Field label="Descripción"><input className="input" value={f.desc} onChange={(e) => set('desc', e.target.value)} placeholder="Detalles opcionales" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Fecha límite"><input className="input" type="date" value={f.due} onChange={(e) => set('due', e.target.value)} /></Field>
          <Field label="Prioridad">
            <select className="select" value={f.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
              {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
      </div>
    </Modal>
  )
}

export default function RecordatoriosPage() {
  const go = useGo()
  const { products, clientes } = useStore()
  const m = useMetrics()
  const [reminders, setReminders] = useState<Reminder[]>(() => seedReminders(products, clientes))
  const [filter, setFilter] = useState('pendientes')
  const [typeFilter, setTypeFilter] = useState('todos')
  const [showNew, setShowNew] = useState(false)

  // Auto-inject debt reminders
  const debtReminders = useMemo<Reminder[]>(() => {
    if (!m.totalDeuda) return []
    return [{
      id: 'auto_deuda', type: 'cliente', title: `Cobrar deuda pendiente (${fmtCLP(m.totalDeuda)})`,
      desc: `${m.clientesDeudores} cliente${m.clientesDeudores !== 1 ? 's' : ''} con ventas a crédito sin pagar.`,
      due: new Date(), priority: 'alta', status: 'pendiente', link: { screen: 'clientes' }, createdAt: new Date(),
    }]
  }, [m.totalDeuda, m.clientesDeudores])

  const allReminders = [...debtReminders, ...reminders]

  const filtered = useMemo(() => {
    let list = allReminders
    if (filter === 'pendientes') list = list.filter((r) => r.status === 'pendiente' || r.status === 'en_proceso')
    else if (filter === 'vencidos') list = list.filter((r) => r.status !== 'completado' && r.due < new Date())
    else if (filter === 'hoy') list = list.filter((r) => r.status !== 'completado' && r.due.toDateString() === new Date().toDateString())
    else if (filter === 'completados') list = list.filter((r) => r.status === 'completado')
    if (typeFilter !== 'todos') list = list.filter((r) => r.type === typeFilter)
    return list.slice().sort((a, b) => {
      const p: Record<string, number> = { alta: 0, media: 1, baja: 2 }
      return (p[a.priority] || 1) - (p[b.priority] || 1) || a.due.getTime() - b.due.getTime()
    })
  }, [allReminders, filter, typeFilter])

  const complete = (id: string) => setReminders((rs) => rs.map((r) => (r.id === id ? { ...r, status: 'completado' } : r)))
  const postpone = (id: string) => setReminders((rs) => rs.map((r) => (r.id === id ? { ...r, due: new Date(r.due.getTime() + 3 * 24 * 60 * 60 * 1000), status: 'pospuesto' } : r)))
  const remove = (id: string) => setReminders((rs) => rs.filter((r) => r.id !== id))

  const counts: Record<string, number> = {
    pendientes: allReminders.filter((r) => r.status === 'pendiente' || r.status === 'en_proceso').length,
    vencidos: allReminders.filter((r) => r.status !== 'completado' && r.due < new Date()).length,
    hoy: allReminders.filter((r) => r.status !== 'completado' && r.due.toDateString() === new Date().toDateString()).length,
    completados: allReminders.filter((r) => r.status === 'completado').length,
  }

  return (
    <div className="fade-in">
      <PageHeader title="Recordatorios" sub="Tareas, facturas y pendientes de tu negocio">
        <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon name="plus" size={16} />Nuevo recordatorio</button>
      </PageHeader>

      {/* Summary metrics */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', marginBottom: 18 }}>
        <Metric icon="alert" label="Pendientes" value={counts.pendientes} tone={counts.pendientes > 5 ? 'danger' : 'warn'} sub="Por resolver" />
        <Metric icon="clock" label="Vencidos" value={counts.vencidos} tone="danger" sub="Requieren atención" />
        <Metric icon="zap" label="Para hoy" value={counts.hoy} tone="terra" sub="Fecha límite hoy" />
        <Metric icon="check" label="Completados" value={counts.completados} tone="primary" sub="Bien hecho" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="seg">
          {([['pendientes', 'Pendientes'], ['vencidos', 'Vencidos'], ['hoy', 'Hoy'], ['todos', 'Todos'], ['completados', 'Completados']] as [string, string][]).map(([k, l]) => (
            <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
              {l}{counts[k] > 0 && filter !== k && <span style={{ marginLeft: 4, background: 'var(--danger)', color: '#fff', borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>{counts[k]}</span>}
            </button>
          ))}
        </div>
        <select className="select" style={{ minWidth: 160, fontSize: 13.5 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="todos">Todos los tipos</option>
          {Object.entries(REMINDER_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon="check" title="Sin recordatorios" text={filter === 'completados' ? 'Aún no has completado ningún recordatorio.' : 'Todo al día por ahora. ¡Bien hecho!'} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((r) => (
            <ReminderCard key={r.id} r={r} onComplete={complete} onPostpone={postpone} onDelete={remove} go={go} />
          ))}
        </div>
      )}

      {showNew && <NewReminderModal onClose={() => setShowNew(false)} onSave={(r) => setReminders((rs) => [r, ...rs])} />}
    </div>
  )
}
