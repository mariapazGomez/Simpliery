'use client'

// ---------- Finanzas: componentes compartidos (FinCard, AlertaBanner, SectionHeader) ----------
// Extraídos de screen-finanzas.jsx. Usados por TODAS las tabs Fin*.

import type { ReactNode } from 'react'
import { Icon } from '@/components/icon'

type FinTone = 'primary' | 'terra' | 'warn' | 'danger' | 'info' | 'ok'

const FIN_TONES: Record<FinTone, { bg: string; fg: string }> = {
  primary: { bg: 'var(--primary-tint)', fg: 'var(--primary-700)' },
  terra: { bg: 'var(--terra-tint)', fg: 'var(--terra-700)' },
  warn: { bg: 'var(--warn-tint)', fg: 'oklch(0.50 0.10 70)' },
  danger: { bg: 'var(--danger-tint)', fg: 'var(--danger)' },
  info: { bg: 'var(--info-tint)', fg: 'var(--info)' },
  ok: { bg: 'var(--ok-tint)', fg: 'var(--primary-700)' },
}

export function FinCard({
  icon,
  label,
  value,
  sub,
  tone = 'primary',
  alert,
}: {
  icon: string
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  tone?: FinTone
  alert?: ReactNode
}) {
  const t = FIN_TONES[tone] || FIN_TONES.primary
  return (
    <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: t.bg, color: t.fg, display: 'grid', placeItems: 'center' }}>
          <Icon name={icon} size={19} />
        </span>
        {alert && (
          <span className="chip chip-warn" style={{ fontSize: 11.5 }}>
            <Icon name="alert" size={12} />
            {alert}
          </span>
        )}
      </div>
      <div>
        <div className="tnum" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600, marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 5 }}>{sub}</div>}
      </div>
    </div>
  )
}

export function AlertaBanner({
  tone = 'warn',
  icon = 'alert',
  children,
  action,
}: {
  tone?: 'warn' | 'danger' | 'primary' | 'ok'
  icon?: string
  children: ReactNode
  action?: { label: ReactNode; fn: () => void }
}) {
  const c = {
    warn: { bg: 'var(--warn-tint)', fg: 'oklch(0.50 0.10 70)', border: 'oklch(0.90 0.06 75)' },
    danger: { bg: 'var(--danger-tint)', fg: 'var(--danger)', border: 'var(--danger-tint)' },
    primary: { bg: 'var(--primary-tint)', fg: 'var(--primary-700)', border: 'var(--primary-tint2)' },
    ok: { bg: 'var(--ok-tint)', fg: 'var(--primary-700)', border: 'var(--primary-tint2)' },
  }[tone]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: c.bg, borderRadius: 12, border: `1px solid ${c.border}` }}>
      <Icon name={icon} size={17} style={{ color: c.fg, flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{children}</div>
      {action && (
        <button className="btn btn-ghost" style={{ fontSize: 12.5, padding: '5px 11px', flexShrink: 0 }} onClick={action.fn}>
          {action.label}
        </button>
      )}
    </div>
  )
}

export function SectionHeader({ label }: { label: ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '22px 0 10px' }}>{label}</div>
}
