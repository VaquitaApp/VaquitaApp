/**
 * HU06: Crear Fondo Colectivo (Create)
 * Test Cases mapeados a Criterios de Aceptación
 */
const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../helpers/db');
const { createUser } = require('../../helpers/factories');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

async function authHeader(user) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: 'password123' });
  return { Authorization: `Bearer ${res.body.token}` };
}

const validFundBody = {
  name: 'Fondo Paseo',
  type: 'free',
  targetAmount: 200000,
  description: 'Un fondo para el paseo de curso',
  goal: 'Pagar el bus',
  deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
  recipientAccount: { bank: 'Banco Estado', accountType: 'vista', accountNumber: '12345678' },
  visibility: 'private',
};

describe('HU06: Crear Fondo Colectivo — POST /api/funds', () => {

  // ─── TC-HU06-01: Campos obligatorios incompletos ──────────────────
  test('TC-HU06-01: Rechaza si faltan campos obligatorios', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ name: 'Solo nombre' });
    expect(res.status).toBe(400);
  });

  // ─── TC-HU06-02: Monto esperado cero o negativo ──────────────────
  test('TC-HU06-02: Rechaza monto esperado = 0', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...validFundBody, targetAmount: 0 });
    expect(res.status).toBe(400);
  });

  test('TC-HU06-02b: Rechaza monto esperado negativo', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...validFundBody, targetAmount: -5000 });
    expect(res.status).toBe(400);
  });

  // ─── TC-HU06-03: Fecha de cierre en el pasado ────────────────────
  test('TC-HU06-03: Rechaza fecha de cierre en el pasado', async () => {
    const user = await createUser();
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...validFundBody, deadline: pastDate });
    expect(res.status).toBe(400);
  });

  // ─── TC-HU06-04: Fecha de cierre mayor a 1 año ───────────────────
  test('TC-HU06-04: Rechaza fecha de cierre mayor a 1 año', async () => {
    const user = await createUser();
    const farDate = new Date(Date.now() + 86400000 * 400).toISOString();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...validFundBody, deadline: farDate });
    expect(res.status).toBe(400);
  });

  // ─── TC-HU06-05: Crear fondo "free" exitosamente ─────────────────
  test('TC-HU06-05: Crea fondo "free" con datos válidos y registra organizador', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...validFundBody, minAmount: 5000, coverImage: 'https://img.com/pic.jpg' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Fondo Paseo');
    expect(res.body.organizer.toString()).toBe(user._id.toString());
    expect(res.body.minAmount).toBe(5000);
    expect(res.body.coverImage).toBe('https://img.com/pic.jpg');
  });

  // ─── TC-HU06-06: Crear fondo "quota" con cuota y frecuencia ──────
  test('TC-HU06-06: Crea fondo "quota" con frecuencia y monto de cuota', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...validFundBody, type: 'quota', totalQuotas: 12, quotaAmount: 10000, frequency: 'monthly' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('quota');
    expect(res.body.quotaAmount).toBe(10000);
    expect(res.body.frequency).toBe('monthly');
  });

  // ─── TC-HU06-07: Fondo "quota" sin monto de cuota ────────────────
  test('TC-HU06-07: Rechaza fondo "quota" sin monto de cuota', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...validFundBody, type: 'quota', totalQuotas: 12, frequency: 'monthly' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required for quota fund/i);
  });

  // ─── TC-HU06-08: Cuenta bancaria moderna (Tenpo, Mach, etc.) ─────
  test('TC-HU06-08: Permite cuenta bancaria moderna (Tenpo)', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({
        ...validFundBody,
        recipientAccount: { bank: 'Tenpo', accountType: 'vista', accountNumber: '9876543' },
      });
    expect(res.status).toBe(201);
    expect(res.body.recipientAccount.bank).toBe('Tenpo');
  });

  // ─── Extra: minAmount > targetAmount ──────────────────────────────
  test('Rechaza minAmount mayor al targetAmount', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...validFundBody, targetAmount: 1000, minAmount: 2000 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mayor al total/i);
  });

  // ─── Extra: Sin token de autenticación ────────────────────────────
  test('401 sin token de autenticación', async () => {
    const res = await request(app).post('/api/funds').send(validFundBody);
    expect(res.status).toBe(401);
  });
});
