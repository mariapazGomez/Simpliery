'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface CreateEmpleadoParams {
  nombre: string
  username: string
  pin: string
  rol: string
  sucursalId?: string | null
}

export async function createEmpleado(params: CreateEmpleadoParams): Promise<{ ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('negocio_id, rol')
    .eq('id', user.id)
    .single()

  if (!perfil) throw new Error('Perfil no encontrado')
  const p = perfil as { negocio_id: string; rol: string }
  if (p.rol !== 'admin') throw new Error('Solo el administrador puede crear empleados')

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id, codigo')
    .eq('id', p.negocio_id)
    .single()

  if (!negocio) throw new Error('Negocio no encontrado')
  const n = negocio as { id: string; codigo: string | null }
  if (!n.codigo) throw new Error('El negocio no tiene código. Ejecuta el SQL rbac_empleados.sql primero.')

  const usernameNorm = params.username.trim().toLowerCase()
  const syntheticEmail = `${usernameNorm}@${n.codigo.toLowerCase()}.controllocal`

  const { data: existente } = await supabase
    .from('perfiles')
    .select('id')
    .eq('negocio_id', n.id)
    .ilike('username', usernameNorm)
    .maybeSingle()

  if (existente) throw new Error('Ese nombre de usuario ya está en uso')

  const admin = createAdminClient()

  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password: params.pin,
    email_confirm: true,
    user_metadata: { nombre: params.nombre.trim() },
  })

  if (authErr || !authUser.user) {
    throw new Error('No se pudo crear la cuenta: ' + (authErr?.message ?? 'error desconocido'))
  }

  const { error: perfilErr } = await admin.from('perfiles').insert({
    id:          authUser.user.id,
    negocio_id:  n.id,
    nombre:      params.nombre.trim(),
    email:       syntheticEmail,
    rol:         params.rol,
    username:    usernameNorm,
    sucursal_id: params.sucursalId || null,
    activo:      true,
  })

  if (perfilErr) {
    await admin.auth.admin.deleteUser(authUser.user.id)
    throw new Error('No se pudo crear el perfil: ' + perfilErr.message)
  }

  return { ok: true }
}

export async function deleteEmpleado(empleadoId: string): Promise<{ ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!perfil || (perfil as { rol: string }).rol !== 'admin') {
    throw new Error('Sin permisos')
  }

  const admin = createAdminClient()
  await admin.from('perfiles').delete().eq('id', empleadoId)
  await admin.auth.admin.deleteUser(empleadoId)

  return { ok: true }
}

export async function updateEmpleadoRol(
  empleadoId: string,
  nuevoRol: string,
): Promise<{ ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!perfil || (perfil as { rol: string }).rol !== 'admin') {
    throw new Error('Sin permisos')
  }

  const { error } = await supabase
    .from('perfiles')
    .update({ rol: nuevoRol })
    .eq('id', empleadoId)

  if (error) throw new Error('No se pudo actualizar el rol: ' + error.message)
  return { ok: true }
}
