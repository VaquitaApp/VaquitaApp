# Evidencia de pruebas — HU13 Directorio público

**Historia de usuario:** Como usuario autenticado, quiero ver un listado de fondos públicos disponibles para poder unirme a aquellos que me interesen.

## Suite automatizada

| Campo | Valor |
|-------|--------|
| Archivo | `server/tests/integration/HU13/hu13-directorio-publico.test.js` |
| Comando (solo HU13) | `cd server && npx jest tests/integration/HU13/hu13-directorio-publico.test.js --runInBand` |
| Implementación de referencia | [hu13-directorio-publico-implementacion.md](./hu13-directorio-publico-implementacion.md) |

Los identificadores **TC-HU13-xxx** coinciden con el texto del `it(...)` en el archivo de prueba.

---

## Última ejecución registrada

| Campo | Valor |
|-------|--------|
| Fecha y hora | **2026-05-03 17:04:03 -04:00** |
| Entorno | Windows, Node, Jest, `mongodb-memory-server` |
| Resultado global | **12/12 tests PASS** (~3,7 s) |

> Vuelva a ejecutar la suite y actualice esta sección y la tabla siguiente si necesita evidencia vigente para auditoría o feria.

---

## Casos de prueba

| ID | Entrada | Resultado esperado | Resultado obtenido | ¿Éxito? | Fecha y hora prueba | Comentarios adicionales |
|----|---------|-------------------|---------------------|---------|---------------------|-------------------------|
| TC-HU13-01 | `GET /api/funds/public` sin cabecera `Authorization` | **401** | **401** | Sí | 2026-05-03 17:04 -04:00 | Criterio: solo usuarios autenticados. |
| TC-HU13-02 | JWT usuario ajeno; BD con público activo, privado activo, público cerrado | **200**, un solo fondo, `visibility: public`, `status: active` | **200**, 1 ítem, público y activo | Sí | 2026-05-03 17:04 -04:00 | Cubre listado “disponibles” por defecto. |
| TC-HU13-03 | JWT del **organizador** del único fondo público activo | **200**, lista vacía | **200**, `length === 0` | Sí | 2026-05-03 17:04 -04:00 | No mostrar fondos donde ya “está” como organizador. |
| TC-HU13-04 | JWT de **participante accepted** del fondo público | **200**, lista vacía | **200**, `length === 0` | Sí | 2026-05-03 17:04 -04:00 | No mostrar si ya participa aceptado. |
| TC-HU13-05 | JWT de participante **pending** en el mismo fondo | **200**, el fondo aparece | **200**, 1 ítem con el nombre esperado | Sí | 2026-05-03 17:04 -04:00 | Pendiente no cuenta como “ya participa” en el listado. |
| TC-HU13-06 | `GET /api/funds/public?q=viaje` (mayúsculas en dato: “Viaje…”) | **200**, solo coincidencias por nombre | **200**, 1 resultado “Viaje Curso 2026” | Sí | 2026-05-03 17:04 -04:00 | Barra de búsqueda por nombre (API `q`). |
| TC-HU13-07 | `?type=quota` con mix cuota/libre | **200**, solo `type: quota` | **200**, un ítem `quota` | Sí | 2026-05-03 17:04 -04:00 | Filtro opcional por tipo. |
| TC-HU13-08 | `?type=free` con mix cuota/libre | **200**, solo `type: free` | **200**, un ítem `free` | Sí | 2026-05-03 17:04 -04:00 | Filtro opcional por tipo. |
| TC-HU13-09 | `?status=paused` con fondo público en pausa | **200**, `status: paused` | **200**, ítem en pausa | Sí | 2026-05-03 17:04 -04:00 | Filtro opcional por estado del fondo. |
| TC-HU13-10 | Fondo con aporte succeeded; `GET /public` como visitante | Cada ítem con `name`, `goal`, `targetAmount`, `collectedAmount`, `deadline`, `status`, `_id` | Campos presentes; `collectedAmount === 25000` | Sí | 2026-05-03 17:04 -04:00 | Datos para tarjeta y enlace a detalle; datos coherentes con BD. |
| TC-HU13-11 | `?sort=deadline_desc` con dos plazos distintos | Orden: cierre más lejano primero | Nombres `['Cierra después','Cierra antes']` | Sí | 2026-05-03 17:04 -04:00 | Ordenación por fecha de cierre. |
| TC-HU13-12 | `GET /api/funds/:id` con JWT de usuario **no miembro**, fondo `visibility: public` | **200** y cuerpo con nombre del fondo | **200**, `name` correcto | Sí | 2026-05-03 17:04 -04:00 | Acceso al detalle desde el flujo del directorio (API). |

---

## Fuera de alcance de esta suite (manual o E2E)

| Tema | Motivo |
|------|--------|
| UI: textos de vacío, error de red, debounce de búsqueda | Requiere prueba de componente (p. ej. Vitest/RTL) o E2E; no está en el `package.json` del cliente al momento. |
| Render de tarjeta (`FundCard`) | La HU se valida en API con los campos que consume la tarjeta (TC-HU13-10). |
| Mensaje de error 500 en listado | Forzar fallo de BD o mock de ruta; no incluido para evitar fragilidad en CI. |

Si se agregan pruebas de front, documente nuevos **TC-HU13-UI-xxx** en una tabla análoga.
