// Tests del enlace con OptiRoute: el pedido que viaja debe llevar TODOS los
// datos del despacho (cliente, dirección, depto, teléfono, correo) + el detalle
// de productos y precios, y los estados de OptiRoute deben mapear a los locales.
import { describe, it, expect } from 'vitest'
import { despachoToPedido, optirouteStatusToEstado } from '@/lib/optiroute'
import type { Despacho } from '@/types'

const mkDespacho = (p: Partial<Despacho> = {}): Despacho => ({
  id: 'desp_b46224',
  saleId: 'b46224',
  boleta: 46224,
  fecha: new Date(),
  cliente: 'Lukas Garcia',
  telefono: '9 9519 4321',
  correo: 'cliente@mail.cl',
  direccion: 'Av. Borgoño 14580',
  depto: 'Depto 1003',
  ciudad: 'Viña del Mar',
  nota: '',
  repartidor: 'Sin asignar',
  estado: 'pendiente',
  items: [
    { productId: 1, name: 'Huevo Docena', cat: 'Huevos', qty: 2, price: 7000, cost: 5000 },
    { productId: 2, name: 'Almendras 250g', cat: 'Frutos secos', qty: 1, price: 4500, cost: 3000 },
  ],
  total: 18500,
  method: 'Transferencia',
  ...p,
})

describe('despachoToPedido — lo que viaja a OptiRoute', () => {
  it('lleva cliente, teléfono (sin espacios), correo, dirección, comuna y depto', () => {
    const ped = despachoToPedido(mkDespacho())
    expect(ped.reference).toBe('b46224')
    expect(ped.customer.name).toBe('Lukas Garcia')
    expect(ped.customer.phone_number).toBe('995194321')
    expect(ped.customer.email).toBe('cliente@mail.cl')
    expect(ped.address.address_string).toBe('Av. Borgoño 14580')
    expect(ped.address.commune_string).toBe('Viña del Mar')
    expect(ped.address.apartment_number).toBe('Depto 1003')
  })

  it('descripción compacta separada por comas (para "Texto en columnas"): NxProducto + total al final', () => {
    const info = despachoToPedido(mkDespacho()).address.address_more_info || ''
    expect(info).toBe('2xHuevo Docena,1xAlmendras 250g,18500')
    // total como número plano (sin $ ni puntos) → Excel lo lee como número
    expect(info.endsWith(',18500')).toBe(true)
    // sin espacios sobrantes tras la coma ni tras el "x"
    expect(info).not.toContain(', ')
    expect(info).not.toContain('x ')
  })

  it('limpia comas dentro del nombre del producto para no romper el separador', () => {
    const info = despachoToPedido(mkDespacho({ items: [{ productId: 9, name: 'Pack surtido, especial', cat: 'Otros', qty: 1, price: 5000, cost: 3000 }], total: 5000 })).address.address_more_info || ''
    expect(info).toBe('1xPack surtido especial,5000')
  })

  it('pedido grande: incluye TODOS los productos y el total al final (no recorta)', () => {
    const muchos = Array.from({ length: 12 }, (_, i) => ({ productId: i, name: `Producto ${i}`, cat: 'Otros', qty: 2, price: 1000, cost: 600 }))
    const info = despachoToPedido(mkDespacho({ items: muchos, total: 24000 })).address.address_more_info || ''
    expect((info.match(/xProducto/g) || []).length).toBe(12) // están los 12
    expect(info.endsWith(',24000')).toBe(true)
  })

  it('demand_a = bultos (suma de cantidades) y NUNCA custom_fields (la API lo rechaza: espera lista, no dict)', () => {
    const ped = despachoToPedido(mkDespacho())
    expect(ped.customer.demand_a).toBe(3)
    expect(ped).not.toHaveProperty('custom_fields')
  })

  it('omite los campos opcionales vacíos (correo/depto/teléfono) en vez de mandar ""', () => {
    const ped = despachoToPedido(mkDespacho({ correo: '', depto: undefined, telefono: '' }))
    expect(ped.customer).not.toHaveProperty('email')
    expect(ped.customer).not.toHaveProperty('phone_number')
    expect(ped.address).not.toHaveProperty('apartment_number')
  })

  it('demand_a mínimo 1 aunque la venta sea fraccionada (granel)', () => {
    const ped = despachoToPedido(mkDespacho({ items: [{ productId: 3, name: 'Nueces · 350 g', cat: 'Frutos secos', qty: 1, price: 4200, cost: 2800, formatId: 'granel:1', baseUnitsPerItem: 0.35 }] }))
    expect(ped.customer.demand_a).toBeGreaterThanOrEqual(1)
  })
})

describe('optirouteStatusToEstado — estados OptiRoute → locales', () => {
  it('mapea cada estado al chip correcto', () => {
    expect(optirouteStatusToEstado(3)).toBe('entregado') // DELIVERED
    expect(optirouteStatusToEstado(2)).toBe('en_ruta') // ONGOING
    expect(optirouteStatusToEstado(4)).toBe('en_ruta') // ARRIVED
    expect(optirouteStatusToEstado(6)).toBe('en_ruta') // ONROUTE
    expect(optirouteStatusToEstado(5)).toBe('no_entregado') // SKIPPED
    expect(optirouteStatusToEstado(-1)).toBe('no_entregado') // CANCELLED
    expect(optirouteStatusToEstado(0)).toBe('pendiente') // REVIEWING
    expect(optirouteStatusToEstado(1)).toBe('pendiente') // SCHEDULED
    expect(optirouteStatusToEstado(null)).toBe('pendiente')
    expect(optirouteStatusToEstado(undefined)).toBe('pendiente')
  })
})
