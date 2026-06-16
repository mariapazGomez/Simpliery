# 00 · Hallazgos de la exploración (PASO 0)

> Antes de cualquier análisis, recorrí toda la carpeta del proyecto. Esto es lo que **encontré verificado** en los archivos y lo que **falta** para el estudio. Distingo siempre: ✅ dato verificado en el repo · 🟡 supuesto · ❓ pendiente de validar.

## Qué es realmente Control Local (verificado en el código)

- ✅ **App web funcional**, no un mockup. Stack real (`package.json`): **Next.js 16.2.7 + React 19 + TypeScript + Tailwind 4 + Supabase** (Postgres + Auth SSR + Realtime). Formularios con React Hook Form + Zod. Gráficos Recharts. Tests con Vitest (**68 tests / 6 archivos** pasando).
- ✅ **18 módulos** implementados en `src/app/(dashboard)/`: dashboard, ventas, productos, inventario, clientes, segmentos, **fiados (Deudores)**, finanzas, **despachos**, transacciones, cierre-caja, proveedores, reportes, recordatorios, notificaciones, usuarios, configuración, **crecimiento**.
- ✅ **Backend multi-tenant ya montado**: cada registro de negocio crea su propio `negocio_id`; RLS aísla los datos por negocio; Realtime filtrado por negocio. Es decir, la arquitectura **ya soporta varios negocios distintos**, no es monousuario.
- ✅ **Origen**: es el port fiel de un prototipo de Claude Design (carpeta `.design-import-v2/`), construido a partir de un **Excel real de ventas** del dueño (81 productos, 8 categorías). No es un demo genérico: nació de un negocio real (huevos/fiambres con despacho y fiado en Viña/Santiago).
- ✅ **Modelo de precios YA definido** (en `landing.html`): tres planes mensuales, IVA incluido, sin permanencia:

  | Plan | Precio CLP/mes | ≈ USD/mes | Qué incluye |
  |---|---|---|---|
  | **Base** | $9.990 | US$11,0 | Ventas, productos, inventario, dashboard |
  | **Crecimiento** ("más popular") | $19.990 | US$22,1 | + Clientes/CRM, segmentos+WhatsApp, finanzas, CSV, reportes, export contador |
  | **Pro** | $34.990 | US$38,7 | + Despachos, rutas/repartidores, estados en vivo, hasta 3 usuarios, soporte |

- ✅ **Único integrador externo real hoy: OptiRoute** (`src/lib/optiroute.ts`, `docs/optiroute-api.md`) — optimizador de rutas de reparto chileno. Es el diferenciador #2 del estudio y **ya está vivo en producción**.

## Diferenciadores a analizar — estado real

1. **Integración SII (boleta electrónica) opcional** → ❗ **AÚN NO ESTÁ CONSTRUIDA.** Hoy la app emite un **folio interno correlativo**, no un DTE al SII. Está **decidida y planificada como opt-in** (el dueño vincula su cuenta de boleta electrónica cuando quiera/se formalice), pero es trabajo pendiente, no una función existente. Importante para no sobrevender.
2. **Gestión de ruta nativa (OptiRoute)** → ✅ **SÍ existe y está en producción.** Envío en lote de despachos, tracking, estados. Es el moat más defendible.

## Lo que el prompt asumió y NO calza con el repo (corrección)

- 🟥 El prompt dice "stack explorado: Next.js + Supabase + **Bsale + Nubox + WhatsApp API**". **No hay integración con Bsale, Nubox ni la WhatsApp Business API en el código.** Lo de WhatsApp son enlaces `wa.me` (no la API oficial). Bsale/Nubox/LibreDTE son *opciones evaluadas* para la futura boleta SII, no integraciones hechas. (Bsale es **competidor**, no proveedor.)

## Información que FALTA para el estudio (marcada como pendiente)

- ❓ **Punto de partida comercial real**: ¿cuántos negocios pagando hoy? ¿MRR actual? ¿está cobrando o sigue en uso propio + amigos? En la carpeta **no hay** modelo financiero, métricas de tracción, cohortes ni datos de churn. El "+500 negocios" del landing es **copy de marketing**, no un dato real.
- ❓ **La meta de USD 6M**: el prompt no aclara si es **ARR** (ingreso recurrente anual) o **valoración**. → El estudio modela **ambos escenarios**.
- ❓ **Plazo objetivo**: no está en la carpeta. → Se modelan escenarios a **3 y 5 años**.
- ❓ **Presupuesto / capital disponible** para contratar y hacer marketing: desconocido. → Plan de equipo ligado a hitos de ingreso (autofinanciado), no a una ronda asumida.
- ❓ **Constitución legal / facturación de la empresa Control Local** (no del negocio del dueño): desconocida.
- 🟡 Cifras de mercado (nº de almacenes de barrio, tasas) provienen de fuentes públicas y se citan; las que no pude verificar quedan como 🟡/❓.

## Tipo de cambio y unidades usadas en todo el estudio

- **1 USD = CLP 905** (dólar observado Banco Central, banda $899–$909 entre el 13 y 15-jun-2026).
- **1 UF = CLP 40.774** (13-jun-2026).
- Fuentes en cada archivo.
