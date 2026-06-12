'use client'

// ---------- Crecimiento: cliente como activo → proyección, metas y retención ----------
// Mejora propia (Fase C). Reúne: proyección por clientes, simulador de meta/inversión,
// escenarios "¿qué pasa si?" y loop de retención WhatsApp.
// Cautela de diseño: solo usa clientes IDENTIFICADOS (no ventas de mostrador anónimas)
// y muestra rangos conservador/esperado/optimista — supuestos transparentes y editables.

import { useState, useMemo } from 'react'
import { useStore, useMetrics, clientMetrics, TODAY } from '@/lib/store'
import { fmtCLP, fmtPct } from '@/lib/format'
import { Icon } from '@/components/icon'
import { PageHeader, Metric, MoneyInput } from '@/components/ui'
import { Spark } from '@/components/charts'
import type { Cliente, ClientMetrics } from '@/types'

type Enriched = { c: Cliente; mm: ClientMetrics }

function Slider({ label, value, onChange, min, max, step = 1, fmt }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; fmt: (v: number) => string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>{label}</span>
        <span className="tnum" style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--primary-700)' }}>{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
      />
    </div>
  )
}

// Próximos 12 meses desde hoy (el acumulado parte el mes siguiente).
const MES_LABELS = Array.from({ length: 12 }, (_, i) =>
  new Date(TODAY.getFullYear(), TODAY.getMonth() + i + 1, 1).toLocaleDateString('es-CL', { month: 'short' }),
)

export default function CrecimientoPage() {
  const { clientes, settings } = useStore()
  const m = useMetrics()

  // Escenarios
  const [recompra, setRecompra] = useState(70) // % probabilidad de recompra mensual
  const [ticketAdj, setTicketAdj] = useState(0) // % ajuste al ticket medio
  const [recuperar, setRecuperar] = useState(0) // # clientes en riesgo a recuperar

  // Meta / inversión
  const [metaMonto, setMetaMonto] = useState<number | ''>(2500000)
  const [aporte, setAporte] = useState(30) // % de la ganancia recurrente destinada a la meta

  const enriched = useMemo<Enriched[]>(() => clientes.map((c) => ({ c, mm: clientMetrics(c) })), [clientes])

  // Margen estimado: usa el margen mensual real del negocio; cae al mínimo configurado.
  const margenPct = m.totMargin > 0 ? m.totMargin : settings.minMargin

  const calc = useMemo(() => {
    // Solo clientes con frecuencia conocida (≥2 compras) = "activo recurrente medible"
    const conFrec = enriched.filter((x) => x.mm.frecuencia != null && x.mm.frecuencia > 0)
    const activos = conFrec.filter((x) => (x.mm.daysSinceLast ?? 999) <= 45)
    const enRiesgo = conFrec
      .filter((x) => (x.mm.daysSinceLast ?? 0) > 45)
      .sort((a, b) => b.mm.ticketMedio - a.mm.ticketMedio)
    const recuperados = enRiesgo.slice(0, recuperar)
    const base = [...activos, ...recuperados]

    // Ingreso recurrente esperado mensual de la cartera (a prob dada)
    const revAt = (prob: number) =>
      base.reduce((a, x) => {
        const comprasMes = 30 / (x.mm.frecuencia || 30)
        const ticket = x.mm.ticketMedio * (1 + ticketAdj / 100)
        return a + ticket * comprasMes * (prob / 100)
      }, 0)

    const esperado = revAt(recompra)
    const conservador = esperado * 0.75
    const optimista = esperado * 1.25
    const gananciaMensual = esperado * (margenPct / 100)

    // Valor anual de la cartera (CLV agregado, a prob esperada)
    const valorCartera = base.reduce((a, x) => {
      const comprasAnio = 365 / (x.mm.frecuencia || 365)
      const ticket = x.mm.ticketMedio * (1 + ticketAdj / 100)
      return a + ticket * comprasAnio * (recompra / 100)
    }, 0)

    return { conFrec, activos, enRiesgo, recuperados, base, esperado, conservador, optimista, gananciaMensual, valorCartera }
  }, [enriched, recompra, ticketAdj, recuperar, margenPct])

  // Simulador de meta
  const aporteMensual = calc.gananciaMensual * (aporte / 100)
  const meta = typeof metaMonto === 'number' ? metaMonto : 0
  const mesesPayback = aporteMensual > 0 && meta > 0 ? Math.ceil(meta / aporteMensual) : null
  const fechaMeta = useMemo(() => {
    if (!mesesPayback) return null
    const d = new Date(TODAY)
    d.setMonth(d.getMonth() + mesesPayback)
    return d
  }, [mesesPayback])

  // Acumulado 12 meses hacia la meta
  const acumulado = useMemo(() => Array.from({ length: 12 }, (_, i) => aporteMensual * (i + 1)), [aporteMensual])

  const enriquecidoRiesgo = calc.enRiesgo

  function waLink(c: Cliente) {
    const phone = (c.telefono || '').replace(/[^0-9]/g, '')
    const nombre = c.nombre.split(' ')[0]
    const txt = `Hola ${nombre} 👋, te escribimos de ${settings.business}. Hace un tiempo que no te vemos y queremos consentirte: tenemos novedades y productos frescos que te pueden gustar. ¿Te preparamos un pedido para esta semana? 🧺`
    return `https://wa.me/${phone}?text=${encodeURIComponent(txt)}`
  }

  function valorAnual(x: Enriched) {
    const comprasAnio = 365 / (x.mm.frecuencia || 365)
    return x.mm.ticketMedio * comprasAnio
  }

  return (
    <div className="fade-in">
      <PageHeader title="Crecimiento" sub="Cada cliente es un activo. Proyecta cuánto puede generar tu negocio y cuándo alcanzas tus metas.">
        <span className="chip chip-neutral" style={{ fontSize: 12.5 }}>
          <Icon name="users" size={13} />
          {calc.base.length} clientes en la proyección
        </span>
      </PageHeader>

      {/* Aviso de alcance honesto */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: 'var(--info-tint)', borderRadius: 10, marginBottom: 18, fontSize: 12.5, fontWeight: 600, color: 'var(--info)' }}>
        <Icon name="shield" size={14} style={{ flexShrink: 0 }} />
        Esta proyección usa solo tus <strong style={{ margin: '0 4px' }}>clientes identificados</strong> con historial de compra. Las ventas de mostrador anónimas no se incluyen. Son estimaciones con supuestos que tú controlas.
      </div>

      {/* Métricas clave */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginBottom: 18 }}>
        <Metric icon="users" label="Clientes recurrentes" value={calc.activos.length} tone="primary" sub={`${calc.enRiesgo.length} en riesgo de perderse`} />
        <Metric icon="trending" label="Ingreso recurrente / mes" value={fmtCLP(calc.esperado)} tone="info" sub={`Esperado · ${recompra}% recompra`} />
        <Metric icon="wallet" label="Ganancia recurrente / mes" value={fmtCLP(calc.gananciaMensual)} tone="terra" sub={`Margen ${fmtPct(margenPct)}`} />
        <Metric icon="star" label="Valor anual de tu cartera" value={fmtCLP(calc.valorCartera)} tone="primary" sub="Lo que vale tu base de clientes" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        {/* Escenarios */}
        <div className="card">
          <div className="card-head">
            <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--primary-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center' }}>
              <Icon name="sliders" size={17} />
            </span>
            <div style={{ flex: 1 }}>
              <div className="card-title">Escenarios · ¿qué pasa si?</div>
              <div className="card-sub">Mueve los supuestos y mira el impacto al instante</div>
            </div>
          </div>
          <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Slider label="Probabilidad de recompra mensual" value={recompra} onChange={setRecompra} min={20} max={100} fmt={(v) => v + '%'} />
            <Slider label="Ajuste al ticket medio" value={ticketAdj} onChange={setTicketAdj} min={-20} max={50} fmt={(v) => (v > 0 ? '+' : '') + v + '%'} />
            <Slider label={`Recuperar clientes en riesgo (de ${calc.enRiesgo.length})`} value={recuperar} onChange={setRecuperar} min={0} max={calc.enRiesgo.length} fmt={(v) => `${v} clientes`} />

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              {[
                { label: 'Conservador', value: calc.conservador, color: 'var(--ink-3)' },
                { label: 'Esperado', value: calc.esperado, color: 'var(--primary-700)' },
                { label: 'Optimista', value: calc.optimista, color: 'var(--terra-700)' },
              ].map((r) => (
                <div key={r.label} style={{ flex: 1, textAlign: 'center', padding: '12px 8px', background: 'var(--surface-3)', borderRadius: 12, border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.label}</div>
                  <div className="tnum" style={{ fontSize: 16.5, fontWeight: 800, color: r.color, marginTop: 4 }}>{fmtCLP(r.value)}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600 }}>/ mes</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Simulador de meta */}
        <div className="card">
          <div className="card-head">
            <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--terra-tint)', color: 'var(--terra-700)', display: 'grid', placeItems: 'center' }}>
              <Icon name="target" size={17} />
            </span>
            <div style={{ flex: 1 }}>
              <div className="card-title">Simulador de meta</div>
              <div className="card-sub">¿En cuánto tiempo lo logras con tu flujo recurrente?</div>
            </div>
          </div>
          <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label className="field">
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>Quiero invertir en… (máquina, local, stock)</span>
              <MoneyInput value={metaMonto} onChange={setMetaMonto} placeholder="2.500.000" />
            </label>
            <Slider label="De mi ganancia recurrente destino a la meta" value={aporte} onChange={setAporte} min={5} max={80} step={5} fmt={(v) => v + '%'} />

            <div style={{ background: 'var(--primary-tint)', borderRadius: 14, padding: '18px 20px', textAlign: 'center' }}>
              {mesesPayback ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-700)' }}>Lo alcanzas en</div>
                  <div className="tnum" style={{ fontSize: 34, fontWeight: 800, color: 'var(--primary-700)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                    {mesesPayback} {mesesPayback === 1 ? 'mes' : 'meses'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600, marginTop: 2 }}>
                    {fechaMeta && `≈ ${fechaMeta.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}`} · aportando {fmtCLP(aporteMensual)}/mes
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-3)', padding: '12px 0' }}>
                  Ajusta el monto o el % de aporte para ver el plazo
                </div>
              )}
            </div>

            {aporteMensual > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 6 }}>Ahorro acumulado · próximos 12 meses</div>
                <Spark data={acumulado} w={400} h={70} labels={MES_LABELS} color="var(--terra)" />
                {typeof metaMonto === 'number' && metaMonto > 0 && (
                  <div style={{ marginTop: 8, height: 8, background: 'var(--bg-2)', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: Math.min(100, (acumulado[11] / metaMonto) * 100) + '%', background: 'var(--terra)', borderRadius: 6 }}></div>
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 6, textAlign: 'right' }}>
                  En 12 meses: {fmtCLP(acumulado[11])}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loop de retención WA */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head">
          <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--warn-tint)', color: 'oklch(0.50 0.10 70)', display: 'grid', placeItems: 'center' }}>
            <Icon name="phone" size={17} />
          </span>
          <div style={{ flex: 1 }}>
            <div className="card-title">Protege tu activo · clientes a recuperar</div>
            <div className="card-sub">Pasaron su fecha esperada de recompra. Contáctalos en 1 clic.</div>
          </div>
          <span className="chip chip-warn">{enriquecidoRiesgo.length}</span>
        </div>
        {enriquecidoRiesgo.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--ink-3)' }}>
            <Icon name="check" size={32} style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 700, fontSize: 15 }}>¡Excelente! Ningún cliente en riesgo</div>
            <div style={{ fontSize: 13.5, marginTop: 4 }}>Tu cartera está activa y al día.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="num">Sin comprar</th>
                  <th className="num">Ticket medio</th>
                  <th className="num">Valor anual</th>
                  <th style={{ width: 1 }}></th>
                </tr>
              </thead>
              <tbody>
                {enriquecidoRiesgo.map((x) => (
                  <tr key={x.c.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{x.c.nombre}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{x.c.ciudad}</div>
                    </td>
                    <td className="num tnum" style={{ fontWeight: 700, color: 'var(--danger)' }}>{x.mm.daysSinceLast} días</td>
                    <td className="num tnum">{fmtCLP(x.mm.ticketMedio)}</td>
                    <td className="num tnum" style={{ fontWeight: 700 }}>{fmtCLP(valorAnual(x))}</td>
                    <td>
                      <a className="btn btn-soft" href={waLink(x.c)} target="_blank" rel="noopener noreferrer" style={{ whiteSpace: 'nowrap' }}>
                        <Icon name="phone" size={15} />
                        Recuperar
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
