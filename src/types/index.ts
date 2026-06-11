// ============ Control Local — Modelo de dominio ============
// Portado del prototipo de Claude Design. Nombres de campo en español,
// igual que el prototipo (cat, nombre, compras, etc.).

export interface Product {
  id: number
  name: string
  cat: string
  unit: string
  cost: number
  price: number
  margin: number
  marginPct: number
  stock: number
  min: number
  sold: number
  /** Foto opcional (dataURL) del producto. */
  photo?: string
  /** Equivalencia en kg por unidad (para formatos a granel). */
  kgPerUnit?: number
  /** Precio fijo para venta por despacho. Si no se define (o 0), usa el precio local. */
  precioDespacho?: number
  /** Orden manual dentro de su categoría (para el catálogo de ventas). Menor = primero. */
  orden?: number
}

/** Unidades de medida válidas para un producto (controlan el stock). */
export const PRODUCT_UNITS = ['Unidad', 'kg', 'gramo', 'litro', 'mililitro', 'caja', 'paquete'] as const

export interface SaleItem {
  productId: number
  name: string
  cat: string
  qty: number
  price: number
  cost: number
  /** Para ventas por formato/empaque (ver formats-store). */
  formatId?: string
  baseUnitsPerItem?: number
}

/** Datos del cliente embebidos en una venta (despacho/crédito). */
export interface ClienteRef {
  nombre: string
  ciudad?: string
  telefono?: string
  numero?: string
  correo?: string
  direccion?: string
}

export interface Pago {
  fecha: Date
  monto: number
  /** Método con que se recibió el pago (efectivo/transferencia/tarjeta…) para cuadrar flujos. */
  metodo?: string
}

export interface Sale {
  id: string
  boleta: number
  date: Date
  items: SaleItem[]
  method: string
  total: number
  cost: number
  profit: number
  tipo: 'local' | 'despacho'
  cliente: ClienteRef | null
  credito: boolean
  pagado: boolean
  montoPendiente: number
  pagos: Pago[]
}

/** Compra histórica dentro de la ficha de un cliente. */
export interface Compra {
  id: string
  boleta: number
  date: Date
  items: { productId: number; name: string; cat: string; qty: number; price: number; cost: number }[]
  method: string
  total: number
  cost: number
  profit: number
}

export interface Cliente {
  id: string
  nombre: string
  telefono: string
  correo: string
  ciudad: string
  createdAt: Date
  nota: string
  compras: Compra[]
  direccion?: string
}

export interface Movement {
  id: string
  date: Date
  product: string
  type: string
  qty: number
  note: string
}

export interface Settings {
  business: string
  ownerName?: string
  ownerRole?: string
  currency: string
  methods: string[]
  minStockDefault: number
  minMargin: number
}

/** Resultado de clientMetrics(cliente). */
export interface ClientMetrics {
  totalGastado: number
  ticketMedio: number
  lastCompra: Date | null
  daysSinceLast: number | null
  frecuencia: number | null
  nextExpected: Date | null
  daysUntilNext: number | null
  categoria: 'VIP' | 'Frecuente' | 'En riesgo' | 'Nuevo' | 'Regular'
  topProductos: { name: string; cat: string; qty: number; total: number }[]
  topCats: [string, number][]
}

export type StockState = 'ok' | 'bajo' | 'sin'

// ---------- Finanzas ----------
export interface Gasto {
  id: string
  fecha: Date
  cat: string
  desc: string
  monto: number
  method: string
  recurrente: boolean
  proveedor: string
  estado: 'pagado' | 'pendiente'
}

export interface NominaItem {
  id: string
  nombre: string
  cargo: string
  tipo: string
  monto: number
  dia: number
  estado: 'pagado' | 'pendiente'
  horas: number
  bono: number
}

export interface MarketingItem {
  id: string
  campaign: string
  canal: string
  fecha: Date
  monto: number
  ventasGeneradas: number
  clientesNuevos: number
  obs: string
}

export interface Meta {
  id: string
  nombre: string
  monto: number
  fechaObj: Date
  saldoActual: number
  aporteEsperado: number
  prioridad: string
  color: string
}

export interface CreditoPago {
  monto: number
  fecha: Date
  nota?: string
  interes?: number
  amortizacion?: number
  saldoAntes?: number
  saldoDespues?: number
}

export interface Credito {
  id: string
  acreedor: string
  tipo: string
  montoOriginal: number
  saldo: number
  tasaAnual: number
  cuotaMensual: number
  proximaCuota: Date
  estado: string
  notas: string
  pagos: CreditoPago[]
}

// ---------- Formatos (multi-formato de venta) ----------
export type CanalVenta = 'local' | 'despacho' | 'ambos'

/** Opciones de canal para selects. */
export const CANALES: { value: CanalVenta; label: string; short: string }[] = [
  { value: 'ambos', label: 'Local y online', short: 'Ambos' },
  { value: 'local', label: 'Solo local', short: 'Local' },
  { value: 'despacho', label: 'Solo online', short: 'Online' },
]

export interface Format {
  id: string
  productId: number
  name: string
  qty: number
  price: number
  /** Dónde se vende este formato. Vacío = 'ambos' (retrocompatible). */
  canal?: CanalVenta
  /** Precio en despacho/online. Vacío = mismo `price`. */
  precioDespacho?: number
}

// ---------- Despachos (entregas a domicilio + integración OptiRoute) ----------
export type EstadoDespacho = 'pendiente' | 'en_ruta' | 'entregado' | 'no_entregado'

/** Opciones de estado (para selects/chips). */
export const DISPATCH_STATUSES: { value: EstadoDespacho; label: string; icon: string }[] = [
  { value: 'pendiente', label: 'Pendiente', icon: 'clock' },
  { value: 'en_ruta', label: 'En ruta', icon: 'truck' },
  { value: 'entregado', label: 'Entregado', icon: 'check' },
  { value: 'no_entregado', label: 'No entregado', icon: 'x' },
]

/** Colores por estado (var(--…) del design system). */
export const DISPATCH_STATUS_COLOR: Record<EstadoDespacho, { bg: string; fg: string }> = {
  pendiente: { bg: 'var(--warn-tint)', fg: 'oklch(0.50 0.10 70)' },
  en_ruta: { bg: 'var(--info-tint)', fg: 'var(--info)' },
  entregado: { bg: 'var(--ok-tint)', fg: 'var(--primary-700)' },
  no_entregado: { bg: 'var(--danger-tint)', fg: 'var(--danger)' },
}

/** Despacho persistente (nace de una venta tipo 'despacho'; se envía a OptiRoute). */
export interface Despacho {
  id: string
  saleId: string
  boleta: number
  fecha: Date
  cliente: string
  telefono: string
  correo: string
  direccion: string
  depto?: string
  ciudad: string
  nota: string
  repartidor: string
  estado: EstadoDespacho
  items: SaleItem[]
  total: number
  method: string
  /** Datos de OptiRoute tras enviarlo (vacíos hasta que se envía). */
  optirouteId?: string
  trackingUrl?: string
  trackingCode?: string
  optirouteStatus?: number
  enviadoEn?: Date
}
