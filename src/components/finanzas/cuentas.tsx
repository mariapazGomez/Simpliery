'use client'

// ---------- Finanzas: CxC · CxP · IVA · Documentos · Exportar (portado de finanzas-cuentas.jsx) ----------

import { useState, useMemo } from 'react'
import { useStore, TODAY } from '@/lib/store'
import { useFinanzas, useFinMetrics, GASTO_COLORS } from '@/lib/finanzas-store'
import { downloadBlob } from '@/lib/exports'
import { fmtCLP } from '@/lib/format'
import { Icon } from '@/components/icon'
import { Modal, EmptyState, MoneyInput, Field } from '@/components/ui'
import { FinCard, AlertaBanner } from '@/components/finanzas/shared'
import type { Gasto } from '@/types'

/* ──────────────────────────────────────────────
   Cuentas por Cobrar
   Reconciliado al modelo real de venta a crédito:
   s.credito (bool), s.pagado (bool), s.montoPendiente (number), s.cliente (ClienteRef|null).
   toast/saldarDeuda vienen de useStore() (corrige el bug del prototipo que los tomaba de useFinanzas()).
────────────────────────────────────────────── */
type CxCRow = {
  id: string
  cliente: string
  telefono: string
  venta: string
  fecha: Date
  monto: number
  pagado: number
  saldo: number
  due: Date
  daysLate: number
  estado: 'al_dia' | 'por_vencer' | 'vencida' | 'pagada'
}

function FinCxC() {
  const { sales, saldarDeuda, settings } = useStore()
  const [montoPagar, setMontoPagar] = useState<number | ''>('')
  const [metodoPago, setMetodoPago] = useState('')
  // Build CxC rows from credit sales (modelo real: credito && !pagado)
  const rows = useMemo<CxCRow[]>(() => {
    const creditSales = sales.filter((s) => s.credito && !s.pagado && (s.montoPendiente || 0) > 0)
    return creditSales.map((s) => {
      const nombre = s.cliente?.nombre || 'Sin nombre'
      const telefono = s.cliente?.telefono || ''
      const due = new Date(s.date)
      due.setDate(due.getDate() + 30)
      const daysLate = Math.max(0, Math.round((TODAY.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)))
      const saldo = s.montoPendiente || s.total
      const estado: CxCRow['estado'] = saldo <= 0 ? 'pagada' : daysLate > 0 ? 'vencida' : due.getTime() - TODAY.getTime() < 7 * 86400000 ? 'por_vencer' : 'al_dia'
      return { id: s.id, cliente: nombre, telefono, venta: '#' + s.boleta, fecha: s.date, monto: s.total, pagado: s.total - saldo, saldo, due, daysLate, estado }
    })
  }, [sales])

  const [pagoModal, setPagoModal] = useState<CxCRow | null>(null)
  const totalPorCobrar = rows.reduce((a, r) => a + r.saldo, 0)
  const totalVencido = rows.filter((r) => r.estado === 'vencida').reduce((a, r) => a + r.saldo, 0)
  const totalPorVencer = rows.filter((r) => r.estado === 'por_vencer').reduce((a, r) => a + r.saldo, 0)

  const estadoChip = (e: CxCRow['estado']) => ({
    al_dia: <span className="chip chip-ok" style={{ fontSize: 12 }}>Al día</span>,
    por_vencer: <span className="chip chip-warn" style={{ fontSize: 12 }}>Por vencer</span>,
    vencida: <span className="chip chip-danger" style={{ fontSize: 12 }}>Vencida</span>,
    pagada: <span className="chip chip-ok" style={{ fontSize: 12 }}>Pagada</span>,
  }[e])

  if (rows.length === 0)
    return (
      <div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 18 }}>
          <FinCard icon="receipt" label="Total por cobrar" value="$0" tone="ok" sub="Sin deudas pendientes" />
          <FinCard icon="alert" label="Vencido" value="$0" tone="primary" />
          <FinCard icon="clock" label="Por vencer" value="$0" tone="primary" />
        </div>
        <div className="card"><EmptyState icon="receipt" title="Sin cuentas por cobrar" text="Las ventas a crédito aparecerán aquí para que puedas hacer seguimiento de cobros." /></div>
        <div style={{ marginTop: 14, padding: '12px 16px', background: 'var(--primary-tint)', borderRadius: 12, fontSize: 13.5, fontWeight: 600, color: 'var(--primary-700)' }}>
          <Icon name="alert" size={15} style={{ verticalAlign: '-3px', marginRight: 7 }} />Para probar, registra una venta con método de pago <strong>Crédito</strong>.
        </div>
      </div>
    )

  return (
    <div className="fade-in">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', marginBottom: 18 }}>
        <FinCard icon="receipt" label="Total por cobrar" value={fmtCLP(totalPorCobrar)} tone={totalPorCobrar > 0 ? 'warn' : 'ok'} sub="Este dinero aún no está en caja" />
        <FinCard icon="alert" label="Vencido" value={fmtCLP(totalVencido)} tone={totalVencido > 0 ? 'danger' : 'ok'} sub={rows.filter((r) => r.estado === 'vencida').length + ' clientes'} />
        <FinCard icon="clock" label="Por vencer (7d)" value={fmtCLP(totalPorVencer)} tone="warn" sub="Cobrar a tiempo mejora tu flujo" />
        <FinCard icon="clientes" label="Clientes deudores" value={rows.length} tone="info" sub="Con saldo pendiente" />
      </div>

      {totalVencido > 0 && <div style={{ marginBottom: 14 }}><AlertaBanner tone="danger" icon="alert">Hay {fmtCLP(totalVencido)} en deudas vencidas. Contáctalos para cobrar.</AlertaBanner></div>}

      <div className="card">
        <div className="card-head">
          <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--warn-tint)', color: 'oklch(0.50 0.10 70)', display: 'grid', placeItems: 'center' }}><Icon name="receipt" size={16} /></span>
          <div style={{ flex: 1 }}><div className="card-title">Deudas pendientes</div><div className="card-sub">{rows.length} ventas a crédito · &quot;Este dinero aún no está en caja&quot;</div></div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Cliente</th><th>Venta</th><th>Fecha</th><th className="num">Monto</th><th className="num">Pagado</th><th className="num">Saldo</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>{r.cliente}<br /><span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{r.telefono}</span></td>
                  <td className="tnum muted">{r.venta}</td>
                  <td style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{r.fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</td>
                  <td className="num tnum">{fmtCLP(r.monto)}</td>
                  <td className="num tnum muted">{fmtCLP(r.pagado)}</td>
                  <td className="num tnum" style={{ fontWeight: 800, color: r.estado === 'vencida' ? 'var(--danger)' : r.estado === 'por_vencer' ? 'oklch(0.50 0.10 70)' : 'var(--ink)' }}>{fmtCLP(r.saldo)}</td>
                  <td style={{ fontSize: 12.5, fontWeight: 600, color: r.daysLate > 0 ? 'var(--danger)' : 'var(--ink-3)' }}>
                    {r.due.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                    {r.daysLate > 0 && <span style={{ display: 'block', color: 'var(--danger)', fontSize: 11.5, fontWeight: 800 }}>{r.daysLate} días atraso</span>}
                  </td>
                  <td>{estadoChip(r.estado)}</td>
                  <td className="num">
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                      {r.telefono && <a href={`https://wa.me/56${r.telefono.replace(/\D/g, '')}?text=${encodeURIComponent('Hola ' + r.cliente.split(' ')[0] + ', te recuerdo que tienes un saldo pendiente de ' + fmtCLP(r.saldo) + '. ¡Gracias!')}`} target="_blank" rel="noopener noreferrer"><button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}><Icon name="phone" size={14} />WA</button></a>}
                      <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => { setPagoModal(r); setMontoPagar(r.saldo); setMetodoPago(settings.methods[0] || 'Efectivo') }}><Icon name="check" size={13} />Abonar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagoModal && (() => {
        const monto = typeof montoPagar === 'number' ? montoPagar : 0
        const abono = Math.min(monto, pagoModal.saldo)
        const restante = Math.max(0, pagoModal.saldo - abono)
        const valido = abono > 0
        return (
          <Modal
            title="Registrar abono"
            sub={pagoModal.cliente + ' · ' + pagoModal.venta}
            onClose={() => setPagoModal(null)}
            width={420}
            footer={
              <>
                <button className="btn btn-ghost" onClick={() => setPagoModal(null)}>Cancelar</button>
                <button className="btn btn-primary" disabled={!valido} onClick={() => { saldarDeuda(pagoModal.id, abono, metodoPago); setPagoModal(null) }}>
                  <Icon name="check" size={16} />{restante > 0 ? 'Registrar abono' : 'Saldar deuda'}
                </button>
              </>
            }
          >
            <div style={{ textAlign: 'center', padding: '4px 0 14px' }}>
              <div className="tnum" style={{ fontSize: 30, fontWeight: 800, color: 'var(--warn)' }}>{fmtCLP(pagoModal.saldo)}</div>
              <div style={{ color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>Saldo pendiente de {pagoModal.cliente}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="¿Cuánto abona ahora?" hint="Puede pagar el total o solo una parte.">
                <MoneyInput value={montoPagar} onChange={setMontoPagar} placeholder="0" />
              </Field>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'Total', val: pagoModal.saldo },
                  { label: 'Mitad', val: Math.round(pagoModal.saldo / 2) },
                ].map((q) => (
                  <button key={q.label} className="btn btn-ghost" style={{ flex: 1, fontSize: 13 }} onClick={() => setMontoPagar(q.val)}>{q.label} · {fmtCLP(q.val)}</button>
                ))}
              </div>

              <Field label="¿Con qué pagó?" hint="Para que cuadren tus flujos de caja.">
                <select className="select" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                  {settings.methods.map((mth) => (
                    <option key={mth} value={mth}>{mth}</option>
                  ))}
                </select>
              </Field>

              <div style={{ padding: '11px 14px', background: restante > 0 ? 'var(--warn-tint)' : 'var(--ok-tint)', borderRadius: 11, fontSize: 13.5, fontWeight: 600, color: restante > 0 ? 'oklch(0.50 0.10 70)' : 'var(--primary-700)', lineHeight: 1.5 }}>
                {restante > 0 ? (
                  <>Abonas <strong>{fmtCLP(abono)}</strong> en {metodoPago.toLowerCase()}. Quedará un saldo de <strong>{fmtCLP(restante)}</strong>.</>
                ) : (
                  <>Se salda el total. El saldo queda en <strong>$0</strong> y {fmtCLP(abono)} entra a tu caja en {metodoPago.toLowerCase()}.</>
                )}
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}

/* ──────────────────────────────────────────────
   Cuentas por Pagar
   toast viene de useStore() (corrige el bug del prototipo).
────────────────────────────────────────────── */
function FinCxP() {
  const { gastos, updateGasto } = useFinanzas()
  const { toast } = useStore()
  const pending = gastos.filter((g) => g.estado === 'pendiente')
  const totalPagar = pending.reduce((a, g) => a + g.monto, 0)
  const venceSemana = pending.filter((g) => { const d = (g.fecha.getTime() - TODAY.getTime()) / 86400000; return d <= 7 }).reduce((a, g) => a + g.monto, 0)

  const urgencia = (g: Gasto): 'vencido' | 'por_vencer' | 'pendiente' => {
    const d = (g.fecha.getTime() - TODAY.getTime()) / 86400000
    if (d < 0) return 'vencido'
    if (d <= 3) return 'por_vencer'
    return 'pendiente'
  }
  const urgChip = (u: 'vencido' | 'por_vencer' | 'pendiente') => ({
    vencido: <span className="chip chip-danger" style={{ fontSize: 12 }}>Vencido</span>,
    por_vencer: <span className="chip chip-warn" style={{ fontSize: 12 }}>Esta semana</span>,
    pendiente: <span className="chip chip-neutral" style={{ fontSize: 12 }}>Pendiente</span>,
  }[u])

  return (
    <div className="fade-in">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', marginBottom: 18 }}>
        <FinCard icon="coins" label="Total por pagar" value={fmtCLP(totalPagar)} tone={totalPagar > 500000 ? 'danger' : 'warn'} sub={pending.length + ' pagos pendientes'} />
        <FinCard icon="alert" label="Vence esta semana" value={fmtCLP(venceSemana)} tone={venceSemana > 200000 ? 'danger' : 'warn'} sub="Priorizar estos pagos" />
        <FinCard icon="check" label="Pagados este mes" value={fmtCLP(gastos.filter((g) => g.estado === 'pagado').reduce((a, g) => a + g.monto, 0))} tone="ok" sub="Gastos saldados" />
      </div>

      {totalPagar > 0 && (
        <div style={{ padding: '12px 16px', background: 'var(--warn-tint)', borderRadius: 12, marginBottom: 16, fontSize: 13.5, fontWeight: 600, color: 'oklch(0.50 0.10 70)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="alert" size={17} style={{ flexShrink: 0 }} />Tienes {fmtCLP(totalPagar)} por pagar. Prioriza los que vencen antes.
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--terra-tint)', color: 'var(--terra-700)', display: 'grid', placeItems: 'center' }}><Icon name="coins" size={16} /></span>
          <div style={{ flex: 1 }}><div className="card-title">Pagos pendientes</div><div className="card-sub">Gastos aún no pagados</div></div>
        </div>
        {pending.length === 0 ? (
          <EmptyState icon="check" title="Todo al día" text="No tienes gastos pendientes de pago este mes." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Proveedor / Descripción</th><th>Categoría</th><th className="num">Monto</th><th>Método</th><th>Urgencia</th><th></th></tr></thead>
              <tbody>
                {[...pending].sort((a, b) => a.fecha.getTime() - b.fecha.getTime()).map((g) => (
                  <tr key={g.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{g.desc}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{g.proveedor}</div>
                    </td>
                    <td><span style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--ink-2)', fontWeight: 600, fontSize: 13 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: GASTO_COLORS[g.cat] || 'var(--ink-3)' }}></span>{g.cat}
                    </span></td>
                    <td className="num tnum" style={{ fontWeight: 800 }}>{fmtCLP(g.monto)}</td>
                    <td style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{g.method}</td>
                    <td>{urgChip(urgencia(g))}</td>
                    <td className="num"><button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => { updateGasto(g.id, { estado: 'pagado' }); toast('Pago registrado · ' + g.desc) }}><Icon name="check" size={13} />Marcar pagado</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Gastos pagados (collapsed) */}
        <details style={{ borderTop: '1px solid var(--line)' }}>
          <summary style={{ padding: '12px 22px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="check" size={15} /> Ver gastos pagados ({gastos.filter((g) => g.estado === 'pagado').length})
          </summary>
          <table className="tbl">
            <thead><tr><th>Descripción</th><th>Categoría</th><th className="num">Monto</th><th>Fecha</th></tr></thead>
            <tbody>
              {gastos.filter((g) => g.estado === 'pagado').slice(0, 10).map((g) => (
                <tr key={g.id}><td style={{ fontWeight: 600 }}>{g.desc}</td><td style={{ color: 'var(--ink-3)', fontSize: 13 }}>{g.cat}</td><td className="num tnum">{fmtCLP(g.monto)}</td><td style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{g.fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   IVA e Impuestos
────────────────────────────────────────────── */
function FinIVA() {
  const m = useFinMetrics()
  const { gastos } = useFinanzas()
  const IVA_RATE = 0.19
  const ventasAfectas = m.ingresosMes
  const ivaDebito = Math.round((ventasAfectas * IVA_RATE) / (1 + IVA_RATE))
  // Respaldo REAL: gastos del mes marcados "tengo boleta/factura" (los antiguos sin
  // el campo cuentan como con respaldo; márcalos al editar si no lo tienen).
  const mesInicio = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)
  const gastosMes = gastos.filter((g) => g.fecha >= mesInicio)
  const gastoConRespaldo = gastosMes.filter((g) => g.respaldo !== false).reduce((a, g) => a + g.monto, 0)
  const gastoSinRespaldo = gastosMes.filter((g) => g.respaldo === false).reduce((a, g) => a + g.monto, 0)
  const ivaCredito = Math.round((gastoConRespaldo * IVA_RATE) / (1 + IVA_RATE))
  const ivaPagar = Math.max(0, ivaDebito - ivaCredito)
  const [gastosTipo, setGastosTipo] = useState('con')

  type IvaRow = { label?: string; v?: number; muted?: boolean; neg?: boolean; pos?: boolean; bold?: boolean; big?: boolean; tone?: 'danger' | 'warn'; divider?: boolean }
  const ivaRows: IvaRow[] = [
    { label: 'Ventas brutas', v: ventasAfectas, muted: false },
    { label: 'IVA incluido (19%)', v: ivaDebito, muted: true, neg: true },
    { label: 'Neto ventas', v: ventasAfectas - ivaDebito, bold: true },
    { divider: true },
    { label: 'Gastos con respaldo', v: gastoConRespaldo, muted: false },
    { label: 'IVA crédito', v: ivaCredito, muted: true, pos: true },
    { divider: true },
    { label: 'IVA estimado a pagar', v: ivaPagar, bold: true, big: true, tone: ivaPagar > 200000 ? 'danger' : 'warn' },
  ]

  return (
    <div className="fade-in">
      {/* Disclaimer */}
      <div style={{ padding: '13px 16px', background: 'oklch(0.94 0.04 90)', borderRadius: 13, marginBottom: 18, fontSize: 13.5, fontWeight: 600, color: 'oklch(0.42 0.10 70)', lineHeight: 1.55, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="alert" size={18} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Cálculo estimado.</strong> Esta sección ayuda a ordenar tu información tributaria. No reemplaza al SII ni a tu contador. <br />Revisa con tu contador antes de declarar.
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', marginBottom: 18 }}>
        <FinCard icon="receipt" label="Ventas afectas IVA" value={fmtCLP(ventasAfectas)} tone="primary" sub="Ventas del mes" />
        <FinCard icon="trendUp" label="IVA débito (19%)" value={fmtCLP(ivaDebito)} tone="terra" sub="Lo que debes al SII" />
        <FinCard icon="tag" label="IVA crédito" value={fmtCLP(ivaCredito)} tone="info" sub="De gastos con respaldo" />
        <FinCard icon="calculator" label="IVA estimado a pagar" value={fmtCLP(ivaPagar)} tone={ivaPagar > 200000 ? 'danger' : 'warn'} sub="Débito menos crédito" />
      </div>

      {/* IVA breakdown */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="card">
          <div className="card-head"><div className="card-title" style={{ flex: 1 }}>Desglose IVA</div></div>
          <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ivaRows.map((r, i) => r.divider ? <div key={i} className="divider" /> : (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13.5, fontWeight: r.bold ? 800 : 600, color: r.muted ? 'var(--ink-3)' : 'var(--ink)' }}>{r.label}</span>
                <span className="tnum" style={{ fontSize: r.big ? 17 : 14, fontWeight: r.bold ? 800 : 700, color: r.tone === 'danger' ? 'var(--danger)' : r.tone === 'warn' ? 'oklch(0.50 0.10 70)' : r.pos ? 'var(--primary-700)' : r.neg ? 'var(--ink-2)' : 'var(--ink)' }}>{r.neg ? '-' : r.pos ? '+' : ''}{fmtCLP(r.v || 0)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title" style={{ flex: 1 }}>Gastos y respaldo</div></div>
          <div style={{ padding: '16px 22px' }}>
            <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
              {[['con', 'Con respaldo'], ['sin', 'Sin respaldo']].map(([k, l]) => (
                <button key={k} className="btn" style={{ flex: 1, justifyContent: 'center', border: '1px solid ' + (gastosTipo === k ? 'var(--primary)' : 'var(--line)'), background: gastosTipo === k ? 'var(--primary-tint)' : 'var(--surface)', color: gastosTipo === k ? 'var(--primary-700)' : 'var(--ink-2)', padding: '8px', fontSize: 13, fontWeight: 700 }} onClick={() => setGastosTipo(k)}>{l}</button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gastosTipo === 'con' ? (
                <>
                  <div style={{ padding: '11px 14px', background: 'var(--ok-tint)', borderRadius: 11, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Total con respaldo</span>
                    <span className="tnum" style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary-700)' }}>{fmtCLP(gastoConRespaldo)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, lineHeight: 1.5 }}>Gastos con boleta, factura o comprobante. Estos pueden dar derecho a IVA crédito.</div>
                  <div style={{ padding: '10px 14px', background: 'var(--primary-tint)', borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'var(--primary-700)' }}>
                    <Icon name="shield" size={14} style={{ verticalAlign: '-3px', marginRight: 6 }} />IVA crédito estimado: <strong>{fmtCLP(ivaCredito)}</strong>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ padding: '11px 14px', background: 'var(--danger-tint)', borderRadius: 11, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Sin respaldo</span>
                    <span className="tnum" style={{ fontWeight: 800, fontSize: 15, color: 'var(--danger)' }}>{fmtCLP(gastoSinRespaldo)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, lineHeight: 1.5 }}>Gastos sin boleta o comprobante. No pueden usarse como IVA crédito.</div>
                  <div style={{ padding: '10px 14px', background: 'var(--warn-tint)', borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'oklch(0.50 0.10 70)' }}>
                    <Icon name="alert" size={14} style={{ verticalAlign: '-3px', marginRight: 6 }} />Solicita siempre comprobante a tus proveedores.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   Documentos
────────────────────────────────────────────── */
type Doc = { id: string; tipo: string; ref: string; fecha: Date; estado: 'emitido' | 'pendiente' | 'pagado' | 'sin_resp'; cliente: string; monto: number }

function FinDocumentos() {
  const { sales } = useStore()
  const { gastos } = useFinanzas()
  const [tipo, setTipo] = useState('Todos')
  const [est, setEst] = useState('Todos')
  const tipos = ['Todos', 'Comprobante de venta', 'Gasto con respaldo', 'Gasto sin respaldo']
  const estados = ['Todos', 'emitido', 'pendiente', 'sin_resp']
  const estadoLabel: Record<string, string> = { pendiente: 'Por pagar', emitido: 'Emitido', pagado: 'Pagado', sin_resp: 'Sin respaldo' }
  const estadoChip: Record<string, string> = { pendiente: 'chip-warn', emitido: 'chip-ok', pagado: 'chip-neutral', sin_resp: 'chip-danger' }

  // Documentos REALES del mes: comprobantes de venta emitidos + gastos registrados.
  const mesInicio = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)
  const docs = useMemo<Doc[]>(() => {
    const deVentas: Doc[] = sales
      .filter((s) => s.date >= mesInicio)
      .map((s) => ({ id: 'v' + s.id, tipo: 'Comprobante de venta', ref: `Venta #${s.boleta}`, fecha: s.date, estado: 'emitido' as const, cliente: s.cliente?.nombre || 'Venta de mostrador', monto: s.total }))
    const deGastos: Doc[] = gastos
      .filter((g) => g.fecha >= mesInicio)
      .map((g) => ({
        id: 'g' + g.id,
        tipo: g.respaldo === false ? 'Gasto sin respaldo' : 'Gasto con respaldo',
        ref: g.desc,
        fecha: g.fecha,
        estado: g.respaldo === false ? ('sin_resp' as const) : g.estado === 'pendiente' ? ('pendiente' as const) : ('pagado' as const),
        cliente: g.proveedor || g.cat,
        monto: g.monto,
      }))
    return [...deVentas, ...deGastos].sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, gastos])

  const list = docs.filter((d) => (tipo === 'Todos' || d.tipo === tipo) && (est === 'Todos' || d.estado === est))
  const pendientes = docs.filter((d) => d.estado === 'pendiente').length
  const sinResp = docs.filter((d) => d.estado === 'sin_resp').length

  return (
    <div className="fade-in">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', marginBottom: 18 }}>
        <FinCard icon="receipt" label="Documentos del mes" value={docs.length} tone="primary" sub="Ventas + gastos registrados" />
        <FinCard icon="alert" label="Gastos por pagar" value={pendientes} tone={pendientes > 0 ? 'warn' : 'ok'} sub={pendientes > 0 ? 'Pendientes de pago' : undefined} />
        <FinCard icon="tag" label="Gastos sin respaldo" value={sinResp} tone={sinResp > 0 ? 'danger' : 'ok'} sub={sinResp > 0 ? 'Solicita comprobante' : undefined} />
        <FinCard icon="check" label="Comprobantes emitidos" value={docs.filter((d) => d.estado === 'emitido').length} tone="ok" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="seg" style={{ flexShrink: 0 }}>{estados.map((e) => <button key={e} className={est === e ? 'on' : ''} onClick={() => setEst(e)}>{e === 'Todos' ? 'Todos' : estadoLabel[e]}</button>)}</div>
        <select className="select" style={{ maxWidth: 230, height: 40, fontSize: 13.5 }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {tipos.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Tipo</th><th>Referencia</th><th>Empresa / Cliente</th><th className="num">Monto</th><th>Fecha</th><th>Estado</th></tr></thead>
            <tbody>
              {list.slice(0, 60).map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700, fontSize: 13.5 }}>{d.tipo}</td>
                  <td className="muted">{d.ref}</td>
                  <td style={{ fontWeight: 600 }}>{d.cliente}</td>
                  <td className="num tnum" style={{ fontWeight: 700 }}>{fmtCLP(d.monto)}</td>
                  <td style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{d.fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</td>
                  <td><span className={'chip ' + estadoChip[d.estado]} style={{ fontSize: 12 }}>{estadoLabel[d.estado]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <EmptyState icon="receipt" title="Sin documentos este mes" text="Tus comprobantes de venta y gastos registrados del mes aparecerán aquí." />}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   Exportar para Contador
────────────────────────────────────────────── */
function FinExportar() {
  const m = useFinMetrics()
  const { nomina, marketing, gastos } = useFinanzas()
  const { toast, sales, products } = useStore()
  const [period, setPeriod] = useState('mes')
  const [selected, setSelected] = useState<Set<string>>(new Set(['ventas', 'gastos', 'resultados', 'cxc', 'iva']))
  const toggle = (k: string) => setSelected((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })

  const exportItems: { id: string; icon: string; label: string; desc: string; monto: number | null }[] = [
    { id: 'ventas', icon: 'cash', label: 'Ventas del mes', desc: 'Todas las ventas con método de pago y totales', monto: m.ingresosMes },
    { id: 'gastos', icon: 'tag', label: 'Gastos del mes', desc: 'Gastos por categoría y estado de pago', monto: m.totalGastosMes },
    { id: 'resultados', icon: 'receipt', label: 'Estado de resultados', desc: 'Ingresos, costos, gastos y utilidad estimada', monto: null },
    { id: 'cxc', icon: 'coins', label: 'Cuentas por cobrar', desc: 'Ventas a crédito y saldos pendientes', monto: null },
    { id: 'iva', icon: 'calculator', label: 'IVA estimado', desc: 'Débito, crédito y estimación a pagar', monto: null },
    { id: 'nomina', icon: 'nomina', label: 'Nómina interna', desc: 'Pagos al personal del mes', monto: nomina.reduce((a, n) => a + n.monto, 0) },
    { id: 'inventario', icon: 'box', label: 'Inventario valorizado', desc: 'Stock actual × costo por producto', monto: m.valInventario },
    { id: 'marketing', icon: 'megaphone', label: 'Inversión en marketing', desc: 'Campañas, montos y resultados', monto: marketing.reduce((a, mk) => a + mk.monto, 0) },
  ]

  // Genera un CSV REAL (se abre directo en Excel) con las secciones seleccionadas.
  const exportar = () => {
    const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
    const row = (...cells: unknown[]) => cells.map(esc).join(',')
    const L: string[] = []

    let desde = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)
    let hasta = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 1)
    if (period === 'anterior') { desde = new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1); hasta = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1) }
    if (period === 'trimestre') desde = new Date(TODAY.getFullYear(), TODAY.getMonth() - 2, 1)
    const ventasR = sales.filter((s) => s.date >= desde && s.date < hasta)
    const gastosR = gastos.filter((g) => g.fecha >= desde && g.fecha < hasta)
    const totVentas = ventasR.reduce((a, s) => a + s.total, 0)
    const totCosto = ventasR.reduce((a, s) => a + s.cost, 0)
    const totGastos = gastosR.reduce((a, g) => a + g.monto, 0)

    L.push(row('CONTROL LOCAL — RESUMEN PARA CONTADOR'))
    L.push(row('Período', `${desde.toLocaleDateString('es-CL')} al ${new Date(hasta.getTime() - 86400000).toLocaleDateString('es-CL')}`))
    L.push('')

    if (selected.has('ventas')) {
      L.push(row('VENTAS'))
      L.push(row('Boleta', 'Fecha', 'Cliente', 'Método', 'Tipo', 'Descuento', 'Total', 'Costo', 'Ganancia'))
      for (const s of ventasR) L.push(row(s.boleta, s.date.toLocaleDateString('es-CL'), s.cliente?.nombre || '', s.method, s.tipo || 'local', s.descuento?.amount || 0, s.total, s.cost, s.profit))
      L.push(row('TOTAL', '', '', '', '', '', totVentas, totCosto, totVentas - totCosto))
      L.push('')
    }
    if (selected.has('gastos')) {
      L.push(row('GASTOS'))
      L.push(row('Fecha', 'Categoría', 'Descripción', 'Proveedor', 'Método', 'Estado', 'Respaldo', 'Monto'))
      for (const g of gastosR) L.push(row(g.fecha.toLocaleDateString('es-CL'), g.cat, g.desc, g.proveedor, g.method, g.estado, g.respaldo === false ? 'No' : 'Sí', g.monto))
      L.push(row('TOTAL', '', '', '', '', '', '', totGastos))
      L.push('')
    }
    if (selected.has('resultados')) {
      L.push(row('ESTADO DE RESULTADOS (estimado)'))
      L.push(row('Ventas netas', totVentas))
      L.push(row('Costo productos vendidos', -totCosto))
      L.push(row('Margen bruto', totVentas - totCosto))
      L.push(row('Gastos del período', -totGastos))
      L.push(row('Utilidad estimada', totVentas - totCosto - totGastos))
      L.push('')
    }
    if (selected.has('cxc')) {
      const cxc = sales.filter((s) => s.credito && !s.pagado)
      L.push(row('CUENTAS POR COBRAR (fiado pendiente)'))
      L.push(row('Boleta', 'Fecha', 'Cliente', 'Teléfono', 'Total', 'Abonado', 'Saldo'))
      for (const s of cxc) {
        const abonado = (s.pagos || []).reduce((a, p) => a + p.monto, 0)
        L.push(row(s.boleta, s.date.toLocaleDateString('es-CL'), s.cliente?.nombre || '', s.cliente?.telefono || '', s.total, abonado, s.montoPendiente ?? s.total - abonado))
      }
      L.push(row('TOTAL', '', '', '', '', '', cxc.reduce((a, s) => a + (s.montoPendiente ?? s.total), 0)))
      L.push('')
    }
    if (selected.has('iva')) {
      const conResp = gastosR.filter((g) => g.respaldo !== false).reduce((a, g) => a + g.monto, 0)
      const debito = Math.round((totVentas * 0.19) / 1.19)
      const credito = Math.round((conResp * 0.19) / 1.19)
      L.push(row('IVA ESTIMADO (revisar con contador)'))
      L.push(row('Ventas brutas', totVentas))
      L.push(row('IVA débito (19% incluido)', debito))
      L.push(row('Gastos con respaldo', conResp))
      L.push(row('IVA crédito', credito))
      L.push(row('IVA estimado a pagar', Math.max(0, debito - credito)))
      L.push('')
    }
    if (selected.has('nomina')) {
      L.push(row('NÓMINA INTERNA'))
      L.push(row('Nombre', 'Cargo', 'Tipo', 'Día de pago', 'Monto', 'Bono', 'Estado'))
      for (const n of nomina) L.push(row(n.nombre, n.cargo, n.tipo, n.dia, n.monto, n.bono || 0, n.estado))
      L.push(row('TOTAL', '', '', '', nomina.reduce((a, n) => a + n.monto + (n.bono || 0), 0)))
      L.push('')
    }
    if (selected.has('inventario')) {
      L.push(row('INVENTARIO VALORIZADO (al día de hoy)'))
      L.push(row('Producto', 'Categoría', 'Stock', 'Costo unitario', 'Valor stock'))
      for (const p of products) L.push(row(p.name, p.cat, p.stock, p.cost, p.stock * p.cost))
      L.push(row('TOTAL', '', '', '', m.valInventario))
      L.push('')
    }
    if (selected.has('marketing')) {
      L.push(row('MARKETING'))
      L.push(row('Campaña', 'Canal', 'Fecha', 'Inversión', 'Ventas atribuidas', 'Clientes nuevos'))
      for (const mk of marketing) L.push(row(mk.campaign, mk.canal, mk.fecha.toLocaleDateString('es-CL'), mk.monto, mk.ventasGeneradas, mk.clientesNuevos))
      L.push('')
    }

    downloadBlob(L.join('\r\n'), `contador_${period}_${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}.csv`)
    toast('Resumen para contador descargado')
  }

  return (
    <div className="fade-in" style={{ maxWidth: 800 }}>
      <div style={{ padding: '14px 18px', background: 'var(--primary-tint)', borderRadius: 14, marginBottom: 22, fontSize: 14, fontWeight: 600, color: 'var(--primary-700)', lineHeight: 1.55 }}>
        <Icon name="download" size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} />
        <strong>Genera un resumen ordenado para enviar a tu contador.</strong> Evita mandar pantallazos sueltos, boletas perdidas o planillas incompletas.
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Periodo:</span>
        <div className="seg">{[['mes', 'Este mes'], ['anterior', 'Mes anterior'], ['trimestre', 'Trimestre']].map(([k, l]) => <button key={k} className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{l}</button>)}</div>
      </div>

      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Selecciona qué incluir</div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12, marginBottom: 24 }}>
        {exportItems.map((e) => {
          const on = selected.has(e.id)
          return (
            <button key={e.id} onClick={() => toggle(e.id)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', borderRadius: 13, border: `2px solid ${on ? 'var(--primary)' : 'var(--line)'}`, background: on ? 'var(--primary-tint)' : 'var(--surface)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: '.14s' }}>
              <span style={{ width: 38, height: 38, borderRadius: 11, background: on ? 'var(--primary)' : 'var(--surface-3)', color: on ? '#fff' : 'var(--ink-3)', display: 'grid', placeItems: 'center', flexShrink: 0, transition: '.14s' }}>
                <Icon name={e.icon} size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: on ? 'var(--primary-700)' : 'var(--ink)' }}>{e.label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>{e.desc}</div>
                {e.monto != null && <div className="tnum" style={{ fontSize: 12.5, fontWeight: 800, color: on ? 'var(--primary-700)' : 'var(--ink-2)', marginTop: 3 }}>{fmtCLP(e.monto)}</div>}
              </div>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${on ? 'var(--primary)' : 'var(--line-2)'}`, background: on ? 'var(--primary)' : 'var(--surface)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                {on && <Icon name="check" size={12} style={{ color: '#fff' }} />}
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-lg" disabled={selected.size === 0} onClick={exportar}><Icon name="download" size={18} />Descargar resumen (CSV para Excel)</button>
      </div>
      <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
        <Icon name="shield" size={13} />Esta sección es una ayuda de orden interno. No reemplaza a tu contador.
      </div>
    </div>
  )
}

export { FinCxC, FinCxP, FinIVA, FinDocumentos, FinExportar }
