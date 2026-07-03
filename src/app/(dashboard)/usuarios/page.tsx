'use client'

// ---------- Usuarios: gestión de empleados del negocio ----------
// Empleados se crean directamente con usuario+PIN, sin correo personal.
// El login usa código de tienda + usuario + PIN.
import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { NAV_GROUPS } from '@/lib/nav'
import { SECCIONES_POR_ROL, VER_DINERO_DEFAULT, ROLES_CONFIGURABLES } from '@/lib/permisos'
import { Icon } from '@/components/icon'
import { PageHeader, Metric, Modal, Field } from '@/components/ui'
import { createEmpleado, deleteEmpleado, updateEmpleadoRol } from '@/lib/actions/empleados'
import type { RolPermiso } from '@/types'

const supabase = createClient()

interface RolDef { label: string; color: string; tint: string; desc: string }
export const ROLES: Record<string, RolDef> = {
  admin:    { label: 'Administrador', color: 'var(--primary-700)', tint: 'var(--primary-tint)',    desc: 'Acceso total al negocio' },
  vendedor: { label: 'Vendedor',      color: 'var(--terra-700)',   tint: 'var(--terra-tint)',      desc: 'Solo vender y clientes' },
  bodega:   { label: 'Bodega',        color: 'var(--info)',        tint: 'var(--info-tint)',        desc: 'Stock, productos y despachos' },
  contador: { label: 'Contador',      color: 'oklch(0.50 0.10 70)', tint: 'var(--warn-tint)',     desc: 'Finanzas y reportes' },
}
const ROL_LIST = Object.keys(ROLES)

interface Perfil {
  id:          string
  nombre:      string | null
  email:       string | null
  username:    string | null
  rol:         string
  activo:      boolean
  sucursal_id: string | null
}

function RolBadge({ rol }: { rol: string }) {
  const r = ROLES[rol] || ROLES.vendedor
  return <span className="chip" style={{ background: r.tint, color: r.color, fontWeight: 800, fontSize: 12.5 }}>{r.label}</span>
}

function RolPicker({ value, onChange }: { value: string; onChange: (r: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
      {ROL_LIST.map((id) => {
        const r = ROLES[id]
        const on = value === id
        return (
          <button key={id} type="button" onClick={() => onChange(id)} className="btn" style={{ flexDirection: 'column', gap: 3, height: 62, padding: '9px 8px', fontSize: 12.5, border: '1px solid ' + (on ? r.color : 'var(--line)'), background: on ? r.tint : 'var(--surface)', color: on ? r.color : 'var(--ink-2)' }}>
            <span style={{ fontWeight: 800, fontSize: 13.5 }}>{r.label}</span>
            <span style={{ fontSize: 11, opacity: 0.85, lineHeight: 1.2 }}>{r.desc}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Modal crear empleado ──────────────────────────────────────────────────────
function CrearEmpleadoModal({ negocioId, onClose, onCreated }: { negocioId: string; onClose: () => void; onCreated: () => void }) {
  const [nombre,   setNombre]   = useState('')
  const [username, setUsername] = useState('')
  const [pin,      setPin]      = useState('')
  const [pinConf,  setPinConf]  = useState('')
  const [rol,      setRol]      = useState('vendedor')
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState<string | null>(null)

  const valido = nombre.trim().length >= 2
    && username.trim().length >= 2
    && pin.length >= 4
    && pin === pinConf

  const crear = async () => {
    if (!valido || saving) return
    setSaving(true)
    setErr(null)
    try {
      await createEmpleado({ nombre, username, pin, rol })
      onCreated()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al crear empleado')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Agregar empleado"
      sub="El empleado inicia sesión con su usuario y PIN — sin correo."
      onClose={onClose}
      width={540}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valido || saving} onClick={crear}>
            <Icon name="plus" size={16} />
            {saving ? 'Creando…' : 'Crear empleado'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Nombre completo">
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: María González" autoFocus />
        </Field>

        <Field label="Nombre de usuario" hint="Solo minúsculas y sin espacios. Se usa para iniciar sesión.">
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
            placeholder="Ej: maria"
            autoCapitalize="none"
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="PIN (mínimo 4 dígitos)" hint="El empleado lo usará para entrar.">
            <input className="input" type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" />
          </Field>
          <Field label="Confirmar PIN">
            <input className="input" type="password" value={pinConf} onChange={(e) => setPinConf(e.target.value)} placeholder="••••" />
          </Field>
        </div>
        {pin.length > 0 && pinConf.length > 0 && pin !== pinConf && (
          <div style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 600 }}>Los PINs no coinciden</div>
        )}

        <Field label="¿Qué podrá hacer? (rol)">
          <RolPicker value={rol} onChange={setRol} />
        </Field>

        {err && (
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', background: 'var(--danger-tint)', padding: '9px 12px', borderRadius: 9 }}>
            {err}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Modal cambiar rol ─────────────────────────────────────────────────────────
function EditRolModal({ perfil, onClose, onSave }: { perfil: Perfil; onClose: () => void; onSave: (id: string, rol: string) => void }) {
  const [rol, setRol] = useState(perfil.rol)
  return (
    <Modal
      title="Cambiar rol"
      sub={perfil.nombre || perfil.username || ''}
      onClose={onClose}
      width={480}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { onSave(perfil.id, rol); onClose() }}>
            <Icon name="check" size={16} />Guardar
          </button>
        </>
      }
    >
      <RolPicker value={rol} onChange={setRol} />
    </Modal>
  )
}

// ── Panel de permisos por rol ─────────────────────────────────────────────────
function RolesPermisosPanel() {
  const { settings, setSettings, toast } = useStore()
  const buildInitial = (): Record<string, RolPermiso> => {
    const out: Record<string, RolPermiso> = {}
    for (const r of ROLES_CONFIGURABLES) {
      const saved = settings.permisos?.[r]
      const def = SECCIONES_POR_ROL[r]
      out[r] = saved
        ? { secciones: [...saved.secciones], verDinero: saved.verDinero }
        : { secciones: def === 'all' || !def ? [] : [...def], verDinero: VER_DINERO_DEFAULT[r] ?? false }
    }
    return out
  }
  const [draft, setDraft] = useState<Record<string, RolPermiso>>(buildInitial)
  const [dirty, setDirty] = useState(false)

  const toggle = (rol: string, id: string) => {
    setDirty(true)
    setDraft((d) => {
      const has = d[rol].secciones.includes(id)
      return { ...d, [rol]: { ...d[rol], secciones: has ? d[rol].secciones.filter((x) => x !== id) : [...d[rol].secciones, id] } }
    })
  }
  const toggleDinero = (rol: string) => { setDirty(true); setDraft((d) => ({ ...d, [rol]: { ...d[rol], verDinero: !d[rol].verDinero } })) }
  const restaurar   = (rol: string) => {
    setDirty(true)
    const def = SECCIONES_POR_ROL[rol]
    setDraft((d) => ({ ...d, [rol]: { secciones: def === 'all' || !def ? [] : [...def], verDinero: VER_DINERO_DEFAULT[rol] ?? false } }))
  }
  const guardar = () => { setSettings((s) => ({ ...s, permisos: draft })); setDirty(false); toast('Permisos actualizados') }

  const grupos = NAV_GROUPS
    .map((g) => ({ label: g.label, items: g.items.filter((i) => i.id !== 'usuarios' && i.id !== 'config') }))
    .filter((g) => g.items.length > 0)

  const SaveBtn = () => (
    <button className="btn btn-primary" onClick={guardar}><Icon name="check" size={15} />Guardar cambios</button>
  )

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-head">
        <Icon name="config" size={18} style={{ color: 'var(--primary-700)' }} />
        <div style={{ flex: 1 }}><div className="card-title">Permisos por rol</div><div className="card-sub">Elige qué módulos ve cada rol. Se aplica al recargar la app.</div></div>
        {dirty && <SaveBtn />}
      </div>

      <div style={{ padding: '13px 18px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <RolBadge rol="admin" />
        <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>Acceso total — no editable</span>
      </div>

      {ROLES_CONFIGURABLES.map((rol) => (
        <div key={rol} style={{ padding: '15px 18px', borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13, flexWrap: 'wrap' }}>
            <RolBadge rol={rol} />
            <div style={{ flex: 1 }} />
            <button onClick={() => toggleDinero(rol)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)' }}>Ver costos y ganancias</span>
              <span style={{ width: 38, height: 21, borderRadius: 11, position: 'relative', background: draft[rol].verDinero ? 'var(--primary)' : 'var(--line-2)', transition: '.2s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 2, left: draft[rol].verDinero ? 19 : 2, width: 17, height: 17, borderRadius: 9, background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
              </span>
            </button>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 9px' }} onClick={() => restaurar(rol)}>Restaurar</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 16 }}>
            {grupos.map((g) => (
              <div key={g.label}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 7 }}>{g.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {g.items.map((it) => {
                    const on = draft[rol].secciones.includes(it.id)
                    return (
                      <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '5px 7px', borderRadius: 8, background: on ? 'var(--primary-tint)' : 'transparent' }}>
                        <input type="checkbox" checked={on} onChange={() => toggle(rol, it.id)} style={{ accentColor: 'var(--primary)', width: 15, height: 15, flexShrink: 0 }} />
                        <Icon name={it.icon} size={14} style={{ color: on ? 'var(--primary-700)' : 'var(--ink-3)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: on ? 700 : 600, color: on ? 'var(--primary-700)' : 'var(--ink-2)' }}>{it.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {dirty && (
        <div style={{ padding: '13px 18px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end' }}>
          <SaveBtn />
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function UsuariosPage() {
  const { negocioId, settings, toast } = useStore()
  const [meId,        setMeId]        = useState('')
  const [negocioCod,  setNegocioCod]  = useState<string | null>(null)
  const [team,        setTeam]        = useState<Perfil[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showCrear,   setShowCrear]   = useState(false)
  const [editing,     setEditing]     = useState<Perfil | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setMeId(user?.id || '')

    const [perfilesRes, negocioRes] = await Promise.all([
      supabase.from('perfiles').select('id,nombre,email,username,rol,activo,sucursal_id'),
      supabase.from('negocios').select('codigo').eq('id', negocioId || '').maybeSingle(),
    ])

    setNegocioCod((negocioRes.data as { codigo: string | null } | null)?.codigo ?? null)
    setTeam(
      ((perfilesRes.data as Perfil[]) || [])
        .sort((a, b) => (a.id === user?.id ? -1 : b.id === user?.id ? 1 : 0))
    )
    setLoading(false)
  }, [negocioId])

  useEffect(() => { if (negocioId) load() }, [load, negocioId])

  const cambiarRol = async (id: string, rol: string) => {
    try {
      await updateEmpleadoRol(id, rol)
      toast('Rol actualizado')
      load()
    } catch {
      toast('No se pudo cambiar el rol')
    }
  }

  const toggleActivo = async (p: Perfil) => {
    const { error } = await supabase.from('perfiles').update({ activo: !p.activo }).eq('id', p.id)
    if (error) { toast('No se pudo cambiar el estado'); return }
    toast(p.activo ? 'Usuario desactivado' : 'Usuario activado')
    load()
  }

  const quitar = async (p: Perfil) => {
    if (!confirm(`¿Quitar a ${p.nombre || p.username}? Perderá acceso al negocio.`)) return
    try {
      await deleteEmpleado(p.id)
      toast('Empleado eliminado')
      load()
    } catch {
      toast('No se pudo eliminar el empleado')
    }
  }

  const stats = {
    total:   team.length,
    activos: team.filter((u) => u.activo).length,
  }

  return (
    <div className="fade-in">
      <PageHeader title="Usuarios" sub={`Tu equipo en ${settings.business}`}>
        <button className="btn btn-primary" onClick={() => setShowCrear(true)}>
          <Icon name="plus" size={16} />Agregar empleado
        </button>
      </PageHeader>

      {/* Código de tienda */}
      {negocioCod && (
        <div style={{ marginBottom: 18, padding: '13px 16px', background: 'var(--primary-tint)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="store" size={18} style={{ color: 'var(--primary-700)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary-700)', marginBottom: 2 }}>Código de la tienda</div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.12em', color: 'var(--primary-700)', fontFamily: 'monospace' }}>{negocioCod}</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12.5, color: 'var(--primary-700)', fontWeight: 600, maxWidth: 200, textAlign: 'right', lineHeight: 1.4 }}>
            Comparte este código con tu equipo para que puedan iniciar sesión
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', marginBottom: 18 }}>
        <Metric icon="clientes" label="Miembros" value={stats.total} tone="primary" />
        <Metric icon="check"    label="Activos"  value={stats.activos} tone="primary" />
      </div>

      {/* Tabla de equipo */}
      <div className="card">
        <div className="card-head">
          <Icon name="users" size={18} style={{ color: 'var(--primary-700)' }} />
          <div style={{ flex: 1 }}>
            <div className="card-title">Equipo</div>
            <div className="card-sub">Quién tiene acceso a tu negocio</div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Login</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24 }}>Cargando…</td></tr>
              ) : team.map((u) => {
                const yo = u.id === meId
                return (
                  <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.55 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 11, background: u.activo ? 'var(--primary)' : 'var(--line-2)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                          {(u.nombre || u.username || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>
                            {u.nombre || '—'}
                            {yo && <span style={{ marginLeft: 7, fontSize: 11, color: 'var(--primary-700)', fontWeight: 800 }}>(tú)</span>}
                          </div>
                          {u.username && (
                            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>@{u.username}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {u.username ? (
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          <span style={{ fontFamily: 'monospace', background: 'var(--surface-2)', padding: '2px 7px', borderRadius: 6, fontSize: 12 }}>{u.username}</span>
                          {negocioCod && (
                            <span style={{ marginLeft: 4, color: 'var(--ink-3)', fontSize: 12 }}>· cód. {negocioCod}</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{u.email || '—'}</span>
                      )}
                    </td>
                    <td><RolBadge rol={u.rol} /></td>
                    <td>
                      <span className="chip" style={{ background: u.activo ? 'var(--ok-tint)' : 'var(--surface-3)', color: u.activo ? 'var(--primary-700)' : 'var(--ink-3)' }}>
                        <span className="chip-dot" style={{ background: u.activo ? 'var(--ok)' : 'var(--ink-3)' }}></span>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="num">
                      {!yo && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost" style={{ padding: '6px 11px', fontSize: 13 }} onClick={() => setEditing(u)}>
                            <Icon name="edit" size={14} />Rol
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '6px 11px', fontSize: 13 }} onClick={() => toggleActivo(u)}>
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                          <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} title="Eliminar" onClick={() => quitar(u)}>
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!loading && team.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-3)', fontWeight: 600, padding: 24 }}>Sin usuarios todavía</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permisos por rol */}
      <RolesPermisosPanel />

      {/* Instrucciones */}
      <div style={{ marginTop: 14, padding: '14px 16px', background: 'var(--surface-3)', borderRadius: 12, border: '1px solid var(--line)' }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 8 }}>Cómo darle acceso a alguien</div>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-2)', fontWeight: 600, lineHeight: 1.7 }}>
          <li>Toca <strong>Agregar empleado</strong> y crea su usuario con un PIN.</li>
          <li>Dile el <strong>código de la tienda</strong> que aparece arriba en verde.</li>
          <li>El empleado entra a la app, elige <em>Empleado</em> e ingresa código + usuario + PIN.</li>
        </ol>
      </div>

      {showCrear && negocioId && (
        <CrearEmpleadoModal
          negocioId={negocioId}
          onClose={() => setShowCrear(false)}
          onCreated={() => { toast('Empleado creado'); load() }}
        />
      )}
      {editing && (
        <EditRolModal
          perfil={editing}
          onClose={() => setEditing(null)}
          onSave={cambiarRol}
        />
      )}
    </div>
  )
}
