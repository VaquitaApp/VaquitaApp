/**
 * HU18: Eliminación de Cuenta de Usuario
 * Test Cases mapeados a Criterios de Aceptación (Backend)
 */
const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../helpers/db');
const { createUser, createFund } = require('../../helpers/factories');
const User = require('../../../src/models/User');
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

describe('HU18: Eliminación de Cuenta — /api/users/request-delete & /api/users/confirm-delete/:token', () => {

  // ─── CA2: Rechaza si es organizador o participante en un fondo ──────────────
  test('TC-HU18-01 (CA2): Rechaza solicitud si el usuario es organizador de un fondo', async () => {
    const user = await createUser({ email: 'org1@prueba.cl', rut: '11111111-1' });
    const token = generateAuthToken(user);
    
    // Crear un fondo donde el usuario sea organizador
    await createFund({ organizer: user._id });

    const res = await request(app)
      .post('/api/users/request-delete')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/organizador/i);
  });

  test('TC-HU18-01b (CA2): Rechaza solicitud si el usuario es participante aceptado de un fondo (no organizador)', async () => {
    // El organizador es otro usuario; el usuario bajo prueba es SOLO participante aceptado.
    // Setup limpio: la validación de "organizador" no aplica y el rechazo proviene
    // estrictamente de la validación "participante".
    const orgUser = await createUser({ email: 'org-host@prueba.cl', rut: '11111111-1' });
    const partUser = await createUser({ email: 'part-only@prueba.cl', rut: '33333333-3' });
    const partToken = generateAuthToken(partUser);

    const fund = await createFund({ organizer: orgUser._id });
    fund.participants = [{ user: partUser._id, role: 'member', status: 'accepted' }];
    await fund.save();

    const res = await request(app)
      .post('/api/users/request-delete')
      .set('Authorization', `Bearer ${partToken}`);

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/participante/i);
  });

  // ─── CA4: Sistema genera token y envía email de confirmación ──────────────
  test('TC-HU18-02 (CA4): Genera token de eliminación para usuario sin dependencias', async () => {
    const user = await createUser({ email: 'limpio@prueba.cl', rut: '44444444-4' });
    const token = generateAuthToken(user);

    const res = await request(app)
      .post('/api/users/request-delete')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
    
    // Verificamos que se generó un deleteAccountToken en la base de datos
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.deleteAccountToken).toBeDefined();
    expect(updatedUser.deleteAccountToken).not.toBeNull();
  });

  // ─── CA5 y CA6: Enlace de confirmación no requiere auth y elimina permanentemente ──
  test('TC-HU18-03 (CA5/CA6): Elimina permanentemente la cuenta con token válido sin auth', async () => {
    // Creamos usuario con un token de eliminación pre-generado
    const deleteToken = 'un-token-muy-seguro-123';
    const user = await createUser({ 
      email: 'eliminar@prueba.cl', 
      rut: '55555555-5',
      deleteAccountToken: deleteToken
    });

    // Llamamos al endpoint GET de confirmación SIN cabecera Authorization (CA5)
    const res = await request(app)
      .get(`/api/users/confirm-delete/${deleteToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminada/i);
    
    // Verificamos que el usuario ya no existe en la BD (CA6)
    const deletedUser = await User.findById(user._id);
    expect(deletedUser).toBeNull();
  });

  // ─── CA8: Token inválido o ya utilizado muestra mensaje de error ──────────────
  test('TC-HU18-04 (CA8): Rechaza eliminación con token inválido o falso', async () => {
    const res = await request(app)
      .get('/api/users/confirm-delete/token-que-no-existe-999');
      
    // Esperamos 404 Not Found según la lógica de users.js
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

});
