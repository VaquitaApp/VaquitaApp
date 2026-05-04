/**
 * Suite de integración alineada a la HU: organizador invita / elimina participantes,
 * invitaciones con token, solicitudes de acceso a fondos públicos.
 *
 * Cada caso lleva ID TC-HU-PART-xxx documentado en docs/pruebas-hu-participantes-invitaciones.md
 */
const request = require('supertest');
const app = require('../../../src/app');
const Fund = require('../../../src/models/Fund');
const { connect, disconnect, clear } = require('../../helpers/db');
const { createUser, createFund, createContribution } = require('../../helpers/factories');

let organizer, participant, stranger, orgToken, partToken, fund;

async function login(user) {
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Password1!' });
  return res.body.token;
}

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => {
  await clear();
  organizer = await createUser({ email: 'hu-org@test.com', passwordHash: 'Password1!', name: 'Org HU' });
  participant = await createUser({ email: 'hu-part@test.com', passwordHash: 'Password1!', name: 'Part HU' });
  stranger = await createUser({ email: 'hu-stranger@test.com', passwordHash: 'Password1!' });
  orgToken = await login(organizer);
  partToken = await login(participant);
  fund = await createFund({
    organizer: organizer._id,
    status: 'active',
    visibility: 'public',
    deadline: new Date(Date.now() + 86400000 * 30),
  });
});

describe('HU participantes — invitaciones y acceso', () => {
  it('[TC-HU-PART-001] Solo el organizador puede invitar (no participante ajeno)', async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${partToken}`)
      .send({ userId: stranger._id.toString() });
    expect(res.status).toBe(403);
  });

  it('[TC-HU-PART-002] Solo el organizador puede eliminar participante', async () => {
    const inv = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    await request(app).post(`/api/invitations/${inv.body[0].invitationToken}/accept`);

    const res = await request(app)
      .delete(`/api/funds/${fund._id}/participants/${participant._id}`)
      .set('Authorization', `Bearer ${partToken}`);

    expect(res.status).toBe(403);
  });

  it('[TC-HU-PART-003] Búsqueda de usuarios por nombre o correo (API para el listado del modal)', async () => {
    const res = await request(app)
      .get('/api/users/search?q=Part%20HU')
      .set('Authorization', `Bearer ${orgToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some(u => u.email === 'hu-part@test.com')).toBe(true);
    const byEmail = await request(app)
      .get('/api/users/search?q=hu-part@test')
      .set('Authorization', `Bearer ${orgToken}`);
    expect(byEmail.status).toBe(200);
    expect(byEmail.body.some(u => u._id.toString() === participant._id.toString())).toBe(true);
  });

  it('[TC-HU-PART-004] Invitar crea participante pending con token de invitación', async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    expect(res.status).toBe(201);
    expect(res.body[0].status).toBe('pending');
    expect(res.body[0].invitationToken).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('[TC-HU-PART-005] Error al invitar expone mensaje claro en la respuesta (base para el UI)', async () => {
    await fund.updateOne({ status: 'closed' });
    const res = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    expect(res.status).toBe(422);
    expect(res.body.error).toBeTruthy();
    expect(String(res.body.error).length).toBeGreaterThan(3);
  });

  it('[TC-HU-PART-006] No invitar a usuario ya participante aceptado', async () => {
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

  it('[TC-HU-PART-007] Al aceptar invitación el usuario figura como participante aceptado', async () => {
    const inv = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    await request(app).post(`/api/invitations/${inv.body[0].invitationToken}/accept`);

    const list = await request(app)
      .get(`/api/funds/${fund._id}/participants`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(list.status).toBe(200);
    const row = list.body.find(p => p.user.email === 'hu-part@test.com');
    expect(row?.status).toBe('accepted');
  });

  it('[TC-HU-PART-008] Al rechazar no queda como participante aceptado', async () => {
    const inv = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    await request(app).post(`/api/invitations/${inv.body[0].invitationToken}/reject`);

    const list = await request(app)
      .get(`/api/funds/${fund._id}/participants`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(list.status).toBe(200);
    expect(list.body.filter(p => p.status === 'accepted' && p.user.email === 'hu-part@test.com')).toHaveLength(0);
    const row = list.body.find(p => p.user.email === 'hu-part@test.com');
    expect(row).toBeUndefined();
  });

  it('[TC-HU-PART-009] Reinvitar con invitación pendiente emite nuevo token (invalida el anterior)', async () => {
    const first = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    const t1 = first.body[0].invitationToken;

    const second = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });

    expect(second.status).toBe(200);
    expect(second.body[0].invitationToken).not.toBe(t1);

    const old = await request(app).post(`/api/invitations/${t1}/accept`);
    expect(old.status).toBe(404);

    const ok = await request(app).post(`/api/invitations/${second.body[0].invitationToken}/accept`);
    expect(ok.status).toBe(200);
  });

  it('[TC-HU-PART-010] Reinvitar tras rechazo mientras el fondo está activo', async () => {
    const inv = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    await request(app).post(`/api/invitations/${inv.body[0].invitationToken}/reject`);

    const res = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body[0].status).toBe('pending');
    expect(res.body[0].invitationToken).toBeDefined();
  });

  it('[TC-HU-PART-011] No aceptar invitación si el fondo está cerrado (mensaje 422)', async () => {
    const inv = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    const tok = inv.body[0].invitationToken;
    await fund.updateOne({ status: 'closed' });

    const res = await request(app).post(`/api/invitations/${tok}/accept`);
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/cerrado|completado/i);
  });

  it('[TC-HU-PART-012] No aceptar invitación si venció la fecha límite (mensaje 422)', async () => {
    const inv = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    const tok = inv.body[0].invitationToken;
    await fund.updateOne({ deadline: new Date(Date.now() - 86400000) });

    const res = await request(app).post(`/api/invitations/${tok}/accept`);
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/fecha|limite|superada/i);
  });

  it('[TC-HU-PART-013] No aceptar invitación si el fondo está completado', async () => {
    const inv = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    const tok = inv.body[0].invitationToken;
    await fund.updateOne({ status: 'completed' });

    const res = await request(app).post(`/api/invitations/${tok}/accept`);
    expect(res.status).toBe(422);
  });

  it('[TC-HU-PART-014] Reutilizar token tras aceptar responde 404 (recurso no encontrado / inválido)', async () => {
    const inv = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    const tok = inv.body[0].invitationToken;
    expect((await request(app).post(`/api/invitations/${tok}/accept`)).status).toBe(200);
    const again = await request(app).post(`/api/invitations/${tok}/accept`);
    expect(again.status).toBe(404);
  });

  it('[TC-HU-PART-014B] Reutilizar token tras rechazar invitación responde 404', async () => {
    const inv = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    const tok = inv.body[0].invitationToken;
    expect((await request(app).post(`/api/invitations/${tok}/reject`)).status).toBe(200);
    const again = await request(app).post(`/api/invitations/${tok}/reject`);
    expect(again.status).toBe(404);
  });

  it('[TC-HU-PART-015] Eliminar participante aceptado sin aportes exitosos (204)', async () => {
    const inv = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    await request(app).post(`/api/invitations/${inv.body[0].invitationToken}/accept`);

    const res = await request(app)
      .delete(`/api/funds/${fund._id}/participants/${participant._id}`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(204);
  });

  it('[TC-HU-PART-016] No eliminar participante con aporte succeeded (422 + mensaje)', async () => {
    const inv = await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });
    await request(app).post(`/api/invitations/${inv.body[0].invitationToken}/accept`);

    await createContribution({
      fund: fund._id,
      user: participant._id,
      status: 'succeeded',
      amount: 1000,
    });

    const res = await request(app)
      .delete(`/api/funds/${fund._id}/participants/${participant._id}`)
      .set('Authorization', `Bearer ${orgToken}`);

    expect(res.status).toBe(422);
    expect(res.body.error).toBeTruthy();
  });

  it('[TC-HU-PART-017] Solicitud de acceso en fondo público activo (201)', async () => {
    const res = await request(app)
      .post(`/api/funds/${fund._id}/access-requests`)
      .set('Authorization', `Bearer ${partToken}`);
    expect(res.status).toBe(201);
    const f = await Fund.findById(fund._id).lean();
    expect(f.accessRequests.some(r => r.status === 'pending' && r.user.toString() === participant._id.toString())).toBe(true);
  });

  it('[TC-HU-PART-018] Solicitud de acceso rechazada en fondo privado (403)', async () => {
    await fund.updateOne({ visibility: 'private' });
    const res = await request(app)
      .post(`/api/funds/${fund._id}/access-requests`)
      .set('Authorization', `Bearer ${partToken}`);
    expect(res.status).toBe(403);
  });

  it('[TC-HU-PART-019] Aceptar solicitud agrega participante accepted', async () => {
    await request(app)
      .post(`/api/funds/${fund._id}/access-requests`)
      .set('Authorization', `Bearer ${partToken}`);
    const f0 = await Fund.findById(fund._id).lean();
    const tok = f0.accessRequests.find(r => r.status === 'pending').token;

    const res = await request(app).post(`/api/fund-access/${tok}/accept`);
    expect(res.status).toBe(200);

    const f = await Fund.findById(fund._id).lean();
    const acc = f.participants.filter(
      p => p.user.toString() === participant._id.toString() && p.status === 'accepted',
    );
    expect(acc).toHaveLength(1);
  });

  it('[TC-HU-PART-020] Rechazar solicitud no agrega participante aceptado', async () => {
    await request(app)
      .post(`/api/funds/${fund._id}/access-requests`)
      .set('Authorization', `Bearer ${partToken}`);
    const f0 = await Fund.findById(fund._id).lean();
    const tok = f0.accessRequests.find(r => r.status === 'pending').token;

    expect((await request(app).post(`/api/fund-access/${tok}/reject`)).status).toBe(200);

    const f = await Fund.findById(fund._id).lean();
    const acc = f.participants.filter(
      p => p.user.toString() === participant._id.toString() && p.status === 'accepted',
    );
    expect(acc).toHaveLength(0);
  });

  it('[TC-HU-PART-021] Token de solicitud de acceso de un solo uso (404 al repetir)', async () => {
    await request(app)
      .post(`/api/funds/${fund._id}/access-requests`)
      .set('Authorization', `Bearer ${partToken}`);
    const f0 = await Fund.findById(fund._id).lean();
    const tok = f0.accessRequests.find(r => r.status === 'pending').token;

    expect((await request(app).post(`/api/fund-access/${tok}/accept`)).status).toBe(200);
    const again = await request(app).post(`/api/fund-access/${tok}/accept`);
    expect(again.status).toBe(404);
  });

  it('[TC-HU-PART-022] No solicitar acceso si ya hay invitación pendiente como participante', async () => {
    await request(app)
      .post(`/api/funds/${fund._id}/invitations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ userId: participant._id.toString() });

    const res = await request(app)
      .post(`/api/funds/${fund._id}/access-requests`)
      .set('Authorization', `Bearer ${partToken}`);

    expect(res.status).toBe(409);
  });

  it('[TC-HU-PART-023] Respuesta acceso con fondo cerrado (422)', async () => {
    await request(app)
      .post(`/api/funds/${fund._id}/access-requests`)
      .set('Authorization', `Bearer ${partToken}`);
    const f0 = await Fund.findById(fund._id).lean();
    const tok = f0.accessRequests.find(r => r.status === 'pending').token;
    await fund.updateOne({ status: 'closed' });

    const res = await request(app).post(`/api/fund-access/${tok}/accept`);
    expect(res.status).toBe(422);
  });
});