/**
 * HU12 — Registrar aporte (crear registro de contribución).
 * Criterios: formulario/API de monto, validación > 0, registro con quién/cuánto/cuándo,
 * totales del fondo, estado al día en participantes (cuotas).
 * @see docs/pruebas-hu12-registrar-aporte.md
 */
const request = require('supertest');
const app = require('../../../src/app');
const { connect, disconnect, clear } = require('../../helpers/db');
const { createUser, createFund } = require('../../helpers/factories');
const Fund = require('../../../src/models/Fund');

let organizer;
let participant;
let orgToken;
let partToken;
let freeFund;

async function login(user) {
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Password1!' });
  return res.body.token;
}

async function invite(token, userId, fundId) {
  const res = await request(app)
    .post(`/api/funds/${fundId}/invitations`)
    .set('Authorization', `Bearer ${token}`)
    .send({ userId: userId.toString() });
  return res.body[res.body.length - 1]?.invitationToken;
}

beforeAll(async () => {
  await connect();
});
afterAll(async () => {
  await disconnect();
});

beforeEach(async () => {
  await clear();
  organizer = await createUser({ email: 'hu12-org@test.cl', passwordHash: 'Password1!', name: 'Organizador HuDoce' });
  participant = await createUser({ email: 'hu12-part@test.cl', passwordHash: 'Password1!', name: 'Participante HuDoce' });
  orgToken = await login(organizer);
  partToken = await login(participant);

  freeFund = await createFund({
    organizer: organizer._id,
    type: 'free',
    status: 'active',
    deadline: new Date(Date.now() + 86400000 * 30),
    targetAmount: 100000,
    recipientAccount: { bank: 'Banco Estado', accountType: 'vista', accountNumber: '12345678' },
  });

  const invToken = await invite(orgToken, participant._id, freeFund._id);
  await request(app).post(`/api/invitations/${invToken}/accept`);
});

describe('HU12 — Registrar aporte', () => {
  it('HU12-INT-01: respuesta 201 incluye monto, usuario, fondo, estado succeeded y marca temporal', async () => {
    const res = await request(app)
      .post(`/api/funds/${freeFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: 15000, method: 'transfer' });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(15000);
    expect(res.body.status).toBe('succeeded');
    expect(res.body.user).toBeDefined();
    expect(res.body.fund).toBeDefined();
    expect(String(res.body.user)).toBe(participant._id.toString());
    expect(String(res.body.fund)).toBe(freeFund._id.toString());
    expect(res.body.date || res.body.createdAt).toBeDefined();
  });

  it('HU12-INT-02: GET fondo refleja collectedAmount acumulado tras el aporte', async () => {
    await request(app)
      .post(`/api/funds/${freeFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: 8000, method: 'cash' });

    const res = await request(app)
      .get(`/api/funds/${freeFund._id}`)
      .set('Authorization', `Bearer ${partToken}`);

    expect(res.status).toBe(200);
    expect(res.body.collectedAmount).toBe(8000);
  });

  it('HU12-INT-03: fondo por cuotas — tras pago exacto, participante figura al día en GET participants', async () => {
    const quotaAmount = 12000;
    const quotaFund = await createFund({
      organizer: organizer._id,
      type: 'quota', totalQuotas: 12,
      quotaAmount,
      frequency: 'monthly',
      status: 'active',
      deadline: new Date(Date.now() + 86400000 * 30),
      targetAmount: 50000,
    });
    const tok = await invite(orgToken, participant._id, quotaFund._id);
    await request(app).post(`/api/invitations/${tok}/accept`);

    await request(app)
      .post(`/api/funds/${quotaFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: quotaAmount, method: 'transfer' });

    const parts = await request(app)
      .get(`/api/funds/${quotaFund._id}/participants`)
      .set('Authorization', `Bearer ${partToken}`);

    expect(parts.status).toBe(200);
    const row = parts.body.find(p => p.user?._id?.toString() === participant._id.toString());
    expect(row).toBeDefined();
    expect(row.contributionStatus).toBe('onTime');
  });

  it('HU12-INT-04: fondo no activo (pausado) rechaza nuevo aporte con 403', async () => {
    await Fund.updateOne({ _id: freeFund._id }, { $set: { status: 'paused' } });

    const res = await request(app)
      .post(`/api/funds/${freeFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: 1000, method: 'transfer' });

    expect(res.status).toBe(403);
  });

  it('HU12-INT-05: monto cero o ausente responde 400', async () => {
    const r0 = await request(app)
      .post(`/api/funds/${freeFund._id}/contributions`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ amount: 0, method: 'transfer' });
    expect(r0.status).toBe(400);

    const rEmpty = await request(app)
      .post(`/api/funds/${freeFund._id}/contributions`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ method: 'transfer' });
    expect(rEmpty.status).toBe(400);
  });

  it('HU12-INT-06: fondo libre respeta minAmount', async () => {
    await Fund.updateOne({ _id: freeFund._id }, { $set: { minAmount: 5000 } });

    const res = await request(app)
      .post(`/api/funds/${freeFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: 4999, method: 'transfer' });

    expect(res.status).toBe(400);
    expect(res.body.minAmount).toBe(5000);
  });

  it('HU12-INT-07: GET contributions devuelve registro con usuario poblado (quién / cuánto / cuándo)', async () => {
    await request(app)
      .post(`/api/funds/${freeFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: 3333, method: 'transfer' });

    const res = await request(app)
      .get(`/api/funds/${freeFund._id}/contributions`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const mine = res.body.find(c => c.user?.email === participant.email);
    expect(mine).toBeDefined();
    expect(mine.amount).toBe(3333);
    expect(mine.user.name).toBeDefined();
    expect(mine.date).toBeDefined();
  });

  it('HU12-INT-08: cuotas — si ya está al día, segundo pago igual devuelve 400', async () => {
    const quotaAmount = 5000;
    const quotaFund = await createFund({
      organizer: organizer._id,
      type: 'quota', totalQuotas: 1,
      quotaAmount,
      frequency: 'once',
      status: 'active',
      deadline: new Date(Date.now() + 86400000 * 30),
      targetAmount: 10000,
    });
    const tok = await invite(orgToken, participant._id, quotaFund._id);
    await request(app).post(`/api/invitations/${tok}/accept`);

    await request(app)
      .post(`/api/funds/${quotaFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: quotaAmount, method: 'transfer' });

    const res = await request(app)
      .post(`/api/funds/${quotaFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: quotaAmount, method: 'transfer' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/al día|pendientes/i);
  });
});
