# Plan estratégico Control Local — desde hoy hacia millones

> **Punto de arranque (confirmado por el dueño, 14-jun-2026):** pre-revenue (nadie paga aún, sin cobro automatizado) · meta "millones" en el sentido más realista · **fundador solo, full-time, sin equipo** · **bootstrap** ahora, abierto a inversión cuando haya métricas.
> 1 USD = CLP 905 · UF = CLP 40.774 (jun-2026). Complementa [plan_escalamiento.md](plan_escalamiento.md) (genérico) con la realidad concreta del arranque.

---

## 0. La verdad que ordena todo el plan

Estás **solo y sin ingresos**. Entonces tu plan **no es de escalamiento todavía — es de validación.** El error que mata a los fundadores solitarios es construir y escalar antes de probar que **alguien que no te conoce paga y se queda.**

La secuencia es **0 → 1 → N**, y no se salta:

```
   HOY                FASE 0              FASE 1            FASE 2            FASE 3
 pre-revenue   →   ¿cobra y retiene?  →  canal que       → métricas para   → escalar a
 solo, $0           (0 → 1)              repite (1 → N)     levantar           millones
                  30–50 pagando        300–800 clientes   US$250K–1M ARR    US$1M→6M ARR
```

**"Millones" realista:** apunta a **US$1M ARR (≈ US$6M de valoración)** como el hito de "lo logré". US$6M de ARR es la versión líder-de-categoría, de largo plazo (5–7 años, probablemente con capital y/o expansión regional). No persigas el número grande hoy; persigue el **primer cliente desconocido que paga y renueva al mes 3.**

**Tu activo secreto:** tu propio negocio (huevos/fiambres con despacho y fiado). Es tu **cliente cero, tu laboratorio y tu primera carta de recomendación** en un rubro donde nadie tiene ruta+fiado integrados. Empieza por ahí.

---

## FASE 0 — Validar que cobra y retiene · HOY → ~Q1 2027 (≈ 6–9 meses)

**Objetivo único:** pasar de 0 a **30–50 negocios pagando** que **renuevan**, probando que el valor que YA construiste vale plata.

### La jugada clave: NO esperes la boleta SII para cobrar
Tu moat (**despacho + ruta + fiado + CRM + gestión**) **ya está construido y nadie más lo tiene.** Tu propio nicho —comercio con reparto, muchos informales— **no necesita SII para pagarte hoy.** Entonces:

- **Cobra YA por el valor que existe**, al segmento "comercio con despacho/fiado" (tu rubro y sus vecinos).
- **La boleta SII es la llave de la FASE 1** (abre el segmento formal/retail que paga más), no un bloqueador del primer peso.

### Qué construir (en este orden, sin desviarte)
1. 🔴 **Cobro/suscripción automatizado** (Flow/Webpay/Mercado Pago): planes, trial, renovación. **Sin esto no hay MRR.** Es lo primero, siempre.
2. 🟠 **Pulir el onboarding self-service**: que un almacén se registre y haga su primera venta/fiado/despacho **en 10 minutos sin que tú intervengas.** Tu tiempo es el recurso más escaso: no puedes onboardear a mano a cada uno.
3. 🟠 **Boleta SII opt-in** — empezar la integración (proveedor existente: OpenFactura/Haulmer, LibreDTE, SimpleFactura o Nubox; token en servidor, mismo patrón que OptiRoute). No tiene que estar el día 1, pero sí avanzando para abrir la FASE 1.
4. 🟡 **Resolver multi-tenant de OptiRoute** (hoy token único) — necesario apenas el 2º o 3er cliente use despacho.

### Cómo conseguir los primeros 30–50
- Tú mismo + 5–10 cercanos del rubro (gratis 1 mes → pagando).
- Boca a boca en tu red de distribución (proveedores, otros almacenes, ferias).
- Caso real: graba/documenta cómo TU negocio mejoró con la app → es tu mejor pitch.

### Sostenibilidad personal (ramen profitability)
Solo y full-time necesitas que la app te empiece a pagar. A ARPU ~US$18/mes (~$16.000 CLP):
- **~100 clientes ≈ US$1.800/mes (~$1,6M CLP)** → tu sueldo de subsistencia.
- Meta personal realista de fin de FASE 0: **acercarte a esos ~100 pagando.**

### 🚦 Gate para pasar a FASE 1 (no avances sin esto)
- ✅ ≥ 30–50 negocios pagando, **con clientes que NO conoces personalmente**.
- ✅ **Churn < 5%/mes** (la gente se queda al mes 2 y 3).
- ✅ Al menos **1 forma de conseguir clientes que funcionó 2+ veces** (no solo regalados).
- Si esto no se cumple en ~9 meses → **el problema es el producto/mensaje, no el marketing.** Arregla eso antes de gastar un peso en crecer.

---

## FASE 1 — Encontrar el canal que repite · 2027 (≈ US$50–120K ARR, 300–800 clientes)

**Objetivo:** convertir "vendo de a uno" en **una máquina de adquisición barata y repetible**, sin equipo grande.

- **Cierra la boleta SII opt-in** → ahora puedes venderle al segmento formal (almacenes/minimarket que sí pagan más y necesitan boleta). Esto **multiplica tu mercado vendible.**
- **Elige UN canal y exprímelo** (no hagas todos a la vez estando solo):
  - **Sercotec "Digitaliza tu Almacén"** → fuerza de ventas subsidiada de facto (el Estado paga la adopción). El canal #1 para Chile.
  - **Referidos** (incentivo por traer otro negocio) + **contenido/SEO** ("cómo llevar el fiado", "boleta electrónica fácil").
- **Primera contratación** recién cuando el ingreso la pague sola: un **dev part-time/contractor** (para no frenar producto) o **Customer Success** (para retener). A este precio, retener vale más que vender.
- **Sube el ARPU**: empuja el plan Pro (despacho/ruta) y add-ons; cobra **anual con descuento** (mejora caja y baja churn).

### 🚦 Gate para FASE 2 (= métricas levantables)
- ✅ Run-rate **~US$250K–500K ARR** con crecimiento mensual sostenido.
- ✅ **LTV/CAC ≥ 3** y **payback < 6–9 meses** (el canal cierra económicamente).
- ✅ Retención neta sana (idealmente >100% con upsells).
- Con esto, **eres levantable** (tu opción "inversión más adelante" se activa aquí).

---

## FASE 2 — Métricas para levantar y acelerar · 2028 (US$250K → US$1M ARR)

**Objetivo:** alcanzar **US$1M ARR (≈ US$6M de valoración = tu "millones")** y armar equipo.

- **Levantar capital (pre-seed/seed o ángel)** ahora que tienes métricas — para financiar adquisición y equipo por delante del ingreso. Antes de esto NO levantes (te diluyes barato y sin poder de negociación).
- **Arma el equipo núcleo** (ver [equipo_y_areas.md](equipo_y_areas.md)): CTO/líder técnico, 2–3 devs, Customer Success, Growth. Sales del soporte 1-a-1.
- **Monetización transaccional** (estilo Treinta): pasarela de pago con *take rate*, cobranza de fiado automatizada, eventualmente adelanto/crédito. **Sube el ARPU sin subir el precio del plan** → mejora dramáticamente la viabilidad de los "millones".

### 🚦 Gate para FASE 3
- ✅ **US$1M ARR**, equipo funcionando, ARPU en alza.

---

## FASE 3 — Escalar a millones · 2029–2031 (US$1M → US$3M → US$6M ARR)

- **Subir ARPU** (fintech + módulos premium) y **expansión regional** (Perú/Colombia comparten boleta electrónica y realidad de barrio) → multiplica el SAM, única vía realista a US$6M de ARR.
- **Refactor de arquitectura** para escala (consultas server-side paginadas, RPC de stock atómico, realtime acotado) — antes de que el volumen lo exija.
- Posible **Serie A** para la expansión.

---

## Trayectoria resumida (realista, fundador solo → con capital)

| Fase | Cuándo 🔮 | ARR | Clientes | Tú | Foco |
|---|---|---|---|---|---|
| **0 Validar** | Hoy → Q1 2027 | $0 → ~US$50K | 30–100 | solo | Cobro + retención + tu nicho |
| **1 Canal** | 2027 | ~US$50–120K | 300–800 | +1 (part-time) | SII + 1 canal repetible |
| **2 Levantar** | 2028 | US$250K → **US$1M** | 4.000–5.000 | equipo chico | Métricas + capital + fintech |
| **3 Escalar** | 2029–31 | US$1M → **US$6M** | 14.000–30.000 | equipo | ARPU↑ + regional |

> **Tu "millones" = FASE 2 (US$1M ARR / ~US$6M valoración).** Es la meta a perseguir. US$6M de ARR es el horizonte largo, no la meta de los próximos 2–3 años.

---

## Los próximos 90 días (jun–sep 2026) — qué haces tú, solo, esta semana en adelante

1. **Semana 1–2:** montar **cobro de suscripción** (pasarela + planes + trial). Sin esto no existe el negocio. *(prioridad absoluta)*
2. **Semana 2–4:** pulir **onboarding self-service** (registro → primera venta en 10 min sin ti) y dejar el **embudo de medición** (MRR, activación, churn) andando desde el cliente #1.
3. **Mes 2:** cobrarle a **tu propio negocio + 5–10 cercanos del rubro** (trial → pago). Documentar tu caso real como pitch.
4. **Mes 2–3:** arrancar la **integración de boleta SII opt-in** (elegir proveedor) en paralelo. No bloquea el cobro, pero abre la FASE 1.
5. **Mes 3:** primer intento de conseguir **clientes que no conoces** (un canal: Sercotec o referidos) y medir si pagan y se quedan.

**Meta de los 90 días:** no son "miles de clientes" — son **los primeros 10–20 negocios pagando con cobro automático, y la prueba de que renuevan.** Ese es el experimento que vale más que todo el resto del plan.

---

## Decisiones que dependen de ti (no del plan)
- **No levantes capital todavía.** Hazlo en FASE 2, con métricas. Antes te diluyes barato.
- **No construyas todo.** Estando solo, cada función nueva que no sea cobro/SII/retención es una distracción.
- **No persigas US$6M de ARR ahora.** Persigue el cliente #1 que paga y el #30 que se queda. Lo demás se desbloquea solo.
