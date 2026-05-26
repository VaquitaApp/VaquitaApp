/**
 * Tests UNIQUE no cubiertos por archivos TC-mapeados:
 *  - Validación matemática de cuotas vs participantes esperados (POST /funds)
 *  - Validación de frecuencia mínima vs deadline (POST y PATCH /funds)
 *
 * Los tests básicos de CRUD (crear, listar, ver, editar, eliminar, cerrar) se
 * movieron / ya existían en:
 *  - hu06-crear.test.js (POST)
 *  - HU07/hu07-mis-fondos.test.js (GET /)
 *  - HU14/fund-detail.test.js + HU08/hu08-detalle.test.js (GET /:id, messages)
 *  - HU09/hu09-editar.test.js (PATCH)
 *  - HU10/hu10-eliminar.test.js (DELETE, close, pause, resume)
 */
const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../helpers/db');
const { createUser, createFund } = require('../../helpers/factories');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

async function authHeader(user) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: 'password123' });
  return { Authorization: `Bearer ${res.body.token}` };
}

describe('POST /api/funds — cuota mínima sugerida con participantes esperados', () => {
  const { totalPeriods } = require('../../../src/services/quotaService');

  const deadline = new Date(Date.now() + 86400000 * 100).toISOString();
  const expectedParticipants = 4;

  const quotaFundBody = {
    name: 'Fondo Cuotas', type: 'quota', totalQuotas: 12, targetAmount: 120000,
    description: 'Un fondo por cuotas', goal: 'Juntar para el paseo',
    deadline,
    recipientAccount: { bank: 'Banco Estado', accountType: 'vista', accountNumber: '12345678' },
    visibility: 'private',
    frequency: 'monthly',
    expectedParticipants,
  };

  test('400 si quotaAmount es menor que la cuota mínima calculada con participantes', async () => {
    const user = await createUser();
    const periods = totalPeriods('monthly', new Date(), new Date(deadline));
    const minQuota = Math.ceil(120000 / (periods * expectedParticipants));

    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...quotaFundBody, quotaAmount: minQuota - 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cuota m[ií]nima/i);
  });

  test('201 si quotaAmount es exactamente la cuota mínima calculada con participantes', async () => {
    const user = await createUser();
    const periods = totalPeriods('monthly', new Date(), new Date(deadline));
    const minQuota = Math.ceil(120000 / (periods * expectedParticipants));

    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...quotaFundBody, quotaAmount: minQuota });
    expect(res.status).toBe(201);
  });

  test('201 si quotaAmount supera la cuota mínima calculada con participantes', async () => {
    const user = await createUser();
    const periods = totalPeriods('monthly', new Date(), new Date(deadline));
    const minQuota = Math.ceil(120000 / (periods * expectedParticipants));

    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...quotaFundBody, quotaAmount: minQuota + 1000 });
    expect(res.status).toBe(201);
  });

  test('201 sin validación de mínimo si no se proporciona expectedParticipants', async () => {
    const user = await createUser();
    const { expectedParticipants: _ep, ...bodyWithout } = quotaFundBody;
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...bodyWithout, quotaAmount: 1 });
    expect(res.status).toBe(201);
  });
});

describe('POST /api/funds — validación frecuencia vs fecha límite en fondos de cuota', () => {
  const quotaBase = {
    name: 'Fondo Cuotas', type: 'quota', totalQuotas: 12, targetAmount: 50000,
    description: 'Descripcion', goal: 'Objetivo',
    recipientAccount: { bank: 'Banco Estado', accountType: 'vista', accountNumber: '12345678' },
    visibility: 'private',
    quotaAmount: 5000,
  };

  test('400 si frecuencia semanal y plazo es menor a 7 días', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...quotaBase, frequency: 'weekly', deadline: new Date(Date.now() + 86400000 * 5).toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/frecuencia|d[ií]as|semanal/i);
  });

  test('400 si frecuencia quincenal y plazo es menor a 14 días', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...quotaBase, frequency: 'biweekly', deadline: new Date(Date.now() + 86400000 * 10).toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/frecuencia|d[ií]as|quincenal/i);
  });

  test('400 si frecuencia mensual y plazo es menor a 30 días', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...quotaBase, frequency: 'monthly', deadline: new Date(Date.now() + 86400000 * 20).toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/frecuencia|d[ií]as|mensual/i);
  });

  test('201 si frecuencia semanal y plazo es exactamente 7 días', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...quotaBase, frequency: 'weekly', deadline: new Date(Date.now() + 86400000 * 7).toISOString() });
    expect(res.status).toBe(201);
  });
});

describe('PATCH /api/funds/:id — validación frecuencia vs deadline (edge case)', () => {
  test('400 si se intenta reducir la fecha límite por debajo del mínimo de frecuencia en fondo de cuota', async () => {
    const user = await createUser();
    const fund = await createFund({
      organizer: user._id,
      type: 'quota', totalQuotas: 12,
      frequency: 'weekly',
      quotaAmount: 5000,
      deadline: new Date(Date.now() + 86400000 * 30),
    });
    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(user))
      .send({ deadline: new Date(Date.now() + 86400000 * 5).toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/frecuencia|d[ií]as/i);
  });
});
