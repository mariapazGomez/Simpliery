'use client'

// ---------- Sidebar agrupado con badges (portado de app.jsx) ----------
import { usePathname, useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useStore, useMetrics, clientMetrics } from '@/lib/store'
import { NAV_GROUPS, PATH_TO_ID, useGo } from '@/lib/nav'
import { Icon } from '@/components/icon'
import { createClient } from '@/lib/supabase/client'

export function Sidebar({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { settings, clientes } = useStore()
  const m = useMetrics()
  const go = useGo()
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

      <button className="btn btn-primary" style={{ margin: '2px 6px 6px', justifyContent: 'center' }} onClick={() => { go('ventas'); setOpen(false) }}>
        <Icon name="plus" size={17} />
        Registrar venta
      </button>

      {NAV_GROUPS.map((g) => (
        <div key={g.label}>
          <div className="nav-label">{g.label}</div>
          {g.items.map((n) => (
            <button key={n.id} className={'nav-item' + (activeId === n.id ? ' active' : '')} onClick={() => { go(n.id); setOpen(false) }}>
              <Icon name={n.icon} size={19} className="nav-ic" />
              {n.label}
              {n.id === 'inventario' && m.lowStock.length > 0 && <span className="nav-badge">{m.lowStock.length}</span>}
              {n.id === 'segmentos' && proximos > 0 && <span className="nav-badge">{proximos}</span>}
              {n.id === 'recordatorios' && <span className="nav-badge" style={{ background: 'var(--terra)' }}>!</span>}
              {n.id === 'clientes' && m.totalDeuda > 0 && <span className="nav-badge">{m.clientesDeudores}</span>}
              {n.id === 'fiados' && m.totalDeuda > 0 && <span className="nav-badge">{m.clientesDeudores}</span>}
            </button>
          ))}
        </div>
      ))}

      <div className="sidebar-foot">
        <div className="user-chip">
          <div className="avatar">M</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Marta Soto</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>Dueña</div>
          </div>
          <button onClick={() => { go('config'); setOpen(false) }} title="Configuración" style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 4, display: 'grid', placeItems: 'center' }}>
            <Icon name="config" size={15} />
          </button>
        </div>
        <button onClick={cerrarSesion} className="nav-item" style={{ width: '100%', marginTop: 4, color: 'var(--danger)' }}>
          <Icon name="logout" size={18} className="nav-ic" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
