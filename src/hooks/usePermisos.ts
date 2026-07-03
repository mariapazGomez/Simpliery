'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PermisosState {
  rol:         string | null
  negocioId:   string | null
  nombre:      string | null
  username:    string | null
  sucursalId:  string | null
  permisos:    Record<string, boolean>
  loading:     boolean
}

export interface PermisosHook {
  puedeVer:       (modulo: string) => boolean
  puedeVerDinero: () => boolean
  inicio:         () => string
  esAdmin:        boolean
  loading:        boolean
  nombre:         string | null
  username:       string | null
  sucursalId:     string | null
  rol:            string | null
}

// Map de ids de navegación a claves en permisos_modulo_rol
const NAV_TO_MODULO: Record<string, string> = {
  config:     'configuracion',
  cierreCaja: 'cierre-caja',
}

const ORDERED_INICIO = ['ventas', 'clientes', 'inventario', 'reportes', 'finanzas', 'dashboard']

const EMPTY: PermisosHook = {
  puedeVer:       () => false,
  puedeVerDinero: () => false,
  inicio:         () => 'ventas',
  esAdmin:        false,
  loading:        true,
  nombre:         null,
  username:       null,
  sucursalId:     null,
  rol:            null,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePermisos(): PermisosHook {
  const [state, setState] = useState<PermisosState>({
    rol: null, negocioId: null, nombre: null, username: null,
    sucursalId: null, permisos: {}, loading: true,
  })

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('negocio_id, rol, nombre, username, sucursal_id')
        .eq('id', user.id)
        .single()

      if (!perfil || cancelled) return

      const p = perfil as {
        negocio_id: string; rol: string
        nombre: string | null; username: string | null; sucursal_id: string | null
      }

      // Admin: acceso total, no necesita consultar permisos_modulo_rol
      if (p.rol === 'admin') {
        if (!cancelled) setState({
          rol: 'admin', negocioId: p.negocio_id, nombre: p.nombre,
          username: p.username, sucursalId: p.sucursal_id, permisos: {}, loading: false,
        })
        return
      }

      const { data: rows } = await supabase
        .from('permisos_modulo_rol')
        .select('modulo, habilitado')
        .eq('negocio_id', p.negocio_id)
        .eq('rol', p.rol)

      if (cancelled) return

      const permisos: Record<string, boolean> = {}
      for (const row of (rows ?? [])) {
        const r = row as { modulo: string; habilitado: boolean }
        permisos[r.modulo] = r.habilitado
      }

      setState({
        rol: p.rol, negocioId: p.negocio_id, nombre: p.nombre,
        username: p.username, sucursalId: p.sucursal_id, permisos, loading: false,
      })
    }
    init()
    return () => { cancelled = true }
  }, [])

  return useMemo<PermisosHook>(() => {
    if (state.loading) return EMPTY

    const isAdmin = state.rol === 'admin'

    const puedeVer = (navId: string): boolean => {
      if (isAdmin) return true
      const dbKey = NAV_TO_MODULO[navId] ?? navId
      return state.permisos[dbKey] ?? false
    }

    const inicio = (): string => {
      if (isAdmin) return 'dashboard'
      return ORDERED_INICIO.find(puedeVer) ?? 'ventas'
    }

    return {
      puedeVer,
      puedeVerDinero: () => isAdmin || (state.permisos['finanzas'] ?? false),
      inicio,
      esAdmin:    isAdmin,
      loading:    false,
      nombre:     state.nombre,
      username:   state.username,
      sucursalId: state.sucursalId,
      rol:        state.rol,
    }
  }, [state])
}
