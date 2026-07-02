'use client'

// ---------- Fiados — Cuentas por cobrar de ventas a crédito ----------
import { useState } from 'react'
import { useFiados } from '@/hooks/useFiados'
import { useConfiguracion } from '@/hooks/useConfiguracion'
import { fmtCLP } from '@/lib/format'
import { PageHeader, Modal, MoneyInput, Field, EmptyState } from '@/components/ui'
import { Icon } from '@/components/icon'
import type { FiadoRow } from '@/hooks/useFiados'

const ESTADO_CHIP: Record<FiadoRow['estado'], React.ReactNode> = {
  al_dia:     <span className="chip chip-ok"      style={{ fontSize: 12 }}>Al día</span>,
  por_vencer: <span className="chip chip-warn"    style={{ fontSize: 12 }}>Por vencer</span>,
  vencida:    <span className="chip chip-danger"  style={{ fontSize: 12 }}>Vencida</span>,
}

export default function FiadosPage() {
  const { fiados, loading, abonar, totalDeuda } = useFiados()
  const { config } = useConfiguracion()

  const [pagoModal, setPagoModal]     = useState<FiadoRow | null>(null)
  const [montoPagar, setMontoPagar]   = useState<number | ''>('')
  const [metodoPago, setMetodoPago]   = useState('')
  const [saving, setSaving]           = useState(false)

  const totalVencido    = fiados.filter(f => f.estado === 'vencida').reduce((a, f) => a + f.monto_pendiente, 0)
  const totalPorVencer  = fiados.filter(f => f.estado === 'por_vencer').reduce((a, f) => a + f.monto_pendiente, 0)

  const openModal = (f: FiadoRow) => {
    setPagoModal(f)
    setMontoPagar(f.monto_pendiente)
    setMetodoPago(config.metodos_pago[0] || 'Efectivo')
  }

  const handleAbonar = async () => {
    if (!pagoModal || !montoPagar) return
    setSaving(true)
    try {
      await abonar(pagoModal.id, +montoPagar, metodoPago)
      setPagoModal(null)
    } catch (e) {
      console.error('Error registrando abono:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fade-in">
      <PageHeader title="Deudores" sub="¿Quién te debe? Este dinero (fiado) todavía no está en tu caja.">
        <div className="chip chip-neutral tnum" style={{ fontSize: 13 }}>
          <Icon name="coins" size={13} />
          Por cobrar: <strong style={{ marginLeft: 4 }}>{fmtCLP(totalDeuda)}</strong>
        </div>
      </PageHeader>

      {loading ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontWeight: 600 }}>Cargando fiados…</div>
      ) : fiados.length === 0 ? (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 18 }}>
            <MetricCard icon="receipt" label="Total por cobrar" value="$0"    tone="ok"      sub="Sin deudas pendientes" />
            <MetricCard icon="alert"   label="Vencido"          value="$0"    tone="primary" />
            <MetricCard icon="clock"   label="Por vencer"       value="$0"    tone="primary" />
          </div>
          <div className="card">
            <EmptyState icon="receipt" title="Sin cuentas por cobrar" text="Las ventas a crédito aparecerán aquí para que puedas hacer seguimiento de cobros." />
          </div>
          <div style={{ marginTop: 14, padding: '12px 16px', background: 'var(--primary-tint)', borderRadius: 12, fontSize: 13.5, fontWeight: 600, color: 'var(--primary-700)' }}>
            <Icon name="alert" size={15} style={{ verticalAlign: '-3px', marginRight: 7 }} />
            Para probar, registra una venta con método de pago <strong>Crédito</strong>.
          </div>
        </>
      ) : (
        <div className="fade-in">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', marginBottom: 18 }}>
            <MetricCard icon="receipt"  label="Total por cobrar"   value={fmtCLP(totalDeuda)}   tone={totalDeuda > 0 ? 'warn' : 'ok'} sub="Este dinero aún no está en caja" />
            <MetricCard icon="alert"    label="Vencido"            value={fmtCLP(totalVencido)}  tone={totalVencido > 0 ? 'danger' : 'ok'} sub={fiados.filter(f => f.estado === 'vencida').length + ' clientes'} />
            <MetricCard icon="clock"    label="Por vencer (7d)"    value={fmtCLP(totalPorVencer)} tone="warn" sub="Cobrar a tiempo mejora tu flujo" />
            <MetricCard icon="clientes" label="Clientes deudores"  value={fiados.length}          tone="info" sub="Con saldo pendiente" />
          </div>

          {totalVencido > 0 && (
            <div style={{ marginBottom: 14, padding: '12px 16px', background: 'var(--danger-tint)', borderRadius: 12, fontSize: 13.5, fontWeight: 600, color: 'var(--danger)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <Icon name="alert" size={17} style={{ flexShrink: 0 }} />
              Hay {fmtCLP(totalVencido)} en deudas vencidas. Contáctalos para cobrar.
            </div>
          )}

          <div className="card">
            <div className="card-head">
              <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--warn-tint)', color: 'oklch(0.50 0.10 70)', display: 'grid', placeItems: 'center' }}>
                <Icon name="receipt" size={16} />
              </span>
              <div style={{ flex: 1 }}>
                <div className="card-title">Deudas pendientes</div>
                <div className="card-sub">{fiados.length} ventas a crédito · &quot;Este dinero aún no está en caja&quot;</div>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Venta</th>
                    <th>Fecha</th>
                    <th className="num">Monto</th>
                    <th className="num">Pagado</th>
                    <th className="num">Saldo</th>
                    <th>Vencimiento</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {fiados.map((f) => {
                    const pagado = f.total - f.monto_pendiente
                    return (
                      <tr key={f.id}>
                        <td style={{ fontWeight: 700 }}>
                          {f.cliente_nombre}
                          {f.cliente_telefono && <br />}
                          {f.cliente_telefono && <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{f.cliente_telefono}</span>}
                        </td>
                        <td className="tnum muted">#{f.boleta}</td>
                        <td style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>
                          {new Date(f.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="num tnum">{fmtCLP(f.total)}</td>
                        <td className="num tnum muted">{fmtCLP(pagado)}</td>
                        <td className="num tnum" style={{ fontWeight: 800, color: f.estado === 'vencida' ? 'var(--danger)' : f.estado === 'por_vencer' ? 'oklch(0.50 0.10 70)' : 'var(--ink)' }}>
                          {fmtCLP(f.monto_pendiente)}
                        </td>
                        <td style={{ fontSize: 12.5, fontWeight: 600, color: f.dias_atraso > 0 ? 'var(--danger)' : 'var(--ink-3)' }}>
                          {f.vencimiento.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                          {f.dias_atraso > 0 && (
                            <span style={{ display: 'block', color: 'var(--danger)', fontSize: 11.5, fontWeight: 800 }}>
                              {f.dias_atraso} días atraso
                            </span>
                          )}
                        </td>
                        <td>{ESTADO_CHIP[f.estado]}</td>
                        <td className="num">
                          <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                            {f.cliente_telefono && (
                              <a
                                href={`https://wa.me/56${f.cliente_telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${f.cliente_nombre.split(' ')[0]}, te recuerdo que tienes un saldo pendiente de ${fmtCLP(f.monto_pendiente)}. ¡Gracias!`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
                                  <Icon name="phone" size={14} />WA
                                </button>
                              </a>
                            )}
                            <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => openModal(f)}>
                              <Icon name="check" size={13} />Abonar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {pagoModal && (() => {
        const monto = typeof montoPagar === 'number' ? montoPagar : 0
        const abono = Math.min(monto, pagoModal.monto_pendiente)
        const restante = Math.max(0, pagoModal.monto_pendiente - abono)
        const valido = abono > 0
        return (
          <Modal
            title="Registrar abono"
            sub={`${pagoModal.cliente_nombre} · #${pagoModal.boleta}`}
            onClose={() => setPagoModal(null)}
            width={420}
            footer={
              <>
                <button className="btn btn-ghost" onClick={() => setPagoModal(null)}>Cancelar</button>
                <button className="btn btn-primary" disabled={!valido || saving} onClick={handleAbonar}>
                  <Icon name="check" size={16} />
                  {saving ? 'Guardando…' : restante > 0 ? 'Registrar abono' : 'Saldar deuda'}
                </button>
              </>
            }
          >
            <div style={{ textAlign: 'center', padding: '4px 0 14px' }}>
              <div className="tnum" style={{ fontSize: 30, fontWeight: 800, color: 'var(--warn)' }}>
                {fmtCLP(pagoModal.monto_pendiente)}
              </div>
              <div style={{ color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>
                Saldo pendiente de {pagoModal.cliente_nombre}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="¿Cuánto abona ahora?" hint="Puede pagar el total o solo una parte.">
                <MoneyInput value={montoPagar} onChange={setMontoPagar} placeholder="0" />
              </Field>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'Total', val: pagoModal.monto_pendiente },
                  { label: 'Mitad', val: Math.round(pagoModal.monto_pendiente / 2) },
                ].map((q) => (
                  <button key={q.label} className="btn btn-ghost" style={{ flex: 1, fontSize: 13 }} onClick={() => setMontoPagar(q.val)}>
                    {q.label} · {fmtCLP(q.val)}
                  </button>
                ))}
              </div>

              <Field label="¿Con qué pagó?" hint="Para que cuadren tus flujos de caja.">
                <select className="select" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                  {config.metodos_pago.map((m) => <option key={m} value={m}>{m}</option>)}
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

function MetricCard({ icon, label, value, tone, sub }: { icon: string; label: string; value: string | number; tone: 'ok' | 'warn' | 'danger' | 'primary' | 'info'; sub?: string }) {
  const toneColor: Record<string, string> = { ok: 'var(--primary-700)', warn: 'oklch(0.50 0.10 70)', danger: 'var(--danger)', primary: 'var(--primary-700)', info: 'var(--info)' }
  const toneBg:    Record<string, string> = { ok: 'var(--ok-tint)',   warn: 'var(--warn-tint)',   danger: 'var(--danger-tint)',   primary: 'var(--primary-tint)',   info: 'oklch(0.94 0.03 240)' }
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: toneBg[tone], color: toneColor[tone], display: 'grid', placeItems: 'center' }}>
          <Icon name={icon} size={15} />
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)' }}>{label}</span>
      </div>
      <div className="tnum" style={{ fontSize: 20, fontWeight: 800, color: toneColor[tone] }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}
