// ---------- Permisos por rol (gating en la app) ----------
// IMPORTANTE: esto OCULTA secciones y datos en la interfaz según el rol, pero el
// aislamiento fuerte entre negocios lo da RLS en Supabase. El control por rol
// DENTRO de un negocio es de interfaz (un usuario muy técnico podría llamar la
// API igual). Suficiente para un equipo de confianza; el refuerzo en servidor
// queda como mejora futura.

/** Secciones (ids de navegación) que puede ver cada rol. 'all' = todo. */
export const SECCIONES_POR_ROL: Record<string, string[] | 'all'> = {
  admin: 'all',
  // Vendedor de mostrador: solo vender y manejar clientes. Ve productos, precios y
  // stock DENTRO de la pantalla de Ventas (el catálogo), pero no ve costos,
  // ganancias, inventario, finanzas ni administración.
  vendedor: ['ventas', 'clientes'],
  // Encargado de bodega: stock y catálogo.
  bodega: ['ventas', 'productos', 'inventario', 'despachos', 'proveedores'],
  // Contador: números, sin tocar operación ni administración.
  contador: ['dashboard', 'transacciones', 'finanzas', 'reportes', 'clientes', 'fiados', 'crecimiento'],
}

/** ¿El rol puede ver/entrar a esta sección? */
export function puedeVer(rol: string | null | undefined, id: string): boolean {
  const allow = SECCIONES_POR_ROL[rol || 'admin']
  if (!allow || allow === 'all') return true
  return allow.includes(id)
}

/** Sección de inicio para el rol (la primera permitida). */
export function inicio(rol: string | null | undefined): string {
  if (puedeVer(rol, 'dashboard')) return 'dashboard'
  const allow = SECCIONES_POR_ROL[rol || 'admin']
  if (!allow || allow === 'all') return 'dashboard'
  return allow[0] || 'ventas'
}

/** ¿Puede ver dinero sensible (costos, ganancias, márgenes, finanzas)? */
export function puedeVerDinero(rol: string | null | undefined): boolean {
  return rol === 'admin' || rol === 'contador' || rol == null
}

/** ¿Es administrador? (gestiona usuarios y configuración) */
export function esAdmin(rol: string | null | undefined): boolean {
  return rol === 'admin' || rol == null
}
