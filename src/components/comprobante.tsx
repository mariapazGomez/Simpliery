'use client'

// ---------- Comprobante de venta — diseño imprimible (portado de comprobante.jsx) ----------
import { useEffect, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '@/lib/store'
import { fmtCLP } from '@/lib/format'
import { Icon } from '@/components/icon'
import type { Sale } from '@/types'

/** `Sale.total` ya viene con el descuento aplicado; el subtotal se calcula desde los ítems. */
type ComprobanteSale = Sale & { balance?: number }

const PRINT_CSS = `
@media print {
  body > *:not(#print-root) { display: none !important; }
  #print-root { display: block !important; position: fixed; inset:0; background:#fff; z-index:99999; }
  .no-print { display: none !important; }
  @page { margin: 0; size: 80mm auto; }
}
#print-root { display:none; }
`

export function ComprobanteModal({
  sale,
  negocio,
  onClose,
}: {
  sale: ComprobanteSale
  negocio?: string
  onClose: () => void
}) {
  const { settings } = useStore()
  const biz = settings?.business || negocio || 'Control Local'

  const printRef = useRef<HTMLDivElement>(null)

  // Inyecta los estilos de impresión una sola vez (solo en navegador).
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (document.getElementById('print-css')) return
    const s = document.createElement('style')
    s.id = 'print-css'
    s.textContent = PRINT_CSS
    document.head.appendChild(s)
  }, [])

  const subtotal = sale.items.reduce((a, i) => a + i.price * i.qty, 0)
  const totalFinal = sale.total
  const hasCliente = !!(sale.cliente?.nombre && sale.cliente.nombre !== 'Cliente general')
  const mixto = sale.pagoMixto && sale.pagoMixto.monto > 0 ? sale.pagoMixto : null

  // Texto para compartir por WhatsApp
  const waText = encodeURIComponent(
    `*Comprobante de venta N°${sale.boleta}*\n` +
      `Negocio: ${biz}\n` +
      `Fecha: ${sale.date.toLocaleDateString('es-CL')}\n` +
      (hasCliente ? `Cliente: ${sale.cliente!.nombre}\n` : '') +
      `\n` +
      sale.items.map((i) => `• ${i.name} x${i.qty}  ${fmtCLP(i.price * i.qty)}`).join('\n') +
      `\n\nTotal: *${fmtCLP(totalFinal)}*\n` +
      `Método de pago: ${sale.method}\n\n` +
      `Gracias por tu compra 🙏`,
  )

  const handlePrint = () => {
    if (typeof document === 'undefined' || !printRef.current) return
    const root =
      document.getElementById('print-root') ||
      (() => {
        const d = document.createElement('div')
        d.id = 'print-root'
        document.body.appendChild(d)
        return d
      })()
    root.innerHTML = printRef.current.innerHTML
    window.print()
    setTimeout(() => {
      root.innerHTML = ''
    }, 1500)
  }

  const lineStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }
  const divStyle: CSSProperties = { borderTop: '1px dashed #ccc', margin: '8px 0' }

  const numero = sale.cliente?.numero || ''
  const numeroClean = numero.replace(/\D/g, '')

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal scale-in" style={{ maxWidth: 440 }} onMouseDown={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="card-head no-print" style={{ position: 'sticky', top: 0, background: 'var(--surface)', borderRadius: '24px 24px 0 0', zIndex: 2 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--primary-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center' }}>
            <Icon name="receipt" size={18} />
          </span>
          <div style={{ flex: 1 }}>
            <div className="card-title">Comprobante listo</div>
            <div className="card-sub">N° {sale.boleta}</div>
          </div>
          <button className="btn btn-ghost btn-icon no-print" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Receipt body */}
        <div style={{ padding: '20px 22px' }}>
          <div ref={printRef} style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: 13, color: '#1a1a1a', background: '#fff', padding: '20px', maxWidth: 340, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.01em' }}>{biz.toUpperCase()}</div>
              <div style={{ fontSize: 11.5, color: '#555', marginTop: 3 }}>COMPROBANTE DE VENTA</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>N° {sale.boleta}</div>
            </div>
            <div style={divStyle} />

            {/* Date / client */}
            <div style={{ ...lineStyle, fontSize: 12 }}>
              <span>Fecha:</span>
              <span>{sale.date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
            </div>
            <div style={{ ...lineStyle, fontSize: 12 }}>
              <span>Hora:</span>
              <span>{sale.date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {hasCliente && (
              <div style={{ ...lineStyle, fontSize: 12 }}>
                <span>Cliente:</span>
                <span style={{ fontWeight: 700 }}>{sale.cliente!.nombre}</span>
              </div>
            )}
            <div style={divStyle} />

            {/* Items */}
            <div style={{ marginBottom: 8 }}>
              {sale.items.map((it, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#555' }}>
                    <span>
                      {it.qty} u. × {fmtCLP(it.price)}
                    </span>
                    <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{fmtCLP(it.price * it.qty)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={divStyle} />

            {/* Totals */}
            <div style={lineStyle}>
              <span>Subtotal</span>
              <span className="tnum">{fmtCLP(subtotal)}</span>
            </div>
            {(sale.descuento?.amount || 0) > 0 && (
              <div style={{ ...lineStyle, color: 'var(--primary-700)', fontWeight: 700 }}>
                <span>Descuento</span>
                <span className="tnum">-{fmtCLP(sale.descuento!.amount)}</span>
              </div>
            )}
            <div style={{ ...lineStyle, fontWeight: 900, fontSize: 16, marginTop: 4 }}>
              <span>TOTAL</span>
              <span className="tnum">{fmtCLP(totalFinal)}</span>
            </div>
            {mixto ? (
              <>
                <div style={{ ...lineStyle, fontSize: 12, color: '#555' }}>
                  <span>Pago {sale.method}</span>
                  <span className="tnum">{fmtCLP(Math.max(0, sale.total - mixto.monto))}</span>
                </div>
                <div style={{ ...lineStyle, fontSize: 12, color: '#555' }}>
                  <span>Pago {mixto.metodo}</span>
                  <span className="tnum">{fmtCLP(Math.min(mixto.monto, sale.total))}</span>
                </div>
              </>
            ) : (
              <div style={{ ...lineStyle, fontSize: 12, color: '#555' }}>
                <span>Método de pago</span>
                <span>{sale.method}</span>
              </div>
            )}
            {sale.method === 'Crédito' && (
              <div style={{ ...lineStyle, fontSize: 12, color: '#c00', fontWeight: 700 }}>
                <span>Saldo pendiente</span>
                <span>{fmtCLP(sale.balance || sale.montoPendiente || sale.total)}</span>
              </div>
            )}
            <div style={divStyle} />

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: 11, color: '#888', lineHeight: 1.6 }}>
              <div>¡Gracias por tu compra!</div>
              <div style={{ marginTop: 6, fontSize: 10.5, color: '#aaa', fontFamily: 'sans-serif' }}>
                Este documento es un comprobante de venta.
                <br />
                No reemplaza boleta ni factura tributaria.
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="no-print" style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" style={{ fontSize: 13, padding: '9px 16px' }} onClick={handlePrint}>
              <Icon name="download" size={15} />
              Imprimir / PDF
            </button>
            {numeroClean.length >= 8 && (
              <a href={`https://wa.me/56${numeroClean}?text=${waText}`} target="_blank" rel="noopener noreferrer">
                <button className="btn btn-ghost" style={{ fontSize: 13, padding: '9px 16px' }}>
                  <Icon name="phone" size={15} />
                  Enviar WA
                </button>
              </a>
            )}
            <button className="btn btn-primary" style={{ fontSize: 13, padding: '9px 16px' }} onClick={onClose}>
              <Icon name="plus" size={15} />
              Nueva venta
            </button>
          </div>
          <div className="no-print" style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 10, fontWeight: 600 }}>
            "Imprimir / PDF" abre el diálogo de impresión del navegador.
            <br />
            Selecciona "Guardar como PDF" para guardar.
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
