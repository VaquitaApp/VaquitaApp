const request = require('supertest');
const app = require('../../../src/app');
const User = require('../../../src/models/User');
const Fund = require('../../../src/models/Fund');
const Contribution = require('../../../src/models/Contribution');
const { connect, disconnect } = require('../../helpers/db');

describe('SCRUM-81 - Tope de meta y auto-derivación de totalQuotas (Integración)', () => {
  let token, user;

  beforeAll(async () => {
    await connect();
    user = await User.create({
      name: 'Tope Test',
      email: 'tope.scrum81@test.com',
      passwordHash: 'Password123!',
      isEmailVerified: true,
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tope.scrum81@test.com', password: 'Password123!' });
    token = res.body.token;
  });

  afterEach(async () => {
    await Fund.deleteMany({});
    await Contribution.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await disconnect();
  });

  function quotaFundBody(overrides = {}) {
    return {
      name: 'Fondo Cuotas',
      description: 'Test',
      goal: 'Meta',
      type: 'quota',
      targetAmount: 100000,
      quotaAmount: 10000,
      frequency: 'monthly',
      deadline: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString(),
      recipientAccount: { bank: 'Banco Test', accountType: 'corriente', accountNumber: '123' },
      visibility: 'private',
      ...overrides,
    };
  }

  // Fondo donde el tope de meta (3 cuotas) manda por sobre el total de cuotas (10).
  async function capFund() {
    const fund = await Fund.create({
      name: 'Tope', description: 'x', goal: 'x', type: 'quota',
      targetAmount: 30000, quotaAmount: 10000, totalQuotas: 10, frequency: 'monthly',
      deadline: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
      organizer: user._id,
      participants: [{ user: user._id, status: 'accepted' }],
      recipientAccount: { bank: 'B', accountType: 'corriente', accountNumber: '1' },
      status: 'active',
    });
    return fund._id.toString();
  }

  describe('Auto-derivación de totalQuotas', () => {
    it('crea fondo de cuota SIN totalQuotas y lo deriva del plazo (no rechaza con 400)', async () => {
      const res = await request(app)
        .post('/api/funds')
        .set('Authorization', `Bearer ${token}`)
        .send(quotaFundBody()); // sin totalQuotas
      expect(res.status).toBe(201);
      expect(typeof res.body.totalQuotas).toBe('number');
      expect(res.body.totalQuotas).toBeGreaterThanOrEqual(1);
    });

    it('respeta el totalQuotas explícito cuando se entrega', async () => {
      const res = await request(app)
        .post('/api/funds')
        .set('Authorization', `Bearer ${token}`)
        .send(quotaFundBody({ totalQuotas: 5 }));
      expect(res.status).toBe(201);
      expect(res.body.totalQuotas).toBe(5);
    });
  });

  describe('Meta múltiplo de la cuota (la meta manda, la cuota se acomoda)', () => {
    it('rechaza crear fondo de cuota si la meta no es múltiplo del valor de la cuota', async () => {
      const res = await request(app)
        .post('/api/funds')
        .set('Authorization', `Bearer ${token}`)
        .send(quotaFundBody({ targetAmount: 100000, quotaAmount: 30000 })); // 100000 % 30000 != 0
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/divid|múltiplo|divisor/i);
    });

    it('acepta crear fondo de cuota si la meta es múltiplo del valor de la cuota', async () => {
      const res = await request(app)
        .post('/api/funds')
        .set('Authorization', `Bearer ${token}`)
        .send(quotaFundBody({ targetAmount: 90000, quotaAmount: 30000 }));
      expect(res.status).toBe(201);
    });
  });

  describe('Tope global de meta', () => {
    it('status: maxPayable queda acotado por el restante para la meta, no por el total de cuotas', async () => {
      const id = await capFund();
      const res = await request(app)
        .get(`/api/funds/${id}/participants/${user._id}/status`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.remaining).toBe(10);        // saldo por totalQuotas
      expect(res.body.remainingToTarget).toBe(30000);
      expect(res.body.maxPayable).toBe(3);         // 30000 / 10000 — manda el tope de meta
    });

    it('rechaza un aporte cuyo monto excede el restante para la meta', async () => {
      const id = await capFund();
      const res = await request(app)
        .post(`/api/funds/${id}/contributions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 50000, method: 'transfer', paidQuotas: 5 });
      expect(res.status).toBe(400);
      expect(res.body.remaining).toBe(30000);
    });

    it('permite llegar justo a la meta y luego rechaza nuevos aportes', async () => {
      const id = await capFund();
      const ok = await request(app)
        .post(`/api/funds/${id}/contributions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 30000, method: 'transfer', paidQuotas: 3 });
      expect(ok.status).toBe(201);
      expect(ok.body.paidQuotas).toBe(3);

      const blocked = await request(app)
        .post(`/api/funds/${id}/contributions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 10000, method: 'transfer', paidQuotas: 1 });
      expect(blocked.status).toBe(400);
      expect(blocked.body.error).toMatch(/meta/i);
    });
  });
});
