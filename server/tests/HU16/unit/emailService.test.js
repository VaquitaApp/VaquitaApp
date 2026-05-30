jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue({}) })),
}));

const nodemailer = require('nodemailer');
const {
  sendMoraReminderEmail,
  sendVerificationEmail,
  sendStatusChangeEmail,
  sendDeleteConfirmationEmail,
  sendAccessRequestToOrganizer,
  sendAccessRequestDecisionToUser,
  sendDeadlineExtendedEmail,
  sendFundEditedEmail,
  sendFundDeletedEmail,
  sendJoinRequestEmail,
  sendJoinRequestAcceptedEmail,
} = require('../../../src/services/emailService');

function getSendMailMock() {
  return nodemailer.createTransport.mock.results[0].value.sendMail;
}

function lastCall() {
  const mock = getSendMailMock();
  return mock.mock.calls[mock.mock.calls.length - 1][0];
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

// ────────────────────────────────────────────────────────────────────────────
// Tests de contenido para el resto de funciones de email.
// Bloquean regresiones donde el HTML se rompe silenciosamente y los integration
// tests no detectan porque mockean todo el servicio (ver HU16/integration).
// ────────────────────────────────────────────────────────────────────────────

describe('sendVerificationEmail', () => {
  test('envía al destinatario con asunto y enlace de verificación', async () => {
    await sendVerificationEmail({ to: 'nuevo@prueba.cl', name: 'Nuevo', token: 'abc123' });
    const { to, subject, html } = lastCall();
    expect(to).toBe('nuevo@prueba.cl');
    expect(subject).toMatch(/verifica/i);
    expect(html).toContain('Nuevo');
    expect(html).toContain('/verificar-email/abc123');
  });
});

describe('sendStatusChangeEmail', () => {
  const organizer = { name: 'Org', email: 'org@test.cl' };
  const participants = [
    { status: 'accepted', user: { name: 'A', email: 'a@test.cl' } },
    { status: 'pending',  user: { name: 'B', email: 'b@test.cl' } }, // no debe recibir
  ];

  test('envía a organizador + participantes accepted con asunto "completado"', async () => {
    const fund = { name: 'Fondo X', status: 'completed' };
    await sendStatusChangeEmail({ fund, organizer, participants });
    const calls = getSendMailMock().mock.calls;
    expect(calls).toHaveLength(2); // organizer + 1 accepted (no el pending)
    const recipients = calls.map(c => c[0].to).sort();
    expect(recipients).toEqual(['a@test.cl', 'org@test.cl']);
    calls.forEach(c => {
      expect(c[0].subject).toMatch(/completado/i);
      expect(c[0].html).toContain('Fondo X');
    });
  });

  test('asunto y body para status=closed', async () => {
    const fund = { name: 'Fondo Y', status: 'closed' };
    await sendStatusChangeEmail({ fund, organizer, participants: [] });
    const { subject, html } = lastCall();
    expect(subject).toMatch(/cerrado/i);
    expect(html).toContain('Fondo Y');
  });

  test('no envía si fund.status no es completed ni closed (active)', async () => {
    await sendStatusChangeEmail({ fund: { name: 'Z', status: 'active' }, organizer, participants: [] });
    expect(getSendMailMock()).not.toHaveBeenCalled();
  });
});

describe('sendDeleteConfirmationEmail', () => {
  test('contiene enlace de confirmación con el token', async () => {
    await sendDeleteConfirmationEmail({ to: 'baja@prueba.cl', name: 'Baja', token: 'tok-del' });
    const { to, subject, html } = lastCall();
    expect(to).toBe('baja@prueba.cl');
    expect(subject).toMatch(/confirma.*eliminaci[oó]n/i);
    expect(html).toContain('/confirmar-eliminacion/tok-del');
    expect(html).toContain('Baja');
  });
});

describe('sendAccessRequestToOrganizer', () => {
  test('incluye nombre del solicitante, fondo y links accept/reject con el token', async () => {
    await sendAccessRequestToOrganizer({
      to: 'org@test.cl', organizerName: 'Org', requesterName: 'Juan', fundName: 'Fondo A', token: 'tok-ar',
    });
    const { to, subject, html } = lastCall();
    expect(to).toBe('org@test.cl');
    expect(subject).toContain('Fondo A');
    expect(html).toContain('Juan');
    expect(html).toContain('/solicitudes-acceso/tok-ar?action=accept');
    expect(html).toContain('/solicitudes-acceso/tok-ar?action=reject');
  });
});

describe('sendAccessRequestDecisionToUser', () => {
  test('subject y body cuando accepted=true mencionan aceptación', async () => {
    await sendAccessRequestDecisionToUser({ to: 'sol@test.cl', name: 'Sol', fundName: 'Fondo B', accepted: true });
    const { subject, html } = lastCall();
    expect(subject).toMatch(/aceptaron/i);
    expect(html).toMatch(/acept/i);
    expect(html).toContain('Fondo B');
  });

  test('subject y body cuando accepted=false mencionan rechazo', async () => {
    await sendAccessRequestDecisionToUser({ to: 'sol@test.cl', name: 'Sol', fundName: 'Fondo B', accepted: false });
    const { subject, html } = lastCall();
    expect(subject).toMatch(/rechazada/i);
    expect(html).toMatch(/rechaz/i);
  });
});

describe('sendDeadlineExtendedEmail', () => {
  test('envía solo a participantes accepted con la nueva fecha y nombre del organizador', async () => {
    const fund = { name: 'Fondo D' };
    const organizer = { name: 'Org', email: 'org@test.cl' };
    const participants = [
      { status: 'accepted', user: { name: 'A', email: 'a@test.cl' } },
      { status: 'pending',  user: { name: 'B', email: 'b@test.cl' } },
    ];
    const newDate = new Date('2026-09-30T00:00:00.000Z');

    await sendDeadlineExtendedEmail({ fund, organizer, participants, newDate });
    const calls = getSendMailMock().mock.calls;
    expect(calls).toHaveLength(1); // solo el accepted, no el pending, no el organizer
    expect(calls[0][0].to).toBe('a@test.cl');
    expect(calls[0][0].subject).toMatch(/aplazada|Fondo D/);
    expect(calls[0][0].html).toContain('Fondo D');
    expect(calls[0][0].html).toContain('Org');
  });
});

describe('sendFundEditedEmail', () => {
  const organizer = { name: 'Org', email: 'org@test.cl' };
  const participants = [
    { status: 'accepted', user: { name: 'A', email: 'a@test.cl' } },
  ];

  test('renderiza <ul> con cada item de changes', async () => {
    await sendFundEditedEmail({
      fund: { name: 'Fondo E' },
      organizer,
      participants,
      changes: ['Meta: $50.000 → $70.000', 'Fecha límite actualizada'],
    });
    const calls = getSendMailMock().mock.calls;
    // organizer + 1 participant accepted
    expect(calls).toHaveLength(2);
    calls.forEach(c => {
      const html = c[0].html;
      expect(html).toContain('Fondo E');
      expect(html).toContain('<ul>');
      expect(html).toContain('Meta: $50.000 → $70.000');
      expect(html).toContain('Fecha límite actualizada');
    });
  });

  test('fallback al texto genérico cuando changes está vacío o ausente', async () => {
    await sendFundEditedEmail({
      fund: { name: 'Fondo F' },
      organizer,
      participants: [],
    });
    const { html } = lastCall();
    expect(html).not.toContain('<ul>');
    expect(html).toMatch(/revisa la informaci[oó]n actualizada/i);
  });
});

describe('sendFundDeletedEmail', () => {
  test('envía a participantes accepted con asunto "cancelado/eliminado"', async () => {
    const fund = { name: 'Fondo G' };
    const participants = [
      { status: 'accepted', user: { name: 'A', email: 'a@test.cl' } },
      { status: 'pending',  user: { name: 'B', email: 'b@test.cl' } }, // NO recibe
    ];
    await sendFundDeletedEmail({ fund, participants });
    const calls = getSendMailMock().mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0].to).toBe('a@test.cl');
    expect(calls[0][0].subject).toMatch(/cancelado|eliminado/i);
    expect(calls[0][0].html).toContain('Fondo G');
  });
});

describe('sendJoinRequestEmail', () => {
  test('subject contiene fundName y body incluye links accept/reject con el token', async () => {
    await sendJoinRequestEmail({
      to: 'org@test.cl', organizerName: 'Org', requesterName: 'Sol', fundName: 'Fondo H', token: 'jr-tok',
    });
    const { to, subject, html } = lastCall();
    expect(to).toBe('org@test.cl');
    expect(subject).toContain('Fondo H');
    expect(html).toContain('Sol');
    expect(html).toContain('/solicitudes-union/jr-tok?action=accept');
    expect(html).toContain('/solicitudes-union/jr-tok?action=reject');
  });
});

describe('sendJoinRequestAcceptedEmail', () => {
  test('envía a quien solicitó con enlace al detalle del fondo', async () => {
    await sendJoinRequestAcceptedEmail({
      to: 'sol@test.cl', name: 'Sol', fundName: 'Fondo I', fundId: 'abc123',
    });
    const { to, subject, html } = lastCall();
    expect(to).toBe('sol@test.cl');
    expect(subject).toMatch(/aceptada/i);
    expect(html).toContain('Fondo I');
    expect(html).toContain('/fondos/abc123');
  });
});
