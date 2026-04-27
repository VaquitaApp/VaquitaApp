const request = require('supertest');
const app = require('../../../src/app');
const { connect, disconnect, clear } = require('../../helpers/db');
const { createUser, createFund } = require('../../helpers/factories');

let organizer, participant, orgToken, partToken, fund;

async function login(user) {
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Password1!' });
  return res.body.token;
}

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => {
  await clear();
  organizer   = await createUser({ email: 'org@test.com',  passwordHash: 'Password1!' });
  participant = await createUser({ email: 'part@test.com', passwordHash: 'Password1!', name: 'Part User' });
  orgToken    = await login(organizer);
  partToken   = await login(participant);
  fund = await createFund({ organizer: organizer._id, status: 'active', deadline: new Date(Date.now() + 86400000 * 30) });
});

// ── Invitations ──────────────────────────────────────────────────────────────

describe('POST /api/funds/:id/invitations', () => {
  it('adds participant with pending status', async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('pending');
    expect(res.body[0].user.email).toBe('part@test.com');
  });

  it('returns 409 if user already invited', async () => {
    await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });

    const res = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });

    expect(res.status).toBe(409);
  });

  it('returns 422 if fund not active', async () => {
    await fund.updateOne({ status: 'closed' });

    const res = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/not active/i);
  });

  it('returns 422 if deadline passed', async () => {
    await fund.updateOne({ deadline: new Date(Date.now() - 86400000) });

    const res = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/deadline/i);
  });

  it('returns 403 if caller is not organizer', async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ userId: participant._id.toString() });

    expect(res.status).toBe(403);
  });
});

// ── Invitation response ───────────────────────────────────────────────────────

describe('POST /api/invitations/:token/accept and reject', () => {
  let token;

  beforeEach(async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    token = res.body[0].invitationToken;
  });

  it('sets status to accepted', async () => {
    const res = await request(app).post(`/api/invitations/${token}/accept`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/aceptada/i);
    expect(res.body.fund.name).toBeDefined();
  });

  it('sets status to rejected', async () => {
    const res = await request(app).post(`/api/invitations/${token}/reject`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/rechazada/i);
  });

  it('returns 422 if fund is closed', async () => {
    await fund.updateOne({ status: 'closed' });
    const res = await request(app).post(`/api/invitations/${token}/accept`);
    expect(res.status).toBe(422);
  });

  it('returns 404 for invalid token', async () => {
    const res = await request(app).post('/api/invitations/invalid-token/accept');
    expect(res.status).toBe(404);
  });
});

// ── Participants management ───────────────────────────────────────────────────

describe('DELETE /api/funds/:id/participants/:userId', () => {
  beforeEach(async () => {
    await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
  });

  it('removes participant (204)', async () => {
    const res = await request(app)
      .delete(`/api/funds/${fund._id}/participants/${participant._id}`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(204);
  });

  it('returns 403 if caller is not organizer', async () => {
    const res = await request(app)
      .delete(`/api/funds/${fund._id}/participants/${participant._id}`)
      .set('Authorization', `Bearer ${partToken}`);

    expect(res.status).toBe(403);
  });
});

// ── GET participants ──────────────────────────────────────────────────────────

describe('GET /api/funds/:id/participants', () => {
  beforeEach(async () => {
    const invRes = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    const invToken = invRes.body[0].invitationToken;
    await request(app).post(`/api/invitations/${invToken}/accept`);
  });

  it('returns list with contribution status for organizer', async () => {
    const res = await request(app)
      .get(`/api/funds/${fund._id}/participants`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('accepted');
    expect(res.body[0].contributionStatus).toBe('pending');
    expect(res.body[0].user.email).toBeDefined();
  });

  it('returns 403 for non-member', async () => {
    const stranger = await createUser({ email: 'stranger@test.com', passwordHash: 'Password1!' });
    const strangerToken = await login(stranger);

    const res = await request(app)
      .get(`/api/funds/${fund._id}/participants`)
      .set('Authorization', `Bearer ${strangerToken}`);

    expect(res.status).toBe(403);
  });
});

// ── User search ───────────────────────────────────────────────────────────────

describe('GET /api/users/search', () => {
  it('returns matching users, excludes self', async () => {
    const res = await request(app)
      .get('/api/users/search?q=Part')
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.every(u => u.email !== 'org@test.com')).toBe(true);
  });

  it('returns empty array for short query', async () => {
    const res = await request(app)
      .get('/api/users/search?q=P')
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});
