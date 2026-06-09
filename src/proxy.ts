// Next 16: el antiguo `middleware` ahora se llama `proxy`. Corre antes de cada
// request. Aquí refresca la sesión de Supabase y protege las rutas del dashboard.
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy-session'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Corre en todas las rutas excepto estáticos, imágenes y assets de la PWA
  // (manifiesto, service worker e íconos) — deben servirse sin sesión para
  // poder instalar la app desde la pantalla de login.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
