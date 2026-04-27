const request = require('supertest');
const app = require('../../../src/app');
const { connect, disconnect, clear } = require('../../helpers/db');
const { createUser, createFund, createContribution } = require('../../helpers/factories');

let organizer, participant, stranger, pending;
let orgToken, partToken, strangerToken, pendingToken;
let fund;

async function login(user) {
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Password1!' });
  return res.body.token;
}

async function invite(token, userId) {
  const res = await request(app)
    .post(`/api/funds/${fund._id}/invitations`)
    .set('Authorization', `Bearer ${token}`)
    .send({ userId: userId.toString() });
  return res.body[0]?.invitationToken;
}

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => {
  await clear();
  organizer  = await createUser({ email: 'org@test.com',      passwordHash: 'Password1!' });
  participant= await createUser({ email: 'part@test.com',     passwordHash: 'Password1!', name: 'Part' });
  stranger   = await createUser({ email: 'stranger@test.com', passwordHash: 'Password1!' });
  pending    = await createUser({ email: 'pending@test.com',  passwordHash: 'Password1!' });

  orgToken      = await login(organizer);
  partToken     = await login(participant);
  strangerToken = await login(stranger);
  pendingToken  = await login(pending);

  fund = await createFund({
    organizer: organizer._id,
    status: 'active',
    deadline: new Date(Date.now() + 86400000 * 30),
    targetAmount: 100000,
    recipientAccount: '12345678',
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
