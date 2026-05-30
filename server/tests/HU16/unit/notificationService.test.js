const { shouldSendReminder } = require('../../../src/services/notificationService');

function makeParticipant(overrides = {}) {
  return {
    user: { _id: 'uid', email: 'test@test.com', name: 'Test' },
    status: 'accepted',
    lastReminder: null,
    moraReminderActive: false,
    ...overrides,
  };
}

// Fondo cuota semanal. daysInto: días transcurridos en el período actual.
// periodDeadline ≈ (7 - daysInto) días desde ahora.
function makeWeeklyQuotaFund(daysInto = 6) {
  return {
    type: 'quota', totalQuotas: 12,
    frequency: 'weekly',
    quotaAmount: 1000,
    createdAt: new Date(Date.now() - daysInto * 86400000),
    deadline: new Date(Date.now() + 30 * 86400000),
  };
}

// Fondo libre con totalDays de duración y daysLeft días hasta el deadline.
function makeFreeFund({ daysLeft, totalDays }) {
  return {
    type: 'free',
    createdAt: new Date(Date.now() - (totalDays - daysLeft) * 86400000),
    deadline: new Date(Date.now() + daysLeft * 86400000),
  };
}

describe('shouldSendReminder', () => {
  test('devuelve false si el participante no tiene email', () => {
    const p = makeParticipant({ user: { _id: 'uid', email: null } });
    expect(shouldSendReminder(p, makeWeeklyQuotaFund(), [])).toBe(false);
  });

  test('devuelve false si ya se envió recordatorio hoy', () => {
    const p = makeParticipant({ lastReminder: new Date() });
    expect(shouldSendReminder(p, makeWeeklyQuotaFund(6), [])).toBe(false);
  });

  test('devuelve false para fondo cuota si el usuario está al día (1 cuota pagada)', () => {
    const userContribs = [{ amount: 1000 }];
    expect(shouldSendReminder(makeParticipant(), makeWeeklyQuotaFund(6), userContribs)).toBe(false);
  });

  test('devuelve true para fondo cuota en mora dentro de la ventana (1 día restante, threshold=2)', () => {
    // weekly threshold=2 días; 6 días en período → ≈1 día restante → dentro de ventana
    expect(shouldSendReminder(makeParticipant(), makeWeeklyQuotaFund(6), [])).toBe(true);
  });

  test('devuelve false para fondo cuota en mora fuera de la ventana (6 días restantes, threshold=2)', () => {
    // 1 día en período → ≈6 días restantes → fuera de ventana
    expect(shouldSendReminder(makeParticipant(), makeWeeklyQuotaFund(1), [])).toBe(false);
  });

  test('devuelve true en modo sostenido (moraReminderActive=true) aunque esté fuera de ventana', () => {
    const p = makeParticipant({ moraReminderActive: true });
    expect(shouldSendReminder(p, makeWeeklyQuotaFund(1), [])).toBe(true);
  });

  test('devuelve false para fondo libre si el usuario ya aportó', () => {
    // totalDays=20, daysLeft=3 → threshold=ceil(20*0.20)=4 → en ventana, pero tiene aporte
    const fund = makeFreeFund({ daysLeft: 3, totalDays: 20 });
    expect(shouldSendReminder(makeParticipant(), fund, [{ amount: 500 }])).toBe(false);
  });

  test('devuelve true para fondo libre en mora dentro de la ventana (threshold=4, daysLeft=3)', () => {
    // totalDays=20, threshold=ceil(20*0.20)=4, daysLeft=3 ≤ 4 → true
    const fund = makeFreeFund({ daysLeft: 3, totalDays: 20 });
    expect(shouldSendReminder(makeParticipant(), fund, [])).toBe(true);
  });

  test('devuelve false para fondo libre en mora fuera de la ventana (threshold=4, daysLeft=10)', () => {
    // totalDays=20, threshold=ceil(20*0.20)=4, daysLeft=10 > 4 → false
    const fund = makeFreeFund({ daysLeft: 10, totalDays: 20 });
    expect(shouldSendReminder(makeParticipant(), fund, [])).toBe(false);
  });
});
