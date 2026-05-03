# Pruebas HU12 — Registrar aporte (crear registro)

**Historia:** Como participante u organizador, quiero registrar un aporte monetario al fondo para que el monto se sume al total recaudado.

**Suite automatizada:** `server/tests/integration/HU12/hu12-registrar-aporte.test.js`  
**Comando sugerido (desde `server/`):**

```bash
npm test -- --testPathPattern=HU12/hu12-registrar-aporte
```

**Cobertura relacionada:** También existen casos adicionales en `server/tests/integration/routes/contributions.test.js` (permisos, cuotas atrasadas, fondo quincenal, etc.).

---

## Trazabilidad criterios de aceptación → casos

| Criterio (resumen) | Casos de prueba |
|--------------------|-----------------|
| Monto válido y rechazo de montos inválidos | HU12-INT-05, HU12-INT-06 |
| Registro exitoso con detalle (quién, cuánto, cuándo; fondo en API) | HU12-INT-01, HU12-INT-07 |
| Total recaudado del fondo actualizado | HU12-INT-02 |
| Participante al día tras cubrir cuota (API participantes) | HU12-INT-03, HU12-INT-08 |
| No registrar aporte si el fondo no acepta aportes | HU12-INT-04 |

*Formulario y barra de progreso en cliente no están cubiertos por esta suite; conviene prueba manual o E2E.*

---

## Registro de ejecución (plantilla + última corrida documentada)

*Actualiza **Resultado obtenido**, **Éxito/Fallo** y **Fecha y hora** cada vez que ejecutes la suite en tu entorno.*

### Última ejecución registrada en documentación

| Campo | Valor |
|-------|--------|
| Fecha y hora | 2026-05-03 17:39:07 -04:00 |
| Entorno | Windows, Node (Jest `--runInBand`) |
| Resultado global | 8/8 pruebas en verde |

---

## Matriz de casos (HU12-INT)

| ID caso | Entrada | Resultado esperado | Resultado obtenido | Éxito / Fallo | Fecha y hora prueba | Comentarios adicionales |
|---------|---------|-------------------|-------------------|---------------|---------------------|-------------------------|
| HU12-INT-01 | `POST /api/funds/:id/contributions` con participante aceptado, `amount: 15000`, `method: transfer` | HTTP 201; cuerpo con `amount`, `user`, `fund`, `status: succeeded` y `date` o `createdAt` | HTTP 201; campos presentes y `user`/`fund` coinciden con IDs esperados | Éxito | 2026-05-03 17:39:07 -04:00 | Verifica registro mínimo auditable (quién/cuánto/cuándo; fondo por id). |
| HU12-INT-02 | Tras un `POST` aporte `8000`, `GET /api/funds/:id` con mismo usuario | `collectedAmount === 8000` | Coincide con expectativa | Éxito | 2026-05-03 17:39:07 -04:00 | Alineado con barra de progreso si el cliente usa el mismo campo. |
| HU12-INT-03 | Fondo `quota` mensual, cuota 12000; participante paga exacto 12000; `GET .../participants` | Fila del participante con `contributionStatus: onTime` | `onTime` en la respuesta | Éxito | 2026-05-03 17:39:07 -04:00 | Estado calculado en servidor al listar participantes. |
| HU12-INT-04 | Fondo en estado `paused`; `POST` aporte válido | HTTP 403 | HTTP 403 | Éxito | 2026-05-03 17:39:07 -04:00 | Mensaje de error según API (`Fund is not active`). |
| HU12-INT-05 | `POST` con `amount: 0` y `POST` sin `amount` | HTTP 400 en ambos | HTTP 400 en ambos | Éxito | 2026-05-03 17:39:07 -04:00 | Validación de monto > 0 en API. |
| HU12-INT-06 | Fondo libre con `minAmount: 5000`; `POST` con `4999` | HTTP 400 y cuerpo con `minAmount` | Coincide | Éxito | 2026-05-03 17:39:07 -04:00 | Complementa validación de montos en fondos libres. |
| HU12-INT-07 | Tras aporte 3333, `GET .../contributions` como organizador | Lista con ítem que incluye `user.name`, `amount`, `date` | Poblado y montos correctos | Éxito | 2026-05-03 17:39:07 -04:00 | Cubre “registro detallado” en listado histórico. |
| HU12-INT-08 | Fondo cuota única (`once`); dos `POST` consecutivos con el mismo monto de cuota | Primer 201; segundo 400 con mensaje al día / sin cuotas pendientes | Comportamiento esperado | Éxito | 2026-05-03 17:39:07 -04:00 | Evita doble registro cuando no hay cuotas pendientes. |

---

## Plantilla en blanco (copiar fila al repetir corridas)

| ID caso | Entrada | Resultado esperado | Resultado obtenido | Éxito / Fallo | Fecha y hora prueba | Comentarios adicionales |
|---------|---------|-------------------|-------------------|---------------|---------------------|-------------------------|
| _(pegar)_ | | | | | | |

---

## Notas

1. Los IDs **HU12-INT-xx** coinciden con los nombres de los tests en Jest (`it('HU12-INT-01: ...')`) para trazabilidad entre código y documento.
2. Si un caso falla, pegar en **Comentarios** el mensaje de Jest o el cuerpo de respuesta HTTP relevante.
3. Para regresión completa de aportes: `npm test -- --testPathPattern=contributions.test.js`.
