// ---------- Helpers OptiRoute (puros, sin token — el token vive en el servidor) ----------
import type { Despacho, EstadoDespacho } from '@/types'

/** "Pedido de entrada" de OptiRoute construido desde un Despacho.
 *  OJO: NO enviar `custom_fields` — el manual lo describe como "objeto", pero la
 *  API real lo rechaza con 400 «Se esperaba una lista de elementos en vez del
 *  tipo "dict"» (verificado en producción, 12-06-2026). El detalle del pedido
 *  viaja completo en `address_more_info`. */
export interface PedidoOptiRoute {
  reference: string
  customer: { name: string; phone_number?: string; email?: string; demand_a?: number }
  address: { address_string: string; commune_string?: string; apartment_number?: string; address_more_info?: string }
}

/** Mapea un Despacho al objeto que espera la API de pedidos de OptiRoute.
 *  `address_more_info` va en formato SEPARADO POR COMAS para que en el Excel de
 *  OptiRoute se pueda partir con "Texto en columnas": cada ítem "Nx Producto" en
 *  su celda y el total (número) al final. Las comas dentro de los nombres se
 *  limpian para no romper el separador. `demand_a` lleva los bultos. */
export function despachoToPedido(d: Despacho): PedidoOptiRoute {
  const tel = (d.telefono || '').replace(/\s/g, '')
  const limpio = (s: string) => s.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
  const totalStr = String(Math.round(d.total))
  // Lista COMPLETA de productos + total al final, lo más compacta posible para
  // que quepa en el campo de OptiRoute (sin espacio tras la coma ni tras el "x";
  // se conservan los espacios DENTRO del nombre para poder leerlo). Separador por
  // comas para "Texto en columnas". Solo el total del pedido, sin valor unitario.
  const detalle = d.items.map((it) => `${it.qty}x${limpio(it.name)}`).join(',')
  const masInfo = `${detalle},${totalStr}`
  const bultos = Math.max(1, Math.round(d.items.reduce((a, it) => a + it.qty, 0)))
  return {
    reference: d.saleId,
    customer: {
      name: d.cliente,
      ...(tel ? { phone_number: tel } : {}),
      ...(d.correo ? { email: d.correo } : {}),
      demand_a: bultos,
    },
    address: {
      address_string: d.direccion,
      ...(d.ciudad ? { commune_string: d.ciudad } : {}),
      ...(d.depto ? { apartment_number: d.depto } : {}),
      address_more_info: masInfo,
    },
  }
}

/** Estado numérico de OptiRoute → estado local del despacho. */
export function optirouteStatusToEstado(n: number | null | undefined): EstadoDespacho {
  switch (n) {
    case 3: // DELIVERED
      return 'entregado'
    case 2: // ONGOING
    case 4: // ARRIVED
    case 6: // ONROUTE
      return 'en_ruta'
    case 5: // SKIPPED
    case -1: // CANCELLED
      return 'no_entregado'
    default: // 0 REVIEWING, 1 SCHEDULED, etc.
      return 'pendiente'
  }
}

/** Respuesta normalizada que devuelve nuestro route handler por cada pedido. */
export interface EnvioResultado {
  reference: string
  optirouteId?: string
  trackingUrl?: string
  trackingCode?: string
  status?: number
  error?: string
}
