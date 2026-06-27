// Callback de OAuth (Google) y confirmación de email.
// Intercambia el code por sesión, provisiona el negocio si es nuevo, y redirige.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { provisionNegocio } from '@/lib/actions/provision'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await provisionNegocio()
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocal = process.env.NODE_ENV === 'development'
      if (isLocal) return NextResponse.redirect(`${origin}${next}`)
      if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${next}`)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Falló el intercambio → de vuelta al login con aviso.
  return NextResponse.redirect(`${origin}/login?error=google`)
}
