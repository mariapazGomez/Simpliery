'use client'

// ---------- Cierre de caja: reconciliación de fin de jornada (portado de screen-cierreCaja.jsx) ----------
import { useState } from 'react'
import { useStore, TODAY, montosPorMetodo } from '@/lib/store'
import { useCloudCollection } from '@/lib/supabase/cloud-state'
import { useGo } from '@/lib/nav'
import { fmtCLP, fmtNum } from '@/lib/format'
import { Icon } from '@/components/icon'
import { PageHeader, Field, MoneyInput } from '@/components/ui'

interface Cierre {
  id: string
  fecha: Date
  boletas: number
  items: number
  totalVentas: number
  totalGanancia: number
  totalEfect: number
  totalTarjeta: number
  totalTrans: number
  totalCredito: number
  efectivoContado: number
  tarjetaContado: number
  notas: string
  diferencia: number
}

type SumRow =
  | { divider: true }
  | { divider?: false; label: string; v: number; bold?: boolean; tone?: 'primary' | 'terra'; muted?: boolean }

export default function CierreCajaPage() {
  const go = useGo()
  const { sales, products, toast, negocioId } = useStore()
  const [cierres, setCierres] = useCloudCollection<Cierre>('cierres', negocioId)
  const [efectivoContado, setEfectivoContado] = useState<number | ''>('')
  const [tarjetaContado, setTarjetaContado] = useState<number | ''>('')
  const [transContado, setTransContado] = useState<number | ''>('')
  const [notas, setNotas] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  // Today's sales
  const hoy = new Date(TODAY)
  hoy.setHours(0, 0, 0, 0)
  const salesHoy = sales.filter((s) => {
    const d = new Date(s.date)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === hoy.getTime()
  })

  const totalVentas = salesHoy.reduce((a, s) => a + s.total, 0)
  const totalGanancia = salesHoy.reduce((a, s) => a + s.profit, 0)
  // Dinero que ENTRÓ hoy por método: ventas de contado (con pago dividido incluido)
  // + abonos de fiado recibidos hoy (entran a la caja física aunque la venta sea vieja).
  const porMetodo: Record<string, number> = {}
  for (const s of salesHoy) {
    if (s.credito) continue // el fiado entra a caja cuando abona, no el día de la venta
    for (const [metodo, monto] of montosPorMetodo(s)) porMetodo[metodo] = (porMetodo[metodo] || 0) + monto
  }
  let abonosHoy = 0
  for (const s of sales) {
    for (const p of s.pagos || []) {
      const pf = new Date(p.fecha)
      pf.setHours(0, 0, 0, 0)
      if (pf.getTime() === hoy.getTime()) {
        const metodo = p.metodo || 'Efectivo'
        porMetodo[metodo] = (porMetodo[metodo] || 0) + p.monto
        abonosHoy += p.monto
      }
    }
  }
  const totalEfect = porMetodo['Efectivo'] || 0
  const totalTarjeta = porMetodo['Tarjeta'] || 0
  const totalTrans = porMetodo['Transferencia'] || 0
  const totalCredito = salesHoy.filter((s) => s.credito).reduce((a, s) => a + s.total, 0)
  const nBoletas = salesHoy.length
  const nItems = salesHoy.reduce((a, s) => a + s.items.reduce((b, i) => b + i.qty, 0), 0)

  const efectivoDif = efectivoContado !== '' ? +efectivoContado - totalEfect : null
  const tarjetaDif = tarjetaContado !== '' ? +tarjetaContado - totalTarjeta : null
  const transDif = transContado !== '' ? +transContado - totalTrans : null

  const lowStock = products.filter((p) => p.stock <= p.min).length

  const handleCerrar = () => {
    const cierre: Cierre = {
      id: 'c' + Date.now(),
      fecha: new Date(),
      boletas: nBoletas,
      items: nItems,
      totalVentas,
      totalGanancia,
      totalEfect,
      totalTarjeta,
      totalTrans,
      totalCredito,
      efectivoContado: +efectivoContado || totalEfect,
      tarjetaContado: +tarjetaContado || totalTarjeta,
      notas,
      diferencia: (efectivoDif || 0) + (tarjetaDif || 0) + (transDif || 0),
    }
    setCierres((cs) => [cierre, ...cs.slice(0, 29)])
    setConfirmed(true)
    toast('Caja cerrada · ' + new Date().toLocaleTimeString('es-CL'))
  }

  const DifChip = ({ d }: { d: number | null }) =>
    d === null ? null : d === 0 ? (
      <span className="chip chip-ok" style={{ fontSize: 12 }}>
        Exacto
      </span>
    ) : d > 0 ? (
      <span className="chip chip-ok" style={{ fontSize: 12 }}>
        +{fmtCLP(d)}
      </span>
    ) : (
      <span className="chip chip-danger" style={{ fontSize: 12 }}>
        {fmtCLP(d)}
      </span>
    )

  const sumRows: (SumRow | null)[] = [
    { label: 'Ventas totales del día', v: totalVentas, bold: true, tone: 'primary' },
    { label: 'Ganancia estimada', v: totalGanancia, tone: 'terra' },
    { divider: true },
    { label: 'Efectivo (sistema)', v: totalEfect },
    { label: 'Tarjeta (sistema)', v: totalTarjeta },
    { label: 'Transferencia', v: totalTrans },
    abonosHoy > 0 ? { label: 'Incluye abonos de fiado recibidos hoy', v: abonosHoy, muted: true } : null,
    totalCredito > 0 ? { label: 'Crédito pendiente', v: totalCredito, muted: true } : null,
  ]

  const conteoRows = [
    { label: 'Efectivo contado', sys: totalEfect, val: efectivoContado, set: setEfectivoContado, dif: efectivoDif },
    { label: 'Tarjeta (comprobante)', sys: totalTarjeta, val: tarjetaContado, set: setTarjetaContado, dif: tarjetaDif },
    { label: 'Transferencias', sys: totalTrans, val: transContado, set: setTransContado, dif: transDif },
  ]

  return (
    <div className="fade-in" style={{ maxWidth: 900 }}>
      <PageHeader title="Cierre de caja" sub={`Resumen del día · ${TODAY.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}`}>
        <button className="btn btn-ghost" onClick={() => go('dashboard')}>
          <Icon name="dashboard" size={16} />
          Ver dashboard
        </button>
      </PageHeader>

      {confirmed ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--primary-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <Icon name="check" size={30} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Caja cerrada</div>
          <div style={{ color: 'var(--ink-3)', fontWeight: 600, fontSize: 14, marginBottom: 24 }}>Resumen guardado correctamente</div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12, maxWidth: 480, margin: '0 auto 24px' }}>
            <div style={{ padding: '12px', background: 'var(--surface-3)', borderRadius: 12, textAlign: 'center' }}>
              <div className="tnum" style={{ fontWeight: 800, fontSize: 18, color: 'var(--primary-700)' }}>
                {fmtCLP(totalVentas)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>Ventas</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--surface-3)', borderRadius: 12, textAlign: 'center' }}>
              <div className="tnum" style={{ fontWeight: 800, fontSize: 18, color: 'var(--terra-700)' }}>
                {fmtCLP(totalGanancia)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>Ganancia</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--surface-3)', borderRadius: 12, textAlign: 'center' }}>
              <div className="tnum" style={{ fontWeight: 800, fontSize: 18 }}>
                {nBoletas}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>Boletas</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setConfirmed(false)
                setEfectivoContado('')
                setTarjetaContado('')
                setTransContado('')
              }}
            >
              Nuevo cierre
            </button>
            <button className="btn btn-primary" onClick={() => go('dashboard')}>
              <Icon name="dashboard" size={16} />
              Ir al inicio
            </button>
          </div>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
          {/* Resumen del sistema */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-head">
                <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--primary-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center' }}>
                  <Icon name="receipt" size={16} />
                </span>
                <div style={{ flex: 1 }}>
                  <div className="card-title">Resumen del sistema</div>
                  <div className="card-sub">
                    {nBoletas} boletas · {nItems} artículos vendidos
                  </div>
                </div>
              </div>
              <div style={{ padding: '10px 0' }}>
                {sumRows.filter((r): r is SumRow => Boolean(r)).map((r, i) =>
                  r.divider ? (
                    <div key={i} className="divider" style={{ margin: '4px 0' }} />
                  ) : (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 22px' }}>
                      <span style={{ fontSize: 13.5, fontWeight: r.bold ? 800 : 600, color: r.muted ? 'var(--ink-3)' : 'var(--ink)' }}>{r.label}</span>
                      <span className="tnum" style={{ fontWeight: r.bold ? 800 : 700, fontSize: r.bold ? 16 : 14, color: r.tone === 'primary' ? 'var(--primary-700)' : r.tone === 'terra' ? 'var(--terra-700)' : 'var(--ink)' }}>
                        {fmtCLP(r.v)}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            {lowStock > 0 && (
              <div style={{ padding: '12px 16px', background: 'var(--warn-tint)', borderRadius: 12, fontSize: 13.5, fontWeight: 600, color: 'oklch(0.50 0.10 70)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <Icon name="box" size={17} style={{ flexShrink: 0 }} />
                {lowStock} productos con stock bajo. Considera reponer mañana.
              </div>
            )}

            {/* Historial de cierres */}
            {cierres.length > 0 && (
              <details className="card" style={{ padding: '14px 20px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13.5, color: 'var(--ink-2)', userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="history" size={15} />
                  Cierres anteriores ({cierres.length})
                </summary>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cierres.slice(0, 5).map((c) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{fmtCLP(c.totalVentas)}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>
                          {c.boletas} boletas · {c.fecha instanceof Date ? c.fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : new Date(c.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>
                      <span className="tnum" style={{ fontWeight: 700, fontSize: 13, color: 'var(--terra-700)' }}>
                        {fmtCLP(c.totalGanancia)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Conteo físico */}
          <div className="card">
            <div className="card-head">
              <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--terra-tint)', color: 'var(--terra-700)', display: 'grid', placeItems: 'center' }}>
                <Icon name="cash" size={16} />
              </span>
              <div style={{ flex: 1 }}>
                <div className="card-title">Conteo físico de caja</div>
                <div className="card-sub">Cuánto hay realmente en caja</div>
              </div>
            </div>
            <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {conteoRows.map((f, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 700 }}>
                    <span>{f.label}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="tnum muted" style={{ fontSize: 12 }}>
                        Sistema: {fmtCLP(f.sys)}
                      </span>
                      <DifChip d={f.dif} />
                    </span>
                  </div>
                  <MoneyInput value={f.val} onChange={(v) => f.set(v === '' ? '' : v)} placeholder={fmtNum(f.sys)} />
                </div>
              ))}

              {/* Diferencia total — incluye efectivo, tarjeta y transferencias */}
              {(efectivoDif !== null || tarjetaDif !== null || transDif !== null) && (() => {
                const difTotal = (efectivoDif || 0) + (tarjetaDif || 0) + (transDif || 0)
                return (
                  <div style={{ padding: '12px 14px', background: difTotal >= 0 ? 'var(--ok-tint)' : 'var(--danger-tint)', borderRadius: 11 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 4 }}>Diferencia total</div>
                    <div className="tnum" style={{ fontSize: 20, fontWeight: 800, color: difTotal >= 0 ? 'var(--primary-700)' : 'var(--danger)' }}>
                      {difTotal >= 0 ? '+' : ''}
                      {fmtCLP(difTotal)}
                    </div>
                  </div>
                )
              })()}

              <Field label="Notas del cierre (opcional)">
                <input className="input" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: faltaron $3.000 en efectivo, se revisará mañana" />
              </Field>

              <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 4 }} onClick={handleCerrar}>
                <Icon name="check" size={18} />
                Cerrar caja del día
              </button>
              <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>El cierre queda guardado en el historial. No modifica ventas registradas.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
