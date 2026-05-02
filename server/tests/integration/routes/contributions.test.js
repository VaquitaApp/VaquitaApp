const request = require('supertest');
const app = require('../../../src/app');
const { connect, disconnect, clear } = require('../../helpers/db');
const { createUser, createFund, createContribution } = require('../../helpers/factories');
const Fund = require('../../../src/models/Fund');

let organizer, participant, stranger, pending;
let orgToken, partToken, strangerToken, pendingToken;
let fund;

async function login(user) {
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Password1!' });
  return res.body.token;
}

async function invite(token, userId, fundId) {
  const res = await request(app)
    .post(`/api/funds/${fundId ?? fund._id}/invitations`)
    .set('Authorization', `Bearer ${token}`)
    .send({ userId: userId.toString() });
  return res.body[res.body.length - 1]?.invitationToken;
}

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => {
  await clear();
  organizer  = await createUser({ email: 'organizador@prueba.cl',  passwordHash: 'Password1!' });
  participant= await createUser({ email: 'participante@prueba.cl', passwordHash: 'Password1!', name: 'Participante' });
  stranger   = await createUser({ email: 'desconocido@prueba.cl',  passwordHash: 'Password1!' });
  pending    = await createUser({ email: 'pendiente@prueba.cl',    passwordHash: 'Password1!' });

  orgToken      = await login(organizer);
  partToken     = await login(participant);
  strangerToken = await login(stranger);
  pendingToken  = await login(pending);

  fund = await createFund({
    organizer: organizer._id,
    status: 'active',
    deadline: new Date(Date.now() + 86400000 * 30),
    targetAmount: 100000,
    recipientAccount: { bank: 'Banco Estado', accountType: 'vista', accountNumber: '12345678' },
  });

  // Accept participant
  const invToken = await invite(orgToken, participant._id);
  await request(app).post(`/api/invitations/${invToken}/accept`);

  // Invite pending (but don't accept)
  await invite(orgToken, pending._id);
});

describe('POST /api/funds/:id/contributions', () => {
  it('creates contribution for organizer (201)', async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/contributions`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ amount: 10000, method: 'transfer' });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(10000);
    expect(res.body.status).toBe('succeeded');
  });

  it('creates contribution for accepted participant (201)', async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: 5000, method: 'cash' });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(5000);
  });

  it('returns 403 for non-member', async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/contributions`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ amount: 5000, method: 'transfer' });

    expect(res.status).toBe(403);
  });

  it('returns 403 for pending participant', async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/contributions`)
      .set('Authorization', `Bearer ${pendingToken}`)
      .send({ amount: 5000, method: 'transfer' });

    expect(res.status).toBe(403);
  });

  it('returns 400 if amount <= 0', async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/contributions`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ amount: 0, method: 'transfer' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/funds/:id/contributions', () => {
  beforeEach(async () => {
    await createContribution({ fund: fund._id, user: organizer._id, amount: 20000 });
    await createContribution({ fund: fund._id, user: participant._id, amount: 10000 });
  });

  it('returns sorted list for organizer (200)', async () => {
    const res = await request(app)
      .get(`/api/funds/${fund._id}/contributions`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].user.name).toBeDefined();
  });

  it('returns 403 for stranger', async () => {
    const res = await request(app)
      .get(`/api/funds/${fund._id}/contributions`)
      .set('Authorization', `Bearer ${strangerToken}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/funds/:id/payment', () => {
  beforeEach(async () => {
    await createContribution({ fund: fund._id, user: organizer._id, amount: 50000 });
  });

  it('sets fund to completed (200)', async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/payment`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body.fund.status).toBe('completed');
    expect(res.body.transaction.transactionId).toMatch(/^sim_/);
  });

  it('returns 422 if fund already closed', async () => {
    await fund.updateOne({ status: 'closed' });

    const res = await request(app)
      .post(`/api/funds/${fund._id}/payment`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(422);
  });

  it('returns 403 for non-organizer', async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/payment`)
      .set('Authorization', `Bearer ${partToken}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/funds/:id/contributions — fondo por cuotas', () => {
  const quotaAmount = 10000;
  let quotaFund;

  beforeEach(async () => {
    quotaFund = await createFund({
      organizer: organizer._id,
      type: 'quota',
      quotaAmount,
      frequency: 'monthly',
      status: 'active',
      deadline: new Date(Date.now() + 86400000 * 30),
      targetAmount: 60000,
    });
    const invToken = await invite(orgToken, participant._id, quotaFund._id);
    await request(app).post(`/api/invitations/${invToken}/accept`);
  });

  it('201 with exact quota amount (1 period, no prior payments)', async () => {
    const res = await request(app)
      .post(`/api/funds/${quotaFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: quotaAmount, method: 'transfer' });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(quotaAmount);
  });

  it('400 if amount is less than required quota', async () => {
    const res = await request(app)
      .post(`/api/funds/${quotaFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: quotaAmount - 1, method: 'transfer' });

    expect(res.status).toBe(400);
    expect(res.body.requiredAmount).toBe(quotaAmount);
  });

  it('400 if amount is more than required quota', async () => {
    const res = await request(app)
      .post(`/api/funds/${quotaFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: quotaAmount + 1, method: 'transfer' });

    expect(res.status).toBe(400);
  });

  it('400 if amount covers only partial catch-up when multiple quotas are overdue', async () => {
    const unMesAtras = new Date();
    unMesAtras.setMonth(unMesAtras.getMonth() - 1);
    await Fund.collection.updateOne({ _id: quotaFund._id }, { $set: { createdAt: unMesAtras } });

    const res = await request(app)
      .post(`/api/funds/${quotaFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: quotaAmount, method: 'transfer' }); // solo 1 cuando se deben 2

    expect(res.status).toBe(400);
    expect(res.body.pendingQuotas).toBe(2);
    expect(res.body.requiredAmount).toBe(quotaAmount * 2);
  });

  it('201 with catch-up amount when multiple quotas are overdue', async () => {
    const unMesAtras = new Date();
    unMesAtras.setMonth(unMesAtras.getMonth() - 1);
    await Fund.collection.updateOne({ _id: quotaFund._id }, { $set: { createdAt: unMesAtras } });

    const res = await request(app)
      .post(`/api/funds/${quotaFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: quotaAmount * 2, method: 'transfer' });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(quotaAmount * 2);
  });

  it('free fund still accepts any positive amount', async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/contributions`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ amount: 1234, method: 'transfer' });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(1234);
  });
});

describe('POST /api/funds/:id/contributions — fondo quincenal', () => {
  const quotaAmount = 5000;
  let biweeklyFund;

  beforeEach(async () => {
    biweeklyFund = await createFund({
      organizer: organizer._id,
      type: 'quota',
      quotaAmount,
      frequency: 'biweekly',
      status: 'active',
      deadline: new Date(Date.now() + 86400000 * 60),
      targetAmount: 30000,
    });
    const invToken = await invite(orgToken, participant._id, biweeklyFund._id);
    await request(app).post(`/api/invitations/${invToken}/accept`);
  });

  it('201 con monto exacto para 1 cuota quincenal (fondo recien creado)', async () => {
    const res = await request(app)
      .post(`/api/funds/${biweeklyFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: quotaAmount, method: 'transfer' });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(quotaAmount);
  });

  it('400 si el monto no coincide con la cuota quincenal requerida', async () => {
    const res = await request(app)
      .post(`/api/funds/${biweeklyFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: quotaAmount - 1, method: 'transfer' });

    expect(res.status).toBe(400);
    expect(res.body.requiredAmount).toBe(quotaAmount);
  });

  it('400 con monto de 1 cuota cuando hay 2 cuotas quincenales atrasadas', async () => {
    const quinceDiasAtras = new Date();
    quinceDiasAtras.setDate(quinceDiasAtras.getDate() - 15);
    await Fund.collection.updateOne({ _id: biweeklyFund._id }, { $set: { createdAt: quinceDiasAtras } });

    const res = await request(app)
      .post(`/api/funds/${biweeklyFund._id}/contributions`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ amount: quotaAmount, method: 'transfer' });

    expect(res.status).toBe(400);
    expect(res.body.pendingQuotas).toBe(2);
    expect(res.body.requiredAmount).toBe(quotaAmount * 2);
  });
});
