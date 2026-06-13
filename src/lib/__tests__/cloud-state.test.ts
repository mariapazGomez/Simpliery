// Tests de reviveDates: TODO lo que vuelve de la nube (carga inicial y eventos
// realtime) pasa por aquí — si una fecha no revive, la app revienta al hacer
// .toLocaleDateString() sobre un string.
import { describe, it, expect } from 'vitest'
import { reviveDates } from '@/lib/supabase/cloud-state'

describe('reviveDates — fechas de la nube vuelven como Date', () => {
  it('convierte strings ISO a Date (lo que produce JSON.stringify de un Date)', () => {
    const iso = new Date(2026, 5, 12, 14, 30).toISOString()
    const out = reviveDates<unknown>(iso)
    expect(out).toBeInstanceOf(Date)
    expect((out as Date).toISOString()).toBe(iso)
  })

  it('revive fechas anidadas en objetos y arreglos (ventas con pagos[])', () => {
    const venta = {
      id: 'b1',
      date: new Date().toISOString(),
      pagos: [{ fecha: new Date().toISOString(), monto: 5000 }],
      items: [{ name: 'x', qty: 1 }],
    }
    const out = reviveDates(venta)
    expect(out.date).toBeInstanceOf(Date)
    expect(out.pagos[0].fecha).toBeInstanceOf(Date)
    expect(out.pagos[0].monto).toBe(5000)
    expect(out.items[0].name).toBe('x')
  })

  it('NO toca strings normales, números, booleanos ni null', () => {
    expect(reviveDates('Huevo Docena')).toBe('Huevo Docena')
    expect(reviveDates('12-06-2026')).toBe('12-06-2026') // formato no-ISO se respeta
    expect(reviveDates(46224)).toBe(46224)
    expect(reviveDates(true)).toBe(true)
    expect(reviveDates(null)).toBeNull()
  })
})
