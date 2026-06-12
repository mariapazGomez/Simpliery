'use client'

// ---------- Segmentos: filtrar, seleccionar y comunicar (portado de screen-segmentos.jsx) ----------
import { useMemo, useState } from 'react'
import { useStore, clientMetrics } from '@/lib/store'
import { fmtCLP } from '@/lib/format'
import { Icon } from '@/components/icon'
import { PageHeader, Modal, EmptyState } from '@/components/ui'
import { ClienteChip } from '@/components/cliente-chip'
import type { Cliente, ClientMetrics } from '@/types'

type EnrichedCliente = Cliente & ClientMetrics

interface SegmentoRapido {
  id: string
  icon: string
  label: string
  color: string
  desc: string
  fn: (c: EnrichedCliente) => boolean
}

const SEGMENTOS_RAPIDOS: SegmentoRapido[] = [
  { id: 'proximos', icon: 'clock', label: 'Próximos a comprar', color: 'var(--primary)', desc: 'Compra esperada en los próximos 7 días', fn: (c) => c.daysUntilNext != null && c.daysUntilNext >= 0 && c.daysUntilNext <= 7 },
  { id: 'riesgo', icon: 'alert', label: 'En riesgo', color: 'var(--warn)', desc: 'Sin compra hace más de 45 días', fn: (c) => c.daysSinceLast != null && c.daysSinceLast > 45 },
  { id: 'vip', icon: 'star', label: 'Clientes VIP', color: 'oklch(0.62 0.10 60)', desc: 'Alto gasto y alta frecuencia', fn: (c) => c.categoria === 'VIP' },
  { id: 'nuevos', icon: 'trendUp', label: 'Nuevos clientes', color: 'var(--info)', desc: 'Con 1 o 2 compras solamente', fn: (c) => c.compras.length <= 2 },
  { id: 'inactivos', icon: 'zap', label: 'Sin actividad 30d+', color: 'var(--danger)', desc: 'No compran hace más de 30 días', fn: (c) => c.daysSinceLast != null && c.daysSinceLast > 30 },
  { id: 'frecuentes', icon: 'receipt', label: 'Frecuentes', color: 'var(--primary)', desc: '5 o más compras realizadas', fn: (c) => c.compras.length >= 5 },
]

function formatWA(tel: string): string {
  const digits = tel.replace(/\D/g, '')
  return digits.startsWith('56') ? digits : '56' + digits.replace(/^0/, '')
}
function personalizeMsg(tpl: string, c: Cliente, negocio = 'tu negocio'): string {
  return tpl
    .replace(/{{nombre}}/g, c.nombre.split(' ')[0])
    .replace(/{{ciudad}}/g, c.ciudad)
    .replace(/{{negocio}}/g, negocio)
}

/* ── WhatsApp modal ──────────────────────────────────── */
function WAModal({ clientes, msg, negocio, onClose }: { clientes: EnrichedCliente[]; msg: string; negocio: string; onClose: () => void }) {
  const [sent, setSent] = useState<Record<string, boolean>>({})
  return (
    <Modal title={`Enviar por WhatsApp · ${clientes.length} clientes`} sub="Haz clic en cada cliente para abrir su WhatsApp directo" onClose={onClose} width={540} footer={<button className="btn btn-ghost" onClick={onClose}>Cerrar</button>}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, padding: '10px 13px', background: 'oklch(0.94 0.04 145)', borderRadius: 11 }}>
        <Icon name="alert" size={14} style={{ color: 'var(--primary-700)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: 'var(--primary-700)', fontWeight: 600 }}>WhatsApp se abre uno a uno. El mensaje ya viene personalizado con el nombre de cada cliente.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {clientes.map((c) => {
          const wa = formatWA(c.telefono || '')
          const text = encodeURIComponent(personalizeMsg(msg, c, negocio))
          const url = `https://wa.me/${wa}?text=${text}`
          const done = sent[c.id]
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: done ? 'var(--primary-tint)' : 'var(--surface-3)', borderRadius: 11, border: `1px solid ${done ? 'var(--primary-tint2)' : 'var(--line)'}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.nombre}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{c.telefono || 'Sin teléfono'}</div>
              </div>
              {done && (
                <span className="chip chip-ok" style={{ fontSize: 12 }}>
                  <Icon name="check" size={12} />
                  Enviado
                </span>
              )}
              {wa ? (
                <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => setSent((s) => ({ ...s, [c.id]: true }))}>
                  <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 13, gap: 6 }}>
                    <Icon name="phone" size={15} />
                    Abrir WA
                  </button>
                </a>
              ) : (
                <span style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 700 }}>Sin número</span>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 14, padding: '11px 13px', background: 'var(--surface-3)', borderRadius: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 4 }}>Vista previa del mensaje:</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>{personalizeMsg(msg, clientes[0], negocio)}</div>
      </div>
    </Modal>
  )
}

/* ── Email modal ─────────────────────────────────────── */
function EmailModal({ clientes, msg, negocio, onClose }: { clientes: EnrichedCliente[]; msg: string; negocio: string; onClose: () => void }) {
  const [subject, setSubject] = useState(`Hola desde ${negocio}`)
  const [copied, setCopied] = useState(false)
  const emails = clientes.map((c) => c.correo).filter(Boolean).join(',')
  const body = personalizeMsg(msg, clientes[0], negocio)
  const copyEmails = () => {
    navigator.clipboard.writeText(emails).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <Modal
      title={`Enviar correo · ${clientes.length} destinatarios`}
      sub="Se abrirá tu cliente de correo con el mensaje listo"
      onClose={onClose}
      width={520}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <a href={`mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>
            <button className="btn btn-primary" onClick={onClose}>
              <Icon name="mail" size={16} />
              Abrir correo
            </button>
          </a>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <label className="field">
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>Asunto</span>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>Destinatarios ({clientes.length})</span>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={copyEmails}>
              <Icon name="copy" size={13} />
              {copied ? '¡Copiado!' : 'Copiar todos'}
            </button>
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--surface-3)', borderRadius: 10, fontSize: 12.5, color: 'var(--ink-2)', maxHeight: 80, overflowY: 'auto', wordBreak: 'break-all', fontWeight: 600 }}>{emails || 'Sin correos disponibles'}</div>
        </div>
        <div style={{ padding: '12px 14px', background: 'var(--surface-3)', borderRadius: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 4 }}>Vista previa:</div>
          <div style={{ fontSize: 13, color: 'var(--ink)', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
            {body.slice(0, 160)}
            {body.length > 160 ? '…' : ''}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, display: 'flex', gap: 6 }}>
          <Icon name="alert" size={13} style={{ flexShrink: 0 }} />
          Si tu cliente de correo no abre, copia los emails y pégalos manualmente en un correo nuevo.
        </div>
      </div>
    </Modal>
  )
}

/* ── Main screen ─────────────────────────────────────── */
export default function SegmentosPage() {
  const { clientes, settings } = useStore()
  const enriched: EnrichedCliente[] = useMemo(() => clientes.map((c) => ({ ...c, ...clientMetrics(c) })), [clientes])
  const cities = useMemo(() => ['Todas', ...[...new Set(clientes.map((c) => c.ciudad))].sort()], [clientes])

  // Filters
  const [segRapido, setSegRapido] = useState<string | null>(null)
  const [ciudad, setCiudad] = useState('Todas')
  const [minCompras, setMinCompras] = useState('')
  const [minGasto, setMinGasto] = useState('')
  const [proxDias, setProxDias] = useState('')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState('Hola {{nombre}}! 👋 Te escribimos desde {{negocio}} con novedades que te pueden interesar. ¡Te esperamos pronto!')
  const [showWA, setShowWA] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  const WA_TEMPLATES = [
    { label: 'Recordatorio suave', text: 'Hola {{nombre}}, te recordamos que ya ha pasado un tiempo desde tu última visita a {{negocio}}. ¡Tenemos novedades esperando por ti!' },
    { label: 'Promoción personalizada', text: 'Hola {{nombre}} 🎉 Esta semana en {{negocio}} tenemos ofertas especiales. ¡Ven a vernos o escríbenos para coordinar tu pedido!' },
    { label: 'Recuperación', text: 'Hola {{nombre}}, notamos que llevas un tiempo sin visitarnos. En {{negocio}} te extrañamos. ¿Hay algo en lo que podamos ayudarte?' },
    { label: 'Post compra', text: 'Hola {{nombre}} 😊 ¡Gracias por tu compra en {{negocio}}! Esperamos que todo haya sido de tu agrado. Cualquier cosa, estamos aquí.' },
    { label: 'Cliente frecuente', text: 'Hola {{nombre}}, eres uno de nuestros clientes más especiales en {{negocio}}. Queremos ofrecerte atención personalizada. ¿Nos escribes cuando necesites algo?' },
    { label: 'Nueva temporada', text: 'Hola {{nombre}}, llegaron productos nuevos a {{negocio}} que sabemos que te van a gustar. ¡Date una vuelta o pide por este medio!' },
    { label: 'Oferta exclusiva', text: 'Hola {{nombre}} 🌟, por ser cliente de {{negocio}} tienes una oferta exclusiva esta semana. Escríbenos y te contamos los detalles.' },
  ]

  const filtered = useMemo(() => {
    let list = enriched
    if (segRapido) {
      const seg = SEGMENTOS_RAPIDOS.find((s) => s.id === segRapido)
      if (seg) list = list.filter(seg.fn)
    }
    if (ciudad !== 'Todas') list = list.filter((c) => c.ciudad === ciudad)
    if (minCompras) list = list.filter((c) => c.compras.length >= +minCompras)
    if (minGasto) list = list.filter((c) => c.totalGastado >= +minGasto)
    if (proxDias) list = list.filter((c) => c.daysUntilNext != null && c.daysUntilNext >= 0 && c.daysUntilNext <= +proxDias)
    if (q) list = list.filter((c) => c.nombre.toLowerCase().includes(q.toLowerCase()))
    return list
  }, [enriched, segRapido, ciudad, minCompras, minGasto, proxDias, q])

  const allSel = filtered.length > 0 && filtered.every((c) => selected.has(c.id))
  const toggleAll = () =>
    setSelected((s) => {
      const n = new Set(s)
      if (allSel) filtered.forEach((c) => n.delete(c.id))
      else filtered.forEach((c) => n.add(c.id))
      return n
    })
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const selClientes = enriched.filter((c) => selected.has(c.id))
  const clearFiltros = () => {
    setSegRapido(null)
    setCiudad('Todas')
    setMinCompras('')
    setMinGasto('')
    setProxDias('')
    setQ('')
  }

  return (
    <div className="fade-in">
      <PageHeader title="Segmentos" sub="Filtra, selecciona y comunícate con tus clientes">
        {selected.size > 0 && (
          <>
            <span className="chip chip-ok" style={{ fontSize: 13.5, padding: '6px 14px' }}>
              <Icon name="users" size={14} />
              {selected.size} seleccionados
            </span>
            <button className="btn btn-ghost" onClick={() => setShowEmail(true)}>
              <Icon name="mail" size={16} />
              Correo
            </button>
            <button className="btn btn-primary" onClick={() => setShowWA(true)}>
              <Icon name="phone" size={16} />
              WhatsApp
            </button>
          </>
        )}
      </PageHeader>

      <div className="grid" style={{ gridTemplateColumns: '280px 1fr', alignItems: 'start', gap: 18 }}>
        {/* Left: filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Quick segments */}
          <div className="card">
            <div className="card-head" style={{ paddingBottom: 12 }}>
              <Icon name="segment" size={17} style={{ color: 'var(--primary-700)' }} />
              <div className="card-title" style={{ flex: 1 }}>
                Segmentos rápidos
              </div>
            </div>
            <div style={{ padding: '0 8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SEGMENTOS_RAPIDOS.map((sg) => {
                const cnt = enriched.filter(sg.fn).length
                const active = segRapido === sg.id
                return (
                  <button
                    key={sg.id}
                    onClick={() => {
                      setSegRapido(active ? null : sg.id)
                      setSelected(new Set())
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 11, border: '1px solid ' + (active ? sg.color : 'transparent'), background: active ? 'var(--primary-tint)' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: '.13s', fontFamily: 'inherit' }}
                  >
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: active ? sg.color : sg.color + '22', color: active ? '#fff' : sg.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Icon name={sg.icon} size={15} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: active ? 'var(--primary-700)' : 'var(--ink)' }}>{sg.label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>{sg.desc}</div>
                    </div>
                    <span className="tnum" style={{ fontWeight: 800, fontSize: 13, color: active ? 'var(--primary-700)' : 'var(--ink-3)', background: 'var(--surface-3)', padding: '2px 7px', borderRadius: 20 }}>
                      {cnt}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom filters */}
          <div className="card">
            <div className="card-head" style={{ paddingBottom: 12 }}>
              <Icon name="sliders" size={17} style={{ color: 'var(--primary-700)' }} />
              <div className="card-title" style={{ flex: 1 }}>
                Filtros personalizados
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px 9px', fontSize: 12 }} onClick={clearFiltros}>
                Limpiar
              </button>
            </div>
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="field">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Buscar nombre</span>
                <input className="input" style={{ fontSize: 13.5 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej: María..." />
              </label>
              <label className="field">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Ciudad</span>
                <select className="select" style={{ fontSize: 13.5 }} value={ciudad} onChange={(e) => setCiudad(e.target.value)}>
                  {cities.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Compras mínimas</span>
                <input className="input tnum" style={{ fontSize: 13.5 }} type="number" min="0" value={minCompras} onChange={(e) => setMinCompras(e.target.value)} placeholder="Ej: 3" />
              </label>
              <label className="field">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Total gastado mínimo</span>
                <div className="input-pre">
                  <span className="pre">$</span>
                  <input className="tnum" type="number" value={minGasto} onChange={(e) => setMinGasto(e.target.value)} placeholder="0" style={{ fontSize: 13.5, padding: '11px 13px 11px 4px' }} />
                </div>
              </label>
              <label className="field">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Próxima compra en (días)</span>
                <span className="hint">Filtra clientes que comprarán en los próximos N días</span>
                <input className="input tnum" style={{ fontSize: 13.5 }} type="number" min="0" value={proxDias} onChange={(e) => setProxDias(e.target.value)} placeholder="Ej: 7" />
              </label>
            </div>
          </div>

          {/* Message template */}
          <div className="card">
            <div className="card-head" style={{ paddingBottom: 12 }}>
              <Icon name="send" size={17} style={{ color: 'var(--primary-700)' }} />
              <div className="card-title" style={{ flex: 1 }}>
                Mensaje
              </div>
              <button className="btn btn-soft" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => setShowTemplates(true)}>
                <Icon name="zap" size={13} />
                Plantillas
              </button>
            </div>
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea className="input" rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} style={{ resize: 'vertical', fontSize: 13.5, lineHeight: 1.5 }} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['{{nombre}}', '{{ciudad}}', '{{negocio}}'].map((v) => (
                  <button key={v} className="chip chip-neutral" style={{ cursor: 'pointer', fontSize: 12 }} onClick={() => setMsg((m) => m + v)}>
                    {v}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>Las variables se reemplazan automáticamente por los datos de cada cliente al enviar.</div>
            </div>
          </div>
        </div>

        {/* Right: client list */}
        <div>
          <div className="card">
            <div className="card-head">
              <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ width: 17, height: 17, cursor: 'pointer', accentColor: 'var(--primary)' }} />
              <div style={{ flex: 1 }}>
                <div className="card-title">{filtered.length} clientes en este segmento</div>
                <div className="card-sub">{selected.size > 0 ? `${selected.size} seleccionados` : 'Selecciona clientes para comunicarte'}</div>
              </div>
              {selected.size > 0 && (
                <>
                  <button className="btn btn-ghost" style={{ fontSize: 13, padding: '7px 12px' }} onClick={() => setShowEmail(true)}>
                    <Icon name="mail" size={15} />
                    Correo
                  </button>
                  <button className="btn btn-primary" style={{ fontSize: 13, padding: '7px 12px' }} onClick={() => setShowWA(true)}>
                    <Icon name="phone" size={15} />
                    WhatsApp
                  </button>
                </>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}></th>
                    <th>Cliente</th>
                    <th>Ciudad</th>
                    <th>Categoría</th>
                    <th className="num">Compras</th>
                    <th className="num">Total gastado</th>
                    <th className="num">Última compra</th>
                    <th>Próxima compra</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState icon="users" title="Sin resultados" text="Ajusta los filtros para encontrar clientes." />
                      </td>
                    </tr>
                  )}
                  {filtered.map((c) => {
                    const sel = selected.has(c.id)
                    const late = c.daysUntilNext != null && c.daysUntilNext < 0
                    const soon = c.daysUntilNext != null && c.daysUntilNext >= 0 && c.daysUntilNext <= 3
                    return (
                      <tr
                        key={c.id}
                        onClick={() => toggle(c.id)}
                        style={{ cursor: 'pointer', background: sel ? 'var(--primary-tint)' : '' }}
                        onMouseEnter={(e) => {
                          if (!sel) e.currentTarget.style.background = 'var(--surface-3)'
                        }}
                        onMouseLeave={(e) => {
                          if (!sel) e.currentTarget.style.background = ''
                        }}
                      >
                        <td>
                          <input type="checkbox" checked={sel} onChange={() => toggle(c.id)} onClick={(e) => e.stopPropagation()} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }} />
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{c.nombre}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{c.telefono}</div>
                        </td>
                        <td style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{c.ciudad}</td>
                        <td>
                          <ClienteChip cat={c.categoria} />
                        </td>
                        <td className="num tnum" style={{ fontWeight: 700 }}>
                          {c.compras.length}
                        </td>
                        <td className="num tnum" style={{ fontWeight: 800 }}>
                          {fmtCLP(c.totalGastado)}
                        </td>
                        <td className="num" style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>
                          {c.daysSinceLast != null ? `Hace ${c.daysSinceLast}d` : '—'}
                        </td>
                        <td style={{ fontWeight: 700, fontSize: 13, color: late ? 'var(--danger)' : soon ? 'oklch(0.50 0.10 70)' : 'var(--ink-2)' }}>
                          {c.nextExpected ? (
                            <>
                              {late && <Icon name="alert" size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />}
                              {c.nextExpected.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                              {c.daysUntilNext != null && c.daysUntilNext >= 0 ? <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 5 }}>en {c.daysUntilNext}d</span> : null}
                            </>
                          ) : (
                            <span style={{ color: 'var(--ink-3)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick stat bar */}
          {filtered.length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Ticket medio del segmento', val: fmtCLP(filtered.reduce((a, c) => a + c.ticketMedio, 0) / filtered.length) },
                { label: 'Total gastado (segmento)', val: fmtCLP(filtered.reduce((a, c) => a + c.totalGastado, 0)) },
                { label: 'Con WhatsApp', val: filtered.filter((c) => c.telefono).length + '/' + filtered.length },
                { label: 'Con correo', val: filtered.filter((c) => c.correo).length + '/' + filtered.length },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, minWidth: 140, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 14px' }}>
                  <div className="tnum" style={{ fontWeight: 800, fontSize: 17 }}>
                    {s.val}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showWA && <WAModal clientes={selClientes} msg={msg} negocio={settings.business} onClose={() => setShowWA(false)} />}
      {showEmail && <EmailModal clientes={selClientes} msg={msg} negocio={settings.business} onClose={() => setShowEmail(false)} />}
      {showTemplates && (
        <Modal title="Plantillas de mensaje" sub="Elige una plantilla y personaliza antes de enviar" onClose={() => setShowTemplates(false)} width={500} footer={<button className="btn btn-ghost" onClick={() => setShowTemplates(false)}>Cerrar</button>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {WA_TEMPLATES.map((t, i) => (
              <button
                key={i}
                onClick={() => {
                  setMsg(t.text)
                  setShowTemplates(false)
                }}
                style={{ textAlign: 'left', padding: '13px 16px', background: 'var(--surface-3)', borderRadius: 12, border: '1px solid var(--line)', cursor: 'pointer', fontFamily: 'inherit', transition: '.13s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)'
                  e.currentTarget.style.background = 'var(--primary-tint)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line)'
                  e.currentTarget.style.background = 'var(--surface-3)'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 5, color: 'var(--ink)' }}>{t.label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, lineHeight: 1.45 }}>
                  {t.text.slice(0, 120)}
                  {t.text.length > 120 ? '…' : ''}
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
