/**
 * HU05-2: Registro de usuario
 * Test Cases mapeados a Criterios de Aceptación CA1 a CA11
 */
const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../helpers/db');
const { createUser } = require('../../helpers/factories');
const User = require('../../../src/models/User'); // Para verificar la base de datos directamente

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe('HU05-2: Registro de Usuario — POST /api/auth/register', () => {

  const validPayload = {
    name: 'Juan Perez',
    rut: '12.345.678-5',
    email: 'test@prueba.cl',
    password: 'password123',
    userType: 'persona_natural'
  };

  // ─── CA1: El formulario valida campos obligatorios ──────────────
  test('TC-HU05-2-01 (CA1): Retorna 400 si faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({});
      
    expect(res.status).toBe(400);
  });

  // ─── CA2: RUT con formato chileno y validación de dígito verificador ──────────────
  test('TC-HU05-2-02 (CA2): Retorna 400 si el RUT tiene formato inválido o dígito erróneo', async () => {
    const invalidRutPayload = { ...validPayload, rut: '12345678-9' }; // Dígito incorrecto y sin puntos
    const res = await request(app)
      .post('/api/auth/register')
      .send(invalidRutPayload);
      
    expect(res.status).toBe(400);
  });

  // ─── CA3: No permite registrar RUT o correo existente ──────────────
  test('TC-HU05-2-03 (CA3): Retorna 400/409 si el correo o RUT ya está registrado', async () => {
    // Creamos un usuario previo con un RUT normalizado y email específico
    await createUser({ email: 'existente@prueba.cl', rut: '21253453-6' });
    
    // Intento con correo existente
    const existingEmailPayload = { ...validPayload, email: 'existente@prueba.cl', rut: '13.345.678-K' };
    const res1 = await request(app)
      .post('/api/auth/register')
      .send(existingEmailPayload);
      
    expect([400, 409]).toContain(res1.status);

    // Intento con RUT existente
    const existingRutPayload = { ...validPayload, rut: '21.253.453-6', email: 'otromail@prueba.cl' };
    const res2 = await request(app)
      .post('/api/auth/register')
      .send(existingRutPayload);
      
    expect([400, 409]).toContain(res2.status);
  });

  // ─── CA4: Contraseña debe tener mínimo 6 caracteres ──────────────
  test('TC-HU05-2-04 (CA4): Retorna 400 si la contraseña tiene menos de 6 caracteres', async () => {
    const shortPasswordPayload = { ...validPayload, password: '12345' };
    const res = await request(app)
      .post('/api/auth/register')
      .send(shortPasswordPayload);
      
    expect(res.status).toBe(400);
  });

  // ─── CA5: Usuario elige tipo (Persona natural u Organización) ──────────────
  test('TC-HU05-2-05 (CA5): Permite registro exitoso como Organización', async () => {
    const orgPayload = { ...validPayload, userType: 'organizacion', email: 'org@prueba.cl', rut: '11.111.111-1' };
    const res = await request(app)
      .post('/api/auth/register')
      .send(orgPayload);
      
    expect(res.status).toBe(201);
    
    // Verificamos en DB
    const user = await User.findOne({ email: orgPayload.email });
    expect(user).toBeDefined();
    expect(user.userType).toBe('organizacion');
  });

  // ─── CA6: Contraseñas se almacenan encriptadas (bcrypt) ──────────────
  test('TC-HU05-2-06 (CA6): La contraseña se almacena encriptada, no en texto plano', async () => {
    const encryptPayload = { ...validPayload, email: 'encrypt@prueba.cl', rut: '22.222.222-2' };
    const res = await request(app)
      .post('/api/auth/register')
      .send(encryptPayload);
      
    expect(res.status).toBe(201);
    
    const user = await User.findOne({ email: encryptPayload.email });
    expect(user.passwordHash).not.toBe(encryptPayload.password); // Debe estar hasheada
    expect(user.passwordHash).toMatch(/^\$2[abxy]\$/); // Formato de hash bcrypt
  });

  // ─── CA7: Envío de email de verificación al registrarse ──────────────
  test('TC-HU05-2-07 (CA7): Genera estado no verificado al registrarse exitosamente', async () => {
    const verifPayload = { ...validPayload, email: 'verif@prueba.cl', rut: '33.333.333-3' };
    const res = await request(app)
      .post('/api/auth/register')
      .send(verifPayload);
      
    expect(res.status).toBe(201);
    
    // Validamos que por defecto queda sin verificar (lo que obliga al usuario a verificar con el email enviado)
    const user = await User.findOne({ email: verifPayload.email });
    expect(user.isEmailVerified).toBe(false);
  });

  // ─── CA8: Login bloqueado hasta que email sea verificado ──────────────
  test('TC-HU05-2-08 (CA8): Retorna 403 al intentar loguearse sin estar verificado', async () => {
    const unverifiedPayload = { ...validPayload, email: 'noverif@prueba.cl', rut: '44.444.444-4' };
    await request(app).post('/api/auth/register').send(unverifiedPayload);
    
    // Intento de login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: unverifiedPayload.email, password: unverifiedPayload.password });
      
    expect(loginRes.status).toBe(403);
  });

  // ─── CA9: Interfaz muestra mensajes de error descriptivos ──────────────
  test('TC-HU05-2-09 (CA9): Retorna mensajes de error estructurados para campos inválidos', async () => {
    const invalidPayload = { name: '123', rut: '1', email: 'noemail', password: '123', userType: 'Nada' };
    const res = await request(app)
      .post('/api/auth/register')
      .send(invalidPayload);
      
    expect(res.status).toBe(400);
    // Verificamos que la respuesta contenga errores detallados
    expect(res.body).toHaveProperty('error');
  });

  // ─── CA10: No permite registro si un campo obligatorio está vacío ──────────────
  test('TC-HU05-2-10 (CA10): Retorna 400 si el nombre está vacío', async () => {
    const emptyNamePayload = { ...validPayload, name: '' };
    const res = await request(app)
      .post('/api/auth/register')
      .send(emptyNamePayload);
      
    expect(res.status).toBe(400);
  });

  // ─── CA11: Solo permite letras o espacios en el nombre ──────────────
  test('TC-HU05-2-11 (CA11): Retorna 400 si el nombre contiene números o símbolos', async () => {
    const invalidNamePayload = { ...validPayload, name: 'Juan123' };
    const res = await request(app)
      .post('/api/auth/register')
      .send(invalidNamePayload);
      
    expect(res.status).toBe(400);
  });

});
