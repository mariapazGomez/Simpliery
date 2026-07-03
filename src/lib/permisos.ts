'use client'

// ---------- Permisos por rol (gating en la app) ----------
// El aislamiento entre negocios lo da RLS en Supabase.
// El control por rol dentro de un negocio se lee de permisos_modulo_rol (DB-driven).

import type { RolPermiso } from '@/types'

/** Secciones (ids de navegación) por defecto de cada rol. 'all' = todo. */
export const SECCIONES_POR_ROL: Record<string, string[] | 'all'> = {
  admin: 'all',
  vendedor: ['ventas', 'clientes'],
  bodega: ['ventas', 'productos', 'inventario', 'despachos', 'proveedores'],
  contador: ['dashboard', 'transacciones', 'finanzas', 'reportes', 'clientes', 'fiados', 'crecimiento'],
}

/** ¿Ve dinero sensible (costos, ganancias, márgenes, finanzas) por defecto? */
export const VER_DINERO_DEFAULT: Record<string, boolean> = {
  admin: true, contador: true, vendedor: false, bodega: false,
}

/** Roles que el admin puede configurar (admin queda fijo con acceso total). */
export const ROLES_CONFIGURABLES = ['vendedor', 'bodega', 'contador'] as const

export type PermisosConfig = Record<string, RolPermiso>

/** Secciones efectivas de un rol: la config del negocio manda sobre los defaults. */
function seccionesDe(rol: string | null | undefined, config?: PermisosConfig): string[] | 'all' {
  const r = rol || 'admin'
  if (r === 'admin') return 'all' // admin siempre con acceso total
  const c = config?.[r]
  if (c && Array.isArray(c.secciones)) return c.secciones
  return SECCIONES_POR_ROL[r] ?? []
}

/** ¿El rol puede ver/entrar a esta sección? */
export function puedeVer(rol: string | null | undefined, id: string, config?: PermisosConfig): boolean {
  const s = seccionesDe(rol, config)
  return s === 'all' || s.includes(id)
}

/** Sección de inicio para el rol (la primera permitida). */
export function inicio(rol: string | null | undefined, config?: PermisosConfig): string {
  if (puedeVer(rol, 'dashboard', config)) return 'dashboard'
  const s = seccionesDe(rol, config)
  if (s === 'all') return 'dashboard'
  return s[0] || 'ventas'
}

/** ¿Puede ver dinero sensible (costos, ganancias, márgenes, finanzas)? */
export function puedeVerDinero(rol: string | null | undefined, config?: PermisosConfig): boolean {
  const r = rol || 'admin'
  if (r === 'admin') return true
  return config?.[r]?.verDinero ?? VER_DINERO_DEFAULT[r] ?? false
}

/** ¿Es administrador? (gestiona usuarios, configuración y permisos) */
export function esAdmin(rol: string | null | undefined): boolean {
  return rol === 'admin' || rol == null
}

export { usePermisos } from '@/hooks/usePermisos'
