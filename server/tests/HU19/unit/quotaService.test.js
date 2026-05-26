const { pendingQuotas, remainingQuotas } = require('../../../src/services/quotaService');

describe('quotaService - HU19 Pago Adelantado de Cuotas', () => {
  it('debe calcular correctly pendingQuotas y remainingQuotas usando quotasPaid', () => {
    const fund = {
      type: 'quota',
      quotaAmount: 10000,
      totalQuotas: 10,
      frequency: 'monthly',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // approx 2 months ago -> 3 periods elapsed
    };

    // Sin aportes
    expect(pendingQuotas(fund, [])).toBe(3);
    expect(remainingQuotas(fund, [])).toBe(10);

    // Aporte simple de 1 cuota
    const c1 = [{ amount: 10000, quotasPaid: 1 }];
    expect(pendingQuotas(fund, c1)).toBe(2);
    expect(remainingQuotas(fund, c1)).toBe(9);

    // Aporte múltiple de 3 cuotas (Adelanto)
    const c2 = [{ amount: 30000, quotasPaid: 3 }];
    expect(pendingQuotas(fund, c2)).toBe(0); // 3 pagadas, 3 elapsed -> 0 pending
    expect(remainingQuotas(fund, c2)).toBe(7);

    // Aporte que paga todo el saldo restante
    const c3 = [{ amount: 100000, quotasPaid: 10 }];
    expect(pendingQuotas(fund, c3)).toBe(0);
    expect(remainingQuotas(fund, c3)).toBe(0);
  });
});
