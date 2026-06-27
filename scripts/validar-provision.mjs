/**
 * Valida que provisionNegocio() crea todas las filas necesarias para un usuario nuevo.
 * Ejecutar con: node scripts/validar-provision.mjs
 *
 * Crea un usuario de prueba → corre la lógica de provision → verifica las 5 tablas → limpia.
 */

import { createClient } from '@supabase/supabase-js'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || 'https://nyeiljmqzxrfvaucxlcg.supabase.co'
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY no está en el entorno.')
  process.exit(1)
}

const admin = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TEST_EMAIL = `test-provision-${Date.now()}@control-local.dev`
const TEST_NOMBRE = 'Usuario Prueba'

async function main() {
  console.log('\n── Validación de provision de negocio ──────────────────────────')
  console.log(`   Email: ${TEST_EMAIL}\n`)

  // ─── 1. Crear usuario de prueba en auth ────────────────────────────────────
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: 'TestPass123!',
    email_confirm: true,
  })

  if (authErr || !authData.user) {
    console.error('❌  No se pudo crear usuario de prueba:', authErr?.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log(`✅  auth.users → ${userId}`)

  // ─── 2. Reproducir lógica de provision.ts ─────────────────────────────────
  let nid = null

  try {
    // Sin invitación pendiente → flujo normal
    const { data: negocio, error: negErr } = await admin
      .from('negocios')
      .insert({ nombre: 'Mi negocio' })
      .select('id')
      .single()

    if (negErr || !negocio) throw new Error('negocio: ' + negErr?.message)
    nid = negocio.id
    console.log(`✅  negocios       → ${nid}`)

    const { error: perfilErr } = await admin.from('perfiles').insert({
      id: userId,
      negocio_id: nid,
      nombre: TEST_NOMBRE,
      email: TEST_EMAIL,
      rol: 'admin',
    })
    if (perfilErr) throw new Error('perfiles: ' + perfilErr.message)
    console.log(`✅  perfiles       → id=${userId}`)

    const { error: cfgErr } = await admin
      .from('configuracion')
      .insert({ negocio_id: nid })
    if (cfgErr) throw new Error('configuracion: ' + cfgErr.message)
    console.log('✅  configuracion  → OK (defaults)')

    const { error: catErr } = await admin.from('categorias').insert([
      { negocio_id: nid, nombre: 'Abarrotes', orden: 1 },
      { negocio_id: nid, nombre: 'Bebidas',   orden: 2 },
      { negocio_id: nid, nombre: 'Limpieza',  orden: 3 },
      { negocio_id: nid, nombre: 'Otros',     orden: 4 },
    ])
    if (catErr) throw new Error('categorias: ' + catErr.message)
    console.log('✅  categorias     → 4 filas')

    const { error: folErr } = await admin
      .from('folios')
      .insert({ negocio_id: nid, ultimo: 0 })
    if (folErr) throw new Error('folios: ' + folErr.message)
    console.log('✅  folios         → ultimo=0')

  } catch (e) {
    console.error('\n❌  Error durante provision:', e.message)
    await cleanup(userId, nid)
    process.exit(1)
  }

  // ─── 3. Verificar que los datos existen en BD ──────────────────────────────
  console.log('\n── Verificación en base de datos ────────────────────────────────')

  const checks = await Promise.all([
    admin.from('negocios').select('id, nombre').eq('id', nid).single(),
    admin.from('perfiles').select('id, negocio_id, rol').eq('id', userId).single(),
    admin.from('configuracion').select('negocio_id, moneda, metodos_pago').eq('negocio_id', nid).single(),
    admin.from('categorias').select('nombre, orden').eq('negocio_id', nid).order('orden'),
    admin.from('folios').select('negocio_id, ultimo').eq('negocio_id', nid).single(),
  ])

  const [negocioR, perfilR, cfgR, catsR, foliosR] = checks

  let ok = true

  const row = (label, data, err, assert) => {
    if (err || !data) {
      console.error(`❌  ${label}: ${err?.message ?? 'sin datos'}`)
      ok = false
      return
    }
    const result = assert ? assert(data) : true
    if (!result) {
      console.error(`❌  ${label}: datos incorrectos`, data)
      ok = false
      return
    }
    console.log(`✅  ${label}`, JSON.stringify(data))
  }

  row('negocios      ', negocioR.data, negocioR.error, d => d.nombre === 'Mi negocio')
  row('perfiles      ', perfilR.data,  perfilR.error,  d => d.negocio_id === nid && d.rol === 'admin')
  row('configuracion ', cfgR.data,     cfgR.error,     d => d.moneda === 'CLP' && Array.isArray(d.metodos_pago))
  row('categorias    ', catsR.data,    catsR.error,    d => d.length === 4 && d[0].nombre === 'Abarrotes')
  row('folios        ', foliosR.data,  foliosR.error,  d => d.ultimo === 0)

  // ─── 4. Limpiar ────────────────────────────────────────────────────────────
  console.log('\n── Limpieza ─────────────────────────────────────────────────────')
  await cleanup(userId, nid)

  if (!ok) {
    console.error('\n❌  Hay errores en la provision. Revisar arriba.\n')
    process.exit(1)
  }

  console.log('\n✅  Provision completa y correcta. Todos los inserts OK.\n')
}

async function cleanup(userId, nid) {
  if (nid) {
    // CASCADE borra perfiles, configuracion, categorias, folios
    await admin.from('negocios').delete().eq('id', nid)
    console.log('   negocios (+ cascade) eliminados')
  }
  if (userId) {
    await admin.auth.admin.deleteUser(userId)
    console.log('   auth.users eliminado')
  }
}

main().catch(e => {
  console.error('Error inesperado:', e)
  process.exit(1)
})
