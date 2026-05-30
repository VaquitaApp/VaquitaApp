jest.mock('../../../src/services/emailService', () => ({
  sendMoraReminderEmail: jest.fn().mockResolvedValue({}),
  sendFundEditedEmail:   jest.fn().mockResolvedValue({}),
  sendStatusChangeEmail: jest.fn().mockResolvedValue({}),
  sendFundDeletedEmail:  jest.fn().mockResolvedValue({}),
  sendJoinRequestEmail:  jest.fn().mockResolvedValue({}),
  sendJoinRequestAcceptedEmail: jest.fn().mockResolvedValue({}),
  sendVerificationEmail: jest.fn().mockResolvedValue({}),
  sendDeleteConfirmationEmail: jest.fn().mockResolvedValue({}),
}));

const { connect, disconnect, clear } = require('../../helpers/db');
const { createUser, createFund, createContribution } = require('../../helpers/factories');
const { sendFundReminders } = require('../../../src/services/notificationService');
const { sendMoraReminderEmail } = require('../../../src/services/emailService');
const Fund = require('../../../src/models/Fund');

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => {
  await clear();
  jest.clearAllMocks();
});

// Fondo cuota semanal con createdAt hace N días (controla periodsElapsed y currentPeriodDeadline)
async function makeWeeklyQuotaFund(daysAgo, userIds) {
  const organizer = await createUser({ email: `org-${Date.now()}@test.cl` });
  const createdAt = new Date(Date.now() - daysAgo * 86400000);
  const fund = await createFund({
    organizer: organizer._id,
    type: 'quota', totalQuotas: 12,
    frequency: 'weekly',
    quotaAmount: 1000,
    createdAt,
    deadline: new Date(Date.now() + 30 * 86400000),
  });
  if (userIds.length) {
    await fund.updateOne({
      $push: {
        participants: userIds.map(id => ({ user: id, status: 'accepted' })),
      },
    });
  }
  return Fund.findById(fund._id).populate('participants.user');
}

describe('sendFundReminders', () => {
  test('activa moraReminderActive al enviar el primer recordatorio de mora', async () => {
    // 6 días en el período semanal → ≈1 día restante → dentro del umbral de 2 días
    const user = await createUser({ email: 'mora@test.cl' });
    const fund = await makeWeeklyQuotaFund(6, [user._id]);

    await sendFundReminders(fund);

    const updated = await Fund.findById(fund._id);
    expect(updated.participants[0].moraReminderActive).toBe(true);
    expect(updated.participants[0].lastReminder).toBeDefined();
    expect(sendMoraReminderEmail).toHaveBeenCalledTimes(1);
    // Verificar que la invocación trae los argumentos correctos, no solo el conteo.
    // Si el código manda el participant equivocado o pendingCount mal calculado, falla.
    expect(sendMoraReminderEmail).toHaveBeenCalledWith(expect.objectContaining({
      user: expect.objectContaining({ email: 'mora@test.cl' }),
      pendingCount: 1, // weekly, 6 días en el período, sin pago → 1 cuota debida
      fund: expect.objectContaining({ _id: fund._id }),
    }));
  });

  test('desactiva moraReminderActive cuando el usuario paga su mora', async () => {
    // 6 días en el período → dentro del umbral, pero el usuario pagó su cuota
    const user = await createUser({ email: 'pagado@test.cl' });
    const fund = await makeWeeklyQuotaFund(6, [user._id]);

    // Simula que ya se activó el modo sostenido en un ciclo anterior
    await Fund.updateOne(
      { _id: fund._id, 'participants.user': user._id },
      { $set: { 'participants.$.moraReminderActive': true } },
    );

    // Usuario paga 1 cuota → pendingQuotas = max(0, 1-1) = 0 → no está en mora
    await createContribution({ fund: fund._id, user: user._id, amount: 1000 });

    const populated = await Fund.findById(fund._id).populate('participants.user');
    await sendFundReminders(populated);

    const updated = await Fund.findById(fund._id);
    expect(updated.participants[0].moraReminderActive).toBe(false);
    expect(sendMoraReminderEmail).not.toHaveBeenCalled();
  });

  test('no envia recordatorio si el participante ya recibió uno hoy', async () => {
    const user = await createUser({ email: 'yarecibio@test.cl' });
    const fund = await makeWeeklyQuotaFund(6, [user._id]);

    // Simula lastReminder = hoy
    await Fund.updateOne(
      { _id: fund._id, 'participants.user': user._id },
      { $set: { 'participants.$.lastReminder': new Date() } },
    );

    const populated = await Fund.findById(fund._id).populate('participants.user');
    await sendFundReminders(populated);

    expect(sendMoraReminderEmail).not.toHaveBeenCalled();
  });

  test('no envia recordatorio si el participante está al día', async () => {
    const user = await createUser({ email: 'aldia@test.cl' });
    const fund = await makeWeeklyQuotaFund(6, [user._id]);
    await createContribution({ fund: fund._id, user: user._id, amount: 1000 });

    const populated = await Fund.findById(fund._id).populate('participants.user');
    await sendFundReminders(populated);

    expect(sendMoraReminderEmail).not.toHaveBeenCalled();
  });

  test('modo sostenido: envia recordatorio aunque esté fuera del umbral si moraReminderActive=true', async () => {
    // 1 día en el período → ≈6 días restantes → fuera del umbral de 2 días
    const user = await createUser({ email: 'sostenido@test.cl' });
    const fund = await makeWeeklyQuotaFund(1, [user._id]);

    // Sin moraReminderActive: shouldSendReminder devolvería false (fuera del umbral)
    // Con moraReminderActive=true: debe enviar de todas formas
    await Fund.updateOne(
      { _id: fund._id, 'participants.user': user._id },
      { $set: { 'participants.$.moraReminderActive': true } },
    );

    const populated = await Fund.findById(fund._id).populate('participants.user');
    await sendFundReminders(populated);

    expect(sendMoraReminderEmail).toHaveBeenCalledTimes(1);
    // Verificación de args: el participant correcto y pendingCount=1 (weekly, 1 día, sin pagos)
    expect(sendMoraReminderEmail).toHaveBeenCalledWith(expect.objectContaining({
      user: expect.objectContaining({ email: 'sostenido@test.cl' }),
      pendingCount: 1,
    }));
  });
});
