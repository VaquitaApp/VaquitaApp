# Requerimientos — VaquitaApp

> Documento vivo. Se refina antes de implementar. Cada sección debe estar estable antes de iniciar desarrollo.

---

## 1. Descripción del Problema

En grupos de amigos, cursos, familias, equipos y comunidades es frecuente organizar fondos colectivos: regalos grupales, paseos, cuotas, rifas, convivencias, actividades. El proceso hoy es manual (WhatsApp, transferencias sueltas, planillas), lo que genera desorden, olvidos, falta de visibilidad sobre quién pagó y desconfianza entre participantes. El organizador carga con toda la coordinación sin herramientas adecuadas.

---

## 2. Solución

Plataforma web que permite crear y gestionar fondos colectivos digitales. El organizador crea un fondo, invita participantes y define las reglas. Cada participante ve su estado de aportes y el avance general en tiempo real. Los movimientos quedan registrados y son visibles para todos.

---

## 3. Actores

| Actor | Descripción |
|---|---|
| **Organizador** | Crea y administra el fondo; gestiona participantes y aportes. |
| **Participante** | Se une a un fondo aceptando una invitación, realiza aportes y consulta su estado. |
| **Administrador** | (Opcional E1) Acceso administrativo general al sistema. |

---

## 4. Requerimientos Funcionales

### 4.1 Autenticación y Usuarios

- RF-01: Registro de usuario con nombre, RUT chileno (validado con módulo 11, formato XX.XXX.XXX-X), email, contraseña y tipo (persona natural u organización). El tipo es informativo y no afecta permisos. El sistema envía un email de verificación al completar el registro; el usuario debe verificar su cuenta antes de poder iniciar sesión.
- RF-02: Inicio y cierre de sesión con token de sesión seguro.
- RF-03: Perfil de usuario con visualización de datos personales (nombre, RUT y email en solo lectura), edición de cuenta bancaria preferida (banco, tipo de cuenta, número), e historial de participación en fondos. El usuario puede solicitar la eliminación de su cuenta mediante confirmación por email; la eliminación solo se permite si el usuario no pertenece a ningún fondo como organizador ni como participante aceptado.

### 4.2 Gestión de Fondos

Los fondos tienen tres estados posibles: `activo`, `completado` y `cerrado`.
- `activo`: recaudando aportes normalmente.
- `completado`: monto objetivo alcanzado y pago al destinatario ejecutado.
- `cerrado`: terminado manualmente por el organizador.

- RF-04: Crear fondo con los siguientes datos:
  - Nombre
  - Descripción
  - Objetivo (texto libre)
  - Tipo: cuota fija por participante o monto libre
  - Monto esperado total
  - Monto de aporte por participante (solo fondos con cuota)
  - Frecuencia de aporte: única, semanal o mensual (solo fondos con cuota)
  - Fecha límite
  - Cuenta destinatario
  - Visibilidad: público o privado
- RF-05: Editar datos del fondo (solo el organizador, solo mientras el fondo esté `activo`). Los campos `montoEsperado`, `fechaLimite`, `cuentaDestinatario`, `frecuencia`, `montoAportePorParticipante`, `tipo` y `visibilidad` quedan bloqueados una vez que existe al menos un aporte registrado. La `fechaLimite` debe ser siempre posterior al día actual (mínimo mañana).
- RF-06: Cerrar un fondo manualmente (solo el organizador). El fondo pasa a estado `cerrado`.
- RF-07: Eliminar un fondo (solo el organizador). No se puede eliminar si hay dinero recaudado.
- RF-08: Listar fondos en los que el usuario autenticado participa o administra. Permite filtrar por texto libre y estado, y ordenar por fecha límite.

### 4.3 Participantes

Los participantes de un fondo son exclusivamente usuarios registrados en la plataforma.

- RF-09: Invitar participantes a un fondo. El organizador busca usuarios registrados por nombre o correo y los selecciona desde un listado. El sistema envía un email de invitación con links de Aceptar / Rechazar. La invitación es válida mientras el fondo esté `activo` y no se haya superado la `fechaLimite`.
- RF-10: Aceptar o rechazar invitación a un fondo. No se puede aceptar ni rechazar si el fondo está `completado` o `cerrado`, o si se ha superado la `fechaLimite`.
- RF-11: Ver lista de participantes del fondo con su estado de aportes.
- RF-12: Eliminar participante de un fondo (solo el organizador). No se puede eliminar a un participante con transacciones registradas.

### 4.4 Aportes y Pagos

- RF-13: Registrar un aporte realizado por un participante (monto, fecha, método).
- RF-14: Estado de aporte: pendiente / al día / en mora.
- RF-15: Historial de movimientos del fondo (todos los aportes registrados).
- RF-16: Flujo de pago al destinatario simulado visualmente. La interfaz presenta un formulario de pago y el servidor persiste la transacción. Al completar el pago, el fondo cambia automáticamente a estado `completado`.

### 4.5 Visualización del Estado del Fondo

- RF-17: Panel del fondo con:
  - Monto recaudado vs. monto esperado
  - Fecha de creación y fecha límite
  - Organizador
  - Lista de integrantes con estado de aportes
  - Gráfico de aportes en el tiempo
- RF-18: Indicador de participantes al día vs. pendientes.

### 4.6 Notificaciones

- RF-19: Recordatorio de pago automático y manual:
  - **Fondos con cuota:** el sistema envía recordatorio a los 5, 3 y 1 día(s) antes del vencimiento de la cuota del período actual.
  - **Fondos libres:** el sistema notifica al participante si no ha depositado nada y quedan 5 días o menos para el cierre del fondo.
  - El sistema registra la fecha del último recordatorio por participante-fondo para evitar duplicados en el mismo día.
  - El organizador puede enviar un recordatorio inmediato a todos los participantes con pagos pendientes desde el panel del fondo.
  - Las notificaciones se envían por email y se muestran en la interfaz.

### 4.7 Funcionalidad con IA

- RF-20 (candidato): Alerta predictiva sobre participantes con riesgo de mora basada en historial.
- RF-21 (candidato): Resumen automático del estado del fondo en lenguaje natural.

> **Decisión:** la funcionalidad de IA no es obligatoria en E1. Diferida para entregas posteriores.

---

## 5. Requerimientos No Funcionales

- RNF-01: Diseño responsive (mobile y desktop).
- RNF-02: Persistencia en MongoDB.
- RNF-03: Autenticación con token de sesión seguro (JWT).
- RNF-04: Cobertura de pruebas automatizadas sobre la lógica de negocio principal (Jest).
- RNF-05: Envío de emails en entorno local mediante servidor SMTP local. En producción se utiliza un servicio SMTP compatible sin cambios en la lógica de negocio.

---

## 6. Alcance Entrega 1 — MVP

El CRUD obligatorio se aplica sobre **fondos** como entidad principal.

| Operación | Descripción |
|---|---|
| Listar | Ver todos los fondos del usuario autenticado |
| Buscar | Filtrar por texto libre y estado; ordenar por fecha límite. Sin filtro por rango de fechas. |
| Ver detalle | Panel completo del fondo con estado, participantes y movimientos |
| Agregar | Crear un nuevo fondo con sus datos básicos |
| Editar | Modificar datos del fondo existente (con restricciones por estado y aportes) |
| Eliminar | Dar de baja un fondo (sin dinero recaudado) |

Funcionalidades adicionales incluidas en E1:
- RF-01, RF-02 (autenticación básica)
- RF-09 a RF-12 (gestión de participantes)
- RF-13, RF-15 (registro básico de aportes e historial)
- RF-16 (pago simulado)
- RF-17, RF-18 (visualización del estado del fondo)
- RF-19 (notificaciones)

---

## 7. Aspectos Abiertos y Supuestos

> A medida que se tomen decisiones, mover cada punto a la sección correspondiente.

- [x] Tipo de aporte: dos tipos — cuota fija por participante (fondo con cuota) o monto libre (fondo libre).
- [x] Invitación de participantes: búsqueda de usuario registrado por nombre o correo, email con link Aceptar/Rechazar, válido hasta `fechaLimite` y mientras el fondo esté `activo`.
- [x] Flujo de pago: simulado visualmente, datos persistidos en el sistema.
- [x] Funcionalidad de IA: diferida, no obligatoria en E1.
- [x] Notificaciones: incluidas en E1 — automáticas (cron) y manuales (botón del organizador).
- [x] Estados del fondo: `activo` / `completado` / `cerrado`. El cierre manual lo hace el organizador; `completado` ocurre automáticamente al ejecutar el pago al destinatario.
- [x] Un único organizador por fondo.
- [x] Stack tecnológico: React + Node.js (Express) + MongoDB + Tailwind CSS. Despliegue eventual en AWS, pero E1 es 100% local.
- [x] Herramienta de testing: Jest para E1.

---

## 8. Historial de Decisiones

| Fecha | Decisión | Justificación |
|---|---|---|
| 2026-04-26 | Stack: React + Node.js + MongoDB + Tailwind CSS | Compatibilidad con Jest, ecosistema unificado JS, MongoDB flexible para fondos variables |
| 2026-04-26 | Despliegue E1: solo local | Simplicidad para MVP |
| 2026-04-26 | Modelo de fondo: cuota fija vs. monto libre | Cubre los casos de uso más comunes de vaquitas |
| 2026-04-26 | Eliminación de fondo: no eliminar si hay dinero recaudado | Prevención de pérdida de datos y fraude |
| 2026-04-27 | Estados del fondo: activo / completado / cerrado | Semántica clara: completado = éxito, cerrado = terminación manual |
| 2026-04-27 | Restricciones de edición: solo en estado activo; campos financieros bloqueados con aportes | Prevención de fraude |
| 2026-04-27 | Invitación solo a usuarios registrados mediante búsqueda | Simplifica el modelo de datos; elimina participantes externos |
| 2026-04-27 | Flujo de pago simulado visualmente | Permite demostrar el flujo sin dependencias externas |
| 2026-04-27 | Notificaciones incluidas en E1 con cron automático y botón manual | Cobertura completa del RF-19 desde el MVP |
| 2026-04-27 | Email local: servidor SMTP local para desarrollo | Sin dependencias externas en E1; intercambiable en producción |
| 2026-04-27 | Verificación de email requerida en E1 | Garantiza autenticidad del usuario antes de permitir operar; reemplaza la decisión original de registro sin verificación |
| 2026-04-27 | RUT chileno obligatorio en registro | Identificación única del usuario en el contexto chileno; validado con módulo 11 en cliente y servidor |
| 2026-04-27 | Campos `tipo` y `visibilidad` bloqueados con aportes | Prevención de fraude: no se puede cambiar el tipo ni la visibilidad de un fondo una vez que hay dinero comprometido |
| 2026-04-27 | Eliminación de cuenta con confirmación por email | Proceso de dos pasos para prevenir eliminaciones accidentales; bloqueada si el usuario administra o participa en algún fondo activo |
| 2026-04-27 | `quotaAmount` no puede superar `targetAmount` | Consistencia de datos: una cuota mayor al total del fondo no tiene sentido y confundiría a los participantes |
| 2026-04-27 | Funcionalidad de IA diferida | No es obligatoria en E1 según el enunciado oficial |
| 2026-04-27 | Herramienta de testing: Jest | Compatibilidad con el stack JS; cubre unit e integration tests |
