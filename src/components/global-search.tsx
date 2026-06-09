'use client'

// ---------- Búsqueda global (⌘K) — portado de screen-search.jsx ----------
import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '@/lib/store'
import { fmtCLP } from '@/lib/format'
import { Icon } from '@/components/icon'

interface Result {
  type: 'Producto' | 'Cliente' | 'Venta'
  icon: string
  label: string
  sub: string
  action: () => void
}

export function GlobalSearch({ onClose, go }: { onClose: () => void; go: (route: string) => void }) {
  const { products, sales, clientes } = useStore()
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const results = useMemo<Result[]>(() => {
    if (q.trim().length < 2) return []
    const ql = q.toLowerCase()
    const r: Result[] = []
    products
      .filter((p) => p.name.toLowerCase().includes(ql) || p.cat.toLowerCase().includes(ql))
      .slice(0, 5)
      .forEach((p) => r.push({ type: 'Producto', icon: 'productos', label: p.name, sub: `${p.cat} · ${fmtCLP(p.price)} · Stock ${p.stock}`, action: () => { go('productos'); onClose() } }))
    clientes
      .filter((c) => c.nombre.toLowerCase().includes(ql) || (c.telefono || '').includes(q) || (c.correo || '').toLowerCase().includes(ql))
      .slice(0, 4)
      .forEach((c) => r.push({ type: 'Cliente', icon: 'clientes', label: c.nombre, sub: `${c.ciudad || ''} · ${c.telefono || ''}`, action: () => { go('clientes'); onClose() } }))
    sales
      .filter((s) => String(s.boleta).includes(q) || s.items.some((i) => i.name.toLowerCase().includes(ql)))
      .slice(0, 3)
      .forEach((s) => r.push({ type: 'Venta', icon: 'receipt', label: `Boleta #${s.boleta}`, sub: `${fmtCLP(s.total)} · ${s.method} · ${s.date.toLocaleDateString('es-CL')}`, action: () => { go('ventas'); onClose() } }))
    return r
  }, [q, products, clientes, sales, go, onClose])

  const typeColor: Record<Result['type'], string> = { Producto: 'var(--primary-tint)', Cliente: 'var(--info-tint)', Venta: 'var(--terra-tint)' }
  const typeFg: Record<Result['type'], string> = { Producto: 'var(--primary-700)', Cliente: 'var(--info)', Venta: 'var(--terra-700)' }
  const shortcuts: [string, string][] = [['Inicio', 'dashboard'], ['Ventas', 'ventas'], ['Inventario', 'inventario'], ['Clientes', 'clientes'], ['Finanzas', 'finanzas'], ['Reportes', 'reportes']]

  if (typeof document === 'undefined') return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(43,38,32,0.45)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }} onMouseDown={onClose}>
      <div className="scale-in" style={{ width: '100%', maxWidth: 580, background: 'var(--surface)', borderRadius: 18, boxShadow: 'var(--sh-pop)', overflow: 'hidden' }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <Icon name="search" size={20} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar productos, clientes, ventas…" style={{ border: 'none', outline: 'none', fontSize: 17, background: 'none', flex: 1, color: 'var(--ink)' }} />
          {q && (
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }} onClick={() => setQ('')}>
              <Icon name="x" size={16} />
            </button>
          )}
          <kbd style={{ padding: '2px 8px', background: 'var(--surface-3)', border: '1px solid var(--line)', borderRadius: 6, fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Esc</kbd>
        </div>
        {q.length >= 2 ? (
          results.length > 0 ? (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={r.action}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '12px 18px', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left', transition: '.12s', fontFamily: 'inherit' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ width: 34, height: 34, borderRadius: 9, background: typeColor[r.type], color: typeFg[r.type], display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon name={r.icon} size={16} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.sub}</div>
                  </div>
                  <span className="chip chip-neutral" style={{ fontSize: 11, padding: '2px 8px', flexShrink: 0 }}>{r.type}</span>
                  <Icon name="chevR" size={14} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14, fontWeight: 600 }}>Sin resultados para &quot;{q}&quot;</div>
          )
        ) : (
          <div style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>Ir a</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {shortcuts.map(([l, r]) => (
                <button key={r} onClick={() => { go(r); onClose() }} className="chip chip-neutral" style={{ cursor: 'pointer', fontSize: 13.5, padding: '7px 13px', fontFamily: 'inherit' }}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 14 }}>Escribe al menos 2 caracteres para buscar productos, clientes o ventas.</div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
