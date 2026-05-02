const request = require('supertest');
const app = require('../../../src/app');
const { connect, disconnect, clear } = require('../../helpers/db');
const { createUser, createFund, createContribution } = require('../../helpers/factories');

let organizer, participant, orgToken, partToken, fund;

async function login(user) {
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Password1!' });
  return res.body.token;
}

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => {
  await clear();
  organizer   = await createUser({ email: 'organizador@prueba.cl',  passwordHash: 'Password1!' });
  participant = await createUser({ email: 'participante@prueba.cl', passwordHash: 'Password1!', name: 'Participante' });
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
    expect(res.body[0].user.email).toBe('participante@prueba.cl');
  });

  it('returns 200 with new token when re-inviting pending user', async () => {
    const first = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    expect(first.status).toBe(201);
    const token1 = first.body[0].invitationToken;

    const second = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });

    expect(second.status).toBe(200);
    expect(second.body).toHaveLength(1);
    expect(second.body[0].invitationToken).toBeDefined();
    expect(second.body[0].invitationToken).not.toBe(token1);
  });

  it('returns 409 if user already accepted participant', async () => {
    const inv = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    await request(app).post(`/api/invitations/${inv.body[0].invitationToken}/accept`);

    const res = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already a participant/i);
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
    expect(res.body.error).toMatch(/fecha.*l[ií]mite|vencido/i);
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

  it('cancela la invitación (elimina entrada del participante)', async () => {
    const res = await request(app).post(`/api/invitations/${token}/reject`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cancelada/i);
    const updated = await require('../../../src/models/Fund').findById(fund._id);
    const still = updated.participants.find(p => p.invitationToken === token);
    expect(still).toBeUndefined();
  });

  it('returns 422 if fund is closed', async () => {
    await fund.updateOne({ status: 'closed' });
    const res = await request(app).post(`/api/invitations/${token}/accept`);
    expect(res.status).toBe(422);
  });

  it('returns 404 for invalid token', async () => {
    const res = await request(app).post('/api/invitations/token-invalido/accept');
    expect(res.status).toBe(404);
  });

  it('token es invalidado tras usarse (no reutilizable)', async () => {
    await request(app).post(`/api/invitations/${token}/accept`);
    const res = await request(app).post(`/api/invitations/${token}/accept`);
    expect(res.status).toBe(404);
  });

  it('returns 404 when accepting the same invitation token twice', async () => {
    const first = await request(app).post(`/api/invitations/${token}/accept`);
    expect(first.status).toBe(200);
    const again = await request(app).post(`/api/invitations/${token}/accept`);
    expect(again.status).toBe(404);
  });

  it('returns 404 when rejecting the same invitation token twice', async () => {
    const first = await request(app).post(`/api/invitations/${token}/reject`);
    expect(first.status).toBe(200);
    const again = await request(app).post(`/api/invitations/${token}/reject`);
    expect(again.status).toBe(404);
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
    expect(res.body[0].contributionStatus).toBe('overdue');
    expect(res.body[0].user.email).toBeDefined();
  });

  it('returns 403 for non-member', async () => {
    const desconocido = await createUser({ email: 'desconocido@prueba.cl', passwordHash: 'Password1!' });
    const desconocidoToken = await login(desconocido);

    const res = await request(app)
      .get(`/api/funds/${fund._id}/participants`)
      .set('Authorization', `Bearer ${desconocidoToken}`);

    expect(res.status).toBe(403);
  });
});

// ── Join requests ─────────────────────────────────────────────────────────────

describe('POST /api/funds/:id/join-request', () => {
  let publicFund, requester, requesterToken;

  beforeEach(async () => {
    requester      = await createUser({ email: 'solicitante@prueba.cl', passwordHash: 'Password1!' });
    requesterToken = await login(requester);
    publicFund = await createFund({
      organizer:  organizer._id,
      status:     'active',
      visibility: 'public',
      deadline:   new Date(Date.now() + 86400000 * 30),
    });
  });

  it('201 envia solicitud al organizador', async () => {
    const res = await request(app)
      .post(`/api/funds/${publicFund._id}/join-request`)
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/solicitud/i);
  });

  it('403 si el fondo es privado', async () => {
    const privateFund = await createFund({ organizer: organizer._id, status: 'active', visibility: 'private' });
    const res = await request(app)
      .post(`/api/funds/${privateFund._id}/join-request`)
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(403);
  });

  it('422 si el fondo no esta activo', async () => {
    await publicFund.updateOne({ status: 'closed' });
    const res = await request(app)
      .post(`/api/funds/${publicFund._id}/join-request`)
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(422);
  });

  it('422 si el organizador intenta unirse a su propio fondo', async () => {
    const res = await request(app)
      .post(`/api/funds/${publicFund._id}/join-request`)
      .set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(422);
  });

  it('409 si el usuario ya es participante aceptado', async () => {
    await publicFund.updateOne({ $push: { participants: { user: requester._id, status: 'accepted' } } });
    const res = await request(app)
      .post(`/api/funds/${publicFund._id}/join-request`)
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(409);
  });

  it('409 si el usuario ya tiene invitacion pendiente del organizador', async () => {
    await request(app)
      .post(`/api/funds/${publicFund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: requester._id.toString() });

    const res = await request(app)
      .post(`/api/funds/${publicFund._id}/join-request`)
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/invitaci[oó]n pendiente/i);
  });

  it('201 nueva solicitud invalida la anterior (nuevo token)', async () => {
    await request(app)
      .post(`/api/funds/${publicFund._id}/join-request`)
      .set('Authorization', `Bearer ${requesterToken}`);

    const res = await request(app)
      .post(`/api/funds/${publicFund._id}/join-request`)
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(201);
  });
});

describe('POST /api/join-requests/:token/accept y reject', () => {
  const Fund = require('../../../src/models/Fund');
  let publicFund, requester, requesterToken, joinToken;

  beforeEach(async () => {
    requester      = await createUser({ email: 'solicitante2@prueba.cl', passwordHash: 'Password1!' });
    requesterToken = await login(requester);
    publicFund = await createFund({
      organizer:  organizer._id,
      status:     'active',
      visibility: 'public',
      deadline:   new Date(Date.now() + 86400000 * 30),
    });
    await request(app)
      .post(`/api/funds/${publicFund._id}/join-request`)
      .set('Authorization', `Bearer ${requesterToken}`);
    const updated = await Fund.findById(publicFund._id);
    const p = updated.participants.find(p => p.user.equals(requester._id));
    joinToken = p.joinRequestToken;
  });

  it('accept actualiza estado a accepted', async () => {
    const res = await request(app).post(`/api/join-requests/${joinToken}/accept`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/aceptada/i);
    const updated = await Fund.findById(publicFund._id);
    const p = updated.participants.find(p => p.user.equals(requester._id));
    expect(p.status).toBe('accepted');
  });

  it('cancela la solicitud (elimina entrada del participante)', async () => {
    const res = await request(app).post(`/api/join-requests/${joinToken}/reject`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cancelada/i);
    const updated = await Fund.findById(publicFund._id);
    const p = updated.participants.find(p => p.user.equals(requester._id));
    expect(p).toBeUndefined();
  });

  it('404 para token invalido', async () => {
    const res = await request(app).post('/api/join-requests/token-invalido/accept');
    expect(res.status).toBe(404);
  });

  it('token es invalidado tras usarse (no reutilizable)', async () => {
    await request(app).post(`/api/join-requests/${joinToken}/accept`);
    const res = await request(app).post(`/api/join-requests/${joinToken}/accept`);
    expect(res.status).toBe(404);
  });
});

// ── Mora reminders ────────────────────────────────────────────────────────────

describe('POST /api/funds/:id/reminders?filter=overdue', () => {
  let quotaFund, onTimePart, overduePart, onTimeToken, overdueToken;

  beforeEach(async () => {
    onTimePart  = await createUser({ email: 'ontime@prueba.cl',  passwordHash: 'Password1!', name: 'OnTime' });
    overduePart = await createUser({ email: 'overdue@prueba.cl', passwordHash: 'Password1!', name: 'Overdue' });
    onTimeToken  = await login(onTimePart);
    overdueToken = await login(overduePart);

    quotaFund = await createFund({
      organizer: organizer._id,
      status: 'active',
      type: 'quota',
      frequency: 'monthly',
      quotaAmount: 10000,
      deadline: new Date(Date.now() + 86400000 * 60),
    });
    await quotaFund.updateOne({
      $push: {
        participants: [
          { user: onTimePart._id,  status: 'accepted' },
          { user: overduePart._id, status: 'accepted' },
        ],
      },
    });
    // onTimePart pagó exactamente 1 cuota → pendingQuotas = max(0, 1-1) = 0 → al día
    // overduePart no tiene aportes → pendingQuotas = max(0, 1-0) = 1 → en mora
    await createContribution({ fund: quotaFund._id, user: onTimePart._id, amount: 10000 });
  });

  it('envia alerta solo a participantes en mora (fondo quota)', async () => {
    const res = await request(app)
      .post(`/api/funds/${quotaFund._id}/reminders?filter=overdue`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(1);
  });

  it('envia alerta a participantes sin aportes en fondo libre', async () => {
    const freeFund = await createFund({
      organizer: organizer._id,
      status: 'active',
      type: 'free',
      deadline: new Date(Date.now() + 86400000 * 60),
    });
    await freeFund.updateOne({
      $push: {
        participants: [
          { user: onTimePart._id,  status: 'accepted' },
          { user: overduePart._id, status: 'accepted' },
        ],
      },
    });
    // onTimePart tiene un aporte → al día; overduePart no → en mora
    await createContribution({ fund: freeFund._id, user: onTimePart._id });

    const res = await request(app)
      .post(`/api/funds/${freeFund._id}/reminders?filter=overdue`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(1);
  });

  it('sin filter envia a todos los participantes aceptados', async () => {
    const res = await request(app)
      .post(`/api/funds/${quotaFund._id}/reminders`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(2);
  });

  it('403 si el llamante no es organizador', async () => {
    const res = await request(app)
      .post(`/api/funds/${quotaFund._id}/reminders?filter=overdue`)
      .set('Authorization', `Bearer ${overdueToken}`);

    expect(res.status).toBe(403);
  });
});

// ── Accept my invitation ──────────────────────────────────────────────────────

describe('POST /api/funds/:id/accept-my-invitation', () => {
  beforeEach(async () => {
    await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
  });

  it('200 acepta la invitación del participante autenticado', async () => {
    const Fund = require('../../../src/models/Fund');
    const res = await request(app)
      .post(`/api/funds/${fund._id}/accept-my-invitation`)
      .set('Authorization', `Bearer ${partToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/aceptada/i);

    const updated = await Fund.findById(fund._id);
    const p = updated.participants.find(p => p.user.equals(participant._id));
    expect(p.status).toBe('accepted');
    expect(p.invitationToken).toBeUndefined();
  });

  it('404 si el usuario no tiene invitación pendiente', async () => {
    const otro = await createUser({ email: 'otro@prueba.cl', passwordHash: 'Password1!' });
    const otroToken = await login(otro);

    const res = await request(app)
      .post(`/api/funds/${fund._id}/accept-my-invitation`)
      .set('Authorization', `Bearer ${otroToken}`);

    expect(res.status).toBe(404);
  });

  it('422 si el fondo no está activo', async () => {
    await fund.updateOne({ status: 'closed' });

    const res = await request(app)
      .post(`/api/funds/${fund._id}/accept-my-invitation`)
      .set('Authorization', `Bearer ${partToken}`);

    expect(res.status).toBe(422);
  });

  it('GET /participants incluye hasInvitation para invitados pendientes', async () => {
    const res = await request(app)
      .get(`/api/funds/${fund._id}/participants`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    const pending = res.body.find(p => p.user._id === participant._id.toString());
    expect(pending.hasInvitation).toBe(true);
  });
});

// ── User search ───────────────────────────────────────────────────────────────

describe('GET /api/users/search', () => {
  it('returns matching users, excludes self', async () => {
    const res = await request(app)
      .get('/api/users/search?q=Parti')
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.every(u => u.email !== 'organizador@prueba.cl')).toBe(true);
  });

  it('returns empty array for short query', async () => {
    const res = await request(app)
      .get('/api/users/search?q=P')
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});
