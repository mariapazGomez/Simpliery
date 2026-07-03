'use client'

// ---------- Shell del dashboard (portado de app.jsx → App Router) ----------
import { useState, useEffect, Component, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { StoreProvider, useMetrics, useStore } from '@/lib/store'
import { FinanzasProvider } from '@/lib/finanzas-store'
import { FormatsProvider } from '@/lib/formats-store'
import { PATH_TO_ID, TITLES, ROUTE_MAP, useGo } from '@/lib/nav'
import { usePermisos } from '@/lib/permisos'
import { Icon } from '@/components/icon'
import { Sidebar } from '@/components/shell/sidebar'
import { NotifDrawer } from '@/components/notif-drawer'
import { GlobalSearch } from '@/components/global-search'
import { PerfilGate } from '@/components/perfil-gate'

class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(e: Error) {
    return { err: e }
  }
  render() {
    if (this.state.err)
      return (
        <div style={{ padding: '48px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--danger-tint)', color: 'var(--danger)', display: 'grid', placeItems: 'center' }}>
            <Icon name="alert" size={26} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Algo salió mal</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 14, maxWidth: 340 }}>{this.state.err.message}</div>
          <button className="btn btn-primary" onClick={() => this.setState({ err: null })}>
            Reintentar
          </button>
        </div>
      )
    return this.props.children
  }
}

function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const go = useGo()
  const m = useMetrics()
  const { rol } = useStore()
  const { puedeVer, inicio, loading: permisosLoading } = usePermisos()

  const activeId = PATH_TO_ID[pathname] || (pathname?.startsWith('/finanzas') ? 'finanzas' : 'dashboard')
  const [t1] = TITLES[activeId] || ['—', '']
  const allowed = puedeVer(activeId)

  // Si el rol no puede ver esta sección, redirige a su inicio permitido.
  useEffect(() => {
    if (rol && !permisosLoading && !allowed) router.replace(ROUTE_MAP[inicio()] || '/ventas')
  }, [rol, allowed, permisosLoading, router, inicio])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // cerrar drawer/búsqueda al cambiar de ruta
  useEffect(() => {
    setNotifOpen(false)
    setOpen(false)
  }, [pathname])

  const notifCount = m.lowStock.length + (m.cats.filter((c) => c.marginPct < 25).length > 0 ? 1 : 0)

  return (
    <div className="app">
      <div className={'scrim' + (open ? ' show' : '')} onClick={() => setOpen(false)}></div>
      <Sidebar open={open} setOpen={setOpen} />
      <div className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setOpen(true)} aria-label="Menú">
            <Icon name="dashboard" size={18} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1>{t1}</h1>
          </div>
          <div className="search" onClick={() => setSearchOpen(true)} style={{ cursor: 'pointer' }}>
            <Icon name="search" size={16} />
            <input placeholder="Buscar… (⌘K)" readOnly style={{ cursor: 'pointer' }} />
          </div>
          <button className="btn btn-ghost btn-icon" title="Avisos" style={{ position: 'relative' }} onClick={() => setNotifOpen((v) => !v)}>
            <Icon name="bell" size={18} />
            {notifCount > 0 && <span style={{ position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)' }}></span>}
          </button>
        </header>
        <div className="content">{allowed ? children : <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ink-3)', fontWeight: 600 }}>Redirigiendo…</div>}</div>
      </div>
      <NotifDrawer open={notifOpen} onClose={() => setNotifOpen(false)} go={go} />
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} go={go} />}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <PerfilGate>
      <StoreProvider>
        <FormatsProvider>
          <FinanzasProvider>
            <ErrorBoundary>
              <AppShell>{children}</AppShell>
            </ErrorBoundary>
          </FinanzasProvider>
        </FormatsProvider>
      </StoreProvider>
    </PerfilGate>
  )
}
