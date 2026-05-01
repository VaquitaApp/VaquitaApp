const { sendEmail } = require('./emailService');
const Contribution = require('../models/Contribution');
const Fund = require('../models/Fund');

function daysUntil(date) {
  return Math.floor((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
}

async function shouldSendReminder(participant, fund) {
  if (!participant.user?.email) return false;

  const today = new Date().toDateString();
  if (participant.lastReminder?.toDateString() === today) return false;

  const days = daysUntil(fund.deadline);

  if (fund.type === 'free') {
    if (days > 5 || days < 0) return false;
    const hasContrib = await Contribution.exists({ fund: fund._id, user: participant.user._id ?? participant.user });
    return !hasContrib;
  }

  return [5, 3, 1].includes(days);
}

async function sendFundReminders(fund) {
  const accepted = fund.participants.filter(p => p.status === 'accepted');
  for (const p of accepted) {
    if (await shouldSendReminder(p, fund)) {
      const userName = p.user.name ?? 'participante';
      const deadlineStr = new Date(fund.deadline).toLocaleDateString('es-CL');
      await sendEmail({
        to: p.user.email,
        subject: `Recordatorio: fondo "${fund.name}"`,
        html: `<p>Hola ${userName}, recuerda tu aporte al fondo <b>${fund.name}</b>. Fecha límite: ${deadlineStr}.</p>`,
      });
      p.lastReminder = new Date();
    }
  }
  await fund.save();
}

async function runDailyReminders() {
  const funds = await Fund.find({ status: 'active' }).populate('participants.user');
  for (const fund of funds) await sendFundReminders(fund);
}

module.exports = { shouldSendReminder, sendFundReminders, runDailyReminders };
