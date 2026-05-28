const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../../src/app');
const User = require('../../../src/models/User');
const Fund = require('../../../src/models/Fund');

const { connect, disconnect, clear } = require('../../helpers/db');

describe('HU20 - Metas Parciales (Hitos) de Recaudación (Integración)', () => {
  let token, user;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    await clear();
    user = await User.create({
      name: 'Hitos Test',
      email: 'hitos.hu20@test.com',
      passwordHash: 'Password123!',
      isEmailVerified: true
    });
    const resAuth = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hitos.hu20@test.com', password: 'Password123!' });
    token = resAuth.body.token;
  });

  afterEach(async () => {
    await clear();
  });

  afterAll(async () => {
    await disconnect();
  });

  it('Debe permitir crear un fondo con hitos (milestones) validos', async () => {
    const res = await request(app)
      .post('/api/funds')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Fondo Hitos',
        description: 'Test hitos',
        goal: 'Test',
        type: 'free',
        targetAmount: 100000,
        deadline: new Date(Date.now() + 10000000000),
        recipientAccount: { bank: 'Banco Test', accountType: 'corriente', accountNumber: '123' },
        visibility: 'public',
        milestones: [
          { amount: 25000, description: 'Compra de materiales 1' },
          { amount: 50000, description: 'Compra de materiales 2' },
          { amount: 75000, description: 'Compra de materiales 3' }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.milestones).toHaveLength(3);
    expect(res.body.milestones[0].amount).toBe(25000);
  });

  it('No debe permitir crear hitos con monto mayor a la meta total', async () => {
    const res = await request(app)
      .post('/api/funds')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Fondo Hitos Invalido',
        description: 'Test hitos',
        goal: 'Test',
        type: 'free',
        targetAmount: 100000,
        deadline: new Date(Date.now() + 10000000000),
        recipientAccount: { bank: 'Banco Test', accountType: 'corriente', accountNumber: '123' },
        visibility: 'public',
        milestones: [
          { amount: 150000, description: 'Hito imposible' }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });
});
