jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue({}) })),
}));

const nodemailer = require('nodemailer');
const { sendMoraReminderEmail } = require('../../../src/services/emailService');

function getSendMailMock() {
  return nodemailer.createTransport.mock.results[0].value.sendMail;
}

beforeEach(() => {
  getSendMailMock().mockClear();
});

describe('sendMoraReminderEmail', () => {
  const deadline = new Date('2026-07-15T12:00:00.000Z');
  const user = { email: 'test@prueba.cl', name: 'Test User' };

  test('incluye "Fecha de cierre" en el HTML (CA2)', async () => {
    const fund = { name: 'Fondo Test', type: 'quota', totalQuotas: 12, quotaAmount: 10000, deadline };
    await sendMoraReminderEmail({ fund, user, pendingCount: 1 });
    const { html } = getSendMailMock().mock.calls[0][0];
    expect(html).toContain('Fecha de cierre');
  });

  test('la fecha de cierre del fondo aparece en el HTML (CA2)', async () => {
    const fund = { name: 'Fondo Test', type: 'quota', totalQuotas: 12, quotaAmount: 10000, deadline };
    await sendMoraReminderEmail({ fund, user, pendingCount: 1 });
    const { html } = getSendMailMock().mock.calls[0][0];
    // fecha formateada en español con toLocaleDateString('es-CL')
    expect(html).toMatch(/julio/i);
  });

  test('muestra cuotas pendientes y monto total para fondo quota', async () => {
    const fund = { name: 'Fondo Cuota', type: 'quota', totalQuotas: 12, quotaAmount: 5000, deadline };
    await sendMoraReminderEmail({ fund, user, pendingCount: 3 });
    const { html } = getSendMailMock().mock.calls[0][0];
    expect(html).toContain('3 cuotas pendientes');
  });

  test('menciona "ningún aporte" para fondo libre', async () => {
    const fund = { name: 'Fondo Libre', type: 'free', deadline };
    await sendMoraReminderEmail({ fund, user, pendingCount: 0 });
    const { html } = getSendMailMock().mock.calls[0][0];
    expect(html).toContain('ningún aporte');
  });

  test('incluye minAmount en el mensaje para fondo libre con monto mínimo', async () => {
    const fund = { name: 'Fondo Min', type: 'free', minAmount: 20000, deadline };
    await sendMoraReminderEmail({ fund, user, pendingCount: 0 });
    const { html } = getSendMailMock().mock.calls[0][0];
    expect(html).toContain('mínimo');
  });

  test('asunto del email contiene el nombre del fondo', async () => {
    const fund = { name: 'Mi Fondo', type: 'quota', totalQuotas: 12, quotaAmount: 1000, deadline };
    await sendMoraReminderEmail({ fund, user, pendingCount: 1 });
    const { subject } = getSendMailMock().mock.calls[0][0];
    expect(subject).toContain('Mi Fondo');
  });
});
