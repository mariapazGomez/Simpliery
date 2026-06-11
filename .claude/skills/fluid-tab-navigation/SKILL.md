---
name: fluid-tab-navigation
description: >-
  Hace que la navegación entre pestañas (tabs) de una app Next.js (App Router) +
  Supabase + Vercel se sienta instantánea y fluida: sin parpadeos, sin pantallas
  en blanco al cambiar de tab, sin re-fetch innecesario del layout, con
  prefetch, skeletons de carga, estado "pendiente" en el tab activo y
  transiciones animadas. Usa esta skill SIEMPRE que el usuario mencione que el
  cambio entre pestañas/tabs se siente lento, brusco, con saltos, con flash, que
  "tarda" o "no es fluido", o pida mejorar/animar/optimizar la navegación,
  transiciones de página, o el menú/barra de tabs. Aplícala aunque no diga
  explícitamente "navegación" — si está moviéndose entre secciones de la app y
  quiere que se sienta mejor, esta es la skill.
---

# Navegación fluida entre pestañas (Next.js App Router + Supabase + Vercel)

El objetivo es que cambiar de pestaña se sienta **instantáneo**: el usuario hace
clic y *algo* responde en el mismo frame (el tab se marca activo y aparece un
skeleton si hay datos cargando), en lugar de quedarse mirando una pantalla
congelada o en blanco hasta que llega la respuesta del servidor.

## Paso 0 — Diagnosticar qué tipo de pestañas son

Antes de tocar nada, identifica el patrón. Determina TODO lo demás.

1. **Pestañas por ruta** — cada tab es una URL distinta (`/dashboard/ads`,
   `/dashboard/creatives`) y se navega con `<Link>` o `router.push`. La URL
   cambia al hacer clic. → Lee `references/route-based-tabs.md`.
2. **Pestañas por estado de cliente** — la URL no cambia (o solo cambia un
   `?tab=`), y un `useState` decide qué panel se muestra. → Lee
   `references/client-state-tabs.md`.

Cómo distinguir rápido: busca en el código de la barra de tabs. Si ves
`<Link href=...>` o `router.push`, es **por ruta**. Si ves
`onClick={() => setTab(...)}` con render condicional (`{tab === 'x' && ...}`),
es **por estado**. Una app puede mezclar ambos; trátalos por separado.

**No asumas.** Abre el componente de la barra de pestañas y el layout que lo
contiene antes de proponer cambios. La causa de la lentitud casi siempre está en
uno de esos dos archivos más el `layout.tsx` padre.

## Las 5 causas reales de una navegación que "no es fluida"

Prácticamente todos los casos se reducen a esto. Revísalos en orden:

1. **El layout padre hace `await` de datos lentos.** Si `layout.tsx` (el que
   envuelve todas las pestañas) hace `await supabase...` directo en el cuerpo,
   ese fetch bloquea CADA cambio de tab que comparta ese layout. Es la causa #1.
   Solución: saca los fetches lentos del layout y bájalos a cada `page.tsx`,
   envueltos en `<Suspense>`. El layout solo debe traer datos que de verdad sean
   comunes y rápidos (o cacheados).

2. **No hay `loading.tsx`.** Sin un archivo `loading.tsx` en el segmento, Next
   espera a que el servidor termine antes de mostrar nada → pantalla congelada.
   Con `loading.tsx`, el skeleton aparece al instante mientras llegan los datos.

3. **No se usa `<Link>` (o el prefetch está apagado).** `<Link>` de `next/link`
   precarga la ruta automáticamente cuando entra al viewport o al hacer hover, así
   que al hacer clic ya está casi todo listo. Si navegan con `router.push` desde
   un `onClick` plano, pierden el prefetch. Usa `<Link>` para los tabs.

4. **No hay feedback inmediato en el clic.** Aunque la data tarde, el tab debe
   marcarse activo al instante. Usa `useLinkStatus` (Next 15.3+) o
   `useTransition` para mostrar estado "pendiente". Sin esto, el clic se siente
   muerto aunque todo lo demás esté bien.

5. **Waterfalls de Supabase.** Varias queries `await` en serie que no dependen
   entre sí multiplican la latencia. Paralelízalas con `Promise.all` y deduplica
   con `cache()` de React. Detalle en `references/supabase-data.md`.

## Flujo de trabajo

1. Identifica el patrón (Paso 0) y lee el reference correspondiente.
2. Recorre las 5 causas de arriba contra el código real. Anota cuáles aplican.
3. Aplica los arreglos del reference, de mayor a menor impacto (normalmente:
   sacar fetch del layout → añadir `loading.tsx` → asegurar `<Link>` + prefetch →
   estado pendiente → paralelizar Supabase).
4. Si el usuario quiere animación (crossfade/slide entre tabs), añade View
   Transitions: lee `references/view-transitions.md`. Es opcional y va al final,
   nunca antes de arreglar la fluidez real — animar una navegación que tarda solo
   hace más evidente que tarda.
5. Verifica (ver abajo).

## Regla de oro

Fluidez ≠ animación. Primero haz que la navegación sea **instantánea y sin
bloqueo** (prefetch + `loading.tsx` + feedback en el clic + sin fetch en el
layout). Las transiciones animadas son la guinda, y se ponen al final. Un equipo
suele "arreglar" la sensación de lentitud poniendo una animación de fade, lo cual
solo disfraza el problema y añade latencia percibida.

## Verificación

Después de los cambios, comprueba:

- **Network throttling**: en DevTools, pon la red en "Slow 4G" y cambia de tab.
  El tab debe marcarse activo *al instante* y debe aparecer un skeleton, no una
  pantalla congelada ni blanca.
- **Sin re-fetch del shell**: cambiando entre dos tabs hermanos, las queries del
  layout compartido NO deben repetirse en la pestaña Network. Si se repiten, hay
  fetch atrapado en el layout o falta `cache()`.
- **Prefetch activo**: al hacer hover sobre un tab (o al cargar la página) deben
  verse las peticiones de prefetch de Next en Network antes del clic.
- **Build limpio**: `next build` sin warnings nuevos; confirma que los Server
  Components con datos no se volvieron Client Components por error (`'use client'`
  de más mata el prefetch de RSC y el streaming).
- **En Vercel**: revisa que las funciones de las rutas de tabs no estén en
  regiones lejanas a tu base de datos Supabase (un round-trip transatlántico por
  query se nota). Alinea la región de las funciones con la región de Supabase.

## Referencias

- `references/route-based-tabs.md` — Tabs como rutas: `<Link>` + prefetch,
  `loading.tsx`, rutas paralelas (`@slot`), estado pendiente, layouts.
- `references/client-state-tabs.md` — Tabs por `useState`: mantener paneles
  montados, `useTransition`, sincronizar con `?tab=`, evitar saltos de layout.
- `references/supabase-data.md` — Evitar waterfalls, paralelizar, `cache()`,
  patrón de revalidación en cliente con SWR/React Query.
- `references/view-transitions.md` — Animar la transición (crossfade/slide) con
  la View Transitions API y `<ViewTransition>` de React. Experimental.
