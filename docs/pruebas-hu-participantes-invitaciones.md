# Evidencia de pruebas — HU participantes, invitaciones y acceso público

Historia de usuario: *Como organizador de un fondo quiero invitar y eliminar participantes para gestionar quiénes forman parte del fondo*, incluyendo invitaciones por correo, tokens de un solo uso, y solicitudes de acceso a fondos públicos.

## Suite automatizada

| Ubicación | Comando |
|-----------|---------|
| Archivo | `server/tests/integration/hu/hu-participantes-invitaciones-acceso.test.js` |
| Ejecutar solo esta suite | `cd server && npx jest tests/integration/hu/hu-participantes-invitaciones-acceso.test.js --runInBand` |
| Ejecutar todo el backend | `cd server && npm test` |

Los identificadores **TC-HU-PART-xxx** coinciden con el texto del `it(...)` en el archivo de prueba.

> **Nota:** En algunos entornos Windows, `mongodb-memory-server` puede fallar con `EACCES` al elegir puerto. En ese caso, reintente `npm test` o ejecute solo la suite HU; el fallo no indica por sí solo un error en los casos de la HU.

---

## Última ejecución registrada de la suite HU

| Campo | Valor |
|-------|--------|
| Fecha y hora | **2026-05-02 15:01:04 -04:00** (registro al documentar) |
| Entorno | Node / Jest, `mongodb-memory-server` |
| Resultado global | **24/24 tests PASS** (≈8–9 s) |

---

## Casos de prueba (automatizados)

| ID | Entrada | Resultado esperado | Resultado obtenido | ¿Éxito? | Fecha y hora prueba | Comentarios adicionales |
|----|---------|-------------------|---------------------|---------|---------------------|-------------------------|
| TC-HU-PART-001 | `POST /invitations` con JWT de participante (no organizador) | **403**, sin crear invitación | **403** | Sí | 2026-05-02 15:01 -04:00 | Cubre “solo organizador invita”. |
| TC-HU-PART-002 | `DELETE /participants/:userId` con JWT de participante | **403** | **403** | Sí | 2026-05-02 15:01 -04:00 | Participante aceptado previo; solo organizador elimina. |
| TC-HU-PART-003 | `GET /users/search?q=...` nombre y correo, JWT organizador | **200**, resultados que incluyen al invitado | **200**, coincidencias por nombre y email | Sí | 2026-05-02 15:01 -04:00 | API que alimenta el listado del modal. |
| TC-HU-PART-004 | `POST /invitations` válido | **201**, `pending` + `invitationToken` UUID | **201**, cuerpo con token | Sí | 2026-05-02 15:01 -04:00 | El envío de correo no se asserta aquí (ver manuales). |
| TC-HU-PART-005 | `POST /invitations` con fondo cerrado | **422** + cuerpo `error` no vacío | **422** + mensaje descriptivo | Sí | 2026-05-02 15:01 -04:00 | Base para mensaje claro en UI (`err.response.data.error`). |
| TC-HU-PART-006 | Segundo `POST /invitations` cuando el usuario ya está **accepted** | **409**, error tipo “already participant” | **409** | Sí | 2026-05-02 15:01 -04:00 | |
| TC-HU-PART-007 | Aceptar invitación; luego `GET /participants` como organizador | Participante con `status: accepted` | **accepted** en listado | Sí | 2026-05-02 15:01 -04:00 | |
| TC-HU-PART-008 | Rechazar invitación; `GET /participants` | Sin fila **accepted** para ese usuario; estado **rejected** | **rejected**; 0 accepted para ese email | Sí | 2026-05-02 15:01 -04:00 | La UI de detalle solo lista aceptados; la API conserva la fila rechazada. |
| TC-HU-PART-009 | Dos invitaciones seguidas en estado **pending** | **200** en 2.ª; token distinto; token antiguo **404** al aceptar | Comportamiento esperado | Sí | 2026-05-02 15:01 -04:00 | Reemisión invalida el token anterior. |
| TC-HU-PART-010 | Reinvitar tras **rejected** con fondo activo | **200**, `pending` y nuevo token | **200** | Sí | 2026-05-02 15:01 -04:00 | |
| TC-HU-PART-011 | Aceptar con fondo **cerrado** | **422**, mensaje informativo (cerrado/completado) | **422** | Sí | 2026-05-02 15:01 -04:00 | |
| TC-HU-PART-012 | Aceptar con **deadline** vencida | **422**, mensaje sobre fecha límite | **422** | Sí | 2026-05-02 15:01 -04:00 | |
| TC-HU-PART-013 | Aceptar con fondo **completed** | **422** | **422** | Sí | 2026-05-02 15:01 -04:00 | |
| TC-HU-PART-014 | Dos veces `POST /invitations/:token/accept` mismo token | Primera **200**, segunda **404** | **200** + **404** | Sí | 2026-05-02 15:01 -04:00 | Token invalidado tras uso. |
| TC-HU-PART-014B | Dos veces `reject` mismo token de invitación | Primera **200**, segunda **404** | **200** + **404** | Sí | 2026-05-02 15:01 -04:00 | Complemento de TC-014 (aceptar). |
| TC-HU-PART-015 | `DELETE /participants` sin aportes **succeeded** | **204** | **204** | Sí | 2026-05-02 15:01 -04:00 | |
| TC-HU-PART-016 | `DELETE /participants` con aporte **succeeded** | **422** + mensaje de error | **422** | Sí | 2026-05-02 15:01 -04:00 | Criterio: transacciones exitosas en BD. |
| TC-HU-PART-017 | `POST /access-requests` usuario autenticado, fondo **público** activo | **201** + registro `accessRequests` pending | **201** | Sí | 2026-05-02 15:01 -04:00 | Correo al organizador: ver **TC-HU-PART-M01**. |
| TC-HU-PART-018 | `POST /access-requests` fondo **privado** | **403** | **403** | Sí | 2026-05-02 15:01 -04:00 | |
| TC-HU-PART-019 | `POST /fund-access/:token/accept` | **200** + participante **accepted** en BD | **200** + accepted | Sí | 2026-05-02 15:01 -04:00 | Correo al usuario: **TC-HU-PART-M02**. |
| TC-HU-PART-020 | `POST /fund-access/:token/reject` | **200** + sin participante accepted para ese usuario | **200** | Sí | 2026-05-02 15:01 -04:00 | |
| TC-HU-PART-021 | Dos aceptaciones mismo token de acceso | Primera **200**, segunda **404** | **200** + **404** | Sí | 2026-05-02 15:01 -04:00 | |
| TC-HU-PART-022 | Invitación **pending** + `POST /access-requests` | **409** | **409** | Sí | 2026-05-02 15:01 -04:00 | Evita solapar flujos. |
| TC-HU-PART-023 | Token de acceso válido pero fondo luego **cerrado** | **422** al aceptar | **422** | Sí | 2026-05-02 15:01 -04:00 | |

---

## Casos de prueba manuales (correo y UI)

| ID | Entrada | Resultado esperado | Resultado obtenido | ¿Éxito? | Fecha y hora prueba | Comentarios adicionales |
|----|---------|-------------------|---------------------|---------|---------------------|-------------------------|
| TC-HU-PART-M01 | Invitar desde UI o API; revisar Mailpit (`localhost:8025`) | Correo con enlaces **Aceptar** / **Rechazar** hacia la app | *Pendiente de registrar por quien ejecuta la prueba* | — | | Repetir tras reinvitar y comprobar que solo el enlace nuevo funciona. |
| TC-HU-PART-M02 | Aceptar solicitud de acceso (organizador abre enlace del correo) | Correo al solicitante confirmando aceptación | *Pendiente* | — | | Depende de SMTP/Mailpit en desarrollo. |
| TC-HU-PART-M03 | Error al invitar en UI (ej. fondo cerrado) | Mensaje de error visible (texto de `error` del API) | *Pendiente* | — | | Prueba en `InviteModal` / detalle fondo. |

---

## Mantenimiento de esta evidencia

1. Tras cambios en reglas de negocio, ejecutar la suite HU y **`npm test`** completo.  
2. Actualizar la tabla **Última ejecución registrada** y, si aplica, columna **Resultado obtenido** / **¿Éxito?** fila a fila.  
3. Completar los resultados **manuales** cuando se haga QA con Mailpit o entorno real.

Documento relacionado: [cambios-invitaciones-y-acceso-fondos-publicos.md](./cambios-invitaciones-y-acceso-fondos-publicos.md).
