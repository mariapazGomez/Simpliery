'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Crea negocio + perfil + config + categorías + folio para un usuario recién registrado.
 * Idempotente: si el perfil ya existe no hace nada.
 * Reemplaza el trigger handle_new_user() que fue eliminado del schema.
 */
export async function provisionNegocio(params?: { nombre?: string }): Promise<{ ok: true; nuevo: boolean }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('No autenticado')

  // Verificar si ya está provisionado (idempotente)
  const { data: perfilExistente } = await supabase
    .from('perfiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (perfilExistente) return { ok: true, nuevo: false }

  const admin = createAdminClient()

  const displayNombre =
    params?.nombre?.trim() ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.nombre as string | undefined) ||
    user.email?.split('@')[0] ||
    'Usuario'

  // ── ¿Viene de una invitación? ────────────────────────────────────────────
  const { data: inv } = await admin
    .from('invitaciones')
    .select('id, negocio_id, rol')
    .ilike('email', user.email ?? '')
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (inv) {
    await admin.from('perfiles').insert({
      id: user.id,
      negocio_id: inv.negocio_id,
      nombre: displayNombre,
      email: user.email,
      rol: inv.rol,
    })
    await admin.from('invitaciones').update({ estado: 'aceptada' }).eq('id', inv.id)
    return { ok: true, nuevo: true }
  }

  // ── Registro nuevo sin invitación ────────────────────────────────────────
  // Generar código único de 6 chars para el negocio
  const { data: codigoData } = await admin.rpc('generar_codigo_negocio')
  const codigo = codigoData as string | null

  const { data: negocio, error: negocioErr } = await admin
    .from('negocios')
    .insert({ nombre: 'Mi negocio', codigo })
    .select('id')
    .single()

  if (negocioErr || !negocio) throw new Error('Error al crear negocio: ' + negocioErr?.message)

  const nid: string = negocio.id

  await admin.from('perfiles').insert({
    id: user.id,
    negocio_id: nid,
    nombre: displayNombre,
    email: user.email,
    rol: 'admin',
  })

  await admin.rpc('insertar_permisos_default', { p_negocio_id: nid }).throwOnError()

  await admin.from('configuracion').insert({ negocio_id: nid })

  await admin.from('categorias').insert([
    { negocio_id: nid, nombre: 'Abarrotes', orden: 1 },
    { negocio_id: nid, nombre: 'Bebidas',   orden: 2 },
    { negocio_id: nid, nombre: 'Limpieza',  orden: 3 },
    { negocio_id: nid, nombre: 'Otros',     orden: 4 },
  ])

  await admin.from('folios').insert({ negocio_id: nid, ultimo: 0 })

  return { ok: true, nuevo: true }
}
