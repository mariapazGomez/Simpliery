# Auditoría de backend — ¿qué falta para 100 negocios activos?

> Verificación directa del código real (14-jun-2026), no de memoria. Archivos auditados: `supabase/schema.sql`, `usuarios.sql`, `multiusuario.sql`, `despachos.sql`, `recordatorios.sql`, `src/lib/supabase/cloud-state.ts`, `client.ts`, `src/lib/store.tsx` (+ finanzas/formats stores) y el layout del dashboard.
> **Leyenda severidad:** 🔴 bloqueante · 🟠 importante · 🟡 a vigilar.

---

## Veredicto en una línea

**El multi-tenant es REAL y está bien hecho: 100 negocios SEPARADOS están soportados por diseño.** El aislamiento lo impone la base de datos (RLS en todas las tablas), no la app. Lo que falta NO es aislamiento — es: **(1) subir el plan de Supabase, (2) cobro + control por plan, (3) dos arreglos de correctitud (stock atómico y folio inicial), y (4) vigilar un techo "por cuenta" (la app carga todo el negocio en cada sesión).** Para 100 negocios *chicos*, la capacidad en plan Pro es holgada.

### Aclaración sobre "la base soporta solo mi flujo"
Es **impreciso**. La base **sí aísla por negocio** (lo verifiqué). Lo cierto es más matizado: estás en un **plan/infra dimensionado para un negocio**, y **dos comportamientos están afinados para un solo negocio chico** — "cargar todo el historial en cada login" y "última escritura gana" en el stock. Eso no rompe el aislamiento entre clientes; hay que endurecerlo antes de meter carga multi-usuario/multi-cuenta pesada.

---

## ✅ Lo que YA está sólido (no tocar)

| Pieza | Estado | Dónde |
|---|---|---|
| **Aislamiento por negocio (RLS)** | Toda tabla con `enable row level security` + política `negocio_id = current_negocio_id()` FOR ALL. La DB filtra, no la app. | `schema.sql:131-150` |
| **`current_negocio_id()` / `current_rol()`** | `SECURITY DEFINER stable` → sin recursión en políticas; lookup por PK de `perfiles`. | `schema.sql:42-50` · `usuarios.sql:21-29` |
| **Índices `negocio_id`** | Cada tabla de colección tiene su índice `*_negocio_idx`. | `schema.sql:63,84` |
| **Folio (boleta) atómico** | `siguiente_boleta()` con `insert … on conflict update returning` → sin boletas duplicadas entre vendedores. La app lo usa en `registrarVenta`. | `multiusuario.sql:33-49` · `store.tsx:291` |
| **Alta automática de negocio** | `handle_new_user` crea negocio+perfil+config+categorías, o **une por invitación** si el correo fue invitado. Self-service real. | `usuarios.sql:69-126` |
| **Realtime por negocio** | Publicación de todas las tablas + canal filtrado `negocio_id=eq.X`; respeta RLS. | `multiusuario.sql:54-70` · `cloud-state.ts:133-155` |
| **Un solo cliente Supabase** | `createBrowserClient` memoizado (sin múltiples GoTrueClient). | `client.ts:7-17` |
| **Paginación de carga** | `fetchAllRows` pagina de a 1000 (no corta colecciones grandes). | `cloud-state.ts:43-59` |
| **Errores visibles** | Fallos de sync se muestran al usuario por toast, no se pierden en silencio. | `cloud-state.ts:17-23` |
| **Conexiones DB** | La app usa PostgREST (HTTP, pooled por Supabase), **no** conexiones Postgres por usuario → no hay riesgo de agotar conexiones. | — |

> Traducción: el "esqueleto" para 100 negocios distintos ya existe. Por eso el salto a multi-cliente es de **infra + producto**, no de re-arquitectura.

---

## ❌ Lo que FALTA para 100 negocios activos (priorizado)

### 🔴 1. Subir el plan de Supabase (Free → Pro)
El plan Free **no sirve** para clientes en vivo:
- **Pausa el proyecto tras 7 días de inactividad** (inaceptable para clientes pagando).
- 500 MB de DB, **200 conexiones realtime concurrentes**, sin backups diarios.

**Plan Pro (~US$25/mes)** resuelve: 8 GB DB, 100K MAU, **500 conexiones realtime concurrentes**, **backups diarios (7 días)**.

**Cálculo para 100 negocios:**
- **MAU:** 100 negocios × 1–3 usuarios = ~100–300 → nada frente a 100K. ✅
- **Realtime concurrente:** cada sesión abre **11 canales** (productos, ventas, clientes, movimientos, despachos, formatos, gastos, nómina, marketing, metas, créditos) sobre **1 solo WebSocket** (= 1 conexión). 100 negocios × 1–3 sesiones simultáneas ≈ **100–300 conexiones** → dentro de Pro (500), fuera de Free (200). ✅ en Pro
- **DB:** 100 negocios chicos en JSONB → muy por debajo de 8 GB. ✅
- ⚠️ **No bajar "Max Rows" de 1000** (la paginación de `fetchAllRows` asume páginas de 1000).

**Esfuerzo:** trivial (es una decisión de facturación). **Es el bloqueante #1 y el más fácil.**

### 🔴 2. Cobro + control de suscripción por negocio
Hoy **no hay forma de cobrar ni de limitar por plan**: cualquiera que se registre tiene todo gratis, sin trial ni corte. Para **100 clientes *pagando*** falta:
- Pasarela (Flow/Webpay/Mercado Pago) + estado de suscripción.
- Columnas en `negocios` (`plan`, `estado_suscripcion`, `trial_hasta`) y **gating** (qué módulos ve cada plan; cortar al no-pagador).

**Esfuerzo:** medio. Es el item #1 del [plan estratégico](plan_estrategico.md) (Fase 0). Sin esto no hay MRR.

### 🟠 3. Stock NO atómico ("última escritura gana")
`syncDiff` guarda **la fila completa** (`data`) por upsert (`cloud-state.ts:85-108`). El **folio** es atómico, pero el **descuento de stock se calcula en el cliente** y se escribe como fila entera. Con **dos usuarios del mismo negocio a la vez** (vendedora + admin, o dos cajas), pueden pisarse: una venta sobrescribe el stock de la otra → **el inventario queda mal contado.**
- Para 100 negocios con **1 usuario a la vez**, el riesgo es bajo.
- Para negocios con **vendedora + admin simultáneos** (tu propio caso), es un **riesgo de correctitud real**.

**Arreglo:** un RPC atómico de descuento de stock para el camino caliente (`registrarVenta`), igual que se hizo con la boleta (decremento en el servidor, no en el closure de React). **Esfuerzo:** medio. **Recomendado antes de empujar multi-usuario.**

### 🟠 4. Folio inicial heredado del fundador (bug multi-tenant)
`folios.ultimo default 46209` y `siguiente_boleta` arranca en **46210** (`multiusuario.sql:14,43`). Eso es **tu rango de boletas actual**, horneado en el esquema. **Un almacén nuevo empezaría su primera boleta en #46210**, no en #1. Para 100 negocios nuevos es incorrecto.

**Arreglo:** que un negocio nuevo arranque en 1 (o en un inicio configurable por el dueño). `default 0` → primera boleta = 1, e inicializar `folios` solo desde las ventas existentes de *ese* negocio. **Esfuerzo:** trivial. **Hacer antes de abrir signup público.**

### 🟡 5. "Cargar TODO el negocio" en cada sesión (techo por cuenta)
Cada sesión hace `fetchAllRows` de **11 colecciones** y trae **todo el historial** (todas las ventas, movimientos, etc.) a memoria (`cloud-state.ts:118-129`). Es **por negocio**, así que NO rompe el multi-tenant, pero:
- Un negocio con un año de uso intenso (miles de ventas+movimientos) tendrá **logins lentos y mucha memoria**.
- No es bloqueante para 100 negocios *chicos*; es el techo que impide escalar a cuentas grandes o a miles de negocios.

**Arreglo (más adelante):** cargar acotado por fecha/paginado las colecciones pesadas (ventas, movimientos) en vez de "todo". **Esfuerzo:** medio-alto. **Vigilar, no urgente para 100 chicos.**

### 🟡 6. Otros a vigilar
- **Volumen de mensajes realtime:** cada escritura se reparte a las sesiones de ese negocio. Pro incluye ~5M mensajes/mes; 100 negocios chicos deberían caber, pero **monitorear** el uso.
- **Abuso de signup:** alta self-service crea un negocio por usuario → activar **confirmación de correo** (Supabase Auth) + captcha para evitar negocios basura. Esfuerzo bajo.
- **Fallback de boleta:** si el RPC falla por red, `registrarVenta` cae a `max+1` local (`store.tsx:293`) → riesgo mínimo de duplicado en cortes de red. Aceptable, anotado.
- **Observabilidad:** hoy solo `console.error` + toast. Para 100 clientes conviene monitoreo de errores (Sentry o similar) y alertas de Supabase. Esfuerzo bajo.
- **Backups:** vienen con Pro (diarios 7 días); para datos de clientes pagando, considerar el add-on **PITR**.

---

## Plan de acción (orden recomendado)

| # | Acción | Severidad | Esfuerzo | Cuándo |
|---|---|---|---|---|
| 1 | **Subir a Supabase Pro** + activar backups + confirmación de correo | 🔴 | Trivial | Ya (antes del 1er cliente externo) |
| 2 | **Folio inicial por negocio** (arrancar en 1, no 46210) | 🟠 | Trivial | Antes de abrir signup |
| 3 | **Cobro + gating por plan** (pasarela + estado suscripción + límites) | 🔴 | Medio | Fase 0 (en curso) |
| 4 | **RPC de stock atómico** para `registrarVenta` | 🟠 | Medio | Antes de empujar vendedora+admin simultáneos |
| 5 | **Monitoreo** (Sentry + alertas Supabase) | 🟡 | Bajo | Al sumar clientes |
| 6 | **Carga acotada** de ventas/movimientos (no "todo") | 🟡 | Medio-alto | Cuando una cuenta crezca / camino a miles |

> **Para 100 negocios chicos:** con **#1 + #2 + #3** estás operativo y cobrando; **#4** es el seguro de correctitud para los que tengan varios usuarios a la vez; **#5–#6** son endurecimiento progresivo. Ninguno exige re-arquitectura — el diseño multi-tenant ya aguanta.

---

## Capacidad estimada (resumen)

| Recurso | Necesidad de 100 negocios chicos | Plan Free | Plan Pro |
|---|---|---|---|
| MAU (Auth) | ~100–300 | 50K ✅ | 100K ✅ |
| Conexiones realtime concurrentes | ~100–300 | 200 ⚠️ | 500 ✅ |
| Tamaño DB | < 1 GB | 500 MB ⚠️ | 8 GB ✅ |
| Disponibilidad | 24/7 | ❌ se pausa | ✅ |
| Backups | requeridos | ❌ | ✅ diarios |

**Conclusión:** 100 negocios activos chicos **caben cómodos en Pro**. El límite real no es la cantidad de negocios — es el **tamaño/actividad de cada cuenta** (item #6) y la **correctitud bajo varios usuarios simultáneos** (item #4).
