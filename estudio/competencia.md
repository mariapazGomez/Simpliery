# 2 · Benchmarking de competencia

> **Leyenda:** ✅ verificado/fuente · 🟡 supuesto · ❓ **no verificado** (no pude confirmarlo, no asumo que lo tenga).
> **Tipo de cambio:** 1 USD = CLP 905 · 1 UF = CLP 40.774 (13-jun-2026).
> **Convención de la matriz:** ✓ tiene · ✗ no tiene · ◐ parcial/básico · ? no verificado.

---

## 2.1 Los competidores (perfil, precio, segmento, plata)

### Chilenos

**Bsale** — *El rival directo de referencia en Chile.*
- **Propuesta:** POS + facturación electrónica + inventario, todo integrado con el SII.
- **Precio:** ✅ **1,5 a 2,9 UF + IVA/mes** = **CLP ~$72.800 a ~$140.700/mes** (≈ US$80–155/mes). Tarifa fija, **sin comisión por venta**, usuarios ilimitados. [Bsale / Comparasoftware]
- **Escala:** ✅ **+20.000 empresas activas en LatAm**, +10 años. [Bsale]
- **Fortalezas:** boleta/factura SII sólida, marca, ecosistema (Entel lo revende), confianza.
- **Debilidades vs. Control Local:** **7–14× más caro** que el plan Base; **no tiene fiado relacional/CRM de recompra**, **no tiene optimización de ruta**, no proyecta el negocio. Pensado para "cumplir/vender", no para "hacer crecer la relación con el cliente".

**relBase** — *Facturación + ventas para pymes.*
- **Propuesta:** boleta/factura SII, ventas, inventario, multicanal (MercadoLibre, Shopify).
- **Precio:** ✅ **~US$20–40/mes** (≈ CLP $18k–$36k). [relBase / Minimal Consulting]
- **Fortalezas:** SII + integraciones e-commerce, precio medio.
- **Debilidades:** sin ruta nativa, fiado ◐, CRM relacional ◐.

**Toteat** — *Vertical restaurantes.*
- **Propuesta:** POS para restaurantes/bares con boleta SII en tiempo real, comandas, mesas.
- **Precio:** ❓ por plan (algunos planes de POS para resto en Chile cobran fijo; verificar si hay *take rate*).
- **Fortalezas:** profundidad en el nicho gastronómico.
- **Debilidades:** **no es para almacén/retail tradicional**; segmento distinto. Sin fiado de barrio ni ruta de reparto propia.

**Defontana** — *ERP completo de empresa.*
- **Propuesta:** ERP (contabilidad, RRHH, finanzas, facturación SII) para empresas medianas.
- **Precio:** ❓ por módulos, claramente **gama alta** vs. micronegocio.
- **Fortalezas:** completitud contable/tributaria.
- **Debilidades:** **complejo y caro** para un almacén; lo opuesto a "simple". No es competencia del mismo segmento, es el "techo caro" del mercado.

### Regionales LatAm

**Treinta** (Colombia) — *El gigante en escala.*
- **Propuesta:** libreta digital de fiados + inventario + catálogo, virando a **fintech** (pagos, crédito).
- **Plata/escala:** ✅ **Y Combinator W21**; ✅ **US$14,3M levantados** (Luxor, GoodWater, First Check, 2021); ✅ **+4 millones de usuarios en 18 países** (2022). 🟡 El usuario menciona ~7M / ~US$60M — **no verificado en esta búsqueda** (datos públicos que encontré llegan a 2021–2022; lo más reciente puede ser mayor). [Valora Analitik / La República]
- **Fortalezas:** gratis/freemium, viralidad, foco fiado (que es justo el dolor del barrio).
- **Debilidades vs. Control Local en Chile:** ✗ **no emite boleta electrónica chilena (DTE/SII)**; herramienta más de "libreta" que de gestión profunda; **sin ruta de reparto**; CRM relacional ◐.

**Kyte** (Brasil) — *POS móvil ligero.*
- **Propuesta:** POS desde el celular, inventario, catálogo, tienda online, multicanal.
- **Precio:** ✅ desde **~US$8–9/mes**, freemium. [SoftwareSuggest / Capterra]
- **Fortalezas:** simplicidad móvil, precio bajo, app nativa pulida.
- **Debilidades en Chile:** ✗ **sin boleta SII chilena**, ✗ sin ruta, ✗ sin fiado relacional profundo. Producto genérico global, no localizado a la realidad chilena.

### Internacionales

**Square** (Block, EE.UU.) — POS + pagos. ✗ **Sin presencia/foco real en Chile**, ✗ sin DTE/SII. No es competencia operativa hoy en este mercado.

**Loyverse** — POS gratis + inventario + fidelización. ✅ Gratis, popular. **Boleta SII solo vía terceros** (◐), sin ruta, sin fiado. Compite por el segmento "gratis sin boleta".

---

## 2.2 Matriz funcionalidad por funcionalidad (pestaña por pestaña)

Filas = módulos de Control Local. Columnas = cada competidor. (✓ tiene · ✗ no · ◐ parcial · ? no verificado)

| Módulo / Función | **Control Local** | Bsale | relBase | Toteat | Defontana | Treinta | Kyte | Loyverse |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **POS / Registro de ventas** | ✓ | ✓ | ✓ | ✓ (resto) | ✓ | ◐ | ✓ | ✓ |
| **Catálogo de productos** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Inventario / stock** | ✓ (+formatos/cajas) | ✓ | ✓ | ◐ | ✓ | ◐ | ✓ | ✓ |
| **Boleta/Factura SII (DTE)** | ✗ **(planificado, opt-in)** | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ◐ (terceros) |
| **Fiado / cuentas por cobrar** | ✓✓ (abono parcial + método) | ✗ | ◐ | ✗ | ◐ | ✓✓ | ◐ | ✗ |
| **CRM relacional (recompra, VIP, riesgo)** | ✓✓ | ✗ | ◐ | ✗ | ◐ | ◐ | ◐ | ◐ (fidelización) |
| **Segmentación + WhatsApp** | ✓ (wa.me) | ✗ | ✗ | ✗ | ✗ | ◐ | ✗ | ✗ |
| **Finanzas / flujo de caja** | ✓ (gastos, metas, equilibrio) | ◐ | ◐ | ◐ | ✓✓ (contable) | ◐ | ◐ | ◐ |
| **Despachos / reparto** | ✓ | ◐ (guía) | ◐ | ◐ (delivery apps) | ◐ | ✗ | ✗ | ✗ |
| **Optimización de RUTA nativa** | ✓ **(OptiRoute, único)** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Proyección/crecimiento del negocio** | ✓ **(único)** | ✗ | ✗ | ✗ | ◐ | ◐ (crédito) | ✗ | ✗ |
| **Multiusuario + roles** | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ✓ |
| **Reportes** | ✓ | ✓ | ✓ | ✓ | ✓✓ | ◐ | ◐ | ✓ |
| **Proveedores / compras** | ◐ | ✓ | ✓ | ◐ | ✓✓ | ◐ | ◐ | ◐ |
| **Cierre de caja** | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ◐ | ✓ |
| **Código de barras / lector** | ? | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | ✓ |
| **App móvil nativa** | ✗ (PWA web) | ✓ | ◐ | ✓ | ◐ | ✓ | ✓ | ✓ |
| **Tienda online / link de pedido** | ✗ (planificado) | ◐ | ✓ | ◐ | ◐ | ◐ | ✓ | ◐ |
| **Pago integrado (pasarela)** | ✗ | ◐ | ◐ | ✓ | ✓ | ✓ (fintech) | ◐ | ◐ |
| **Multi-sucursal** | ✗ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ✓ |
| **Precio entrada (CLP/mes)** | **$9.990** | ~$72.800 | ~$18.000 | ? | alto | $0/freemium | ~$8.100 | $0 |

> Las celdas ✓✓ marcan donde Control Local o el competidor es **claramente superior**, no solo "presente".

---

## 2.3 Conclusión: dónde gana, dónde pierde, qué hueco ocupa

### Donde Control Local GANA hoy ✅
1. **Optimización de ruta nativa (OptiRoute):** **ningún competidor del segmento la tiene.** Hueco de mercado real para negocios con reparto a domicilio (alimentos, distribuidoras, emporios con despacho). Es el diferenciador más defendible.
2. **Fiado + CRM relacional juntos:** Treinta tiene fiado pero no gestión/recompra; Bsale tiene gestión pero no fiado. **Control Local une las dos cosas** con proyección de cliente como activo. Ese cruce es único.
3. **Precio de entrada:** $9.990/mes es **7–14× más barato que Bsale** y comparable al freemium de Kyte/Treinta pero **localizado a Chile**.
4. **Módulo Crecimiento/proyección:** nadie en el segmento "te muestra el futuro del negocio". Diferenciador de marketing potente.

### Donde Control Local PIERDE hoy ✗
1. **Boleta SII** — **el gran hueco propio.** Bsale, relBase, Toteat y Defontana la tienen como núcleo; es **legalmente obligatoria desde 2021** (ver §2.4). Sin ella, Control Local **no puede capturar al segmento formal que paga** y queda atrapado en el segmento informal (que paga menos y peor). **Es la prioridad #1 para ser vendible.**
2. **App móvil nativa, código de barras, multi-sucursal, tienda online, pasarela de pago:** los grandes ya los tienen; Control Local va detrás. No todos son críticos, pero el barcode y la app móvil pesan en la decisión de compra de un almacén.
3. **Escala/marca:** Bsale (+20k empresas) y Treinta (+4M usuarios) tienen tracción y confianza que Control Local aún debe construir.

### El hueco a ocupar (posicionamiento)
> **"El POS chileno que entiende el reparto y el fiado del barrio — con boleta SII cuando la necesites, y optimización de ruta que nadie más tiene."**
>
> Núcleo defendible = **despacho con ruta + fiado relacional + simplicidad + precio**, cerrando el flanco de **boleta SII opt-in**. Es el cruce que ni los caros-completos (Bsale/Defontana) ni los simples-globales (Treinta/Kyte) cubren.

---

## 2.4 Los dos diferenciadores clave, a fondo

### A. Integración SII **opcional** — ¿ventaja o desventaja?

**El dato duro:** ✅ la **boleta electrónica es obligatoria en Chile desde el 1-ene-2021** (facturadores electrónicos) y **1-mar-2021** (los demás), por la Ley de Modernización Tributaria (art. 54 DL 825). Aplica a **todo contribuyente de Primera Categoría que emita boletas a consumidor final.** [SII / Bsale / relBase]

**Cómo lo hacen los competidores:** Bsale, relBase, Toteat, Defontana → SII **integrado y central, no opcional** (es su razón de ser). Treinta, Kyte, Square → **no emiten DTE chileno**. Loyverse → solo vía terceros.

**El veredicto matizado:**
- **Como ventaja:** dejarlo **opt-in** es valioso para el **segmento informal** (más de 1 millón de microemprendimientos), que hoy no quiere o no puede formalizar y al que Bsale no le sirve. Control Local puede ser **la rampa de entrada**: "empieza gratis/barato, formaliza cuando estés listo, y el día que conectes tu cuenta el SII queda al instante". Ese onboarding gradual **sí es un diferenciador real de captación.**
- **Como riesgo:** ❗ ojo con el mensaje. La obligación legal es del **comerciante**, no del software. El posicionamiento correcto es **"funciona con tu realidad y te ayuda a formalizarte"**, NUNCA "úsalo para no declarar" (eso es facilitar incumplimiento y es reputacional y legalmente tóxico). Y mientras la boleta SII **no esté construida**, el opt-in es una promesa, no una función — no se puede vender como existente.
- **Conclusión:** **diferenciador real de captación + obligación de construirlo.** El "opcional" es bueno para entrar; pero **tener la opción** (no obligar, pero ofrecerla con un clic) es lo que finalmente convierte al cliente informal en cliente formal que paga más. Sin construir la integración, es el mayor flanco descubierto.

### B. Gestión de ruta nativa (OptiRoute) — el verdadero moat

- **Quién más la tiene:** ✅ **nadie en el segmento.** Bsale/relBase generan guía de despacho pero **no optimizan la ruta**; Toteat se apoya en apps de delivery de terceros; Treinta/Kyte/Loyverse no tienen reparto.
- **Valor:** para negocios con reparto a domicilio (alimentos, emporios, distribuidoras, el propio caso de uso del fundador), **planificar y optimizar la ruta ahorra horas y combustible cada día.** Es el dolor que ningún POS resuelve.
- **Cómo posicionarlo:** **vertical "comercio con despacho"** como punta de lanza. "El único POS chileno que además te arma la ruta de reparto." Es un **wedge** (cuña): entras por un nicho desatendido donde no tienes competencia, dominas ahí, y desde esa base expandes a retail general. Permite además **un plan Pro con margen sano** (el reparto es donde el cliente más valor percibe).
- **Riesgo a vigilar:** hoy depende de **OptiRoute como proveedor externo** (token único, no multi-tenant aún). Para escalar a cientos de negocios hay que **resolver el modelo multi-cuenta/multi-tenant del enlace** o negociar un acuerdo con OptiRoute. Es deuda técnica conocida del módulo.

---

## Fuentes

- [Bsale — sitio](https://www.bsale.cl/) · [Comparasoftware — Bsale precios](https://www.comparasoftware.cl/bsale) · [Entel Empresas — Bsale](https://empresas.entel.cl/herramientas-digitales/bsale)
- [relBase — precios](https://www.relbase.cl/precios) · [Minimal Consulting — relBase Review 2026](https://www.minimalconsulting.com/software/relbase)
- [Toteat — boletas electrónicas](https://toteat.com/productos/boletas-electronicas) · [Defontana — planes](https://www.defontana.com/mx/planes-y-precios)
- [Treinta — 4M usuarios (Valora Analitik)](https://www.valoraanalitik.com/2022/04/13/app-treinta-supera-4-millones-usuarios-18-paises/) · [La República — US$14,3M Treinta](https://www.larepublica.co/finanzas/la-aplicacion-de-contabilidad-digital-treinta-recibio-una-inversion-por-us143-millones-3211047)
- [Kyte — SoftwareSuggest](https://www.softwaresuggest.com/kyte-pos) · [Kyte — Capterra](https://www.capterra.com/p/206450/Kyte/)
- [SII — obligatoriedad boleta electrónica](https://www.sii.cl/preguntas_frecuentes/bol_electr_vtas_serv/001_380_7666.htm) · [Bsale — desde cuándo es obligatoria](https://www.bsale.cl/article/desde-cuando-es-obligatorio-emitir-boletas-electronicas-en-chile)
