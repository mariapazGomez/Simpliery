'use client'

// ---------- Navegación: mapeo de ids del prototipo a rutas Next ----------
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/** id del prototipo → ruta Next (App Router). */
export const ROUTE_MAP: Record<string, string> = {
  dashboard: '/dashboard',
  ventas: '/ventas',
  transacciones: '/transacciones',
  productos: '/productos',
  inventario: '/inventario',
  despachos: '/despachos',
  proveedores: '/proveedores',
  cierreCaja: '/cierre-caja',
  clientes: '/clientes',
  fiados: '/fiados',
  segmentos: '/segmentos',
  finanzas: '/finanzas',
  crecimiento: '/crecimiento',
  recordatorios: '/recordatorios',
  reportes: '/reportes',
  notificaciones: '/notificaciones',
  usuarios: '/usuarios',
  config: '/configuracion',
}

/** ruta Next → id del prototipo (para marcar el item activo). */
export const PATH_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(ROUTE_MAP).map(([id, path]) => [path, id]),
)

/** Título y subtítulo por pantalla (topbar). */
export const TITLES: Record<string, [string, string]> = {
  dashboard: ['Inicio', 'Tu negocio de un vistazo'],
  ventas: ['Ventas', 'Registra una venta en segundos'],
  transacciones: ['Transacciones', 'Historial de ventas con su detalle'],
  productos: ['Productos', 'Tu catálogo y precios'],
  inventario: ['Inventario', 'Stock y reposición'],
  clientes: ['Clientes', 'Historial y análisis de compra'],
  fiados: ['Deudores', '¿Quién me debe? Lo que aún no está en caja'],
  segmentos: ['Segmentos', 'Filtra y comunícate con tus clientes'],
  finanzas: ['Finanzas', 'Flujo de caja, metas y gastos'],
  reportes: ['Reportes', 'Cómo va tu negocio'],
  despachos: ['Despachos', 'Entregas y rutas del día'],
  notificaciones: ['Notificaciones', 'Alertas y recordatorios automáticos'],
  recordatorios: ['Recordatorios', 'Tareas y pendientes del negocio'],
  usuarios: ['Usuarios', 'Equipo y permisos de acceso'],
  config: ['Configuración', 'Ajustes del negocio'],
  proveedores: ['Proveedores', 'Contactos y condiciones de compra'],
  cierreCaja: ['Cierre de caja', 'Reconciliación de fin de jornada'],
  crecimiento: ['Crecimiento', 'Proyecta tus ingresos tratando a cada cliente como un activo'],
}

export const NAV_GROUPS: { label: string; items: { id: string; label: string; icon: string }[] }[] = [
  {
    label: 'Operación',
    items: [
      { id: 'dashboard', label: 'Inicio', icon: 'dashboard' },
      { id: 'ventas', label: 'Ventas', icon: 'ventas' },
      { id: 'transacciones', label: 'Transacciones', icon: 'receipt' },
      { id: 'productos', label: 'Productos', icon: 'productos' },
      { id: 'inventario', label: 'Inventario', icon: 'inventario' },
      { id: 'despachos', label: 'Despachos', icon: 'truck' },
      { id: 'proveedores', label: 'Proveedores', icon: 'store' },
      { id: 'cierreCaja', label: 'Cierre de caja', icon: 'wallet' },
    ],
  },
  {
    label: 'Clientes',
    items: [
      { id: 'clientes', label: 'Clientes', icon: 'clientes' },
      { id: 'fiados', label: 'Deudores', icon: 'coins' },
      { id: 'segmentos', label: 'Segmentos', icon: 'segment' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { id: 'finanzas', label: 'Finanzas', icon: 'wallet' },
      { id: 'crecimiento', label: 'Crecimiento', icon: 'target' },
      { id: 'recordatorios', label: 'Recordatorios', icon: 'bell' },
      { id: 'reportes', label: 'Reportes', icon: 'reportes' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { id: 'notificaciones', label: 'Notificaciones', icon: 'bell' },
      { id: 'usuarios', label: 'Usuarios', icon: 'users' },
      { id: 'config', label: 'Configuración', icon: 'config' },
    ],
  },
]

export const MOBILE_NAV: { id: string; label: string; icon: string; primary?: boolean }[] = [
  { id: 'dashboard', label: 'Inicio', icon: 'dashboard' },
  { id: 'ventas', label: 'Vender', icon: 'ventas', primary: true },
  { id: 'inventario', label: 'Stock', icon: 'inventario' },
  { id: 'clientes', label: 'Clientes', icon: 'clientes' },
  { id: 'finanzas', label: 'Finanzas', icon: 'wallet' },
]

/** Hook que devuelve `go(idOrPath)`: navega como el `go` del prototipo. */
export function useGo() {
  const router = useRouter()
  return useCallback(
    (route: string) => {
      const path = ROUTE_MAP[route] || route
      router.push(path)
      if (typeof window !== 'undefined') window.scrollTo(0, 0)
    },
    [router],
  )
}
