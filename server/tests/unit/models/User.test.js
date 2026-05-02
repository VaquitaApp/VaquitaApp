const User = require('../../../src/models/User');
const db = require('../../helpers/db');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe('User model', () => {
  test('hashes password on save (not stored in plain text)', async () => {
    const user = await User.create({ name: 'Ana', email: 'ana@prueba.cl', passwordHash: 'secreto123' });
    expect(user.passwordHash).not.toBe('secreto123');
    expect(user.passwordHash).toMatch(/^\$2[ab]\$/);
  });

  test('lowercases email on save', async () => {
    const user = await User.create({ name: 'Ana', email: 'ANA@PRUEBA.CL', passwordHash: 'clave' });
    expect(user.email).toBe('ana@prueba.cl');
  });

  test('comparePassword returns true for correct password', async () => {
    const user = await User.create({ name: 'Ana', email: 'ana@prueba.cl', passwordHash: 'miclave' });
    expect(await user.comparePassword('miclave')).toBe(true);
  });

  test('comparePassword returns false for wrong password', async () => {
    const user = await User.create({ name: 'Ana', email: 'ana@prueba.cl', passwordHash: 'miclave' });
    expect(await user.comparePassword('claveincorrecta')).toBe(false);
  });

  test('default userType is persona_natural', async () => {
    const user = await User.create({ name: 'Ana', email: 'ana@prueba.cl', passwordHash: 'clave' });
    expect(user.userType).toBe('persona_natural');
  });

  test('rejects duplicate email', async () => {
    await User.create({ name: 'Ana', email: 'duplicado@prueba.cl', passwordHash: 'clave' });
    await expect(
      User.create({ name: 'Otro Usuario', email: 'duplicado@prueba.cl', passwordHash: 'clave' })
    ).rejects.toThrow();
  });
});
