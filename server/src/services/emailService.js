const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '1025'),
  secure: false,
});

async function sendEmail({ to, subject, html }) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@vaquitaapp.local',
    to,
    subject,
    html,
  });
}

async function sendVerificationEmail({ to, name, token }) {
  const base = process.env.APP_BASE_URL || 'http://localhost:5173';
  const url  = `${base}/verificar-email/${token}`;
  await sendEmail({
    to,
    subject: 'Verifica tu cuenta en VaquitaApp',
    html: `<h2>Hola ${name}, bienvenido a VaquitaApp</h2>
           <p>Haz clic en el siguiente enlace para activar tu cuenta:</p>
           <p><a href="${url}">${url}</a></p>`,
  });
}

async function sendStatusChangeEmail({ fund, organizer, participants }) {
  const STATUS_MSG = {
    completed: {
      subject: `Fondo "${fund.name}" completado`,
      body:    `El fondo <b>${fund.name}</b> ha sido completado. El monto recaudado fue transferido al destinatario.`,
    },
    closed: {
      subject: `Fondo "${fund.name}" cerrado`,
      body:    `El fondo <b>${fund.name}</b> ha sido cerrado por el organizador.`,
    },
  };
  const msg = STATUS_MSG[fund.status];
  if (!msg) return;

  const recipients = [
    organizer,
    ...participants.filter(p => p.status === 'accepted' && p.user?.email).map(p => p.user),
  ].filter(Boolean);

  for (const r of recipients) {
    await sendEmail({
      to: r.email,
      subject: msg.subject,
      html: `<p>Hola ${r.name},</p><p>${msg.body}</p>`,
    }).catch(() => {});
  }
}

async function sendAccessRequestToOrganizer({ to, organizerName, requesterName, fundName, token }) {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  const acceptUrl = `${baseUrl}/solicitudes-acceso/${token}?action=accept`;
  const rejectUrl = `${baseUrl}/solicitudes-acceso/${token}?action=reject`;
  await sendEmail({
    to,
    subject: `Solicitud de acceso al fondo "${fundName}"`,
    html: `
      <p>Hola ${organizerName},</p>
      <p><strong>${requesterName}</strong> solicita unirse al fondo público <strong>${fundName}</strong>.</p>
      <p>
        <a href="${acceptUrl}" style="background:#4f46e5;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;">Aceptar</a>
        &nbsp;
        <a href="${rejectUrl}" style="background:#6b7280;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;">Rechazar</a>
      </p>`,
  });
}

async function sendAccessRequestDecisionToUser({ to, name, fundName, accepted }) {
  await sendEmail({
    to,
    subject: accepted
      ? `Te aceptaron en el fondo "${fundName}"`
      : `Solicitud rechazada: "${fundName}"`,
    html: accepted
      ? `<p>Hola ${name},</p><p>El organizador aceptó tu solicitud para unirte al fondo <strong>${fundName}</strong>.</p>`
      : `<p>Hola ${name},</p><p>El organizador rechazó tu solicitud de acceso al fondo <strong>${fundName}</strong>.</p>`,
  });
}

async function sendDeleteConfirmationEmail({ to, name, token }) {
  const base = process.env.APP_BASE_URL || 'http://localhost:5173';
  const url  = `${base}/confirmar-eliminacion/${token}`;
  await sendEmail({
    to,
    subject: 'Confirma la eliminación de tu cuenta en VaquitaApp',
    html: `<h2>Hola ${name}</h2>
           <p>Recibimos una solicitud para eliminar tu cuenta de VaquitaApp.</p>
           <p>Haz clic en el siguiente enlace para confirmar. Esta acción no se puede deshacer:</p>
           <p><a href="${url}">${url}</a></p>
           <p>Si no solicitaste esto, ignora este mensaje.</p>`,
  });
}

async function sendDeadlineExtendedEmail({ fund, organizer, participants, newDate }) {
  const recipients = [
    ...participants.filter(p => p.status === 'accepted' && p.user?.email).map(p => p.user),
  ].filter(Boolean);

  const formattedDate = new Date(newDate).toLocaleDateString('es-CL');

  for (const r of recipients) {
    await sendEmail({
      to: r.email,
      subject: `Fecha límite aplazada: fondo "${fund.name}"`,
      html: `<h2>Hola ${r.name}</h2>
             <p>El organizador <b>${organizer.name}</b> ha aplazado la fecha límite del fondo <b>${fund.name}</b>.</p>
             <p>La nueva fecha límite es el <b>${formattedDate}</b>.</p>`,
    }).catch(() => {});
  }
}

async function sendMoraReminderEmail({ fund, user, pendingCount }) {
  let detail;
  if (fund.type === 'quota') {
    const total = pendingCount * fund.quotaAmount;
    detail = `Tienes <b>${pendingCount} cuota${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''}</b> (${total.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })} en total).`;
  } else {
    detail = 'No has realizado ningún aporte al fondo.';
    if (fund.minAmount) {
      detail += ` El monto mínimo de aporte es ${fund.minAmount.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}.`;
    }
  }
  const fechaCierre = new Date(fund.deadline).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  await sendEmail({
    to: user.email,
    subject: `Alerta de mora: fondo "${fund.name}"`,
    html: `<p>Hola ${user.name},</p>
           <p>Estás en mora en el fondo <b>${fund.name}</b>.</p>
           <p>${detail}</p>
           <p>Fecha de cierre del fondo: <b>${fechaCierre}</b>.</p>`,
  });
}

async function sendFundEditedEmail({ fund, organizer, participants }) {
  const recipients = [
    organizer,
    ...participants.filter(p => p.status === 'accepted' && p.user?.email).map(p => p.user),
  ].filter(Boolean);

  for (const r of recipients) {
    await sendEmail({
      to: r.email,
      subject: `Fondo "${fund.name}" actualizado`,
      html: `<p>Hola ${r.name},</p>
             <p>El organizador ha realizado cambios en el fondo <b>${fund.name}</b>. Por favor revisa la información actualizada.</p>`,
    }).catch(() => {});
  }
}

async function sendFundDeletedEmail({ fund, participants }) {
  const recipients = participants.filter(p => p.status === 'accepted' && p.user?.email).map(p => p.user);
  for (const r of recipients) {
    await sendEmail({
      to: r.email,
      subject: `Fondo "${fund.name}" cancelado/eliminado`,
      html: `<p>Hola ${r.name},</p><p>Te informamos que el fondo <b>${fund.name}</b> ha sido cancelado y eliminado por el organizador.</p>`,
    }).catch(() => {});
  }
}

async function sendJoinRequestEmail({ to, organizerName, requesterName, fundName, token }) {
  const base = process.env.APP_BASE_URL || 'http://localhost:5173';
  const acceptUrl = `${base}/solicitudes-union/${token}?action=accept`;
  const rejectUrl = `${base}/solicitudes-union/${token}?action=reject`;
  await sendEmail({
    to,
    subject: `Nueva solicitud de acceso al fondo "${fundName}"`,
    html: `
      <p>Hola ${organizerName},</p>
      <p><strong>${requesterName}</strong> ha solicitado unirse al fondo <strong>${fundName}</strong>.</p>
      <p>
        <a href="${acceptUrl}" style="background:#4f46e5;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;">Aceptar</a>
        &nbsp;
        <a href="${rejectUrl}" style="background:#6b7280;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;">Rechazar</a>
      </p>
    `,
  });
}

async function sendJoinRequestAcceptedEmail({ to, name, fundName, fundId }) {
  const base = process.env.APP_BASE_URL || 'http://localhost:5173';
  await sendEmail({
    to,
    subject: `Tu solicitud al fondo "${fundName}" fue aceptada`,
    html: `
      <p>Hola ${name},</p>
      <p>El organizador ha aceptado tu solicitud para unirte al fondo <strong>${fundName}</strong>.</p>
      <p>Ya puedes participar y realizar aportes.</p>
      <p><a href="${base}/fondos/${fundId}">Ver el fondo</a></p>
    `,
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendStatusChangeEmail,
  sendDeleteConfirmationEmail,
  sendAccessRequestToOrganizer,
  sendAccessRequestDecisionToUser,
  sendDeadlineExtendedEmail,
  sendMoraReminderEmail,
  sendFundEditedEmail,
  sendFundDeletedEmail,
  sendJoinRequestEmail,
  sendJoinRequestAcceptedEmail,
};
