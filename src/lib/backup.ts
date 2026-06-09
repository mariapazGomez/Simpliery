// ---------- Respaldo / restauración de datos (100% local) ----------
// Exporta e importa TODO lo que la app guarda en localStorage a un archivo .json.
// Guarda los valores en crudo (strings) tal como están en localStorage, para que
// las fechas y demás se reconstruyan igual que en una carga normal (vía el reviver
// de persistence.ts). NUNCA incluye secretos: la app no usa ninguno — solo datos
// de negocio del usuario, y el archivo se descarga a su computador (no se envía).

const PREFIXES = ['cl_', 'fin_']

// Claves de estado efímero que NO deben viajar en un respaldo (p. ej. el borrador
// de carrito de Ventas): se limpian en import/reset, pero no se exportan, para que
// un respaldo no reviva un carrito a medio armar de otra sesión.
const TRANSIENT = ['cl_draft_cart']

export const BACKUP_APP_ID = 'control-local'

export interface Backup {
  app: string
  version: number
  exportedAt: string
  data: Record<string, string>
}

/** Claves de localStorage que pertenecen a la app (prefijo conocido). */
function appKeys(): string[] {
  if (typeof window === 'undefined') return []
  return Object.keys(window.localStorage).filter((k) => PREFIXES.some((p) => k.startsWith(p)))
}

// Tipo mínimo del selector de archivos (File System Access API, Chrome/Edge).
type ShowSaveFilePicker = (options?: {
  suggestedName?: string
  types?: { description?: string; accept: Record<string, string[]> }[]
}) => Promise<{ createWritable: () => Promise<{ write: (data: string | Blob) => Promise<void>; close: () => Promise<void> }> }>

/**
 * Crea un respaldo .json con todos los datos del negocio.
 * En Chrome/Edge abre un selector de carpeta (guarda directo donde elijas);
 * si no está disponible, cae a la descarga clásica (carpeta de Descargas).
 * Devuelve { saved, count }: `saved=false` si el usuario canceló el selector.
 */
export async function exportBackup(): Promise<{ saved: boolean; count: number }> {
  if (typeof window === 'undefined') return { saved: false, count: 0 }
  const keys = appKeys().filter((k) => !TRANSIENT.includes(k))
  const data: Record<string, string> = {}
  for (const k of keys) {
    const v = window.localStorage.getItem(k)
    if (v != null) data[k] = v
  }
  const backup: Backup = { app: BACKUP_APP_ID, version: 1, exportedAt: new Date().toISOString(), data }
  const json = JSON.stringify(backup, null, 2)
  const d = new Date()
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const filename = `control-local-respaldo-${stamp}.json`

  // Opción preferida: selector nativo de carpeta (guarda directo donde elijas).
  const picker = (window as unknown as { showSaveFilePicker?: ShowSaveFilePicker }).showSaveFilePicker
  if (typeof picker === 'function') {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [{ description: 'Respaldo Control Local', accept: { 'application/json': ['.json'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      return { saved: true, count: keys.length }
    } catch (err) {
      // Si el usuario canceló el diálogo, no es un error: no guardamos nada.
      if (err instanceof DOMException && err.name === 'AbortError') return { saved: false, count: keys.length }
      // Cualquier otro fallo → caemos a la descarga clásica de abajo.
    }
  }

  // Fallback: descarga clásica a la carpeta de Descargas.
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return { saved: true, count: keys.length }
}

/**
 * Restaura desde un archivo de respaldo: borra los datos actuales de la app y
 * escribe los del archivo. Devuelve cuántas claves restauró. El llamador debe
 * recargar la página para que los providers vuelvan a leer.
 */
export async function importBackup(file: File): Promise<number> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un respaldo válido (no es un .json legible).')
  }
  const b = parsed as Partial<Backup>
  if (!b || b.app !== BACKUP_APP_ID || typeof b.data !== 'object' || b.data == null) {
    throw new Error('Este archivo no es un respaldo de Control Local.')
  }
  // Limpia solo las claves de la app y reemplaza con las del respaldo.
  for (const k of appKeys()) window.localStorage.removeItem(k)
  let n = 0
  for (const [k, v] of Object.entries(b.data)) {
    if (PREFIXES.some((p) => k.startsWith(p)) && typeof v === 'string') {
      window.localStorage.setItem(k, v)
      n++
    }
  }
  return n
}

/** Borra todos los datos de la app de este navegador (vuelve a los datos de ejemplo al recargar). */
export function resetAll(): void {
  if (typeof window === 'undefined') return
  for (const k of appKeys()) window.localStorage.removeItem(k)
}
