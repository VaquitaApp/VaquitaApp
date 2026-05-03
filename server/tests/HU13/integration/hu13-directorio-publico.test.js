/**
 * HU13: Listado de fondos públicos disponibles para ingresar
 * Criterios de aceptación — capa API (GET /api/funds/public, GET /api/funds/:id)
 *
 * IDs de caso: TC-HU13-xxx (coinciden con docs/pruebas-hu13-directorio-publico.md)
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

const futureDeadline = () => new Date(Date.now() + 86400000 * 30);

describe('HU13: Directorio público', () => {
  test('TC-HU13-01: GET /api/funds/public sin autenticación → 401', async () => {
    const res = await request(app).get('/api/funds/public');
    expect(res.status).toBe(401);
  });

  test('TC-HU13-02: Solo fondos visibility public y status active por defecto', async () => {
    const org = await createUser({ email: 'hu13-org1@prueba.cl' });
    const viewer = await createUser({ email: 'hu13-view1@prueba.cl' });
    await createFund({ organizer: org._id, visibility: 'public', status: 'active', name: 'Público Activo' });
    await createFund({ organizer: org._id, visibility: 'private', status: 'active', name: 'Privado' });
    await createFund({ organizer: org._id, visibility: 'public', status: 'closed', name: 'Público Cerrado' });

    const res = await request(app).get('/api/funds/public').set(await authHeader(viewer));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Público Activo');
    expect(res.body[0].visibility).toBe('public');
    expect(res.body[0].status).toBe('active');
  });

  test('TC-HU13-03: No lista fondos donde el usuario es organizador', async () => {
    const org = await createUser({ email: 'hu13-org2@prueba.cl' });
    await createFund({ organizer: org._id, visibility: 'public', status: 'active', name: 'Mi público' });

    const res = await request(app).get('/api/funds/public').set(await authHeader(org));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  test('TC-HU13-04: No lista fondos donde el usuario es participante accepted', async () => {
    const org = await createUser({ email: 'hu13-org3@prueba.cl' });
    const member = await createUser({ email: 'hu13-mem1@prueba.cl' });
    await createFund({
      organizer: org._id,
      visibility: 'public',
      status: 'active',
      name: 'Fondo grupo',
      participants: [{ user: member._id, status: 'accepted' }],
    });

    const res = await request(app).get('/api/funds/public').set(await authHeader(member));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  test('TC-HU13-05: Participante pending sí ve el fondo en el directorio', async () => {
    const org = await createUser({ email: 'hu13-org4@prueba.cl' });
    const pendingUser = await createUser({ email: 'hu13-pend@prueba.cl' });
    await createFund({
      organizer: org._id,
      visibility: 'public',
      status: 'active',
      name: 'Con invitación pendiente',
      participants: [{ user: pendingUser._id, status: 'pending' }],
    });

    const res = await request(app).get('/api/funds/public').set(await authHeader(pendingUser));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Con invitación pendiente');
  });

  test('TC-HU13-06: Filtro q por nombre (case-insensitive)', async () => {
    const org = await createUser({ email: 'hu13-org5@prueba.cl' });
    const viewer = await createUser({ email: 'hu13-view2@prueba.cl' });
    await createFund({ organizer: org._id, visibility: 'public', status: 'active', name: 'Viaje Curso 2026' });
    await createFund({ organizer: org._id, visibility: 'public', status: 'active', name: 'Otro nombre' });

    const res = await request(app)
      .get('/api/funds/public?q=viaje')
      .set(await authHeader(viewer));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toContain('Viaje');
  });

  test('TC-HU13-07: Filtro type=quota', async () => {
    const org = await createUser({ email: 'hu13-org6@prueba.cl' });
    const viewer = await createUser({ email: 'hu13-view3@prueba.cl' });
    const dl = futureDeadline();
    await createFund({ organizer: org._id, visibility: 'public', status: 'active', name: 'Libre', type: 'free' });
    await createFund({
      organizer: org._id,
      visibility: 'public',
      status: 'active',
      name: 'Cuotas',
      type: 'quota',
      quotaAmount: 10000,
      frequency: 'monthly',
      deadline: dl,
    });

    const res = await request(app).get('/api/funds/public?type=quota').set(await authHeader(viewer));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe('quota');
  });

  test('TC-HU13-08: Filtro type=free', async () => {
    const org = await createUser({ email: 'hu13-org7@prueba.cl' });
    const viewer = await createUser({ email: 'hu13-view4@prueba.cl' });
    const dl = futureDeadline();
    await createFund({ organizer: org._id, visibility: 'public', status: 'active', name: 'Solo libre', type: 'free' });
    await createFund({
      organizer: org._id,
      visibility: 'public',
      status: 'active',
      name: 'Cuotas 2',
      type: 'quota',
      quotaAmount: 5000,
      frequency: 'once',
      deadline: dl,
    });

    const res = await request(app).get('/api/funds/public?type=free').set(await authHeader(viewer));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe('free');
  });

  test('TC-HU13-09: Filtro status=paused', async () => {
    const org = await createUser({ email: 'hu13-org8@prueba.cl' });
    const viewer = await createUser({ email: 'hu13-view5@prueba.cl' });
    await createFund({ organizer: org._id, visibility: 'public', status: 'paused', name: 'Pausado' });

    const res = await request(app).get('/api/funds/public?status=paused').set(await authHeader(viewer));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('paused');
  });

  test('TC-HU13-10: Cada ítem incluye datos para tarjeta y enlace a detalle (name, goal, montos, deadline, _id)', async () => {
    const org = await createUser({ email: 'hu13-org9@prueba.cl' });
    const viewer = await createUser({ email: 'hu13-view6@prueba.cl' });
    const fund = await createFund({
      organizer: org._id,
      visibility: 'public',
      status: 'active',
      name: 'Fondo datos',
      goal: 'Objetivo visible',
      targetAmount: 500000,
    });
    await createContribution({ fund: fund._id, user: org._id, amount: 25000, status: 'succeeded' });

    const res = await request(app).get('/api/funds/public').set(await authHeader(viewer));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const row = res.body.find(f => f.name === 'Fondo datos');
    expect(row).toBeTruthy();
    expect(row.goal).toBe('Objetivo visible');
    expect(row.targetAmount).toBe(500000);
    expect(row.collectedAmount).toBe(25000);
    expect(row.deadline).toBeDefined();
    expect(row.status).toBe('active');
    expect(row._id).toBeDefined();
  });

  test('TC-HU13-11: Orden sort=deadline_desc', async () => {
    const org = await createUser({ email: 'hu13-org10@prueba.cl' });
    const viewer = await createUser({ email: 'hu13-view7@prueba.cl' });
    const d1 = new Date(Date.now() + 86400000 * 10);
    const d2 = new Date(Date.now() + 86400000 * 90);
    await createFund({ organizer: org._id, visibility: 'public', status: 'active', name: 'Cierra antes', deadline: d1 });
    await createFund({ organizer: org._id, visibility: 'public', status: 'active', name: 'Cierra después', deadline: d2 });

    const res = await request(app).get('/api/funds/public?sort=deadline_desc').set(await authHeader(viewer));
    expect(res.status).toBe(200);
    expect(res.body.map(f => f.name)).toEqual(['Cierra después', 'Cierra antes']);
  });

  test('TC-HU13-12: Usuario autenticado no miembro obtiene detalle GET /funds/:id en fondo público (200)', async () => {
    const org = await createUser({ email: 'hu13-org11@prueba.cl' });
    const stranger = await createUser({ email: 'hu13-str@prueba.cl' });
    const fund = await createFund({
      organizer: org._id,
      visibility: 'public',
      status: 'active',
      name: 'Detalle público',
    });

    const res = await request(app).get(`/api/funds/${fund._id}`).set(await authHeader(stranger));
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Detalle público');
    expect(res.body.visibility).toBe('public');
  });
});
