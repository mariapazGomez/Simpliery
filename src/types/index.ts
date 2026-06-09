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
}

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
export interface Format {
  id: string
  productId: number
  name: string
  qty: number
  price: number
}
