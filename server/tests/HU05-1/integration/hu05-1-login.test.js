/**
 * HU05-1: Inicio de sesión
 * Test Cases mapeados a Criterios de Aceptación
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../../src/app');
const db = require('../../helpers/db');
const { createUser } = require('../../helpers/factories');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe('HU05-1: Inicio de sesión — POST /api/auth/login', () => {

  // ─── TC-HU05-1-01 y TC-HU05-1-06: Login exitoso y redirección ──────────────
  test('TC-HU05-1-01/06: Permite ingreso con credenciales válidas y retorna token', async () => {
    const user = await createUser({ email: 'valido@prueba.cl' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  // ─── TC-HU05-1-02: Correo electrónico vacío ─────────────────────────────────
  test('TC-HU05-1-02: Rechaza si el campo de correo electrónico está vacío', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' }); // Falta el email

    expect(res.status).toBe(400);
  });

  // ─── TC-HU05-1-03: Contraseña vacía (Validación Backend) ────────────────────
  test('TC-HU05-1-03: Rechaza si el campo de contraseña está vacío (Backend validation)', async () => {
    const user = await createUser({ email: 'test3@prueba.cl' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email }); // Falta la contraseña

    expect(res.status).toBe(400);
  });

  // ─── TC-HU05-1-04: Credenciales inválidas (Contraseña incorrecta) ───────────
  test('TC-HU05-1-04: Muestra error ante credenciales inválidas (Contraseña incorrecta)', async () => {
    const user = await createUser({ email: 'test4@prueba.cl' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  // ─── TC-HU05-1-05: Credenciales inválidas (Usuario no registrado) ───────────
  test('TC-HU05-1-05: Muestra error ante credenciales inválidas (Correo no registrado)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@prueba.cl', password: 'password123' });

    expect(res.status).toBe(401);
  });

  // ─── TC-HU05-1-07: Token con expiración de 7 días ───────────────────────────
  test('TC-HU05-1-07: El token generado tiene una expiración de 7 días', async () => {
    const user = await createUser({ email: 'test7@prueba.cl' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password123' });

    expect(res.status).toBe(200);
    const token = res.body.token;

    // Decodificar el token para verificar la expiración
    const decoded = jwt.decode(token);
    expect(decoded).toBeDefined();

    const iat = decoded.iat;
    const exp = decoded.exp;
    const differenceInSeconds = exp - iat;
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;

    expect(differenceInSeconds).toBe(sevenDaysInSeconds);
  });

  // ─── TC-HU05-1-08: Contraseña menor a 6 caracteres (Validación Backend) ─────
  test('TC-HU05-1-08: Rechaza si la contraseña tiene menos de 6 caracteres devolviendo 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test8@prueba.cl', password: '12345' });

    expect(res.status).toBe(401);
  });
});
