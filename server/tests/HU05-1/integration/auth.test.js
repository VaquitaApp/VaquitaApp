const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../../src/app');
const db = require('../../helpers/db');
const { createUser } = require('../../helpers/factories');
const User = require('../../../src/models/User');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe('POST /api/auth/register', () => {
  test('201 with message — no token returned', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@prueba.cl', password: 'clave1234', rut: '11.111.111-1' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBeDefined();
    expect(res.body.token).toBeUndefined();
  });

  test('user is saved with isEmailVerified false and a token', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@prueba.cl', password: 'clave1234', rut: '11.111.111-1' });
    const user = await User.findOne({ email: 'ana@prueba.cl' });
    expect(user.isEmailVerified).toBe(false);
    expect(user.emailVerificationToken).toBeTruthy();
  });

  // "409 if email already in use" cubierto por HU05-2 TC-HU05-2-03.

  test('400 if name is missing (resto de campos válidos)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ana@prueba.cl', password: 'clave1234', rut: '11.111.111-1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name.*required|name/i);
  });

  test('400 if password is missing (resto de campos válidos)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@prueba.cl', rut: '11.111.111-1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password.*required|password/i);
  });

  test('400 if rut is missing (resto de campos válidos)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@prueba.cl', password: 'clave1234' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/rut.*required|rut|RUT/i);
  });
});

describe('GET /api/auth/verify-email/:token', () => {
  test('200 and sets isEmailVerified on valid token', async () => {
    const user = await createUser({ email: 'ana@prueba.cl', isEmailVerified: false, emailVerificationToken: 'tok-123' });
    const res = await request(app).get('/api/auth/verify-email/tok-123');
    expect(res.status).toBe(200);
    const updated = await User.findById(user._id);
    expect(updated.isEmailVerified).toBe(true);
    expect(updated.emailVerificationToken).toBeUndefined();
  });

  test('404 on unknown token', async () => {
    const res = await request(app).get('/api/auth/verify-email/token-inexistente');
    expect(res.status).toBe(404);
  });
});

// POST /api/auth/login — cubierto íntegramente por HU05-1/hu05-1-login.test.js
// (TC-HU05-1-01 a TC-HU05-1-08) y por HU05-2 TC-08 (403 email no verificado).
// Conservamos solo "200 after verifying email" porque cubre el flujo register →
// verify → login end-to-end, no aislado a un solo endpoint como los demás.
describe('POST /api/auth/login — flujo end-to-end verificación + login', () => {
  test('200 after verifying email via token', async () => {
    await createUser({
      email: 'pendiente@prueba.cl',
      passwordHash: 'clave1234',
      isEmailVerified: false,
      emailVerificationToken: 'tok-abc',
    });
    await request(app).get('/api/auth/verify-email/tok-abc');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pendiente@prueba.cl', password: 'clave1234' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});

describe('GET /api/auth/me', () => {
  test('200 returns authenticated user', async () => {
    await createUser({ email: 'ana@prueba.cl', passwordHash: 'clave1234' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@prueba.cl', password: 'clave1234' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ana@prueba.cl');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer tokeninvalido');
    expect(res.status).toBe(401);
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// Contrato: middleware auth bloquea a usuarios no verificados.
//
// POST /api/auth/login ya rechaza a no-verificados con 403. El middleware `auth`
// también lo hace, cerrando el bypass anterior donde un JWT obtenido por una
// vía no-login (tests, scripts, o cambio post-emisión del flag) permitía operar.
// GET /api/auth/me es la excepción explícita: usa authNoVerifyCheck para que el
// frontend pueda mostrar el banner de verificación.
// ───────────────────────────────────────────────────────────────────────────────
describe('Middleware auth: bloqueo de usuarios no verificados (post-fix)', () => {
  test('JWT directo de un usuario no verificado en POST /api/funds responde 403', async () => {
    const user = await createUser({ email: 'noverif-bypass@prueba.cl', isEmailVerified: false });
    const token = jwt.sign(
      { sub: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .post('/api/funds')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Fondo de no verificado',
        description: 'Una descripción del fondo',
        goal: 'Un objetivo claro',
        type: 'free',
        targetAmount: 100000,
        deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
        recipientAccount: { bank: 'Banco Estado', accountType: 'vista', accountNumber: '12345678' },
        visibility: 'private',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/verifica|verificado/i);
  });

  test('JWT de un usuario no verificado SÍ puede consultar GET /api/auth/me (excepción explícita)', async () => {
    const user = await createUser({ email: 'noverif-me@prueba.cl', isEmailVerified: false });
    const token = jwt.sign(
      { sub: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('noverif-me@prueba.cl');
    expect(res.body.user.isEmailVerified).toBe(false);
  });
});
