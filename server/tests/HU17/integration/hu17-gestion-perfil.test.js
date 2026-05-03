/**
 * HU17: Gestión de Perfil de Usuario
 * Test Cases mapeados a Criterios de Aceptación (Backend)
 */
const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../helpers/db');
const { createUser } = require('../../helpers/factories');
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

describe('HU17: Gestión de Perfil — /api/auth/me & /api/users/profile', () => {

  // ─── CA1: Página muestra datos en solo lectura ──────────────
  test('TC-HU17-01 (CA1): Retorna la información de solo lectura del perfil (name, email, rut)', async () => {
    const user = await createUser({ 
      name: 'Usuario Lector', 
      email: 'lector@prueba.cl', 
      rut: '12345678-5' 
    });
    const token = generateAuthToken(user);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.name).toBe('Usuario Lector');
    expect(res.body.user.email).toBe('lector@prueba.cl');
    expect(res.body.user.rut).toBe('12345678-5'); // El frontend lo formatea a XX.XXX.XXX-X
  });

  // ─── CA2 y CA6: Usuario edita cuenta preferida y cambios se guardan ──────────────
  test('TC-HU17-02 (CA2/CA6): Permite actualizar la cuenta bancaria preferida exitosamente', async () => {
    const user = await createUser({ email: 'editor@prueba.cl', rut: '22222222-2' });
    const token = generateAuthToken(user);

    const newBankAccount = {
      bank: 'Banco Estado',
      accountType: 'corriente',
      accountNumber: '123456789'
    };

    const res = await request(app)
      .patch('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredAccount: newBankAccount });
      
    expect(res.status).toBe(200);
    expect(res.body.user.preferredAccount.bank).toBe('Banco Estado');
    expect(res.body.user.preferredAccount.accountType).toBe('corriente');
    expect(res.body.user.preferredAccount.accountNumber).toBe('123456789');

    // Verificamos que se guardó en la base de datos
    const dbUser = await User.findById(user._id);
    expect(dbUser.preferredAccount.accountNumber).toBe('123456789');
  });

  // ─── CA7: Número de cuenta solo acepta dígitos ──────────────
  test('TC-HU17-03 (CA7): Retorna 400 si el número de cuenta contiene letras o símbolos', async () => {
    const user = await createUser({ email: 'validador@prueba.cl', rut: '33333333-3' });
    const token = generateAuthToken(user);

    const invalidBankAccount = {
      bank: 'Banco Santander',
      accountType: 'vista',
      accountNumber: '12345ABC' // Inválido: Contiene letras
    };

    const res = await request(app)
      .patch('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredAccount: invalidBankAccount });
      
    // Esperamos que la API lo rechace por contener letras
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

});
