'use client'

// ---------- Respaldo / restauración / reinicio contra la NUBE ----------
// Reemplaza a las operaciones sobre localStorage (que ya no es la fuente de datos).
// El respaldo descarga un .json con todos los datos del negocio desde Supabase.
import { createClient } from '@/lib/supabase/client'
import { fetchAllRows } from '@/lib/supabase/cloud-state'

const supabase = createClient()

const COLLECTION_TABLES = [
  'productos', 'ventas', 'clientes', 'movimientos', 'gastos', 'nomina',
  'marketing', 'metas', 'creditos', 'proveedores', 'cierres',
  'despachos', 'formatos', 'recordatorios', 'notif_config',
] as const

type RowObj = Record<string, unknown> & { id?: string | number }

export interface CloudBackup {
  app: 'control-local'
  version: number
  exportedAt: string
  collections: Record<string, unknown[]>
  configuracion: unknown
  categorias: unknown
}

function descargar(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Descarga un .json con TODOS los datos del negocio (desde la nube). Devuelve el conteo. */
export async function exportCloudBackup(): Promise<number> {
  const collections: Record<string, unknown[]> = {}
  let count = 0
  for (const t of COLLECTION_TABLES) {
    // Paginado: sin esto, tablas con más de 1000 filas quedarían cortadas en el respaldo.
    const { rows, error } = await fetchAllRows<unknown>(t)
    if (error) throw new Error(`${t}: ${error}`)
    collections[t] = rows
    count += rows.length
  }
  const { data: cfg } = await supabase.from('configuracion').select('data').maybeSingle()
  const { data: cat } = await supabase.from('categorias').select('lista').maybeSingle()
  const backup: CloudBackup = {
    app: 'control-local',
    version: 2,
    exportedAt: new Date().toISOString(),
    collections,
    configuracion: (cfg as { data: unknown } | null)?.data ?? null,
    categorias: (cat as { lista: unknown } | null)?.lista ?? null,
  }
  const d = new Date()
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  descargar(`control-local-respaldo-${stamp}.json`, JSON.stringify(backup, null, 2))
  return count
}

/** Borra TODOS los datos de negocio del negocio actual en la nube (RLS lo limita a tu negocio). */
export async function resetCloud(): Promise<void> {
  for (const t of COLLECTION_TABLES) {
    const { error } = await supabase.from(t).delete().not('id', 'is', null)
    if (error) throw new Error(`${t}: ${error.message}`)
  }
}

async function upsertRows(table: string, arr: unknown, negocioId: string): Promise<number> {
  if (!Array.isArray(arr)) return 0
  const rows = (arr as RowObj[])
    .filter((r) => r && r.id != null)
    .map((r) => ({ id: r.id as string | number, negocio_id: negocioId, data: r }))
  // Por lotes: una restauración grande (miles de filas) en un solo request puede
  // exceder el límite de tamaño del API.
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + 500))
    if (error) throw new Error(`${table}: ${error.message}`)
  }
  return rows.length
}

/** Restaura un respaldo en la nube. Acepta el formato de nube (v2) y el antiguo de localStorage (v1). */
export async function importCloudBackup(file: File, negocioId: string): Promise<number> {
  const text = await file.text()
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un respaldo válido (.json).')
  }
  if (!parsed || parsed.app !== 'control-local') throw new Error('Este archivo no es un respaldo de Control Local.')

  let count = 0

  if (parsed.collections && typeof parsed.collections === 'object') {
    // Formato v2 (nube)
    const cols = parsed.collections as Record<string, unknown>
    for (const t of COLLECTION_TABLES) count += await upsertRows(t, cols[t], negocioId)
    if (parsed.configuracion) {
      const { error } = await supabase.from('configuracion').upsert({ negocio_id: negocioId, data: parsed.configuracion }, { onConflict: 'negocio_id' })
      if (error) throw new Error(`configuracion: ${error.message}`)
    }
    if (Array.isArray(parsed.categorias)) {
      const { error } = await supabase.from('categorias').upsert({ negocio_id: negocioId, lista: parsed.categorias }, { onConflict: 'negocio_id' })
      if (error) throw new Error(`categorias: ${error.message}`)
    }
  } else if (parsed.data && typeof parsed.data === 'object') {
    // Formato v1 (localStorage): { data: { cl_products: "<json>", ... } }
    const data = parsed.data as Record<string, string>
    const map: Record<string, string> = {
      cl_products: 'productos', cl_sales: 'ventas', cl_clientes: 'clientes', cl_movements: 'movimientos',
      cl_gastos: 'gastos', cl_nomina: 'nomina', cl_marketing: 'marketing', cl_metas: 'metas',
      cl_creditos: 'creditos', cl_proveedores: 'proveedores', cl_cierres: 'cierres',
    }
    for (const [key, t] of Object.entries(map)) {
      const raw = data[key]
      if (!raw) continue
      try { count += await upsertRows(t, JSON.parse(raw), negocioId) } catch { /* ignora claves corruptas */ }
    }
    if (data.cl_settings) {
      try {
        const s = JSON.parse(data.cl_settings)
        await supabase.from('configuracion').upsert({ negocio_id: negocioId, data: s }, { onConflict: 'negocio_id' })
      } catch { /* */ }
    }
    if (data.cl_categorias) {
      try {
        const l = JSON.parse(data.cl_categorias)
        if (Array.isArray(l)) await supabase.from('categorias').upsert({ negocio_id: negocioId, lista: l }, { onConflict: 'negocio_id' })
      } catch { /* */ }
    }
  } else {
    throw new Error('Formato de respaldo no reconocido.')
  }

  return count
}
