# E2E Tests — VaquitaApp (Puppeteer)

Pruebas End-to-End para VaquitaApp · Entrega 3 INF331 UTFSM.

## Casos de prueba (16 tests)

| ID | Suite | Qué valida |
|---|---|---|
| TC-E2E-AUTH-01 | Auth | Login válido → /fondos |
| TC-E2E-AUTH-02 | Auth | Contraseña incorrecta → mensaje error |
| TC-E2E-AUTH-03 | Auth | Submit deshabilitado con < 6 chars |
| TC-E2E-AUTH-04 | Auth | Logout → /login |
| TC-E2E-AUTH-05 | Auth | Ruta protegida sin sesión → /login |
| TC-E2E-FUND-01 | Fondos | Crear fondo libre → detalle |
| TC-E2E-FUND-02 | Fondos | Nombre campo required |
| TC-E2E-FUND-03 | Fondos | Fondo en listado |
| TC-E2E-FUND-04 | Fondos | Detalle muestra nombre |
| TC-E2E-FUND-05 | Fondos | Editar nombre |
| TC-E2E-FUND-06 | Fondos | Filtrar por texto |
| TC-E2E-FUND-07 | Fondos | Eliminar fondo (via ConfirmModal) |
| TC-E2E-NAV-01 | Nav | Links del navbar |
| TC-E2E-NAV-02 | Nav | /directorio accesible |
| TC-E2E-NAV-03 | Nav | Directorio sin error |
| TC-E2E-NAV-04 | Nav | /perfil accesible |

## Ejecución local

```bash
# Prerequisitos: MongoDB corriendo, backend en :3001, frontend en :5173
cd e2e
npm install
node seed.js   # crea usuario e2e@vaquitaapp.test
npm test
```

## Variables de entorno

| Variable | Default |
|---|---|
| `BASE_URL` | `http://localhost:5173` |
| `MONGO_URI` | `mongodb://localhost:27017/vaquitaapp` |
| `E2E_EMAIL` | `e2e@vaquitaapp.test` |
| `E2E_PASSWORD` | `E2ePassword1!` |
