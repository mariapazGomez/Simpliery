'use client'

// ---------- Sidebar agrupado con badges (portado de app.jsx) ----------
import { usePathname, useRouter } from 'next/navigation'
import Link, { useLinkStatus } from 'next/link'
import { useMemo } from 'react'
import { useStore, useMetrics, clientMetrics } from '@/lib/store'
import { NAV_GROUPS, PATH_TO_ID, ROUTE_MAP } from '@/lib/nav'
import { usePermisos } from '@/lib/permisos'
import { Icon } from '@/components/icon'
import { createClient } from '@/lib/supabase/client'

/** Spinner que aparece en el tab mientras Next carga su ruta (feedback inmediato al clic). */
function NavSpinner() {
  const { pending } = useLinkStatus()
  return pending ? <span className="nav-spin" aria-hidden /> : null
}

export function Sidebar({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { settings, clientes } = useStore()
  const { puedeVer, esAdmin } = usePermisos()
  const m = useMetrics()
  const router = useRouter()
  const pathname = usePathname()

  const cerrarSesion = async () => {
    await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }
  const activeId = PATH_TO_ID[pathname] || (pathname?.startsWith('/finanzas') ? 'finanzas' : '')

  const proximos = useMemo(
    () => clientes.map((c) => clientMetrics(c)).filter((x) => x.daysUntilNext != null && x.daysUntilNext >= 0 && x.daysUntilNext <= 3).length,
    [clientes],
  )

  return (
    <aside className={'sidebar' + (open ? ' open' : '')} style={{ overflowY: 'auto' }}>
      <div className="brand">
        <div className="brand-mark">
          <Icon name="store" size={21} />
        </div>
        <div>
          <div className="brand-name">Control Local</div>
          <div className="brand-sub">{settings.business}</div>
        </div>
      </div>

      {puedeVer('ventas') && (
        <Link href={ROUTE_MAP.ventas} className="btn btn-primary" style={{ margin: '2px 6px 6px', justifyContent: 'center' }} onClick={() => setOpen(false)}>
          <Icon name="plus" size={17} />
          Registrar venta
        </Link>
      )}

      {NAV_GROUPS.map((g) => {
        const items = g.items.filter((n) => puedeVer(n.id))
        if (items.length === 0) return null
        return (
        <div key={g.label}>
          <div className="nav-label">{g.label}</div>
          {items.map((n) => (
            <Link key={n.id} href={ROUTE_MAP[n.id]} className={'nav-item' + (activeId === n.id ? ' active' : '')} onClick={() => setOpen(false)}>
              <Icon name={n.icon} size={19} className="nav-ic" />
              {n.label}
              {n.id === 'inventario' && m.lowStock.length > 0 && <span className="nav-badge">{m.lowStock.length}</span>}
              {n.id === 'segmentos' && proximos > 0 && <span className="nav-badge">{proximos}</span>}
              {n.id === 'clientes' && m.totalDeuda > 0 && <span className="nav-badge">{m.clientesDeudores}</span>}
              {n.id === 'fiados' && m.totalDeuda > 0 && <span className="nav-badge">{m.clientesDeudores}</span>}
              <NavSpinner />
            </Link>
          ))}
        </div>
        )
      })}

      <div className="sidebar-foot">
        <div className="user-chip">
          <div className="avatar">{(settings.ownerName?.trim() || settings.business || 'U')[0].toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{settings.ownerName?.trim() || 'Mi cuenta'}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>{settings.ownerRole?.trim() || 'Dueño/a'}</div>
          </div>
          {esAdmin && (
            <Link href={ROUTE_MAP.config} onClick={() => setOpen(false)} title="Configuración" style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 4, display: 'grid', placeItems: 'center' }}>
              <Icon name="config" size={15} />
            </Link>
          )}
        </div>
        <button onClick={cerrarSesion} className="nav-item" style={{ width: '100%', marginTop: 4, color: 'var(--danger)' }}>
          <Icon name="logout" size={18} className="nav-ic" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
