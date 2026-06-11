'use client'

// ---------- Permisos por rol (gating en la app, configurable por negocio) ----------
// IMPORTANTE: esto OCULTA secciones y datos en la interfaz según el rol, pero el
// aislamiento fuerte entre negocios lo da RLS en Supabase. El control por rol
// DENTRO de un negocio es de interfaz (un usuario muy técnico podría llamar la
// API igual). Suficiente para un equipo de confianza; el refuerzo en servidor
// queda como mejora futura.
//
// Los permisos son DATOS editables: `settings.permisos` (por negocio) manda; si no
// hay nada guardado para un rol, se usan los valores por defecto de abajo.

import { useMemo } from 'react'
import { useStore } from '@/lib/store'
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

/** Permisos del usuario actual, ya mezclados con la config del negocio. */
export function usePermisos() {
  const { rol, settings } = useStore()
  const config = settings.permisos as PermisosConfig | undefined
  return useMemo(
    () => ({
      puedeVer: (id: string) => puedeVer(rol, id, config),
      puedeVerDinero: () => puedeVerDinero(rol, config),
      inicio: () => inicio(rol, config),
      esAdmin: esAdmin(rol),
    }),
    [rol, config],
  )
}
