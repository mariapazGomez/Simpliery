'use client'

// ---------- Usuarios (portado de screen-usuarios.jsx) ----------
import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import type { Settings } from '@/types'
import { Icon } from '@/components/icon'
import { PageHeader, Metric, Modal, Field } from '@/components/ui'

interface RolDef {
  id: string
  label: string
  color: string
  tint: string
  desc: string
}

export const ROLES: Record<string, RolDef> = {
  admin: { id: 'admin', label: 'Administrador', color: 'var(--primary-700)', tint: 'var(--primary-tint)', desc: 'Acceso completo al sistema' },
  vendedor: { id: 'vendedor', label: 'Vendedor', color: 'var(--terra-700)', tint: 'var(--terra-tint)', desc: 'Puede vender, ver stock y clientes' },
  inventario: { id: 'inventario', label: 'Inventario', color: 'var(--info)', tint: 'var(--info-tint)', desc: 'Gestiona stock y reposición' },
  finanzas: { id: 'finanzas', label: 'Finanzas', color: 'oklch(0.50 0.10 70)', tint: 'var(--warn-tint)', desc: 'Ve finanzas y reportes' },
  repartidor: { id: 'repartidor', label: 'Repartidor', color: 'oklch(0.60 0.10 280)', tint: 'oklch(0.94 0.02 280)', desc: 'Ve rutas de despacho asignadas' },
  lectura: { id: 'lectura', label: 'Solo lectura', color: 'var(--ink-3)', tint: 'var(--surface-3)', desc: 'Solo puede ver información' },
}

export const PERMISOS: Record<string, string> = {
  ver_ventas: 'Ver ventas',
  crear_ventas: 'Crear ventas',
  anular_ventas: 'Anular ventas',
  aplicar_descuento: 'Aplicar descuentos',
  ver_costos: 'Ver costos y márgenes',
  ver_ganancias: 'Ver ganancias',
  ver_productos: 'Ver productos',
  editar_productos: 'Editar productos',
  ver_inventario: 'Ver inventario',
  ajustar_inventario: 'Ajustar stock',
  ver_clientes: 'Ver clientes',
  editar_clientes: 'Editar clientes',
  exportar_datos: 'Exportar datos',
  ver_finanzas: 'Ver finanzas',
  crear_gastos: 'Crear gastos',
  ver_reportes: 'Ver reportes',
  gestionar_usuarios: 'Gestionar usuarios',
  configurar_negocio: 'Configurar negocio',
}

const PERMISOS_POR_ROL: Record<string, string[]> = {
  admin: Object.keys(PERMISOS),
  vendedor: ['ver_ventas', 'crear_ventas', 'aplicar_descuento', 'ver_productos', 'ver_inventario', 'ver_clientes', 'editar_clientes'],
  inventario: ['ver_productos', 'ver_inventario', 'ajustar_inventario', 'ver_clientes'],
  finanzas: ['ver_ventas', 'ver_costos', 'ver_ganancias', 'ver_productos', 'ver_reportes', 'ver_finanzas', 'crear_gastos', 'exportar_datos'],
  repartidor: ['ver_ventas', 'ver_clientes'],
  lectura: ['ver_ventas', 'ver_productos', 'ver_inventario', 'ver_clientes', 'ver_reportes'],
}

interface Usuario {
  id: string
  nombre: string
  email: string
  rol: string
  activo: boolean
  avatar: string
  ultimoAcceso: Date | null
  accionesDia: number
  custom?: string[]
}

/** El dueño de la cuenta (tú): su nombre sale de Configuración y el correo de la sesión. */
function makeOwner(settings: Settings, email: string): Usuario {
  const nombre = settings.ownerName?.trim() || 'Tú'
  return {
    id: 'owner',
    nombre,
    email: email || '—',
    rol: 'admin',
    activo: true,
    avatar: (settings.ownerName?.trim() || settings.business || 'U')[0].toUpperCase(),
    ultimoAcceso: new Date(),
    accionesDia: 0,
  }
}

function RolBadge({ rol }: { rol: string }) {
  const r = ROLES[rol] || ROLES.lectura
  return <span className="chip" style={{ background: r.tint, color: r.color, fontWeight: 800, fontSize: 12.5 }}>{r.label}</span>
}

function PermisosMatrix({ rol, custom, onChange }: { rol: string; custom?: string[]; onChange: (k: string, on: boolean) => void }) {
  const base = new Set(PERMISOS_POR_ROL[rol] || [])
  const active = new Set([...base, ...(custom || [])])
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {Object.entries(PERMISOS).map(([k, label]) => {
        const fromBase = base.has(k)
        const on = active.has(k)
        return (
          <label key={k} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px',
            borderRadius: 10, background: on ? 'var(--primary-tint)' : 'var(--surface-3)',
            border: '1px solid ' + (on ? 'var(--primary-tint2)' : 'var(--line)'),
            cursor: fromBase ? 'default' : 'pointer', transition: '.13s',
          }}>
            <input type="checkbox" checked={on} disabled={fromBase}
              onChange={() => { if (fromBase) return; onChange(k, !on) }}
              style={{ accentColor: 'var(--primary)', width: 15, height: 15 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: on ? 'var(--primary-700)' : 'var(--ink-2)' }}>{label}</span>
            {fromBase && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--primary-700)', fontWeight: 800 }}>Base</span>}
          </label>
        )
      })}
    </div>
  )
}

interface InviteForm {
  nombre: string
  email: string
  rol: string
  custom: string[]
}

function InviteModal({ onClose, onSave }: { onClose: () => void; onSave: (u: Usuario) => void }) {
  const [f, setF] = useState<InviteForm>({ nombre: '', email: '', rol: 'vendedor', custom: [] })
  const set = <K extends keyof InviteForm>(k: K, v: InviteForm[K]) => setF((s) => ({ ...s, [k]: v }))
  const togglePerm = (k: string, on: boolean) => setF((s) => ({ ...s, custom: on ? [...s.custom, k] : s.custom.filter((x) => x !== k) }))
  const valid = f.nombre.trim() && f.email.includes('@')
  return (
    <Modal title="Invitar usuario" sub="El usuario recibirá acceso según su rol" onClose={onClose} width={620}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => { onSave({ ...f, id: 'u' + Date.now(), activo: true, avatar: f.nombre[0]?.toUpperCase() || '?', ultimoAcceso: null, accionesDia: 0 }); onClose() }}><Icon name="send" size={16} />Enviar invitación</button></>}>
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Nombre completo"><input className="input" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Camila Rojas" autoFocus /></Field>
          <Field label="Correo electrónico"><input className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="correo@ejemplo.com" /></Field>
        </div>
        <Field label="Rol">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {Object.values(ROLES).map((r) => (
              <button key={r.id} onClick={() => set('rol', r.id)} className="btn" style={{
                flexDirection: 'column', gap: 4, height: 62, padding: '10px 8px', fontSize: 13,
                border: '1px solid ' + (f.rol === r.id ? r.color : 'var(--line)'),
                background: f.rol === r.id ? r.tint : 'var(--surface)', color: f.rol === r.id ? r.color : 'var(--ink-2)',
              }}>
                <span style={{ fontWeight: 800, fontSize: 13.5 }}>{r.label}</span>
                <span style={{ fontSize: 11, opacity: 0.8, lineHeight: 1.2 }}>{r.desc.slice(0, 28)}</span>
              </button>
            ))}
          </div>
        </Field>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8 }}>Permisos del rol <span style={{ color: ROLES[f.rol]?.color }}>{ROLES[f.rol]?.label}</span></div>
          <PermisosMatrix rol={f.rol} custom={f.custom} onChange={togglePerm} />
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, fontWeight: 600 }}>Los permisos marcados como &quot;Base&quot; son obligatorios para el rol y no se pueden quitar.</div>
        </div>
      </div>
    </Modal>
  )
}

function EditRolModal({ usuario, onClose, onSave }: { usuario: Usuario; onClose: () => void; onSave: (id: string, patch: Partial<Usuario>) => void }) {
  const [rol, setRol] = useState(usuario.rol)
  const [custom, setCustom] = useState<string[]>(usuario.custom || [])
  const togglePerm = (k: string, on: boolean) => setCustom((c) => (on ? [...c, k] : c.filter((x) => x !== k)))
  return (
    <Modal title="Editar rol" sub={usuario.nombre} onClose={onClose} width={600}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => { onSave(usuario.id, { rol, custom }); onClose() }}><Icon name="check" size={16} />Guardar</button></>}>
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Rol">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {Object.values(ROLES).map((r) => (
              <button key={r.id} onClick={() => setRol(r.id)} className="btn" style={{
                flexDirection: 'column', gap: 3, height: 58, padding: '8px 8px', fontSize: 12.5,
                border: '1px solid ' + (rol === r.id ? r.color : 'var(--line)'),
                background: rol === r.id ? r.tint : 'var(--surface)', color: rol === r.id ? r.color : 'var(--ink-2)',
              }}>
                <span style={{ fontWeight: 800 }}>{r.label}</span>
              </button>
            ))}
          </div>
        </Field>
        <PermisosMatrix rol={rol} custom={custom} onChange={togglePerm} />
      </div>
    </Modal>
  )
}

export default function UsuariosPage() {
  const { settings } = useStore()
  const [email, setEmail] = useState('')
  const [users, setUsers] = useState<Usuario[]>(() => [makeOwner(settings, '')])
  const [showInvite, setShowInvite] = useState(false)
  const [editUser, setEditUser] = useState<Usuario | null>(null)

  // Trae el correo de la sesión actual.
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }: { data: { user: { email?: string | null } | null } }) => setEmail(data.user?.email || ''))
  }, [])
  // Mantiene la fila del dueño sincronizada con tu nombre (Configuración) y tu correo.
  useEffect(() => {
    setUsers((us) => us.map((u) => (u.id === 'owner' ? makeOwner(settings, email) : u)))
  }, [settings, email])

  const saveUser = (id: string, patch: Partial<Usuario>) => setUsers((us) => us.map((u) => (u.id === id ? { ...u, ...patch } : u)))
  const toggleActive = (id: string) => setUsers((us) => us.map((u) => (u.id === id ? { ...u, activo: !u.activo } : u)))

  const stats = {
    total: users.length,
    activos: users.filter((u) => u.activo).length,
    admin: users.filter((u) => u.rol === 'admin').length,
    inactivos: users.filter((u) => !u.activo).length,
  }

  return (
    <div className="fade-in">
      <PageHeader title="Usuarios" sub={`${stats.activos} usuarios activos en ${settings.business}`}>
        <button className="btn btn-primary" onClick={() => setShowInvite(true)}><Icon name="plus" size={16} />Invitar usuario</button>
      </PageHeader>

      {/* Stats */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', marginBottom: 18 }}>
        <Metric icon="clientes" label="Total usuarios" value={stats.total} tone="primary" />
        <Metric icon="check" label="Activos" value={stats.activos} tone="primary" />
        <Metric icon="zap" label="Administradores" value={stats.admin} tone="terra" />
        <Metric icon="x" label="Inactivos" value={stats.inactivos} tone="info" />
      </div>

      {/* Users table */}
      <div className="card">
        <div className="card-head">
          <Icon name="users" size={18} style={{ color: 'var(--primary-700)' }} />
          <div style={{ flex: 1 }}><div className="card-title">Equipo</div><div className="card-sub">Gestiona accesos y permisos de tu equipo</div></div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Usuario</th><th>Rol</th><th>Último acceso</th><th className="num">Acciones hoy</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.55 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: u.activo ? 'var(--primary)' : 'var(--line-2)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                        {u.avatar}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{u.nombre}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><RolBadge rol={u.rol} /></td>
                  <td style={{ color: 'var(--ink-2)', fontWeight: 600, fontSize: 13 }}>
                    {u.ultimoAcceso ? u.ultimoAcceso.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) + ' ' + u.ultimoAcceso.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="num tnum" style={{ fontWeight: 700 }}>{u.accionesDia}</td>
                  <td>
                    <span className="chip" style={{ background: u.activo ? 'var(--ok-tint)' : 'var(--surface-3)', color: u.activo ? 'var(--primary-700)' : 'var(--ink-3)' }}>
                      <span className="chip-dot" style={{ background: u.activo ? 'var(--ok)' : 'var(--ink-3)' }}></span>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="num">
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost" style={{ padding: '6px 11px', fontSize: 13 }} onClick={() => setEditUser(u)}><Icon name="edit" size={14} />Rol</button>
                      {u.id !== 'u1' && <button className="btn btn-ghost" style={{ padding: '6px 11px', fontSize: 13 }} onClick={() => toggleActive(u.id)}>{u.activo ? 'Desactivar' : 'Activar'}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roles reference */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head"><Icon name="sliders" size={17} style={{ color: 'var(--primary-700)' }} /><div style={{ flex: 1 }}><div className="card-title">Roles y permisos</div><div className="card-sub">Referencia de qué puede hacer cada rol</div></div></div>
        <div style={{ overflowX: 'auto', padding: '0 0 4px' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Permiso</th>
                {Object.values(ROLES).map((r) => <th key={r.id} style={{ textAlign: 'center', color: r.color }}>{r.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PERMISOS).map(([k, label]) => (
                <tr key={k}>
                  <td style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>{label}</td>
                  {Object.keys(ROLES).map((rid) => {
                    const has = (PERMISOS_POR_ROL[rid] || []).includes(k)
                    return <td key={rid} style={{ textAlign: 'center' }}>
                      {has ? <span style={{ color: 'var(--primary-700)', fontSize: 18 }}>✓</span>
                        : <span style={{ color: 'var(--line-2)', fontSize: 16 }}>—</span>}
                    </td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: '13px 16px', background: 'var(--warn-tint)', borderRadius: 12, border: '1px solid var(--warn)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="alert" size={15} style={{ color: 'oklch(0.50 0.10 70)', marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: 'oklch(0.45 0.10 70)', fontWeight: 600 }}>
          Los roles te ayudan a organizar a tu equipo. Por ahora son informativos: la separación de datos <strong>entre negocios</strong> sí está protegida en el servidor, pero el control de permisos por rol <strong>dentro</strong> de un mismo negocio se aplicará en una próxima versión.
        </div>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSave={(u) => setUsers((us) => [...us, u])} />}
      {editUser && <EditRolModal usuario={editUser} onClose={() => setEditUser(null)} onSave={saveUser} />}
    </div>
  )
}
