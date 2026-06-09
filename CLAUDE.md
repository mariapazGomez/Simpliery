# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md
@.claude/Memory.md

## Commands

```bash
npm run dev      # dev server (Next.js, http://localhost:3000)
npm run build    # production build — also the only typecheck/lint gate
npm run start    # serve production build
```

There is **no** test runner, no standalone lint script, and no separate typecheck script. `npm run build` runs TypeScript checking + Next.js lint; treat a clean build as the verification bar. The `bash scripts/*.sh` artifact commands mentioned in Memory.md do not exist in this repo.

## Architecture — read this before trusting Memory.md / AGENTS.md

The project docs (`.claude/Memory.md`, `AGENTS.md`) describe a Supabase + SSR-auth + server-actions backend. **None of that is wired up yet.** There is no Supabase client, no auth, and no server actions anywhere in `src/`. The Supabase/Zod/RHF packages are installed but the data layer is not built.

What actually exists today is a **fully client-side prototype**:

- **State lives entirely in [src/lib/store.tsx](src/lib/store.tsx)** — a single React Context (`StoreProvider` / `useStore`) holding products, clients, sales, stock movements, dispatches, expenses, reminders, users, and business settings in `useState`, seeded with hardcoded Spanish demo data. All CRUD mutates this in-memory state; **nothing persists across reload**. IDs come from `uuid`.
- **The store is the single source of truth.** Cross-entity logic is centralized there — e.g. `completeSale` decrements product stock, logs `salida` stock movements, and bumps the client's `totalPurchases`/`lastPurchase` in one call. Mirror that pattern (mutate all affected slices together inside the store) rather than scattering side effects into pages.
- **Every dashboard page is `"use client"`.** Despite the "Server Components by default" convention in the docs, the whole `(dashboard)` tree is client-rendered because it consumes `useStore`. `StoreProvider` wraps the tree in [src/app/(dashboard)/layout.tsx](<src/app/(dashboard)/layout.tsx>), so any new dashboard page can call `useStore()` directly.
- **`src/app/page.tsx` redirects to `/dashboard`.** Real navigation is the sidebar in [src/components/ui/sidebar.tsx](src/components/ui/sidebar.tsx); its `NAV_ITEMS` array is the source of truth for routes — add an entry there when you add a module page.

### Types & domain model

[src/types/index.ts](src/types/index.ts) is the canonical domain model. Beyond interfaces, it exports paired **option arrays + color maps** for every enum (e.g. `PRODUCT_CATEGORIES` + `CATEGORY_COLOR`, `DISPATCH_STATUSES` + `DISPATCH_STATUS_COLOR`, `CLIENT_TYPES`, `EXPENSE_CATEGORIES`, `USER_ROLES`, etc.). Drive `<select>` options and status chips from these arrays/maps — do not hardcode label or color strings in pages. Colors are CSS custom-property references (`var(--...)`), resolved by the design system below.

### Styling & design system

- **Tailwind v4, configured entirely in CSS** ([src/app/globals.css](src/app/globals.css)) via `@import "tailwindcss"` + `@theme inline`. There is no `tailwind.config.js` and no PostCSS plugin config beyond `@tailwindcss/postcss`.
- The look is a custom **warm-neutral / sage-olive design system** built on CSS variables and `oklch()` colors (`--ink`, `--surface`, `--primary`, `--terra`, `--ok/warn/danger/info`, radii `--r*`, shadows `--sh*`). Pages mix Tailwind utilities with semantic class names (`.app`, `.sidebar`, `.nav-item`, `.main`) defined in `globals.css`.
- Reusable primitives live in [src/components/ui/](src/components/ui/): `Card`/`CardHead`, `Btn`, `Chip`, `MetricCard`, `Modal`, `EmptyState`, `PageHeader`, `Topbar`, `Segmented`, `Sidebar`. Compose pages from these.

### Forms & formatting

- Forms use **React Hook Form + `zodResolver`** with a Zod schema defined inline at the top of the page/modal (see [productos/page.tsx](<src/app/(dashboard)/productos/page.tsx>) for the template: schema → `z.infer` type → modal component calling `useStore`'s `add*`/`update*`).
- Locale helpers in [src/lib/format.ts](src/lib/format.ts): `clp()` (CLP currency, `es-CL`), `margin()` (price/cost %), `relativeDate()` (Spanish relative dates). The whole UI is Spanish (`lang="es-CL"`); keep user-facing strings in Spanish.

## When wiring up the real backend

If/when Supabase is actually integrated, the natural migration is to keep the `useStore()` API surface and swap the in-memory `useState` bodies for Supabase queries — so pages don't change. Update `.claude/Memory.md` once the stack actually matches its description.

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
