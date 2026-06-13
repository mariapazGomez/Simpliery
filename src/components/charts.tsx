'use client'

// ---------- Gráficos SVG interactivos (portado de lib.jsx) ----------
import { useState, useRef, useId, type ReactNode } from 'react'
import { fmtCLP, fmtPct, STATE_LABEL } from '@/lib/format'
import type { StockState } from '@/types'

type Fmt = (n: number) => string

export function StockChip({ state }: { state: StockState }) {
  const cls = state === 'ok' ? 'chip-ok' : state === 'bajo' ? 'chip-warn' : 'chip-danger'
  const dot = state === 'ok' ? 'var(--ok)' : state === 'bajo' ? 'var(--warn)' : 'var(--danger)'
  return (
    <span className={'chip ' + cls}>
      <span className="chip-dot" style={{ background: dot }}></span>
      {STATE_LABEL[state]}
    </span>
  )
}

export function ChartTooltip({
  visible,
  x,
  y,
  content,
  containerW = 0,
}: {
  visible: boolean
  x: number
  y: number
  content: ReactNode
  containerW?: number
}) {
  if (!visible) return null
  const left = Math.min(x, containerW - 160)
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: y - 8,
        transform: 'translateY(-100%)',
        background: 'var(--ink)',
        color: '#fff',
        borderRadius: 10,
        padding: '9px 13px',
        fontSize: 13,
        fontWeight: 600,
        pointerEvents: 'none',
        zIndex: 50,
        minWidth: 130,
        boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
        whiteSpace: 'nowrap',
      }}
    >
      {content}
      <div
        style={{
          position: 'absolute',
          bottom: -6,
          left: Math.max(12, Math.min(x - left - 6, 104)),
          width: 12,
          height: 12,
          background: 'var(--ink)',
          transform: 'rotate(45deg)',
          borderRadius: 2,
        }}
      ></div>
    </div>
  )
}

export interface DonutDatum {
  value: number
  color: string
  label?: string
  key?: string
}

export function Donut({
  data,
  size = 168,
  thickness = 26,
  centerLabel,
  centerValue,
  fmt = fmtCLP,
}: {
  data: DonutDatum[]
  size?: number
  thickness?: number
  centerLabel?: ReactNode
  centerValue?: ReactNode
  fmt?: Fmt
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const total = data.reduce((a, d) => a + d.value, 0) || 1
  const R = (size - thickness) / 2
  const C = 2 * Math.PI * R
  let off = 0
  const segments = data.map((d, i) => {
    const len = (d.value / total) * C
    const seg = { ...d, len, off, i }
    off += len
    return seg
  })
  const active = hovered != null ? segments[hovered] : null
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', cursor: 'pointer' }}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth={hovered === i ? thickness + 5 : thickness}
            strokeDasharray={`${seg.len} ${C - seg.len}`}
            strokeDashoffset={-seg.off}
            strokeLinecap="butt"
            style={{
              transition: 'stroke-width .15s, opacity .15s',
              cursor: 'pointer',
              opacity: hovered != null && hovered !== i ? 0.55 : 1,
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        {active ? (
          <div>
            <div className="tnum" style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', color: active.color }}>
              {fmt(active.value)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, marginTop: 2, maxWidth: size * 0.6, lineHeight: 1.2 }}>
              {active.label || active.key}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 700 }}>{fmtPct((active.value / total) * 100)}</div>
          </div>
        ) : centerValue !== undefined ? (
          <div>
            <div className="tnum" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {centerValue}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>{centerLabel}</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export interface BarRow {
  label: string
  value: number
  color?: string
}

export function BarList({ rows, max, fmt = fmtCLP }: { rows: BarRow[]; max?: number; fmt?: Fmt }) {
  const m = max || Math.max(...rows.map((r) => r.value), 1)
  const [hovered, setHovered] = useState<number | null>(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      {rows.map((r, i) => {
        const pct = (r.value / m) * 100
        const isHov = hovered === i
        return (
          <div key={i} style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 5,
                fontSize: 13.5,
                opacity: hovered != null && !isHov ? 0.55 : 1,
                transition: 'opacity .14s',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: isHov ? 800 : 600 }}>
                <span
                  style={{
                    width: isHov ? 11 : 9,
                    height: isHov ? 11 : 9,
                    borderRadius: 3,
                    background: r.color || 'var(--primary)',
                    transition: '.14s',
                  }}
                ></span>
                {r.label}
              </span>
              <span className="tnum" style={{ fontWeight: 800 }}>
                {fmt(r.value)}
              </span>
            </div>
            <div style={{ height: isHov ? 11 : 8, background: 'var(--bg-2)', borderRadius: 6, overflow: 'hidden', transition: 'height .14s' }}>
              <div
                style={{
                  height: '100%',
                  width: pct + '%',
                  background: r.color || 'var(--primary)',
                  borderRadius: 6,
                  transition: 'width .6s cubic-bezier(.2,.8,.3,1)',
                }}
              ></div>
            </div>
            {isHov && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700, marginTop: 4, textAlign: 'right' }}>
                {fmtPct(pct)} del total
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export interface ChartSeries {
  key: string
  label: string
  color: string
}

export function ColumnChart({
  groups,
  series,
  height = 200,
  fmt = fmtCLP,
}: {
  groups: Array<Record<string, number | string> & { label: string }>
  series: ChartSeries[]
  height?: number
  fmt?: Fmt
}) {
  const max = Math.max(...groups.flatMap((g) => series.map((s) => Number(g[s.key]))), 1)
  const [hov, setHov] = useState<{ gi: number; si: number } | null>(null)
  const [tip, setTip] = useState<{ visible: boolean; x: number; y: number; content: ReactNode }>({
    visible: false,
    x: 0,
    y: 0,
    content: '',
  })
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height, padding: '0 4px' }}>
        {groups.map((g, gi) => (
          <div key={gi} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 5, width: '100%', justifyContent: 'center' }}>
              {series.map((s, si) => {
                const isH = !!hov && hov.gi === gi && hov.si === si
                const barH = (Number(g[s.key]) / max) * 100 + '%'
                return (
                  <div
                    key={si}
                    style={{
                      width: '30%',
                      maxWidth: 28,
                      minWidth: 10,
                      height: barH,
                      background: isH ? s.color : s.color + 'cc',
                      borderRadius: '6px 6px 3px 3px',
                      transition: 'height .6s cubic-bezier(.2,.8,.3,1), opacity .13s, transform .13s',
                      transform: isH ? 'scaleY(1.04)' : 'none',
                      transformOrigin: 'bottom',
                      cursor: 'pointer',
                      outline: isH ? `2px solid ${s.color}` : 'none',
                      outlineOffset: 2,
                    }}
                    onMouseEnter={(e) => {
                      setHov({ gi, si })
                      const rect = ref.current?.getBoundingClientRect()
                      const br = e.currentTarget.getBoundingClientRect()
                      setTip({
                        visible: true,
                        x: br.left - (rect?.left ?? 0) + br.width / 2,
                        y: br.top - (rect?.top ?? 0),
                        content: (
                          <>
                            <span style={{ opacity: 0.7 }}>{s.label}</span>
                            <br />
                            <strong>{g.label}</strong>
                            <br />
                            {fmt(Number(g[s.key]))}
                          </>
                        ),
                      })
                    }}
                    onMouseLeave={() => {
                      setHov(null)
                      setTip((t) => ({ ...t, visible: false }))
                    }}
                  />
                )
              })}
            </div>
            <div
              style={{
                fontSize: 12,
                color: hov && hov.gi === gi ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: hov && hov.gi === gi ? 800 : 700,
                transition: '.13s',
              }}
            >
              {g.label}
            </div>
          </div>
        ))}
      </div>
      <ChartTooltip {...tip} containerW={ref.current?.offsetWidth || 400} />
      <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
        {series.map((s, j) => (
          <span key={j} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }}></span>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function Spark({
  data,
  color = 'var(--primary)',
  w = 240,
  h = 56,
  labels,
  fmt = fmtCLP,
}: {
  data: number[]
  color?: string
  w?: number
  h?: number
  labels?: string[]
  fmt?: Fmt
}) {
  const [idx, setIdx] = useState<number | null>(null)
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const rng = max - min || 1
  const pts = data.map((d, i) => [(i / (data.length - 1 || 1)) * w, h - ((d - min) / rng) * (h - 10) - 5] as [number, number])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const area = line + ` L ${w} ${h} L 0 ${h} Z`
  const id = 'sg' + useId().replace(/:/g, '')
  const hoverPt = idx != null ? pts[idx] : null
  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ display: 'block', cursor: 'crosshair' }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const xRel = ((e.clientX - rect.left) / rect.width) * w
          const closest = pts.reduce((best, p, i) => (Math.abs(p[0] - xRel) < Math.abs(pts[best][0] - xRel) ? i : best), 0)
          setIdx(closest)
        }}
        onMouseLeave={() => setIdx(null)}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.22" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {hoverPt && (
          <>
            <line x1={hoverPt[0]} y1={0} x2={hoverPt[0]} y2={h} stroke={color} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
            <circle cx={hoverPt[0]} cy={hoverPt[1]} r="5" fill={color} stroke="white" strokeWidth="2" />
          </>
        )}
      </svg>
      {hoverPt && idx != null && (
        <div
          style={{
            position: 'absolute',
            left: Math.min((hoverPt[0] / w) * 100, 75) + '%',
            top: 0,
            transform: 'translate(-50%,-110%)',
            background: 'var(--ink)',
            color: '#fff',
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 12.5,
            fontWeight: 700,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          {labels?.[idx] && <span style={{ opacity: 0.7, marginRight: 5 }}>{labels[idx]}</span>}
          {fmt(data[idx])}
        </div>
      )}
    </div>
  )
}

