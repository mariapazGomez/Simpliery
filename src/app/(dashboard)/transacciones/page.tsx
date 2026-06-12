'use client'

// ---------- Transacciones: historial de ventas con detalle completo ----------
import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store'
import { useGo } from '@/lib/nav'
import { fmtCLP } from '@/lib/format'
import { Icon } from '@/components/icon'
import { PageHeader, Metric, Modal, EmptyState, SearchBox, CatDot, Field } from '@/components/ui'
import type { Sale, ClienteRef } from '@/types'

type Filtro = 'todas' | 'local' | 'despacho' | 'credito'

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'local', label: 'Mostrador' },
  { id: 'despacho', label: 'Despachos' },
  { id: 'credito', label: 'A crédito' },
]

function fechaHora(d: Date) {
  return {
    fecha: d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' }),
    hora: d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
  }
}

export default function TransaccionesPage() {
  const { sales } = useStore()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [q, setQ] = useState('')
  const [detalle, setDetalle] = useState<Sale | null>(null)
  const [editar, setEditar] = useState<Sale | null>(null)

  const ordenadas = useMemo(() => [...sales].sort((a, b) => b.date.getTime() - a.date.getTime()), [sales])

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase()
    return ordenadas.filter((s) => {
      if (filtro === 'local' && (s.tipo || 'local') !== 'local') return false
      if (filtro === 'despacho' && s.tipo !== 'despacho') return false
      if (filtro === 'credito' && !s.credito) return false
      if (!term) return true
      const enCliente = (s.cliente?.nombre || '').toLowerCase().includes(term)
      const enBoleta = String(s.boleta).includes(term)
      const enProducto = s.items.some((it) => it.name.toLowerCase().includes(term))
      return enCliente || enBoleta || enProducto
    })
  }, [ordenadas, filtro, q])

  const m = useMemo(() => {
    const monto = filtradas.reduce((a, s) => a + s.total, 0)
    const credito = filtradas.filter((s) => s.credito && !s.pagado)
    return {
      count: filtradas.length,
      monto,
      ticket: filtradas.length ? monto / filtradas.length : 0,
      pendiente: credito.reduce((a, s) => a + (s.montoPendiente || s.total), 0),
      pendienteN: credito.length,
    }
  }, [filtradas])

  return (
    <div className="fade-in">
      <PageHeader title="Transacciones" sub="Historial de ventas. Haz clic en una para ver el detalle completo.">
        <div className="chip chip-neutral tnum" style={{ fontSize: 13 }}>
          <Icon name="receipt" size={13} />
          {m.count} transaccion{m.count === 1 ? '' : 'es'}
        </div>
      </PageHeader>

      {/* Métricas */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 18 }}>
        <Metric icon="receipt" label="Transacciones" value={m.count} tone="primary" />
        <Metric icon="cash" label="Monto total" value={fmtCLP(m.monto)} tone="info" />
        <Metric icon="reportes" label="Ticket promedio" value={fmtCLP(Math.round(m.ticket))} tone="terra" />
        <Metric icon="alert" label="Por cobrar (fiado)" value={fmtCLP(m.pendiente)} sub={m.pendienteN > 0 ? `${m.pendienteN} a crédito` : 'Todo cobrado'} tone={m.pendiente > 0 ? 'warn' : 'primary'} />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={'btn ' + (filtro === f.id ? 'btn-primary' : 'btn-ghost')}
              style={{ fontSize: 13, padding: '7px 14px' }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <SearchBox value={q} onChange={setQ} placeholder="Buscar boleta, cliente o producto…" width={260} />
        </div>
      </div>

      {/* Lista */}
      <div className="card">
        {filtradas.length === 0 ? (
          <EmptyState icon="receipt" title="Sin transacciones" text="No hay ventas que coincidan con el filtro o la búsqueda." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Encabezado (solo desktop) */}
            <div className="tx-head" style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px 130px 40px', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <div>Boleta</div>
              <div>Cliente / Detalle</div>
              <div>Fecha</div>
              <div style={{ textAlign: 'right' }}>Total</div>
              <div />
            </div>
            {filtradas.map((s) => {
              const { fecha, hora } = fechaHora(s.date)
              const nProd = s.items.reduce((a, it) => a + it.qty, 0)
              const cliente = s.cliente?.nombre || 'Venta de mostrador'
              return (
                <button
                  key={s.id}
                  onClick={() => setDetalle(s)}
                  className="tx-row"
                  style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px 130px 40px', gap: 12, alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--line)', background: 'none', border: 'none', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'var(--line)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                >
                  <div className="tnum" style={{ fontWeight: 800, fontSize: 13.5 }}>N° {s.boleta}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cliente}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                      <span>{nProd} producto{nProd === 1 ? '' : 's'}</span>
                      <span>·</span>
                      <span className={'chip ' + (s.tipo === 'despacho' ? 'chip-neutral' : 'chip-neutral')} style={{ padding: '1px 8px', fontSize: 11 }}>
                        <Icon name={s.tipo === 'despacho' ? 'truck' : 'store'} size={11} />{s.tipo === 'despacho' ? 'Despacho' : 'Mostrador'}
                      </span>
                      {s.credito ? (
                        <span className={'chip ' + (s.pagado ? 'chip-ok' : 'chip-danger')} style={{ padding: '1px 8px', fontSize: 11 }}>{s.pagado ? 'Crédito pagado' : 'Fiado pendiente'}</span>
                      ) : (
                        <span className="chip chip-neutral" style={{ padding: '1px 8px', fontSize: 11 }}>{s.method}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600 }}>
                    <div>{fecha}</div>
                    <div style={{ color: 'var(--ink-3)', fontSize: 11.5 }}>{hora}</div>
                  </div>
                  <div className="tnum" style={{ textAlign: 'right', fontWeight: 800, fontSize: 15 }}>{fmtCLP(s.total)}</div>
                  <div style={{ display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}><Icon name="chevR" size={16} /></div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {detalle && <DetalleModal venta={detalle} onClose={() => setDetalle(null)} onEditar={(v) => { setDetalle(null); setEditar(v) }} />}
      {editar && <EditarModal venta={editar} onClose={() => setEditar(null)} />}

      <style>{'@media(max-width:640px){.tx-head{display:none!important}.tx-row{grid-template-columns:1fr auto!important}.tx-row>:nth-child(3){display:none}.tx-row>:nth-child(5){display:none}}'}</style>
    </div>
  )
}

/* ---------- Detalle de una transacción ---------- */
function DetalleModal({ venta, onClose, onEditar }: { venta: Sale; onClose: () => void; onEditar: (v: Sale) => void }) {
  const { deleteSale } = useStore()
  const go = useGo()
  const { fecha, hora } = fechaHora(venta.date)
  const cl = venta.cliente
  const totalPagado = (venta.pagos || []).reduce((a, p) => a + p.monto, 0)

  const eliminar = () => {
    if (window.confirm(`¿Eliminar la transacción N° ${venta.boleta}? Se repondrá el stock de los productos vendidos. Esta acción no se puede deshacer.`)) {
      deleteSale(venta.id)
      onClose()
    }
  }

  return (
    <Modal
      title={`Boleta N° ${venta.boleta}`}
      sub={`${fecha} · ${hora}`}
      onClose={onClose}
      width={580}
      footer={
        <>
          {cl && (
            <button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={() => { go(`/clientes?cliente=${encodeURIComponent(cl.nombre)}`); onClose() }}>
              <Icon name="clientes" size={16} />Ver cliente
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => onEditar(venta)}>
            <Icon name="edit" size={16} />Editar
          </button>
          <button className="btn" style={{ background: 'var(--danger)', color: '#fff' }} onClick={eliminar}>
            <Icon name="trash" size={16} />Eliminar
          </button>
        </>
      }
    >
      {/* Resumen superior */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <span className="chip chip-neutral" style={{ fontSize: 12.5 }}>
          <Icon name={venta.tipo === 'despacho' ? 'truck' : 'store'} size={13} />
          {venta.tipo === 'despacho' ? 'Despacho' : 'Mostrador'}
        </span>
        <span className="chip chip-neutral" style={{ fontSize: 12.5 }}>
          <Icon name={venta.method === 'Tarjeta' ? 'card' : venta.method === 'Crédito' ? 'receipt' : 'cash'} size={13} />
          {venta.method}
        </span>
        {venta.credito && (
          <span className={'chip ' + (venta.pagado ? 'chip-ok' : 'chip-danger')} style={{ fontSize: 12.5 }}>
            {venta.pagado ? 'Pagado' : `Pendiente ${fmtCLP(venta.montoPendiente || venta.total)}`}
          </span>
        )}
      </div>

      {/* Cliente */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Cliente</div>
        {cl ? (
          <div className="card" style={{ padding: '12px 14px', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{cl.nombre}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>
              {(cl.telefono || cl.numero) && <span><Icon name="bell" size={12} /> {cl.telefono || cl.numero}</span>}
              {cl.ciudad && <span><Icon name="store" size={12} /> {cl.ciudad}</span>}
              {cl.correo && <span>{cl.correo}</span>}
            </div>
            {cl.direccion && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{cl.direccion}</div>}
          </div>
        ) : (
          <div style={{ fontSize: 13.5, color: 'var(--ink-3)', fontWeight: 600 }}>Venta de mostrador (sin cliente registrado).</div>
        )}
      </div>

      {/* Productos */}
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Productos</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 11, overflow: 'hidden', border: '1px solid var(--line)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 54px 90px 100px', gap: 8, padding: '8px 12px', background: 'var(--surface-3)', fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase' }}>
          <div>Producto</div>
          <div style={{ textAlign: 'center' }}>Cant.</div>
          <div style={{ textAlign: 'right' }}>Precio</div>
          <div style={{ textAlign: 'right' }}>Subtotal</div>
        </div>
        {venta.items.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 54px 90px 100px', gap: 8, padding: '10px 12px', alignItems: 'center', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <CatDot cat={it.cat} />
              <span style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</span>
            </div>
            <div className="tnum" style={{ textAlign: 'center', fontWeight: 700, fontSize: 13.5 }}>{it.qty}</div>
            <div className="tnum" style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink-2)' }}>{fmtCLP(it.price)}</div>
            <div className="tnum" style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5 }}>{fmtCLP(it.price * it.qty)}</div>
          </div>
        ))}
      </div>

      {/* Totales */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <Linea label="Total venta" value={fmtCLP(venta.total)} bold />
        <Linea label="Ganancia estimada" value={fmtCLP(venta.profit)} tone="primary" />
        {venta.credito && (
          <>
            <Linea label="Abonado" value={fmtCLP(totalPagado)} />
            <Linea label="Saldo pendiente" value={fmtCLP(venta.montoPendiente || (venta.total - totalPagado))} tone={venta.pagado ? 'primary' : 'danger'} />
          </>
        )}
      </div>

      {/* Historial de pagos del fiado */}
      {venta.credito && (venta.pagos?.length || 0) > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Abonos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {venta.pagos.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
                <span>{new Date(p.fecha).toLocaleDateString('es-CL')}{p.metodo ? ` · ${p.metodo}` : ''}</span>
                <span className="tnum" style={{ fontWeight: 700 }}>{fmtCLP(p.monto)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ---------- Editar una transacción (datos seguros, sin tocar stock) ---------- */
function EditarModal({ venta, onClose }: { venta: Sale; onClose: () => void }) {
  const { updateSale, settings } = useStore()
  const cl = venta.cliente
  const [tipo, setTipo] = useState<'local' | 'despacho'>(venta.tipo || 'local')
  const [method, setMethod] = useState(venta.method)
  const [conCliente, setConCliente] = useState(!!cl)
  const [nombre, setNombre] = useState(cl?.nombre || '')
  const [telefono, setTelefono] = useState(cl?.telefono || cl?.numero || '')
  const [ciudad, setCiudad] = useState(cl?.ciudad || '')
  const [direccion, setDireccion] = useState(cl?.direccion || '')
  const [correo, setCorreo] = useState(cl?.correo || '')

  const metodos = [...new Set([...settings.methods, venta.method])]

  const guardar = () => {
    const cliente: ClienteRef | null =
      conCliente && nombre.trim()
        ? {
            id: cl?.id,
            nombre: nombre.trim(),
            telefono: telefono.trim() || undefined,
            numero: telefono.trim() || undefined,
            ciudad: ciudad.trim() || undefined,
            direccion: direccion.trim() || undefined,
            correo: correo.trim() || undefined,
            depto: cl?.depto,
          }
        : null
    // Cambiar el método mantiene coherente el estado de crédito: convertida a
    // contado deja de ser deuda; convertida a Crédito debe lo aún no abonado.
    // Si el método cambió, el pago dividido anterior ya no aplica.
    const esCredito = method === 'Crédito'
    const totalPagado = (venta.pagos || []).reduce((a, p) => a + p.monto, 0)
    updateSale(venta.id, {
      tipo,
      method,
      cliente,
      credito: esCredito,
      pagado: esCredito ? totalPagado >= venta.total : true,
      montoPendiente: esCredito ? Math.max(0, venta.total - totalPagado) : 0,
      ...(method !== venta.method ? { pagoMixto: null } : {}),
    })
    onClose()
  }

  return (
    <Modal
      title={`Editar boleta N° ${venta.boleta}`}
      sub="Corrige el tipo, el pago y los datos del cliente de esta venta."
      onClose={onClose}
      width={520}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={guardar}><Icon name="check" size={16} />Guardar</button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Tipo de venta">
            <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value as 'local' | 'despacho')}>
              <option value="local">Mostrador</option>
              <option value="despacho">Despacho</option>
            </select>
          </Field>
          <Field label="Método de pago">
            <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
              {metodos.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
            </select>
          </Field>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: 'var(--ink-2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={conCliente} onChange={(e) => setConCliente(e.target.checked)} />
          Asociar datos de cliente a esta venta
        </label>

        {conCliente && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Nombre"><input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del cliente" /></Field>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Teléfono"><input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></Field>
              <Field label="Ciudad"><input className="input" value={ciudad} onChange={(e) => setCiudad(e.target.value)} /></Field>
            </div>
            <Field label="Dirección" hint="Útil para despachos."><input className="input" value={direccion} onChange={(e) => setDireccion(e.target.value)} /></Field>
            <Field label="Correo"><input className="input" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} /></Field>
          </div>
        )}

        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, lineHeight: 1.5 }}>
          <Icon name="alert" size={13} /> Esto edita los datos de <strong>esta venta</strong>. Para cambiar la ficha permanente del cliente (su dirección en todas sus compras), usa <strong>&ldquo;Ver cliente&rdquo;</strong> → Clientes.
        </div>
      </div>
    </Modal>
  )
}

function Linea({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: 'primary' | 'danger' }) {
  const color = tone === 'primary' ? 'var(--primary-700)' : tone === 'danger' ? 'var(--danger)' : 'var(--ink)'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: bold ? 15 : 13.5, fontWeight: bold ? 800 : 600, color: bold ? 'var(--ink)' : 'var(--ink-2)' }}>{label}</span>
      <span className="tnum" style={{ fontSize: bold ? 18 : 14, fontWeight: 800, color }}>{value}</span>
    </div>
  )
}
