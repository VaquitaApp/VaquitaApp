const User = require('../../../src/models/User');
const db = require('../../helpers/db');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe('User model', () => {
  test('hashes password on save (not stored in plain text)', async () => {
    const user = await User.create({ name: 'Ana', email: 'ana@test.com', passwordHash: 'secret123' });
    expect(user.passwordHash).not.toBe('secret123');
    expect(user.passwordHash).toMatch(/^\$2[ab]\$/);
  });

  test('lowercases email on save', async () => {
    const user = await User.create({ name: 'Ana', email: 'ANA@TEST.COM', passwordHash: 'pass' });
    expect(user.email).toBe('ana@test.com');
  });

  test('comparePassword returns true for correct password', async () => {
    const user = await User.create({ name: 'Ana', email: 'ana@test.com', passwordHash: 'mypass' });
    expect(await user.comparePassword('mypass')).toBe(true);
  });

  test('comparePassword returns false for wrong password', async () => {
    const user = await User.create({ name: 'Ana', email: 'ana@test.com', passwordHash: 'mypass' });
    expect(await user.comparePassword('wrong')).toBe(false);
  });

  test('default userType is persona_natural', async () => {
    const user = await User.create({ name: 'Ana', email: 'ana@test.com', passwordHash: 'pass' });
    expect(user.userType).toBe('persona_natural');
  });

  test('rejects duplicate email', async () => {
    await User.create({ name: 'Ana', email: 'dup@test.com', passwordHash: 'pass' });
    await expect(
      User.create({ name: 'Otro', email: 'dup@test.com', passwordHash: 'pass' })
    ).rejects.toThrow();
  });
});
