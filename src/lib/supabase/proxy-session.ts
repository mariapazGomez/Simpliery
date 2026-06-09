// Refresca la sesión de Supabase en cada request y protege las rutas.
// Patrón oficial de @supabase/ssr adaptado al `proxy` de Next 16.
// IMPORTANTE: no meter lógica entre createServerClient y getUser(), y devolver
// SIEMPRE el `response` que lleva las cookies actualizadas (salvo redirect).
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Rutas accesibles sin sesión. (/auth/* = callback de OAuth, debe entrar sin sesión aún) */
const PUBLIC_PATHS = ['/login', '/auth']

function isPublic(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'))
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Sin sesión y ruta protegida → al login.
  if (!user && !isPublic(path)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Con sesión y en el login → directo al dashboard.
  if (user && isPublic(path)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}
