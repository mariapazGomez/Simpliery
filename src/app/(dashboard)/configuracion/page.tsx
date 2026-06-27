'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/icon'
import { PageHeader, Field, CatDot } from '@/components/ui'
import { useConfiguracion, type Configuracion } from '@/hooks/useConfiguracion'
import { useCategorias } from '@/hooks/useCategorias'

export default function ConfiguracionPage() {
  const { config, loading, guardar } = useConfiguracion()
  const { categorias, agregar, renombrar, eliminar } = useCategorias()

  const [f, setF] = useState<Configuracion | null>(null)
  const initialized = useRef(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [newMethod, setNewMethod] = useState('')
  const [newCat, setNewCat] = useState('')

  // Inicializar formulario una sola vez cuando carga la config real
  useEffect(() => {
    if (!loading && !initialized.current) {
      setF(config)
      initialized.current = true
    }
  }, [loading, config])

  const set = <K extends keyof Omit<Configuracion, 'negocio_id'>>(k: K, v: Configuracion[K]) =>
    setF(s => s ? { ...s, [k]: v } : s)

  const dirty = f !== null && JSON.stringify(f) !== JSON.stringify(config)

  const save = async () => {
    if (!f) return
    setSaving(true); setSaveErr(null)
    try {
      const { negocio_id: _, ...updates } = f
      await guardar(updates)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  // OptiRoute
  const [orUser, setOrUser] = useState('')
  const [orPass, setOrPass] = useState('')
  const [orToken, setOrToken] = useState('')
  const [orLoading, setOrLoading] = useState(false)
  const [orErr, setOrErr] = useState('')
  const [orCopied, setOrCopied] = useState(false)
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
  const [orEstado, setOrEstado] = useState<{ conectado: boolean; motivo?: string } | null>(null)
  const [orProbando, setOrProbando] = useState(false)
  const probarConexion = useCallback(async () => {
    setOrProbando(true)
    try {
      const res = await fetch('/api/optiroute/pedido?check=1')
      const j = (await res.json().catch(() => ({}))) as { conectado?: boolean; motivo?: string }
      setOrEstado({ conectado: !!j.conectado, motivo: j.motivo })
    } catch {
      setOrEstado({ conectado: false, motivo: 'No se pudo consultar al servidor.' })
    }
    setOrProbando(false)
  }, [])
  useEffect(() => { probarConexion() }, [probarConexion])

  if (loading || !f) {
    return (
      <div className="fade-in" style={{ maxWidth: 760 }}>
        <PageHeader title="Configuración" sub="Ajusta tu negocio a tu gusto" />
        <div style={{ color: 'var(--ink-3)', fontWeight: 600, padding: 24 }}>Cargando configuración…</div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ maxWidth: 760 }}>
      <PageHeader title="Configuración" sub="Ajusta tu negocio a tu gusto">
        <button className="btn btn-primary" disabled={!dirty || saving} onClick={save}>
          <Icon name="check" size={16} />{saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </PageHeader>

      {saved && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'var(--ok-tint)', color: 'var(--primary-700)', fontWeight: 700, fontSize: 13.5 }}>
          ✓ Configuración guardada
        </div>
      )}
      {saveErr && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'var(--danger-tint)', color: 'var(--danger)', fontWeight: 700, fontSize: 13.5 }}>
          {saveErr}
        </div>
      )}

      <div className="grid" style={{ gap: 18 }}>
        {/* Tu negocio */}
        <section className="card">
          <div className="card-head">
            <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--primary-tint)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center' }}>
              <Icon name="store" size={16} />
            </span>
            <div className="card-title" style={{ flex: 1 }}>Tu negocio</div>
          </div>
          <div className="card-pad grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Nombre del negocio">
              <input className="input" value={f.nombre_negocio} onChange={e => set('nombre_negocio', e.target.value)} />
            </Field>
            <Field label="Moneda">
              <select className="select" value={f.moneda} onChange={e => set('moneda', e.target.value)}>
                <option value="CLP">Peso chileno (CLP)</option>
                <option value="ARS">Peso argentino (ARS)</option>
                <option value="PEN">Sol peruano (PEN)</option>
              </select>
            </Field>
            <Field label="Tu nombre">
              <input className="input" value={f.owner_nombre ?? ''} onChange={e => set('owner_nombre', e.target.value || null)} placeholder="Ej: María González" />
            </Field>
            <Field label="Tu cargo">
              <input className="input" value={f.owner_rol ?? ''} onChange={e => set('owner_rol', e.target.value || null)} placeholder="Ej: Dueña" />
            </Field>
          </div>
        </section>

        {/* OptiRoute */}
        <section className="card">
          <div className="card-head">
            <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--info-tint)', color: 'var(--info)', display: 'grid', placeItems: 'center' }}>
              <Icon name="truck" size={16} />
            </span>
            <div style={{ flex: 1 }}>
              <div className="card-title">Conectar OptiRoute</div>
              <div className="card-sub">Para enviar tus despachos a optimización de rutas</div>
            </div>
          </div>
          <div className="card-pad" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, background: orEstado === null ? 'var(--surface)' : orEstado.conectado ? 'var(--ok-tint)' : 'var(--danger-tint)', border: '1px solid var(--line)' }}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: orEstado === null ? 'var(--ink-3)' : orEstado.conectado ? 'var(--primary-700)' : 'var(--danger)', lineHeight: 1.45 }}>
                {orProbando || orEstado === null
                  ? 'Verificando conexión con OptiRoute…'
                  : orEstado.conectado
                    ? '✓ Conectado — el token guardado en Vercel funciona.'
                    : '✗ Sin conexión: ' + (orEstado.motivo || 'motivo desconocido')}
              </div>
              <button className="btn btn-ghost" style={{ fontSize: 12.5, flexShrink: 0 }} disabled={orProbando} onClick={probarConexion}>
                <Icon name="history" size={13} />Probar conexión
              </button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600, lineHeight: 1.5 }}>
              Ingresa tu usuario y clave de OptiRoute <strong>una sola vez</strong> para obtener tu token.
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Usuario OptiRoute (correo)">
                <input className="input" value={orUser} onChange={e => setOrUser(e.target.value)} placeholder="correo@ejemplo.com" autoComplete="off" />
              </Field>
              <Field label="Clave OptiRoute">
                <input className="input" type="password" value={orPass} onChange={e => setOrPass(e.target.value)} placeholder="••••••••" autoComplete="off" />
              </Field>
            </div>
            <div>
              <button className="btn btn-primary" disabled={!orUser || !orPass || orLoading} onClick={conectarOptiRoute}>
                <Icon name="truck" size={15} />{orLoading ? 'Obteniendo…' : 'Obtener token'}
              </button>
            </div>
            {orErr && <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 700 }}>{orErr}</div>}
            {orToken && (
              <div style={{ padding: '12px 14px', background: 'var(--ok-tint)', borderRadius: 11, border: '1px solid var(--primary-tint2)' }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--primary-700)', marginBottom: 6 }}>✓ Token obtenido — cópialo y pégalo en Vercel</div>
                <code style={{ display: 'block', wordBreak: 'break-all', fontSize: 12.5, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontFamily: 'monospace' }}>{orToken}</code>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 12.5, marginTop: 8 }}
                  onClick={() => { navigator.clipboard?.writeText(orToken); setOrCopied(true); setTimeout(() => setOrCopied(false), 2000) }}
                >
                  <Icon name="download" size={13} />{orCopied ? 'Copiado ✓' : 'Copiar token'}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Métodos de pago */}
        <section className="card">
          <div className="card-head">
            <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--info-tint)', color: 'var(--info)', display: 'grid', placeItems: 'center' }}>
              <Icon name="cash" size={16} />
            </span>
            <div style={{ flex: 1 }}>
              <div className="card-title">Métodos de pago</div>
              <div className="card-sub">Cómo te pueden pagar tus clientes</div>
            </div>
          </div>
          <div className="card-pad">
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 14 }}>
              {f.metodos_pago.map(mm => (
                <span key={mm} className="chip chip-neutral" style={{ padding: '7px 12px', fontSize: 13.5 }}>
                  <Icon name={mm === 'Efectivo' ? 'cash' : mm === 'Tarjeta' ? 'card' : 'arrowUp'} size={14} />
                  {mm}
                  <button
                    onClick={() => set('metodos_pago', f.metodos_pago.filter(x => x !== mm))}
                    style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 0, marginLeft: 2 }}
                  >
                    <Icon name="x" size={13} />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                style={{ maxWidth: 240 }}
                value={newMethod}
                onChange={e => setNewMethod(e.target.value)}
                placeholder="Agregar método (ej: Mercado Pago)"
                onKeyDown={e => { if (e.key === 'Enter' && newMethod.trim()) { set('metodos_pago', [...f.metodos_pago, newMethod.trim()]); setNewMethod('') } }}
              />
              <button
                className="btn btn-ghost"
                disabled={!newMethod.trim()}
                onClick={() => { set('metodos_pago', [...f.metodos_pago, newMethod.trim()]); setNewMethod('') }}
              >
                <Icon name="plus" size={16} />Agregar
              </button>
            </div>
          </div>
        </section>

        {/* Categorías */}
        <section className="card">
          <div className="card-head">
            <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--terra-tint)', color: 'var(--terra-700)', display: 'grid', placeItems: 'center' }}>
              <Icon name="tag" size={16} />
            </span>
            <div style={{ flex: 1 }}>
              <div className="card-title">Categorías</div>
              <div className="card-sub">Agrupa tus productos · puedes renombrar o borrar</div>
            </div>
          </div>
          <div className="card-pad">
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 14 }}>
              {categorias.map(cat => (
                <span key={cat.id} className="chip chip-neutral" style={{ padding: '6px 8px 6px 12px', fontSize: 13.5, gap: 8 }}>
                  <CatDot cat={cat.nombre} />
                  {cat.nombre}
                  <button
                    title="Renombrar"
                    onClick={async () => {
                      const n = window.prompt(`Renombrar la categoría "${cat.nombre}":`, cat.nombre)
                      if (n && n.trim() && n.trim() !== cat.nombre) {
                        try { await renombrar(cat.id, n.trim()) }
                        catch { window.alert('No se pudo renombrar la categoría') }
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}
                  >
                    <Icon name="edit" size={13} />
                  </button>
                  <button
                    title="Borrar"
                    onClick={async () => {
                      if (!window.confirm(`¿Borrar la categoría "${cat.nombre}"? Los productos que la usen perderán su categoría.`)) return
                      try { await eliminar(cat.id) }
                      catch { window.alert('No se pudo borrar la categoría') }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}
                  >
                    <Icon name="x" size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                style={{ maxWidth: 240 }}
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                placeholder="Agregar categoría"
                onKeyDown={async e => { if (e.key === 'Enter' && newCat.trim()) { await agregar(newCat.trim()); setNewCat('') } }}
              />
              <button
                className="btn btn-ghost"
                disabled={!newCat.trim()}
                onClick={async () => { await agregar(newCat.trim()); setNewCat('') }}
              >
                <Icon name="plus" size={16} />Agregar
              </button>
            </div>
          </div>
        </section>

        {/* Avisos */}
        <section className="card">
          <div className="card-head">
            <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--warn-tint)', color: 'oklch(0.50 0.10 70)', display: 'grid', placeItems: 'center' }}>
              <Icon name="alert" size={16} />
            </span>
            <div style={{ flex: 1 }}>
              <div className="card-title">Avisos y mínimos</div>
              <div className="card-sub">Cuándo te avisamos</div>
            </div>
          </div>
          <div className="card-pad grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Stock mínimo predeterminado" hint="Se usa al crear un producto nuevo">
              <input
                className="input tnum"
                inputMode="numeric"
                value={f.stock_minimo_default}
                onChange={e => set('stock_minimo_default', +e.target.value.replace(/[^0-9]/g, '') || 0)}
              />
            </Field>
            <Field label="Margen mínimo recomendado" hint="Te avisamos si un producto baja de aquí">
              <div className="input-pre">
                <input
                  className="tnum"
                  inputMode="numeric"
                  value={f.margen_minimo}
                  onChange={e => set('margen_minimo', +e.target.value.replace(/[^0-9]/g, '') || 0)}
                />
                <span className="pre" style={{ padding: '0 13px 0 4px' }}>%</span>
              </div>
            </Field>
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setF(config)} disabled={!dirty}>Descartar</button>
          <button className="btn btn-primary" disabled={!dirty || saving} onClick={save}>
            <Icon name="check" size={16} />{saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
