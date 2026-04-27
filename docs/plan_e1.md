# Plan Entrega 1 — VaquitaApp

> Documento de trabajo. Se actualiza conforme se resuelven decisiones. Cuando esté completo, sirve como guía de implementación y referencia para el tablero JIRA.

---

## Estado de decisiones

| # | Tema | Estado | Resolución |
|---|---|---|---|
| D1 | Funcionalidad IA (RF-20 vs RF-21) | 🟢 Resuelto | Diferida a E2/E3. No es obligatoria en entrega1.md oficial. |
| D2 | Herramienta de testing | 🟢 Resuelto | Jest para E1 (unit + integration, registrar en Moodle). Puppeteer para E3 (E2E, no requiere inscripción separada). No son excluyentes: pirámide de testing. |
| D3 | Confirmación de email en registro (HU05-2) | 🟢 Resuelto | Verificación de email **implementada en E1**. Token uuid almacenado en `emailVerificationToken` (campo opcional en el modelo para no romper factories). Login retorna 403 si `isEmailVerified === false`. Frontend: `/verificar-email/:token`. |
| D4 | HU15 Pago: ¿E1 simulado o E2? | 🟢 Resuelto | E1: simulación completa (UI de pago + datos persistidos). Arquitectura preparada para Stripe test en E2 vía `PaymentService` intercambiable. |
| D5 | HU16 Notificaciones: umbrales y stack | 🟢 Resuelto | E1 con Nodemailer+Ethereal+node-cron. Recordatorios a los 5, 3 y 1 día(s) antes del vencimiento. Campo `ultimoRecordatorio` en aporte para evitar duplicados. |
| D6 | HU13/HU14: ¿perspectiva participante o eliminar? | 🟢 Resuelto | Ambas tienen criterios en JIRA. HU13 = directorio de fondos públicos. HU14 = detalle unificado (misma vista que HU08, con control de acceso por membresía/visibilidad). |
| D7 | Participantes: ¿solo usuarios registrados o también externos? | 🟢 Resuelto | Ambos tipos confirmados en JIRA: SCRUM-44 (esquema externos), SCRUM-46 (formulario externo+aporte). HU11 distingue registrado (notificación) de no registrado (email con link). |
| D8 | Tipo de board JIRA: ¿Kanban o Scrum? | 🔴 Pendiente | — |
| D9 | Estimaciones: ¿story points o horas? | 🟢 Resuelto | Decisión interna del equipo (probablemente story points). No afecta implementación. |
| D10 | Filtros y ordenamiento de fondos | 🟢 Resuelto | Filtro por texto libre + estado. Ordenamiento por fecha (no filtro por fecha). Agrega parámetro `sortBy=fechaLimite` en la API. |
| D11 | Regla de eliminación de fondo | 🟡 Parcial | HU10 dice: no eliminar si hay dinero recaudado |
| D12 | Criterios fondo con cuota vs monto libre | 🟢 Resuelto | HU06 define ambos tipos con criterios detallados |

---

## Alcance E1 — por confirmar

### CRUD obligatorio sobre fondos (6 operaciones)

| Operación | Historia | Estado |
|---|---|---|
| Listar | HU07 (SCRUM-19) | ✅ En backlog |
| Buscar/filtrar | Subtask SCRUM-34 (solo texto) | ⚠️ Criterios incompletos |
| Ver detalle | HU08 (SCRUM-20) | ✅ En backlog |
| Crear | HU06 (SCRUM-11) | ✅ En backlog |
| **Editar** | **HU09 (SCRUM-56)** | **✅ En backlog** |
| Eliminar | HU10 (SCRUM-22) | ✅ En backlog |

### Funcionalidades adicionales E1

| Feature | Historia | Estado |
|---|---|---|
| Login | HU05-1 (SCRUM-10) | ✅ En backlog |
| Registro | HU05-2 (SCRUM-36) | ✅ Implementado con verificación de email, RUT chileno — ver D3 actualizado |
| Invitar/eliminar participante | HU11 (SCRUM-23) | ✅ Implementado — solo usuarios registrados, ver D7 |
| Registrar aporte | HU12 (SCRUM-24) | ✅ En backlog |
| Ver detalle fondo (estado/progreso) | HU08 (SCRUM-20) | ✅ En backlog |
| ~~Funcionalidad IA~~ | ~~AUSENTE~~ | ✅ Diferida a E2/E3 (no obligatoria en E1) |

### Entregables de documentación (ninguno tiene tarea en JIRA)

| Entregable | Estado |
|---|---|
| README con links a video, Wiki e integrantes | ⏸️ Diferido |
| .gitignore + LICENSE | ⏸️ Diferido |
| Directorio docs/ (vacío por ahora) | ⏸️ Diferido |
| GitHub Wiki (Home + páginas del proyecto + Entrega 1) | ⏸️ Diferido |
| Tag v1.0-entrega1 + GitHub Release en main | ⏸️ Diferido (ver HUCI) |
| GitFlow setup (main protegido, develop, PR rules) | ✅ SCRUM-57 |

---

## Problemas en el backlog actual

### 🔴 Críticos

1. ~~**HU09 Editar Fondo ausente**~~ — ✅ Creado como SCRUM-56 (2026-04-27).

2. **Funcionalidad IA ausente** — Obligatoria. Ninguna historia la cubre. Pendiente decisión D1.

3. **Sin estimaciones** — Todos los issues tienen `story_points = null`. Obligatorio por entrega1.md §3.2. Estimar todo el backlog E1.

4. **Sin asignaciones** — Todos `Unassigned`. El tablero no refleja quién hace qué.

### 🟡 Importantes

5. **HU04 (SCRUM-15) sin criterios de aceptación** — Solo dice "Configuración del entorno". Necesita criterios y herramienta de testing definida (D2).

6. **HU11 (SCRUM-23) sin criterios de aceptación** — Historia de invitar/eliminar participante. Necesita criterios y resolución de D7 (externos vs. registrados).

7. ~~**HU05-2 (SCRUM-36): confirmación de email**~~ — ✅ Resuelto. Verificación de email implementada en E1 con Mailpit (SMTP local). Ver D3 actualizado.

8. ~~**HU15 (SCRUM-54): pago real al destinatario**~~ — ✅ Resuelto. Simulación completa implementada en E1 (`MockPaymentForm` + `PaymentService`). Ver D4 y S-07.

9. ~~**HU16 (SCRUM-55): notificaciones con email automático**~~ — ✅ Resuelto. Notificaciones automáticas (cron) y manuales implementadas con Mailpit. Ver D5.

### 🟠 Confusiones de diseño

10. **HU13 (SCRUM-52) y HU14 (SCRUM-53) sin criterios** — ¿Son perspectiva del participante sobre HU07/HU08? ¿Están en E1? Ver D6.

11. **Board type JIRA** — Proyecto creado con plantilla Scrum (clave `SCRUM`). El curso exige Kanban. Ver D8.

---

## Acciones JIRA pendientes

### Crear

| Historia | Prioridad |
|---|---|
| ~~HU09: Editar Fondo (Update)~~ | ✅ SCRUM-56 creado |
| HUDOC: Entregables documentación E1 | ⏸️ Diferido — proceso transversal E1/E2/E3, crear al inicio de cada entrega |
| HUCI-1: GitFlow setup (SCRUM-57) | ✅ Creado y configurado |
| HUCI-2: Tag v1.0-entrega1 + GitHub Release | ⏸️ Diferido — ejecutar al cierre de E1 |

### Actualizar

| Issue | Acción |
|---|---|
| SCRUM-15 (HU04) | Agregar criterios de aceptación + herramienta de testing |
| SCRUM-23 (HU11) | Agregar criterios de aceptación; resolver D7 |
| SCRUM-34 (filtro búsqueda) | Ampliar criterios según D10 |
| SCRUM-36 (HU05-2) | ✅ Implementado con verificación de email y RUT. Descripción en Jira debería reflejar requisito de RUT y flujo de verificación. |
| SCRUM-52 (HU13) | ✅ Implementado. Criterios completos. |
| SCRUM-53 (HU14) | ✅ Implementado. Comparte componente `FundDetailPage` con HU08. |
| SCRUM-54 (HU15) | ✅ Implementado en E1 con `MockPaymentForm` (sin campos de tarjeta, solo confirmación) + `PaymentService`. |
| SCRUM-55 (HU16) | ✅ Implementado en E1 con Mailpit (SMTP local). Cron diario + recordatorio manual + notificación de cambio de estado. |
| **Todos** | Agregar estimaciones (D9) |
| **Todos** | Asignar responsables |

---

## Secuencia de implementación propuesta

> Se completa cuando todas las decisiones estén resueltas.

```
[ Fase 0 — Infraestructura ]
  Setup proyecto (repos, GitFlow, JIRA, integraciones)
  Setup backend (Express + MongoDB)
  Setup frontend (React + Tailwind)
  Setup testing (herramienta elegida)

[ Fase 1 — Auth ]
  HU05-2: Registro
  HU05-1: Login

[ Fase 2 — CRUD Fondos ]
  HU06: Crear Fondo
  HU07: Listar Fondos + filtro
  HU08: Ver Detalle Fondo
  HU09: Editar Fondo
  HU10: Eliminar Fondo

[ Fase 3 — Participantes y Aportes ]
  HU11: Invitar/Eliminar Participante
  HU12: Registrar Aporte

[ Fase 4 — IA ]
  HUIA: Funcionalidad IA

[ Fase 5 — Entregables ]
  HUDOC: README + Wiki + docs/
  HUCI: Tag v1.0-entrega1 + Release
```

---

## Supuestos de implementación

> Decisiones que van más allá de los requerimientos funcionales originales. Deben incluirse en la página "Supuestos y dependencias" de la Wiki y en la sección 7 de `requirements.md`.

| ID | Supuesto | Impacto |
|---|---|---|
| S-01 | El registro de usuario **requiere verificación de email en E1**. Al registrarse se genera un token uuid almacenado en `emailVerificationToken`. `GET /api/auth/verify-email/:token` activa la cuenta (`isEmailVerified = true`). El login rechaza con 403 si la cuenta no está verificada. Las factories de tests crean usuarios con `isEmailVerified: true` por defecto para no depender del flujo de email en los tests. | Diferencia con decisión original D3: se implementó verificación completa desde E1. |
| S-02 | Las notificaciones de recordatorio se envían a los 5, 3 y 1 día(s) antes del vencimiento (cuota o cierre del fondo). | Define la granularidad del cron y el campo `ultimoRecordatorio`. |
| S-03 | Para E1, el envío de emails usa Ethereal Email (SMTP falso de desarrollo). Los emails no llegan a buzones reales; se previsualiza con URL en consola. | Sin dependencia de servicios externos. En E2 se reemplaza el transporter por SMTP real. |
| S-04 | Para evitar recordatorios duplicados, cada aporte/participante lleva un campo `ultimoRecordatorio: Date`. El cron omite el envío si ya se notificó hoy. | Agrega un campo al modelo de aportes/participantes. |
| S-05 | Un fondo libre notifica al participante solo si **no ha depositado nada** y quedan ≤ 5 días para el cierre. Si depositó aunque sea un monto parcial, no recibe recordatorio. | Simplifica la condición de mora para fondos libres. |
| S-13 | La cuenta destinatario del fondo es editable solo mientras no exista ninguna transacción registrada (aportes exitosos == 0). Una vez registrado el primer aporte, la cuenta queda bloqueada. Motivo: prevención de fraude — evitar que el organizador cambie la cuenta receptora cuando ya hay dinero comprometido. | Requiere validación en el endpoint PATCH /fondos/:id: consultar si existen aportes antes de permitir cambio de cuenta. |
| S-15 | Un fondo solo es editable mientras su estado sea `activo`. Fondos en `completado` o `cerrado` son de solo lectura. Además, una vez que existe al menos un aporte registrado, los campos `montoEsperado`, `fechaLimite`, `cuentaDestinatario`, `frecuencia` y `montoAportePorParticipante` quedan bloqueados (prevención de fraude). Los campos nombre, descripción, objetivo y visibilidad permanecen editables mientras el fondo esté activo. | Afecta el endpoint `PATCH /fondos/:id`: validar `fondo.estado === 'activo'` y, si hay aportes, rechazar cambios en los campos bloqueados con HTTP 422 y mensaje explicativo. La UI debe deshabilitar visualmente los campos bloqueados. |
| S-14 | Al ejecutar el pago al destinatario final (HU15), el fondo cambia automáticamente de estado a `completado`. No se requiere un paso manual adicional del organizador para cerrar el fondo. | El endpoint de pago debe actualizar `fondo.estado = 'completado'` en la misma transacción. |
| S-12 | El tipo de usuario (`tipoUsuario: 'persona_natural' | 'organizacion'`) es un campo de perfil sin impacto en permisos ni funcionalidades. Una organización tiene un único dueño/administrador, igual que una persona natural. No existe colección separada `Organization`. El campo solo sirve para identificar el contexto del fondo (ej. "Centro de Padres" vs nombre personal). | Un campo adicional en el esquema `User`. Sin lógica de autorización diferencial. |
| S-11 | El listado de fondos (HU07 y HU13) permite ordenar por fecha de cierre (`sortBy=fechaLimite asc/desc`) pero no filtra por rango de fechas. Filtros disponibles: texto libre (nombre) y estado (activo/cerrado/completado). | Afecta el endpoint `GET /fondos` — parámetro `sort` opcional. Sin date picker en la UI de E1. |
| S-10 | Estrategia de testing en dos capas: (1) Jest para unit e integration tests en E1 — prueba lógica de negocio y endpoints API de forma aislada, sin browser, sin servidor completo; (2) Puppeteer para E2E en E3 — prueba flujos completos de usuario en browser headless. Jest se registra en Moodle para E1. Puppeteer no requiere inscripción separada (E3 lo permite explícitamente como alternativa a Selenium). En E2, el pipeline Jenkins corre solo Jest (sin dependencia de browser). En E3 se agrega Puppeteer al mismo pipeline. | Estructura de carpetas: `server/tests/` para Jest, `tests/e2e/` para Puppeteer (se agrega en E3). Jenkinsfile de E2 solo necesita Node, sin Chromium. |
| S-06 | La funcionalidad de IA (alertas predictivas, resúmenes automáticos) queda fuera de E1. Es un aspecto abierto del enunciado del tema 3, no un requisito obligatorio del curso. | Reduce alcance E1. Se considera para E2/E3. |
| S-07 | Todo flujo de pago en E1 es simulado. `<MockPaymentForm>` muestra la cuenta destinataria del fondo (`recipientAccount`: banco, tipo, número) y el monto total recaudado (`collectedAmount`), y solicita confirmación al organizador antes de ejecutar. Sin campos de tarjeta. El servidor registra la transacción como exitosa: `{ transactionId: 'sim_...', amount, status: 'succeeded', provider: 'simulation' }`. La lógica se encapsula en `PaymentService`. En E2: reemplazar `MockPaymentForm` por `<CardElement>` de Stripe Elements y cuerpo de `processPayment()`. Cero cambio de esquema ni de rutas. | Afecta `server/services/paymentService.js` y `MockPaymentForm.jsx`. Ninguna dependencia externa de pago en E1. |
| S-09 | Los participantes de un fondo son exclusivamente usuarios registrados en la plataforma. El organizador los invita buscando por nombre o correo y seleccionándolos desde un listado. El sistema envía un email (Mailpit en local, SES en producción) con links de Aceptar / Rechazar. La invitación es válida mientras `fondo.estado === 'activo'` y `fondo.fechaLimite > ahora`. No existe colección `ExternalParticipant`. | Modelo simplificado: los participantes del fondo son referencias directas a `User`. El endpoint de invitación valida estado y fecha límite antes de permitir aceptación. |
| S-08 | Los fondos tienen visibilidad `público` o `privado`. Los fondos públicos aparecen en el directorio (HU13) y cualquier usuario autenticado puede ver su detalle (HU14). Los fondos privados solo son visibles para sus miembros e invitados. La vista de detalle (HU14/HU08) es un único componente `/fondos/:id` con renderizado condicional según rol del usuario: organizador, participante o visitante. | Implica campo `visibilidad: 'publico' | 'privado'` en el modelo de Fondo. Afecta middleware de autorización en rutas de fondos. |

---

## Reglas de negocio — Notificaciones (HU16)

> Implementación: `nodemailer` + Ethereal Email (desarrollo local, gratis, sin cuenta). Scheduler: `node-cron` (cron diario). Para E2/E3 se cambia Ethereal por Gmail SMTP o Resend.com sin tocar la lógica.

### Fondo con cuota

| Condición | Acción |
|---|---|
| Cuota del período actual sin pagar **y** quedan exactamente 5, 3 o 1 día(s) para su vencimiento | Enviar recordatorio al participante |
| Participante tiene cuotas de períodos anteriores sin pagar (mora acumulada) | Enviar alerta de mora (se revisa diario, una vez por día máximo) |

### Fondo libre

| Condición | Acción |
|---|---|
| Participante no ha depositado **nada** y quedan exactamente 5, 3 o 1 día(s) para el cierre del fondo | Enviar recordatorio |

### Control de duplicados

El cron corre diariamente. Para evitar múltiples envíos el mismo día, cada participante-por-fondo lleva un campo `ultimoRecordatorio: Date`. Si `ultimoRecordatorio` = hoy, se omite el envío.

---

## Historial de decisiones

| Fecha | Decisión | Resolución |
|---|---|---|
| 2026-04-26 | Stack tecnológico | React + Node.js + MongoDB + Tailwind CSS |
| 2026-04-26 | Despliegue E1 | Solo local |
| 2026-04-26 | Modelo de fondo | Dos tipos: monto libre + cuota fija (definido en HU06) |
| 2026-04-26 | Eliminación de fondo | No eliminar si hay dinero recaudado (definido en HU10) |
| 2026-04-27 | Estados del fondo | `activo` / `completado` / `cerrado`. Completado = objetivo alcanzado (éxito). Cerrado = terminado manualmente por organizador. Ver S-14, S-15. |
| 2026-04-27 | Restricciones de edición de fondo | Solo editable en estado `activo`. Con aportes registrados, `montoEsperado`, `fechaLimite`, `cuentaDestinatario`, `frecuencia`, `montoAportePorParticipante`, `tipo` y `visibilidad` quedan bloqueados. Ver S-15. |
| 2026-04-27 | Verificación de email en E1 | Implementada con token uuid (`emailVerificationToken`). Login bloqueado si no verificado. Reemplaza decisión original D3 (sin verificación). |
| 2026-04-27 | RUT chileno obligatorio en registro | Validado con módulo 11 en cliente y servidor. Almacenado normalizado (sin puntos, con guión, DV en mayúscula). |
| 2026-04-27 | `cuentaDestinatario` como subdocumento | `{ bank, accountType, accountNumber }` en lugar de String simple. `accountType` enum: corriente/vista/ahorro/chequera_electronica. `accountNumber` solo dígitos. |
| 2026-04-27 | `MockPaymentForm` sin campos de tarjeta | Muestra cuenta destinataria + monto recaudado, solo requiere confirmación del organizador. Sin datos de tarjeta simulados. |
| 2026-04-27 | Eliminación de cuenta con confirmación por email | `POST /api/users/request-delete` + `GET /api/users/confirm-delete/:token`. Bloqueada si usuario es organizador o participante activo en algún fondo. |
| 2026-04-27 | Notificación de cambio de estado del fondo | `sendStatusChangeEmail` enviada a organizador + participantes aceptados al completar o cerrar un fondo. |
