'use client'

// ---------- Persistencia: auto-guardado de estado en localStorage ----------
// Portado de persistence.jsx. Con guarda SSR: en el servidor no hay localStorage.

import { useState, useCallback, useEffect } from 'react'

const isBrowser = typeof window !== 'undefined'

/** Revive fechas ISO al deserializar JSON. */
const dateReviver = (_k: string, v: unknown): unknown => {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v)
  return v
}

export function lsGet<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw, dateReviver) as T) : fallback
  } catch {
    return fallback
  }
}

export function lsSet(key: string, val: unknown): void {
  if (!isBrowser) return
  try {
    window.localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* almacenamiento lleno o no disponible */
  }
}

type Updater<T> = T | ((prev: T) => T)

/**
 * Hook tipo useState que persiste el valor en localStorage.
 * En SSR usa el valor inicial; al hidratar en el cliente lee de localStorage.
 */
export function usePersisted<T>(
  key: string,
  init: T | (() => T),
): [T, (updater: Updater<T>) => void] {
  const [state, setState] = useState<T>(() => {
    const initial = typeof init === 'function' ? (init as () => T)() : init
    return lsGet<T>(key, initial)
  })

  // Write-through del valor inicial: si la clave aún no existe en localStorage,
  // persistimos la semilla en el primer montaje. Así un respaldo captura TODOS
  // los datos (no solo lo que el usuario ya modificó) y el estado es predecible.
  useEffect(() => {
    if (isBrowser && window.localStorage.getItem(key) === null) lsSet(key, state)
    // Solo al montar (por clave): `state` es el valor inicial resuelto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const set = useCallback(
    (updater: Updater<T>) => {
      setState((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater
        lsSet(key, next)
        return next
      })
    },
    [key],
  )

  return [state, set]
}
