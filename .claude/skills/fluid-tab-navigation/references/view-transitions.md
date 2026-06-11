# Animar la transición entre pestañas (View Transitions)

**Solo después** de que la navegación ya sea instantánea (prefetch + `loading.tsx`
+ feedback en el clic). Animar una navegación que tarda solo hace más evidente
que tarda. La animación es la guinda, no el arreglo.

> Experimental. Las APIs varían entre versiones de Next/React — confirma contra
> la versión instalada (`node_modules/next/dist/docs/`) antes de depender de ellas.

## Opción A — CSS View Transitions API (la más simple, sin librerías)

El navegador hace un crossfade automático entre el antes y el después del DOM.
En Next App Router se habilita con la bandera experimental:

```ts
// next.config.ts
export default { experimental: { viewTransition: true } }
```

Luego personaliza la animación con las pseudo-clases nativas:

```css
::view-transition-old(root) { animation: fadeOut .18s ease both; }
::view-transition-new(root) { animation: fadeIn  .18s ease both; }
@keyframes fadeOut { to { opacity: 0 } }
@keyframes fadeIn  { from { opacity: 0 } }
```

Para que dos elementos "se muevan" entre pestañas (ej. un título que se reubica),
dales el mismo `view-transition-name` en ambas vistas.

## Opción B — `<ViewTransition>` de React (control fino)

React 19 expone un componente experimental para acotar qué anima y cómo:

```tsx
import { unstable_ViewTransition as ViewTransition } from 'react'

<ViewTransition>
  <PanelActivo />
</ViewTransition>
```

Combínalo con `useTransition` para que la animación arranque junto al cambio de
estado/ruta y no bloquee la interacción.

## Buenas prácticas

- **Corta y sutil**: 150–200ms, `ease`. Más largo se siente lento.
- **Respeta accesibilidad**: desactiva con `@media (prefers-reduced-motion: reduce)`.
  ```css
  @media (prefers-reduced-motion: reduce) {
    ::view-transition-old(root), ::view-transition-new(root) { animation: none; }
  }
  ```
- **No animes layout caro**: anima `opacity`/`transform`, nunca propiedades que
  disparen reflow (width/height/top/left) en elementos grandes.
- **Un solo momento de impacto**: un crossfade del contenido basta. Evita animar
  cada card por separado además de la transición de página.

## Si no quieres tocar config experimental

Un crossfade del contenido con CSS puro al montar la página también funciona y es
100% estable (es lo que muchas apps usan):

```css
.page-enter { animation: pageIn .2s ease both; }
@keyframes pageIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1 } }
```

Aplica `.page-enter` al contenedor de cada página. Sutil, sin dependencias, sin
banderas experimentales.
