'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Categoria {
  id: string
  nombre: string
  orden: number
}

export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [negocioId, setNegocioId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await supabase.from('perfiles').select('negocio_id').eq('id', user.id).single()
      if (cancelled) return
      const nid = (data as { negocio_id: string } | null)?.negocio_id
      if (nid) setNegocioId(nid)
    })()

    ;(async () => {
      const result = await supabase.from('categorias').select('id, nombre, orden').order('orden')
      if (cancelled) return
      if (result.data) setCategorias(result.data as Categoria[])
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [])

  const agregar = useCallback(async (nombre: string) => {
    if (!negocioId) throw new Error('Negocio no disponible')
    const supabase = createClient()
    const maxOrden = categorias.length > 0 ? Math.max(...categorias.map(c => c.orden)) : 0
    const { data, error } = await supabase
      .from('categorias')
      .insert({ nombre: nombre.trim(), orden: maxOrden + 1, negocio_id: negocioId })
      .select('id, nombre, orden')
      .single()
    if (error) throw error
    setCategorias(cs => [...cs, data as Categoria])
  }, [categorias, negocioId])

  const renombrar = useCallback(async (id: string, nombre: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('categorias')
      .update({ nombre: nombre.trim() })
      .eq('id', id)
    if (error) throw error
    setCategorias(cs => cs.map(c => c.id === id ? { ...c, nombre: nombre.trim() } : c))
  }, [])

  const eliminar = useCallback(async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id)
    if (error) throw error
    setCategorias(cs => cs.filter(c => c.id !== id))
  }, [])

  // Inserta en categorias las que existan en productos pero no en la tabla.
  // Retorna la cantidad de categorías nuevas insertadas.
  const sincronizarDesdeProductos = useCallback(async (): Promise<number> => {
    if (!negocioId) return 0
    const supabase = createClient()
    const { data: prods } = await supabase
      .from('productos')
      .select('categoria')
      .eq('negocio_id', negocioId)
      .eq('activo', true)
    if (!prods) return 0

    const enProductos = [...new Set(
      (prods as { categoria: string }[]).map(p => p.categoria).filter(Boolean)
    )]
    const existentes = new Set(categorias.map(c => c.nombre))
    const faltantes = enProductos.filter(n => !existentes.has(n))
    if (faltantes.length === 0) return 0

    const maxOrden = categorias.length > 0 ? Math.max(...categorias.map(c => c.orden)) : 0
    const nuevas = faltantes.map((nombre, i) => ({
      nombre,
      orden: maxOrden + i + 1,
      negocio_id: negocioId,
    }))
    const { data, error } = await supabase
      .from('categorias')
      .insert(nuevas)
      .select('id, nombre, orden')
    if (error) throw error
    setCategorias(cs => [...cs, ...(data as Categoria[])])
    return faltantes.length
  }, [negocioId, categorias])

  return { categorias, loading, agregar, renombrar, eliminar, sincronizarDesdeProductos }
}
