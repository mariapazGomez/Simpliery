'use client'

// ---------- Configuración (portado de screen-config.jsx · solo Configuracion) ----------
import { useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { Icon } from '@/components/icon'
import { PageHeader, Field, CatDot } from '@/components/ui'
import { exportCloudBackup, importCloudBackup, resetCloud } from '@/lib/supabase/cloud-backup'
import { importLocalToCloud, hasLocalData } from '@/lib/supabase/import-local'
import type { Settings } from '@/types'

export default function ConfiguracionPage() {
  const { settings, setSettings, toast, categorias, addCategoria, renameCategoria, deleteCategoria, negocioId } = useStore()
  const [f, setF] = useState<Settings>(settings)
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setF((s) => ({ ...s, [k]: v }))
  const [newMethod, setNewMethod] = useState('')
  const [newCat, setNewCat] = useState('')
  const dirty = JSON.stringify(f) !== JSON.stringify(settings)
  const save = () => { setSettings(f); toast('Configuración guardada') }

  // Conectar OptiRoute: obtener el token (para pegarlo en Vercel). La clave no se guarda.
  const [orUser, setOrUser] = useState('')
  const [orPass, setOrPass] = useState('')
  const [orToken, setOrToken] = useState('')
  const [orLoading, setOrLoading] = useState(false)
  const [orErr, setOrErr] = useState('')
  const conectarOptiRoute = async () => {
    setOrLoading(true); setOrErr(''); setOrToken('')
    try {
      const res = await fetch('/api/optiroute/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: orUser, password: orPass }) })
      const j = (await res.json().catch(() => ({}))) as { token?: string; error?: string }
      if (res.ok && j.token) setOrToken(j.token)
      else setOrErr(j.error || 'No se pudo obtener el token')
    } catch {
      setOrErr('Error de conexión')
    }
    setOrLoading(false)
  }

  const fileRef = useRef<HTMLInputElement>(null)
  const doExport = async () => {
    try {
      const n = await exportCloudBackup()
      toast(`Respaldo descargado · ${n} registros`)
    } catch (e) {
      window.alert('No se pudo crear el respaldo: ' + (e instanceof Error ? e.message : 'error'))
    }
  }
  const doImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reelegir el mismo archivo
    if (!file) return
    if (!negocioId) { window.alert('Espera a que cargue tu negocio.'); return }
    if (!window.confirm('Restaurar agregará o actualizará en la nube los datos del archivo (combina por id). ¿Continuar?')) return
    try {
      await importCloudBackup(file, negocioId)
      window.location.reload()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo restaurar el archivo.')
    }
  }
  const doReset = async () => {
    if (!window.confirm('Esto borrará TODOS los datos de tu negocio en la nube (productos, ventas, clientes, deudas, gastos…). Esta acción no se puede deshacer.\n\n¿Seguro?')) return
    if (!negocioId) return
    try {
      await resetCloud()
      window.location.reload()
    } catch (e) {
      window.alert('No se pudo vaciar: ' + (e instanceof Error ? e.message : 'error'))
    }
  }

  const [subiendo, setSubiendo] = useState(false)
  const hayLocal = typeof window !== 'undefined' && hasLocalData()
  const doSubirNube = async () => {
    if (!negocioId) { window.alert('Aún no se carga tu negocio. Espera un momento.'); return }
    if (!window.confirm('Se subirán a la nube los datos que tienes en este navegador (productos, ventas, clientes, gastos…). Si ya tienes datos en la nube, se combinan/actualizan por id. ¿Continuar?')) return
    setSubiendo(true)
    try {
      const res = await importLocalToCloud(negocioId)
      const total = res.reduce((a, r) => a + r.count, 0)
      toast(`Subido a la nube · ${total} registros`)
      setTimeout(() => window.location.reload(), 900)
    } catch (e) {
      window.alert('No se pudo subir: ' + (e instanceof Error ? e.message : 'error desconocido'))
      setSubiendo(false)
    }
  }

  return (
    <div className="fade-in" style={{ maxWidth: 760 }}>
      <PageHeader title="Configuración" sub="Ajusta tu negocio a tu gusto">
        <button className="btn btn-primary" disabled={!dirty} onClick={save}><Icon name="check" size={16} />Guardar cambios</button>
      </PageHeader>

      <div className="grid" style={{ gap: 18 }}>
        <section className="card">
          <div className="card-head"><span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--primary-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center' }}><Icon name="store" size={16} /></span><div className="card-title" style={{ flex: 1 }}>Tu negocio</div></div>
          <div className="card-pad grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Nombre del negocio"><input className="input" value={f.business} onChange={(e) => set('business', e.target.value)} /></Field>
            <Field label="Moneda"><select className="select" value={f.currency} onChange={(e) => set('currency', e.target.value)}><option>Peso chileno (CLP)</option><option>Peso argentino (ARS)</option><option>Sol peruano (PEN)</option></select></Field>
            <Field label="Tu nombre"><input className="input" value={f.ownerName || ''} onChange={(e) => set('ownerName', e.target.value)} placeholder="Ej: María González" /></Field>
            <Field label="Tu cargo"><input className="input" value={f.ownerRole || ''} onChange={(e) => set('ownerRole', e.target.value)} placeholder="Ej: Dueña" /></Field>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--info-tint)', color: 'var(--info)', display: 'grid', placeItems: 'center' }}><Icon name="truck" size={16} /></span><div style={{ flex: 1 }}><div className="card-title">Conectar OptiRoute</div><div className="card-sub">Para enviar tus despachos a optimización de rutas</div></div></div>
          <div className="card-pad" style={{ display: 'grid', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600, lineHeight: 1.5 }}>
              Ingresa tu usuario y clave de OptiRoute <strong>una sola vez</strong> para obtener tu token. No se guarda tu clave; solo se usa para generar el token, que luego pegarás en Vercel.
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Usuario OptiRoute (correo)"><input className="input" value={orUser} onChange={(e) => setOrUser(e.target.value)} placeholder="correo@ejemplo.com" autoComplete="off" /></Field>
              <Field label="Clave OptiRoute"><input className="input" type="password" value={orPass} onChange={(e) => setOrPass(e.target.value)} placeholder="••••••••" autoComplete="off" /></Field>
            </div>
            <div>
              <button className="btn btn-primary" disabled={!orUser || !orPass || orLoading} onClick={conectarOptiRoute}>
                <Icon name="truck" size={15} />
                {orLoading ? 'Obteniendo…' : 'Obtener token'}
              </button>
            </div>
            {orErr && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 700 }}>{orErr}</div>}
            {orToken && (
              <div style={{ padding: '12px 14px', background: 'var(--ok-tint)', borderRadius: 11, border: '1px solid var(--primary-tint2)' }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--primary-700)', marginBottom: 6 }}>✓ Token obtenido — cópialo y pégalo en Vercel</div>
                <code style={{ display: 'block', wordBreak: 'break-all', fontSize: 12.5, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontFamily: 'monospace' }}>{orToken}</code>
                <button className="btn btn-ghost" style={{ fontSize: 12.5, marginTop: 8 }} onClick={() => { navigator.clipboard?.writeText(orToken); toast('Token copiado') }}>
                  <Icon name="download" size={13} />Copiar token
                </button>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 8, lineHeight: 1.5 }}>
                  En <strong>Vercel</strong> → tu proyecto → Settings → Environment Variables → agrega <strong>OPTIROUTE_TOKEN</strong> con este valor y vuelve a desplegar (Redeploy).
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-head"><span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--info-tint)', color: 'var(--info)', display: 'grid', placeItems: 'center' }}><Icon name="cash" size={16} /></span><div style={{ flex: 1 }}><div className="card-title">Métodos de pago</div><div className="card-sub">Cómo te pueden pagar tus clientes</div></div></div>
          <div className="card-pad">
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 14 }}>
              {f.methods.map((mm) => (
                <span key={mm} className="chip chip-neutral" style={{ padding: '7px 12px', fontSize: 13.5 }}>
                  <Icon name={mm === 'Efectivo' ? 'cash' : mm === 'Tarjeta' ? 'card' : 'arrowUp'} size={14} />{mm}
                  <button onClick={() => set('methods', f.methods.filter((x) => x !== mm))} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 0, marginLeft: 2 }}><Icon name="x" size={13} /></button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" style={{ maxWidth: 240 }} value={newMethod} onChange={(e) => setNewMethod(e.target.value)} placeholder="Agregar método (ej: Mercado Pago)" onKeyDown={(e) => { if (e.key === 'Enter' && newMethod.trim()) { set('methods', [...f.methods, newMethod.trim()]); setNewMethod('') } }} />
              <button className="btn btn-ghost" disabled={!newMethod.trim()} onClick={() => { set('methods', [...f.methods, newMethod.trim()]); setNewMethod('') }}><Icon name="plus" size={16} />Agregar</button>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--terra-tint)', color: 'var(--terra-700)', display: 'grid', placeItems: 'center' }}><Icon name="tag" size={16} /></span><div style={{ flex: 1 }}><div className="card-title">Categorías</div><div className="card-sub">Agrupa tus productos · puedes renombrar o borrar</div></div></div>
          <div className="card-pad">
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 14 }}>
              {categorias.map((c) => (
                <span key={c} className="chip chip-neutral" style={{ padding: '6px 8px 6px 12px', fontSize: 13.5, gap: 8 }}>
                  <CatDot cat={c} />
                  {c}
                  <button
                    title="Renombrar"
                    onClick={() => { const n = window.prompt(`Renombrar la categoría "${c}":`, c); if (n && n.trim() && n.trim() !== c) renameCategoria(c, n.trim()) }}
                    style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}
                  >
                    <Icon name="edit" size={13} />
                  </button>
                  <button
                    title="Borrar"
                    onClick={() => { if (window.confirm(`¿Borrar la categoría "${c}"? Los productos que la usen pasarán a "Otros".`)) deleteCategoria(c) }}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}
                  >
                    <Icon name="x" size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" style={{ maxWidth: 240 }} value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Agregar categoría" onKeyDown={(e) => { if (e.key === 'Enter' && newCat.trim()) { addCategoria(newCat.trim()); toast('Categoría agregada'); setNewCat('') } }} />
              <button className="btn btn-ghost" disabled={!newCat.trim()} onClick={() => { addCategoria(newCat.trim()); toast('Categoría agregada'); setNewCat('') }}><Icon name="plus" size={16} />Agregar</button>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--warn-tint)', color: 'oklch(0.50 0.10 70)', display: 'grid', placeItems: 'center' }}><Icon name="alert" size={16} /></span><div style={{ flex: 1 }}><div className="card-title">Avisos y mínimos</div><div className="card-sub">Cuándo te avisamos</div></div></div>
          <div className="card-pad grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Stock mínimo predeterminado" hint="Se usa al crear un producto nuevo">
              <input className="input tnum" inputMode="numeric" value={f.minStockDefault} onChange={(e) => set('minStockDefault', +e.target.value.replace(/[^0-9]/g, '') || 0)} />
            </Field>
            <Field label="Margen mínimo recomendado" hint="Te avisamos si un producto baja de aquí">
              <div className="input-pre"><input className="tnum" inputMode="numeric" value={f.minMargin} onChange={(e) => set('minMargin', +e.target.value.replace(/[^0-9]/g, '') || 0)} /><span className="pre" style={{ padding: '0 13px 0 4px' }}>%</span></div>
            </Field>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--info-tint)', color: 'var(--info)', display: 'grid', placeItems: 'center' }}><Icon name="shield" size={16} /></span><div style={{ flex: 1 }}><div className="card-title">Datos y respaldo</div><div className="card-sub">Tus datos viven en la nube (Supabase). Aquí puedes respaldarlos, restaurarlos o empezar de cero.</div></div></div>
          <div className="card-pad grid" style={{ gap: 14 }}>
            {hayLocal && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--primary-tint)', borderRadius: 11 }}>
                <button className="btn btn-primary" disabled={subiendo} onClick={doSubirNube} style={{ whiteSpace: 'nowrap' }}>
                  <Icon name="download" size={16} style={{ transform: 'rotate(180deg)' }} />{subiendo ? 'Subiendo…' : 'Subir mis datos a la nube'}
                </button>
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600, lineHeight: 1.45 }}>Sube a tu cuenta en la nube los datos guardados en este navegador. Hazlo una vez para no empezar de cero.</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={doExport}><Icon name="download" size={16} />Respaldar mis datos</button>
              <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}><Icon name="box" size={16} />Restaurar desde archivo</button>
              <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={doImport} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--danger-tint)', borderRadius: 11 }}>
              <button className="btn" style={{ background: 'var(--danger)', color: '#fff', whiteSpace: 'nowrap' }} onClick={doReset}><Icon name="trash" size={16} />Empezar de cero</button>
              <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600, lineHeight: 1.45 }}>Borra todos los datos de tu negocio en la nube. No se puede deshacer.</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, lineHeight: 1.5 }}>
              <Icon name="check" size={13} /> El respaldo es un archivo <strong>.json</strong> con los datos de tu negocio, descargado a tu computador. La nube ya guarda todo de forma segura; el respaldo es tu copia extra.
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setF(settings)} disabled={!dirty}>Descartar</button>
          <button className="btn btn-primary" disabled={!dirty} onClick={save}><Icon name="check" size={16} />Guardar cambios</button>
        </div>
      </div>
    </div>
  )
}
