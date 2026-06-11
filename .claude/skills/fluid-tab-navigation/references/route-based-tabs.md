# Pestañas por ruta (`<Link>` + prefetch + `loading.tsx`)

Cada tab es una URL distinta bajo un layout compartido. La fluidez se gana con
4 piezas: prefetch, skeleton instantáneo, no bloquear el layout, y feedback en
el clic.

## 1. Usa `<Link>`, no `router.push` en un `onClick`

`<Link>` de `next/link` precarga la ruta (chunk JS + payload RSC) cuando entra
al viewport o al hacer hover. `router.push` desde un `onClick` plano NO precarga
nada → el clic descarga todo en ese momento.

```tsx
import Link from 'next/link'

// ✅ precarga automática
<Link href="/dashboard/ventas" className={isActive ? 'tab tab-active' : 'tab'}>
  Ventas
</Link>

// ❌ pierde el prefetch
<button onClick={() => router.push('/dashboard/ventas')}>Ventas</button>
```

- `prefetch` por defecto es automático (precarga en viewport). Déjalo así; solo
  fuerza `prefetch={true}` si el tab está fuera de pantalla y quieres adelantarlo.
- Si el clic además debe cerrar un drawer o hacer scroll, usa `onClick` EN el
  `<Link>` (se ejecuta junto a la navegación), no reemplaces el `<Link>`.

## 2. Añade `loading.tsx` en el segmento

Sin `loading.tsx`, Next espera a que el server termine antes de pintar nada →
pantalla congelada. Con él, Next envuelve la página en `<Suspense>` y muestra el
skeleton al instante mientras llegan los datos.

```tsx
// app/(dashboard)/ventas/loading.tsx
export default function Loading() {
  return <SkeletonTabla filas={8} />   // mismo layout que la página real
}
```

Haz que el skeleton **calce con la forma final** (misma altura de cards, mismo
número de columnas) para que no haya salto cuando llega el contenido.

## 3. No bloquees el layout compartido

El `layout.tsx` que envuelve los tabs se reutiliza entre ellos: NO se vuelve a
montar al cambiar de pestaña. Si hace `await` de datos lentos en su cuerpo, ese
await corre igual y bloquea. Mantén el layout liviano; baja los fetches a cada
`page.tsx` con su `<Suspense>`.

```tsx
// app/(dashboard)/[tab]/page.tsx
export default function Page() {
  return (
    <Suspense fallback={<SkeletonTabla />}>
      <DatosDeLaPestaña />   {/* aquí adentro va el await */}
    </Suspense>
  )
}
```

## 4. Feedback inmediato en el clic

Aunque la data tarde, el tab debe marcarse activo en el mismo frame.

```tsx
// Next 15.3+: estado de carga del propio Link
'use client'
import { useLinkStatus } from 'next/link'
function TabSpinner() {
  const { pending } = useLinkStatus()
  return pending ? <Spinner /> : null
}
// <Link ...><span>Ventas</span><TabSpinner /></Link>
```

Para marcar el activo al instante sin esperar al server, deriva el estado activo
de `usePathname()` (cambia sincrónicamente) en vez de esperar a que monte la
página.

## 5. Rutas paralelas (`@slot`) — cuando varios paneles coexisten

Si la pantalla muestra varias zonas que cargan por separado (ej. lista + detalle),
las rutas paralelas dejan que cada slot tenga su propio `loading.tsx` y haga
streaming independiente, sin que una zona lenta bloquee a la otra.

```
app/(dashboard)/
  @lista/page.tsx
  @detalle/page.tsx
  layout.tsx        // recibe { lista, detalle } como props
```

## Errores comunes

- Poner `'use client'` en la página de datos solo para un botón → mata el
  streaming de RSC y el prefetch del payload. Aísla la interactividad en un
  componente cliente pequeño y deja la página como Server Component.
- Un `loading.tsx` genérico (spinner centrado) en vez de un skeleton con la
  forma real → se ve un salto al llegar el contenido.
- Reconstruir el layout en cada page (repetir el shell) en vez de usar el
  `layout.tsx` compartido → se re-renderiza y re-fetchea de más.
