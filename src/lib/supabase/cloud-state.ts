'use client'

// ---------- Estado en la nube (Supabase) con la misma firma que useState ----------
// Reemplaza a usePersisted: carga desde Supabase al montar y, en cada cambio,
// sincroniza SOLO las filas modificadas (upsert/delete por id). Así el código de
// las acciones del store no cambia. Cada entidad vive en una fila { id, negocio_id, data }.
import { useCallback, useEffect, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

// Permite que la app muestre al usuario cualquier fallo de sincronización con la nube
// (lo conecta StoreProvider con su `toast`). Así un guardado fallido NO pasa desapercibido.
let cloudErrorHandler: ((msg: string) => void) | null = null
export function setCloudErrorHandler(fn: ((msg: string) => void) | null) {
  cloudErrorHandler = fn
}
function reportCloudError(table: string, action: string) {
  if (cloudErrorHandler) cloudErrorHandler(`No se pudo ${action} (${table}). Revisa tu conexión e intenta de nuevo.`)
}

/** Convierte recursivamente strings ISO en Date (como el reviver de localStorage). */
export function reviveDates<T>(v: T): T {
  if (typeof v === 'string') return (ISO_RE.test(v) ? new Date(v) : v) as unknown as T
  if (Array.isArray(v)) return v.map((x) => reviveDates(x)) as unknown as T
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {}
    for (const k in v as Record<string, unknown>) o[k] = reviveDates((v as Record<string, unknown>)[k])
    return o as unknown as T
  }
  return v
}

/**
 * Trae TODAS las filas de una tabla, paginando de a 1000: PostgREST (Supabase)
 * limita cada respuesta a 1000 filas, así que una colección grande (p. ej. una
 * base de clientes importada) quedaría cortada si se pidiera de una sola vez.
 * El orden (created_at desc, id) es estable para que las páginas no se traslapen.
 */
const PAGE = 1000
export async function fetchAllRows<T>(table: string): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select('data')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) return { rows, error: error.message }
    const chunk = ((data as { data: T }[] | null) ?? []).map((r) => r.data)
    rows.push(...chunk)
    if (chunk.length < PAGE) break
  }
  return { rows, error: null }
}

/** Perfil del usuario autenticado: su negocio y su rol. null mientras carga. */
export function usePerfil(): { negocioId: string | null; rol: string | null } {
  const [perfil, setPerfil] = useState<{ negocioId: string | null; rol: string | null }>({ negocioId: null, rol: null })
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase.from('perfiles').select('negocio_id, rol').eq('id', user.id).maybeSingle()
      if (error) console.error('No se pudo cargar el perfil:', error)
      if (alive && data) {
        const d = data as { negocio_id: string; rol: string }
        setPerfil({ negocioId: d.negocio_id, rol: d.rol })
      }
    })()
    return () => { alive = false }
  }, [])
  return perfil
}

interface WithId {
  id: string | number
}

async function syncDiff<T extends WithId>(table: string, prev: T[], next: T[], negocioId: string) {
  const nextIds = new Set(next.map((r) => r.id))
  const prevById = new Map(prev.map((r) => [r.id, r]))
  const toUpsert = next.filter((r) => {
    const p = prevById.get(r.id)
    return !p || JSON.stringify(p) !== JSON.stringify(r)
  })
  const toDelete = prev.filter((r) => !nextIds.has(r.id)).map((r) => r.id)
  try {
    if (toUpsert.length) {
      const { error } = await supabase
        .from(table)
        .upsert(toUpsert.map((r) => ({ id: r.id, negocio_id: negocioId, data: r })))
      if (error) { console.error('Error guardando en', table, error); reportCloudError(table, 'guardar') }
    }
    if (toDelete.length) {
      const { error } = await supabase.from(table).delete().in('id', toDelete as (string | number)[])
      if (error) { console.error('Error borrando en', table, error); reportCloudError(table, 'borrar') }
    }
  } catch (e) {
    console.error('Error sincronizando', table, e)
    reportCloudError(table, 'sincronizar')
  }
}

/** Colección (una fila por entidad). Misma firma que useState; persiste en Supabase. */
export function useCloudCollection<T extends WithId>(
  table: string,
  negocioId: string | null,
): [T[], (updater: T[] | ((prev: T[]) => T[])) => void, boolean] {
  const [state, setState] = useState<T[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!negocioId) return
    let alive = true
    ;(async () => {
      const { rows, error } = await fetchAllRows<T>(table)
      if (error) { console.error('Error cargando', table, error); reportCloudError(table, 'cargar') }
      if (!alive) return
      setState(rows.map((r) => reviveDates(r)))
      setReady(true)
    })()
    return () => { alive = false }
  }, [table, negocioId])

  // Tiempo real: aplica los cambios de OTROS usuarios al estado local (sin
  // re-sincronizarlos: usamos setState directo, no `set`, para no crear bucles).
  useEffect(() => {
    if (!negocioId) return
    const channel = supabase
      .channel(`rt:${table}:${negocioId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `negocio_id=eq.${negocioId}` },
        (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
          setState((prev) => {
            if (payload.eventType === 'DELETE') {
              const oldId = (payload.old as { id?: string | number }).id
              return oldId == null ? prev : prev.filter((r) => r.id !== oldId)
            }
            const raw = (payload.new as { data?: T }).data
            if (raw == null) return prev
            const row = reviveDates(raw) as T
            return prev.some((r) => r.id === row.id) ? prev.map((r) => (r.id === row.id ? row : r)) : [row, ...prev]
          })
        },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [table, negocioId])

  const set = useCallback(
    (updater: T[] | ((prev: T[]) => T[])) => {
      setState((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: T[]) => T[])(prev) : updater
        if (negocioId) void syncDiff(table, prev, next, negocioId)
        return next
      })
    },
    [table, negocioId],
  )

  return [state, set, ready]
}

/** Singleton por negocio (una sola fila; el valor va en la columna `column`). */
export function useCloudSingleton<T>(
  table: string,
  column: string,
  negocioId: string | null,
  fallback: T,
): [T, (updater: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(fallback)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!negocioId) return
    let alive = true
    ;(async () => {
      const { data, error } = await supabase.from(table).select(column).eq('negocio_id', negocioId).maybeSingle()
      if (error) { console.error('Error cargando', table, error); reportCloudError(table, 'cargar') }
      if (!alive) return
      const val = data ? (data as Record<string, unknown>)[column] : null
      if (val != null) setState(reviveDates(val) as T)
      setReady(true)
    })()
    return () => { alive = false }
  }, [table, column, negocioId])

  const set = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater
        if (negocioId) {
          void supabase
            .from(table)
            .upsert({ negocio_id: negocioId, [column]: next }, { onConflict: 'negocio_id' })
            .then(({ error }: { error: unknown }) => { if (error) { console.error('Error guardando', table, error); reportCloudError(table, 'guardar') } })
        }
        return next
      })
    },
    [table, column, negocioId],
  )

  return [state, set, ready]
}
