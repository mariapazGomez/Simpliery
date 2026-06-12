'use client'

// ---------- Login / Registro (Supabase Auth) ----------
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/components/icon'

type Mode = 'login' | 'signup'

function mensajeError(e: unknown): string {
  const m = (e instanceof Error ? e.message : String(e)).toLowerCase()
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (m.includes('already registered') || m.includes('already exists')) return 'Ese correo ya tiene una cuenta. Inicia sesión.'
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'El correo no es válido.'
  if (m.includes('email not confirmed')) return 'Debes confirmar tu correo antes de entrar.'
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
  return 'No se pudo completar. Revisa tus datos e inténtalo de nuevo.'
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Si Google OAuth falló, el callback vuelve con ?error=google — mostramos el aviso.
  const [err, setErr] = useState<string | null>(() =>
    typeof window !== 'undefined' && window.location.search.includes('error=google')
      ? 'No se pudo iniciar sesión con Google. Inténtalo de nuevo o entra con tu correo.'
      : null,
  )
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    setLoading(true)
    const supabase = createClient()
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { nombre: nombre.trim() } },
        })
        if (error) throw error
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setMsg('Cuenta creada. Te enviamos un correo: confírmalo y luego inicia sesión aquí.')
          setMode('login')
          return
        }
        router.replace('/dashboard')
        router.refresh()
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        router.replace('/dashboard')
        router.refresh()
      }
    } catch (e2) {
      setErr(mensajeError(e2))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20, background: 'var(--surface-2, #f6f5f1)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
              <Icon name="store" size={24} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Control Local</h1>
            <p style={{ fontSize: 13.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 4 }}>
              {mode === 'login' ? 'Entra a tu negocio' : 'Crea la cuenta de tu negocio'}
            </p>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)' }}>Tu nombre</label>
                <input className="input" style={{ marginTop: 5 }} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Marta" autoComplete="name" />
              </div>
            )}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)' }}>Correo</label>
              <input className="input" style={{ marginTop: 5 }} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.cl" autoComplete="email" />
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)' }}>Contraseña</label>
              <input className="input" style={{ marginTop: 5 }} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>

            {err && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', background: 'var(--danger-tint)', padding: '9px 12px', borderRadius: 9 }}>{err}</div>}
            {msg && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-700)', background: 'var(--primary-tint)', padding: '9px 12px', borderRadius: 9 }}>{msg}</div>}

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />o<div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          <button
            type="button"
            onClick={async () => {
              setErr(null)
              const supabase = createClient()
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/auth/callback` },
              })
              if (error) setErr('No se pudo iniciar con Google. Inténtalo de nuevo.')
            }}
            className="btn"
            style={{ width: '100%', justifyContent: 'center', gap: 10, background: '#fff', border: '1px solid var(--line)', color: 'var(--ink)', fontWeight: 700 }}
          >
            <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
            </svg>
            Continuar con Google
          </button>

          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>
            {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr(null); setMsg(null) }}
              style={{ background: 'none', border: 'none', color: 'var(--primary-700)', fontWeight: 800, cursor: 'pointer', padding: 0 }}
            >
              {mode === 'login' ? 'Crear una' : 'Entrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
