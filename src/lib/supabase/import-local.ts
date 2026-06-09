'use client'

// ---------- Migración única: sube los datos de localStorage a la nube ----------
// Lee lo que la app guardaba en este navegador (cl_*) y lo inserta en las tablas
// de Supabase del negocio actual. Sirve para no perder lo trabajado al pasar a la nube.
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

/** [clave en localStorage, tabla de colección en Supabase] */
const COLLECTIONS: [string, string][] = [
  ['cl_products', 'productos'],
  ['cl_sales', 'ventas'],
  ['cl_clientes', 'clientes'],
  ['cl_movements', 'movimientos'],
  ['cl_gastos', 'gastos'],
  ['cl_nomina', 'nomina'],
  ['cl_marketing', 'marketing'],
  ['cl_metas', 'metas'],
  ['cl_creditos', 'creditos'],
  ['cl_proveedores', 'proveedores'],
  ['cl_cierres', 'cierres'],
]

type Row = Record<string, unknown> & { id?: string | number }

function readArray(key: string): Row[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const v = JSON.parse(raw)
    return Array.isArray(v) ? (v as Row[]) : null
  } catch {
    return null
  }
}

/** ¿Hay datos locales que valga la pena subir? */
export function hasLocalData(): boolean {
  return COLLECTIONS.some(([key]) => {
    const a = readArray(key)
    return !!(a && a.length)
  })
}

/** Sube todo lo local a la nube del negocio. Devuelve el conteo por tabla. */
export async function importLocalToCloud(negocioId: string): Promise<{ table: string; count: number }[]> {
  const result: { table: string; count: number }[] = []

  for (const [key, table] of COLLECTIONS) {
    const arr = readArray(key)
    if (!arr || !arr.length) continue
    const rows = arr
      .filter((r) => r && r.id != null)
      .map((r) => ({ id: r.id as string | number, negocio_id: negocioId, data: r }))
    if (!rows.length) continue
    const { error } = await supabase.from(table).upsert(rows)
    if (error) throw new Error(`${table}: ${error.message}`)
    result.push({ table, count: rows.length })
  }

  // Singleton: configuración
  const rawSet = typeof window !== 'undefined' ? window.localStorage.getItem('cl_settings') : null
  if (rawSet) {
    const settings = JSON.parse(rawSet)
    const { error } = await supabase
      .from('configuracion')
      .upsert({ negocio_id: negocioId, data: settings }, { onConflict: 'negocio_id' })
    if (error) throw new Error(`configuracion: ${error.message}`)
    result.push({ table: 'configuracion', count: 1 })
  }

  // Singleton: categorías
  const rawCat = typeof window !== 'undefined' ? window.localStorage.getItem('cl_categorias') : null
  if (rawCat) {
    const lista = JSON.parse(rawCat)
    if (Array.isArray(lista)) {
      const { error } = await supabase
        .from('categorias')
        .upsert({ negocio_id: negocioId, lista }, { onConflict: 'negocio_id' })
      if (error) throw new Error(`categorias: ${error.message}`)
      result.push({ table: 'categorias', count: lista.length })
    }
  }

  return result
}
