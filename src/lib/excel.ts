'use client'

import * as XLSX from 'xlsx'

/** Normaliza clave de columna: sin espacios, minúsculas, sin tildes. */
function norm(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Parsea un archivo .xlsx o .csv y devuelve filas como objetos.
 * Las claves son los encabezados de la primera fila (normalizados).
 */
export function parseExcel(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const wb = XLSX.read(data, { type: 'array', codepage: 65001 })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][]

        if (raw.length < 2) { resolve([]); return }

        // Fila 1 = encabezados normalizados
        const headers = raw[0].map((h) => norm(String(h)))

        const rows: Record<string, string>[] = raw
          .slice(1)
          .map((row) => {
            const obj: Record<string, string> = {}
            headers.forEach((h, i) => { obj[h] = String(row[i] ?? '').trim() })
            return obj
          })
          .filter((r) => Object.values(r).some((v) => v !== ''))

        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Genera y descarga una plantilla Excel con encabezados y una fila de ejemplo.
 * Los encabezados llevan (*) en los campos requeridos.
 */
export function downloadTemplate(
  filename: string,
  headers: string[],
  example: Record<string, string>,
): void {
  const exampleRow = headers.map((h) => example[h.replace(' *', '')] ?? '')
  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow])

  // Ancho de columna automático (mín. 14, máx. 32)
  ws['!cols'] = headers.map((h) => ({
    wch: Math.min(32, Math.max(14, h.length + 2)),
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  XLSX.writeFile(wb, filename)
}
