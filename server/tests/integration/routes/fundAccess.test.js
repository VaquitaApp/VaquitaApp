const request = require('supertest');
const app = require('../../../src/app');
const Fund = require('../../../src/models/Fund');
const { connect, disconnect, clear } = require('../../helpers/db');
const { createUser, createFund } = require('../../helpers/factories');

let organizer, requester, orgToken, reqToken, fund;

async function login(user) {
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Password1!' });
  return res.body.token;
}

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => {
  await clear();
  organizer = await createUser({ email: 'org@test.com', passwordHash: 'Password1!', name: 'Org' });
  requester = await createUser({ email: 'req@test.com', passwordHash: 'Password1!', name: 'Req' });
  orgToken = await login(organizer);
  fund = await createFund({
    organizer: organizer._id,
    status: 'active',
    visibility: 'public',
    deadline: new Date(Date.now() + 86400000 * 30),
  });
  const res = await request(app)
    .post(`/api/funds/${fund._id}/access-requests`)
    .set('Authorization', `Bearer ${await login(requester)}`);
  expect(res.status).toBe(201);
  const f = await Fund.findById(fund._id).lean();
  reqToken = f.accessRequests.find(r => r.status === 'pending').token;
});

describe('POST /api/funds/:id/access-requests', () => {
  it('returns 403 for private fund', async () => {
    await fund.updateOne({ visibility: 'private' });
    const u = await createUser({ email: 'u2@test.com', passwordHash: 'Password1!' });
    const t = await login(u);
    const res = await request(app)
      .post(`/api/funds/${fund._id}/access-requests`)
      .set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(403);
  });

  it('returns 409 if user already accepted', async () => {
    await request(app).post(`/api/fund-access/${reqToken}/accept`);
    const res = await request(app)
      .post(`/api/funds/${fund._id}/access-requests`)
      .set('Authorization', `Bearer ${await login(requester)}`);
    expect(res.status).toBe(409);
  });
});

describe('POST /api/fund-access/:token/accept and reject', () => {
  it('accept adds participant and invalidates token', async () => {
    const res = await request(app).post(`/api/fund-access/${reqToken}/accept`);
    expect(res.status).toBe(200);
    const again = await request(app).post(`/api/fund-access/${reqToken}/accept`);
    expect(again.status).toBe(404);
  });

  it('concurrent accept returns 200 for both (idempotent; no VersionError to client)', async () => {
    const [a, b] = await Promise.all([
      request(app).post(`/api/fund-access/${reqToken}/accept`),
      request(app).post(`/api/fund-access/${reqToken}/accept`),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const f = await Fund.findById(fund._id).lean();
    const accepted = f.participants.filter(
      p => p.status === 'accepted' && p.user.toString() === requester._id.toString(),
    );
    expect(accepted).toHaveLength(1);
  });

  it('reject does not add participant', async () => {
    const res = await request(app).post(`/api/fund-access/${reqToken}/reject`);
    expect(res.status).toBe(200);
    const f = await Fund.findById(fund._id).lean();
    const accepted = f.participants.filter(p => p.status === 'accepted' && p.user.toString() === requester._id.toString());
    expect(accepted).toHaveLength(0);
  });

  it('returns 404 when responding to the same access token twice', async () => {
    const first = await request(app).post(`/api/fund-access/${reqToken}/reject`);
    expect(first.status).toBe(200);
    const again = await request(app).post(`/api/fund-access/${reqToken}/reject`);
    expect(again.status).toBe(404);
  });

  it('returns 422 if fund closed', async () => {
    await fund.updateOne({ status: 'closed' });
    const res = await request(app).post(`/api/fund-access/${reqToken}/accept`);
    expect(res.status).toBe(422);
  });
});
