const Fund = require('../../../src/models/Fund');
const db = require('../../helpers/db');
const mongoose = require('mongoose');

const ORG_ID = new mongoose.Types.ObjectId();

const base = {
  name: 'Test Fund',
  description: 'Descripción del fondo de prueba',
  goal: 'Objetivo del fondo',
  type: 'free',
  targetAmount: 100000,
  deadline: new Date(Date.now() + 86400000 * 30),
  recipientAccount: { bank: 'Banco Estado', accountType: 'vista', accountNumber: '12345678' },
  organizer: ORG_ID,
};

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe('Fund model', () => {
  test('creates a free fund with defaults', async () => {
    const fund = await Fund.create(base);
    expect(fund.status).toBe('active');
    expect(fund.visibility).toBe('private');
    expect(fund.participants).toHaveLength(0);
  });

  test('quota fund requires quotaAmount and frequency', async () => {
    await expect(Fund.create({ ...base, type: 'quota' })).rejects.toThrow();
  });

  test('quota fund saves with quotaAmount and frequency', async () => {
    const fund = await Fund.create({
      ...base, type: 'quota', quotaAmount: 20000, frequency: 'monthly',
    });
    expect(fund.quotaAmount).toBe(20000);
    expect(fund.frequency).toBe('monthly');
  });

  test('rejects invalid status', async () => {
    await expect(Fund.create({ ...base, status: 'invalid' })).rejects.toThrow();
  });

  test('rejects invalid type', async () => {
    await expect(Fund.create({ ...base, type: 'invalid' })).rejects.toThrow();
  });

  test('rejects fund without description', async () => {
    const { description, ...noDesc } = base;
    await expect(Fund.create(noDesc)).rejects.toThrow();
  });

  test('rejects fund without goal', async () => {
    const { goal, ...noGoal } = base;
    await expect(Fund.create(noGoal)).rejects.toThrow();
  });

  test('rejects invalid visibility', async () => {
    await expect(Fund.create({ ...base, visibility: 'restricted' })).rejects.toThrow();
  });

  test('saves description and goal correctly', async () => {
    const fund = await Fund.create(base);
    expect(fund.description).toBe('Descripción del fondo de prueba');
    expect(fund.goal).toBe('Objetivo del fondo');
  });
});
