'use client'

// ---------- Despachos: pedidos persistentes + integración OptiRoute ----------
import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { useFinanzas } from '@/lib/finanzas-store'
import { fmtCLP } from '@/lib/format'
import { Icon } from '@/components/icon'
import { PageHeader, Metric, Modal, EmptyState, Mini } from '@/components/ui'
import { DISPATCH_STATUSES, DISPATCH_STATUS_COLOR } from '@/types'
import type { Despacho, EstadoDespacho } from '@/types'
import { despachoToPedido, optirouteStatusToEstado } from '@/lib/optiroute'
import type { EnvioResultado } from '@/lib/optiroute'

type Estado = EstadoDespacho
/** Despacho + callback de UI usado en la vista del repartidor. */
type Pedido = Despacho & { _onEntregado?: (id: string) => void }

const ESTADO_CFG: Record<Estado, { label: string; bg: string; fg: string; icon: string }> = Object.fromEntries(
  DISPATCH_STATUSES.map((s) => [s.value, { label: s.label, icon: s.icon, ...DISPATCH_STATUS_COLOR[s.value] }]),
) as Record<Estado, { label: string; bg: string; fg: string; icon: string }>

function EstadoChip({ estado, size = 'sm' }: { estado: Estado; size?: 'sm' | 'lg' }) {
  const c = ESTADO_CFG[estado] || ESTADO_CFG.pendiente
  return (
    <span className="chip" style={{ background: c.bg, color: c.fg, padding: size === 'lg' ? '5px 13px' : '3px 10px', fontSize: size === 'lg' ? 14 : 12.5 }}>
      <Icon name={c.icon} size={size === 'lg' ? 15 : 12} />
      {c.label}
    </span>
  )
}

/* ── Detalle pedido modal ─────────────────────────────── */
function PedidoModal({ pedido, onClose, onUpdate, onEnviar, onActualizar }: { pedido: Pedido; onClose: () => void; onUpdate: (id: string, patch: Partial<Despacho>) => void; onEnviar: (d: Pedido) => void; onActualizar: (d: Pedido) => void }) {
  const { despachos } = useStore()
  const { nomina } = useFinanzas()
  const [estado, setEstado] = useState<Estado>(pedido.estado)
  const [obs, setObs] = useState(pedido.nota || '')
  const [rep, setRep] = useState(pedido.repartidor)
  // Repartidores REALES: tu nómina + los ya usados en otros despachos (escribe uno nuevo si quieres).
  const repartidores = [...new Set(['Sin asignar', ...nomina.map((n) => n.nombre), ...despachos.map((d) => d.repartidor)])].filter(Boolean)
  const dirCompleta = pedido.direccion + (pedido.depto ? ', ' + pedido.depto : '') + (pedido.ciudad ? ', ' + pedido.ciudad : '')
  const waUrl = `https://wa.me/${(pedido.telefono || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${pedido.cliente.split(' ')[0]}, te escribimos para coordinar tu entrega.${pedido.trackingUrl ? ' Puedes seguir tu pedido aquí: ' + pedido.trackingUrl : ''}`)}`
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(dirCompleta)}`
  return (
    <Modal
      title={'Pedido #' + pedido.boleta}
      sub={pedido.cliente + (pedido.ciudad ? ' · ' + pedido.ciudad : '')}
      onClose={onClose}
      width={560}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={() => { onUpdate(pedido.id, { estado, nota: obs, repartidor: rep.trim() || 'Sin asignar' }); onClose() }}>
            <Icon name="check" size={15} />
            Guardar cambios
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Mini label="Total" value={fmtCLP(pedido.total)} />
          <Mini label="Método" value={pedido.method} />
        </div>

        {/* OptiRoute */}
        <div style={{ padding: '12px 14px', background: 'var(--surface-3)', borderRadius: 11 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 8 }}>OptiRoute</div>
          {pedido.optirouteId ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="chip chip-ok" style={{ fontSize: 12 }}><Icon name="check" size={12} />Enviado a OptiRoute</span>
              {pedido.trackingUrl && (
                <a href={pedido.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <button className="btn btn-ghost" style={{ fontSize: 13 }}><Icon name="truck" size={15} />Ver seguimiento</button>
                </a>
              )}
              <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => { onActualizar(pedido); onClose() }}><Icon name="history" size={15} />Actualizar estado</button>
            </div>
          ) : (
            <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => { onEnviar(pedido); onClose() }}><Icon name="truck" size={15} />Enviar a OptiRoute</button>
          )}
        </div>

        {/* Estado */}
        <label className="field">
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>Estado del pedido</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {(Object.entries(ESTADO_CFG) as [Estado, (typeof ESTADO_CFG)[Estado]][]).map(([k, c]) => (
              <button key={k} onClick={() => setEstado(k)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 11, border: `2px solid ${estado === k ? c.fg : 'var(--line)'}`, background: estado === k ? c.bg : 'var(--surface)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, color: estado === k ? c.fg : 'var(--ink-2)', transition: '.12s' }}>
                <Icon name={c.icon} size={16} />
                {c.label}
              </button>
            ))}
          </div>
        </label>
        {/* Repartidor */}
        <label className="field">
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>Repartidor</span>
          <input className="input" list="repartidores-sugeridos" value={rep} onChange={(e) => setRep(e.target.value)} placeholder="Escribe un nombre o elige uno" />
          <datalist id="repartidores-sugeridos">
            {repartidores.map((r) => (<option key={r} value={r} />))}
          </datalist>
        </label>
        {/* Dirección */}
        <div style={{ padding: '12px 14px', background: 'var(--surface-3)', borderRadius: 11 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 4 }}>Dirección de entrega</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{dirCompleta || 'Sin dirección'}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button className="btn btn-ghost" style={{ fontSize: 13 }}><Icon name="truck" size={15} />Abrir en Maps</button>
            </a>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button className="btn btn-soft" style={{ fontSize: 13 }}><Icon name="phone" size={15} />WhatsApp</button>
            </a>
          </div>
        </div>
        {/* Productos */}
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 7 }}>Productos del pedido</div>
          {pedido.items.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--line)', fontSize: 14 }}>
              <span style={{ fontWeight: 600 }}>{it.name} <span className="tnum" style={{ color: 'var(--ink-3)' }}>×{it.qty}</span></span>
              <span className="tnum" style={{ fontWeight: 800 }}>{fmtCLP(it.price * it.qty)}</span>
            </div>
          ))}
        </div>
        {/* Observación */}
        <label className="field">
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>Observación del repartidor</span>
          <textarea className="input" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ej: cliente no estaba, dejar en conserjería…" style={{ resize: 'vertical' }} />
        </label>
      </div>
    </Modal>
  )
}

/* ── Ruta del día view — drag-to-reorder + maps embed ── */
function VistaRuta({ pedidos, onBack }: { pedidos: Pedido[]; onBack: () => void }) {
  const initList = pedidos.filter((p) => p.estado === 'pendiente' || p.estado === 'en_ruta')
  const [orden, setOrden] = useState<Pedido[]>(initList)
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  const dragIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  useEffect(() => {
    const newPend = pedidos.filter((p) => p.estado === 'pendiente' || p.estado === 'en_ruta')
    setOrden((prev) => {
      const ids = new Set(newPend.map((p) => p.id))
      const kept = prev.filter((p) => ids.has(p.id))
      const added = newPend.filter((p) => !prev.find((x) => x.id === p.id))
      return [...kept, ...added]
    })
  }, [pedidos])

  const handleDragStart = (i: number) => { dragIdx.current = i }
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); dragOverIdx.current = i }
  const handleDrop = () => {
    if (dragIdx.current === null || dragOverIdx.current === null || dragIdx.current === dragOverIdx.current) return
    setOrden((list) => {
      const arr = [...list]
      const [moved] = arr.splice(dragIdx.current!, 1)
      arr.splice(dragOverIdx.current!, 0, moved)
      dragIdx.current = null
      dragOverIdx.current = null
      return arr
    })
  }
  const toggleMap = (id: string) => setExpandedMap((m) => ({ ...m, [id]: !m[id] }))
  const dirDe = (p: Pedido) => p.direccion + (p.depto ? ', ' + p.depto : '') + (p.ciudad ? ', ' + p.ciudad : '')

  return (
    <div className="fade-in">
      <PageHeader title="Vista del repartidor" sub={`${orden.length} entregas · arrástralas para reordenar la ruta`}>
        <button className="btn btn-ghost" onClick={onBack}>
          <Icon name="chevR" size={16} style={{ transform: 'rotate(180deg)' }} />
          Volver
        </button>
      </PageHeader>

      {orden.length === 0 ? (
        <div className="card">
          <EmptyState icon="check" title="¡Todas las entregas completadas!" text="No quedan pedidos pendientes para hoy." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'var(--primary-tint)', borderRadius: 11, fontSize: 13, fontWeight: 600, color: 'var(--primary-700)' }}>
            <Icon name="filter" size={14} />
            Arrastra las tarjetas para cambiar el orden de entrega
          </div>

          {orden.map((p, i) => {
            const dir = dirDe(p)
            const waUrl = `https://wa.me/${(p.telefono || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${p.cliente.split(' ')[0]}, voy en camino con tu pedido.`)}`
            const mapsOpenUrl = `https://maps.google.com/?q=${encodeURIComponent(dir)}`
            const mapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(dir)}&output=embed&iwloc=near&z=15`
            const mapOpen = expandedMap[p.id]

            return (
              <div key={p.id} draggable onDragStart={() => handleDragStart(i)} onDragOver={(e) => handleDragOver(e, i)} onDrop={handleDrop} className="card" style={{ border: '1px solid var(--line)', cursor: 'grab', transition: 'box-shadow .15s', boxShadow: dragOverIdx.current === i ? '0 0 0 2px var(--primary), var(--sh-2)' : 'var(--sh-1)' }}>
                <div style={{ padding: '15px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, padding: '6px 4px', color: 'var(--ink-3)', cursor: 'grab', flexShrink: 0 }}>
                    {[0, 1, 2].map((k) => (
                      <div key={k} style={{ display: 'flex', gap: 3 }}>{[0, 1].map((j) => (<div key={j} style={{ width: 4, height: 4, borderRadius: 2, background: 'var(--line-2)' }}></div>))}</div>
                    ))}
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15.5 }}>{p.cliente}</div>
                    <div style={{ color: 'var(--ink-2)', fontWeight: 600, marginTop: 1, fontSize: 13.5 }}>{dir}</div>
                    {p.nota && (
                      <div style={{ fontSize: 12.5, color: 'oklch(0.50 0.10 70)', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Icon name="alert" size={13} />
                        Nota: {p.nota}
                      </div>
                    )}
                    <div className="tnum" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginTop: 3 }}>{p.items.length} productos · {fmtCLP(p.total)} · {p.method}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <EstadoChip estado={p.estado} />
                    <button onClick={() => toggleMap(p.id)} className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12, gap: 5 }}>
                      <Icon name="truck" size={13} />
                      {mapOpen ? 'Ocultar mapa' : 'Ver mapa'}
                    </button>
                  </div>
                </div>

                {mapOpen && (
                  <div style={{ padding: '0 18px 14px' }}>
                    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', position: 'relative' }}>
                      <iframe src={mapsEmbedUrl} width="100%" height="220" style={{ border: 'none', display: 'block' }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={`Mapa ${dir}`} />
                      <a href={mapsOpenUrl} target="_blank" rel="noopener noreferrer" style={{ position: 'absolute', bottom: 10, right: 10, background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 9, padding: '6px 12px', fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink)', textDecoration: 'none', boxShadow: 'var(--sh-2)' }}>
                        <Icon name="truck" size={13} />
                        Abrir Google Maps
                      </a>
                    </div>
                  </div>
                )}

                <div style={{ padding: '10px 18px 14px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a href={mapsOpenUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', flex: 1 }}>
                    <button className="btn btn-ghost" style={{ width: '100%', fontSize: 13 }}><Icon name="truck" size={15} />Maps</button>
                  </a>
                  {p.trackingUrl && (
                    <a href={p.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', flex: 1 }}>
                      <button className="btn btn-ghost" style={{ width: '100%', fontSize: 13 }}><Icon name="truck" size={15} />Seguimiento</button>
                    </a>
                  )}
                  <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', flex: 1 }}>
                    <button className="btn btn-soft" style={{ width: '100%', fontSize: 13 }}><Icon name="phone" size={15} />WhatsApp</button>
                  </a>
                  <button className="btn btn-primary" style={{ flex: 2, fontSize: 13 }} onClick={() => p._onEntregado && p._onEntregado(p.id)}>
                    <Icon name="check" size={15} />
                    Marcar entregado
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Main Despachos screen ───────────────────────────── */
export default function DespachosPage() {
  const { despachos, updateDespacho, toast } = useStore()
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroCiudad, setFiltroCiudad] = useState('Todas')
  const [filtroEnvio, setFiltroEnvio] = useState('todos') // todos | enviados | no_enviados
  const [selected, setSelected] = useState<Pedido | null>(null)
  const [vistaRuta, setVistaRuta] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [enviando, setEnviando] = useState(false)

  const updatePedido = (id: string, patch: Partial<Despacho>) => updateDespacho(id, patch)

  const cities = ['Todas', ...[...new Set(despachos.map((p) => p.ciudad).filter(Boolean))].sort()]

  let list = despachos as Pedido[]
  if (filtroEstado !== 'todos') list = list.filter((p) => p.estado === filtroEstado)
  if (filtroCiudad !== 'Todas') list = list.filter((p) => p.ciudad === filtroCiudad)
  if (filtroEnvio === 'enviados') list = list.filter((p) => p.optirouteId)
  if (filtroEnvio === 'no_enviados') list = list.filter((p) => !p.optirouteId)

  const counts: Record<string, number> = {
    todos: despachos.length,
    pendiente: despachos.filter((p) => p.estado === 'pendiente').length,
    en_ruta: despachos.filter((p) => p.estado === 'en_ruta').length,
    entregado: despachos.filter((p) => p.estado === 'entregado').length,
    no_entregado: despachos.filter((p) => p.estado === 'no_entregado').length,
  }
  const noEnviados = despachos.filter((p) => !p.optirouteId).length

  const pedidosParaRuta: Pedido[] = despachos
    .filter((p) => p.estado === 'pendiente' || p.estado === 'en_ruta')
    .map((p) => ({ ...p, _onEntregado: (id: string) => { updateDespacho(id, { estado: 'entregado' }); toast('¡Entregado! ' + p.cliente) } }))

  /* ── Acciones OptiRoute ── */
  const enviarASeleccionados = async (ids: string[]) => {
    const aEnviar = despachos.filter((d) => ids.includes(d.id) && !d.optirouteId)
    if (!aEnviar.length) { toast('Esos despachos ya fueron enviados'); return }
    setEnviando(true)
    try {
      const res = await fetch('/api/optiroute/pedido', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pedidos: aEnviar.map(despachoToPedido) }) })
      if (res.status === 400) { const j = await res.json().catch(() => ({})); toast((j as { error?: string }).error || 'Conecta OptiRoute primero (configura el token)'); setEnviando(false); return }
      if (!res.ok) { toast('Error al enviar a OptiRoute'); setEnviando(false); return }
      const { results } = (await res.json()) as { results: EnvioResultado[] }
      const byRef = new Map(results.map((r) => [r.reference, r]))
      let ok = 0
      for (const d of aEnviar) {
        const r = byRef.get(d.saleId)
        if (r && !r.error) {
          updateDespacho(d.id, { optirouteId: r.optirouteId, trackingUrl: r.trackingUrl, trackingCode: r.trackingCode, optirouteStatus: r.status, enviadoEn: new Date(), estado: optirouteStatusToEstado(r.status) })
          ok++
        }
      }
      toast(ok ? `${ok} despacho(s) enviado(s) a OptiRoute` : 'No se pudo enviar a OptiRoute')
      setSel(new Set())
    } catch {
      toast('Error de conexión con OptiRoute')
    }
    setEnviando(false)
  }

  const actualizarEstados = async () => {
    const enviados = despachos.filter((d) => d.optirouteId)
    if (!enviados.length) { toast('No hay despachos enviados a OptiRoute'); return }
    setEnviando(true)
    let n = 0
    for (const d of enviados) {
      try {
        const res = await fetch(`/api/optiroute/pedido?id=${encodeURIComponent(d.optirouteId!)}`)
        if (res.status === 400) { toast('Conecta OptiRoute primero'); break }
        if (res.ok) {
          const j = (await res.json()) as { status?: number; trackingUrl?: string; trackingCode?: string }
          if (j.status != null) { updateDespacho(d.id, { optirouteStatus: j.status, estado: optirouteStatusToEstado(j.status), trackingUrl: j.trackingUrl ?? d.trackingUrl, trackingCode: j.trackingCode ?? d.trackingCode }); n++ }
        }
      } catch { /* ignorar fallo individual */ }
    }
    setEnviando(false)
    if (n) toast(`${n} estado(s) actualizado(s)`)
  }

  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const seleccionablesVisibles = list.filter((p) => !p.optirouteId).map((p) => p.id)
  const allVisibleSelected = seleccionablesVisibles.length > 0 && seleccionablesVisibles.every((id) => sel.has(id))
  const toggleAllVisible = () => setSel((s) => { const n = new Set(s); if (allVisibleSelected) seleccionablesVisibles.forEach((id) => n.delete(id)); else seleccionablesVisibles.forEach((id) => n.add(id)); return n })

  if (vistaRuta) return <VistaRuta pedidos={pedidosParaRuta} onBack={() => setVistaRuta(false)} />

  return (
    <div className="fade-in">
      <PageHeader title="Despachos" sub="Organiza tus entregas y envíalas a OptiRoute">
        <button className="btn btn-ghost" onClick={() => setVistaRuta(true)}>
          <Icon name="truck" size={16} />
          Vista repartidor
        </button>
        <button className="btn btn-primary" disabled={sel.size === 0 || enviando} onClick={() => enviarASeleccionados([...sel])}>
          <Icon name="truck" size={16} />
          {enviando ? 'Enviando…' : `Enviar a OptiRoute${sel.size ? ` (${sel.size})` : ''}`}
        </button>
      </PageHeader>

      {/* Metric cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', marginBottom: 18 }}>
        <Metric icon="receipt" label="Total despachos" value={counts.todos} tone="primary" sub={`${noEnviados} sin enviar`} />
        <Metric icon="clock" label="Pendientes" value={counts.pendiente} tone="warn" sub="Por salir a ruta" />
        <Metric icon="truck" label="En ruta" value={counts.en_ruta} tone="info" sub="En camino ahora" />
        <Metric icon="check" label="Entregados" value={counts.entregado} tone="primary" sub="Completados" />
        <Metric icon="x" label="No entregados" value={counts.no_entregado} tone="danger" sub="Requieren reintento" />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="seg">
          {([['todos', 'Todos'], ['pendiente', 'Pendientes'], ['en_ruta', 'En ruta'], ['entregado', 'Entregados'], ['no_entregado', 'Fallidos']] as [string, string][]).map(([k, l]) => (
            <button key={k} className={filtroEstado === k ? 'on' : ''} onClick={() => setFiltroEstado(k)}>
              {l}
              {counts[k] > 0 && k !== 'todos' ? <span style={{ marginLeft: 5, fontWeight: 800 }}>({counts[k]})</span> : null}
            </button>
          ))}
        </div>
        <select className="select" style={{ width: 'auto', fontSize: 13.5 }} value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)} title="Sector / comuna">
          {cities.map((c) => (<option key={c}>{c}</option>))}
        </select>
        <select className="select" style={{ width: 'auto', fontSize: 13.5 }} value={filtroEnvio} onChange={(e) => setFiltroEnvio(e.target.value)} title="Envío a OptiRoute">
          <option value="todos">Todos</option>
          <option value="no_enviados">Sin enviar</option>
          <option value="enviados">Enviados</option>
        </select>
        <div style={{ flex: 1 }} />
        {seleccionablesVisibles.length > 0 && (
          <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={toggleAllVisible}>
            <Icon name="check" size={15} />
            {allVisibleSelected ? 'Quitar selección' : `Seleccionar sin enviar (${seleccionablesVisibles.length})`}
          </button>
        )}
        <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={actualizarEstados} disabled={enviando}>
          <Icon name="history" size={15} />
          Actualizar estados
        </button>
      </div>

      {/* Sugerencia: marcar varios para envío en lote */}
      {seleccionablesVisibles.length > 0 && sel.size === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'var(--primary-tint)', borderRadius: 11, fontSize: 13, fontWeight: 600, color: 'var(--primary-700)', marginBottom: 12 }}>
          <Icon name="truck" size={14} />
          Marca con un check los pedidos que quieras enviar y mándalos todos juntos a OptiRoute.
        </div>
      )}

      {/* Tabla */}
      <div className="card">
        {list.length === 0 ? (
          <EmptyState icon="truck" title="Sin despachos" text="No hay pedidos que coincidan con los filtros. Los despachos se crean al registrar una venta con tipo 'Despacho'." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} title="Seleccionar visibles sin enviar" style={{ accentColor: 'var(--primary)', width: 18, height: 18, cursor: 'pointer' }} />
                  </th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Dirección</th>
                  <th>Sector</th>
                  <th>Repartidor</th>
                  <th className="num">Total</th>
                  <th>Estado</th>
                  <th>OptiRoute</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(p)} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')} onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                      {!p.optirouteId && <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggleSel(p.id)} title="Marcar para enviar a OptiRoute" style={{ accentColor: 'var(--primary)', width: 18, height: 18, cursor: 'pointer' }} />}
                    </td>
                    <td className="tnum" style={{ fontWeight: 700, color: 'var(--ink-2)' }}># {p.boleta}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.cliente}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{p.telefono}</div>
                    </td>
                    <td style={{ color: 'var(--ink-2)', fontWeight: 600, maxWidth: 200 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.direccion}{p.depto ? ', ' + p.depto : ''}</div>
                    </td>
                    <td style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{p.ciudad}</td>
                    <td style={{ fontWeight: 600, fontSize: 13.5, color: p.repartidor === 'Sin asignar' ? 'var(--ink-3)' : 'var(--ink)' }}>{p.repartidor}</td>
                    <td className="num tnum" style={{ fontWeight: 800 }}>{fmtCLP(p.total)}</td>
                    <td><EstadoChip estado={p.estado} /></td>
                    <td>
                      {p.optirouteId ? (
                        p.trackingUrl ? (
                          <a href={p.trackingUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: 'var(--primary-700)', fontWeight: 700, fontSize: 12.5, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icon name="truck" size={13} />Seguir
                          </a>
                        ) : (
                          <span className="chip chip-ok" style={{ fontSize: 11.5 }}>Enviado</span>
                        )
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Sin enviar</span>
                      )}
                    </td>
                    <td><Icon name="chevR" size={16} style={{ color: 'var(--ink-3)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Barra de envío en lote — aparece al seleccionar, queda fija abajo */}
      {sel.size > 0 && (
        <div style={{ position: 'sticky', bottom: 14, zIndex: 30, marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 14, boxShadow: 'var(--sh-3)' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--primary-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{sel.size}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14.5 }}>{sel.size} pedido{sel.size > 1 ? 's' : ''} seleccionado{sel.size > 1 ? 's' : ''}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>Listos para enviar a OptiRoute</div>
          </div>
          <button className="btn btn-ghost" onClick={() => setSel(new Set())}>Limpiar</button>
          <button className="btn btn-primary" disabled={enviando} onClick={() => enviarASeleccionados([...sel])}>
            <Icon name="truck" size={16} />
            {enviando ? 'Enviando…' : 'Enviar a OptiRoute'}
          </button>
        </div>
      )}

      {selected && <PedidoModal pedido={selected} onClose={() => setSelected(null)} onUpdate={updatePedido} onEnviar={(d) => enviarASeleccionados([d.id])} onActualizar={() => actualizarEstados()} />}
    </div>
  )
}
