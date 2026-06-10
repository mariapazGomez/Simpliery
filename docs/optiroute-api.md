# OptiRoute — Referencia de API (para integración con Control Local)

> Documentación capturada desde el Centro de Ayuda de OptiRoute (https://app.optiroute.cl/support/api/).
> Sirve de referencia para integrar Despachos. **Documentación COMPLETA** (8/8 artículos):
> Autenticación, Pedidos, Webhooks, Optimización, Planes de Rutas, Rutas, Conductores, Depósitos.

---

## 1. Autenticación (artículo /api/61)

- Modelo: **autenticación HTTP por Token** (estilo Django REST). El token es un string alfanumérico, ej. `9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b`.
- **Obtener token:** `POST https://app.optiroute.cl/api-token-auth/` con **form-data**:
  - `username` (string, requerido): correo de la cuenta.
  - `password` (string, requerido): contraseña de la cuenta.
  - → devuelve el token.
- **Usar el token:** en CADA llamada, header `Authorization: Token <token>` (prefijo `Token` + espacio + código).
- **URL base de la API:** `https://app.optiroute.cl/api/v1/...`
- Ejemplo: `curl -X GET https://app.optiroute.cl/api/v1/<endpoint>/ -H 'Authorization: Token 9944...'`

---

## 2. API de Pedidos (integración)

Endpoint base: `https://app.optiroute.cl/api/v1/integration-service-requests/`

### Estados de PEDIDO (número → nombre)
- `-4` DELETED · `-3` TEMPORARY · `-2` IMPORTED · `-1` CANCELLED
- `0` REVIEWING (inicial, ingresó a OptiRoute) · `1` SCHEDULED (asignado a un Route Plan)
- `6` ONROUTE (en ruta iniciada) · `2` ONGOING (conductor en viaje al destino)
- `4` ARRIVED (llegó, sin entregar) · `3` DELIVERED (entregado) · `5` SKIPPED (saltado)

### Estados de DIRECCIÓN (geocodificación)
- `-1` ERROR · `0` ENTERED · `1` GEOCODED · `2` GEOCODED_WARNING · `3` REVERSE_GEOCODED
- `4` GEOCODED_NUMBER_WARNING · `5` GEOCODED_MULTIPLE_WARNING · `6` GEOCODED_ESTABLISHMENT
- `7` LOCATION_TYPE · `8` COMMUNE_WARNING

### Objeto "pedido de entrada" (para crear/actualizar)
- `customer` (Objeto cliente) — **requerido**
- `address` (Objeto dirección) — **requerido**
- `reference` (texto) — id único nuestro (id del pedido/venta en Control Local). **Clave para updates/dedup.**
- `skills` (lista de Objeto habilidad) — opcional (asigna a vehículos con esa habilidad)
- `created_at` (texto `%Y-%m-%dT%H:%M:%S%z`) — opcional (si falta, usa la fecha actual)
- `delivery_data` (texto `%Y-%m-%dT%H:%M:%S%z`) — opcional (fecha de entrega)
- `custom_fields` (objeto) — opcional
- `configured_delivery_time` (`[DD] [HH:[MM:]]ss[.uuuuuu]`; entero = segundos) — opcional

#### Objeto cliente
- `name` (texto) — **requerido**
- `reference` (texto) — opcional (id del cliente en nuestra plataforma)
- `email` (texto) — opcional
- `demand_a` (número) — opcional (cantidad de items por omisión)
- `phone_number` (texto) — opcional
- `time_window_start` / `time_window_end` (`%H:%M`) — opcional
- `delivery_time` (`[DD] [HH:[MM:]]ss[.uuuuuu]`) — opcional

#### Objeto dirección (2 modalidades)
- `address_string` (texto, "calle número", **sin** comuna) — **requerido si no hay lat/long**
- `commune_string` (texto) — opcional pero **recomendado** (mejora geocodificación)
- `apartment_number` (texto) — depto/parcela/block — opcional
- `address_more_info` (texto) — info útil para la entrega — opcional
- `latitude` / `longitude` (float) — **requeridos si no hay address_string** (geocodificación inversa)

#### Objeto habilidad
- `id` (número) o `name` (texto) — si se usa id, name se ignora.

### Objeto "pedido de respuesta" (lo que devuelve)
`id` (id OptiRoute), `reference`, `created_at`, `delivery_date`, `status` (número), `assigned_driver`,
`delivery_details`, **`tracking_url`** (página de seguimiento), **`tracking`** (código), `customer`, `address`,
`waypoint` (Objeto destino: order, customer_order, status, reason, images[], reception_name, reception_rut,
note, started_at/arrived_at/completed_at/finished_at).
- Objeto Imagen: `url`, `thumbnal_url` (el vínculo dura 24 h; se guardan hasta 1 año).

### Operaciones
- **Crear:** `POST .../integration-service-requests/` con el objeto pedido de entrada → devuelve pedido de respuesta.
- **Actualizar:** `PUT`/`PATCH .../integration-service-requests/{reference}/` (campos: customer, address, delivery_date, created_at, scheduled_at, route_started_at, completed_at, cancelled_at, status, reference, custom_fields). Cambiar `status` borra las fechas de estados posteriores y setea la fecha actual al estado ingresado.
- **Listar:** `GET .../integration-service-requests/?per_page=25&creationStartDate=DD-MM-AAAA&creationEndDate=...&statuses=0,1,2`
- **Obtener uno:** `GET .../integration-service-requests/{id}/`
- **Borrar:** `DELETE .../integration-service-requests/{id}/` (solo en estado REVIEWING; no borra físico, pasa a DELETED).
- **Imagen externa:** `POST .../integration-service-requests/{id}/upload_image/` · borrar `DELETE .../external-images/{id}/`

#### Ejemplo crear pedido (body)
```json
{
  "reference": "2301989790",
  "address": { "address_string": "CARMEN BAJO 690", "commune_string": "IQUIQUE", "apartment_number": "5" },
  "customer": { "name": "NIBALDO MAMANI", "phone_number": "932321321", "demand_a": 0, "reference": "0649776" },
  "skills": [{ "name": "refrigerado" }]
}
```

### Carga masiva (batch, asíncrono)
- `POST https://app.optiroute.cl/api/v1/batch-service-request-creation-inputs/` con `{ "data": [ <pedidos de entrada> ] }`.
- Crea los que no existan por `reference`; actualiza si existen y están en REVIEWING/DELETED.
- Estado del input: `GET .../batch-service-request-creation-inputs/{id}/`

---

## 3. Webhooks

- OptiRoute hace un **POST a una URL que tú configuras** (Plataforma → Configuración → sección **Integración**) cada vez que ocurre un evento.
- Entidades disponibles: **Pedidos** (cambio de estado de un pedido), **Conductores**, **Rutas**.
- El POST trae solo parámetros: `id` (id en OptiRoute, **obligatorio**) y `reference` (nuestro id, opcional, solo si está definido). **Sin datos sensibles** → hay que pedir el detalle completo por la API REST.
- **Sin seguridad/auth** en el webhook (solo informa qué item cambió).
- Si nuestro endpoint está caído, **reintenta cada 5 minutos** hasta lograrlo.

---

## 4. API de Optimización (agnóstica — NO requiere tener pedidos en OptiRoute)

Optimiza rutas desde tu propia plataforma. **Asíncrona** (crear → iniciar → consultar estado).

- **Crear optimización:** `POST https://app.optiroute.cl/api/optimizations/` con el **Objeto Entrada de Optimización** `{ customers[], vehicles[], configuration }` → devuelve **Respuesta de Optimización** `{ reference (6 chars), id, raw_request, solution? }`.
- **Iniciar procesamiento:** `POST https://app.optiroute.cl/api/v1/optimizations/{reference}/long_optimize/`
- **Estado/resultado:** `GET https://app.optiroute.cl/api/optimizations/{reference}/` → cuando termina trae `solution`.

### Objetos
- **Dirección:** `name` (req), `latitude` (req, ≤10 dec), `longitude` (req).
- **Cliente (visita):** `name`, `address` (Dirección), `time_window_start/end` (`%H:%M`), `delivery_time` (0–600 s), `demand` (int, para `use_capacity`), `priority` (mayor = más prioritario), `skills` (texto[]), `precio` (para `use_profitability_percentage`).
- **Bodega:** `name` (req), `address` (Dirección, req).
- **Vehículo:** `name`, `driver`, `start_warehouse`/`end_warehouse` (Bodega), `capacity`, `break_start/end`, `route_skills[]`, `speed_factor` (0.5–1.5), `shift_start/end`, `cost`.
- **Configuración:** `name` (req), `departure_date` (`%Y-%m-%d`, req), `start_time`/`end_time` (`%H:%M`, req), `optimization_type` ('Time'|'Distance', def Time), `speed_factor`, `delivery_time`, `use_load_balance`/`use_time_balance`/`use_distance_balance`, `minimize_fleet` (def True), `force_use_all_vehicles`, `use_time_windows` (def True), `use_capacity` (def True), `optimize_start_time`, `search_time` (min), `use_quick_optimization`, `maximum_waiting_time`, `fleet_kind` (0 motor, 1 bici), `use_open_routes`, `merge_service_times`, `same_address_in_same_vehicle`, `use_costs`, `use_profitability_percentage`.
- **Respuesta:** `Solución { routes[], total_distance, total_duration }`; `Ruta { vehicle, distance, duration, waypoints[] }`; `Destino { order, arrival, demand, name, customer_order, travel_duration, service_duration }`.

---

## 5. API de Planes de Rutas

Un plan de rutas = conjunto de rutas (una por vehículo). Endpoint: `https://app.optiroute.cl/api/v1/route-plans/`
> Nota: el manual muestra algunos endpoints como `testing.optiroute.cl` — usar `app.optiroute.cl` en producción.

### Estados: `-1` CANCELLED · `0` ENTERED · `1` STARTED · `2` COMPLETED · `3` DELETED

### Flujo de creación de rutas optimizadas
1. **Crear plan** (`POST route-plans/` con `{name, departure_datetime, finish_datetime}` formato `%Y-%m-%dT%H:%M:%S%z`).
2. **Agregar pedidos** (los pedidos deben existir ya en OptiRoute, p.ej. vía API de integración).
3. **Agregar vehículos** (cada uno crea una ruta).
4. (Opcional) configurar pedido/ruta.
5. **Optimizar** → asigna pedidos a vehículos; los no asignados van a `dropped_route`.
6. (Opcional) **notificar conductores** / **clientes**.

### Acciones (POST con `{id}` del plan en la URL)
- `add_service_requests` body `{ "service_requests": [id1, id2, ...] }`
- `remove_service_request` body `{ "service_request_id": id }`
- `add_vehicle` body `{ "id": vehiculoId }` · `remove_vehicle` body `{ "id": vehiculoId }`
- `update_configuration` body = objeto configuración (name, start_time, end_time, optimization_type, etc.)
- `optimize` · `stop_optimization`
- `notify_all_drivers` / `denotify_all_drivers` · `notify_all_customers` / `denotify_all_customers`

### CRUD
- `POST route-plans/` crear · `GET route-plans/` listar · `GET route-plans/{id}/` detalle · `DELETE route-plans/{id}/` (→ DELETED).
- Respuesta plan: `id, name, fleet_kind, departure_datetime, end_datetime, distance, routes[], dropped_route, status, solution_found, is_optimizing, is_editing, is_importing, search_time, ...`.
- Las acciones POST solo corren si el plan no está eliminado/completado/en edición/optimización/importación.
- Para el detalle de una ruta se usa la **API de Rutas** (pendiente de documentar).

---

## 6. API de Rutas

Una ruta = circuito de reparto de un vehículo/conductor; siempre dentro de un plan de rutas.
Endpoint: `https://app.optiroute.cl/api/v1/web-routes/` (manual muestra `testing.` — usar `app.`).
> Las rutas se **crean/eliminan vía la API de Planes de Rutas** (agregar/quitar vehículos). Aquí se consultan, configuran y optimizan individualmente.

### Estados de RUTA: `-1` CANCELLED · `0` ENTERED · `1` STARTED · `2` COMPLETED · `3` DELETED
### Estados de DESTINO (waypoint): `-1` CANCELLED · `0` ENTERED · `1` STARTED · `2` COMPLETED · `3` SKIPPED · `4` ARRIVED · `5` DELETED

### Objeto ruta de respuesta (lo más útil)
`id, name, duration (s), distance (m), started_at, completed_at, updated_at, status, waypoints[] (destinos), vehicle, driver, departure_datetime, break_start/end, shift_start/end, capacity, is_dropped, speed_factor, last_location_point (última GPS del Optiroute Driver), travel_type (0 ordenada / 1 libre), driver_notification_status, customers_notification_status, cost, start/end_warehouse, skills, ...`

### Objeto destino de respuesta (cada parada)
`id, name, order, customer_order, address (full_address, short_address, street_name, address_number, apartment_number, comuna, lat/long, postal_code...), status, kind (0 cliente / 1 depósito / 2 descanso), is_warehouse/is_customer/is_break, travel_time, distance, min/max_arrival_datetime, started_at, arrived_at, completed_at, finished_at, reason (0 dir errónea/1 nadie/2 rechazada/3 otra), note, images[], sign, reception_name, reception_rut, service_request (pedido asociado), route_id, time_window_start/end`.

### Acciones
- **Obtener ruta:** `GET web-routes/{id}/`
- **Actualizar:** `PUT`/`PATCH web-routes/{id}/` body `{ driver:{id}, start_warehouse:{id}, end_warehouse:{id}, break_start, break_end, shift_start, shift_end, speed_factor, use_always, capacity, cost, skills:{id} }` (algunos se aplican al instante, otros tras optimizar).
- **Agregar pedidos:** `POST web-routes/{id}/add_service_requests/` body `{ "service_requests": [ids] }`
- **Optimizar / detener:** `POST web-routes/{id}/optimize/` · `POST web-routes/{id}/stop_optimization/`
- **Notificar conductor:** `POST web-routes/{id}/notify_driver/` · `denotify_driver/`
- **Notificar clientes:** `POST web-routes/{id}/notify_customers/` · `denotify_customers/`

---

## 7. API de Conductores

Endpoint: `https://app.optiroute.cl/api/v1/drivers/` (manual muestra `testing.`). Solo lectura.
- **Estados:** `-1` DISABLED (eliminado) · `0` ENTERED (creado).
- **Conductor de respuesta:** `id, name, email, phone_number, rut, status, shift_start, shift_end, speed_factor`.
- **Acciones:** `GET drivers/` (lista) · `GET drivers/{id}/` (detalle).

---

## 8. API de Depósitos (bodegas)

Puntos de partida/término de las rutas. Endpoint: `https://app.optiroute.cl/api/v1/warehouses/` (manual muestra `testing.`). Solo lectura.
- **Estados:** `-1` DISABLED · `0` ENTERED.
- **Depósito de respuesta:** `id, name, address` (objeto dirección: full_address, short_address, street_name, address_number, apartment_number, comuna{name}, sub_locality, locality, postal_code, latitude, longitude).
- **Acciones:** `GET warehouses/` (lista) · `GET warehouses/{id}/` (detalle).

---

## Mapeo Control Local → OptiRoute (venta tipo despacho)
| OptiRoute | Control Local |
|---|---|
| `customer.name` | `cliente.nombre` |
| `customer.phone_number` | `cliente.numero` |
| `customer.email` | `cliente.correo` |
| `address.address_string` | `cliente.direccion` |
| `address.commune_string` | `cliente.ciudad` |
| `address.apartment_number` | `cliente.depto` |
| `reference` | id / boleta de la venta |

## Arquitectura prevista (decidir al construir)
- Token de OptiRoute en variable de entorno de **Vercel** (`OPTIROUTE_TOKEN`), llamadas desde un route handler de Next.js (servidor). NUNCA en el cliente ni en el repo.
- Venta despacho → crear despacho persistido (tabla `despachos` en Supabase) → POST a OptiRoute → guardar `tracking_url`/estado.
- Estado: opción A botón "Actualizar" (poll autenticado, sin secretos extra) · opción B webhooks (instantáneo, requiere configurar URL en OptiRoute + service_role en Vercel solo-servidor).
