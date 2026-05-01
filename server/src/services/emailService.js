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

module.exports = { sendEmail, sendVerificationEmail, sendStatusChangeEmail, sendDeleteConfirmationEmail, sendDeadlineExtendedEmail, sendFundDeletedEmail };
