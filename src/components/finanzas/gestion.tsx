'use client'

// ---------- Finanzas: Proyección, Metas, Equilibrio, Gastos (portado de finanzas-tabs.jsx) ----------

import { useState } from 'react'
import { TODAY } from '@/lib/store'
import { useFinanzas, useFinMetrics, GASTO_CATS, GASTO_ICONS, GASTO_COLORS } from '@/lib/finanzas-store'
import { fmtCLP, fmtPct } from '@/lib/format'
import { Icon } from '@/components/icon'
import { Modal, EmptyState, Field } from '@/components/ui'
import { FinCard, AlertaBanner } from '@/components/finanzas/shared'
import type { Meta } from '@/types'

/* ── Proyección ──────────────────────────────── */
export function FinProyeccion() {
  const m = useFinMetrics()
  const [ticket, setTicket] = useState(() => Math.round(m.ticketProm) || 32000)
  const [conv, setConv] = useState(30)
  const [contactados, setContactados] = useState(() => m.proximos7 || 0)
  const [dias, setDias] = useState(7)
  const ventaEsp = Math.round(contactados * (conv / 100) * ticket)
  const ganEsp = Math.round(ventaEsp * (m.margenProm / 100))
  const scenarios = [
    { label: 'Conservador', pct: 20, contact: Math.round(m.proximos7 * 0.3 || 5), color: 'var(--info)' },
    { label: 'Normal', pct: 30, contact: Math.round(m.proximos7 * 0.6 || 10), color: 'var(--primary)' },
    { label: 'Optimista', pct: 40, contact: Math.round(m.proximos7 * 0.8 || 15), color: 'var(--terra)' },
  ]
  const fields: { label: string; val: number; set: (v: number) => void; type: 'money' | 'pct' | 'num'; min?: number; max?: number }[] = [
    { label: 'Ticket promedio ($)', val: ticket, set: setTicket, type: 'money' },
    { label: 'Conversión esperada (%)', val: conv, set: setConv, type: 'pct', min: 1, max: 100 },
    { label: 'Clientes a contactar', val: contactados, set: setContactados, type: 'num' },
    { label: 'Período (días)', val: dias, set: setDias, type: 'num', min: 1, max: 30 },
  ]
  return (
    <div>
      <div style={{ padding: '14px 18px', background: 'var(--primary-tint)', borderRadius: 14, marginBottom: 18, fontSize: 14, fontWeight: 600, color: 'var(--primary-700)', lineHeight: 1.6 }}>
        <Icon name="trending" size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} />
        Con tus <strong>{m.clientesActivos}</strong> clientes activos, ticket promedio de <strong>{fmtCLP(ticket)}</strong> y <strong>{m.proximos7}</strong> clientes próximos a recomprar en los próximos 7 días, podrías proyectar ventas de <strong>{fmtCLP(Math.round(m.proximos7 * 0.3 * ticket))}</strong>–<strong>{fmtCLP(Math.round(m.proximos7 * 0.8 * ticket))}</strong>.
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* Scenarios */}
        <div className="card">
          <div className="card-head"><div style={{ flex: 1 }}><div className="card-title">Escenarios de venta</div><div className="card-sub">Próximos {dias} días</div></div></div>
          <div style={{ padding: '8px 0' }}>
            {scenarios.map((sc, i) => {
              const v = Math.round(sc.contact * (sc.pct / 100) * ticket)
              const g = Math.round(v * (m.margenProm / 100))
              return (
                <div key={i} style={{ padding: '14px 22px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: sc.color + '22', color: sc.color, display: 'grid', placeItems: 'center' }}><Icon name="trending" size={14} /></span>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{sc.label}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 600, fontSize: 12.5, color: 'var(--ink-3)' }}>Contactas {sc.contact} clientes · {sc.pct}% conv.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, padding: '9px 12px', background: 'var(--surface-3)', borderRadius: 10, textAlign: 'center' }}>
                      <div className="tnum" style={{ fontWeight: 800, fontSize: 16, color: sc.color }}>{fmtCLP(v)}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Ventas est.</div>
                    </div>
                    <div style={{ flex: 1, padding: '9px 12px', background: 'var(--surface-3)', borderRadius: 10, textAlign: 'center' }}>
                      <div className="tnum" style={{ fontWeight: 800, fontSize: 16 }}>{fmtCLP(g)}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Ganancia est.</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {/* Simulator */}
        <div className="card">
          <div className="card-head"><div style={{ flex: 1 }}><div className="card-title">Simulador personalizado</div><div className="card-sub">Edita los valores para simular</div></div></div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 13 }}>
            {fields.map((f, i) => (
              <label key={i} className="field">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>{f.label}</span>
                {f.type === 'money' ? (
                  <div className="input-pre"><span className="pre">$</span><input className="tnum" type="number" value={ticket} style={{ padding: '10px 13px 10px 4px', fontSize: 14 }} onChange={(e) => setTicket(+e.target.value || 0)} /></div>
                ) : (
                  <input className="input tnum" type="number" min={f.min || 0} max={f.max} value={f.val} style={{ fontSize: 14 }} onChange={(e) => f.set(+e.target.value || 0)} />
                )}
              </label>
            ))}
            <div style={{ marginTop: 6, padding: '14px', background: 'var(--primary-tint)', borderRadius: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 6 }}>Resultado estimado</div>
              <div className="tnum" style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-700)' }}>{fmtCLP(ventaEsp)}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600, marginTop: 2 }}>en ventas · ganancia {fmtCLP(ganEsp)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Metas ───────────────────────────────────── */
export function FinMetas() {
  const { metas, addMeta, updateMeta, deleteMeta } = useFinanzas()
  const m = useFinMetrics()
  const [form, setForm] = useState(false)
  const [f, setF] = useState({ nombre: '', monto: '', fechaObj: '', saldoActual: '', aporteEsperado: '', prioridad: 'Media' })
  const sF = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }))
  const daysLeft = (meta: Meta) => Math.max(0, Math.ceil((meta.fechaObj.getTime() - TODAY.getTime()) / 86400000))
  const semanaFaltante = (meta: Meta) => (daysLeft(meta) > 0 ? Math.ceil((meta.monto - meta.saldoActual) / Math.max(daysLeft(meta) / 7, 1)) : 0)
  const ventasNec = (meta: Meta) => (m.margenProm > 0 ? (meta.monto - meta.saldoActual) / (m.margenProm / 100) : 0)
  const ticketsNec = (meta: Meta) => (m.ticketProm > 0 ? Math.ceil(ventasNec(meta) / m.ticketProm) : 0)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={() => setForm(true)}><Icon name="plus" size={16} />Nueva meta</button>
      </div>
      {metas.length === 0 && <div className="card"><EmptyState icon="target" title="Sin metas" text="Crea tu primera meta financiera para saber cuánto necesitas vender." action={<button className="btn btn-primary" onClick={() => setForm(true)}>Crear meta</button>} /></div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {metas.map((meta) => {
          const pct = Math.min((meta.saldoActual / meta.monto) * 100, 100)
          const dl = daysLeft(meta)
          const sv = semanaFaltante(meta)
          const vn = ventasNec(meta)
          const tn = ticketsNec(meta)
          return (
            <div key={meta.id} className="card">
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 42, height: 42, borderRadius: 13, background: meta.color + '22', color: meta.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="target" size={22} /></span>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 16 }}>{meta.nombre}</div><div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>{dl} días restantes · {meta.fechaObj.toLocaleDateString('es-CL', { day: '2-digit', month: 'long' })}</div></div>
                <div style={{ textAlign: 'right' }}><div className="tnum" style={{ fontSize: 26, fontWeight: 800, color: meta.color }}>{Math.round(pct)}%</div></div>
                <button className="btn btn-ghost btn-icon" title="Eliminar meta" onClick={() => { if (window.confirm(`¿Eliminar la meta "${meta.nombre}"?`)) deleteMeta(meta.id) }}><Icon name="trash" size={15} /></button>
              </div>
              <div style={{ padding: '16px 22px' }}>
                <div style={{ height: 12, background: 'var(--bg-2)', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ height: '100%', width: pct + '%', background: meta.color, borderRadius: 20, transition: 'width .8s' }}></div>
                </div>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
                  {[{ l: 'Meta', v: fmtCLP(meta.monto) }, { l: 'Ahorrado', v: fmtCLP(meta.saldoActual) }, { l: 'Faltante', v: fmtCLP(meta.monto - meta.saldoActual) }, { l: 'Prioridad', v: meta.prioridad }].map((x, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '9px 6px', background: 'var(--surface-3)', borderRadius: 10 }}>
                      <div className="tnum" style={{ fontWeight: 800, fontSize: 14 }}>{x.v}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, marginTop: 2 }}>{x.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '13px 16px', background: 'var(--surface-3)', borderRadius: 12, fontSize: 13.5, fontWeight: 600 }}>
                  <div style={{ display: 'flex', gap: 8 }}><Icon name="calculator" size={14} style={{ color: 'var(--primary-700)', flexShrink: 0, marginTop: 2 }} /><span>Necesitas ahorrar <strong>{fmtCLP(sv)}</strong> por semana durante {Math.ceil(dl / 7)} semanas.</span></div>
                  <div style={{ display: 'flex', gap: 8 }}><Icon name="cash" size={14} style={{ color: 'var(--terra-700)', flexShrink: 0, marginTop: 2 }} /><span>Con tu margen de {fmtPct(m.margenProm)}, necesitas vender aprox. <strong>{fmtCLP(vn)}</strong> adicionales.</span></div>
                  <div style={{ display: 'flex', gap: 8 }}><Icon name="receipt" size={14} style={{ color: 'var(--info)', flexShrink: 0, marginTop: 2 }} /><span>Eso equivale a aprox. <strong>{tn} ventas</strong> de tu ticket promedio ({fmtCLP(m.ticketProm)}).</span></div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div className="input-pre" style={{ flex: 1 }}><span className="pre">Ahorrado $</span><input className="tnum" type="number" defaultValue={meta.saldoActual} style={{ padding: '9px 12px 9px 4px', fontSize: 14 }} onBlur={(e) => updateMeta(meta.id, { saldoActual: +e.target.value || 0 })} /></div>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>Actualiza el saldo</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {form && (
        <Modal
          title="Nueva meta financiera"
          onClose={() => setForm(false)}
          width={500}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setForm(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                disabled={!f.nombre || !f.monto}
                onClick={() => {
                  addMeta({ nombre: f.nombre, monto: +f.monto || 0, fechaObj: f.fechaObj ? new Date(f.fechaObj) : new Date(TODAY.getTime() + 7776000000), saldoActual: +f.saldoActual || 0, aporteEsperado: +f.aporteEsperado || 0, prioridad: f.prioridad, color: 'var(--primary)' })
                  setForm(false)
                }}
              >
                <Icon name="check" size={15} />Crear meta
              </button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <label className="field"><span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)' }}>Nombre de la meta</span><input className="input" value={f.nombre} onChange={(e) => sF('nombre', e.target.value)} placeholder="Ej: Juntar para reposición" /></label>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label className="field"><span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)' }}>Monto objetivo ($)</span><input className="input tnum" type="number" value={f.monto} onChange={(e) => sF('monto', e.target.value)} placeholder="5000000" /></label>
              <label className="field"><span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)' }}>Fecha objetivo</span><input className="input" type="date" value={f.fechaObj} onChange={(e) => sF('fechaObj', e.target.value)} /></label>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label className="field"><span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)' }}>Saldo actual ($)</span><input className="input tnum" type="number" value={f.saldoActual} onChange={(e) => sF('saldoActual', e.target.value)} placeholder="0" /></label>
              <label className="field"><span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)' }}>Prioridad</span><select className="select" value={f.prioridad} onChange={(e) => sF('prioridad', e.target.value)}><option>Alta</option><option>Media</option><option>Baja</option></select></label>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ── Punto de equilibrio ─────────────────────── */
export function FinEquilibrio() {
  const m = useFinMetrics()
  const [gastosFijos, setGastosFijos] = useState(() => Math.round(m.gastosFijos) || 1200000)
  const [margen, setMargen] = useState(() => Math.round(m.margenProm * 10) / 10 || 25)
  const ventaMin = margen > 0 ? Math.round(gastosFijos / (margen / 100)) : 0
  const ventaDia = Math.round(ventaMin / 30)
  const ventaSemana = Math.round(ventaMin / 4.3)
  const actual = m.ingresosMes
  const pct = ventaMin > 0 ? Math.min((actual / ventaMin) * 100, 100) : 100
  const superavit = actual - ventaMin
  return (
    <div>
      <div style={{ marginBottom: 20, padding: '16px 20px', background: 'var(--surface-3)', borderRadius: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>¿Cuánto necesitas vender para cubrir tus gastos?</div>
        <div style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600, lineHeight: 1.5 }}>Este es el mínimo que necesitas vender para cubrir tus gastos fijos. Después de este punto, empiezas a generar utilidad real.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="card">
          <div className="card-head"><div style={{ flex: 1 }}><div className="card-title">Calculadora</div><div className="card-sub">Ajusta tus valores</div></div></div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="field"><span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)' }}>Gastos fijos mensuales ($)</span>
              <div className="input-pre"><span className="pre">$</span><input className="tnum" type="number" value={gastosFijos} style={{ padding: '10px 13px 10px 4px', fontSize: 14 }} onChange={(e) => setGastosFijos(+e.target.value || 0)} /></div>
            </label>
            <label className="field"><span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)' }}>Margen promedio (%)</span>
              <input className="input tnum" type="number" min={1} max={100} value={margen} style={{ fontSize: 14 }} onChange={(e) => setMargen(+e.target.value || 1)} />
              <span className="hint">Tu margen actual del mes: {fmtPct(m.margenProm)}</span>
            </label>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div style={{ flex: 1 }}><div className="card-title">Punto de equilibrio</div><div className="card-sub">Ventas mínimas necesarias</div></div></div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[{ l: 'Mensual', v: fmtCLP(ventaMin) }, { l: 'Semanal', v: fmtCLP(ventaSemana) }, { l: 'Diario', v: fmtCLP(ventaDia) }].map((x, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-3)', borderRadius: 11 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-2)' }}>{x.l}</span>
                <span className="tnum" style={{ fontWeight: 800, fontSize: 16 }}>{x.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Progress vs actual */}
      <div className="card card-pad">
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Avance actual vs punto de equilibrio</div>
        <div style={{ height: 16, background: 'var(--bg-2)', borderRadius: 20, overflow: 'hidden', marginBottom: 10, position: 'relative' }}>
          <div style={{ height: '100%', width: pct + '%', background: pct >= 100 ? 'var(--primary)' : pct >= 70 ? 'oklch(0.70 0.10 75)' : 'var(--danger)', borderRadius: 20, transition: 'width .8s' }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 12 }}>
          <span>Ventas del mes: {fmtCLP(actual)}</span><span>Punto de equilibrio: {fmtCLP(ventaMin)}</span>
        </div>
        <div style={{ padding: '13px 16px', background: superavit >= 0 ? 'var(--primary-tint)' : 'var(--danger-tint)', borderRadius: 12, fontWeight: 700, fontSize: 14, color: superavit >= 0 ? 'var(--primary-700)' : 'var(--danger)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name={superavit >= 0 ? 'check' : 'alert'} size={18} />
          {superavit >= 0 ? `¡Superávit de ${fmtCLP(superavit)}! Ya cubriste tus gastos fijos y estás generando utilidad.` : `Faltan ${fmtCLP(Math.abs(superavit))} en ventas para cubrir tus gastos fijos del mes.`}
        </div>
      </div>
    </div>
  )
}

/* ── Gastos tab ──────────────────────────────── */
export function FinGastos() {
  const { gastos, nomina, marketing, addGasto, updateGasto, deleteGasto, addNomina, payNomina, deleteNomina, addMarketing, deleteMarketing } = useFinanzas()
  const fm = useFinMetrics()
  const [subTab, setSubTab] = useState('gastos')
  const [form, setForm] = useState(false)
  const [f, setF] = useState({ cat: 'Arriendo', desc: '', monto: '', method: 'Transferencia', recurrente: false, respaldo: true, proveedor: '', estado: 'pendiente' as 'pendiente' | 'pagado', fecha: TODAY.toISOString().slice(0, 10) })
  const sF = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))
  // Formulario de nómina (persona / pago al personal)
  const [formNom, setFormNom] = useState(false)
  const [fn, setFn] = useState({ nombre: '', cargo: '', tipo: 'Sueldo fijo', monto: '', dia: '5', bono: '' })
  const sFn = <K extends keyof typeof fn>(k: K, v: (typeof fn)[K]) => setFn((s) => ({ ...s, [k]: v }))
  // Formulario de campaña de marketing
  const [formMkt, setFormMkt] = useState(false)
  const [fk, setFk] = useState({ campaign: '', canal: 'Instagram', fecha: TODAY.toISOString().slice(0, 10), monto: '', ventasGeneradas: '', clientesNuevos: '', obs: '' })
  const sFk = <K extends keyof typeof fk>(k: K, v: (typeof fk)[K]) => setFk((s) => ({ ...s, [k]: v }))
  const mesInicio = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)
  const totalMes = gastos.filter((g) => g.fecha >= mesInicio).reduce((a, g) => a + g.monto, 0)
  const totalNom = nomina.reduce((a, n) => a + n.monto + (n.bono || 0), 0)
  const totalMkt = marketing.reduce((a, mk) => a + mk.monto, 0)
  const totalRoas = marketing.reduce((a, mk) => a + mk.ventasGeneradas, 0)
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <div className="seg">
          {[['gastos', 'Gastos'], ['arriendo', 'Arriendo'], ['nomina', 'Nómina'], ['marketing', 'Marketing']].map(([k, l]) => (
            <button key={k} className={subTab === k ? 'on' : ''} onClick={() => setSubTab(k)}>{l}</button>
          ))}
        </div>
        {subTab === 'gastos' && <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setForm(true)}><Icon name="plus" size={16} />Agregar gasto</button>}
        {subTab === 'nomina' && <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setFormNom(true)}><Icon name="plus" size={16} />Agregar persona</button>}
        {subTab === 'marketing' && <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setFormMkt(true)}><Icon name="plus" size={16} />Agregar campaña</button>}
      </div>

      {subTab === 'gastos' && (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16, gap: 12 }}>
            <FinCard icon="tag" label="Gastos del mes" value={fmtCLP(totalMes)} tone="warn" />
            <FinCard icon="shield" label="Pendientes" value={fmtCLP(gastos.filter((g) => g.estado === 'pendiente').reduce((a, g) => a + g.monto, 0))} tone="danger" />
            <FinCard icon="check" label="Pagados" value={fmtCLP(gastos.filter((g) => g.estado === 'pagado').reduce((a, g) => a + g.monto, 0))} tone="primary" />
          </div>
          <div className="card"><div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Proveedor</th><th className="num">Monto</th><th>Tipo</th><th>Estado</th><th></th></tr></thead>
              <tbody>{gastos.map((g) => (
                <tr key={g.id}>
                  <td className="tnum" style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{g.fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</td>
                  <td style={{ fontWeight: 700 }}>{g.desc}</td>
                  <td><span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--ink-2)' }}><Icon name={GASTO_ICONS[g.cat] || 'tag'} size={13} style={{ color: GASTO_COLORS[g.cat] }} />{g.cat}</span></td>
                  <td style={{ color: 'var(--ink-3)', fontWeight: 600, fontSize: 13.5 }}>{g.proveedor}</td>
                  <td className="num tnum" style={{ fontWeight: 800 }}>{fmtCLP(g.monto)}</td>
                  <td><span className="chip chip-neutral" style={{ fontSize: 11.5 }}>{g.recurrente ? 'Fijo' : 'Variable'}</span></td>
                  <td><span className="chip" style={{ background: g.estado === 'pagado' ? 'var(--ok-tint)' : 'var(--warn-tint)', color: g.estado === 'pagado' ? 'var(--primary-700)' : 'oklch(0.50 0.10 70)', fontSize: 12, cursor: 'pointer' }} onClick={() => updateGasto(g.id, { estado: g.estado === 'pagado' ? 'pendiente' : 'pagado' })}>{g.estado}</span></td>
                  <td><button className="btn btn-ghost btn-icon" style={{ width: 30, height: 30 }} onClick={() => deleteGasto(g.id)}><Icon name="trash" size={14} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div></div>
        </>
      )}

      {subTab === 'arriendo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {gastos.filter((g) => g.cat === 'Arriendo').map((g) => (
            <div key={g.id} className="card card-pad" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--terra-tint)', color: 'var(--terra-700)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="building" size={22} /></span>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 15 }}>{g.desc}</div><div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>{g.proveedor} · {g.fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'long' })}</div></div>
              <div style={{ textAlign: 'right' }}><div className="tnum" style={{ fontWeight: 800, fontSize: 20 }}>{fmtCLP(g.monto)}</div><span className="chip" style={{ background: g.estado === 'pagado' ? 'var(--ok-tint)' : 'var(--warn-tint)', color: g.estado === 'pagado' ? 'var(--primary-700)' : 'oklch(0.50 0.10 70)', fontSize: 12, cursor: 'pointer', marginTop: 4 }} onClick={() => updateGasto(g.id, { estado: g.estado === 'pagado' ? 'pendiente' : 'pagado' })}>{g.estado}</span></div>
            </div>
          ))}
          {gastos.filter((g) => g.cat === 'Arriendo').length === 0 && <div className="card"><EmptyState icon="building" title="Sin arriendo registrado" text='Registra tu arriendo como gasto (categoría "Arriendo") y aparecerá aquí.' /></div>}
          <AlertaBanner tone="primary" icon="building">El arriendo representa el {fmtPct((gastos.filter((g) => g.cat === 'Arriendo' && g.fecha >= mesInicio).reduce((a, g) => a + g.monto, 0) / (totalMes || 1)) * 100)} de tus gastos del mes.</AlertaBanner>
        </div>
      )}

      {subTab === 'nomina' && (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16, gap: 12 }}>
            <FinCard icon="nomina" label="Nómina del mes" value={fmtCLP(totalNom)} tone="info" />
            <FinCard icon="alert" label="Pagos pendientes" value={nomina.filter((n) => n.estado === 'pendiente').length} tone={nomina.filter((n) => n.estado === 'pendiente').length > 0 ? 'danger' : 'primary'} />
            <FinCard icon="percent" label="% de ventas" value={fmtPct((totalNom / (fm.ingresosMes || 1)) * 100)} tone={totalNom / Math.max(fm.ingresosMes, 1) > 0.3 ? 'danger' : 'primary'} />
          </div>
          {nomina.length === 0 && <div className="card"><EmptyState icon="nomina" title="Sin personal registrado" text='Agrega a las personas que pagas cada mes con el botón "Agregar persona".' action={<button className="btn btn-primary" onClick={() => setFormNom(true)}><Icon name="plus" size={15} />Agregar persona</button>} /></div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {nomina.map((n) => (
              <div key={n.id} className="card card-pad" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--info-tint)', color: 'var(--info)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{n.nombre[0]}</div>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 800 }}>{n.nombre}</div><div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{n.cargo} · {n.tipo} · Día {n.dia}</div></div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tnum" style={{ fontWeight: 800, fontSize: 18 }}>{fmtCLP(n.monto + (n.bono || 0))}</div>
                  {n.bono > 0 && <div style={{ fontSize: 12, color: 'var(--primary-700)', fontWeight: 700 }}>+{fmtCLP(n.bono)} bono</div>}
                </div>
                <span className="chip" title="Clic para alternar pagado/pendiente" style={{ background: n.estado === 'pagado' ? 'var(--ok-tint)' : 'var(--warn-tint)', color: n.estado === 'pagado' ? 'var(--primary-700)' : 'oklch(0.50 0.10 70)', fontSize: 12, cursor: 'pointer' }} onClick={() => payNomina(n.id)}>{n.estado}</span>
                <button className="btn btn-ghost btn-icon" style={{ width: 30, height: 30 }} title="Quitar" onClick={() => { if (window.confirm(`¿Quitar a ${n.nombre} de la nómina?`)) deleteNomina(n.id) }}><Icon name="trash" size={14} /></button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: '11px 16px', background: 'var(--surface-3)', borderRadius: 11, fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>Esta sección es un control interno de pagos. No reemplaza a tu contador ni liquida sueldos legalmente.</div>
        </>
      )}

      {subTab === 'marketing' && (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16, gap: 12 }}>
            <FinCard icon="megaphone" label="Inversión" value={fmtCLP(totalMkt)} tone="info" />
            <FinCard icon="trendUp" label="Ventas atribuidas" value={fmtCLP(totalRoas)} tone="primary" />
            <FinCard icon="balance" label="ROAS estimado" value={totalMkt > 0 ? (totalRoas / totalMkt).toFixed(1) + 'x' : '—'} tone="terra" />
            <FinCard icon="clientes" label="Clientes generados" value={marketing.reduce((a, mk) => a + mk.clientesNuevos, 0)} tone="primary" />
          </div>
          {marketing.length === 0 && <div className="card"><EmptyState icon="megaphone" title="Sin campañas registradas" text="Registra lo que inviertes en publicidad para saber si te genera ventas." action={<button className="btn btn-primary" onClick={() => setFormMkt(true)}><Icon name="plus" size={15} />Agregar campaña</button>} /></div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {marketing.map((mk) => {
              const roas = mk.monto > 0 ? mk.ventasGeneradas / mk.monto : 0
              return (
                <div key={mk.id} className="card card-pad" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'start' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 6 }}>
                      <span className="chip chip-neutral" style={{ fontSize: 12 }}>{mk.canal}</span>
                      <span style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{mk.fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{mk.campaign}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{mk.obs}</div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                      <span className="tnum" style={{ fontSize: 13, fontWeight: 700 }}>Inversión: {fmtCLP(mk.monto)}</span>
                      <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-700)' }}>Ventas: {fmtCLP(mk.ventasGeneradas)}</span>
                      <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--info)' }}>Clientes nuevos: {mk.clientesNuevos}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center', padding: '12px 16px', background: roas >= 2 ? 'var(--ok-tint)' : roas >= 1 ? 'var(--warn-tint)' : 'var(--danger-tint)', borderRadius: 12 }}>
                      <div className="tnum" style={{ fontWeight: 800, fontSize: 20, color: roas >= 2 ? 'var(--primary-700)' : roas >= 1 ? 'oklch(0.50 0.10 70)' : 'var(--danger)' }}>{roas.toFixed(1)}x</div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)' }}>ROAS</div>
                    </div>
                    <button className="btn btn-ghost btn-icon" style={{ width: 30, height: 30 }} title="Eliminar campaña" onClick={() => { if (window.confirm(`¿Eliminar la campaña "${mk.campaign}"?`)) deleteMarketing(mk.id) }}><Icon name="trash" size={14} /></button>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 12, padding: '11px 16px', background: 'var(--surface-3)', borderRadius: 11, fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>Registra cuánto invertiste para saber si tu publicidad genera ventas. Este cálculo es estimado.</div>
        </>
      )}

      {form && (
        <Modal
          title="Registrar gasto"
          onClose={() => setForm(false)}
          width={500}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setForm(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={!f.desc || !f.monto} onClick={() => { addGasto({ cat: f.cat, desc: f.desc, monto: +f.monto || 0, method: f.method, recurrente: f.recurrente, respaldo: f.respaldo, proveedor: f.proveedor, estado: f.estado, fecha: new Date(f.fecha) }); setForm(false) }}><Icon name="check" size={15} />Guardar</button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label className="field"><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Categoría</span><select className="select" value={f.cat} onChange={(e) => sF('cat', e.target.value)}>{GASTO_CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className="field"><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Fecha</span><input className="input" type="date" value={f.fecha} onChange={(e) => sF('fecha', e.target.value)} /></label>
            </div>
            <label className="field"><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Descripción</span><input className="input" value={f.desc} onChange={(e) => sF('desc', e.target.value)} placeholder="Ej: Arriendo julio" /></label>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label className="field"><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Monto ($)</span><div className="input-pre"><span className="pre">$</span><input className="tnum" type="number" value={f.monto} onChange={(e) => sF('monto', e.target.value)} style={{ padding: '10px 12px 10px 4px' }} /></div></label>
              <label className="field"><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Método de pago</span><select className="select" value={f.method} onChange={(e) => sF('method', e.target.value)}><option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option><option>Débito</option></select></label>
            </div>
            <label className="field"><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Proveedor</span><input className="input" value={f.proveedor} onChange={(e) => sF('proveedor', e.target.value)} placeholder="Ej: Inmobiliaria Castro" /></label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="rec" checked={f.recurrente} onChange={(e) => sF('recurrente', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
              <label htmlFor="rec" style={{ fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Gasto recurrente (se repite cada mes)</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="resp" checked={f.respaldo} onChange={(e) => sF('respaldo', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
              <label htmlFor="resp" style={{ fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Tengo boleta o factura (respaldo para IVA crédito)</label>
            </div>
          </div>
        </Modal>
      )}

      {formNom && (
        <Modal
          title="Agregar persona a la nómina"
          sub="Control interno de pagos al personal"
          onClose={() => setFormNom(false)}
          width={500}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setFormNom(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                disabled={!fn.nombre.trim() || !fn.monto}
                onClick={() => {
                  addNomina({ nombre: fn.nombre.trim(), cargo: fn.cargo.trim(), tipo: fn.tipo, monto: +fn.monto || 0, dia: Math.min(31, Math.max(1, +fn.dia || 1)), estado: 'pendiente', horas: 0, bono: +fn.bono || 0 })
                  setFn({ nombre: '', cargo: '', tipo: 'Sueldo fijo', monto: '', dia: '5', bono: '' })
                  setFormNom(false)
                }}
              >
                <Icon name="check" size={15} />Guardar
              </button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Nombre"><input className="input" value={fn.nombre} onChange={(e) => sFn('nombre', e.target.value)} placeholder="Ej: Carla Soto" autoFocus /></Field>
              <Field label="Cargo"><input className="input" value={fn.cargo} onChange={(e) => sFn('cargo', e.target.value)} placeholder="Ej: Vendedora" /></Field>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Tipo de pago"><select className="select" value={fn.tipo} onChange={(e) => sFn('tipo', e.target.value)}><option>Sueldo fijo</option><option>Por día</option><option>Por hora</option><option>Honorarios</option></select></Field>
              <Field label="Día de pago"><input className="input tnum" type="number" min={1} max={31} value={fn.dia} onChange={(e) => sFn('dia', e.target.value)} /></Field>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Monto mensual ($)"><div className="input-pre"><span className="pre">$</span><input className="tnum" type="number" value={fn.monto} onChange={(e) => sFn('monto', e.target.value)} style={{ padding: '10px 12px 10px 4px' }} /></div></Field>
              <Field label="Bono (opcional)"><div className="input-pre"><span className="pre">$</span><input className="tnum" type="number" value={fn.bono} onChange={(e) => sFn('bono', e.target.value)} style={{ padding: '10px 12px 10px 4px' }} placeholder="0" /></div></Field>
            </div>
          </div>
        </Modal>
      )}

      {formMkt && (
        <Modal
          title="Registrar campaña de marketing"
          sub="Para saber si tu publicidad genera ventas"
          onClose={() => setFormMkt(false)}
          width={520}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setFormMkt(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                disabled={!fk.campaign.trim() || !fk.monto}
                onClick={() => {
                  addMarketing({ campaign: fk.campaign.trim(), canal: fk.canal, fecha: new Date(fk.fecha), monto: +fk.monto || 0, ventasGeneradas: +fk.ventasGeneradas || 0, clientesNuevos: +fk.clientesNuevos || 0, obs: fk.obs.trim() })
                  setFk({ campaign: '', canal: 'Instagram', fecha: TODAY.toISOString().slice(0, 10), monto: '', ventasGeneradas: '', clientesNuevos: '', obs: '' })
                  setFormMkt(false)
                }}
              >
                <Icon name="check" size={15} />Guardar
              </button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Nombre de la campaña"><input className="input" value={fk.campaign} onChange={(e) => sFk('campaign', e.target.value)} placeholder="Ej: Promo invierno Instagram" autoFocus /></Field>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Canal"><select className="select" value={fk.canal} onChange={(e) => sFk('canal', e.target.value)}><option>Instagram</option><option>Facebook</option><option>Google</option><option>WhatsApp</option><option>Volantes</option><option>Otro</option></select></Field>
              <Field label="Fecha"><input className="input" type="date" value={fk.fecha} onChange={(e) => sFk('fecha', e.target.value)} /></Field>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Inversión ($)"><div className="input-pre"><span className="pre">$</span><input className="tnum" type="number" value={fk.monto} onChange={(e) => sFk('monto', e.target.value)} style={{ padding: '10px 12px 10px 4px' }} /></div></Field>
              <Field label="Ventas atribuidas ($)" hint="Lo que estimas que vendiste gracias a la campaña."><div className="input-pre"><span className="pre">$</span><input className="tnum" type="number" value={fk.ventasGeneradas} onChange={(e) => sFk('ventasGeneradas', e.target.value)} style={{ padding: '10px 12px 10px 4px' }} placeholder="0" /></div></Field>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Clientes nuevos"><input className="input tnum" type="number" value={fk.clientesNuevos} onChange={(e) => sFk('clientesNuevos', e.target.value)} placeholder="0" /></Field>
              <Field label="Notas (opcional)"><input className="input" value={fk.obs} onChange={(e) => sFk('obs', e.target.value)} placeholder="Ej: historias + posts" /></Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
