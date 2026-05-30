const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../../src/app');
const User = require('../../../src/models/User');
const Fund = require('../../../src/models/Fund');
const Contribution = require('../../../src/models/Contribution');

describe('HU19 - Pago Adelantado de Cuotas (Integración)', () => {
  let token, user, fundId;

  beforeAll(async () => {
    const { connect } = require('../../helpers/db');
    await connect();
    user = await User.create({
      name: 'Aportante Test',
      email: 'aportante.hu19@test.com',
      passwordHash: 'Password123!',
      isEmailVerified: true
    });
    const resAuth = await request(app)
      .post('/api/auth/login')
      .send({ email: 'aportante.hu19@test.com', password: 'Password123!' });
    token = resAuth.body.token;
  });

  beforeEach(async () => {
    const fund = await Fund.create({
      name: 'Fondo Cuotas',
      description: 'Test cuotas',
      goal: 'Test',
      type: 'quota',
      targetAmount: 100000,
      quotaAmount: 10000,
      totalQuotas: 10,
      frequency: 'monthly',
      deadline: new Date(Date.now() + 10000000000),
      organizer: user._id,
      participants: [{ user: user._id, status: 'accepted' }],
      recipientAccount: { bank: 'Banco Test', accountType: 'corriente', accountNumber: '123' },
      status: 'active'
    });
    fundId = fund._id.toString();
  });

  afterEach(async () => {
    await Fund.deleteMany({});
    await Contribution.deleteMany({});
  });

  afterAll(async () => {
    const { disconnect } = require('../../helpers/db');
    await User.deleteMany({});
    await disconnect();
  });

  it('Debe permitir pagar múltiples cuotas a la vez', async () => {
    const res = await request(app)
      .post(`/api/funds/${fundId}/contributions`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 30000,
        method: 'transfer',
        paidQuotas: 3
      });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(30000);
    expect(res.body.paidQuotas).toBe(3);

    const statusRes = await request(app)
      .get(`/api/funds/${fundId}/participants/${user._id}/status`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.remaining).toBe(7); // 10 - 3
    expect(statusRes.body.paid).toBe(3);
  });
});
