/**
 * End-to-end happy path: full collective fund lifecycle via API.
 *
 * Flow:
 *  1. Register organizer + participant
 *  2. Create fund
 *  3. Invite participant → accept invitation
 *  4. Both register contributions
 *  5. Participant list shows "onTime" status
 *  6. Organizer sends manual reminder
 *  7. Organizer triggers payment → fund completed
 *  8. Completed fund rejects further edits / close / contributions
 */

const request = require('supertest');
const app = require('../../../src/app');
const User = require('../../../src/models/User');
const { connect, disconnect, clear } = require('../../helpers/db');

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clear(); });

async function register(data) {
  const registerRes = await request(app).post('/api/auth/register').send(data);
  expect(registerRes.status).toBe(201);
  expect(registerRes.body.message).toBeTruthy();

  const userDoc = await User.findOne({ email: data.email.toLowerCase() });
  const verifyRes = await request(app).get(`/api/auth/verify-email/${userDoc.emailVerificationToken}`);
  expect(verifyRes.status).toBe(200);

  const loginRes = await request(app).post('/api/auth/login').send({ email: data.email, password: data.password });
  expect(loginRes.status).toBe(200);
  return { token: loginRes.body.token, user: loginRes.body.user };
}

async function authGet(token, url) {
  return request(app).get(url).set('Authorization', `Bearer ${token}`);
}

async function authPost(token, url, body = {}) {
  return request(app).post(url).set('Authorization', `Bearer ${token}`).send(body);
}

async function authPatch(token, url, body = {}) {
  return request(app).patch(url).set('Authorization', `Bearer ${token}`).send(body);
}

test('full fund lifecycle — happy path', async () => {
  // ── Step 1: Register users ───────────────────────────────────────────────
  const org  = await register({ name: 'Ana Org',  email: 'ana@test.com',  password: 'Password1!', rut: '11.111.111-1' });
  const part = await register({ name: 'Luis Part', email: 'luis@test.com', password: 'Password1!', rut: '22.222.222-2' });

  expect(org.token).toBeTruthy();
  expect(part.token).toBeTruthy();

  // ── Step 2: Create fund ─────────────────────────────────────────────────
  const createRes = await authPost(org.token, '/api/funds', {
    name:             'Fondo Paseo Grupal',
    type:             'free',
    targetAmount:     60000,
    deadline:         new Date(Date.now() + 86400000 * 30).toISOString(),
    recipientAccount: { bank: 'Banco de Chile', accountType: 'corriente', accountNumber: '987654321' },
    visibility:       'public',
  });
  expect(createRes.status).toBe(201);
  const fundId = createRes.body._id;
  expect(createRes.body.status).toBe('active');

  // verify it appears in my funds list
  const listRes = await authGet(org.token, '/api/funds');
  expect(listRes.status).toBe(200);
  expect(listRes.body).toHaveLength(1);
  expect(listRes.body[0].name).toBe('Fondo Paseo Grupal');

  // verify it appears in public directory
  const pubRes = await authGet(part.token, '/api/funds/public');
  expect(pubRes.status).toBe(200);
  expect(pubRes.body.some(f => f._id === fundId)).toBe(true);

  // ── Step 3: Invite participant ──────────────────────────────────────────
  const inviteRes = await authPost(org.token, `/api/funds/${fundId}/invitations`, {
    userId: part.user._id,
  });
  expect(inviteRes.status).toBe(201);
  expect(inviteRes.body[0].status).toBe('pending');

  const invToken = inviteRes.body[0].invitationToken;
  expect(invToken).toBeTruthy();

  // participant accepts
  const acceptRes = await request(app).post(`/api/invitations/${invToken}/accept`);
  expect(acceptRes.status).toBe(200);
  expect(acceptRes.body.message).toMatch(/aceptada/i);
  expect(acceptRes.body.fund.name).toBe('Fondo Paseo Grupal');

  // participant's fund list now includes the fund
  const partListRes = await authGet(part.token, '/api/funds');
  expect(partListRes.status).toBe(200);
  expect(partListRes.body.some(f => f._id === fundId)).toBe(true);

  // ── Step 4: Register contributions ────────────────────────────────────
  // organizer contributes
  const orgContrib = await authPost(org.token, `/api/funds/${fundId}/contributions`, {
    amount: 25000, method: 'transfer',
  });
  expect(orgContrib.status).toBe(201);
  expect(orgContrib.body.amount).toBe(25000);

  // participant contributes
  const partContrib = await authPost(part.token, `/api/funds/${fundId}/contributions`, {
    amount: 20000, method: 'cash',
  });
  expect(partContrib.status).toBe(201);
  expect(partContrib.body.amount).toBe(20000);

  // contributions list shows both, sorted desc
  const contribList = await authGet(org.token, `/api/funds/${fundId}/contributions`);
  expect(contribList.status).toBe(200);
  expect(contribList.body).toHaveLength(2);
  expect(contribList.body[0].user.name).toBeDefined();

  // fund detail reflects collected amount
  const detailRes = await authGet(org.token, `/api/funds/${fundId}`);
  expect(detailRes.status).toBe(200);
  expect(detailRes.body.collectedAmount).toBe(45000);

  // ── Step 5: Participant status shows "onTime" ─────────────────────────
  const partListDetail = await authGet(org.token, `/api/funds/${fundId}/participants`);
  expect(partListDetail.status).toBe(200);
  const partEntry = partListDetail.body.find(p => p.user.email === 'luis@test.com');
  expect(partEntry.status).toBe('accepted');
  expect(partEntry.contributionStatus).toBe('onTime');

  // ── Step 6: Organizer edits fund name (allowed, no locked fields yet) ──
  const editRes = await authPatch(org.token, `/api/funds/${fundId}`, {
    name: 'Fondo Paseo Grupal — Actualizado',
  });
  expect(editRes.status).toBe(200);
  expect(editRes.body.name).toBe('Fondo Paseo Grupal — Actualizado');

  // locked fields cannot be changed after contributions
  const lockedEdit = await authPatch(org.token, `/api/funds/${fundId}`, {
    targetAmount: 999999,
  });
  expect(lockedEdit.status).toBe(422);
  expect(lockedEdit.body.field).toBe('targetAmount');

  // ── Step 7: Manual reminder ────────────────────────────────────────────
  const reminderRes = await authPost(org.token, `/api/funds/${fundId}/reminders`);
  expect(reminderRes.status).toBe(200);
  expect(typeof reminderRes.body.sent).toBe('number');

  // ── Step 8: Trigger payment → fund completed ──────────────────────────
  const payRes = await authPost(org.token, `/api/funds/${fundId}/payment`);
  expect(payRes.status).toBe(200);
  expect(payRes.body.fund.status).toBe('completed');
  expect(payRes.body.transaction.transactionId).toMatch(/^sim_/);
  expect(payRes.body.transaction.provider).toBe('simulation');

  // ── Step 9: Completed fund rejects mutations ──────────────────────────
  const closeAttempt = await authPost(org.token, `/api/funds/${fundId}/close`);
  expect(closeAttempt.status).toBe(422);

  const editAttempt = await authPatch(org.token, `/api/funds/${fundId}`, { name: 'X' });
  expect(editAttempt.status).toBe(422);

  const contribAttempt = await authPost(org.token, `/api/funds/${fundId}/contributions`, {
    amount: 1000, method: 'transfer',
  });
  expect(contribAttempt.status).toBe(403);

  // final state
  const finalDetail = await authGet(org.token, `/api/funds/${fundId}`);
  expect(finalDetail.body.status).toBe('completed');
  expect(finalDetail.body.collectedAmount).toBeGreaterThan(45000); // includes payout record
});
