# Datos de Supabase sin waterfalls

La latencia percibida al entrar a una pestaña suele venir de cómo se piden los
datos, no del render. Tres reglas: no encadenar lo independiente, no repetir lo
mismo, y revalidar sin bloquear.

## 1. Paraleliza lo que no depende entre sí

`await` en serie suma latencias. Si las queries son independientes, lánzalas
juntas con `Promise.all`:

```ts
// ❌ waterfall: 3 round-trips en serie
const productos = await supabase.from('productos').select('*')
const ventas = await supabase.from('ventas').select('*')
const clientes = await supabase.from('clientes').select('*')

// ✅ un solo tramo de espera
const [productos, ventas, clientes] = await Promise.all([
  supabase.from('productos').select('*'),
  supabase.from('ventas').select('*'),
  supabase.from('clientes').select('*'),
])
```

## 2. Deduplica con `cache()` (React) entre layout y page

Si el layout y la page (o varios componentes) piden el MISMO dato en el mismo
render del server, envuélvelo en `cache()` para que se ejecute una sola vez por
request:

```ts
import { cache } from 'react'
export const getNegocio = cache(async (id: string) => {
  const { data } = await supabaseServer().from('negocios').select('*').eq('id', id).single()
  return data
})
```

Síntoma de que falta: en Network ves la misma query repetida al cambiar entre
tabs hermanos que comparten layout.

## 3. No bloquees la navegación con el fetch

Saca los `await` del cuerpo del `layout.tsx` y mételos en componentes envueltos
en `<Suspense>` dentro de cada `page.tsx`. Así la pestaña pinta su skeleton al
instante y el dato llega por streaming (ver `route-based-tabs.md`).

## 4. Cliente: revalidar sin pantalla en blanco (SWR / React Query)

Para datos que cambian (listas, dashboards), el patrón "stale-while-revalidate"
muestra al instante lo último que tenías y refresca en segundo plano:

```ts
const { data } = useSWR(['ventas', negocioId], fetchVentas, {
  keepPreviousData: true,   // no parpadea al cambiar de key
})
```

Si la app ya mantiene todo en un store en memoria (Context/Zustand) que persiste
entre rutas, los cambios de tab NO deben re-fetchear: el dato ya está. Verifica
que el provider del store viva en el layout (no en cada page) para que sobreviva
a la navegación.

## 5. Región en Vercel

Cada query es un round-trip función↔Supabase. Si las funciones corren en una
región lejana a tu proyecto Supabase, cada `await` paga el viaje. Alinea la
región de las funciones de Vercel con la región de tu base de datos.
