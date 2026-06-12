'use client'

// ---------- Finanzas: Deudas y Créditos + Balance Simplificado (portado de finanzas-pasivos.jsx) ----------

import { useState, type ReactNode } from 'react'
import { useMetrics, TODAY } from '@/lib/store'
import { useFinanzas, useFinMetrics } from '@/lib/finanzas-store'
import { fmtCLP, fmtPct } from '@/lib/format'
import { Icon } from '@/components/icon'
import { Modal, Field, MoneyInput, EmptyState } from '@/components/ui'
import { FinCard } from '@/components/finanzas/shared'
import type { Credito, CreditoPago } from '@/types'

const CREDITO_TIPOS = ['Préstamo bancario', 'Línea de crédito', 'Leasing', 'Deuda proveedor', 'Tarjeta de crédito', 'Crédito FOGAPE', 'Otro']
const CREDITO_ICONS: Record<string, string> = { 'Préstamo bancario': 'building', 'Línea de crédito': 'wallet', Leasing: 'truck', 'Deuda proveedor': 'box', 'Tarjeta de crédito': 'card', 'Crédito FOGAPE': 'shield', Otro: 'coins' }
const CREDITO_COLORS: Record<string, string> = { 'Préstamo bancario': 'var(--info)', 'Línea de crédito': 'var(--primary)', Leasing: 'var(--terra)', 'Deuda proveedor': 'oklch(0.62 0.10 130)', 'Tarjeta de crédito': 'var(--danger)', 'Crédito FOGAPE': 'oklch(0.60 0.10 180)', Otro: 'var(--ink-3)' }

type CreditoForm = {
  id?: string
  acreedor: string
  tipo: string
  montoOriginal: number | ''
  saldo: number | ''
  tasaAnual: string
  cuotaMensual: number | ''
  proximaCuota: Date
  estado: string
  notas: string
  moneda: string
  pagos?: CreditoPago[]
}

function CreditoModal({ initial, onSave, onClose }: { initial?: Credito; onSave: (c: Credito) => void; onClose: () => void }) {
  const [f, setF] = useState<CreditoForm>(
    initial
      ? { ...initial, montoOriginal: initial.montoOriginal, saldo: initial.saldo, tasaAnual: String(initial.tasaAnual), cuotaMensual: initial.cuotaMensual, moneda: 'CLP' }
      : { acreedor: '', tipo: CREDITO_TIPOS[0], montoOriginal: '', saldo: '', tasaAnual: '', cuotaMensual: '', proximaCuota: new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 5), estado: 'vigente', notas: '', moneda: 'CLP' },
  )
  const set = <K extends keyof CreditoForm>(k: K, v: CreditoForm[K]) => setF((s) => ({ ...s, [k]: v }))
  const valid = f.acreedor.trim() && +f.montoOriginal > 0
  const interesMes = f.saldo && f.tasaAnual ? Math.round(+f.saldo * (+f.tasaAnual / 100 / 12)) : 0
  const amort = f.cuotaMensual ? Math.max(0, +f.cuotaMensual - interesMes) : 0
  return (
    <Modal
      title={initial ? 'Editar crédito' : 'Agregar deuda o crédito'}
      sub="Registra préstamos, líneas, leasing o deudas pendientes"
      onClose={onClose}
      width={560}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={!valid}
            onClick={() => {
              onSave({ acreedor: f.acreedor, tipo: f.tipo, montoOriginal: +f.montoOriginal, saldo: +f.saldo || +f.montoOriginal, tasaAnual: +f.tasaAnual || 0, cuotaMensual: +f.cuotaMensual || 0, proximaCuota: f.proximaCuota, estado: f.estado, notas: f.notas, id: initial?.id || 'cr' + Date.now(), pagos: initial?.pagos || [] })
              onClose()
            }}
          >
            <Icon name="check" size={16} />Guardar
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Acreedor / Banco"><input className="input" value={f.acreedor} onChange={(e) => set('acreedor', e.target.value)} placeholder="Ej: Banco Estado, Proveedor X" autoFocus /></Field>
          <Field label="Tipo de deuda"><select className="select" value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>{CREDITO_TIPOS.map((t) => <option key={t}>{t}</option>)}</select></Field>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Monto original"><MoneyInput value={f.montoOriginal} onChange={(v) => set('montoOriginal', v)} /></Field>
          <Field label="Saldo pendiente" hint="Lo que aún debes"><MoneyInput value={f.saldo} onChange={(v) => set('saldo', v)} /></Field>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Tasa anual (%)" hint="Deja vacío si no tienes interés">
            <div className="input-pre"><input className="tnum" inputMode="numeric" value={f.tasaAnual} onChange={(e) => set('tasaAnual', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Ej: 12.5" style={{ padding: '11px 4px 11px 13px' }} /><span className="pre" style={{ padding: '0 13px 0 4px' }}>%</span></div>
          </Field>
          <Field label="Cuota mensual"><MoneyInput value={f.cuotaMensual} onChange={(v) => set('cuotaMensual', v)} /></Field>
        </div>
        {+f.cuotaMensual > 0 && +f.tasaAnual > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={{ padding: '10px 12px', background: 'var(--surface-3)', borderRadius: 10, textAlign: 'center' }}>
              <div className="tnum" style={{ fontWeight: 800, fontSize: 15 }}>{fmtCLP(+f.cuotaMensual)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Cuota total</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--danger-tint)', borderRadius: 10, textAlign: 'center' }}>
              <div className="tnum" style={{ fontWeight: 800, fontSize: 15, color: 'var(--danger)' }}>{fmtCLP(interesMes)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Interés/mes</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--ok-tint)', borderRadius: 10, textAlign: 'center' }}>
              <div className="tnum" style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary-700)' }}>{fmtCLP(amort)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Amortización</div>
            </div>
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Próxima cuota">
            <input type="date" className="input" value={f.proximaCuota.toISOString().slice(0, 10)} onChange={(e) => set('proximaCuota', new Date(e.target.value + 'T12:00'))} />
          </Field>
          <Field label="Estado"><select className="select" value={f.estado} onChange={(e) => set('estado', e.target.value)}><option value="vigente">Vigente</option><option value="al_dia">Al día</option><option value="atrasado">Atrasado</option><option value="pagado">Pagado</option></select></Field>
        </div>
        <Field label="Notas (opcional)"><input className="input" value={f.notas} onChange={(e) => set('notas', e.target.value)} placeholder="Ej: Crédito 36 meses, vence oct 2027" /></Field>
      </div>
    </Modal>
  )
}

function PagoModal({ credito, onPago, onClose }: { credito: Credito; onPago: (id: string, pago: CreditoPago) => void; onClose: () => void }) {
  const [monto, setMonto] = useState<number | ''>(credito.cuotaMensual || '')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [nota, setNota] = useState('Cuota mensual')
  const interesMes = credito.tasaAnual > 0 ? Math.round(credito.saldo * (credito.tasaAnual / 100 / 12)) : 0
  const amort = Math.max(0, (+monto || 0) - interesMes)
  const nuevoSaldo = Math.max(0, credito.saldo - amort)
  return (
    <Modal
      title="Registrar pago"
      sub={credito.acreedor}
      onClose={onClose}
      width={440}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!monto} onClick={() => { onPago(credito.id, { monto: +monto, fecha: new Date(fecha + 'T12:00'), nota, interes: interesMes, amortizacion: amort, saldoAntes: credito.saldo, saldoDespues: nuevoSaldo }); onClose() }}><Icon name="check" size={16} />Confirmar pago</button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Monto del pago"><MoneyInput value={monto} onChange={setMonto} /></Field>
        <Field label="Fecha de pago"><input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        {credito.tasaAnual > 0 && +monto > 0 && (
          <div style={{ padding: '13px 16px', background: 'var(--surface-3)', borderRadius: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
            <div><div className="tnum" style={{ fontWeight: 800, fontSize: 15, color: 'var(--danger)' }}>{fmtCLP(interesMes)}</div><div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Intereses</div></div>
            <div><div className="tnum" style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary-700)' }}>{fmtCLP(amort)}</div><div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Amortiza</div></div>
            <div><div className="tnum" style={{ fontWeight: 800, fontSize: 15 }}>{fmtCLP(nuevoSaldo)}</div><div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Nuevo saldo</div></div>
          </div>
        )}
        <Field label="Nota"><input className="input" value={nota} onChange={(e) => setNota(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

export function FinPasivos() {
  const { creditos, addCredito, updateCredito, pagarCredito } = useFinanzas()
  const m = useFinMetrics()
  const [form, setForm] = useState(false)
  const [editItem, setEditItem] = useState<Credito | null>(null)
  const [pagoItem, setPagoItem] = useState<Credito | null>(null)
  const [showHist, setShowHist] = useState<Credito | null>(null)

  const vigentes = creditos.filter((c) => c.estado !== 'pagado')
  const totalDeuda = vigentes.reduce((a, c) => a + c.saldo, 0)
  const cuotasMes = vigentes.reduce((a, c) => a + c.cuotaMensual, 0)
  const interesesMes = vigentes.reduce((a, c) => a + Math.round(c.saldo * (c.tasaAnual / 100 / 12)), 0)
  const atrasados = vigentes.filter((c) => c.estado === 'atrasado').length
  const ratioDeudaVentas = m.ingresosMes > 0 ? (totalDeuda / m.ingresosMes) * 100 : 0
  const ratioHealth = ratioDeudaVentas > 200 ? 'danger' : ratioDeudaVentas > 100 ? 'warn' : 'ok'

  const estadoChip = (e: string): ReactNode => ({
    vigente: <span className="chip chip-neutral" style={{ fontSize: 12 }}>Vigente</span>,
    al_dia: <span className="chip chip-ok" style={{ fontSize: 12 }}>Al día</span>,
    atrasado: <span className="chip chip-danger" style={{ fontSize: 12 }}>Atrasado</span>,
    pagado: <span className="chip chip-ok" style={{ fontSize: 12 }}>Pagado</span>,
  }[e])

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
        <button className="btn btn-primary" onClick={() => setForm(true)}><Icon name="plus" size={16} />Agregar deuda o crédito</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', marginBottom: 18 }}>
        <FinCard icon="building" label="Total deudas" value={fmtCLP(totalDeuda)} tone={totalDeuda > 5000000 ? 'danger' : 'warn'} sub={`${vigentes.length} obligaciones vigentes`} />
        <FinCard icon="coins" label="Cuotas del mes" value={fmtCLP(cuotasMes)} tone={cuotasMes > m.gananciaMes * 0.4 ? 'danger' : 'warn'} sub="Total a pagar este mes" />
        <FinCard icon="percent" label="Intereses del mes" value={fmtCLP(interesesMes)} tone="danger" sub="Costo financiero mensual" />
        <FinCard icon="balance" label="Deuda / ventas" value={fmtPct(ratioDeudaVentas)} tone={ratioHealth} sub={ratioDeudaVentas < 100 ? 'Nivel saludable' : ratioDeudaVentas < 200 ? 'Revisar' : 'Nivel alto'} />
        {atrasados > 0 && <FinCard icon="alert" label="Pagos atrasados" value={atrasados} tone="danger" sub="Requieren atención urgente" />}
      </div>

      {cuotasMes > m.gananciaMes * 0.35 && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-tint)', borderRadius: 12, marginBottom: 16, fontSize: 13.5, fontWeight: 600, color: 'var(--danger)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="alert" size={17} style={{ flexShrink: 0 }} />Tus cuotas representan el {Math.round((cuotasMes / m.gananciaMes) * 100)}% de tu ganancia estimada. Revisa el flujo de caja.
        </div>
      )}

      {/* Tabla de créditos */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--info-tint)', color: 'var(--info)', display: 'grid', placeItems: 'center' }}><Icon name="building" size={16} /></span>
          <div style={{ flex: 1 }}><div className="card-title">Deudas y créditos vigentes</div><div className="card-sub">Préstamos, líneas de crédito, leasing y deudas pendientes</div></div>
        </div>
        {vigentes.length === 0 ? (
          <EmptyState icon="building" title="Sin deudas registradas" text="Agrega tus préstamos, líneas de crédito o deudas para ver su impacto en tu negocio." action={<button className="btn btn-primary" onClick={() => setForm(true)}><Icon name="plus" size={15} />Agregar deuda</button>} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ minWidth: 700 }}>
              <thead><tr><th>Acreedor</th><th>Tipo</th><th className="num">Monto original</th><th className="num">Saldo pendiente</th><th className="num">Cuota/mes</th><th className="num">Interés/mes</th><th>Próx. cuota</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {vigentes.map((c) => {
                  const intMes = Math.round(c.saldo * (c.tasaAnual / 100 / 12))
                  const diasProx = Math.round((c.proximaCuota.getTime() - TODAY.getTime()) / 86400000)
                  const proxStr = diasProx < 0 ? `Vencida hace ${-diasProx}d` : diasProx === 0 ? 'Hoy' : diasProx <= 7 ? `En ${diasProx} días` : c.proximaCuota.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
                  const proxTone = diasProx < 0 ? 'var(--danger)' : diasProx <= 7 ? 'oklch(0.50 0.10 70)' : 'var(--ink-2)'
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <span style={{ width: 30, height: 30, borderRadius: 8, background: (CREDITO_COLORS[c.tipo] || 'var(--info)') + '22', color: CREDITO_COLORS[c.tipo] || 'var(--info)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={CREDITO_ICONS[c.tipo] || 'coins'} size={14} /></span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13.5 }}>{c.acreedor}</div>
                            {c.notas && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>{c.notas}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>{c.tipo}</td>
                      <td className="num tnum muted">{fmtCLP(c.montoOriginal)}</td>
                      <td className="num tnum" style={{ fontWeight: 800 }}>{fmtCLP(c.saldo)}</td>
                      <td className="num tnum" style={{ fontWeight: 700 }}>{c.cuotaMensual > 0 ? fmtCLP(c.cuotaMensual) : '—'}</td>
                      <td className="num tnum" style={{ color: 'var(--danger)', fontWeight: 700 }}>{c.tasaAnual > 0 ? fmtCLP(intMes) : '—'}</td>
                      <td style={{ fontSize: 13, fontWeight: 700, color: proxTone, whiteSpace: 'nowrap' }}>{proxStr}</td>
                      <td>{estadoChip(c.estado)}</td>
                      <td className="num">
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-icon" style={{ width: 30, height: 30 }} title="Historial" onClick={() => setShowHist(c)}><Icon name="history" size={14} /></button>
                          <button className="btn btn-ghost btn-icon" style={{ width: 30, height: 30 }} title="Editar" onClick={() => setEditItem(c)}><Icon name="edit" size={14} /></button>
                          <button className="btn btn-primary" style={{ padding: '6px 11px', fontSize: 12.5 }} onClick={() => setPagoItem(c)}><Icon name="check" size={13} />Pagar</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Créditos pagados */}
      {creditos.filter((c) => c.estado === 'pagado').length > 0 && (
        <details className="card" style={{ padding: '14px 22px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13.5, color: 'var(--ink-3)', userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="check" size={15} /> Créditos pagados ({creditos.filter((c) => c.estado === 'pagado').length})
          </summary>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {creditos.filter((c) => c.estado === 'pagado').map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <span className="chip chip-ok" style={{ fontSize: 11 }}>Pagado</span>
                <span style={{ fontWeight: 700, fontSize: 13.5, flex: 1 }}>{c.acreedor} — {c.tipo}</span>
                <span className="tnum muted">{fmtCLP(c.montoOriginal)}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Impacto en flujo */}
      {vigentes.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head"><span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--terra-tint)', color: 'var(--terra-700)', display: 'grid', placeItems: 'center' }}><Icon name="trending" size={16} /></span><div style={{ flex: 1 }}><div className="card-title">Impacto en tu flujo de caja</div><div className="card-sub">Próximos 3 meses</div></div></div>
          <div style={{ padding: '16px 22px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
              {[0, 1, 2].map((mes) => {
                const d = new Date(TODAY.getFullYear(), TODAY.getMonth() + mes, 1)
                const label = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
                const ingrEst = m.ingresosMes * (mes === 0 ? 1 : 0.95 - mes * 0.02)
                const cuotas = vigentes.reduce((a, c) => a + c.cuotaMensual, 0)
                const gastos = m.totalGastosMes
                const libre = Math.round(ingrEst * (m.ingresosMes ? m.gananciaMes / m.ingresosMes : 0.3) - gastos - cuotas)
                return (
                  <div key={mes} style={{ padding: '13px 14px', background: libre < 0 ? 'var(--danger-tint)' : libre < 200000 ? 'var(--warn-tint)' : 'var(--ok-tint)', borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 6, textTransform: 'capitalize' }}>{label}</div>
                    <div className="tnum" style={{ fontWeight: 800, fontSize: 17, color: libre < 0 ? 'var(--danger)' : libre < 200000 ? 'oklch(0.50 0.10 70)' : 'var(--primary-700)' }}>{fmtCLP(libre)}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 3 }}>Flujo libre estimado</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6, fontWeight: 600 }}>Cuotas: {fmtCLP(cuotas)}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ padding: '11px 14px', background: 'var(--surface-3)', borderRadius: 11, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              <Icon name="alert" size={14} style={{ verticalAlign: '-3px', marginRight: 6 }} />El flujo libre es tu ganancia estimada menos gastos y cuotas de deuda. Es solo una proyección.
            </div>
          </div>
        </div>
      )}

      {form && <CreditoModal onSave={addCredito} onClose={() => setForm(false)} />}
      {editItem && <CreditoModal initial={editItem} onSave={(p) => updateCredito(editItem.id, p)} onClose={() => setEditItem(null)} />}
      {pagoItem && <PagoModal credito={pagoItem} onPago={pagarCredito} onClose={() => setPagoItem(null)} />}
      {showHist && (
        <Modal
          title="Historial de pagos"
          sub={showHist.acreedor}
          onClose={() => setShowHist(null)}
          width={480}
          footer={<button className="btn btn-ghost" onClick={() => setShowHist(null)}>Cerrar</button>}
        >
          {(showHist.pagos || []).length === 0 ? (
            <EmptyState icon="history" title="Sin pagos registrados" text="Los pagos que registres aparecerán aquí." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {showHist.pagos.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--ok-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center' }}><Icon name="check" size={15} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{fmtCLP(p.monto)}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{p.nota} · Int. {fmtCLP(p.interes || 0)} · Amort. {fmtCLP(p.amortizacion || 0)}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)' }}>
                    {p.fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                    <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 2 }}>Saldo: {fmtCLP(p.saldoDespues || 0)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   BALANCE SIMPLIFICADO
══════════════════════════════════════════════ */
type BalTone = 'ok' | 'danger' | 'warn' | 'info'
type BalHighlight = 'positive' | 'negative' | 'neutral' | 'accent'

export function FinBalance() {
  const m = useFinMetrics()
  const mbi = useMetrics()
  const { creditos } = useFinanzas()

  const totalDeudaExterna = creditos.filter((c) => c.estado !== 'pagado').reduce((a, c) => a + c.saldo, 0)
  const totalCxC = mbi.totalDeuda || 0
  const totalCxP = m.gastosPendientes || 0

  // ACTIVOS
  const caja = Math.max(0, m.utilidadEstimada) // caja estimada = utilidad del mes (sin montos inventados)
  const inventario = m.valInventario
  const cuentXCobrar = totalCxC
  const otrosActivos = 0
  const totalActivos = caja + inventario + cuentXCobrar + otrosActivos

  // PASIVOS
  const deudasBanco = totalDeudaExterna
  const cuentXPagar = totalCxP
  const deudaPersonal = 0
  const totalPasivos = deudasBanco + cuentXPagar + deudaPersonal

  // PATRIMONIO
  const patrimonio = totalActivos - totalPasivos
  const ratioApalancamiento = totalActivos > 0 ? (totalPasivos / totalActivos) * 100 : 0
  const healthTone: BalTone = ratioApalancamiento > 70 ? 'danger' : ratioApalancamiento > 45 ? 'warn' : 'ok'
  const healthLabel = ratioApalancamiento > 70 ? 'Nivel alto de deuda' : ratioApalancamiento > 45 ? 'Revisar nivel' : 'Salud financiera positiva'

  function BalRow({ label, value, indent, bold, highlight, sub, tone }: { label: ReactNode; value: number; indent?: boolean; bold?: boolean; highlight?: BalHighlight; sub?: ReactNode; tone?: BalTone }) {
    const bg = highlight ? ({ positive: 'var(--ok-tint)', negative: 'var(--danger-tint)', neutral: 'var(--surface-3)', accent: 'var(--primary-tint)' }[highlight] || '') : ''
    const fg = tone ? ({ ok: 'var(--primary-700)', danger: 'var(--danger)', warn: 'oklch(0.50 0.10 70)', info: 'var(--info)' }[tone] || 'var(--ink)') : 'var(--ink)'
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: bold ? '13px 20px' : '10px 20px', paddingLeft: indent ? 36 : 20, background: bg, borderRadius: bold ? 10 : 0, margin: bold ? '4px 0' : 0 }}>
        <div>
          <span style={{ fontSize: bold ? 14.5 : 13.5, fontWeight: bold ? 800 : 600, color: fg }}>{label}</span>
          {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>{sub}</div>}
        </div>
        <span className="tnum" style={{ fontSize: bold ? 16 : 14, fontWeight: bold ? 800 : 700, color: fg }}>{value < 0 ? '-' : ''}{fmtCLP(Math.abs(value))}</span>
      </div>
    )
  }
  function GroupHdr({ label, total, tone }: { label: string; total?: number; tone?: BalTone }) {
    const c = tone ? ({ ok: 'var(--primary-700)', danger: 'var(--danger)', warn: 'oklch(0.50 0.10 70)', info: 'var(--info)' }[tone] || 'var(--ink-3)') : 'var(--ink-3)'
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px 6px', borderTop: '2px solid var(--line)', marginTop: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{label}</span>
        <span className="tnum" style={{ fontSize: 13, fontWeight: 800, color: c }}>{total !== undefined ? fmtCLP(total) : ''}</span>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Summary KPIs */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', marginBottom: 18 }}>
        <FinCard icon="building" label="Total activos" value={fmtCLP(totalActivos)} tone="primary" sub="Caja + inventario + CxC" />
        <FinCard icon="coins" label="Total pasivos" value={fmtCLP(totalPasivos)} tone="danger" sub="Deudas + CxP" />
        <FinCard icon="balance" label="Patrimonio neto" value={fmtCLP(patrimonio)} tone={patrimonio >= 0 ? 'ok' : 'danger'} sub="Activos menos pasivos" />
        <FinCard icon="percent" label="Ratio deuda" value={fmtPct(ratioApalancamiento)} tone={healthTone} sub={healthLabel} />
      </div>

      {/* Main balance */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
        {/* Activos */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head" style={{ background: 'var(--primary-tint)' }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="trendUp" size={16} /></span>
            <div style={{ flex: 1 }}><div className="card-title">Activos</div><div className="card-sub">Lo que tienes</div></div>
            <span className="tnum" style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary-700)' }}>{fmtCLP(totalActivos)}</span>
          </div>
          <GroupHdr label="Activo corriente" tone="ok" />
          <BalRow label="Caja disponible estimada" value={caja} indent sub="Utilidad acumulada estimada" />
          <BalRow label="Inventario valorizado" value={inventario} indent sub="Stock × costo unitario" />
          <BalRow label="Cuentas por cobrar" value={cuentXCobrar} indent sub="Ventas a crédito pendientes" />
          <BalRow label="Total activos" value={totalActivos} bold highlight="positive" tone="ok" />
        </div>

        {/* Pasivos + Patrimonio */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head" style={{ background: 'var(--danger-tint)' }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--danger)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="trendDown" size={16} /></span>
            <div style={{ flex: 1 }}><div className="card-title">Pasivos</div><div className="card-sub">Lo que debes</div></div>
            <span className="tnum" style={{ fontWeight: 800, fontSize: 16, color: 'var(--danger)' }}>{fmtCLP(totalPasivos)}</span>
          </div>
          <GroupHdr label="Pasivo corriente" tone="danger" />
          <BalRow label="Créditos y préstamos" value={deudasBanco} indent sub={creditos.filter((c) => c.estado !== 'pagado').length + ' obligaciones vigentes'} />
          <BalRow label="Cuentas por pagar" value={cuentXPagar} indent sub="Gastos pendientes de pago" />
          <BalRow label="Total pasivos" value={totalPasivos} bold highlight="negative" tone="danger" />
          <GroupHdr label="Patrimonio neto" tone={patrimonio >= 0 ? 'ok' : 'danger'} />
          <BalRow label="Patrimonio neto" value={patrimonio} bold highlight={patrimonio >= 0 ? 'positive' : 'negative'} tone={patrimonio >= 0 ? 'ok' : 'danger'} sub="Activos − Pasivos" />
        </div>
      </div>

      {/* Health gauge */}
      <div className="card" style={{ marginTop: 18, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Salud financiera del negocio</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>Basado en ratio deuda/activos · Orientativo</div>
          </div>
          <span className={'chip ' + (healthTone === 'ok' ? 'chip-ok' : healthTone === 'warn' ? 'chip-warn' : 'chip-danger')} style={{ fontSize: 13, padding: '6px 14px' }}>{healthLabel}</span>
        </div>
        <div style={{ height: 14, background: 'var(--bg-2)', borderRadius: 20, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ height: '100%', width: Math.min(100, ratioApalancamiento) + '%', background: healthTone === 'ok' ? 'var(--ok)' : healthTone === 'warn' ? 'var(--warn)' : 'var(--danger)', borderRadius: 20, transition: 'width .8s cubic-bezier(.2,.8,.3,1)' }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)' }}>
          <span>0% — Sin deuda</span><span>45% — Moderado</span><span>70%+ — Alto riesgo</span>
        </div>
        <div style={{ marginTop: 14, padding: '11px 14px', background: 'var(--surface-3)', borderRadius: 11, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          <Icon name="shield" size={14} style={{ verticalAlign: '-3px', marginRight: 6 }} />Este balance es una estimación orientativa basada en los datos registrados. Para un balance tributario oficial, consulta a tu contador.
        </div>
      </div>
    </div>
  )
}
