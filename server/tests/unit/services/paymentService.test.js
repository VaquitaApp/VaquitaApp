const { processPayment } = require('../../../src/services/paymentService');

describe('paymentService.processPayment', () => {
  it('returns transactionId starting with sim_', async () => {
    const result = await processPayment({ amount: 50000, recipientAccount: '12345' });
    expect(result.transactionId).toMatch(/^sim_/);
  });

  it('returns status succeeded', async () => {
    const result = await processPayment({ amount: 50000, recipientAccount: '12345' });
    expect(result.status).toBe('succeeded');
  });

  it('returns provider simulation', async () => {
    const result = await processPayment({ amount: 50000, recipientAccount: '12345' });
    expect(result.provider).toBe('simulation');
  });

  it('returns the correct amount', async () => {
    const result = await processPayment({ amount: 75000, recipientAccount: '12345' });
    expect(result.amount).toBe(75000);
  });
});
