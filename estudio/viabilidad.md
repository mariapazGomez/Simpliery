# 1 · Viabilidad — ¿Es posible llegar a USD 6M?

> **Leyenda de confianza:** ✅ verificado/fuente citada · 🟡 supuesto razonable · 🔮 proyección.
> **Tipo de cambio:** 1 USD = CLP 905 · 1 UF = CLP 40.774 (13-jun-2026).

---

## 0. La pregunta antes de la pregunta: ¿6M de qué?

El brief no aclara si **USD 6M** es **ARR** (ingreso recurrente anual) o **valoración**. Cambia todo, así que modelo los dos:

| Escenario | Qué significa | Clientes pagando necesarios (orden de magnitud) | Veredicto corto |
|---|---|---|---|
| **A — USD 6M de valoración** | Cuánto vale la empresa si la vendes/levantas capital | ~3.000–7.000 | **Alcanzable** en 3–5 años |
| **B — USD 6M de ARR** | Ingreso recurrente anual real | ~13.000–45.000 | **Muy ambicioso**; realista a 5–7 años o con expansión regional |

La diferencia es enorme y conviene fijarla con el usuario. El resto del archivo desarrolla ambos.

---

## 1. Tamaño de mercado (TAM / SAM / SOM)

### Universo de empresas en Chile ✅

- **98,4% de las empresas chilenas son MiPymes** (micro, pequeñas y medianas) según el SII. [SII / FastCheck]
- El SII contabiliza del orden de **~1,3 millones de empresas formales** con ventas; la enorme mayoría son micro y pequeñas. [SII estadísticas de empresas]
- Además, la **Encuesta de Microemprendimiento (INE)** estima **más de 1 millón de microemprendimientos informales** — "más de la mitad" de las microempresas operan en la informalidad. [INE vía FastCheck]
- 🟡 Estimación de industria usada en el ciclo anterior: **~243.000 almacenes de barrio / nanotiendas** en Chile (gremios del retail tradicional). *Pendiente de validar con fuente primaria (AB Chile / Nielsen).*

**La brecha que crea la oportunidad (el dato más importante):** ✅

> Solo **~22% de las pequeñas y medianas empresas** usa software de gestión/ERP, contra **77% de las grandes**. (Observatorio Económico UAH / Telefónica). Y el **98% de las pymes declaró que invertiría en digitalización en 2024**, con 55% destinando >10% de su presupuesto a tecnología. [Emol / Telefónica Chile]

Es decir: **el mercado está mayoritariamente sin digitalizar y con intención declarada de hacerlo.** Ése es el viento a favor.

### TAM — Mercado total direccionable 🟡🔮

Universo que *podría* usar un POS/gestión: micro + pequeños comercios y servicios. Tomo un rango conservador de **~2,0 millones** de micro/pequeños negocios (formales + informales con smartphone).

- ARPU mezclado supuesto: **US$18/mes = US$216/año** (mezcla de planes, ver §2).
- **TAM ≈ 2.000.000 × US$216 ≈ US$432 millones/año.** (techo teórico, nadie lo captura entero)

### SAM — Mercado que Control Local puede servir hoy 🟡🔮

Filtro realista: comercio chileno **con catálogo de productos, en español, dispuesto a pagar SaaS y con algo de digitalización** — almacenes/minimarket/emporios, food con despacho, distribuidores chicos. Rango **300.000–500.000 negocios**.

- **SAM ≈ 300k–500k × US$216 ≈ US$65–108 millones/año.**

### SOM — Lo que es plausible capturar 🔮

Penetración realista de un player nuevo y autofinanciado:

| Penetración del SAM | Negocios pagando | ARR ≈ (US$216/año) |
|---|---|---|
| 1% | 3.000–5.000 | US$0,65M–1,1M |
| 2% | 6.000–10.000 | US$1,3M–2,2M |
| 5% | 15.000–25.000 | US$3,2M–5,4M |
| **~6–9%** | **~28.000** | **~US$6M** ← meta ARR |

**Conclusión de mercado:** el mercado **alcanza de sobra** para soñar con US$6M de ARR (es <10% del SAM y ~1,5% del TAM). El problema no es el tamaño del mercado, es **la velocidad de captura y el precio bajo** (ver abajo).

---

## 2. Ingeniería inversa de la meta (reverse engineering)

### Precios actuales convertidos

| Plan | CLP/mes | USD/mes | **USD/año (ARR por cliente)** |
|---|---|---|---|
| Base | $9.990 | 11,0 | **132** |
| Crecimiento | $19.990 | 22,1 | **265** |
| Pro | $34.990 | 38,7 | **464** |
| 🟡 Blended (mezcla real esperada) | ~$16.000 | ~17,7 | **~212** |

### Escenario B — Si USD 6M es ARR: ¿cuántos clientes?

`Clientes = 6.000.000 / ARR por cliente`

| Si todos pagaran… | ARR/cliente | **Clientes necesarios** |
|---|---|---|
| Plan Base ($9.990) | US$132 | **≈ 45.300** |
| Blended (~$16.000) | US$212 | **≈ 28.300** |
| Crecimiento ($19.990) | US$265 | **≈ 22.600** |
| Plan Pro ($34.990) | US$464 | **≈ 12.900** |

**Lectura honesta:** a precios chilenos de micronegocio, **6M de ARR exige entre ~13.000 y ~45.000 negocios pagando** (realista ~25–30 mil). Eso es **5–9% del SAM** — una participación de líder de categoría, no de recién llegado. Bsale, con +20.000 empresas en **toda LatAm** y una década de operación, da la escala de referencia: llegar ahí en Chile solo es un esfuerzo de años.

**Tres palancas para que el número baje a algo manejable:**
1. **Subir el ARPU** (módulos premium: boleta SII, pasarela de pago con *take rate*, despacho avanzado). Si el blended sube a US$30/mes (US$360/año), la meta baja a **~16.700 clientes**.
2. **Monetización transaccional** (fintech, como hizo Treinta): cobrar % de pagos/cobranza además de la suscripción. Sube el ARPU sin subir el precio del plan base.
3. **Expansión regional** (Perú/Colombia comparten boleta electrónica y realidad de barrio): multiplica el SAM.

### Escenario A — Si USD 6M es valoración

SaaS vertical pequeño se valora típicamente en **4–8× ARR** (🟡 múltiplo conservador para LatAm early-stage; con alto crecimiento puede ser mayor).

| Múltiplo | ARR necesario para valer US$6M | Clientes (blended US$212/año) |
|---|---|---|
| 8× | US$0,75M | **≈ 3.540** |
| 6× | US$1,0M | **≈ 4.720** |
| 4× | US$1,5M | **≈ 7.080** |

**Lectura:** una valoración de US$6M se sostiene con **~3.500–7.000 negocios pagando** y buen crecimiento/retención. Eso sí es alcanzable en 3–5 años partiendo casi de cero, **si** se cierra el foso de la boleta SII y la retención es sana.

---

## 3. Veredicto de viabilidad (con supuestos explícitos)

| | USD 6M ARR | USD 6M valoración |
|---|---|---|
| **¿Posible?** | Sí, pero es la versión "líder de categoría" | Sí, claramente |
| **Plazo realista** 🔮 | 5–7 años (3 años solo con expansión regional + precio más alto) | 3–5 años |
| **Clientes pagando** | ~13k–45k (realista ~25–30k) | ~3,5k–7k |
| **Supuesto crítico #1** | Cerrar **boleta SII** (sin eso no se compite con Bsale en el segmento formal que paga) | Igual |
| **Supuesto crítico #2** | Retención mensual sana (churn <3–4% mensual) y CAC recuperable | Igual |
| **Supuesto crítico #3** | Subir ARPU vía módulos/fintech o expandir a Perú/Colombia | Menos crítico |

### Lo honesto

- **A 3 años, USD 6M de ARR no es realista** con la pricing y el alcance actuales (Chile-only, sin SII todavía, autofinanciado). Sería pedirle a un recién llegado el 5–9% del mercado en 36 meses.
- **A 3 años, USD 6M de valoración sí es plausible** si el producto cierra SII, retiene bien y crece sostenido — necesitas miles, no decenas de miles, de clientes.
- **A 5 años, USD 6M de ARR entra en rango** si se suman dos de tres palancas: precio/ARPU más alto, monetización transaccional, o expansión regional.
- **El cuello de botella no es el mercado** (sobra), **es la máquina de adquisición y retención + el precio bajo.** Un ARPU de ~US$11–22/mes obliga a un CAC muy bajo y a volumen — eso define toda la estrategia de canal (autoservicio, viral, Sercotec) del [plan de escalamiento](plan_escalamiento.md).

### Recomendación de meta intermedia (para no pelear con un número abstracto)

Propongo fijar hitos concretos y medibles en vez de "6M":
1. **US$250K ARR** (~1.000–1.200 clientes pagando): valida que el motor funciona.
2. **US$1M ARR** (~4.000–5.000 clientes): zona de "empresa real" y US$6M de valoración.
3. **US$6M ARR**: meta de largo plazo, condicionada a las palancas de arriba.

---

## Fuentes

- [SII — Estadísticas de empresas](https://www.sii.cl/sobre_el_sii/estadisticas_de_empresas.html) · [Infografía a las Pymes (SII)](https://www.sii.cl/sobre_el_sii/empresas/Infografia_a_las_pymes_SII.pdf)
- [FastCheck — "El 97% de las empresas es pyme"](https://www.fastcheck.cl/2025/08/01/el-97-de-las-empresas-esta-calificada-como-pyme-por-impuestos-internos-real/)
- [Emol — Digitalización pymes Chile 2024](https://www.emol.com/noticias/Economia/2024/05/07/1130056/digitalizacion-pymes-chilenas.html) · [Telefónica Chile — estudio pymes](https://telefonica.cl/estudio-sobre-pymes-en-chile-98-invertira-en-digitalizacion-y-una-de-cada-dos-destinara-mas-del-10-de-su-presupuesto-en-tecnologia/)
- [Observatorio Económico UAH — Pymes e Industria 4.0](https://www.observatorioeconomico.cl/index.php/oe/article/view/592)
- [Valor UF 13-jun-2026 (Pauta)](https://www.pauta.cl/dato-en-pauta/2026/06/03/uf-a-peso-chileno-precio-de-la-uf-para-este-miercoles-3-de-junio.html) · [Dólar observado — Banco Central](https://www.bcentral.cl/en/)
