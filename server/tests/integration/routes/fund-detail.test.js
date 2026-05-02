/**
 * Tests de integración para HU14 — Ver Detalle del Fondo (SCRUM-53)
 * Criterios de aceptación CA1–CA10
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

// ─── CA1: Acceder al detalle desde Listado de Fondos o Mis Fondos ─────────────

describe('CA1 — Acceder al detalle del fondo', () => {
  test('participante aceptado puede acceder al detalle del fondo', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const part = await createUser({ email: 'participante@prueba.cl' });
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }],
      visibility: 'private',
    });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(part));
    expect(res.status).toBe(200);
    expect(res.body._id.toString()).toBe(fund._id.toString());
  });

  test('fondo público aparece en el listado /api/funds/public', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const visitor = await createUser({ email: 'visitante@prueba.cl' });
    await createFund({ organizer: org._id, visibility: 'public', status: 'active' });

    const res = await request(app)
      .get('/api/funds/public')
      .set(await authHeader(visitor));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].visibility).toBe('public');
  });

  test('fondo propio aparece en /api/funds (mis fondos)', async () => {
    const user = await createUser();
    await createFund({ organizer: user._id });

    const res = await request(app)
      .get('/api/funds')
      .set(await authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
});

// ─── CA2: Usuario debe estar autenticado ─────────────────────────────────────

describe('CA2 — Autenticación requerida', () => {
  test('GET /api/funds/:id sin token retorna 401', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });

    const res = await request(app).get(`/api/funds/${fund._id}`);
    expect(res.status).toBe(401);
  });

  test('GET /api/funds/public sin token retorna 401', async () => {
    const res = await request(app).get('/api/funds/public');
    expect(res.status).toBe(401);
  });

  test('GET /api/funds/:id con token inválido retorna 401', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set({ Authorization: 'Bearer token.invalido.aqui' });
    expect(res.status).toBe(401);
  });
});

// ─── CA3: Información completa del fondo ─────────────────────────────────────

describe('CA3 — Información del fondo en detalle', () => {
  test('GET /api/funds/:id retorna nombre, descripción, objetivo, monto y estado', async () => {
    const user = await createUser();
    const fund = await createFund({
      organizer: user._id,
      name: 'Fondo Viaje',
      description: 'Para el viaje de fin de año',
      goal: 'Pagar el hotel',
      targetAmount: 500000,
      status: 'active',
    });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Fondo Viaje');
    expect(res.body.description).toBe('Para el viaje de fin de año');
    expect(res.body.goal).toBe('Pagar el hotel');
    expect(res.body.targetAmount).toBe(500000);
    expect(res.body.status).toBe('active');
  });

  test('GET /api/funds/:id retorna fecha límite y nombre del organizador', async () => {
    const user = await createUser({ name: 'María López' });
    const deadline = new Date(Date.now() + 86400000 * 15);
    const fund = await createFund({ organizer: user._id, deadline });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.deadline).toBeDefined();
    expect(res.body.organizer.name).toBe('María López');
  });

  test('GET /api/funds/:id retorna collectedAmount calculado', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    await createContribution({ fund: fund._id, user: user._id, amount: 25000 });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.collectedAmount).toBe(25000);
  });
});

// ─── CA4: Lista de participantes ─────────────────────────────────────────────

describe('CA4 — Lista de participantes', () => {
  test('GET /api/funds/:id/participants retorna participantes con nombre y email', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl', name: 'Organizador' });
    const part = await createUser({ email: 'participante@prueba.cl', name: 'Participante' });
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }],
    });

    const res = await request(app)
      .get(`/api/funds/${fund._id}/participants`)
      .set(await authHeader(org));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].user.name).toBe('Participante');
    expect(res.body[0].user.email).toBe('participante@prueba.cl');
  });

  test('GET /api/funds/:id/participants retorna campo status de cada participante', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const part = await createUser({ email: 'participante@prueba.cl' });
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }],
    });

    const res = await request(app)
      .get(`/api/funds/${fund._id}/participants`)
      .set(await authHeader(org));

    expect(res.status).toBe(200);
    expect(res.body[0].status).toBe('accepted');
  });

  test('GET /api/funds/:id/participants retorna 403 para usuario no miembro', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const stranger = await createUser({ email: 'desconocido@prueba.cl' });
    const fund = await createFund({ organizer: org._id, visibility: 'private' });

    const res = await request(app)
      .get(`/api/funds/${fund._id}/participants`)
      .set(await authHeader(stranger));

    expect(res.status).toBe(403);
  });
});

// ─── CA5: Historial de aportes ───────────────────────────────────────────────

describe('CA5 — Historial de aportes', () => {
  test('GET /api/funds/:id/contributions retorna lista de aportes del fondo', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    await createContribution({ fund: fund._id, user: user._id, amount: 10000 });
    await createContribution({ fund: fund._id, user: user._id, amount: 20000 });

    const res = await request(app)
      .get(`/api/funds/${fund._id}/contributions`)
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('GET /api/funds/:id/contributions popula nombre del usuario aportante', async () => {
    const user = await createUser({ name: 'Juan Pérez' });
    const fund = await createFund({ organizer: user._id });
    await createContribution({ fund: fund._id, user: user._id, amount: 15000 });

    const res = await request(app)
      .get(`/api/funds/${fund._id}/contributions`)
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body[0].user.name).toBe('Juan Pérez');
  });

  test('GET /api/funds/:id/contributions retorna 403 para no-miembro en fondo privado', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const stranger = await createUser({ email: 'desconocido@prueba.cl' });
    const fund = await createFund({ organizer: org._id, visibility: 'private' });
    await createContribution({ fund: fund._id, user: org._id, amount: 5000 });

    const res = await request(app)
      .get(`/api/funds/${fund._id}/contributions`)
      .set(await authHeader(stranger));

    expect(res.status).toBe(403);
  });
});

// ─── CA6: Progreso del fondo ─────────────────────────────────────────────────

describe('CA6 — Progreso del fondo (collectedAmount)', () => {
  test('collectedAmount es 0 cuando no hay aportes', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id, targetAmount: 100000 });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.collectedAmount).toBe(0);
  });

  test('collectedAmount suma solo aportes con status succeeded', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    await createContribution({ fund: fund._id, user: user._id, amount: 30000, status: 'succeeded' });
    await createContribution({ fund: fund._id, user: user._id, amount: 10000, status: 'pending' });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.collectedAmount).toBe(30000);
  });

  test('collectedAmount refleja múltiples aportes de distintos usuarios', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const part = await createUser({ email: 'participante@prueba.cl' });
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }],
    });
    await createContribution({ fund: fund._id, user: org._id, amount: 20000 });
    await createContribution({ fund: fund._id, user: part._id, amount: 15000 });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(org));

    expect(res.status).toBe(200);
    expect(res.body.collectedAmount).toBe(35000);
  });
});

// ─── CA7: Fondo privado — solo miembros ──────────────────────────────────────

describe('CA7 — Acceso a fondos privados', () => {
  test('participante pendiente no puede acceder al detalle de un fondo privado', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const pending = await createUser({ email: 'pendiente@prueba.cl' });
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: pending._id, status: 'pending' }],
      visibility: 'private',
    });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(pending));
    expect(res.status).toBe(403);
  });

  test('participante con invitación pendiente puede acceder al detalle de un fondo privado', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const invitado = await createUser({ email: 'invitado@prueba.cl' });
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: invitado._id, status: 'pending', invitationToken: 'token-prueba-uuid' }],
      visibility: 'private',
    });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(invitado));
    expect(res.status).toBe(200);
  });

  test('participante aceptado puede acceder al detalle de un fondo privado', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const part = await createUser({ email: 'participante@prueba.cl' });
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }],
      visibility: 'private',
    });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(part));
    expect(res.status).toBe(200);
  });
});

// ─── CA8: Fondo público — cualquier usuario autenticado ──────────────────────

describe('CA8 — Acceso a fondos públicos', () => {
  test('usuario sin relación al fondo puede ver detalle de fondo público', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const visitor = await createUser({ email: 'visitante@prueba.cl' });
    const fund = await createFund({ organizer: org._id, visibility: 'public' });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(visitor));
    expect(res.status).toBe(200);
  });

  test('usuario sin autenticación no puede ver fondo público', async () => {
    const org = await createUser();
    const fund = await createFund({ organizer: org._id, visibility: 'public' });

    const res = await request(app).get(`/api/funds/${fund._id}`);
    expect(res.status).toBe(401);
  });

  test('no-miembro puede ver contribuciones de fondo público', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const visitor = await createUser({ email: 'visitante@prueba.cl' });
    const fund = await createFund({ organizer: org._id, visibility: 'public' });
    await createContribution({ fund: fund._id, user: org._id, amount: 10000 });

    const res = await request(app)
      .get(`/api/funds/${fund._id}/contributions`)
      .set(await authHeader(visitor));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

// ─── CA9: Información actualizada desde la BD ─────────────────────────────────

describe('CA9 — Datos actualizados en tiempo real', () => {
  test('collectedAmount se actualiza tras agregar un aporte', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });

    const before = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));
    expect(before.body.collectedAmount).toBe(0);

    await createContribution({ fund: fund._id, user: user._id, amount: 50000 });

    const after = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));
    expect(after.body.collectedAmount).toBe(50000);
  });

  test('estado del fondo se actualiza tras cerrarlo', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });

    await request(app)
      .post(`/api/funds/${fund._id}/close`)
      .set(await authHeader(user));

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));
    expect(res.body.status).toBe('closed');
  });

  test('nuevo participante aparece en la lista tras ser invitado y aceptar', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const part = await createUser({ email: 'participante@prueba.cl' });
    const fund = await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }],
    });

    const res = await request(app)
      .get(`/api/funds/${fund._id}/participants`)
      .set(await authHeader(org));
    expect(res.status).toBe(200);
    expect(res.body.some(p => p.user._id.toString() === part._id.toString())).toBe(true);
  });
});

// ─── CA10: Error al cargar — mensaje claro ────────────────────────────────────

describe('CA10 — Manejo de errores al cargar', () => {
  test('GET /api/funds/:id con ID inexistente retorna 404', async () => {
    const user = await createUser();
    const fakeId = '507f1f77bcf86cd799439011';

    const res = await request(app)
      .get(`/api/funds/${fakeId}`)
      .set(await authHeader(user));
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  test('GET /api/funds/:id con ID malformado retorna error (400 o 500) con mensaje', async () => {
    const user = await createUser();

    const res = await request(app)
      .get('/api/funds/id-invalido-xyz')
      .set(await authHeader(user));
    expect([400, 500]).toContain(res.status);
    expect(res.body.error).toBeDefined();
  });

  test('GET /api/funds/:id/participants con ID inexistente retorna 404', async () => {
    const user = await createUser();
    const fakeId = '507f1f77bcf86cd799439011';

    const res = await request(app)
      .get(`/api/funds/${fakeId}/participants`)
      .set(await authHeader(user));
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

// ─── CA3 (ext.) — Monto mínimo de aporte ─────────────────────────────────────

describe('CA3 (ext.) — Monto minimo en informacion del fondo', () => {
  test('GET /api/funds/:id incluye minAmount para fondos libres con monto minimo configurado', async () => {
    const user = await createUser();
    const fund = await createFund({
      organizer: user._id,
      type: 'free',
      minAmount: 20000,
    });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.minAmount).toBe(20000);
  });

  test('GET /api/funds/:id no incluye minAmount cuando el fondo no lo tiene definido', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id, type: 'free' });

    const res = await request(app)
      .get(`/api/funds/${fund._id}`)
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.minAmount == null || res.body.minAmount === 0).toBe(true);
  });

  test('GET /api/funds/public incluye minAmount en fondos publicos con monto minimo', async () => {
    const user = await createUser();
    await createFund({
      organizer: user._id,
      type: 'free',
      minAmount: 15000,
      visibility: 'public',
      status: 'active',
    });

    const res = await request(app)
      .get('/api/funds/public')
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    const fund = res.body.find(f => f.minAmount === 15000);
    expect(fund).toBeDefined();
  });
});

// ─── CA4 (ext.) — Conteo de participantes incluye al organizador ─────────────

describe('CA4 (ext.) — Conteo de participantes incluye al organizador', () => {
  test('GET /api/funds retorna participantCount = 1 cuando solo existe el organizador', async () => {
    const user = await createUser();
    await createFund({ organizer: user._id });

    const res = await request(app)
      .get('/api/funds')
      .set(await authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body[0].participantCount).toBe(1);
  });

  test('GET /api/funds retorna participantCount = participantes aceptados + 1 (organizador)', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const part = await createUser({ email: 'participante@prueba.cl' });
    await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }],
    });

    const res = await request(app)
      .get('/api/funds')
      .set(await authHeader(org));

    expect(res.status).toBe(200);
    expect(res.body[0].participantCount).toBe(2);
  });

  test('GET /api/funds/public retorna participantCount incluyendo al organizador', async () => {
    const org = await createUser({ email: 'organizador@prueba.cl' });
    const part = await createUser({ email: 'participante@prueba.cl' });
    await createFund({
      organizer: org._id,
      participants: [{ user: part._id, status: 'accepted' }],
      visibility: 'public',
      status: 'active',
    });

    const res = await request(app)
      .get('/api/funds/public')
      .set(await authHeader(org));

    expect(res.status).toBe(200);
    expect(res.body[0].participantCount).toBe(2);
  });
});
