# Control Local — Project Memory

> Máximo 200 líneas. Actualizar cuando cambien stack, módulos o decisiones clave.

---

## Proyecto

**Nombre**: Control Local
**Propósito**: App de gestión empresarial para pequeñas empresas chilenas
**Estado**: En desarrollo activo

---

## Stack Técnico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js | 16.2.7 |
| UI | React | 19.2.4 |
| Lenguaje | TypeScript | 5 |
| Estilos | Tailwind CSS | 4 |
| Base de datos | Supabase (PostgreSQL) | ^2.108 |
| Auth | Supabase SSR | ^0.10.3 |
| Formularios | React Hook Form + Zod | 7.x / 4.x |
| Íconos | Lucide React | ^1.17 |
| Gráficos | Recharts | ^3.8 |
| Fechas | date-fns | ^4.4 |
| CSV | Papaparse | ^5.5 |
| IDs | UUID | ^14 |
| Variantes UI | class-variance-authority + clsx | — |

---

## Estructura de Módulos

```
src/app/
├── (dashboard)/
│   ├── clientes/        ← Gestión de clientes
│   ├── productos/       ← Catálogo de productos
│   ├── inventario/      ← Control de stock
│   ├── ventas/          ← Registro de ventas
│   ├── despachos/       ← Despachos y envíos
│   ├── finanzas/        ← Flujo de caja, ingresos/egresos
│   ├── segmentos/       ← Segmentación de clientes
│   ├── reportes/        ← Reportes y exportación
│   ├── notificaciones/  ← Alertas y avisos
│   ├── recordatorios/   ← Tareas pendientes y recordatorios
│   ├── usuarios/        ← Gestión de usuarios y roles
│   └── configuracion/   ← Config general del negocio
├── layout.tsx           ← Layout raíz (fuente, metadata)
└── page.tsx             ← Redirect o landing
```

---

## Skills Disponibles

| Skill | Cuándo usarla |
|---|---|
| `/frontend-design` | Diseñar o rediseñar componentes/páginas con estética distintiva |
| `/web-artifacts-builder` | Prototipos complejos React + shadcn/ui en HTML standalone |
| `/mcp-builder` | Crear servidores MCP para integrar APIs externas al backend |
| `/sparc-methodology` | Tareas de desarrollo grandes → dividir en fases estructuradas |
| `/pair-programming` | Desarrollo iterativo con revisión continua de calidad |
| `/verification-quality` | Verificar que una feature funciona correctamente |
| `/github-code-review` | Revisar PRs o diffs antes de hacer merge |
| `/performance-analysis` | Detectar bottlenecks en renders o queries |
| `/swarm-orchestration` | Tareas paralelas que pueden dividirse en sub-agentes |

---

## Convenciones del Proyecto

- **Componentes**: Server Components por defecto; `"use client"` solo cuando se necesite estado/eventos
- **Rutas**: App Router de Next.js; grupo `(dashboard)` con layout compartido
- **DB**: Supabase con cliente SSR (`@supabase/ssr`) para Server Components
- **Validación**: Zod en server actions y formularios client-side
- **Estilos**: Tailwind 4 (sin `tailwind.config.js` — config por CSS)
- **No hay**: Redux, Context API propio, ni React Query aún

---

## Decisiones Arquitectónicas

- Sin ORM — queries directas con Supabase JS client
- Tailwind v4 (nueva sintaxis de config vía CSS, no JS)
- Next.js 16 puede tener APIs distintas al conocimiento previo — leer `node_modules/next/dist/docs/` antes de escribir código
- Autenticación delegada 100% a Supabase Auth

---

## Scripts de Desarrollo

```bash
npm run dev      # servidor desarrollo
npm run build    # build producción
npm run start    # servidor producción

# Artifacts frontend standalone:
bash scripts/init-artifact.sh <nombre>
bash scripts/bundle-artifact.sh
```

---

## Contexto de Negocio — Notion (leer al iniciar sesión)

Estas páginas las mantiene el co-founder con contexto de negocio actualizado.
Leerlas vía MCP al inicio de cada sesión de trabajo.

| Página | ID Notion |
|---|---|
| 🧠 Contexto para el Agente (raíz) | `38ab1f3a-efb5-818a-9ad3-c2d2beba857d` |
| 📋 Reglas de Negocio | `38ab1f3a-efb5-81f9-839a-c127f48f39f1` |
| 🎯 Decisiones de Producto | `38ab1f3a-efb5-8144-b4e9-ed7659934f6b` |
| 💬 Feedback de Clientes | `38ab1f3a-efb5-812f-947a-f011f924e23b` |
| 🗓️ Prioridades de la Semana | `38ab1f3a-efb5-8142-9d28-cbec657f0298` |

**Protocolo:** Leer primero "Prioridades de la Semana" y "Decisiones de Producto". Leer las otras dos si la tarea involucra reglas de negocio o clientes.
