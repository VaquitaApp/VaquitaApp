# E2E Tests — VaquitaApp (Puppeteer)

Pruebas End-to-End para VaquitaApp · Entrega 3 INF331 UTFSM.

Cada test simula un **flujo de usuario real** en el navegador (headless):
formularios, clicks, navegación y verificación de lo que el usuario ve.

## Casos de prueba (12 tests)

| ID | Suite | Qué valida |
|---|---|---|
| TC-E2E-AUTH-01 | Auth | Login válido → /fondos |
| TC-E2E-AUTH-02 | Auth | Contraseña incorrecta → mensaje de error visible |
| TC-E2E-AUTH-03 | Auth | Logout → /login |
| TC-E2E-AUTH-04 | Auth | Ruta protegida sin sesión → /login |
| TC-E2E-FUND-01 | Fondos | Crear fondo libre → detalle (CRUD: crear) |
| TC-E2E-FUND-02 | Fondos | Fondo aparece en "Mis Fondos" (CRUD: listar) |
| TC-E2E-FUND-03 | Fondos | Detalle muestra el nombre correcto (CRUD: ver detalle) |
| TC-E2E-FUND-04 | Fondos | Editar nombre y verificar cambio (CRUD: editar) |
| TC-E2E-FUND-05 | Fondos | Filtro por nombre incluye el buscado y excluye el resto |
| TC-E2E-FUND-06 | Fondos | Eliminar fondo vía ConfirmModal (CRUD: eliminar) |
| TC-E2E-NAV-01 | Nav | Directorio público carga sin error (cards o estado vacío) |
| TC-E2E-NAV-02 | Nav | Perfil muestra los datos del usuario logueado |

## Ejecución local

### Recomendado — un comando

Desde la raíz del repo:

```bash
make e2e
```

Levanta el stack (MongoDB + backend + frontend), seedea el usuario E2E, corre
los 12 tests y al terminar detiene lo que haya levantado. Reutiliza servicios que
ya estén corriendo (`make dev` o `make docker`), así que también sirve para
re-correr rápido teniendo el stack arriba.

> **Requiere Node 20** (igual que el CI; Puppeteer 22 no corre en Node >= 23). El
> repo trae `.nvmrc`, así que con nvm/fnm basta `nvm use`. Si tu shell tiene una
> versión más nueva, el script usa automáticamente `node@20` de Homebrew si está
> instalado (`brew install node@20`).

### Pasos manuales (con el stack ya arriba)

```bash
cd e2e
npm install
node seed.js   # crea usuario e2e@vaquitaapp.test (verificado)
npm test
```

## Evidencias (carpeta `reports/`)

- **Reporte HTML**: cada ejecución genera `reports/e2e-report.html`
  (vía `jest-html-reporters`), con el resultado de todos los tests.
- **Screenshots en fallo**: cuando un test falla, `jest.environment.js`
  captura automáticamente la pantalla de cada página abierta y la guarda
  como `reports/FAIL-<test>-<timestamp>.png`.
- En CI, la carpeta `reports/` se sube como artifact (`e2e-reports`) del
  job `e2e` en GitHub Actions.

## Variables de entorno

| Variable | Default |
|---|---|
| `BASE_URL` | `http://localhost:5173` |
| `MONGO_URI` | `mongodb://localhost:27017/vaquitaapp` |
| `E2E_EMAIL` | `e2e@vaquitaapp.test` |
| `E2E_PASSWORD` | `E2ePassword1!` |
