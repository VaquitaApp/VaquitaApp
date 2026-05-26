# Propuesta de Nuevos Requisitos Funcionales (Entrega 2)

Este documento detalla dos propuestas de nuevos requerimientos funcionales para ser desarrollados durante la **Entrega 2**. Ambos están pensados para agregar gran valor al producto (VaquitaApp), están enfocados en la flexibilidad financiera y de gestión, y son robustos para justificar su inclusión en el flujo de **CI/CD** mediante sus respectivas pruebas unitarias y de integración.

---

## 1. Requisito 1: Gestión Avanzada y Pago Anticipado de Cuotas (Adelanto de Mensualidades)

### 📖 Descripción General
Actualmente, los fondos pueden ser de tipo `quota` (cuotas fijas recurrentes), pero la interacción se limita a pagar una cuota por vez. La idea sugerida por el profesor es permitir que en fondos orientados a pagos periódicos (ej. cuotas de curso escolar, gastos comunes), el usuario tenga la flexibilidad de "adelantar" meses o, si lo desea, pagar **todas las cuotas restantes de una sola vez**. Esto reduce la fricción para quienes prefieren saldar su deuda anual de inmediato.

### 🧑‍💻 Historia de Usuario (HU19)
> **Como** participante de un fondo basado en cuotas (mensuales/semanales),  
> **quiero** tener la opción de seleccionar y pagar múltiples cuotas por adelantado, incluyendo la opción de "pagar el año completo" o "pagar el saldo restante" en una sola transacción,  
> **para** ahorrar tiempo, despreocuparme de los pagos futuros y gestionar mis finanzas de forma flexible.

### ✅ Criterios de Aceptación
1. **Reconocimiento de Deuda/Compromiso**: En un fondo tipo `quota`, se debe establecer un número total de cuotas o un plazo final para calcular cuántas cuotas corresponden por participante.
2. **Visualización del Estado**: Al entrar a pagar, el usuario debe ver claramente: "Has pagado X de Y cuotas" y el "Saldo Restante".
3. **Selector de Cuotas**: El formulario de pago (ContributionForm) debe incluir una opción para elegir la cantidad de cuotas a pagar (ej. Dropdown: 1 cuota, 2 cuotas, 3 cuotas... o botón "Pagar Saldo Completo").
4. **Cálculo Automático**: El monto a cobrar en la pasarela de pago debe calcularse automáticamente multiplicando el valor de la cuota por la cantidad seleccionada.
5. **Registro del Aporte**: En el historial de transacciones (y en la base de datos), el aporte debe reflejar explícitamente cuántas cuotas cubrió (ej. "Pago de 3 cuotas").

### 🛠️ Tareas Técnicas
- **Backend (API y Modelos)**:
  - Modificar el modelo `Fund` (si es necesario) para asegurar que se defina explícitamente el `totalQuotas` o calcularlo en base al `deadline` y la `frequency`.
  - Modificar el modelo `Contribution` para agregar un campo `quotasPaid` (Number, default 1) que registre cuántas cuotas cubre esa transacción.
  - Ajustar el endpoint de creación de aporte (`POST /api/funds/:id/contributions`) para aceptar y validar el parámetro `quotasPaid` (que no supere las cuotas restantes del usuario).
  - Endpoint o función que calcule las "cuotas pendientes" de un usuario específico (`GET /api/funds/:id/participants/:userId/status`).
- **Frontend (UI)**:
  - Modificar `ContributionForm.jsx` para integrar el selector de cuotas y recalcular dinámicamente el `amount` a pagar.
  - Actualizar `FundDetailPage.jsx` y/o la tarjeta del participante para mostrar el progreso individual (ej. "Juan ha pagado 5/10 cuotas").
- **Pruebas (CI/CD)**:
  - Pruebas unitarias de la función de cálculo de cuotas restantes y validación del monto a pagar.
  - Pruebas de integración simulando pagos simples (1 cuota) y pagos múltiples/totales.
  - Asegurar que la suma total recaudada por el fondo se actualice correctamente tras un pago múltiple.

---

## 2. Requisito 2: Metas Parciales (Hitos o Milestones) de Recaudación

### 📖 Descripción General
Frecuentemente, reunir el 100% de una meta toma tiempo. Para mantener la motivación alta y generar confianza, los creadores podrán establecer "Metas Parciales" o "Hitos" (ejemplo: Meta total $100.000; Hito 1: "A los $25.000 se compra el primer insumo"). Esto permite a los aportantes ver progreso constante y da claridad sobre cómo se ejecutarán los gastos en etapas.

### 🧑‍💻 Historia de Usuario (HU20)
> **Como** creador de un fondo,  
> **quiero** poder definir múltiples hitos o metas parciales de recaudación dentro de mi fondo,  
> **para** motivar a los aportantes mostrando logros intermedios y transparentar en qué etapas o sub-proyectos se utilizará el dinero recaudado a medida que avanza.

### ✅ Criterios de Aceptación
1. **Creación/Edición**: Durante la creación o edición del fondo, el creador puede agregar una lista dinámica de Hitos (cada uno con un `Monto Objetivo` y una `Descripción`).
2. **Validación de Montos**: La suma o el monto mayor de los hitos no puede superar la `targetAmount` total del fondo. Cada hito debe tener un monto menor al total y mayor a 0.
3. **Visualización Gráfica**: La barra de progreso general (`ProgressBar.jsx`) debe incluir pequeños indicadores visuales (marcadores/pines) en los porcentajes correspondientes a cada hito.
4. **Estado de los Hitos**: En el detalle del fondo se debe mostrar una lista o línea de tiempo (Timeline) de los hitos, indicando claramente cuáles han sido **"Alcanzados"** (cuando lo recaudado supera el monto del hito) y cuáles están **"Pendientes"**.
5. **Automatización de Estado**: El estado "Alcanzado" se debe calcular automáticamente en base al total recaudado, sin intervención manual del creador.

### 🛠️ Tareas Técnicas
- **Backend (API)**:
  - Modificar el modelo `Fund.js` para añadir el campo `milestones` (Array de objetos con `{ amount: Number, description: String }`).
  - Ajustar lógica de creación/edición de fondos (`funds.js`) para validar estructuralmente los hitos recibidos (ordenados, montos válidos).
  - (Opcional) Generar un evento si al registrar un aporte (`contributions.js`) se cruza la barrera de un hito.
- **Frontend (UI)**:
  - Modificar `FundForm.jsx` para permitir añadir/eliminar campos de Hitos de forma dinámica (botones de "+" y "-").
  - Mejorar el componente `ProgressBar.jsx` (o crear uno nuevo `MilestoneProgressBar.jsx`) para renderizar los pines superpuestos en la barra.
  - Agregar un componente `MilestonesTimeline.jsx` al detalle del fondo para listar gráficamente el estado de cada meta parcial.
- **Pruebas (CI/CD)**:
  - Pruebas unitarias para validar que los hitos no superen la meta total (en el modelo/validaciones).
  - Pruebas de integración comprobando el guardado y actualización de los fondos con el array de hitos.
  - Pruebas E2E / UI (si aplican) validando el comportamiento dinámico del formulario de creación.
