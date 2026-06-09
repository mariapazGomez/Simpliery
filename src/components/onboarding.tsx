'use client'

// ---------- Guía de primeros pasos (onboarding) ----------
// Tarjeta con: (1) pasos numerados que se marcan solos según los datos reales,
// y (2) un panel desplegable que explica qué hace cada sección de la app.
// Desaparece cuando se completan todos los pasos o si el usuario la omite.
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { useGo, NAV_GROUPS } from '@/lib/nav'
import { Icon } from '@/components/icon'

/** Explicación corta de cada sección (por id de navegación). */
const DESCRIPCIONES: Record<string, string> = {
  dashboard: 'El resumen de tu día: ventas, ganancia y alertas de un vistazo.',
  ventas: 'Registra una venta en segundos. Es tu punto de venta.',
  transacciones: 'Historial de todas tus ventas, con el detalle de cada una.',
  productos: 'Tu catálogo: precio, costo y margen de cada producto.',
  inventario: 'Controla el stock y repón lo que se está acabando.',
  despachos: 'Organiza las entregas y envíos a domicilio.',
  proveedores: 'Guarda tus proveedores y sus condiciones de compra.',
  cierreCaja: 'Cuadra el efectivo y cierra la caja al final del día.',
  clientes: 'Ficha e historial de compra de cada cliente.',
  fiados: 'Quién te debe (fiados) y registra sus pagos.',
  segmentos: 'Agrupa clientes (VIP, frecuentes, en riesgo) y contáctalos por WhatsApp.',
  finanzas: 'Flujo de caja, gastos, metas y deudas del negocio.',
  crecimiento: 'Proyecta tus ingresos y simula cuánto te falta para una meta.',
  recordatorios: 'Anota tareas y pendientes para no olvidarte de nada.',
  reportes: 'Mira cómo va tu negocio y exporta a Excel.',
  notificaciones: 'Alertas automáticas: stock bajo, despachos y clientes en riesgo.',
  usuarios: 'Tu equipo y sus permisos de acceso.',
  config: 'Ajustes del negocio, métodos de pago, categorías y respaldo de datos.',
}

export function Onboarding() {
  const { products, sales, clientes, settings } = useStore()
  const go = useGo()
  const [skip, setSkip] = useState(() => typeof window !== 'undefined' && localStorage.getItem('cl_onboarding_skip') === '1')
  const [verSecciones, setVerSecciones] = useState(false)

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

      {/* Pasos */}
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

      {/* Explicación de cada sección */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <button
          onClick={() => setVerSecciones((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: 0, fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}
        >
          <Icon name="reportes" size={16} />
          ¿Qué hace cada sección? Conoce tu app
          <Icon name={verSecciones ? 'chevD' : 'chevR'} size={16} style={{ marginLeft: 'auto', color: 'var(--ink-3)' }} />
        </button>

        {verSecciones && (
          <div className="fade-in" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {NAV_GROUPS.map((g) => (
              <div key={g.label}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7 }}>{g.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {g.items.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => go(it.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                    >
                      <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'var(--primary-700)' }}>
                        <Icon name={it.icon} size={16} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{it.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, lineHeight: 1.35 }}>{DESCRIPCIONES[it.id] || ''}</div>
                      </div>
                      <Icon name="chevR" size={15} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
