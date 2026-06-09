'use client'

// ---------- Navegación inferior móvil (portado de app.jsx) ----------
import { usePathname } from 'next/navigation'
import { MOBILE_NAV, PATH_TO_ID, useGo } from '@/lib/nav'
import { Icon } from '@/components/icon'

export function MobileNav() {
  const pathname = usePathname()
  const activeId = PATH_TO_ID[pathname] || ''
  const go = useGo()
  return (
    <nav className="mobile-nav">
      {MOBILE_NAV.map((n) => (
        <button
          key={n.id}
          onClick={() => go(n.id)}
          className={'mobile-nav-btn' + (activeId === n.id ? ' active' : '')}
          style={n.primary ? { background: 'var(--primary)', color: '#fff', borderRadius: 14, transform: 'scale(1.08)' } : undefined}
        >
          <Icon name={n.icon} size={22} />
          {n.label}
        </button>
      ))}
    </nav>
  )
}
