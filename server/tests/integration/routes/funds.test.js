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
});

describe('GET /api/funds', () => {
  test('returns only own funds', async () => {
    const u1 = await createUser({ email: 'u1@test.com' });
    const u2 = await createUser({ email: 'u2@test.com' });
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

describe('GET /api/funds/public', () => {
  test('returns only public active funds', async () => {
    const u1 = await createUser({ email: 'u1@test.com' });
    const u2 = await createUser({ email: 'u2@test.com' });
    await createFund({ organizer: u1._id, visibility: 'public',  status: 'active'    });
    await createFund({ organizer: u1._id, visibility: 'private', status: 'active'    });
    await createFund({ organizer: u1._id, visibility: 'public',  status: 'closed'    });

    const res = await request(app)
      .get('/api/funds/public')
      .set(await authHeader(u2));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].visibility).toBe('public');
  });
});

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
    const u1 = await createUser({ email: 'u1@test.com' });
    const u2 = await createUser({ email: 'u2@test.com' });
    const fund = await createFund({ organizer: u1._id, visibility: 'private' });
    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(u2));
    expect(res.status).toBe(403);
  });

  test('200 for unrelated user on public fund', async () => {
    const u1 = await createUser({ email: 'u1@test.com' });
    const u2 = await createUser({ email: 'u2@test.com' });
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
    const org = await createUser({ email: 'org@test.com' });
    const part = await createUser({ email: 'part@test.com' });
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }]
    });

    const res = await request(app)
      .post(`/api/funds/${fund._id}/messages`)
      .set(await authHeader(part))
      .send({ text: 'Ya transferí' });
    expect(res.status).toBe(201);
    expect(res.body[0].text).toBe('Ya transferí');
  });

  test('403 rejects message if not member', async () => {
    const org = await createUser({ email: 'org@test.com' });
    const stranger = await createUser({ email: 'stranger@test.com' });
    const fund = await createFund({ organizer: org._id });

    const res = await request(app)
      .post(`/api/funds/${fund._id}/messages`)
      .set(await authHeader(stranger))
      .send({ text: 'Spam' });
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
    const u1 = await createUser({ email: 'u1@test.com' });
    const u2 = await createUser({ email: 'u2@test.com' });
    const fund = await createFund({ organizer: u1._id });
    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(u2))
      .send({ name: 'Hack' });
    expect(res.status).toBe(403);
  });

  test('422 if fund is closed', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id, status: 'closed' });
    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(user))
      .send({ name: 'X' });
    expect(res.status).toBe(422);
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
    const u1 = await createUser({ email: 'u1@test.com' });
    const u2 = await createUser({ email: 'u2@test.com' });
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
