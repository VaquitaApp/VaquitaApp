const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../helpers/db');
const { createUser } = require('../../helpers/factories');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe('POST /api/auth/register', () => {
  test('201 with token and user on success', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@test.com', password: 'pass1234' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('ana@test.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('409 if email already in use', async () => {
    await createUser({ email: 'ana@test.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Otro', email: 'ana@test.com', password: 'pass1234' });
    expect(res.status).toBe(409);
  });

  test('400 if name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ana@test.com', password: 'pass1234' });
    expect(res.status).toBe(400);
  });

  test('400 if password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@test.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await createUser({ email: 'ana@test.com', passwordHash: 'pass1234' });
  });

  test('200 with token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@test.com', password: 'pass1234' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('ana@test.com');
  });

  test('401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@test.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  test('401 on unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'pass1234' });
    expect(res.status).toBe(401);
  });

  test('400 if body is empty', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  test('200 returns authenticated user', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@test.com', password: 'pass1234' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${regRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ana@test.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer notavalidtoken');
    expect(res.status).toBe(401);
  });
});
