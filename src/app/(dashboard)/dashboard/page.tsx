'use client'

// ---------- Dashboard / Inicio ----------
import { useMemo } from 'react'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { useConfiguracion } from '@/hooks/useConfiguracion'
import { fmtCLP, fmtPct } from '@/lib/format'
import { useGo } from '@/lib/nav'
import { Icon } from '@/components/icon'
import { PageHeader, Metric, CatDot, MarginBadge } from '@/components/ui'
import { Spark, Donut, BarList, ColumnChart } from '@/components/charts'
import { Onboarding } from '@/components/onboarding'

const TODAY = new Date()

interface Alert {
  icon: string
  tone: 'danger' | 'primary' | 'warn'
  text: string
  cta: string
  to: string
}

export default function DashboardPage() {
  const go = useGo()
  const { metrics: m, loading, exportarMes } = useDashboardMetrics()
  const { config } = useConfiguracion()

  const payTotal = Object.values(m.pay).reduce((a, b) => a + b, 0) || 1
  const payRows  = Object.entries(m.pay).sort((a, b) => b[1] - a[1])
  const payColors: Record<string, string> = { Efectivo: 'var(--primary)', Tarjeta: 'var(--terra)', Transferencia: 'var(--info)' }

  const lowM = m.cats.find(c => c.marginPct < config.margen_minimo)
  const alerts = useMemo<Alert[]>(() => [
    m.lowStockCount > 0 ? { icon: 'box', tone: 'danger' as const, text: `${m.lowStockCount} productos necesitan reposición`, cta: 'Ver inventario', to: 'inventario' } : null,
    lowM             ? { icon: 'percent', tone: 'warn'    as const, text: `Margen de ${lowM.cat} bajo el ${config.margen_minimo}% — revisa precios`, cta: 'Ver productos', to: 'productos' } : null,
    m.cats[0]        ? { icon: 'zap',     tone: 'primary' as const, text: `${m.cats[0].cat} es tu categoría estrella (30d)`, cta: 'Ver reportes', to: 'reportes' } : null,
  ].filter((a): a is Alert => Boolean(a)), [m, lowM, config.margen_minimo])

  const nombre = config.owner_nombre?.trim()
    ? config.owner_nombre.trim().split(' ')[0]
    : config.nombre_negocio

  return (
    <div className="fade-in">
      <Onboarding />
      <PageHeader
        title={`Hola, ${nombre} 👋`}
        sub={`Resumen de hoy · ${TODAY.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      >
        <button
          className="btn btn-ghost"
          onClick={() => {
            const txt = `*Resumen del día — ${TODAY.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}*\n\n💰 Ventas: ${fmtCLP(m.todayTotal)}\n📈 Ganancia: ${fmtCLP(m.todayProfit)}\n🧾 Boletas: ${m.boletas}\n📊 Margen: ${fmtPct(m.avgMargin)}\n\nGenerado con Control Local ✅`
            window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank')
          }}
        >
          <Icon name="phone" size={16} />
          Compartir por WA
        </button>
        <button className="btn btn-ghost" onClick={exportarMes} disabled={loading}>
          <Icon name="download" size={16} />
          Exportar
        </button>
        <button className="btn btn-primary" onClick={() => go('ventas')}>
          <Icon name="plus" size={16} />
          Registrar venta
        </button>
      </PageHeader>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', marginBottom: 18 }}>
        <Metric icon="cash"     label="Ventas de hoy"       value={fmtCLP(m.todayTotal)}   tone="primary" sub={`${m.boletas} boletas emitidas`} />
        <Metric icon="trendUp"  label="Ganancia de hoy"     value={fmtCLP(m.todayProfit)}  tone="terra"   sub={`Costo ${fmtCLP(m.todayCost)}`} />
        <Metric icon="percent"  label="Margen promedio"     value={fmtPct(m.avgMargin)}    tone="info"    sub="De las ventas de hoy" />
        <Metric icon="coins"    label="Fiados pendientes"   value={fmtCLP(m.totalDeuda)}   tone="warn"    sub={`${m.clientesDeudores} clientes deudores`} />
        <Metric icon="box"      label="Stock bajo"          value={m.lowStockCount}         tone="danger"  sub="Productos por reponer" />
      </div>

      {alerts.length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', marginBottom: 18 }}>
          {alerts.map((a, i) => {
            const bg = { danger: 'var(--danger-tint)', primary: 'var(--primary-tint)', warn: 'var(--warn-tint)' }[a.tone]
            const fg = { danger: 'var(--danger)',      primary: 'var(--primary-700)',  warn: 'oklch(0.50 0.10 70)' }[a.tone]
            return (
              <button key={i} onClick={() => go(a.to)} className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left', cursor: 'pointer', border: '1px solid var(--line)' }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: bg, color: fg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name={a.icon} size={18} />
                </span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>{a.text}</span>
                <span style={{ color: 'var(--ink-3)' }}>
                  <Icon name="chevR" size={16} />
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'start' }}>
        <div className="card">
          <div className="card-head">
            <div style={{ flex: 1 }}>
              <div className="card-title">Ventas de la semana</div>
              <div className="card-sub">Últimos 7 días</div>
            </div>
            <div className="tnum" style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{fmtCLP(m.trend.reduce((a, b) => a + b, 0))}</div>
              {m.weekDelta !== null && (
                <div style={{ fontSize: 12, color: m.weekDelta >= 0 ? 'var(--primary-700)' : 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                  <Icon name={m.weekDelta >= 0 ? 'trendUp' : 'trendDown'} size={13} />
                  {m.weekDelta >= 0 ? '+' : ''}{Math.round(m.weekDelta)}% vs. semana anterior
                </div>
              )}
            </div>
          </div>
          <div className="card-pad">
            <Spark data={m.trend} w={560} h={120} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>
              {m.trendLabels.map((d, i) => <span key={i}>{d}</span>)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div style={{ flex: 1 }}>
              <div className="card-title">Métodos de pago</div>
              <div className="card-sub">Ventas de hoy</div>
            </div>
          </div>
          <div className="card-pad" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Donut size={140} thickness={22} data={payRows.map(([k, v]) => ({ value: v, color: payColors[k] || 'var(--ink-3)' }))} centerValue={fmtCLP(payTotal)} centerLabel="Total hoy" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11 }}>
              {payRows.map(([k, v]) => (
                <div key={k}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 700 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: payColors[k] || 'var(--ink-3)' }}></span>
                      {k}
                    </span>
                    <span className="tnum">{Math.round((v / payTotal) * 100)}%</span>
                  </div>
                  <div className="tnum" style={{ fontSize: 12, color: 'var(--ink-3)', marginLeft: 16, fontWeight: 600 }}>{fmtCLP(v)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 18, alignItems: 'start' }}>
        <div className="card">
          <div className="card-head">
            <div style={{ flex: 1 }}>
              <div className="card-title">Ventas por categoría</div>
              <div className="card-sub">Ingresos últimos 30 días</div>
            </div>
          </div>
          <div className="card-pad">
            <BarList rows={m.cats.slice(0, 6).map(c => ({ label: c.cat, value: c.revenue, color: c.color }))} />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div style={{ flex: 1 }}>
              <div className="card-title">Ingresos, costos y ganancia</div>
              <div className="card-sub">Top 4 categorías · 30 días</div>
            </div>
          </div>
          <div className="card-pad">
            <ColumnChart
              height={170}
              groups={m.cats.slice(0, 4).map(c => ({ label: c.cat.split(' ')[0], revenue: c.revenue, cost: c.cost, profit: c.profit }))}
              series={[
                { key: 'revenue', label: 'Ingresos', color: 'var(--primary)' },
                { key: 'cost',    label: 'Costos',   color: 'var(--line-2)'  },
                { key: 'profit',  label: 'Ganancia', color: 'var(--terra)'   },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head">
          <div style={{ flex: 1 }}>
            <div className="card-title">Productos más vendidos</div>
            <div className="card-sub">Por unidades · últimos 30 días</div>
          </div>
          <button className="btn btn-ghost" onClick={() => go('reportes')}>
            Ver todos <Icon name="chevR" size={15} />
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th className="num">Vendidos</th>
                <th className="num">Ingresos</th>
                <th className="num">Margen</th>
              </tr>
            </thead>
            <tbody>
              {m.topProducts.map((p, i) => (
                <tr key={p.id}>
                  <td>
                    <span className="tnum" style={{ fontWeight: 800, color: i < 3 ? 'var(--terra-700)' : 'var(--ink-3)' }}>{i + 1}</span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{p.name}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--ink-2)', fontWeight: 600 }}>
                      <CatDot cat={p.cat} />
                      {p.cat}
                    </span>
                  </td>
                  <td className="num tnum" style={{ fontWeight: 700 }}>{p.sold % 1 === 0 ? p.sold : p.sold.toFixed(2)}</td>
                  <td className="num tnum">{fmtCLP(p.sold * p.price)}</td>
                  <td className="num">
                    <MarginBadge pct={p.marginPct} minMargin={config.margen_minimo} />
                  </td>
                </tr>
              ))}
              {m.topProducts.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-3)', fontWeight: 600, padding: '24px 0' }}>
                    Sin ventas registradas en los últimos 30 días
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
