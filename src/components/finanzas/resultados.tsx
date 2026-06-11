'use client'

// ---------- Finanzas: Estado de Resultados (portado de finanzas-resultados.jsx) ----------

import { useState } from 'react'
import { TODAY } from '@/lib/store'
import { useFinanzas, useFinMetrics, GASTO_CATS, GASTO_ICONS, GASTO_COLORS } from '@/lib/finanzas-store'
import { fmtCLP, fmtPct } from '@/lib/format'
import { Icon } from '@/components/icon'
import { FinCard } from '@/components/finanzas/shared'

type Highlight = 'primary' | 'ok' | 'warn' | 'danger'
interface ResultRow {
  label: string
  v: number
  indent: number
  bold?: boolean
  muted?: boolean
  big?: boolean
  highlight?: Highlight
  icon?: string
  color?: string
}

export function FinResultados() {
  const m = useFinMetrics()
  const { gastos } = useFinanzas()
  const [period, setPeriod] = useState('mes')
  const periods: [string, string][] = [['hoy', 'Hoy'], ['semana', 'Semana'], ['mes', 'Este mes'], ['anterior', 'Mes anterior']]
  const factor = period === 'hoy' ? 0.04 : period === 'semana' ? 0.22 : period === 'anterior' ? 1.12 : 1

  const ventasBrutas = Math.round(m.ingresosMes * factor)
  const descuentos = Math.round(ventasBrutas * 0.023)
  const devoluciones = Math.round(ventasBrutas * 0.008)
  const ventasNetas = ventasBrutas - descuentos - devoluciones
  const cpv = Math.round(m.costosMes * factor)
  const merma = Math.round(cpv * 0.015)
  const costoDespacho = Math.round(cpv * 0.025)
  const totalCostos = cpv + merma + costoDespacho
  const margenBruto = ventasNetas - totalCostos
  const margenBrutoPct = ventasNetas ? (margenBruto / ventasNetas) * 100 : 0

  // Gastos operacionales
  const mesInicio = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)
  const gastosMes = gastos.filter((g) => g.fecha >= mesInicio)
  const bycat = GASTO_CATS.reduce<Record<string, number>>((a, c) => {
    a[c] = gastosMes.filter((g) => g.cat === c).reduce((s, g) => s + g.monto, 0)
    return a
  }, {})
  const totalOp = Object.values(bycat).reduce((a, b) => a + b, 0)
  const resultadoOp = margenBruto - totalOp
  const utilidadEst = resultadoOp // simplified
  const pct = (v: number) => (ventasNetas ? (v / ventasNetas * 100).toFixed(1) + '%' : '—')

  const rows_ing: ResultRow[] = [
    { label: 'Ventas brutas', v: ventasBrutas, indent: 0, bold: false },
    { label: '(-) Descuentos', v: -descuentos, indent: 1, muted: true },
    { label: '(-) Devoluciones', v: -devoluciones, indent: 1, muted: true },
    { label: 'Ventas netas', v: ventasNetas, indent: 0, bold: true, highlight: 'primary' },
  ]
  const rows_cos: ResultRow[] = [
    { label: 'Costo productos vendidos', v: -cpv, indent: 1 },
    { label: 'Merma / pérdida stock', v: -merma, indent: 1, muted: true },
    { label: 'Costo despacho', v: -costoDespacho, indent: 1, muted: true },
    { label: 'Margen bruto', v: margenBruto, indent: 0, bold: true, highlight: margenBrutoPct > 25 ? 'ok' : 'warn' },
  ]
  const rows_op: ResultRow[] = Object.entries(bycat).filter(([, v]) => v > 0).map(([cat, v]) => ({ label: cat, v: -v, indent: 1, icon: GASTO_ICONS[cat], color: GASTO_COLORS[cat] }))
  const rows_end: ResultRow[] = [
    { label: 'Resultado operacional', v: resultadoOp, indent: 0, bold: true, highlight: resultadoOp > 0 ? 'ok' : 'danger' },
    { label: 'Utilidad estimada', v: utilidadEst, indent: 0, bold: true, big: true, highlight: utilidadEst > 0 ? 'primary' : 'danger' },
  ]

  function TRow({ row }: { row: ResultRow }) {
    const hl: Record<Highlight, string> = { primary: 'var(--primary-tint)', ok: 'var(--ok-tint)', warn: 'var(--warn-tint)', danger: 'var(--danger-tint)' }
    const fgHL: Record<Highlight, string> = { primary: 'var(--primary-700)', ok: 'var(--primary-700)', warn: 'oklch(0.50 0.10 70)', danger: 'var(--danger)' }
    const bg = row.highlight ? hl[row.highlight] : ''
    return (
      <tr style={{ background: bg, borderRadius: 8 }}>
        <td style={{ paddingLeft: row.indent ? 30 : 16, fontWeight: row.bold ? 800 : 600, fontSize: row.big ? 15 : 13.5, color: row.muted ? 'var(--ink-3)' : 'var(--ink)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {row.icon && <span style={{ width: 18, height: 18, borderRadius: 5, background: row.color + '22', color: row.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={row.icon} size={11} /></span>}
            {row.label}
          </span>
        </td>
        <td className="num tnum" style={{ fontWeight: row.bold ? 800 : 600, fontSize: row.big ? 16 : 14, color: row.highlight ? fgHL[row.highlight] : row.v < 0 ? 'var(--ink-2)' : 'var(--ink)' }}>
          {row.v < 0 ? '-' : ''}{fmtCLP(Math.abs(row.v))}
        </td>
        <td className="num tnum" style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{row.v !== 0 ? pct(Math.abs(row.v)) : '—'}</td>
      </tr>
    )
  }

  function GroupHeader({ label, sub }: { label: string; sub?: string }) {
    return (
      <tr style={{ background: 'var(--bg-2)' }}>
        <td colSpan={3} style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          {label} {sub && <span style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>· {sub}</span>}
        </td>
      </tr>
    )
  }

  return (
    <div className="fade-in">
      {/* Period filter + disclaimer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div className="seg">
          {periods.map(([k, l]) => <button key={k} className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{l}</button>)}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
          <Icon name="alert" size={13} />Este reporte es estimado. No reemplaza la revisión de tu contador.
        </span>
      </div>

      {/* Top KPIs */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', marginBottom: 18 }}>
        {([
          { label: 'Ventas netas', v: ventasNetas, tone: 'primary', icon: 'cash' },
          { label: 'Costo ventas', v: totalCostos, tone: 'info', icon: 'tag' },
          { label: 'Margen bruto', v: margenBruto, tone: margenBrutoPct > 25 ? 'ok' : 'warn', icon: 'percent', sub: fmtPct(margenBrutoPct) },
          { label: 'Gastos operac.', v: totalOp, tone: 'warn', icon: 'receipt' },
          { label: 'Utilidad estimada', v: utilidadEst, tone: utilidadEst > 0 ? 'terra' : 'danger', icon: 'trendUp', sub: ventasNetas ? fmtPct((utilidadEst / ventasNetas) * 100) : '' },
        ] as { label: string; v: number; tone: 'primary' | 'info' | 'ok' | 'warn' | 'terra' | 'danger'; icon: string; sub?: string }[]).map((c, i) => (
          <FinCard key={i} icon={c.icon} label={c.label} value={fmtCLP(c.v)} tone={c.tone} sub={c.sub} />
        ))}
      </div>

      {/* Estado de resultados table */}
      <div className="card">
        <div className="card-head">
          <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--primary-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center' }}><Icon name="receipt" size={16} /></span>
          <div style={{ flex: 1 }}><div className="card-title">Estado de resultados</div><div className="card-sub">Cuánto vendiste, cuánto costó y cuánto te quedó</div></div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl" style={{ minWidth: 540 }}>
            <thead><tr>
              <th>Concepto</th>
              <th className="num">Monto</th>
              <th className="num">% ventas</th>
            </tr></thead>
            <tbody>
              <GroupHeader label="Ingresos" />
              {rows_ing.map((r, i) => <TRow key={'i' + i} row={r} />)}
              <tr style={{ height: 8 }}><td colSpan={3} /></tr>
              <GroupHeader label="Costos directos" />
              {rows_cos.map((r, i) => <TRow key={'c' + i} row={r} />)}
              <tr style={{ height: 8 }}><td colSpan={3} /></tr>
              <GroupHeader label="Gastos operacionales" sub={fmtCLP(totalOp)} />
              {rows_op.length === 0 && <tr><td colSpan={3} style={{ padding: '14px 16px', color: 'var(--ink-3)', fontSize: 13, fontWeight: 600 }}>Sin gastos registrados para este período</td></tr>}
              {rows_op.map((r, i) => <TRow key={'o' + i} row={r} />)}
              <tr style={{ height: 8 }}><td colSpan={3} /></tr>
              <GroupHeader label="Resultado final" />
              {rows_end.map((r, i) => <TRow key={'e' + i} row={r} />)}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface-3)', borderRadius: '0 0 13px 13px', fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Icon name="alert" size={13} />
          &quot;Este reporte muestra si tu negocio está dejando utilidad después de costos y gastos. No confundas ventas con ganancia.&quot;
        </div>
      </div>
    </div>
  )
}

