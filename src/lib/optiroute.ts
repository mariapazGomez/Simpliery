// ---------- Helpers OptiRoute (puros, sin token — el token vive en el servidor) ----------
import type { Despacho, EstadoDespacho } from '@/types'

/** "Pedido de entrada" de OptiRoute construido desde un Despacho. */
export interface PedidoOptiRoute {
  reference: string
  customer: { name: string; phone_number?: string; email?: string }
  address: { address_string: string; commune_string?: string; apartment_number?: string }
}

/** Mapea un Despacho al objeto que espera la API de pedidos de OptiRoute. */
export function despachoToPedido(d: Despacho): PedidoOptiRoute {
  const tel = (d.telefono || '').replace(/\s/g, '')
  return {
    reference: d.saleId,
    customer: {
      name: d.cliente,
      ...(tel ? { phone_number: tel } : {}),
      ...(d.correo ? { email: d.correo } : {}),
    },
    address: {
      address_string: d.direccion,
      ...(d.ciudad ? { commune_string: d.ciudad } : {}),
      ...(d.depto ? { apartment_number: d.depto } : {}),
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
