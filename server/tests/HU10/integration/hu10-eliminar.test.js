/**
 * HU10: Eliminar / Cancelar Fondo (Delete)
 * Test Cases mapeados a Criterios de Aceptación
 */
const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../helpers/db');
const { createUser, createFund, createContribution } = require('../../helpers/factories');
const Fund = require('../../../src/models/Fund');
const { ERR_CANNOT_DELETE_WITH_CONTRIBS } = require('../../../src/errors');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

async function authHeader(user) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: 'password123' });
  return { Authorization: `Bearer ${res.body.token}` };
}

describe('HU10: Eliminar / Cancelar Fondo — DELETE /api/funds/:id', () => {

  // ─── TC-HU10-01: Eliminar fondo sin aportes ──────────────────────
  test('TC-HU10-01: 204 elimina fondo sin aportes y el documento desaparece de la BD', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    const res = await request(app)
      .delete(`/api/funds/${fund._id}`)
      .set(await authHeader(user));
    expect(res.status).toBe(204);
    // Confirmar el efecto destructivo: ya no existe en la BD
    expect(await Fund.findById(fund._id)).toBeNull();
  });

  // ─── TC-HU10-02: No se puede eliminar con aportes ────────────────
  test('TC-HU10-02: 422 si el fondo tiene aportes recaudados', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    await createContribution({ fund: fund._id, user: user._id, status: 'succeeded' });

    const res = await request(app)
      .delete(`/api/funds/${fund._id}`)
      .set(await authHeader(user));
    expect(res.status).toBe(422);
    expect(res.body.error).toBe(ERR_CANNOT_DELETE_WITH_CONTRIBS);
  });

  // ─── TC-HU10-03: Eliminar fondo con participantes (email) ────────
  test('TC-HU10-03: 204 elimina fondo con participantes invitados (sin aportes); documento desaparece', async () => {
    const org = await createUser({ email: 'org@test.com' });
    const part = await createUser({ email: 'part@test.com' });
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }],
    });

    const res = await request(app)
      .delete(`/api/funds/${fund._id}`)
      .set(await authHeader(org));
    expect(res.status).toBe(204);
    expect(await Fund.findById(fund._id)).toBeNull();
  });

  // ─── Extra: 403 si no es organizador ──────────────────────────────
  test('403 si no es organizador', async () => {
    const u1 = await createUser({ email: 'u1@test.com' });
    const u2 = await createUser({ email: 'u2@test.com' });
    const fund = await createFund({ organizer: u1._id });
    const res = await request(app)
      .delete(`/api/funds/${fund._id}`)
      .set(await authHeader(u2));
    expect(res.status).toBe(403);
  });
});

describe('HU10: Pausar / Reanudar Fondo', () => {

  // ─── TC-HU10-04: Pausar un fondo activo ──────────────────────────
  test('TC-HU10-04: 200 pausa un fondo activo', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id, status: 'active' });

    const res = await request(app)
      .post(`/api/funds/${fund._id}/pause`)
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('paused');
  });

  // ─── TC-HU10-05: Reanudar un fondo pausado ───────────────────────
  test('TC-HU10-05: 200 reanuda un fondo pausado', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id, status: 'paused' });

    const res = await request(app)
      .post(`/api/funds/${fund._id}/resume`)
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
  });
});

describe('HU10: Cerrar Fondo — POST /api/funds/:id/close', () => {

  test('Cierra un fondo activo correctamente', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    const res = await request(app)
      .post(`/api/funds/${fund._id}/close`)
      .set(await authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('closed');
  });

  test('422 si el fondo ya está cerrado', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id, status: 'closed' });
    const res = await request(app)
      .post(`/api/funds/${fund._id}/close`)
      .set(await authHeader(user));
    expect(res.status).toBe(422);
  });
});
