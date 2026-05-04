/**
 * HU07: Visualizar Mis Fondos
 * Test Cases mapeados a Criterios de Aceptación (Backend)
 */
const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../helpers/db');
const { createUser, createFund, createContribution } = require('../../helpers/factories');
const Fund = require('../../../src/models/Fund');
const jwt = require('jsonwebtoken');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

function generateAuthToken(user) {
  return jwt.sign(
    { sub: user._id, email: user.email },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );
}

describe('HU07: Visualizar Mis Fondos — GET /api/funds', () => {

  // ─── CA7: Lista únicamente fondos donde es organizador o participante ──────────────
  test('TC-HU07-01 (CA7): Devuelve solo los fondos donde el usuario es organizador o participante aceptado', async () => {
    const user1 = await createUser({ email: 'user1@prueba.cl', rut: '11111111-1' });
    const user2 = await createUser({ email: 'user2@prueba.cl', rut: '22222222-2' });
    
    // Fondo 1: user1 es organizador
    await createFund({ name: 'Fondo Propio', organizer: user1._id });
    
    // Fondo 2: user2 es organizador, user1 es participante aceptado
    const fund2 = await createFund({ name: 'Fondo Participando', organizer: user2._id });
    fund2.participants.push({ user: user1._id, role: 'member', status: 'accepted' });
    await fund2.save();

    // Fondo 3: user2 es organizador, user1 es participante PENDIENTE
    const fund3 = await createFund({ name: 'Fondo Pendiente', organizer: user2._id });
    fund3.participants.push({ user: user1._id, role: 'member', status: 'pending' });
    await fund3.save();

    // Fondo 4: user2 es organizador, user1 NO tiene relación
    await createFund({ name: 'Fondo Ajeno', organizer: user2._id, visibility: 'public' });

    const token = generateAuthToken(user1);
    const res = await request(app)
      .get('/api/funds')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    // Solo debe devolver 'Fondo Propio' y 'Fondo Participando'
    expect(res.body.length).toBe(2);
    const names = res.body.map(f => f.name);
    expect(names).toContain('Fondo Propio');
    expect(names).toContain('Fondo Participando');
    expect(names).not.toContain('Fondo Pendiente');
    expect(names).not.toContain('Fondo Ajeno');
  });

  // ─── CA1, CA3 y CA8: Muestra lista de fondos con nombre, objetivo, fechas y estados ──────────────
  test('TC-HU07-02 (CA1/CA3/CA8): Cada fondo incluye nombre, objetivo, deadline, estado (activo/cerrado)', async () => {
    const user = await createUser({ email: 'info@prueba.cl', rut: '33333333-3' });
    
    await createFund({ 
      name: 'Fondo Activo', 
      goal: 'Objetivo A', 
      deadline: new Date(Date.now() + 86400000 * 5),
      status: 'active',
      organizer: user._id 
    });
    
    await createFund({ 
      name: 'Fondo Cerrado', 
      goal: 'Objetivo C', 
      deadline: new Date(Date.now() - 86400000 * 5),
      status: 'closed',
      organizer: user._id 
    });

    const token = generateAuthToken(user);
    const res = await request(app)
      .get('/api/funds')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    
    // Verificamos que contenga las propiedades necesarias
    res.body.forEach(f => {
      expect(f.name).toBeDefined();
      expect(f.goal).toBeDefined();
      expect(f.deadline).toBeDefined();
      expect(['active', 'closed', 'completed', 'paused']).toContain(f.status);
    });

    const statuses = res.body.map(f => f.status);
    expect(statuses).toContain('active');
    expect(statuses).toContain('closed');
  });

  // ─── CA2: Mostrar monto total aportado por fondo ──────────────
  test('TC-HU07-03 (CA2): El objeto del fondo incluye el collectedAmount (monto total aportado)', async () => {
    const user = await createUser({ email: 'aportes@prueba.cl', rut: '44444444-4' });
    const fund = await createFund({ organizer: user._id });

    // Agregamos aportes exitosos al fondo
    await createContribution({ fund: fund._id, user: user._id, amount: 15000, status: 'succeeded' });
    await createContribution({ fund: fund._id, user: user._id, amount: 5000, status: 'succeeded' });
    // Aporte fallido que no debe sumar
    await createContribution({ fund: fund._id, user: user._id, amount: 10000, status: 'failed' });

    const token = generateAuthToken(user);
    const res = await request(app)
      .get('/api/funds')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    
    // Debería sumar 15000 + 5000 = 20000
    expect(res.body[0].collectedAmount).toBe(20000);
  });

  // ─── CA5: Si no hay fondos, mostrar mensaje informando ──────────────
  test('TC-HU07-04 (CA5): Devuelve arreglo vacío si el usuario no tiene fondos', async () => {
    const user = await createUser({ email: 'vacio@prueba.cl', rut: '55555555-5' });
    // No creamos ningún fondo para este usuario

    const token = generateAuthToken(user);
    const res = await request(app)
      .get('/api/funds')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

});
