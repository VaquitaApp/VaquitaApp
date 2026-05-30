/**
 * Tests UNIQUE no cubiertos por archivos TC-mapeados:
 *  - POST /api/funds/:id/reminders (alertas manuales de mora)
 *  - POST /api/funds/:id/accept-my-invitation (atajo sin token vía email)
 *  - POST /api/join-requests/:token/accept|reject (endpoint de tokens de join-request)
 *
 * Tests CRUD de invitaciones, participantes, búsqueda de usuarios y access-requests
 * estaban duplicados y se eliminaron — ahora viven solo en:
 *  - HU11/hu-participantes-invitaciones-acceso.test.js (TC-HU-PART-NNN)
 *  - HU11/fundAccess.test.js (POST /api/fund-access/:token/*)
 *  - HU14/fund-detail.test.js (GET /:id/participants)
 */
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

// ── POST /api/join-requests/:token/accept y reject ────────────────────────────
// Distinto del endpoint /api/fund-access cubierto por fundAccess.test.js: este
// usa el token generado por POST /api/funds/:id/join-request.

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

  it('404 para token inválido', async () => {
    const res = await request(app).post('/api/join-requests/token-invalido/accept');
    expect(res.status).toBe(404);
  });

  it('token es invalidado tras usarse (no reutilizable)', async () => {
    await request(app).post(`/api/join-requests/${joinToken}/accept`);
    const res = await request(app).post(`/api/join-requests/${joinToken}/accept`);
    expect(res.status).toBe(404);
  });
});

// ── POST /:id/reminders (alertas manuales de mora) ───────────────────────────

describe('POST /api/funds/:id/reminders', () => {
  let quotaFund, onTimePart, overduePart, overdueToken;

  beforeEach(async () => {
    onTimePart  = await createUser({ email: 'ontime@prueba.cl',  passwordHash: 'Password1!', name: 'OnTime' });
    overduePart = await createUser({ email: 'overdue@prueba.cl', passwordHash: 'Password1!', name: 'Overdue' });
    overdueToken = await login(overduePart);

    quotaFund = await createFund({
      organizer: organizer._id,
      status: 'active',
      type: 'quota', totalQuotas: 12,
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
    // onTimePart pagó 1 cuota → al día; overduePart sin aportes → en mora
    await createContribution({ fund: quotaFund._id, user: onTimePart._id, amount: 10000 });
  });

  it('envía alerta solo a participantes en mora (fondo quota)', async () => {
    const res = await request(app)
      .post(`/api/funds/${quotaFund._id}/reminders?filter=overdue`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(1);
  });

  it('envía alerta a participantes sin aportes en fondo libre', async () => {
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
    await createContribution({ fund: freeFund._id, user: onTimePart._id });

    const res = await request(app)
      .post(`/api/funds/${freeFund._id}/reminders?filter=overdue`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(1);
  });

  it('403 si el llamante no es organizador', async () => {
    const res = await request(app)
      .post(`/api/funds/${quotaFund._id}/reminders?filter=overdue`)
      .set('Authorization', `Bearer ${overdueToken}`);

    expect(res.status).toBe(403);
  });
});

// ── POST /:id/accept-my-invitation ───────────────────────────────────────────

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
