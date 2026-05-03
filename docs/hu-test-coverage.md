# Cobertura de Tests por Historia de Usuario

> Generado a partir del cruce entre los criterios de aceptación de Jira y los tests existentes en `server/tests/`.
> Fecha: 2026-05-03

---

## Resumen Ejecutivo

| HU | Criterios cubiertos | Criterios sin cobertura | Estado |
|---|---|---|---|
| HU05-1 — Inicio de Sesión | 8/8 | 0 | ✅ Completo |
| HU05-2 — Registro | 11/11 | Envío real de email de verificación sin mock | ⚠️ Casi completo |
| HU06 — Crear Fondo | 12/12 | 0 | ✅ Completo |
| HU07 — Visualizar Mis Fondos | 4/7 | Filtros `?q=`, `?estado=` (parciales), ordenamiento `?sortBy=fechaLimite` | ❌ Gaps |
| HU08 — Ver Detalle del Fondo | 9/9 | 0 | ✅ Completo |
| HU09 — Editar Fondo | 7/7 | 0 | ✅ Completo |
| HU10 — Eliminar Fondo | 7/7 | Close con aportes no testeado explícitamente | ⚠️ Casi completo |
| HU11 — Participantes / Invitaciones | 23/23 | 0 | ✅ Completo |
| HU12 — Registrar Aporte | 9/10 | Prefijo `sim_` del `transactionId` no verificado en archivo HU12 | ⚠️ Casi completo |
| HU13 — Directorio Público | 11/12 | Filtro de organizadores eliminados (`organizer=null`) | ⚠️ Casi completo |
| HU17 — Gestión de Perfil | 3/6 | Nombre de solo lectura, enum `accountType`, `GET /me` con `preferredAccount` fresca | ❌ Gaps |
| HU18 — Eliminación de Cuenta | 4/5 | Envío de email de confirmación sin mock, token ya utilizado | ⚠️ Casi completo |

---

## Detalle por HU

---

### HU05-1 — Inicio de Sesión

**Archivo HU-específico:** `tests/integration/HU05-1/hu05-1-login.test.js`

| Criterio de Aceptación | Test | Estado |
|---|---|---|
| Login con correo y contraseña válidos | `TC-HU05-1-01/06: Permite ingreso con credenciales válidas y retorna token` | ✅ |
| Campo correo obligatorio (no vacío) | `TC-HU05-1-02: Rechaza si el campo de correo electrónico está vacío` | ✅ |
| Campo contraseña obligatorio (no vacío) | `TC-HU05-1-03: Rechaza si el campo de contraseña está vacío` | ✅ |
| Error ante credenciales inválidas (contraseña incorrecta) | `TC-HU05-1-04: Muestra error ante credenciales inválidas (Contraseña incorrecta)` | ✅ |
| Error ante credenciales inválidas (usuario no registrado) | `TC-HU05-1-05: Muestra error ante credenciales inválidas (Correo no registrado)` | ✅ |
| Login exitoso genera token (redirección es frontend) | `TC-HU05-1-01/06: Permite ingreso con credenciales válidas y retorna token` | ✅ |
| Token con expiración de 7 días | `TC-HU05-1-07: El token generado tiene una expiración de 7 días` | ✅ |
| Contraseña menor a 6 caracteres no permite login | `TC-HU05-1-08: Rechaza si la contraseña tiene menos de 6 caracteres devolviendo 401` | ✅ |

**Cobertura adicional en archivos transversales:**
- `routes/auth.test.js` → `POST /api/auth/login`: cubre credenciales válidas, token, email no verificado, body vacío.

---

### HU05-2 — Registro de Usuario

**Archivo HU-específico:** `tests/integration/HU05-2/hu05-2-register.test.js`

| Criterio de Aceptación | Test | Estado |
|---|---|---|
| Registro con campos obligatorios (nombre, email, contraseña, RUT) | `TC-HU05-2-01 (CA1): Retorna 400 si faltan campos obligatorios` | ✅ |
| RUT chileno válido (formato y dígito verificador) | `TC-HU05-2-02 (CA2): Retorna 400 si el RUT tiene formato inválido o dígito erróneo` | ✅ |
| No permite RUT o correo existente | `TC-HU05-2-03 (CA3): Retorna 400/409 si el correo o RUT ya está registrado` | ✅ |
| Contraseña mínimo 6 caracteres | `TC-HU05-2-04 (CA4): Retorna 400 si la contraseña tiene menos de 6 caracteres` | ✅ |
| Usuario elige tipo (persona natural u organización) | `TC-HU05-2-05 (CA5): Permite registro exitoso como Organización` | ✅ |
| Contraseña almacenada encriptada (bcrypt) | `TC-HU05-2-06 (CA6): La contraseña se almacena encriptada, no en texto plano` | ✅ |
| Estado no verificado al registrarse | `TC-HU05-2-07 (CA7): Genera estado no verificado al registrarse exitosamente` | ✅ |
| Envío de email de verificación | `TC-HU05-2-07` — solo verifica `isEmailVerified=false` en BD; no hay mock de `sendVerificationEmail` | ⚠️ Parcial |
| Login bloqueado hasta verificar email | `TC-HU05-2-08 (CA8): Retorna 403 al intentar loguearse sin estar verificado` | ✅ |
| Mensajes de error descriptivos | `TC-HU05-2-09 (CA9): Retorna mensajes de error estructurados` | ✅ |
| Campo obligatorio vacío rechazado | `TC-HU05-2-10 (CA10): Retorna 400 si el nombre está vacío` | ✅ |
| Solo letras o espacios en el nombre | `TC-HU05-2-11 (CA11): Retorna 400 si el nombre contiene números o símbolos` | ✅ |

**Cobertura adicional en archivos transversales:**
- `routes/auth.test.js` → `POST /api/auth/register` y `GET /api/auth/verify-email/:token`.
- `unit/models/User.test.js` → hash de contraseña, lowercase email, email duplicado.
- `e2e/happyPath.test.js` → flujo completo de registro y verificación.

---

### HU06 — Crear Fondo Colectivo

**Archivo HU-específico:** `tests/integration/HU06/hu06-crear.test.js`

| Criterio de Aceptación | Test | Estado |
|---|---|---|
| Validar campos obligatorios | `TC-HU06-01: Rechaza si faltan campos obligatorios` | ✅ |
| Monto esperado > 0 | `TC-HU06-02: Rechaza monto esperado = 0` / `TC-HU06-02b: Rechaza monto negativo` | ✅ |
| Fecha de cierre válida (no en el pasado) | `TC-HU06-03: Rechaza fecha de cierre en el pasado` | ✅ |
| Fecha de cierre no mayor a 1 año | `TC-HU06-04: Rechaza fecha de cierre mayor a 1 año` | ✅ |
| Crear fondo libre exitosamente | `TC-HU06-05: Crea fondo "free" con datos válidos` | ✅ |
| Registrar organizador del fondo | `TC-HU06-05` (verifica campo `organizer` en respuesta) | ✅ |
| Campos: tipo, cuenta destinataria | `TC-HU06-05`, `TC-HU06-06`, `TC-HU06-08` | ✅ |
| Crear fondo por cuotas (tipo quota) | `TC-HU06-06: Crea fondo "quota" con frecuencia y monto de cuota` | ✅ |
| Fondo quota sin monto de cuota rechazado | `TC-HU06-07: Rechaza fondo "quota" sin monto de cuota` | ✅ |
| Cuenta bancaria moderna permitida | `TC-HU06-08: Permite cuenta bancaria moderna (Tenpo)` | ✅ |
| `quotaAmount` no puede superar `targetAmount` | `Rechaza minAmount mayor al targetAmount` | ✅ |
| Autenticación requerida | `401 sin token de autenticación` | ✅ |

**Cobertura adicional en archivos transversales:**
- `routes/funds.test.js` → `POST /api/funds`: validación frecuencia vs fecha límite, minAmount con participantes esperados.
- `unit/models/Fund.test.js` → validaciones del modelo Mongoose.
- `e2e/happyPath.test.js` → creación dentro del flujo completo.

---

### HU07 — Visualizar Mis Fondos

**Archivo HU-específico:** `tests/integration/HU07/hu07-mis-fondos.test.js`

| Criterio de Aceptación | Test | Estado |
|---|---|---|
| Listar fondos donde es organizador o participante aceptado | `TC-HU07-01 (CA7): Devuelve solo fondos donde el usuario es organizador o participante aceptado` | ✅ |
| Cada fondo incluye nombre, objetivo, deadline, estado | `TC-HU07-02 (CA1/CA3/CA8): Cada fondo incluye nombre, objetivo, deadline, estado` | ✅ |
| Mostrar `collectedAmount` | `TC-HU07-03 (CA2): El objeto del fondo incluye el collectedAmount` | ✅ |
| Array vacío si usuario no tiene fondos | `TC-HU07-04 (CA5): Devuelve arreglo vacío si el usuario no tiene fondos` | ✅ |
| Filtrar por texto libre sobre nombre (`?q=`) | Solo en `routes/funds.test.js` — no en archivo HU-específico | ⚠️ Parcial |
| Filtrar por estado (`?estado=activo`) | Solo en `routes/funds.test.js` — no en archivo HU-específico | ⚠️ Parcial |
| Ordenar por `fechaLimite` (`?sortBy=fechaLimite&order=asc`) | **Sin cobertura en ningún archivo** | ❌ Sin cobertura |

---

### HU08 — Ver Detalle del Fondo

**Archivo HU-específico:** `tests/integration/HU08/hu08-detalle.test.js`

| Criterio de Aceptación | Test | Estado |
|---|---|---|
| Ver progreso: `collectedAmount` refleja aportes | `TC-HU08-01: collectedAmount refleja aportes reales` | ✅ |
| Funciona cuando recaudación supera la meta | `TC-HU08-02: Funciona cuando recaudación supera la meta` | ✅ |
| Fondo quota retorna frecuencia y participantes | `TC-HU08-03: Fondo "quota" retorna frecuencia y participantes` | ✅ |
| Ver lista de participantes | `TC-HU08-03` (verifica campo `participants`) | ✅ |
| Ver muro de comentarios / mensajes | `TC-HU08-04: Participante puede publicar mensaje` | ✅ |
| Usuario ajeno no puede comentar (403) | `TC-HU08-05: Usuario ajeno recibe 403 al intentar comentar` | ✅ |
| Mensajes populados con nombre de usuario | `Mensajes se populan con el nombre del usuario` | ✅ |
| Acceso a fondo privado bloqueado para ajenos | `403 para usuario ajeno en fondo privado` | ✅ |
| Acceso a fondo público permitido | `200 para usuario ajeno en fondo público` | ✅ |
| `collectedAmount` es 0 sin aportes | `collectedAmount es 0 cuando no hay aportes` | ✅ |

**Cobertura adicional en archivos transversales:**
- `routes/fund-detail.test.js` → cubre acceso, lista de participantes, historial de aportes, progreso.
- `routes/funds.test.js` → `GET /api/funds/:id`.
- `e2e/happyPath.test.js` → flujo completo.

---

### HU09 — Editar Fondo

**Archivo HU-específico:** `tests/integration/HU09/hu09-editar.test.js`

| Criterio de Aceptación | Test | Estado |
|---|---|---|
| Solo organizador puede editar (403 para otros) | `TC-HU09-01: 403 si el usuario no es organizador` | ✅ |
| No editar fondo cerrado (422) | `TC-HU09-02: 422 si el fondo está cerrado` | ✅ |
| No editar fondo completado (422) | `TC-HU09-02b: 422 si el fondo está completado` | ✅ |
| Sin aportes: todos los campos editables | `TC-HU09-03: Permite editar cualquier campo si no hay aportes` | ✅ |
| Con aportes: campos sensibles bloqueados | `TC-HU09-04: 422 al editar targetAmount con aportes existentes` | ✅ |
| Con aportes: nombre, descripción y visibilidad permitidos | `TC-HU09-05: Permite editar nombre, descripción y visibilidad con aportes` | ✅ |
| `updateLog` al cambiar descripción/objetivo | `TC-HU09-06: Genera updateLog al cambiar descripción con invitados` | ✅ |
| Aplazar deadline sin error | `TC-HU09-07: Aplaza deadline sin error (email asíncrono)` | ✅ |

---

### HU10 — Eliminar / Cancelar Fondo

**Archivo HU-específico:** `tests/integration/HU10/hu10-eliminar.test.js`

| Criterio de Aceptación | Test | Estado |
|---|---|---|
| Eliminar fondo sin aportes (204) | `TC-HU10-01: 204 elimina fondo sin aportes` | ✅ |
| No eliminar si `collectedAmount > 0` (422) | `TC-HU10-02: 422 si el fondo tiene aportes recaudados` | ✅ |
| Eliminar fondo con participantes sin aportes | `TC-HU10-03: 204 elimina fondo con participantes invitados sin aportes` | ✅ |
| 403 si no es organizador | `403 si no es organizador` | ✅ |
| Cerrar fondo activo sin aportes | `Cierra un fondo activo correctamente` | ✅ |
| 422 si fondo ya cerrado | `422 si el fondo ya está cerrado` | ✅ |
| Pausar fondo activo | `TC-HU10-04: 200 pausa un fondo activo` | ✅ |
| Reanudar fondo pausado | `TC-HU10-05: 200 reanuda un fondo pausado` | ✅ |
| 422 al intentar cerrar fondo CON aportes | **Sin test explícito** | ⚠️ Sin cobertura |

---

### HU11 — Participantes, Invitaciones y Acceso

**Archivo HU-específico:** `tests/integration/HU11/hu-participantes-invitaciones-acceso.test.js`

| Criterio de Aceptación | Test | Estado |
|---|---|---|
| Invitar participantes (solo organizador) | `TC-HU-PART-001`, `TC-HU-PART-004` | ✅ |
| No invitar a participante ya aceptado | `TC-HU-PART-006` | ✅ |
| Aceptar invitación → participante aceptado | `TC-HU-PART-007` | ✅ |
| Rechazar invitación → no queda aceptado | `TC-HU-PART-008` | ✅ |
| Reinvitar (nuevo token invalida anterior) | `TC-HU-PART-009` | ✅ |
| Reinvitar tras rechazo | `TC-HU-PART-010` | ✅ |
| No aceptar en fondo cerrado | `TC-HU-PART-011` | ✅ |
| No aceptar con fecha límite vencida | `TC-HU-PART-012` | ✅ |
| No aceptar en fondo completado | `TC-HU-PART-013` | ✅ |
| Token de un solo uso tras aceptar | `TC-HU-PART-014` | ✅ |
| Token de un solo uso tras rechazar | `TC-HU-PART-014B` | ✅ |
| Organizador puede eliminar participantes sin aportes | `TC-HU-PART-015` | ✅ |
| No eliminar participante con aportes (422) | `TC-HU-PART-016` | ✅ |
| Solo organizador puede eliminar participante | `TC-HU-PART-002` | ✅ |
| Búsqueda de usuarios por nombre/correo | `TC-HU-PART-003` | ✅ |
| Solicitar unirse a fondo público | `TC-HU-PART-017` | ✅ |
| Solicitud rechazada en fondo privado (403) | `TC-HU-PART-018` | ✅ |
| Aceptar solicitud → participante aceptado | `TC-HU-PART-019` | ✅ |
| Rechazar solicitud → no queda aceptado | `TC-HU-PART-020` | ✅ |
| Token de acceso de un solo uso | `TC-HU-PART-021` | ✅ |
| No solicitar acceso si ya hay invitación pendiente | `TC-HU-PART-022` | ✅ |
| Respuesta acceso con fondo cerrado (422) | `TC-HU-PART-023` | ✅ |
| Error claro al invitar con error | `TC-HU-PART-005` | ✅ |

---

### HU12 — Registrar Aporte

**Archivo HU-específico:** `tests/integration/HU12/hu12-registrar-aporte.test.js`

| Criterio de Aceptación | Test | Estado |
|---|---|---|
| Registrar aporte con pago simulado | `HU12-INT-01: respuesta 201 incluye monto, usuario, fondo, estado succeeded` | ✅ |
| Prefijo `sim_` en `transactionId` | Solo verificado en `routes/contributions.test.js` | ⚠️ Parcial |
| `collectedAmount` se actualiza tras aporte | `HU12-INT-02: GET fondo refleja collectedAmount acumulado` | ✅ |
| Fondo quota: exactamente `pendingQuotas × quotaAmount` | `HU12-INT-03`, `HU12-INT-08` | ✅ |
| Fondo libre: cualquier monto | Implícito en `HU12-INT-01` | ✅ |
| Organizador puede aportar | `HU12-INT-05` (usa orgToken) | ✅ |
| Participantes aceptados pueden aportar | `HU12-INT-01` (usa partToken) | ✅ |
| Fondo pausado rechaza aporte (403) | `HU12-INT-04: fondo no activo rechaza nuevo aporte con 403` | ✅ |
| Monto cero o ausente rechazado (400) | `HU12-INT-05: monto cero o ausente responde 400` | ✅ |
| Fondo libre respeta `minAmount` | `HU12-INT-06: fondo libre respeta minAmount` | ✅ |

**Cobertura adicional en archivos transversales:**
- `routes/contributions.test.js` → organizador, no-miembro, participante pendiente, cuotas atrasadas, catch-up, quincenal, prefijo `sim_`.
- `unit/services/paymentService.test.js` → `transactionId` con prefijo `sim_`, `provider: simulation`.
- `unit/services/emailService.test.js` / `unit/services/notificationService.test.js` → lógica de recordatorios de mora.
- `integration/services/notificationService.test.js` → `sendFundReminders` por cron.
- `e2e/happyPath.test.js` → flujo completo de aportes.

---

### HU13 — Directorio Público

**Archivo HU-específico:** `tests/integration/HU13/hu13-directorio-publico.test.js`

| Criterio de Aceptación | Test | Estado |
|---|---|---|
| Requiere autenticación (401 sin token) | `TC-HU13-01` | ✅ |
| Solo fondos `public` y `active` por defecto | `TC-HU13-02` | ✅ |
| No lista fondos donde el usuario es organizador | `TC-HU13-03` | ✅ |
| No lista fondos donde el usuario es participante aceptado | `TC-HU13-04` | ✅ |
| Participante `pending` sí ve el fondo | `TC-HU13-05` | ✅ |
| Filtro `q` por nombre (case-insensitive) | `TC-HU13-06` | ✅ |
| Filtro `type=quota` | `TC-HU13-07` | ✅ |
| Filtro `type=free` | `TC-HU13-08` | ✅ |
| Filtro `status=paused` | `TC-HU13-09` | ✅ |
| Cada ítem incluye datos para tarjeta | `TC-HU13-10` | ✅ |
| Orden `sort=deadline_desc` | `TC-HU13-11` | ✅ |
| Usuario no miembro obtiene detalle fondo público (200) | `TC-HU13-12` | ✅ |
| Excluir fondos con `organizer=null` (organizador eliminado) | **Sin test dedicado** | ❌ Sin cobertura |

---

### HU17 — Gestión de Perfil de Usuario

**Archivo HU-específico:** `tests/integration/HU17/hu17-gestion-perfil.test.js`

| Criterio de Aceptación | Test | Estado |
|---|---|---|
| Ver nombre, RUT y email en solo lectura | `TC-HU17-01 (CA1): Retorna información de solo lectura (name, email, rut)` | ✅ |
| Editar cuenta bancaria preferida | `TC-HU17-02 (CA2/CA6): Permite actualizar la cuenta bancaria preferida` | ✅ |
| Número de cuenta solo acepta dígitos | `TC-HU17-03 (CA7): Retorna 400 si el número de cuenta contiene letras` | ✅ |
| Nombre es de solo lectura (PATCH no permite cambiarlo) | **Sin test** | ❌ Sin cobertura |
| Enum válido de `accountType` | **Sin test** | ❌ Sin cobertura |
| `GET /api/auth/me` retorna `preferredAccount` fresca de BD | **Sin test** | ❌ Sin cobertura |

---

### HU18 — Eliminación de Cuenta de Usuario

**Archivo HU-específico:** `tests/integration/HU18/hu18-eliminacion.test.js`

| Criterio de Aceptación | Test | Estado |
|---|---|---|
| Rechazar eliminación si usuario es organizador | `TC-HU18-01 (CA2): Rechaza si el usuario es organizador` | ✅ |
| Rechazar eliminación si usuario es participante activo | `TC-HU18-01b (CA2): Rechaza si el usuario es participante de un fondo` | ✅ |
| Sistema genera token y envía email de confirmación | `TC-HU18-02 (CA4)`: verifica token en BD — envío de email sin mock | ⚠️ Parcial |
| Confirmación por email elimina cuenta sin autenticación | `TC-HU18-03 (CA5/CA6): Elimina permanentemente con token válido` | ✅ |
| Token inválido o falso muestra error | `TC-HU18-04 (CA8): Rechaza eliminación con token inválido` | ✅ |
| Token de eliminación de un solo uso | **Sin test** | ❌ Sin cobertura |

---

## Archivos Transversales (cruzan múltiples HUs)

Estos archivos no pueden asignarse a una sola HU sin modificar su contenido.

| Archivo | HUs que cubre |
|---|---|
| `tests/integration/routes/auth.test.js` | HU05-1, HU05-2, HU17 |
| `tests/integration/routes/funds.test.js` | HU06, HU07, HU08, HU09, HU10, HU13 |
| `tests/integration/routes/fund-detail.test.js` | HU08 (principal), HU06, HU07, HU11, HU12, HU13 |
| `tests/integration/routes/participants.test.js` | HU11 (principal), HU12 |
| `tests/integration/routes/contributions.test.js` | HU12 (principal), HU08, HU10 |
| `tests/integration/routes/fundAccess.test.js` | HU11 |
| `tests/integration/services/notificationService.test.js` | HU12 (recordatorios de mora) |
| `tests/integration/e2e/happyPath.test.js` | HU05-2, HU05-1, HU06, HU07, HU08, HU09, HU10, HU11, HU12, HU13 |

## Archivos Unitarios Transversales

| Archivo | HUs que cubre |
|---|---|
| `tests/unit/models/Fund.test.js` | HU06 (validaciones del modelo) |
| `tests/unit/models/User.test.js` | HU05-2 (modelo de usuario) |
| `tests/unit/services/paymentService.test.js` | HU12, HU10 |
| `tests/unit/services/emailService.test.js` | HU12 (recordatorios de mora — aspecto email) |
| `tests/unit/services/notificationService.test.js` | HU12 (lógica `shouldSendReminder`) |

## Sin HU Asociada

| Archivo                    | Descripción                                                    |
| -------------------------- | -------------------------------------------------------------- |
| `tests/unit/smoke.test.js` | Test de infraestructura — verifica que la BD in-memory conecta |
