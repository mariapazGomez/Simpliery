'use client'

// ---------- Guía de primeros pasos (onboarding) ----------
// Tarjeta con pasos numerados que se marcan solos según los datos reales del
// negocio. Desaparece cuando se completan todos o si el usuario la omite.
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { useGo } from '@/lib/nav'
import { Icon } from '@/components/icon'

export function Onboarding() {
  const { products, sales, clientes, settings } = useStore()
  const go = useGo()
  const [skip, setSkip] = useState(() => typeof window !== 'undefined' && localStorage.getItem('cl_onboarding_skip') === '1')

  const steps = [
    { id: 'config', titulo: 'Personaliza tu negocio', desc: 'Pon el nombre de tu negocio y tus métodos de pago.', done: !!settings.business && settings.business !== 'Mi negocio', to: 'config' },
    { id: 'productos', titulo: 'Agrega tu primer producto', desc: 'Carga lo que vendes, con su precio y stock.', done: products.length > 0, to: 'productos' },
    { id: 'ventas', titulo: 'Registra tu primera venta', desc: 'Prueba el punto de venta en segundos.', done: sales.length > 0, to: 'ventas' },
    { id: 'clientes', titulo: 'Suma tu primer cliente', desc: 'Lleva el historial y los fiados de tus clientes.', done: clientes.length > 0, to: 'clientes' },
  ]
  const doneCount = steps.filter((s) => s.done).length

  if (skip || doneCount === steps.length) return null

  const omitir = () => {
    setSkip(true)
    if (typeof window !== 'undefined') localStorage.setItem('cl_onboarding_skip', '1')
  }

  return (
    <div className="card card-pad fade-in" style={{ marginBottom: 18, border: '1px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>👋 ¡Bienvenido a Control Local!</div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>Sigue estos pasos para dejar tu negocio listo. Se marcan solos a medida que avanzas.</div>
        </div>
        <span className="chip chip-neutral tnum" style={{ fontWeight: 800 }}>{doneCount}/{steps.length}</span>
        <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={omitir}>Omitir guía</button>
      </div>

      <div style={{ height: 7, background: 'var(--surface-3)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ width: `${(doneCount / steps.length) * 100}%`, height: '100%', background: 'var(--primary)', transition: 'width .3s' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: s.done ? 'var(--primary-tint)' : 'var(--surface-3)', borderRadius: 11 }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, background: s.done ? 'var(--primary)' : 'var(--surface)', color: s.done ? '#fff' : 'var(--ink-3)', border: s.done ? 'none' : '1px solid var(--line)', fontWeight: 800, fontSize: 13 }}>
              {s.done ? <Icon name="check" size={15} /> : i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: s.done ? 'var(--ink-3)' : 'var(--ink)', textDecoration: s.done ? 'line-through' : 'none' }}>{s.titulo}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{s.desc}</div>
            </div>
            {s.done ? (
              <span className="chip chip-ok" style={{ fontSize: 12 }}>Listo</span>
            ) : (
              <button className="btn btn-primary" style={{ fontSize: 13, padding: '7px 13px', whiteSpace: 'nowrap' }} onClick={() => go(s.to)}>
                Empezar<Icon name="chevR" size={15} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
