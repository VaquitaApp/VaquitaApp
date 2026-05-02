/**
 * HU08: Ver Detalle y Progreso del Fondo (Read - Detalle)
 * Test Cases mapeados a Criterios de Aceptación
 */
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

describe('HU08: Ver Detalle y Progreso del Fondo — GET /api/funds/:id', () => {

  // ─── TC-HU08-01: Consultar fondo con aportes exitosos ────────────
  test('TC-HU08-01: collectedAmount refleja aportes reales', async () => {
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

  // ─── TC-HU08-02: Recaudación supera la meta sin romperse ─────────
  test('TC-HU08-02: Funciona cuando recaudación supera la meta', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id, targetAmount: 40000 });
    await createContribution({ fund: fund._id, user: user._id, amount: 50000 });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.collectedAmount).toBeGreaterThan(res.body.targetAmount);
  });

  // ─── TC-HU08-03: Fondo "quota" muestra frecuencia y estado ───────
  test('TC-HU08-03: Fondo "quota" retorna frecuencia y participantes', async () => {
    const org = await createUser({ email: 'org@test.com' });
    const part = await createUser({ email: 'part@test.com' });
    const fund = await createFund({
      organizer: org._id,
      type: 'quota',
      frequency: 'monthly',
      quotaAmount: 10000,
      participants: [{ user: part._id, status: 'accepted' }],
    });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(org));

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('quota');
    expect(res.body.frequency).toBe('monthly');
    expect(res.body.quotaAmount).toBe(10000);
    expect(res.body.participants).toHaveLength(1);
    expect(res.body.participants[0].status).toBe('accepted');
  });

  // ─── TC-HU08-04: Publicar mensaje en el muro ─────────────────────
  test('TC-HU08-04: Participante puede publicar mensaje', async () => {
    const org = await createUser({ email: 'org@test.com' });
    const part = await createUser({ email: 'part@test.com' });
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }],
    });

    const res = await request(app)
      .post(`/api/funds/${fund._id}/messages`)
      .set(await authHeader(part))
      .send({ text: 'Ya transferí' });

    expect(res.status).toBe(201);
    expect(res.body[0].text).toBe('Ya transferí');
  });

  // ─── TC-HU08-05: Usuario ajeno no puede comentar ─────────────────
  test('TC-HU08-05: Usuario ajeno recibe 403 al intentar comentar', async () => {
    const org = await createUser({ email: 'org@test.com' });
    const stranger = await createUser({ email: 'stranger@test.com' });
    const fund = await createFund({ organizer: org._id });

    const res = await request(app)
      .post(`/api/funds/${fund._id}/messages`)
      .set(await authHeader(stranger))
      .send({ text: 'Spam' });
    expect(res.status).toBe(403);
  });

  // ─── Extra: Mensajes se populan con nombre de usuario ─────────────
  test('Mensajes se populan con el nombre del usuario', async () => {
    const user = await createUser();
    const fund = await createFund({
      organizer: user._id,
      messages: [{ user: user._id, text: 'Hola a todos' }],
    });
    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.messages[0].user.name).toBe(user.name);
  });

  // ─── Extra: Visibilidad privada bloquea a usuarios ajenos ─────────
  test('403 para usuario ajeno en fondo privado', async () => {
    const u1 = await createUser({ email: 'u1@test.com' });
    const u2 = await createUser({ email: 'u2@test.com' });
    const fund = await createFund({ organizer: u1._id, visibility: 'private' });
    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(u2));
    expect(res.status).toBe(403);
  });

  // ─── Extra: Visibilidad pública permite acceso ────────────────────
  test('200 para usuario ajeno en fondo público', async () => {
    const u1 = await createUser({ email: 'u1@test.com' });
    const u2 = await createUser({ email: 'u2@test.com' });
    const fund = await createFund({ organizer: u1._id, visibility: 'public' });
    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(u2));
    expect(res.status).toBe(200);
  });

  // ─── Extra: collectedAmount es 0 cuando no hay aportes ────────────
  test('collectedAmount es 0 cuando no hay aportes', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.collectedAmount).toBe(0);
  });
});
