# 5 · Resumen ejecutivo — Control Local

> Síntesis para decidir. Detalle en [viabilidad](viabilidad.md) · [competencia](competencia.md) · [equipo](equipo_y_areas.md) · [plan](plan_escalamiento.md) · [hallazgos](00_hallazgos.md).
> 1 USD = CLP 905 (jun-2026).

---

## ¿Es viable llegar a USD 6M?

**Depende de qué sea "6M":**

- **Si es valoración → Sí, alcanzable en 3–5 años.** Se sostiene con **~3.500–7.000 negocios pagando** (US$1–1,5M de ARR a un múltiplo de 4–8×) y buena retención.
- **Si es ARR → Muy ambicioso.** A precios chilenos de micronegocio (US$11–39/mes), 6M de ingreso recurrente exige **~13.000–45.000 negocios pagando** (realista ~25–30 mil) = **5–9% de todo el mercado direccionable**. Es la versión "líder de categoría": **realista a 5–7 años**, y a 3 años **solo** si se suben dos palancas: **ARPU más alto** (módulos + fintech) y/o **expansión regional** (Perú/Colombia).

**El mercado alcanza de sobra** (US$6M ARR es <10% del SAM y ~1,5% del TAM). **El cuello de botella no es el mercado — es el precio bajo + la máquina de adquisición/retención.**

---

## ¿En qué plazo?

| Meta | Plazo realista 🔮 |
|---|---|
| Producto cobrable + boleta SII | **Q4 2026** |
| US$250K ARR (~1.100 clientes) | 2027 |
| US$1M ARR ( = US$6M **valoración**) | 2028 (agresivo) / 2029–30 (sostenible) |
| **US$6M ARR** | **2029–30 con ARPU↑ + regional / 2031–32 orgánico** |

---

## ¿Qué se necesita? (los 4 imprescindibles)

1. **Cerrar el foso de la boleta SII (opt-in).** Hoy **no existe** — solo folio interno. Es legalmente obligatoria desde 2021 y es el núcleo de todos los competidores chilenos (Bsale, relBase, Toteat, Defontana). **Sin esto no se captura al segmento que paga.** Integrar un proveedor existente (OpenFactura/LibreDTE/SimpleFactura/Nubox), no construir DTE desde cero.
2. **Sistema de cobro/suscripción.** Hoy no hay cobro automatizado → no hay MRR. Prerrequisito de todo.
3. **Defender y profundizar el moat: despacho + ruta nativa (OptiRoute) + fiado relacional.** Es lo único que **ningún competidor del segmento tiene**. Resolver su multi-tenant (token único hoy).
4. **Modelo product-led con CAC casi cero** (autoservicio + Sercotec + referidos) y **subir el ARPU** de ~US$18 hacia ~US$30 vía add-ons/fintech. Con ARPU bajo, **el CAC es vida o muerte**.

---

## Veredicto honesto sobre "el más completo y simple de la industria"

- **"El más completo" → se desconfirma.** Falta boleta SII (obligatoria), app móvil nativa, código de barras, multi-sucursal, compras. Bsale y Defontana son más completos en lo tributario/empresa.
- **"El más simple" → parcial.** Treinta y Kyte también ganan por simplicidad y son gratis/baratos.
- **Lo defendible y cierto:** *"Para el negocio chileno de **despacho + fiado**, Control Local es más completo que las apps simples (Treinta/Kyte) y más simple que los ERP grandes (Bsale/Defontana) — y es el único con **optimización de ruta nativa**. Cerrando boleta SII opt-in, ocupa un hueco que nadie cubre."*

---

## Próximos 3 pasos (próximos 90 días)

1. **Definir con el dueño qué es "6M" (ARR vs valoración) y el plazo** → fija la meta real y evita perseguir un número abstracto. *(decisión, 1 día)*
2. **Arrancar boleta SII opt-in + cobro de suscripción** (Fase 0): elegir proveedor DTE, integrarlo tras el mismo patrón servidor de OptiRoute, y conectar pasarela de cobro. **Son los dos prerrequisitos de todo ingreso recurrente.** *(desarrollo, 4–8 semanas)*
3. **Conseguir y retener los primeros 50–150 negocios pagando** apalancado en Sercotec + cercanos + boca a boca, y **medir retención/activación desde el día 1** (montar el tablero MRR/churn/activación). *(comercial, en paralelo)*

> Si los primeros 100 negocios **retienen** (churn <4%/mes) y el **CAC cierra**, el camino a US$1M ARR / US$6M de valoración es real. Ese es el experimento que define todo lo demás.
