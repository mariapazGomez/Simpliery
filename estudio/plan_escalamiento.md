# 4 · Plan de escalamiento — hoja de ruta

> **Leyenda:** ✅ verificado · 🟡 supuesto · 🔮 proyección. 1 USD = CLP 905.
> Roadmap en **dos horizontes** (el brief no fija plazo): **camino a 3 años** (agresivo) y **camino a 5 años** (sostenible). Hitos en ARR, clientes, producto y equipo.

---

## 4.1 La estrategia en una frase

> Entrar por el **wedge de "comercio con despacho + fiado"** (donde no hay competencia), cerrar el foso de **boleta SII opt-in**, crecer **product-led** (autoservicio + bajo CAC) apalancado en **canales subsidiados (Sercotec)** y **viralidad (WhatsApp/referidos)**, y subir el ARPU con **módulos premium y fintech** antes de pensar en expansión regional.

---

## 4.2 Roadmap por fases

### FASE 0 — Cerrar el producto vendible (Q3–Q4 2026) 🔴
**Tesis:** sin boleta SII no se le puede cobrar al segmento formal; sin multi-tenant de OptiRoute no se escala el reparto.

- **Producto:**
  - 🔴 **Boleta electrónica SII opt-in** (integrar un proveedor: OpenFactura/Haulmer, LibreDTE, SimpleFactura o Nubox; token solo en servidor, mismo patrón que OptiRoute). Onboarding guiado de certificado + folios CAF.
  - 🔴 **Multi-tenant de OptiRoute** (hoy token único): que cada negocio conecte su propia cuenta.
  - 🟠 Datos tributarios en el modelo (RUT, giro, neto/IVA, tipoDoc, folioFiscal).
  - 🟠 **Cobro/suscripción** (pasarela: Flow/Webpay/Mercado Pago) + gestión de planes y trials. **Hoy no existe el cobro automatizado** — es prerequisito para tener MRR.
- **GTM:** 50–150 negocios pagando (los primeros, cercanos + boca a boca). Validar que **retienen**.
- **Hito:** producto cobrable + ~US$30–80K ARR. Equipo: fundador + 1 dev.

### FASE 1 — Motor repetible (2027) 🟠
- **Producto:** app móvil (PWA→nativa), código de barras, mejoras de onboarding self-service (cero fricción: que un almacén se registre y venda en 10 min sin humano).
- **GTM:**
  - **Canal Sercotec** "Digitaliza tu Almacén" → fuerza de ventas subsidiada de facto.
  - **Contenido + SEO en español** ("cómo llevar el fiado", "boleta electrónica fácil").
  - **Referidos/viralidad**: el repartidor y el cliente final ven la marca; loops de WhatsApp.
- **Hito (camino 3 años):** ~US$250K ARR (~1.000–1.200 clientes). Equipo ~4–5.
- **Hito (camino 5 años):** ~US$120–180K ARR. Más lento, menos quema.

### FASE 2 — Subir ARPU y escalar (2028) 🔮
- **Producto:** **monetización transaccional** (pasarela de pago con *take rate*, cobranza de fiado automatizada, adelanto/crédito tipo Treinta), tienda/link de pedido público, multi-sucursal.
- **GTM:** ventas asistidas para plan Pro/despacho; partnerships (proveedores mayoristas, gremios de almaceneros).
- **Hito (3 años):** ~US$1M ARR (~4.000–5.000 clientes) → zona de **US$6M de valoración**. Equipo ~11–14.

### FASE 3 — Líder de categoría / regional (2029–2031) 🔮
- **Producto:** plataforma de pagos/crédito, IA de reposición y proyección, API/ecosistema.
- **GTM:** **expansión a Perú/Colombia** (comparten boleta electrónica + realidad de barrio) para multiplicar el SAM.
- **Hito:** US$3M → **US$6M ARR**. Requiere típicamente **capital de riesgo (Serie A)** para financiar la adquisición por delante del ingreso. Equipo ~35–70.

---

## 4.3 Hitos consolidados

| Hito | Camino 3 años 🔮 | Camino 5 años 🔮 | Clientes | Equipo |
|---|---|---|---|---|
| Producto cobrable + SII | Q4 2026 | Q4 2026 | 50–150 | 1–2 |
| US$250K ARR | 2027 | 2028 | ~1.100 | 4–5 |
| US$1M ARR (=US$6M valoración) | 2028 | 2029–30 | ~4.500 | 11–14 |
| US$3M ARR | 2029 | 2031 | ~14.000 | 35–50 |
| **US$6M ARR** | **2029–30 (solo con ARPU↑ + regional)** | **2031–32** | ~25–30K | 50–70 |

---

## 4.4 Go-to-market: canales, CAC y pricing

### Canales de adquisición (ordenados por costo)
1. **Product-led / autoservicio** (el más barato y escalable): trial gratis → autoconversión. Imprescindible con ARPU bajo.
2. **Sercotec / fondos públicos** ("Digitaliza tu Almacén", hasta ~$2,95M por almacén): subsidio que paga la adopción. **Canal estrella para Chile.**
3. **Referidos / viralidad** (WhatsApp, repartidor, cliente final ve la marca).
4. **Contenido/SEO** en español orientado al dolor (fiado, boleta, stock).
5. **Gremios y partnerships** (asociaciones de almaceneros, distribuidores mayoristas).
6. **Ads pagados** (último recurso; solo si el CAC cierra).

### Pricing (ya definido — ver [hallazgos](00_hallazgos.md))
- Base $9.990 / Crecimiento $19.990 / Pro $34.990 CLP/mes. ✅
- 🟡 **Recomendación:** mantener entrada baja como gancho, pero **mover valor a planes altos y add-ons** (boleta SII, despacho/ruta, pasarela con take rate) para subir el **blended ARPU de ~US$18 hacia ~US$30** — eso casi **duplica la viabilidad** (ver [viabilidad §2](viabilidad.md)). Cobro **anual con descuento** para mejorar caja y bajar churn.

### Economía unitaria objetivo 🟡🔮
Con ARPU blended US$18/mes y margen bruto ~80%:

| Métrica | Fórmula | Objetivo |
|---|---|---|
| Churn mensual | — | **< 3–4%** (vida 25–33 meses) |
| **LTV** | ARPU × vida × margen | **~US$360–475** |
| **CAC** | costo adquisición / clientes | **≤ US$60–100** |
| **LTV/CAC** | LTV / CAC | **≥ 3–4×** |
| **Payback CAC** | CAC / (ARPU × margen) | **< 6 meses** |

> Con ARPU tan bajo, **el CAC es la variable de vida o muerte.** Si adquirir un cliente cuesta más de ~US$100, el modelo no cierra a este precio → de ahí la insistencia en autoservicio + Sercotec + referidos (CAC casi cero).

---

## 4.5 Métricas a monitorear (tablero)

- **MRR / ARR** y su crecimiento mes a mes (MoM %).
- **Churn** de clientes y de ingreso (revenue churn); ideal **net revenue retention > 100%** vía upsells.
- **CAC** por canal y **payback**.
- **LTV** y **LTV/CAC**.
- **Activación**: % de registrados que llega a su 1ª venta / 1er fiado / 1ª boleta SII (el "aha moment").
- **Conversión trial→pago** y **mix de planes** (cuántos suben a Pro/despacho).
- **NPS / soporte** (tickets por cliente, tiempo de resolución).

---

## 4.6 Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Boleta SII no se construye/atrasa** | 🔴 Sin segmento que paga; queda atrapado en informales | Priorizar Fase 0; integrar proveedor existente (no construir DTE desde cero) |
| **CAC > LTV** (ARPU bajo) | 🔴 El modelo no cierra | Product-led + Sercotec + referidos; subir ARPU con add-ons |
| **Churn alto** (micronegocios cierran/abandonan) | 🔴 Balde con agujero | Customer Success temprano, onboarding, cobro anual, valor diario (fiado/ruta) |
| **Bsale/Treinta copian el reparto o bajan precio** | 🟠 Erosión del moat | Profundizar el wedge despacho+fiado; velocidad; dependencia sana de OptiRoute o adquirirlo/aliarse |
| **Dependencia de OptiRoute** (proveedor externo, token único) | 🟠 Riesgo operativo y de escala | Resolver multi-tenant; acuerdo formal o alternativa propia a futuro |
| **Arquitectura no escala** (carga todo el negocio, realtime fan-out, sin stock atómico) | 🟠 Se ahoga con muchos datos por negocio | Refactor a consultas paginadas server-side + RPC de stock atómico antes de Fase 2 |
| **Posicionar SII opt-in como "para no declarar"** | 🟠 Reputacional/legal | Mensaje "formalízate cuando estés listo"; la obligación es del comerciante |
| **Meta US$6M ARR a 3 años poco realista** | 🟡 Frustración/expectativas | Fijar hitos intermedios (US$250K → US$1M) y comunicar plazo honesto |
| **Falta de capital para Fase 3** | 🟡 Techo de crecimiento | Llegar a métricas de Serie A (US$1M ARR, retención sana) para levantar |

---

## Fuentes
- Pricing y módulos: archivos del repo (`landing.html`, `src/`). Mercado/competencia: ver [viabilidad.md](viabilidad.md) y [competencia.md](competencia.md).
- [Sercotec](https://www.sercotec.cl/) (programas de digitalización — validar montos vigentes del fondo "Digitaliza tu Almacén").
