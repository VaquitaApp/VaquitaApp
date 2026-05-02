const request = require('supertest');
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

  test('409 if email already in use', async () => {
    await createUser({ email: 'ana@prueba.cl' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Otro', email: 'ana@prueba.cl', password: 'clave1234', rut: '11.111.111-1' });
    expect(res.status).toBe(409);
  });

  test('400 if name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ana@prueba.cl', password: 'clave1234' });
    expect(res.status).toBe(400);
  });

  test('400 if password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@prueba.cl' });
    expect(res.status).toBe(400);
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

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await createUser({ email: 'ana@prueba.cl', passwordHash: 'clave1234' });
  });

  test('200 with token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@prueba.cl', password: 'clave1234' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('ana@prueba.cl');
  });

  test('403 when email is not verified', async () => {
    await createUser({ email: 'noverificado@prueba.cl', passwordHash: 'clave1234', isEmailVerified: false });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noverificado@prueba.cl', password: 'clave1234' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/verificado/i);
  });

  test('200 after verifying email', async () => {
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

  test('401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@prueba.cl', password: 'claveincorrecta' });
    expect(res.status).toBe(401);
  });

  test('401 on unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@prueba.cl', password: 'clave1234' });
    expect(res.status).toBe(401);
  });

  test('400 if body is empty', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
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
