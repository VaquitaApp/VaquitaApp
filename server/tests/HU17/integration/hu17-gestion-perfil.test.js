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

  // ─── CA1: Página muestra datos del perfil ──────────────
  test('TC-HU17-01a (CA1): GET /api/auth/me retorna name, email, rut', async () => {
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
    expect(res.body.user.rut).toBe('12345678-5');
  });

  // ─── CA1 (propiedad activa): email y rut son de solo lectura ──────────────
  // Verificación efectiva de la regla: aunque el body del PATCH incluya email/rut,
  // el server debe ignorarlos y la BD debe conservar los valores originales.
  test('TC-HU17-01b (CA1): PATCH /api/users/profile NO modifica email ni rut aunque vengan en el body', async () => {
    const user = await createUser({
      name: 'Lector Original',
      email: 'lector-orig@prueba.cl',
      rut: '12345678-5'
    });
    const token = generateAuthToken(user);

    const res = await request(app)
      .patch('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'hackeado@prueba.cl',
        rut: '99999999-9',
        name: 'Lector Cambiado', // name SÍ es editable, control positivo
      });

    expect(res.status).toBe(200);

    // Verificación en BD: email/rut intactos, name actualizado
    const dbUser = await User.findById(user._id);
    expect(dbUser.email).toBe('lector-orig@prueba.cl');
    expect(dbUser.rut).toBe('12345678-5');
    expect(dbUser.name).toBe('Lector Cambiado');
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

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/d[ií]gitos|n[uú]mero/i);
  });

  // ─── Auth: ambos endpoints exigen token válido ──────────────
  test('TC-HU17-04: GET /api/auth/me sin token retorna 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('TC-HU17-05: PATCH /api/users/profile sin token retorna 401', async () => {
    const res = await request(app)
      .patch('/api/users/profile')
      .send({ name: 'Hack' });
    expect(res.status).toBe(401);
  });

  test('TC-HU17-06: PATCH /api/users/profile con token malformado retorna 401', async () => {
    const res = await request(app)
      .patch('/api/users/profile')
      .set('Authorization', 'Bearer token-malformado')
      .send({ name: 'Hack' });
    expect(res.status).toBe(401);
  });

  // ─── Comportamiento del backend al actualizar `name` ──────────────
  test('TC-HU17-07: PATCH /api/users/profile trimea whitespace del nombre antes de guardarlo', async () => {
    const user = await createUser({ email: 'trim@prueba.cl', rut: '44444444-4' });
    const token = generateAuthToken(user);

    const res = await request(app)
      .patch('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   Espacios Sobrantes   ' });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Espacios Sobrantes');

    const dbUser = await User.findById(user._id);
    expect(dbUser.name).toBe('Espacios Sobrantes');
  });

  // ─── Validación de accountType: enum estricto ──────────────
  // El schema solo permite ['corriente', 'vista', 'ahorro', 'chequera_electronica', ''].
  // Un valor fuera del enum dispara ValidationError de Mongoose, que el route
  // captura y traduce a 400 con mensaje genérico (sin filtrar detalles del schema).
  test('TC-HU17-08: PATCH con accountType inválido retorna 400 con mensaje genérico', async () => {
    const user = await createUser({ email: 'enum-bad@prueba.cl', rut: '55555555-5' });
    const token = generateAuthToken(user);

    const res = await request(app)
      .patch('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredAccount: { bank: 'Banco Estado', accountType: 'tipo-inexistente', accountNumber: '12345678' },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid|inv[áa]lido/i);
    // El mensaje NO debe filtrar detalles del schema interno (path, enum, etc.)
    expect(res.body.error).not.toMatch(/enum|path|preferredAccount/i);
  });

});
