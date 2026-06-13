// Crear/consultar pedidos en OptiRoute. El token vive SOLO en el servidor
// (variable de entorno OPTIROUTE_TOKEN en Vercel); nunca llega al navegador.
import { NextResponse } from 'next/server'

const BASE = 'https://app.optiroute.cl/api/v1'

function authHeader(): string | null {
  const token = process.env.OPTIROUTE_TOKEN
  return token ? `Token ${token}` : null
}

type ORResp = { id?: number | string; tracking_url?: string; tracking?: string; status?: number; reference?: string }

// POST { pedidos: [...] } → crea cada pedido y devuelve { results: [...] }
export async function POST(request: Request) {
  const auth = authHeader()
  if (!auth) return NextResponse.json({ error: 'OptiRoute no está conectado (falta el token). Conéctalo en Configuración.' }, { status: 400 })

  const body = (await request.json().catch(() => ({}))) as { pedidos?: unknown[] }
  const pedidos = Array.isArray(body.pedidos) ? body.pedidos : []
  if (!pedidos.length) return NextResponse.json({ error: 'Sin pedidos para enviar' }, { status: 400 })

  const results: Array<{ reference?: string; optirouteId?: string; trackingUrl?: string; trackingCode?: string; status?: number; error?: string }> = []
  for (const pedido of pedidos) {
    const reference = (pedido as { reference?: string }).reference
    try {
      const res = await fetch(`${BASE}/integration-service-requests/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify(pedido),
      })
      const data = (await res.json().catch(() => ({}))) as ORResp
      if (!res.ok) {
        results.push({ reference, error: typeof data === 'object' ? JSON.stringify(data).slice(0, 300) : 'error' })
      } else {
        results.push({
          reference: reference ?? data.reference,
          optirouteId: data.id != null ? String(data.id) : undefined,
          trackingUrl: data.tracking_url,
          trackingCode: data.tracking,
          status: typeof data.status === 'number' ? data.status : undefined,
        })
      }
    } catch {
      results.push({ reference, error: 'No se pudo conectar con OptiRoute' })
    }
  }
  return NextResponse.json({ results })
}

// GET ?check=1 → prueba la conexión: ¿el token de Vercel existe y OptiRoute lo acepta?
// GET ?raw=1  → diagnóstico: vuelca el JSON crudo de los últimos pedidos (para ver
//               el formato EXACTO de custom_fields y sus nombres/ids en tu cuenta).
// GET ?id=…   → consulta el estado actual de un pedido en OptiRoute
export async function GET(request: Request) {
  const auth = authHeader()
  const params = new URL(request.url).searchParams

  if (params.get('check')) {
    if (!auth) return NextResponse.json({ conectado: false, motivo: 'Falta la variable OPTIROUTE_TOKEN en Vercel (o falta el Redeploy después de guardarla).' })
    try {
      const res = await fetch(`${BASE}/integration-service-requests/?per_page=1`, { headers: { Authorization: auth } })
      if (res.ok) return NextResponse.json({ conectado: true })
      const data = await res.json().catch(() => ({}))
      return NextResponse.json({ conectado: false, motivo: `OptiRoute rechazó el token (HTTP ${res.status}): ${JSON.stringify(data).slice(0, 200)}` })
    } catch {
      return NextResponse.json({ conectado: false, motivo: 'No se pudo conectar con OptiRoute (¿sin internet o servicio caído?).' })
    }
  }

  // Diagnóstico de solo lectura: devuelve los últimos pedidos tal cual los guarda
  // OptiRoute, para leer la estructura real de `custom_fields` (nombres/ids/valores).
  if (params.get('raw')) {
    if (!auth) return NextResponse.json({ error: 'OptiRoute no está conectado' }, { status: 400 })
    try {
      const res = await fetch(`${BASE}/integration-service-requests/?per_page=3`, { headers: { Authorization: auth } })
      const data = await res.json().catch(() => ({}))
      return NextResponse.json({ ok: res.ok, status: res.status, data })
    } catch {
      return NextResponse.json({ error: 'No se pudo conectar con OptiRoute' }, { status: 502 })
    }
  }

  if (!auth) return NextResponse.json({ error: 'OptiRoute no está conectado' }, { status: 400 })
  const id = params.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  try {
    const res = await fetch(`${BASE}/integration-service-requests/${encodeURIComponent(id)}/`, { headers: { Authorization: auth } })
    if (!res.ok) return NextResponse.json({ error: 'No se pudo consultar el pedido' }, { status: 502 })
    const data = (await res.json().catch(() => ({}))) as ORResp
    return NextResponse.json({ status: data.status, trackingUrl: data.tracking_url, trackingCode: data.tracking })
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con OptiRoute' }, { status: 502 })
  }
}
