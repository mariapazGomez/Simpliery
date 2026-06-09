'use client'

// ---------- Fiados (Modo simple) — vista de primer nivel de "quién me debe" ----------
// Reutiliza el componente de Cuentas por Cobrar de Finanzas, pero como pantalla propia
// porque el fiado es el dolor diario del comercio de barrio chileno.

import { useMetrics } from '@/lib/store'
import { fmtCLP } from '@/lib/format'
import { PageHeader } from '@/components/ui'
import { Icon } from '@/components/icon'
import { FinCxC } from '@/components/finanzas/cuentas'

export default function FiadosPage() {
  const m = useMetrics()
  return (
    <div className="fade-in">
      <PageHeader title="Deudores" sub="¿Quién te debe? Este dinero (fiado) todavía no está en tu caja.">
        <div className="chip chip-neutral tnum" style={{ fontSize: 13 }}>
          <Icon name="coins" size={13} />
          Por cobrar: <strong style={{ marginLeft: 4 }}>{fmtCLP(m.totalDeuda)}</strong>
        </div>
      </PageHeader>
      <FinCxC />
    </div>
  )
}
