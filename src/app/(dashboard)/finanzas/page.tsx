'use client'

// ---------- Finanzas y Contabilidad: shell con 14 sub-pestañas (portado de finanzas-shell.jsx) ----------

import { useState, type ReactElement } from 'react'
import { useFinanzas, useFinMetrics } from '@/lib/finanzas-store'
import { fmtCLP } from '@/lib/format'
import { Icon } from '@/components/icon'
import { PageHeader } from '@/components/ui'
import { FinResumen, FinFlujo } from '@/components/finanzas/resumen-flujo'
import { FinResultados } from '@/components/finanzas/resultados'
import { FinProyeccion, FinMetas, FinEquilibrio, FinGastos } from '@/components/finanzas/gestion'
import { FinPasivos, FinBalance } from '@/components/finanzas/pasivos'
import { FinCxC, FinCxP, FinIVA, FinDocumentos, FinExportar } from '@/components/finanzas/cuentas'

const FIN_TABS = [
  { id: 'resumen', label: 'Resumen', icon: 'wallet', group: 'principal' },
  { id: 'resultados', label: 'Estado de resultados', icon: 'receipt', group: 'principal' },
  { id: 'flujo', label: 'Flujo de caja', icon: 'trending', group: 'principal' },
  { id: 'cxc', label: 'Por cobrar', icon: 'coins', group: 'cuentas' },
  { id: 'cxp', label: 'Por pagar', icon: 'tag', group: 'cuentas' },
  { id: 'deudas', label: 'Deudas y créditos', icon: 'building', group: 'cuentas' },
  { id: 'balance', label: 'Balance', icon: 'balance', group: 'cuentas' },
  { id: 'iva', label: 'IVA e impuestos', icon: 'calculator', group: 'tributario' },
  { id: 'documentos', label: 'Documentos', icon: 'receipt', group: 'tributario' },
  { id: 'metas', label: 'Metas', icon: 'target', group: 'gestion' },
  { id: 'gastos', label: 'Gastos', icon: 'coins', group: 'gestion' },
  { id: 'proyeccion', label: 'Proyección', icon: 'trendUp', group: 'gestion' },
  { id: 'equilibrio', label: 'Equilibrio', icon: 'balance', group: 'gestion' },
  { id: 'exportar', label: 'Exportar', icon: 'download', group: 'contador' },
]

const TAB_GROUPS = [
  { id: 'principal', label: 'Principal' },
  { id: 'cuentas', label: 'Cuentas' },
  { id: 'tributario', label: 'Tributario' },
  { id: 'gestion', label: 'Gestión' },
  { id: 'contador', label: 'Contador' },
]

// Modo simple: solo lo que el dueño usa a diario. El resto (contador) va tras el toggle.
const SIMPLE_TABS = [
  { id: 'resumen', label: 'Resumen', icon: 'wallet' },
  { id: 'gastos', label: 'Gastos', icon: 'coins' },
  { id: 'cxc', label: 'Fiados', icon: 'tag' },
  { id: 'metas', label: 'Metas', icon: 'target' },
]
const SIMPLE_IDS = SIMPLE_TABS.map((t) => t.id)

export default function FinanzasPage() {
  // Estado de tab persistido en localStorage; lectura solo en cliente para evitar mismatch SSR.
  const [tab, setTab] = useState('resumen')
  const [hydrated, setHydrated] = useState(false)
  if (!hydrated && typeof window !== 'undefined') {
    setHydrated(true)
    const saved = localStorage.getItem('fin_tab')
    if (saved && saved !== tab) setTab(saved)
  }
  const goTab = (t: string) => {
    setTab(t)
    if (typeof window !== 'undefined') localStorage.setItem('fin_tab', t)
  }
  // Modo avanzado ("para tu contador"): muestra las 14 pestañas. Por defecto, modo simple (4).
  const [advanced, setAdvanced] = useState(false)
  if (hydrated && typeof window !== 'undefined' && !advanced && localStorage.getItem('fin_advanced') === '1') {
    setAdvanced(true)
  }
  const toggleAdvanced = () => {
    const next = !advanced
    setAdvanced(next)
    if (typeof window !== 'undefined') localStorage.setItem('fin_advanced', next ? '1' : '0')
    if (!next && !SIMPLE_IDS.includes(tab)) goTab('resumen')
  }
  const m = useFinMetrics()
  const { creditos } = useFinanzas()

  // En modo simple, si la pestaña activa no es de las simples, cae a Resumen.
  const effectiveTab = advanced || SIMPLE_IDS.includes(tab) ? tab : 'resumen'

  const SCREENS: Record<string, () => ReactElement> = {
    resumen: () => <FinResumen setTab={goTab} />,
    resultados: () => <FinResultados />,
    flujo: () => <FinFlujo />,
    cxc: () => <FinCxC />,
    cxp: () => <FinCxP />,
    deudas: () => <FinPasivos />,
    balance: () => <FinBalance />,
    iva: () => <FinIVA />,
    documentos: () => <FinDocumentos />,
    metas: () => <FinMetas />,
    gastos: () => <FinGastos />,
    proyeccion: () => <FinProyeccion />,
    equilibrio: () => <FinEquilibrio />,
    exportar: () => <FinExportar />,
  }
  const ScreenEl = SCREENS[effectiveTab] || SCREENS.resumen

  return (
    <div className="fade-in">
      {/* Page header */}
      <PageHeader title="Finanzas y Contabilidad" sub="Entiende cuánto entra, cuánto sale y cuánto te queda">
        <div className="chip chip-neutral tnum" style={{ fontSize: 13 }}>
          <Icon name="wallet" size={13} />Caja estimada: <strong>{fmtCLP(m.cajaProyectada)}</strong>
        </div>
        <button className={advanced ? 'btn btn-soft' : 'btn btn-ghost'} onClick={toggleAdvanced} title="Muestra todas las herramientas contables">
          <Icon name="sliders" size={15} />{advanced ? 'Modo simple' : 'Para tu contador'}
        </button>
        {advanced && (
          <button className="btn btn-ghost" onClick={() => goTab('exportar')}><Icon name="download" size={15} />Exportar</button>
        )}
      </PageHeader>

      {/* Disclaimer strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: 'oklch(0.95 0.025 90)', borderRadius: 10, marginBottom: 16, fontSize: 12.5, fontWeight: 600, color: 'oklch(0.45 0.08 75)' }}>
        <Icon name="shield" size={14} style={{ flexShrink: 0 }} />Esta sección te ayuda a ordenar tus números. No reemplaza la revisión de tu contador. Los cálculos tributarios son estimaciones.
      </div>

      {/* Tab bar — simple (4) o avanzado (14 agrupadas) */}
      {!advanced ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 22, overflowX: 'auto', paddingBottom: 4, flexWrap: 'wrap' }}>
          {SIMPLE_TABS.map((t) => {
            const active = effectiveTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => goTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 11,
                  border: active ? '1px solid var(--primary)' : '1px solid var(--line)',
                  background: active ? 'var(--primary-tint)' : 'var(--surface)',
                  color: active ? 'var(--primary-700)' : 'var(--ink-2)',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: '.14s',
                  fontFamily: 'inherit',
                }}
              >
                <Icon name={t.icon} size={16} />
                {t.label}
              </button>
            )
          })}
        </div>
      ) : (
      <div style={{ marginBottom: 22, overflowX: 'auto', paddingBottom: 4 }}>
        {TAB_GROUPS.map((g) => {
          const groupTabs = FIN_TABS.filter((t) => t.group === g.id)
          return (
            <div key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 16, marginBottom: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)', marginRight: 4 }}>{g.label}</span>
              {groupTabs.map((t) => {
                const active = tab === t.id
                const hasBadge =
                  (t.id === 'cxp' && m.gastosPendientes > 0) ||
                  (t.id === 'deudas' && creditos && creditos.filter((c) => c.estado === 'atrasado').length > 0)
                return (
                  <button
                    key={t.id}
                    onClick={() => goTab(t.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '8px 14px',
                      borderRadius: 10,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      border: active ? '1px solid var(--primary)' : '1px solid var(--line)',
                      background: active ? 'var(--primary-tint)' : 'var(--surface)',
                      color: active ? 'var(--primary-700)' : 'var(--ink-2)',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: '.14s',
                      fontFamily: 'inherit',
                    }}
                  >
                    <Icon name={t.icon} size={14} />{t.label}
                    {hasBadge && !active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0, marginLeft: 2 }}></span>}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
      )}

      <ScreenEl />
    </div>
  )
}
