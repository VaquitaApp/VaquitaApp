const User = require('../../src/models/User');
const Fund = require('../../src/models/Fund');
const Contribution = require('../../src/models/Contribution');

async function createUser(overrides = {}) {
  const defaults = {
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'password123',
    isEmailVerified: true,
  };
  return User.create({ ...defaults, ...overrides });
}

async function createFund(overrides = {}) {
  const defaults = {
    name: 'Test Fund',
    description: 'Test description',
    goal: 'Test goal',
    type: 'free',
    targetAmount: 100000,
    deadline: new Date(Date.now() + 86400000 * 30),
    recipientAccount: { bank: 'Banco Estado', accountType: 'vista', accountNumber: '12345678' },
    visibility: 'private',
    status: 'active',
  };
  return Fund.create({ ...defaults, ...overrides });
}

async function createContribution(overrides = {}) {
  return Contribution.create({
    amount: 10000,
    method: 'transfer',
    status: 'succeeded',
    ...overrides,
  });
}

module.exports = { createUser, createFund, createContribution };
