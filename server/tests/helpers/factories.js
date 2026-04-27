const User = require('../../src/models/User');

async function createUser(overrides = {}) {
  const defaults = {
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'password123',
  };
  return User.create({ ...defaults, ...overrides });
}

module.exports = { createUser };
