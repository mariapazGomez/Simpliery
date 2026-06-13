'use client'

// ---------- Transacciones: historial de ventas con detalle completo ----------
import { useMemo, useState } from 'react'
import { useStore, unidadesBaseDeItems } from '@/lib/store'
import { useFormats } from '@/lib/formats-store'
import { useGo } from '@/lib/nav'
import { fmtCLP, precioDespachoDe, precioFormatoCanal, formatoEnCanal } from '@/lib/format'
import { Icon } from '@/components/icon'
import { PageHeader, Metric, Modal, EmptyState, SearchBox, CatDot, Field } from '@/components/ui'
import type { Sale, SaleItem, ClienteRef, Product, Format } from '@/types'

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
/* Línea de la boleta en edición + helpers para steppers/precio */
const esGranelItem = (i: SaleItem) => (i.formatId || '').startsWith('granel:')

/* Picker para agregar una línea a una boleta: producto y, si tiene, su variante/caja. */
function AgregarLineaProducto({ tipo, onAdd, onCancel, cabeBase }: {
  tipo: 'local' | 'despacho'
  onAdd: (it: SaleItem) => void
  onCancel: () => void
  cabeBase: (productId: number, deltaBase: number) => boolean
}) {
  const { products } = useStore()
  const { getFormats } = useFormats()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<number | null>(null)
  const lista = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
  const selProd = sel != null ? products.find((p) => p.id === sel) : null
  const fmtsDe = (p: Product) => getFormats(p.id).filter((f) => formatoEnCanal(f.canal, tipo))
  const precioLocalDespacho = (p: Product) => (tipo === 'despacho' ? precioDespachoDe(p.price, p.precioDespacho) : p.price)

  const addSimple = (p: Product) => {
    if (!cabeBase(p.id, 1)) return
    onAdd({ productId: p.id, name: p.name, cat: p.cat, qty: 1, price: precioLocalDespacho(p), cost: p.cost })
  }
  const addVariante = (p: Product, f: Format) => {
    if (!cabeBase(p.id, f.qty)) return
    onAdd({ productId: p.id, name: `${p.name} — ${f.name}`, cat: p.cat, qty: 1, price: precioFormatoCanal(f, tipo), cost: p.cost * f.qty, formatId: f.id, baseUnitsPerItem: f.qty })
  }

  return (
    <div style={{ padding: 12, background: 'var(--surface-3)', borderRadius: 11, border: '1px dashed var(--primary)', display: 'grid', gap: 10 }}>
      {!selProd ? (
        <>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" autoFocus />
          <div style={{ display: 'grid', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
            {lista.map((p) => {
              const tieneFmts = fmtsDe(p).length > 0
              const sinStock = p.stock <= 0 && !tieneFmts
              return (
                <button key={p.id} className="btn btn-ghost" style={{ justifyContent: 'space-between', fontSize: 13.5, opacity: sinStock ? 0.5 : 1 }} disabled={sinStock} onClick={() => (tieneFmts ? setSel(p.id) : addSimple(p))}>
                  <span style={{ fontWeight: 700 }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{tieneFmts ? 'elegir formato ›' : `${p.stock} u · ${fmtCLP(precioLocalDespacho(p))}`}</span>
                </button>
              )
            })}
            {lista.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, padding: 6 }}>Sin productos que coincidan.</div>}
          </div>
          <button className="btn btn-ghost" style={{ fontSize: 13, alignSelf: 'flex-start' }} onClick={onCancel}>Cancelar</button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={() => setSel(null)}><Icon name="chevR" size={14} style={{ transform: 'rotate(180deg)' }} /></button>
            <span style={{ fontWeight: 800, fontSize: 14, flex: 1 }}>{selProd.name}</span>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <button className="btn btn-ghost" style={{ justifyContent: 'space-between', fontSize: 13.5 }} disabled={!cabeBase(selProd.id, 1)} onClick={() => addSimple(selProd)}>
              <span style={{ fontWeight: 700 }}>1 unidad</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{cabeBase(selProd.id, 1) ? fmtCLP(precioLocalDespacho(selProd)) : 'sin stock'}</span>
            </button>
            {fmtsDe(selProd).map((f) => (
              <button key={f.id} className="btn btn-ghost" style={{ justifyContent: 'space-between', fontSize: 13.5 }} disabled={!cabeBase(selProd.id, f.qty)} onClick={() => addVariante(selProd, f)}>
                <span style={{ fontWeight: 700 }}>{f.name} <span style={{ color: 'var(--ink-3)', fontWeight: 600 }}>({f.qty} u)</span></span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{cabeBase(selProd.id, f.qty) ? fmtCLP(precioFormatoCanal(f, tipo)) : 'sin stock'}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function EditarModal({ venta, onClose }: { venta: Sale; onClose: () => void }) {
  const { updateSale, settings, toast, products, despachos } = useStore()
  const { getFormats } = useFormats()
  const cl = venta.cliente
  const [tipo, setTipo] = useState<'local' | 'despacho'>(venta.tipo || 'local')
  const [method, setMethod] = useState(venta.method)
  const [items, setItems] = useState<SaleItem[]>(venta.items)
  const [agregando, setAgregando] = useState(false)
  const [conCliente, setConCliente] = useState(!!cl)
  const [nombre, setNombre] = useState(cl?.nombre || '')
  const [telefono, setTelefono] = useState(cl?.telefono || cl?.numero || '')
  const [ciudad, setCiudad] = useState(cl?.ciudad || '')
  const [direccion, setDireccion] = useState(cl?.direccion || '')
  const [depto, setDepto] = useState(cl?.depto || '')
  const [correo, setCorreo] = useState(cl?.correo || '')

  const metodos = [...new Set([...settings.methods, venta.method])]

  // Candado "antes de salir a ruta": si el despacho ya va en camino, llegó o fue
  // enviado a OptiRoute, NO se pueden cambiar los productos ni el tipo (la
  // mercadería ya salió). Los datos de contacto/pago sí se pueden corregir.
  const desp = despachos.find((d) => d.saleId === venta.id)
  const bloqueado = !!desp && (desp.estado === 'en_ruta' || desp.estado === 'entregado' || !!desp.optirouteId)

  // Tope de stock: lo disponible para esta boleta = stock actual del producto +
  // lo que esta misma boleta ya tenía reservado (se repondrá al guardar).
  const presupuestoBase = (productId: number) => {
    const prod = products.find((p) => p.id === productId)
    if (!prod) return 0
    return prod.stock + unidadesBaseDeItems(venta.items.filter((i) => i.productId === productId))
  }
  const cabeBase = (productId: number, deltaBase: number) =>
    unidadesBaseDeItems(items.filter((i) => i.productId === productId)) + deltaBase <= presupuestoBase(productId) + 1e-9

  const setQty = (idx: number, nueva: number) => {
    setItems((its) => its.map((it, i) => (i === idx ? { ...it, qty: Math.max(1, nueva) } : it)))
  }
  const incQty = (idx: number) => {
    const it = items[idx]
    const b = it.baseUnitsPerItem || 1
    if (!cabeBase(it.productId, b)) { toast('No hay stock para sumar otra unidad', 'alert'); return }
    setQty(idx, it.qty + 1)
  }
  const quitar = (idx: number) => setItems((its) => its.filter((_, i) => i !== idx))
  const agregarItem = (it: SaleItem) => { setItems((its) => [...its, it]); setAgregando(false) }

  const bruto = items.reduce((a, i) => a + i.price * i.qty, 0)
  const costo = items.reduce((a, i) => a + i.cost * i.qty, 0)
  // Conserva el descuento original (recalcula el monto sobre el nuevo bruto).
  const desc = venta.descuento
    ? venta.descuento.type === 'pct'
      ? Math.round((bruto * venta.descuento.value) / 100)
      : Math.min(venta.descuento.value, bruto)
    : 0
  const total = bruto - desc

  // Para despacho, OptiRoute necesita nombre + dirección + comuna + teléfono.
  const despachoListo = nombre.trim() && direccion.trim() && ciudad.trim() && telefono.trim()
  const faltaDespacho = tipo === 'despacho' && (!conCliente || !despachoListo)
  const sinItems = items.length === 0

  const guardar = () => {
    if (faltaDespacho) { toast('Para un despacho faltan datos: nombre, dirección, comuna y teléfono.', 'alert'); return }
    if (sinItems) { toast('La boleta debe tener al menos un producto.', 'alert'); return }
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
            depto: depto.trim() || undefined,
          }
        : null
    // Cambiar el método mantiene coherente el estado de crédito: convertida a
    // contado deja de ser deuda; convertida a Crédito debe lo aún no abonado.
    // Si el método cambió, el pago dividido anterior ya no aplica.
    const esCredito = method === 'Crédito'
    const totalPagado = (venta.pagos || []).reduce((a, p) => a + p.monto, 0)
    const itemsCambiaron = JSON.stringify(items) !== JSON.stringify(venta.items)
    updateSale(venta.id, {
      tipo,
      method,
      cliente,
      // Solo manda items/total si de verdad cambiaron (así no se reconcilia stock de más).
      ...(itemsCambiaron ? { items, total, cost: costo, profit: total - costo, descuento: desc > 0 ? { type: venta.descuento!.type, value: venta.descuento!.value, amount: desc } : null } : {}),
      credito: esCredito,
      pagado: esCredito ? totalPagado >= total : true,
      montoPendiente: esCredito ? Math.max(0, total - totalPagado) : 0,
      ...(method !== venta.method ? { pagoMixto: null } : {}),
    })
    onClose()
  }

  return (
    <Modal
      title={`Editar boleta N° ${venta.boleta}`}
      sub="Edita productos, tipo, pago y datos del cliente de esta venta."
      onClose={onClose}
      width={560}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={guardar} disabled={faltaDespacho || sinItems}><Icon name="check" size={16} />Guardar</button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {bloqueado && (
          <div style={{ fontSize: 12.5, color: 'oklch(0.50 0.10 70)', fontWeight: 700, lineHeight: 1.5, background: 'var(--warn-tint)', borderRadius: 10, padding: '10px 12px' }}>
            <Icon name="truck" size={13} /> Este despacho ya {desp?.estado === 'entregado' ? 'fue entregado' : desp?.optirouteId ? 'fue enviado a OptiRoute' : 'salió a ruta'}: no puedes cambiar los productos ni el tipo. Sí puedes corregir el pago y los datos de contacto.
          </div>
        )}

        {/* ── Productos de la boleta ── */}
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-2)', flex: 1 }}>Productos</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)' }}>{items.length} línea{items.length !== 1 ? 's' : ''}</span>
          </div>
          {items.map((it, idx) => {
            const granel = esGranelItem(it)
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--surface-3)', borderRadius: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{fmtCLP(it.price)} c/u · {fmtCLP(it.price * it.qty)}</div>
                </div>
                {!granel && !bloqueado ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={() => (it.qty <= 1 ? quitar(idx) : setQty(idx, it.qty - 1))}><Icon name={it.qty <= 1 ? 'trash' : 'minus'} size={13} /></button>
                    <span className="tnum" style={{ minWidth: 26, textAlign: 'center', fontWeight: 800, fontSize: 14 }}>{it.qty}</span>
                    <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={() => incQty(idx)}><Icon name="plus" size={13} /></button>
                  </div>
                ) : (
                  <span className="tnum" style={{ fontWeight: 800, fontSize: 14 }}>×{it.qty}</span>
                )}
                {!bloqueado && <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28, color: 'var(--danger)' }} onClick={() => quitar(idx)}><Icon name="trash" size={13} /></button>}
              </div>
            )
          })}
          {sinItems && <div style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 700 }}>La boleta quedó sin productos. Agrega al menos uno.</div>}

          {!bloqueado && (agregando ? (
            <AgregarLineaProducto tipo={tipo} onAdd={agregarItem} onCancel={() => setAgregando(false)} cabeBase={cabeBase} />
          ) : (
            <button className="btn btn-soft" style={{ fontSize: 13.5, alignSelf: 'flex-start' }} onClick={() => setAgregando(true)}><Icon name="plus" size={15} />Agregar producto</button>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 2px 0', borderTop: '1px solid var(--line)', marginTop: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)' }}>{desc > 0 ? `Total (con descuento ${fmtCLP(desc)})` : 'Total'}</span>
            <span className="tnum" style={{ fontWeight: 800, fontSize: 16 }}>{fmtCLP(total)}</span>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Tipo de venta">
            <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value as 'local' | 'despacho')} disabled={bloqueado}>
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
            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Field label="Dirección" hint="Necesaria para despachos."><input className="input" value={direccion} onChange={(e) => setDireccion(e.target.value)} /></Field>
              <Field label="Depto / casa"><input className="input" value={depto} onChange={(e) => setDepto(e.target.value)} placeholder="Opcional" /></Field>
            </div>
            <Field label="Correo"><input className="input" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} /></Field>
          </div>
        )}

        {faltaDespacho && (
          <div style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 700, lineHeight: 1.5 }}>
            <Icon name="alert" size={13} /> Para guardar como <strong>despacho</strong> necesitas nombre, dirección, comuna y teléfono del cliente.
          </div>
        )}

        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, lineHeight: 1.5 }}>
          <Icon name="alert" size={13} /> Si pasas esta venta a <strong>despacho</strong>, se crea el pedido en Despachos; si la vuelves a mostrador, se quita. Para cambiar la ficha permanente del cliente, usa <strong>&ldquo;Ver cliente&rdquo;</strong> → Clientes.
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
