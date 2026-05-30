const request = require('supertest');
const app = require('../../../src/app');
const { connect, disconnect, clear } = require('../../helpers/db');
const { createUser, createFund, createContribution } = require('../../helpers/factories');

let organizer, participant;
let orgToken, partToken;
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

  orgToken  = await login(organizer);
  partToken = await login(participant);

  fund = await createFund({
    organizer: organizer._id,
    status: 'active',
    deadline: new Date(Date.now() + 86400000 * 30),
    targetAmount: 100000,
    recipientAccount: { bank: 'Banco Estado', accountType: 'vista', accountNumber: '12345678' },
  });

  // Aceptar al participante invitado
  const invToken = await invite(orgToken, participant._id);
  await request(app).post(`/api/invitations/${invToken}/accept`);
});

describe('POST /api/funds/:id/payment', () => {
  beforeEach(async () => {
    await createContribution({ fund: fund._id, user: organizer._id, amount: 50000 });
  });

  it('marca el fondo como completado (200)', async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/payment`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body.fund.status).toBe('completed');
    expect(res.body.transaction.transactionId).toMatch(/^sim_/);
  });

  it('retorna 422 si el fondo ya está cerrado', async () => {
    await fund.updateOne({ status: 'closed' });

    const res = await request(app)
      .post(`/api/funds/${fund._id}/payment`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(422);
  });

  it('retorna 403 si el solicitante no es el organizador', async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/payment`)
      .set('Authorization', `Bearer ${partToken}`);

    expect(res.status).toBe(403);
  });

  it('retorna 422 si el saldo recaudado es cero', async () => {
    const emptyFund = await createFund({ organizer: organizer._id, status: 'active', deadline: new Date(Date.now() + 86400000 * 30) });
    const res = await request(app)
      .post(`/api/funds/${emptyFund._id}/payment`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/saldo/i);
  });

  it('registra el pago en updateLogs del fondo', async () => {
    const Fund = require('../../../src/models/Fund');
    await request(app)
      .post(`/api/funds/${fund._id}/payment`)
      .set('Authorization', `Bearer ${orgToken}`);

    const updated = await Fund.findById(fund._id).lean();
    expect(updated.updateLogs.some(l => /pago/i.test(l.message))).toBe(true);
  });

  it('persiste la transacción del egreso en el fondo, no como aporte', async () => {
    const Fund        = require('../../../src/models/Fund');
    const Contribution = require('../../../src/models/Contribution');

    await request(app)
      .post(`/api/funds/${fund._id}/payment`)
      .set('Authorization', `Bearer ${orgToken}`);

    const updatedFund  = await Fund.findById(fund._id).lean();
    const contributions = await Contribution.find({ fund: fund._id }).lean();

    expect(updatedFund.paymentTransaction.transactionId).toMatch(/^sim_/);
    expect(updatedFund.paymentTransaction.amount).toBe(50000);
    expect(contributions).toHaveLength(1); // solo el aporte original, no el egreso
  });

  it('el monto recaudado no se duplica después del pago', async () => {
    await request(app)
      .post(`/api/funds/${fund._id}/payment`)
      .set('Authorization', `Bearer ${orgToken}`);

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.body.collectedAmount).toBe(50000);
  });

  it('un segundo intento de pago sobre un fondo completado devuelve 422', async () => {
    await request(app)
      .post(`/api/funds/${fund._id}/payment`)
      .set('Authorization', `Bearer ${orgToken}`);

    const res = await request(app)
      .post(`/api/funds/${fund._id}/payment`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(422);
  });
});
