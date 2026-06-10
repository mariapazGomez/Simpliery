// Obtener token de OptiRoute (una sola vez). Recibe usuario+clave, llama a
// api-token-auth y devuelve el token para pegarlo en Vercel (OPTIROUTE_TOKEN).
// Las credenciales NO se guardan en ningún lado.
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string }
  if (!body.username || !body.password) {
    return NextResponse.json({ error: 'Faltan usuario y contraseña' }, { status: 400 })
  }
  try {
    const res = await fetch('https://app.optiroute.cl/api-token-auth/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: body.username, password: body.password }),
    })
    const data = (await res.json().catch(() => ({}))) as { token?: string }
    if (!res.ok || !data.token) {
      return NextResponse.json({ error: 'Credenciales inválidas o error de OptiRoute' }, { status: 400 })
    }
    return NextResponse.json({ token: data.token })
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con OptiRoute' }, { status: 502 })
  }
}
