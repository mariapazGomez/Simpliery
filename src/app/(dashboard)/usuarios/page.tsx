'use client'

// ---------- Usuarios: equipo real del negocio (Supabase) ----------
// El dueño invita por correo; cuando esa persona se registra con ese correo,
// el trigger `handle_new_user` la une a este negocio con el rol asignado.
import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/components/icon'
import { PageHeader, Metric, Modal, Field } from '@/components/ui'

const supabase = createClient()

interface RolDef { label: string; color: string; tint: string; desc: string }
export const ROLES: Record<string, RolDef> = {
  admin: { label: 'Administrador', color: 'var(--primary-700)', tint: 'var(--primary-tint)', desc: 'Acceso total al negocio' },
  vendedor: { label: 'Vendedor', color: 'var(--terra-700)', tint: 'var(--terra-tint)', desc: 'Solo vender y clientes' },
  bodega: { label: 'Bodega', color: 'var(--info)', tint: 'var(--info-tint)', desc: 'Stock, productos y despachos' },
  contador: { label: 'Contador', color: 'oklch(0.50 0.10 70)', tint: 'var(--warn-tint)', desc: 'Finanzas y reportes' },
}
const ROL_LIST = Object.keys(ROLES)

interface Perfil { id: string; nombre: string | null; email: string | null; rol: string; activo: boolean }
interface Invitacion { id: string; email: string; rol: string; created_at: string }

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

function InviteModal({ onClose, onInvite }: { onClose: () => void; onInvite: (email: string, rol: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState('vendedor')
  const [saving, setSaving] = useState(false)
  const valid = email.includes('@') && email.includes('.')
  const enviar = async () => {
    if (!valid || saving) return
    setSaving(true)
    await onInvite(email.trim().toLowerCase(), rol)
    setSaving(false)
    onClose()
  }
  return (
    <Modal title="Invitar a tu equipo" sub="Dale acceso a alguien para que trabaje en tu negocio" onClose={onClose} width={560}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!valid || saving} onClick={enviar}><Icon name="plus" size={16} />{saving ? 'Creando…' : 'Crear invitación'}</button></>}>
      <div style={{ display: 'grid', gap: 16 }}>
        <Field label="Correo de la persona">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" autoFocus />
        </Field>
        <Field label="¿Qué podrá hacer? (rol)">
          <RolPicker value={rol} onChange={setRol} />
        </Field>
        <div style={{ padding: '11px 13px', background: 'var(--primary-tint)', borderRadius: 11, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
          <Icon name="alert" size={15} style={{ color: 'var(--primary-700)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: 'var(--primary-700)', fontWeight: 600, lineHeight: 1.45 }}>
            Después de crear la invitación, pídele a esa persona que entre a la app y <strong>cree una cuenta nueva con ese mismo correo</strong>. Al registrarse se unirá automáticamente a tu negocio.
          </div>
        </div>
      </div>
    </Modal>
  )
}

function EditRolModal({ perfil, onClose, onSave }: { perfil: Perfil; onClose: () => void; onSave: (id: string, rol: string) => void }) {
  const [rol, setRol] = useState(perfil.rol)
  return (
    <Modal title="Cambiar rol" sub={perfil.nombre || perfil.email || ''} onClose={onClose} width={480}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={() => { onSave(perfil.id, rol); onClose() }}><Icon name="check" size={16} />Guardar</button></>}>
      <RolPicker value={rol} onChange={setRol} />
    </Modal>
  )
}

export default function UsuariosPage() {
  const { negocioId, settings, toast } = useStore()
  const [meId, setMeId] = useState('')
  const [team, setTeam] = useState<Perfil[]>([])
  const [invites, setInvites] = useState<Invitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [editing, setEditing] = useState<Perfil | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setMeId(user?.id || '')
    const { data: perfiles } = await supabase.from('perfiles').select('id,nombre,email,rol,activo')
    const { data: inv } = await supabase.from('invitaciones').select('id,email,rol,created_at').eq('estado', 'pendiente').order('created_at', { ascending: false })
    setTeam(((perfiles as Perfil[]) || []).sort((a, b) => (a.id === user?.id ? -1 : b.id === user?.id ? 1 : 0)))
    setInvites((inv as Invitacion[]) || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const invitar = async (email: string, rol: string) => {
    if (team.some((m) => (m.email || '').toLowerCase() === email) || invites.some((i) => i.email.toLowerCase() === email)) {
      toast('Ese correo ya está en tu equipo o invitado')
      return
    }
    const { error } = await supabase.from('invitaciones').insert({ negocio_id: negocioId, email, rol })
    if (error) { toast('No se pudo crear la invitación'); return }
    toast('Invitación creada · pídele que se registre con ese correo')
    load()
  }
  const revocar = async (id: string) => {
    await supabase.from('invitaciones').delete().eq('id', id)
    toast('Invitación cancelada')
    load()
  }
  const cambiarRol = async (id: string, rol: string) => {
    const { error } = await supabase.from('perfiles').update({ rol }).eq('id', id)
    if (error) { toast('No se pudo cambiar el rol'); return }
    toast('Rol actualizado')
    load()
  }
  const toggleActivo = async (p: Perfil) => {
    const { error } = await supabase.from('perfiles').update({ activo: !p.activo }).eq('id', p.id)
    if (error) { toast('No se pudo cambiar el estado'); return }
    toast(p.activo ? 'Usuario desactivado' : 'Usuario activado')
    load()
  }
  const quitar = async (p: Perfil) => {
    if (!confirm(`¿Quitar a ${p.nombre || p.email} de tu negocio? No podrá seguir entrando.`)) return
    const { error } = await supabase.from('perfiles').delete().eq('id', p.id)
    if (error) { toast('No se pudo quitar al usuario'); return }
    toast('Usuario quitado del negocio')
    load()
  }

  const stats = { total: team.length, activos: team.filter((u) => u.activo).length, pendientes: invites.length }

  return (
    <div className="fade-in">
      <PageHeader title="Usuarios" sub={`Tu equipo en ${settings.business}`}>
        <button className="btn btn-primary" onClick={() => setShowInvite(true)}><Icon name="plus" size={16} />Invitar usuario</button>
      </PageHeader>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', marginBottom: 18 }}>
        <Metric icon="clientes" label="Miembros" value={stats.total} tone="primary" />
        <Metric icon="check" label="Activos" value={stats.activos} tone="primary" />
        <Metric icon="send" label="Invitaciones" value={stats.pendientes} tone="terra" sub="pendientes" />
      </div>

      {/* Equipo */}
      <div className="card">
        <div className="card-head">
          <Icon name="users" size={18} style={{ color: 'var(--primary-700)' }} />
          <div style={{ flex: 1 }}><div className="card-title">Equipo</div><div className="card-sub">Quién tiene acceso a tu negocio</div></div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24 }}>Cargando…</td></tr>
              ) : team.map((u) => {
                const yo = u.id === meId
                return (
                  <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.55 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 11, background: u.activo ? 'var(--primary)' : 'var(--line-2)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                          {(u.nombre || u.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{u.nombre || '—'}{yo && <span style={{ marginLeft: 7, fontSize: 11, color: 'var(--primary-700)', fontWeight: 800 }}>(tú)</span>}</div>
                          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{u.email || '—'}</div>
                        </div>
                      </div>
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
                          <button className="btn btn-ghost" style={{ padding: '6px 11px', fontSize: 13 }} onClick={() => setEditing(u)}><Icon name="edit" size={14} />Rol</button>
                          <button className="btn btn-ghost" style={{ padding: '6px 11px', fontSize: 13 }} onClick={() => toggleActivo(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button>
                          <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} title="Quitar" onClick={() => quitar(u)}><Icon name="trash" size={15} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitaciones pendientes */}
      {invites.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head">
            <Icon name="send" size={17} style={{ color: 'var(--terra-700)' }} />
            <div style={{ flex: 1 }}><div className="card-title">Invitaciones pendientes</div><div className="card-sub">Esperan que la persona se registre con ese correo</div></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {invites.map((i) => (
              <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderTop: '1px solid var(--line)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{i.email}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>Invitado como {ROLES[i.rol]?.label || i.rol}</div>
                </div>
                <RolBadge rol={i.rol} />
                <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => revocar(i.id)}><Icon name="x" size={14} />Cancelar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cómo funciona */}
      <div style={{ marginTop: 14, padding: '14px 16px', background: 'var(--surface-3)', borderRadius: 12, border: '1px solid var(--line)' }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 8 }}>Cómo darle acceso a alguien</div>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-2)', fontWeight: 600, lineHeight: 1.7 }}>
          <li>Toca <strong>Invitar usuario</strong>, pon su correo y elige el rol.</li>
          <li>Pídele que entre a la app y <strong>cree una cuenta nueva con ESE correo</strong>.</li>
          <li>Al registrarse aparecerá aquí, ya dentro de tu negocio.</li>
        </ol>
      </div>

      <div style={{ marginTop: 12, padding: '12px 15px', background: 'var(--warn-tint)', borderRadius: 12, border: '1px solid var(--warn)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="alert" size={15} style={{ color: 'oklch(0.50 0.10 70)', marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, color: 'oklch(0.45 0.10 70)', fontWeight: 600, lineHeight: 1.45 }}>
          Cada rol ve y hace solo lo suyo dentro de la app (el <strong>Vendedor</strong>, por ejemplo, solo vende y no ve costos ni ganancias). La separación entre <strong>negocios distintos</strong> está protegida en el servidor.
        </div>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvite={invitar} />}
      {editing && <EditRolModal perfil={editing} onClose={() => setEditing(null)} onSave={cambiarRol} />}
    </div>
  )
}
