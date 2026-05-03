/**
 * HU09: Editar Fondo (Update)
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

describe('HU09: Editar Fondo — PATCH /api/funds/:id', () => {

  // ─── TC-HU09-01: Solo el organizador puede editar ────────────────
  test('TC-HU09-01: 403 si el usuario no es organizador', async () => {
    const u1 = await createUser({ email: 'u1@test.com' });
    const u2 = await createUser({ email: 'u2@test.com' });
    const fund = await createFund({ organizer: u1._id });
    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(u2))
      .send({ name: 'Hack' });
    expect(res.status).toBe(403);
  });

  // ─── TC-HU09-02: No se puede editar fondo cerrado/completado ─────
  test('TC-HU09-02: 422 si el fondo está cerrado', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id, status: 'closed' });
    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(user))
      .send({ name: 'X' });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/not active/i);
  });

  test('TC-HU09-02b: 422 si el fondo está completado', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id, status: 'completed' });
    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(user))
      .send({ name: 'X' });
    expect(res.status).toBe(422);
  });

  // ─── TC-HU09-03: Todos los campos editables sin aportes ──────────
  test('TC-HU09-03: Permite editar cualquier campo si no hay aportes', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(user))
      .send({ name: 'Nuevo nombre', targetAmount: 300000 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nuevo nombre');
    expect(res.body.targetAmount).toBe(300000);
  });

  // ─── TC-HU09-04: Campos bloqueados con aportes ───────────────────
  test('TC-HU09-04: 422 al editar targetAmount con aportes existentes', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    await createContribution({ fund: fund._id, user: user._id, status: 'succeeded' });

    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(user))
      .send({ targetAmount: 500000 });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/locked after contributions/i);
  });

  // ─── TC-HU09-05: Campos permitidos aún con aportes ───────────────
  test('TC-HU09-05: Permite editar nombre, descripción y visibilidad con aportes', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id, visibility: 'private' });
    await createContribution({ fund: fund._id, user: user._id, status: 'succeeded' });

    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(user))
      .send({ name: 'Actualizado', visibility: 'public' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Actualizado');
    expect(res.body.visibility).toBe('public');
  });

  // ─── TC-HU09-06: updateLog al cambiar descripción/objetivo ───────
  test('TC-HU09-06: Genera updateLog al cambiar descripción con invitados', async () => {
    const org = await createUser({ email: 'org@test.com' });
    const part = await createUser({ email: 'part@test.com' });
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }],
      description: 'Old desc',
      goal: 'Old goal',
    });

    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(org))
      .send({ description: 'New desc', goal: 'New goal' });

    expect(res.status).toBe(200);
    expect(res.body.description).toBe('New desc');
    expect(res.body.updateLogs.length).toBeGreaterThanOrEqual(1);
    const msgs = res.body.updateLogs.map(l => l.message.toLowerCase());
    expect(msgs.some(m => m.includes('descripción'))).toBe(true);
    expect(msgs.some(m => m.includes('objetivo'))).toBe(true);
  });

  // ─── TC-HU09-07: Aplazar fecha límite sin colapsar ───────────────
  test('TC-HU09-07: Aplaza deadline sin error (email asíncrono)', async () => {
    const org = await createUser({ email: 'org@test.com' });
    const part = await createUser({ email: 'part@test.com' });
    const originalDeadline = new Date(Date.now() + 86400000);
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }],
      deadline: originalDeadline.toISOString(),
    });

    const res = await request(app)
      .patch(`/api/funds/${fund._id}`)
      .set(await authHeader(org))
      .send({ deadline: new Date(Date.now() + 86400000 * 10).toISOString() });

    expect(res.status).toBe(200);
    expect(new Date(res.body.deadline).getTime()).toBeGreaterThan(originalDeadline.getTime());
  });
});
