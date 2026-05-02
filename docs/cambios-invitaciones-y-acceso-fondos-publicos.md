# Cambios: invitaciones, tokens y solicitud de acceso a fondos públicos

Documentación de los cambios alineados con la historia de usuario **“Como organizador quiero invitar y eliminar participantes / gestión de invitaciones y acceso a fondos públicos”** (INF331 — VaquitaApp).

Fecha de referencia: implementación en `develop` (sesión 2026).

Evidencia de pruebas con casos TC-HU-PART-xxx: ver [pruebas-hu-participantes-invitaciones.md](./pruebas-hu-participantes-invitaciones.md).

## Objetivo

Completar criterios de aceptación que faltaban o estaban incompletos:

1. **Un solo token de invitación válido**: al aceptar o rechazar, el token deja de ser usable; reintentos responden **404**.
2. **Reinvitar con invitación pendiente**: nuevo UUID, correo renovado, respuesta **200** (antes **409**).
3. **Solicitud de acceso** de usuarios a **fondos públicos activos**: correo al organizador con enlaces Aceptar/Rechazar; al aceptar, el usuario pasa a participante aceptado y recibe correo; al rechazar, no se agrega; mismas restricciones si el fondo no está activo o venció el plazo; token de solicitud invalidado tras uso.

## Backend

### Modelo `Fund` (`server/src/models/Fund.js`)

- Nuevo arreglo **`accessRequests`**: subdocumentos con `user`, `token`, `status` (`pending` | `accepted` | `rejected`), `requestedAt`, `respondedAt`.

### Invitaciones — `POST /api/funds/:id/invitations` (`server/src/routes/participants.js`)

- Si el usuario ya figura como **`pending`** o **`rejected`**, se genera **nuevo** `invitationToken`, se actualiza `invitedAt` y se resetea `respondedAt`; HTTP **200** y nuevo correo.
- Si está **`accepted`**, se responde **409** con `User already participant`.

### Respuesta a invitación — `POST /api/invitations/:token/accept|reject` (`server/src/routes/invitations.js`)

- Solo se procesa si existe participante con ese token y **`status === 'pending'`**.
- Tras responder: `invitationToken` se limpia (`undefined`); cualquier uso posterior del mismo enlace → **404** con mensaje de invitación inválida o expirada.
- Fondo no activo o fecha límite vencida → **422** con mensaje en español (sin cambio de intención respecto al comportamiento previo).

### Solicitud de acceso — `POST /api/funds/:id/access-requests` (`server/src/routes/participants.js`)

- Requiere autenticación.
- Condiciones: fondo **público**, **activo**, **deadline** vigente; solicitante no es organizador ni participante **accepted**; **409** si ya tiene **invitación pendiente** como participante; **409** si ya es participante aceptado.
- Nueva solicitud pendiente del mismo usuario reemplaza la anterior (un solo token pendiente válido a la vez).
- Correo al organizador vía **`sendAccessRequestToOrganizer`** (`server/src/services/emailService.js`), con enlaces a la app: `/solicitudes-acceso/:token?action=accept|reject`.

### Respuesta a solicitud de acceso — `POST /api/fund-access/:token/accept|reject` (`server/src/routes/fundAccess.js`)

- Montado en **`/api/fund-access`** (`server/src/app.js`).
- Sin JWT (mismo patrón que invitaciones por enlace).
- Valida fondo activo y plazo; solo **`pending`**; invalida `token` tras aceptar o rechazar.
- **Aceptar**: agrega participante **accepted** o actualiza uno existente no aceptado; envía **`sendAccessRequestDecisionToUser`**.
- **Rechazar**: no agrega participante; notifica por correo el rechazo.

### Correo (`server/src/services/emailService.js`)

- `sendAccessRequestToOrganizer`
- `sendAccessRequestDecisionToUser`

## Frontend (`client/`)

- **`InviteModal.jsx`**: “Reinvitar” / “Reenviar invitación” para **pending** y **rejected**; respuesta **200** actualiza lista vía `onUpdateParticipants` sin cerrar el modal; **201** sigue usando `onInvited` (cerrar modal).
- **`FundDetailPage.jsx`**: en fondos **públicos**, si el usuario no es miembro y el fondo admite solicitudes (activo y plazo vigente), botón **Solicitar acceso** y mensajes de éxito/error.
- **`FundAccessResponsePage.jsx`**: pantalla para procesar `action=accept|reject` en `/solicitudes-acceso/:token`; cleanup en `useEffect` para evitar condiciones de carrera al desmontar.
- **`App.jsx`**: ruta pública `/solicitudes-acceso/:token`.
- **`api/participants.js`**: `requestFundAccess`, `acceptAccessRequest`, `rejectAccessRequest`.

## Pruebas automatizadas (`server/tests/`)

- **`integration/routes/participants.test.js`**: reinvitar pendiente (200 + token distinto); 409 solo si ya aceptó; doble **accept** / **reject** con mismo token → **404**; `GET participants`: `contributionStatus` **null** sin aportes (alineado con la implementación de la ruta).
- **`integration/routes/fundAccess.test.js`**: creación de solicitud, aceptar/rechazar, token invalidado, fondo privado (403), ya participante (409), fondo cerrado (422), doble respuesta (404).
- **`unit/services/notificationService.test.js`**: en `makeFund`, **+12 h** de margen al `deadline` para evitar fallos intermitentes por `Math.floor` en `daysUntil` cuando el deadline es `now + N × 24 h`.

## Resumen de archivos tocados

| Área | Archivos principales |
|------|----------------------|
| Modelo | `server/src/models/Fund.js` |
| Rutas API | `server/src/routes/participants.js`, `invitations.js`, `fundAccess.js`, `app.js` |
| Email | `server/src/services/emailService.js` |
| UI | `client/src/components/funds/InviteModal.jsx`, `client/src/pages/FundDetailPage.jsx`, `FundAccessResponsePage.jsx`, `App.jsx` |
| API cliente | `client/src/api/participants.js` |
| Tests | `server/tests/integration/routes/participants.test.js`, `fundAccess.test.js`, `server/tests/unit/services/notificationService.test.js` |

## Notas operativas

- Variables habituales: `APP_BASE_URL` (enlaces en correos), SMTP/Mailpit en desarrollo.
- Los enlaces de invitación siguen siendo `GET` en el cliente que dispara `POST` al cargar; el comportamiento de negocio y mensajes de error están acotados a lo pedido por la HU.

## Referencia rápida de endpoints

| Método | Ruta | Auth | Descripción breve |
|--------|------|------|-------------------|
| POST | `/api/funds/:id/invitations` | Sí (organizador) | Invitar / reinvitar (pending o rejected) |
| POST | `/api/invitations/:token/accept` \| `reject` | No | Responder invitación (token de un solo uso) |
| POST | `/api/funds/:id/access-requests` | Sí | Solicitar acceso a fondo público |
| POST | `/api/fund-access/:token/accept` \| `reject` | No | Organizador responde solicitud (token de un solo uso) |
