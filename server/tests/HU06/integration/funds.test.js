const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../helpers/db');
const { createUser, createFund, createContribution } = require('../../helpers/factories');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

async function authHeader(user) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: 'password123' });
  return { Authorization: `Bearer ${res.body.token}` };
}

const fundBody = {
  name: 'Fondo Paseo', type: 'free', targetAmount: 200000,
  description: 'Un fondo para el paseo de curso', goal: 'Pagar el bus',
  deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
  recipientAccount: { bank: 'Banco Estado', accountType: 'vista', accountNumber: '12345678' },
  visibility: 'private',
};

describe('POST /api/funds', () => {
  test('201 creates fund', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send(fundBody);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Fondo Paseo');
    expect(res.body.organizer.toString()).toBe(user._id.toString());
  });

  test('400 missing required field', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ name: 'Solo nombre' });
    expect(res.status).toBe(400);
  });

  test('401 without token', async () => {
    const res = await request(app).post('/api/funds').send(fundBody);
    expect(res.status).toBe(401);
  });

  test('400 targetAmount is zero or negative', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...fundBody, targetAmount: 0 });
    expect(res.status).toBe(400);
  });

  test('400 deadline is in the past', async () => {
    const user = await createUser();
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...fundBody, deadline: pastDate });
    expect(res.status).toBe(400);
  });

  test('400 minAmount is greater than targetAmount', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...fundBody, targetAmount: 1000, minAmount: 2000 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mayor al total/i);
  });
});

describe('POST /api/funds — cuota minima sugerida con participantes esperados', () => {
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

  test('400 si quotaAmount es menor que la cuota minima calculada con participantes', async () => {
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

  test('201 si quotaAmount es exactamente la cuota minima calculada con participantes', async () => {
    const user = await createUser();
    const periods = totalPeriods('monthly', new Date(), new Date(deadline));
    const minQuota = Math.ceil(120000 / (periods * expectedParticipants));

    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...quotaFundBody, quotaAmount: minQuota });
    expect(res.status).toBe(201);
  });

  test('201 si quotaAmount supera la cuota minima calculada con participantes', async () => {
    const user = await createUser();
    const periods = totalPeriods('monthly', new Date(), new Date(deadline));
    const minQuota = Math.ceil(120000 / (periods * expectedParticipants));

    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...quotaFundBody, quotaAmount: minQuota + 1000 });
    expect(res.status).toBe(201);
  });

  test('201 sin validacion de minimo si no se proporciona expectedParticipants', async () => {
    const user = await createUser();
    const { expectedParticipants: _ep, ...bodyWithout } = quotaFundBody;
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...bodyWithout, quotaAmount: 1 });
    expect(res.status).toBe(201);
  });
});

describe('POST /api/funds — validacion frecuencia vs fecha limite en fondos de cuota', () => {
  const quotaBase = {
    name: 'Fondo Cuotas', type: 'quota', totalQuotas: 12, targetAmount: 50000,
    description: 'Descripcion', goal: 'Objetivo',
    recipientAccount: { bank: 'Banco Estado', accountType: 'vista', accountNumber: '12345678' },
    visibility: 'private',
    quotaAmount: 5000,
  };

  test('400 si frecuencia semanal y plazo es menor a 7 dias', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...quotaBase, frequency: 'weekly', deadline: new Date(Date.now() + 86400000 * 5).toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/frecuencia|d[ií]as|semanal/i);
  });

  test('400 si frecuencia quincenal y plazo es menor a 14 dias', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...quotaBase, frequency: 'biweekly', deadline: new Date(Date.now() + 86400000 * 10).toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/frecuencia|d[ií]as|quincenal/i);
  });

  test('400 si frecuencia mensual y plazo es menor a 30 dias', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...quotaBase, frequency: 'monthly', deadline: new Date(Date.now() + 86400000 * 20).toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/frecuencia|d[ií]as|mensual/i);
  });

  test('201 si frecuencia semanal y plazo es exactamente 7 dias', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/funds')
      .set(await authHeader(user))
      .send({ ...quotaBase, frequency: 'weekly', deadline: new Date(Date.now() + 86400000 * 7).toISOString() });
    expect(res.status).toBe(201);
  });
});

describe('GET /api/funds', () => {
  test('returns only own funds', async () => {
    const u1 = await createUser({ email: 'usuario1@prueba.cl' });
    const u2 = await createUser({ email: 'usuario2@prueba.cl' });
    await createFund({ organizer: u1._id });
    await createFund({ organizer: u2._id });

    const res = await request(app)
      .get('/api/funds')
      .set(await authHeader(u1));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('filters by status', async () => {
    const user = await createUser();
    await createFund({ organizer: user._id, status: 'active' });
    await createFund({ organizer: user._id, status: 'closed' });

    const res = await request(app)
      .get('/api/funds?status=closed')
      .set(await authHeader(user));
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('closed');
  });

  test('filters by text query', async () => {
    const user = await createUser();
    await createFund({ organizer: user._id, name: 'Fondo Paseo' });
    await createFund({ organizer: user._id, name: 'Fondo Regalo' });

    const res = await request(app)
      .get('/api/funds?q=paseo')
      .set(await authHeader(user));
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Fondo Paseo');
  });
});

// GET /api/funds/public — suite dedicada HU13: tests/integration/HU13/hu13-directorio-publico.test.js

describe('GET /api/funds/:id', () => {
  test('200 for organizer', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.collectedAmount).toBe(0);
  });

  test('403 for unrelated user on private fund', async () => {
    const u1 = await createUser({ email: 'usuario1@prueba.cl' });
    const u2 = await createUser({ email: 'usuario2@prueba.cl' });
    const fund = await createFund({ organizer: u1._id, visibility: 'private' });
    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(u2));
    expect(res.status).toBe(403);
  });

  test('200 for unrelated user on public fund', async () => {
    const u1 = await createUser({ email: 'usuario1@prueba.cl' });
    const u2 = await createUser({ email: 'usuario2@prueba.cl' });
    const fund = await createFund({ organizer: u1._id, visibility: 'public' });
    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(u2));
    expect(res.status).toBe(200);
  });
  test('200 populates messages with user names', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id, messages: [{ user: user._id, text: 'Hola a todos' }] });
    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.messages[0].user.name).toBe(user.name);
  });
});

describe('POST /api/funds/:id/messages', () => {
  test('201 creates message for accepted participant', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const part = await createUser({ email: 'participante@prueba.cl' });
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }]
    });

    const res = await request(app)
      .post(`/api/funds/${fund._id}/messages`)
      .set(await authHeader(part))
      .send({ text: 'Ya realicé la transferencia' });
    expect(res.status).toBe(201);
    expect(res.body[0].text).toBe('Ya realicé la transferencia');
  });

  test('403 rejects message if not member', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const desconocido = await createUser({ email: 'desconocido@prueba.cl' });
    const fund = await createFund({ organizer: org._id });

    const res = await request(app)
      .post(`/api/funds/${fund._id}/messages`)
      .set(await authHeader(desconocido))
      .send({ text: 'Mensaje no autorizado' });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/funds/:id', () => {
  test('200 updates allowed fields', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(user))
      .send({ name: 'Nuevo nombre' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nuevo nombre');
  });

  test('403 if not organizer', async () => {
    const u1 = await createUser({ email: 'usuario1@prueba.cl' });
    const u2 = await createUser({ email: 'usuario2@prueba.cl' });
    const fund = await createFund({ organizer: u1._id });
    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(u2))
      .send({ name: 'Modificación no autorizada' });
    expect(res.status).toBe(403);
  });

  test('422 if fund is closed', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id, status: 'closed' });
    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(user))
      .send({ name: 'Modificación en fondo cerrado' });
    expect(res.status).toBe(422);
  });

  test('422 if fund is completed', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id, status: 'completed' });
    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(user))
      .send({ name: 'Modificación en fondo completado' });
    expect(res.status).toBe(422);
  });

  test('422 rejects modifying locked fields if has contributions', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    await createContribution({ fund: fund._id, user: user._id, status: 'succeeded' });

    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(user))
      .send({ targetAmount: 500000 });
    expect(res.status).toBe(422);
  });

  test('200 allows modifying visibility even with contributions', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id, visibility: 'private' });
    await createContribution({ fund: fund._id, user: user._id, status: 'succeeded' });

    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(user))
      .send({ visibility: 'public' });
    expect(res.status).toBe(200);
    expect(res.body.visibility).toBe('public');
  });

  test('200 registers updateLog for description change with participants', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const part = await createUser({ email: 'participante@prueba.cl' });
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }],
      description: 'Descripción anterior',
    });

    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(org))
      .send({ description: 'Descripción actualizada' });

    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Descripción actualizada');
    expect(res.body.updateLogs).toHaveLength(1);
    expect(res.body.updateLogs[0].message).toMatch(/descripción/i);
  });

  test('400 si se intenta reducir fecha limite por debajo del minimo de frecuencia en fondo de cuota', async () => {
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

  test('200 extends deadline without crashing email service', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const part = await createUser({ email: 'participante@prueba.cl' });
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }],
      deadline: new Date(Date.now() + 86400000).toISOString(),
    });

    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(org))
      .send({ deadline: new Date(Date.now() + 86400000 * 10).toISOString() });

    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/funds/:id', () => {
  test('204 deletes fund with no contributions', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    const res = await request(app)
      .delete(`/api/funds/${fund._id}`)
      .set(await authHeader(user));
    expect(res.status).toBe(204);
  });

  test('403 if not organizer', async () => {
    const u1 = await createUser({ email: 'usuario1@prueba.cl' });
    const u2 = await createUser({ email: 'usuario2@prueba.cl' });
    const fund = await createFund({ organizer: u1._id });
    const res = await request(app)
      .delete(`/api/funds/${fund._id}`)
      .set(await authHeader(u2));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/funds/:id/close', () => {
  test('sets status to closed', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    const res = await request(app)
      .post(`/api/funds/${fund._id}/close`)
      .set(await authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('closed');
  });

  test('422 if already closed', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id, status: 'closed' });
    const res = await request(app)
      .post(`/api/funds/${fund._id}/close`)
      .set(await authHeader(user));
    expect(res.status).toBe(422);
  });
});

describe('GET /api/funds/:id — Phase 5 visualization', () => {
  test('collectedAmount reflects real contributions', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    await createContribution({ fund: fund._id, user: user._id, amount: 30000 });
    await createContribution({ fund: fund._id, user: user._id, amount: 20000 });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.collectedAmount).toBe(50000);
  });

  test('collectedAmount is 0 when no contributions', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.collectedAmount).toBe(0);
  });
});
