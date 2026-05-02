const { sendMoraReminderEmail } = require('./emailService');
const { pendingQuotas, currentPeriodDeadline } = require('./quotaService');
const Contribution = require('../models/Contribution');
const Fund = require('../models/Fund');

// Días antes del deadline del período a partir de los cuales se envía alerta de mora
function getMoraThreshold(fund) {
  const THRESHOLDS = { weekly: 2, biweekly: 3, monthly: 6 };
  if (fund.type === 'quota' && THRESHOLDS[fund.frequency]) {
    return THRESHOLDS[fund.frequency];
  }
  // free o once: 20% de la duración total del fondo, redondeado hacia arriba
  const totalMs = new Date(fund.deadline) - new Date(fund.createdAt);
  return Math.ceil(totalMs * 0.20 / 86400000);
}

function shouldSendReminder(participant, fund, userContribs = []) {
  if (!participant.user?.email) return false;

  const today = new Date().toDateString();
  if (participant.lastReminder?.toDateString() === today) return false;

  const inMora = fund.type === 'quota'
    ? pendingQuotas(fund, userContribs) > 0
    : userContribs.length === 0;

  if (!inMora) return false;

  // Modo sostenido: ya se envió al menos una vez en esta mora
  if (participant.moraReminderActive) return true;

  // Primera vez: solo si está dentro de la ventana del período actual
  const periodDeadline = currentPeriodDeadline(fund);
  const daysLeft = Math.ceil((periodDeadline - new Date()) / 86400000);
  return daysLeft <= getMoraThreshold(fund);
}

async function sendFundReminders(fund) {
  const accepted = fund.participants.filter(p => p.status === 'accepted');
  if (accepted.length === 0) return;

  const allContribs = await Contribution.find({ fund: fund._id, status: 'succeeded' }).lean();
  let changed = false;

  for (const p of accepted) {
    const userContribs = allContribs.filter(c => c.user.equals(p.user._id ?? p.user));

    const inMora = fund.type === 'quota'
      ? pendingQuotas(fund, userContribs) > 0
      : userContribs.length === 0;

    if (!inMora && p.moraReminderActive) {
      p.moraReminderActive = false;
      changed = true;
      continue;
    }

    if (shouldSendReminder(p, fund, userContribs)) {
      const pendingCount = fund.type === 'quota' ? pendingQuotas(fund, userContribs) : 0;
      await sendMoraReminderEmail({ fund, user: p.user, pendingCount }).catch(() => {});
      p.lastReminder = new Date();
      if (!p.moraReminderActive) p.moraReminderActive = true;
      changed = true;
    }
  }

  if (changed) await fund.save();
}

async function runDailyReminders() {
  const funds = await Fund.find({ status: 'active' }).populate('participants.user');
  for (const fund of funds) await sendFundReminders(fund);
}

module.exports = { shouldSendReminder, sendFundReminders, runDailyReminders };
