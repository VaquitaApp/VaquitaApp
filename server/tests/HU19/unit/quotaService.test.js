const { pendingQuotas, remainingQuotas } = require('../../../src/services/quotaService');

describe('quotaService - HU19 Pago Adelantado de Cuotas', () => {
  it('debe calcular correctamente pendingQuotas y remainingQuotas usando paidQuotas', () => {
    const now = new Date();
    const fund = {
      type: 'quota',
      quotaAmount: 10000,
      totalQuotas: 10,
      frequency: 'monthly',
      // Anclado a 2 meses calendario atrás (día fijo) → monthDiff exacto = 2 → periodsElapsed = 3.
      // Determinista en cualquier fecha; evita el off-by-one de "60 días" cerca de bordes de mes.
      createdAt: new Date(now.getFullYear(), now.getMonth() - 2, 15),
    };

    // Sin aportes
    expect(pendingQuotas(fund, [])).toBe(3);
    expect(remainingQuotas(fund, [])).toBe(10);

    // Aporte simple de 1 cuota
    const c1 = [{ amount: 10000, paidQuotas: 1 }];
    expect(pendingQuotas(fund, c1)).toBe(2);
    expect(remainingQuotas(fund, c1)).toBe(9);

    // Aporte múltiple de 3 cuotas (Adelanto)
    const c2 = [{ amount: 30000, paidQuotas: 3 }];
    expect(pendingQuotas(fund, c2)).toBe(0); // 3 pagadas, 3 elapsed -> 0 pending
    expect(remainingQuotas(fund, c2)).toBe(7);

    // Aporte que paga todo el saldo restante
    const c3 = [{ amount: 100000, paidQuotas: 10 }];
    expect(pendingQuotas(fund, c3)).toBe(0);
    expect(remainingQuotas(fund, c3)).toBe(0);
  });

  it('clamp: pendingQuotas nunca supera totalQuotas aunque hayan pasado más períodos', () => {
    const fund = {
      type: 'quota',
      quotaAmount: 10000,
      totalQuotas: 3,
      frequency: 'monthly',
      createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // ~12 meses -> ~13 períodos
    };
    // Sin el clamp, pending sería ~13; debe quedar acotado al total (3).
    expect(pendingQuotas(fund, [])).toBe(3);
    expect(remainingQuotas(fund, [])).toBe(3);
  });
});
