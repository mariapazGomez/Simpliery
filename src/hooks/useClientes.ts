'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ClienteDB {
  id: string
  negocio_id: string
  nombre: string
  telefono: string | null
  correo: string | null
  ciudad: string | null
  direccion: string | null
  depto: string | null
  nota: string | null
  activo: boolean
  created_at: string
}

export type ClientePatch = Partial<Pick<ClienteDB, 'nombre' | 'telefono' | 'correo' | 'ciudad' | 'direccion' | 'depto' | 'nota'>>

export function useClientes() {
  const [clientes, setClientes] = useState<ClienteDB[]>([])
  const [loading, setLoading] = useState(true)
  const [negocioId, setNegocioId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user.id).single()
      if (!perfil || cancelled) return
      const nid = (perfil as { negocio_id: string }).negocio_id
      setNegocioId(nid)
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('negocio_id', nid)
        .eq('activo', true)
        .order('nombre')
      if (!cancelled) {
        setClientes((data ?? []) as ClienteDB[])
        setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  const agregar = useCallback(async (datos: Pick<ClienteDB, 'nombre' | 'telefono' | 'correo' | 'ciudad' | 'direccion' | 'depto'>): Promise<ClienteDB> => {
    if (!negocioId) throw new Error('Negocio no disponible')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('clientes')
      .insert({ ...datos, negocio_id: negocioId, activo: true })
      .select('*')
      .single()
    if (error) throw error
    const nuevo = data as ClienteDB
    setClientes(cs => [nuevo, ...cs])
    return nuevo
  }, [negocioId])

  const actualizar = useCallback(async (id: string, patch: ClientePatch) => {
    const supabase = createClient()
    const { error } = await supabase.from('clientes').update(patch).eq('id', id)
    if (error) throw error
    setClientes(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c))
  }, [])

  const eliminar = useCallback(async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('clientes').update({ activo: false }).eq('id', id)
    if (error) throw error
    setClientes(cs => cs.filter(c => c.id !== id))
  }, [])

  const importar = useCallback(async (rows: Pick<ClienteDB, 'nombre' | 'telefono' | 'correo' | 'ciudad' | 'direccion' | 'depto'>[]) => {
    if (!negocioId) throw new Error('Negocio no disponible')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('clientes')
      .insert(rows.map(r => ({ ...r, negocio_id: negocioId, activo: true, nota: '' })))
      .select('*')
    if (error) throw error
    const nuevos = (data ?? []) as ClienteDB[]
    setClientes(cs => [...nuevos, ...cs])
  }, [negocioId])

  return { clientes, loading, agregar, actualizar, eliminar, importar }
}
