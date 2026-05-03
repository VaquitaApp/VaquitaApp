# HU13 — Implementación del directorio público (criterios completados)

**Fecha:** 2026-05-03  
**Historia de usuario:** Listado de fondos públicos disponibles para ingresar (usuario autenticado).

Este documento resume el trabajo realizado para cerrar los criterios de aceptación que estaban pendientes o incompletos tras la auditoría inicial.

---

## 1. Backend — `GET /api/funds/public`

**Archivo:** `server/src/routes/funds.js`

### Exclusión de fondos donde el usuario ya “está”

Se ajustó la consulta para que el listado **no incluya**:

- Fondos cuyo **organizador** es el usuario autenticado.
- Fondos donde el usuario figura como **participante con estado `accepted`**.

Los participantes en **pendiente** (`pending`) siguen viendo el fondo en el directorio (aún no forman parte del grupo aceptado).

Condiciones MongoDB aplicadas:

- `organizer: { $ne: userId }`
- `participants: { $not: { $elemMatch: { user: userId, status: 'accepted' } } }`

### Filtros opcionales por query string

| Parámetro  | Comportamiento |
|-----------|----------------|
| `q`       | Búsqueda por nombre (regex case-insensitive), sin cambios conceptuales. |
| `sort`    | `deadline` (asc) o `deadline_desc` (desc), igual que antes. |
| `type`    | Si vale `quota` o `free`, filtra por tipo de fondo. |
| `status`  | Si vale `paused`, se listan fondos públicos **en pausa**; en cualquier otro caso se usa **`active`** (comportamiento por defecto). |

La visibilidad sigue siendo siempre `public`.

---

## 2. Frontend — `PublicDirectoryPage`

**Archivo:** `client/src/pages/PublicDirectoryPage.jsx`

- **Debounce de búsqueda (350 ms):** reduce peticiones mientras se escribe; si el campo queda vacío, se actualiza el término de búsqueda **sin esperar** el debounce.
- **Efecto de carga con cleanup (`ignore`):** evita aplicar resultados de una respuesta obsoleta si cambian filtros u orden antes de que termine la petición (patrón recomendado en la documentación de React).
- **Limpieza de error:** al iniciar cada carga se ejecuta `setError('')`; el mensaje de error es más descriptivo y usa `role="alert"`.
- **Filtros en UI:** estado del fondo (Activos / En pausa) y tipo (Todos / Solo cuotas / Solo libre), alineados con los nuevos parámetros del API.
- **Listado condicional:** la grilla solo se muestra cuando no hay carga ni error, para no mezclar datos viejos con mensajes de fallo.
- **Accesibilidad:** `aria-label` en el buscador y etiquetas `sr-only` asociadas a los `<select>`.

---

## 3. Tarjetas — `FundCard`

**Archivo:** `client/src/components/funds/FundCard.jsx`

Se completó la información básica exigida en la HU:

- **Objetivo:** texto del campo `goal` (con `line-clamp-2` y `title` para el texto completo).
- **Montos explícitos:** línea “Recaudado” y “Meta” usando `fmtCLP`, además de la barra de progreso ya existente.
- **Nombre, fecha de cierre, tipo y estado** se mantienen como antes.

Este componente se usa también en “Mis fondos”; los campos añadidos son compatibles con ambos contextos.

---

## 4. Pruebas automatizadas

**Archivo:** `server/tests/integration/routes/funds.test.js`

En el bloque `GET /api/funds/public` se añadieron casos que verifican:

1. Respuesta solo con fondos públicos activos (caso existente, conservado).
2. El organizador no ve su propio fondo público en el directorio.
3. Un participante aceptado no ve ese fondo en el directorio.
4. Filtro `type=quota`.
5. Filtro `status=paused` para fondos públicos en pausa.

---

## 5. Criterios de aceptación — estado final

| Criterio | Estado |
|----------|--------|
| Listado de fondos públicos | Cumplido |
| Acceso solo autenticado | Sin cambios (ruta protegida + middleware `auth`) |
| Tarjeta con nombre, objetivo, recaudado, meta, cierre | Cumplido |
| No mostrar fondos donde el usuario ya participa (organizador o aceptado) | Cumplido |
| Enlace al detalle | Sin cambios (`FundCard` → `/fondos/:id`) |
| Búsqueda por nombre | Cumplido (con debounce en UI) |
| Filtros opcionales (estado y tipo) | Cumplido |
| Mensaje si no hay fondos | Cumplido (texto ampliado según contexto) |
| Datos desde base de datos | Sin cambios |
| Mensaje claro ante error de carga | Cumplido (copy y UX mejorados) |

---

## 6. Notas para evolución futura

- Si se desea que el **organizador** siga viendo su fondo público en el directorio (solo lectura / compartir), habría que relajar la condición `organizer: { $ne }` y acordar criterio de producto.
- Los estados `closed` / `completed` no se exponen en el directorio de unión; seguirían siendo candidatos solo si el negocio pide un “archivo” o historial público.
