const { shouldSendReminder } = require('../../../src/services/notificationService');
const { connect, disconnect, clear } = require('../../helpers/db');
const { createUser, createFund, createContribution } = require('../../helpers/factories');

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clear(); });

function makeParticipant(user, overrides = {}) {
  return { user, status: 'accepted', lastReminder: null, ...overrides };
}

function makeFund(fund, daysLeft, type = 'free') {
  return {
    _id: fund._id,
    type,
    deadline: new Date(Date.now() + daysLeft * 86400000),
  };
}

describe('shouldSendReminder', () => {
  it('returns false if already sent today', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    const p = makeParticipant(user, { lastReminder: new Date() });
    expect(await shouldSendReminder(p, makeFund(fund, 5))).toBe(false);
  });

  it('returns true for free fund with 5 days and no contribution', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    const p = makeParticipant(user);
    expect(await shouldSendReminder(p, makeFund(fund, 5))).toBe(true);
  });

  it('returns false for free fund if contribution exists', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    await createContribution({ fund: fund._id, user: user._id });
    const p = makeParticipant(user);
    expect(await shouldSendReminder(p, makeFund(fund, 5))).toBe(false);
  });

  it('returns false for free fund if days > 5', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    const p = makeParticipant(user);
    expect(await shouldSendReminder(p, makeFund(fund, 6))).toBe(false);
  });

  it('returns true for quota fund at 5, 3, and 1 day', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    const p = makeParticipant(user);
    for (const days of [5, 3, 1]) {
      expect(await shouldSendReminder(p, makeFund(fund, days, 'quota'))).toBe(true);
    }
  });

  it('returns false for quota fund at 4 and 2 days', async () => {
    const user = await createUser();
    const fund = await createFund({ organizer: user._id });
    const p = makeParticipant(user);
    for (const days of [4, 2]) {
      expect(await shouldSendReminder(p, makeFund(fund, days, 'quota'))).toBe(false);
    }
  });
});
