# Plan de modificación — IDs que chocan entre negocios (el bug de "los productos no se guardan")

> Verificado en código real (14-jun-2026). **Corrige mi auditoría previa** ([backend_100_clientes.md](backend_100_clientes.md)): ahí revisé el aislamiento (RLS, correcto) y los índices, pero **NO** revisé la **generación de IDs entre negocios** — y ahí está el bug. Tu memoria de hace días era correcta.

---

## 1. El diagnóstico — qué pasa y por qué

**Síntoma:** un negocio nuevo (cuenta nueva) crea un producto y **no se guarda** (toast "No se pudo guardar (productos)"). Pasa lo mismo, en menor medida, con ventas/clientes/movimientos/despachos entre negocios nuevos.

**Causa raíz — dos cosas que se combinan:**

1. **La clave primaria de cada tabla de colección es solo `id` (global), NO `(negocio_id, id)`.**
   En `schema.sql` cada tabla es `id … primary key`, `negocio_id`, `data`. La PK no incluye el negocio → un `id` debe ser único **en toda la base**, no por negocio.

2. **La app genera IDs que CHOCAN entre negocios:**
   - **Productos** → `const id = Math.max(0, ...products.map(x => x.id)) + 1` ([store.tsx:462](../src/lib/store.tsx#L462)). Un negocio **sin productos** → `Math.max(0)` = 0 → **primer producto = id 1**. Cada negocio empieza en 1, 2, 3… Tu cuenta (el fundador) ya tiene los productos **1–81**. → El producto id=1 del negocio nuevo **choca** con tu producto id=1.
   - **Ventas** → `id: 'b' + boleta` ([store.tsx:296](../src/lib/store.tsx#L296)); la boleta sale del folio **por negocio**, que arranca en **46210** para todos. → Dos negocios nuevos generan ambos `b46210`.
   - **Clientes** (desde venta) → `'cl' + sale.id` → `clb46210`. **Movimientos** → `'mv' + boleta` → `mv46210`. **Despachos** → `'desp_' + sale.id` → `desp_b46210`. Todos heredan el choque.

**Por qué se manifiesta como "no se guarda":** cuando el negocio B inserta `{id:1, negocio_id:B}` y ya existe la fila `(id:1, negocio_id:A)`, el `upsert` ([cloud-state.ts:94-97](../src/lib/supabase/cloud-state.ts#L94)) hace `INSERT … ON CONFLICT (id) DO UPDATE`. El conflicto cae sobre **la fila del negocio A**, que **RLS no deja tocar al negocio B** (`negocio_id = current_negocio_id()` es falso) → **error de RLS → la fila no se guarda.** El aislamiento funciona *tan bien* que **bloquea la escritura que choca** — y eso se ve como "los productos no se guardan".

> ⚠️ Nota: `Math.max(0, ...)` sobre productos arrastra el catálogo del fundador solo si el negocio nuevo lo tuviera; un negocio nuevo arranca con catálogo **vacío** (el alta no siembra productos), así que su contador parte en 1 y choca con tus 1–81. Por eso un negocio nuevo **nunca** puede guardar productos con id ≤ 81.

---

## 2. Alcance — qué entidades están afectadas

| Tabla | Genera id | ¿Choca entre negocios? |
|---|---|---|
| **productos** | `max(id)+1` → 1,2,3… | 🔴 Sí (siempre arranca en 1) |
| **ventas** | `'b'+boleta` (folio desde 46210) | 🔴 Sí (negocios nuevos) |
| **clientes** | `'cl'+sale.id` / `'imp'+Date.now()+i` | 🔴 Sí (los derivados de venta) |
| **movimientos** | `'mv'+boleta` / `'mv'+Date.now()` | 🔴 Sí (los `'mv'+boleta`) |
| **despachos** | `'desp_'+sale.id` | 🔴 Sí |
| gastos/nómina/marketing/metas/cierres/proveedores/recordatorios/notif_config | `'x'+Date.now()` | 🟡 Bajo (mismo milisegundo entre 2 negocios) |
| formatos | `f-…-Date.now()-random` | 🟢 No (lleva sufijo aleatorio) |

> El `uuid` **ni siquiera está importado** en `src/` (el `CLAUDE.md` que dice "los IDs vienen de uuid" está **desactualizado**). Todo se genera con contadores o `Date.now()`.

---

## 3. La solución — UNA jugada estructural: PK compuesta `(negocio_id, id)`

En vez de cambiar cómo la app genera los IDs (invasivo: `Product.id` es `number` y está en todo el código), **hacemos que el `id` sea único POR NEGOCIO** cambiando la clave primaria de cada tabla de colección a **`(negocio_id, id)`**.

Con eso, `(A, 1)` y `(B, 1)` **conviven** sin chocar. El `upsert` resuelve el conflicto sobre `(negocio_id, id)` → el negocio B inserta su producto id=1 limpio → **se guarda.** Arregla **de una sola vez** productos, ventas, clientes, movimientos y despachos.

**Ventajas de este enfoque:**
- ✅ **No toca los tipos** de la app (`Product.id` sigue siendo `number`). Cero refactor de código de pantallas.
- ✅ **Es SQL puro** — lo corres tú en el SQL Editor de Supabase. **No requiere push de código** para el arreglo central.
- ✅ **No borra datos.** Tus datos actuales ya tienen ids únicos; agregar `negocio_id` a la PK sigue siendo único.
- ✅ **Bonus realtime:** al entrar `negocio_id` en la *replica identity* (la PK), los eventos **DELETE** de realtime ahora sí se filtran por negocio (antes el `filter negocio_id=eq.X` no tenía esa columna en el `old` de un DELETE).

**¿Por qué no UUID?** Cambiar `productos.id` a UUID obligaría a cambiar `Product.id`, `SaleItem.productId`, `Format.productId`… de `number` a `string` en todo el código. Caro y arriesgado. La PK compuesta logra lo mismo sin tocar tipos.

---

## 4. Los cambios concretos (SQL, listo para correr)

### 4.1 — PK compuesta en todas las colecciones (el arreglo central)

```sql
-- FIX multi-tenant: id único POR NEGOCIO. Idempotente. NO borra datos.
do $$
declare t text; pk text;
begin
  foreach t in array array[
    'productos','ventas','clientes','movimientos','gastos','nomina',
    'marketing','metas','creditos','proveedores','cierres','formatos','despachos',
    'recordatorios','notif_config'
  ] loop
    -- ¿ya tiene PK compuesta (2 columnas)? entonces saltar
    select conname into pk from pg_constraint
      where conrelid = ('public.'||t)::regclass and contype = 'p';
    if pk is not null then
      -- si la PK actual es solo de 1 columna, reemplazarla
      if (select cardinality(conkey) from pg_constraint where conname = pk
          and conrelid = ('public.'||t)::regclass) = 1 then
        execute format('alter table public.%I drop constraint %I', t, pk);
        execute format('alter table public.%I add primary key (negocio_id, id)', t);
      end if;
    else
      execute format('alter table public.%I add primary key (negocio_id, id)', t);
    end if;
    pk := null;
  end loop;
end $$;
```

### 4.2 — Folio inicial por negocio: arrancar en 1 (no en 46210)

Hoy un almacén nuevo emitiría su **primera boleta como #46210** (tu rango). Lo corregimos para que arranque en 1; **tu cuenta no cambia** (tu fila en `folios` ya existe y conserva tu número).

```sql
alter table public.folios alter column ultimo set default 0;

create or replace function public.siguiente_boleta()
returns bigint language plpgsql security definer set search_path = public as $$
declare nid uuid := public.current_negocio_id(); n bigint;
begin
  insert into public.folios (negocio_id, ultimo) values (nid, 1)
    on conflict (negocio_id) do update set ultimo = public.folios.ultimo + 1
    returning ultimo into n;
  return n;
end; $$;
```

### 4.3 — (Opcional, código) Fallback de boleta coherente
En `registrarVenta`, el respaldo ante fallo de red usa `…Math.max(…, 46209)+1` ([store.tsx:293](../src/lib/store.tsx#L293)). Cambiar `46209` → `0` para que un negocio nuevo sin ventas caiga a boleta 1. Es menor (solo se activa si el RPC falla por red). No bloquea el arreglo.

> **¿Hace falta tocar el `upsert` en `cloud-state.ts`?** Casi seguro **no**: PostgREST usa la PK de la tabla como destino del `ON CONFLICT` por defecto, y al pasar a compuesta usará `(negocio_id, id)`. Si en pruebas apareciera el error *"no unique or exclusion constraint matching the ON CONFLICT specification"*, el plan B es una línea: `.upsert(rows, { onConflict: 'negocio_id,id' })`. Lo verificamos en el paso de pruebas.

---

## 5. Verificación (cómo confirmamos que quedó arreglado)

1. **Correr la SQL** en una rama/proyecto de prueba de Supabase (o en el real; no borra datos).
2. **Prueba de 2 cuentas (la definitiva):**
   - Cuenta A (tú): sigue creando productos/ventas → todo normal, tus números intactos.
   - Cuenta B (correo nuevo): registrarse → crear un producto → **debe guardarse** (recargar y seguir ahí) → registrar una venta → **boleta = 1** → crear despacho → todo persiste.
   - Confirmar que A **no ve** nada de B y viceversa.
3. **Realtime:** con A y B abiertos, borrar algo en A no debe afectar a B; y los DELETE de A se reflejan en otra sesión de A.
4. **Regresión local:** `npm test` (68 tests) + `npm run build` verdes. Los tests no tocan DB, así que no cubren esto → la prueba de 2 cuentas es la que vale. (Opcional: agregar un test que documente que `addProduct` parte en id=1 para dejar explícita la premisa del bug.)

---

## 6. Orden de despliegue (importante)

1. **Primero la SQL** (4.1 + 4.2) en Supabase → SQL Editor.
2. (Opcional) push del 4.3 por GitHub Desktop.
3. Si en pruebas hiciera falta el `onConflict` explícito (plan B), ese cambio de código se pushea **después** de la SQL (nunca antes: sin la PK compuesta, PostgREST daría error).

> Como nadie más usa la app todavía (solo tu negocio), **no hay datos de otros negocios que migrar** — el arreglo es limpio y oportuno: hazlo **antes** de abrir el registro a cuentas nuevas.

---

## 7. Riesgos y mitigación

| Riesgo | Nivel | Mitigación |
|---|---|---|
| Perder datos al cambiar la PK | 🟢 Bajo | `alter … add primary key` no borra filas; tus ids ya son únicos. Idempotente. |
| Romper tu app en vivo al pushear código antes de la SQL | 🟠 | El arreglo central es **SQL-only**; el `onConflict` (si hace falta) va **después** de la SQL. |
| Que PostgREST no infiera la PK compuesta | 🟡 | Plan B de 1 línea (`onConflict: 'negocio_id,id'`), verificado en pruebas. |
| FK que impida soltar la PK | 🟢 Bajo | Ninguna tabla referencia estos `id` por FK (revisado). |

---

## 8. Checklist + follow-ups del "plan completo"

**Arreglo del bug (esta entrega):**
- [ ] Correr SQL 4.1 (PK compuesta).
- [ ] Correr SQL 4.2 (folio inicial = 1).
- [ ] Prueba de 2 cuentas (crear producto en cuenta nueva → persiste).
- [ ] (Opcional) push del fallback 4.3 y/o `onConflict` si pruebas lo piden.

**Endurecimiento relacionado (del [informe de backend](backend_100_clientes.md), para 100 clientes):**
- [ ] Subir Supabase a **Pro** (disponibilidad + backups + 500 conexiones realtime).
- [ ] **RPC de stock atómico** en `registrarVenta` (correctitud con vendedora+admin a la vez).
- [ ] Confirmación de correo en el signup (anti-abuso).
- [ ] Actualizar `CLAUDE.md` (el "IDs vienen de uuid" es falso; documentar la PK compuesta por negocio).

> **Conclusión:** el bug es real y serio, pero el arreglo es **quirúrgico y de bajo riesgo** (SQL, sin tocar tipos ni pantallas), y este es el **momento exacto** para hacerlo: antes de que entre el primer negocio nuevo.
