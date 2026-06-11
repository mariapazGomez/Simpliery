# Pestañas por estado de cliente (`useState` / render condicional)

La URL no cambia (o solo cambia `?tab=`). Un estado decide qué panel se ve. Aquí
no hay navegación de Next que optimizar; la fluidez se gana evitando trabajo y
saltos al cambiar de panel.

## 1. No desmontes paneles caros; ocúltalos

`{tab === 'x' && <PanelX />}` **desmonta** el panel al salir y lo **reconstruye**
(re-fetch, re-cálculo, scroll perdido) al volver. Si el panel es caro o tiene
estado que vale la pena conservar, móntalos todos y alterna visibilidad:

```tsx
<div hidden={tab !== 'ventas'}><PanelVentas /></div>
<div hidden={tab !== 'stock'}><PanelStock /></div>
```

Compromiso: montar todos cuesta memoria/render inicial. Úsalo solo para los 2-3
paneles caros; para paneles triviales, el render condicional está bien.

## 2. `useTransition` para que el clic no se sienta muerto

Si cambiar de panel dispara trabajo pesado (filtrar miles de filas, recalcular
métricas), envuélvelo en `startTransition`: React mantiene el panel actual
interactivo y marca el nuevo como pendiente, sin congelar el clic.

```tsx
const [tab, setTab] = useState('ventas')
const [pending, startTransition] = useTransition()

function irA(next: string) {
  startTransition(() => setTab(next))   // el tab puede mostrar estado "pendiente"
}
// <button aria-busy={pending && objetivo === 'stock'} onClick={() => irA('stock')}>
```

## 3. Sincroniza con `?tab=` SIN recargar

Para que el tab sobreviva a recargas y sea compartible, refleja el estado en la
URL, pero con `scroll: false` y `replace` para no ensuciar el historial ni saltar.

```tsx
'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const router = useRouter()
const pathname = usePathname()
const params = useSearchParams()
const tab = params.get('tab') ?? 'ventas'

function setTab(next: string) {
  const p = new URLSearchParams(params)
  p.set('tab', next)
  router.replace(`${pathname}?${p}`, { scroll: false })  // sin salto ni re-fetch del shell
}
```

Lee el tab inicial de `searchParams` para que el primer render ya muestre el
correcto (no parpadea del default al real).

## 4. Evita saltos de layout (CLS)

- Reserva la altura del contenedor de paneles (`min-height`) para que la barra de
  tabs no "salte" cuando un panel es más corto que otro.
- El indicador del tab activo (subrayado/pill) debe basarse en estado sincrónico,
  no en datos asíncronos, para marcarse en el mismo frame del clic.
- Si los paneles cargan datos, dales su propio skeleton de altura fija.

## Cuándo migrar a tabs por ruta

Si cada panel tiene su propio dataset pesado y quieres prefetch + `loading.tsx`
del lado del server, conviene convertir los tabs a rutas reales (ver
`route-based-tabs.md`). Los tabs por estado brillan cuando el dato ya está todo
en memoria (como un store de cliente) y solo alternas vistas.
