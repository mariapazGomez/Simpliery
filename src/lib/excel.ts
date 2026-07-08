'use client'

import * as XLSX from 'xlsx'

/* ── Tipos mínimos para exportar ventas (sin importar del hook) ── */
interface ItemExport {
  nombre: string
  categoria: string
  qty: number
  precio: number
  costo: number
}
interface VentaExport {
  boleta: number
  created_at: string
  tipo: string
  metodo_pago: string
  total: number
  descuento_monto: number | null
  cliente_snapshot: {
    nombre?: string; ciudad?: string
    telefono?: string; numero?: string; correo?: string
  } | null
  items: ItemExport[]
}

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

/* ─────────── Exportar ventas ─────────── */

function fmtFechaExport(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${d.getFullYear()}`
}

function fmtHoraExport(d: Date): string {
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h < 12 ? 'a. m.' : 'p. m.'
  const h12 = h % 12 || 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
}

export function exportVentasExcel(ventas: VentaExport[], filename = 'ventas.xlsx'): void {
  const rows: Record<string, unknown>[] = []

  for (const v of ventas) {
    const d = new Date(v.created_at)
    const fecha = fmtFechaExport(d)
    const hora = fmtHoraExport(d)
    const cliente = v.cliente_snapshot
    const descuento = v.descuento_monto ?? 0

    const itemsToRender = v.items.length > 0 ? v.items : [null]

    for (const item of itemsToRender) {
      const totalItem = item ? item.precio * item.qty : 0
      const costoItem = item ? item.costo * item.qty : 0
      rows.push({
        'Boleta': v.boleta,
        'Fecha': fecha,
        'Hora': hora,
        'Categoría': item?.categoria ?? '',
        'Producto': item?.nombre ?? '',
        'Cantidad': item?.qty ?? 0,
        'Precio Unitario': item?.precio ?? 0,
        'Total Item': totalItem,
        'Costo Item': costoItem,
        'Ganancia Item': totalItem - costoItem,
        'Método Pago': v.metodo_pago,
        'Tipo Venta': v.tipo,
        'Cliente': cliente?.nombre ?? '',
        'Ciudad': cliente?.ciudad ?? '',
        'Teléfono': cliente?.telefono ?? cliente?.numero ?? '',
        'Correo': cliente?.correo ?? '',
        'Descuento Boleta': descuento,
        'Total Boleta': v.total,
      })
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 9 },  // Boleta
    { wch: 12 }, // Fecha
    { wch: 12 }, // Hora
    { wch: 14 }, // Categoría
    { wch: 28 }, // Producto
    { wch: 10 }, // Cantidad
    { wch: 15 }, // Precio Unitario
    { wch: 12 }, // Total Item
    { wch: 12 }, // Costo Item
    { wch: 14 }, // Ganancia Item
    { wch: 14 }, // Método Pago
    { wch: 11 }, // Tipo Venta
    { wch: 22 }, // Cliente
    { wch: 14 }, // Ciudad
    { wch: 14 }, // Teléfono
    { wch: 24 }, // Correo
    { wch: 16 }, // Descuento Boleta
    { wch: 13 }, // Total Boleta
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas')
  XLSX.writeFile(wb, filename)
}
