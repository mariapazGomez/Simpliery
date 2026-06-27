'use client'

// Verifica que el usuario autenticado tenga una fila en `perfiles`.
// Si no la tiene (registro via email-confirm sin pasar por /auth/callback),
// llama provisionNegocio() y recarga. Esto previene el loading infinito en el dashboard.
import { useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { provisionNegocio } from '@/lib/actions/provision'
import { Icon } from '@/components/icon'

export function PerfilGate({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<'verificando' | 'provisionando' | 'listo'>('verificando')

  useEffect(() => {
    let cancelled = false
    const verificar = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setEstado('listo'); return }

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled) return

      if (!perfil) {
        setEstado('provisionando')
        try {
          await provisionNegocio()
          window.location.reload()
        } catch (e) {
          console.error('Error al provisionar cuenta:', e)
          setEstado('listo')
        }
        return
      }

      setEstado('listo')
    }
    verificar()
    return () => { cancelled = true }
  }, [])

  if (estado !== 'listo') {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--surface-2, #f6f5f1)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--primary-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center' }}>
            <Icon name="store" size={24} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-2)' }}>
            {estado === 'provisionando' ? 'Configurando tu cuenta…' : 'Verificando tu cuenta…'}
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
