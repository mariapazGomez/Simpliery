# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md
@.claude/Memory.md

## Metodología de Trabajo — Reglas Obligatorias

### 1. Ramas — nunca commits directos a `main`

Cada tarea usa su propia rama antes de tocar código:

```bash
git checkout -b feat/nombre-de-la-tarea   # nueva funcionalidad
git checkout -b fix/nombre-del-bug        # corrección de error
git checkout -b refactor/nombre-cambio    # reestructura sin nueva funcionalidad
git checkout -b chore/nombre-tarea        # configuración, schema, deps
git checkout -b docs/nombre-cambio        # solo documentación
```

Ejemplos válidos: `feat/migrar-categorias`, `chore/schema-iter1`, `refactor/eliminar-cloud-state`

Al terminar: merge a `main`. Si hay revisión pendiente, crear PR primero.

### 2. Backlog — toda tarea se documenta antes de iniciar

Backlog en Notion: https://app.notion.com/p/388b1f3aefb58180bef7f9bd7e5d00a7

Antes de empezar cualquier tarea:
- Verificar que existe el ítem en el backlog (o crearlo si es nuevo)
- El ítem debe tener: descripción clara + criterios de done verificables
- Cambiar estado a "En progreso" al iniciar, "Completado" al hacer merge

### 3. Commits — formato Conventional Commits

```
feat: descripción de lo que se agrega
fix: descripción del problema corregido
refactor: descripción del cambio sin nueva funcionalidad
chore: schema SQL, configuración, deps, archivos de proyecto
docs: cambio en documentación
test: agregar o modificar tests
```

Reglas:
- Un commit por cambio lógico (no batches gigantes de archivos no relacionados)
- Descripción en español, presente, imperativo: "agrega hook useProductos" no "agregué"
- Si el commit cierra un ítem del backlog, mencionarlo: "feat: hook useProductos — B-021"

### 4. Flujo completo de una tarea

```
0. Sincronizar main antes de crear la rama:
   git checkout main
   git pull origin main

1. Verificar ítem en backlog → marcar "En progreso"
2. git checkout -b feat/nombre-tarea
3. Desarrollar con commits frecuentes y descriptivos
4. npm run build && npm test  ← debe pasar antes del merge
5. git checkout main && git merge feat/nombre-tarea
6. Marcar ítem en backlog como "Completado"
```

---

## Commands

```bash
npm run dev      # dev server (Next.js, http://localhost:3000)
npm run build    # production build — typecheck/lint gate (also typechecks tests)
npm run start    # serve production build
npm test         # vitest run — unit tests of business invariants
```

**Tests (vitest)**: `src/lib/__tests__/*.test.ts` cover the pure business logic — `montosPorMetodo` (payment splitting consumed by cierre/flujo/reportes), `clientMetrics` (VIP/riesgo/frecuencia), `precioPorTramo` + granel conversions, channel pricing, `despachoToPedido` (OptiRoute payload), `optirouteStatusToEstado`, `reviveDates`, and the **stock invariants** (`aplicarVentaAProducto`/`revertirVentaDeProducto`/`unidadesBaseDeItems` in store.tsx — registrarVenta/deleteSale delegate to these pure helpers; venta↔anulación symmetry, base-units accounting, float rounding). Config in `vitest.config.ts` (node env, `@` alias, dummy Supabase env vars so store/cloud-state modules can be imported — no test touches the network). **Run `npm test` after touching any of that logic; never inline stock math back into the React closures.**

There is no standalone lint script. `npm run build` runs TypeScript checking + Next.js lint; treat clean build + green tests as the verification bar. The `bash scripts/*.sh` artifact commands mentioned in Memory.md do not exist in this repo.

## Architecture — estado actual del proyecto

### Estado real del store (leer antes de tocar cualquier cosa)

El store YA está conectado a Supabase, pero usa un **antipatrón JSONB**: cada entidad se guarda como `{ id, negocio_id, data: <objeto completo serializado> }`. El adaptador es `src/lib/supabase/cloud-state.ts` (`useCloudCollection` / `useCloudSingleton`).

**Lo que existe y cómo funciona:**

- **`src/lib/store.tsx`** — React Context global con `useStore()`. Carga 5 colecciones vía `useCloudCollection`: `products`, `sales`, `clientes`, `movements`, `despachos`. Más 2 singletons: `settings` y `categorias`. Todo el CRUD cross-entidad vive aquí (`registrarVenta` toca productos + movimientos + clientes + despachos a la vez).
- **`src/lib/supabase/cloud-state.ts`** — El adaptador JSONB. Lee `.select('data')` en vez de columnas tipadas. Al mutar, hace `upsert({ id, negocio_id, data: objetoCompleto })`. **Este archivo desaparece en la migración.**
- **`StoreProvider`** envuelve todo el `(dashboard)` layout. Sin él, ninguna página puede usar `useStore()`.
- **`"use client"` en todo el dashboard** — porque consumen `useStore()`.

### Estrategia de migración activa

**NO** se mantiene `useStore()`. Se elimina junto con `cloud-state.ts`. La migración es:

1. Por cada dominio: crear `src/hooks/useDominio.ts` con queries directas a columnas tipadas
2. Actualizar las páginas del dominio para usar el hook nuevo (dejan de llamar `useStore()`)
3. Borrar el slice correspondiente de `store.tsx`
4. La lógica cross-entidad (stock al vender, etc.) migra a **triggers de BD**, no a los hooks

Referencia completa: ver plan de migración en Notion (backlog ítems B-014 a B-028).

### Módulos fuera del store central

Algunos módulos (`/finanzas`, `/proveedores`, `/cierre-caja`, etc.) tienen su propia conexión a Supabase o están parcialmente implementados. Revisar cada uno antes de asumir que usa `useStore()`.

### Types & domain model

[src/types/index.ts](src/types/index.ts) is the canonical domain model. Beyond interfaces, it exports paired **option arrays + color maps** for every enum (e.g. `PRODUCT_CATEGORIES` + `CATEGORY_COLOR`, `DISPATCH_STATUSES` + `DISPATCH_STATUS_COLOR`, `CLIENT_TYPES`, `EXPENSE_CATEGORIES`, `USER_ROLES`, etc.). Drive `<select>` options and status chips from these arrays/maps — do not hardcode label or color strings in pages. Colors are CSS custom-property references (`var(--...)`), resolved by the design system below.

### Styling & design system

- **Tailwind v4, configured entirely in CSS** ([src/app/globals.css](src/app/globals.css)) via `@import "tailwindcss"` + `@theme inline`. There is no `tailwind.config.js` and no PostCSS plugin config beyond `@tailwindcss/postcss`.
- The look is a custom **warm-neutral / sage-olive design system** built on CSS variables and `oklch()` colors (`--ink`, `--surface`, `--primary`, `--terra`, `--ok/warn/danger/info`, radii `--r*`, shadows `--sh*`). Pages mix Tailwind utilities with semantic class names (`.app`, `.sidebar`, `.nav-item`, `.main`) defined in `globals.css`.
- Reusable primitives live in [src/components/ui/](src/components/ui/): `Card`/`CardHead`, `Btn`, `Chip`, `MetricCard`, `Modal`, `EmptyState`, `PageHeader`, `Topbar`, `Segmented`, `Sidebar`. Compose pages from these.

### Forms & formatting

- Forms use **React Hook Form + `zodResolver`** with a Zod schema defined inline at the top of the page/modal (see [productos/page.tsx](<src/app/(dashboard)/productos/page.tsx>) for the template: schema → `z.infer` type → modal component calling `useStore`'s `add*`/`update*`).
- Locale helpers in [src/lib/format.ts](src/lib/format.ts): `clp()` (CLP currency, `es-CL`), `margin()` (price/cost %), `relativeDate()` (Spanish relative dates). The whole UI is Spanish (`lang="es-CL"`); keep user-facing strings in Spanish.

## Cuando migres un módulo a BD

El patrón es siempre el mismo (ver backlog para el módulo específico):

1. Crear `src/hooks/useDominio.ts` con `SELECT` de columnas tipadas (NO `select('data')`)
2. La página llama `useDominio()` en vez de `useStore().campo`
3. Borrar el slice del dominio de `store.tsx` (estado + funciones + mock si hubiera)
4. Si el dominio tenía lógica cross-entidad en el store, verificar que el trigger de BD ya la cubre

**Nunca usar `useCloudCollection` o `useCloudSingleton`** — son el patrón a eliminar.

Update `.claude/Memory.md` cuando el stack real cambie significativamente.

## Next.js version caveat

Next.js 16.2.7 / React 19 may differ from prior knowledge. Per `AGENTS.md`, consult `node_modules/next/dist/docs/` before relying on framework APIs.

# Auto Mode — Skill Activation

When operating in auto mode, read the task and activate the most relevant skills before starting:

| Task type | Skills to activate |
|---|---|
| Build or redesign a UI page/component | `/frontend-design` |
| Complex prototype with shadcn/ui | `/web-artifacts-builder` |
| Backend API, Supabase integration, or MCP server | `/mcp-builder` |
| Large feature spanning multiple files | `/sparc-methodology` |
| Iterative feature development with quality checks | `/pair-programming` + `/verification-quality` |
| Performance issue (slow page, slow query) | `/performance-analysis` |
| Code review or diff inspection | `/github-code-review` |
| Multiple independent sub-tasks in parallel | `/swarm-orchestration` |
| Create, improve, or test a skill | `/skill-creator` |

**Rule**: Always read `.claude/Memory.md` at session start for project context. Update it when stack, modules, or key decisions change.

---

## Protocolo de Inicio de Sesión

Antes de empezar cualquier tarea, ejecutar en orden:

```
1. Leer .claude/Memory.md  ← stack, módulos, decisiones técnicas
2. Leer Notion: Prioridades de la Semana (38ab1f3a-efb5-8142-9d28-cbec657f0298)
3. Leer Notion: Decisiones de Producto   (38ab1f3a-efb5-8144-b4e9-ed7659934f6b)
4. Si la tarea toca reglas de negocio o clientes:
   - Leer Notion: Reglas de Negocio     (38ab1f3a-efb5-81f9-839a-c127f48f39f1)
   - Leer Notion: Feedback de Clientes  (38ab1f3a-efb5-812f-947a-f011f924e23b)
```

Estas páginas las mantiene el co-founder. Si hay decisiones nuevas que afecten el stack o la arquitectura, actualizar `.claude/Memory.md` después de leerlas.
