const express = require('express');
const Fund = require('../models/Fund');
const Contribution = require('../models/Contribution');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { processPayment } = require('../services/paymentService');
const { totalPeriods, pendingQuotas } = require('../services/quotaService');
const { sendStatusChangeEmail, sendFundEditedEmail, sendMoraReminderEmail, sendFundDeletedEmail } = require('../services/emailService');
const { FREQ_LABELS } = require('../constants');

const router = express.Router();

// Campos bloqueados una vez que existen aportes
const LOCKED_FIELDS = ['targetAmount', 'deadline', 'recipientAccount', 'frequency', 'quotaAmount', 'minAmount', 'type'];

const FREQ_MIN_DAYS = { weekly: 7, biweekly: 14, monthly: 30 };

function isFrequencyFeasible(frequency, deadline) {
  const minDays = FREQ_MIN_DAYS[frequency];
  if (!minDays) return true;
  const todayStr = new Date().toISOString().slice(0, 10);
  const dlStr    = new Date(deadline).toISOString().slice(0, 10);
  return (new Date(dlStr) - new Date(todayStr)) / 86400000 >= minDays;
}

function isDeadlineValid(deadline) {
  const today = new Date();
  const dl = new Date(deadline);
  
  const todayStr = today.toISOString().slice(0, 10);
  const dlStr = dl.toISOString().slice(0, 10);
  
  if (dlStr <= todayStr) return false;
  
  const oneYearFromNow = new Date(today);
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  const maxStr = oneYearFromNow.toISOString().slice(0, 10);
  
  return dlStr <= maxStr;
}

// Calcula el total recaudado para un fondo
async function getCollectedAmount(fundId) {
  const result = await Contribution.aggregate([
    { $match: { fund: fundId, status: 'succeeded' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total ?? 0;
}

// Cierra automáticamente un fondo activo sin aportes cuya fecha límite ya venció
async function autoExpireFund(fund) {
  if (fund.status !== 'active') return;
  const deadlineStr = new Date(fund.deadline).toISOString().slice(0, 10);
  const todayStr    = new Date().toISOString().slice(0, 10);
  if (deadlineStr >= todayStr) return;
  const hasContribs = await Contribution.countDocuments({ fund: fund._id, status: 'succeeded' }) > 0;
  if (!hasContribs) {
    fund.status = 'closed';
    await fund.save();
  }
}

// Verifica si el usuario es organizador o participante aceptado (funciona antes y después del populate)
function isMember(fund, userId) {
  if (fund.organizer._id?.equals(userId) || fund.organizer.equals?.(userId)) return true;
  return fund.participants.some(
    p => (p.user?._id?.equals(userId) || p.user?.equals?.(userId)) && p.status === 'accepted'
  );
}

// GET /api/funds/public — debe definirse antes de /:id
router.get('/public', auth, async (req, res) => {
  try {
    const { q, sort, type: fundType, status: statusParam } = req.query;
    const userId = req.user._id;

    const statusFilter = statusParam === 'paused' ? 'paused' : 'active';

    const query = {
      visibility: 'public',
      status: statusFilter,
      organizer: { $ne: userId },
      participants: { $not: { $elemMatch: { user: userId, status: 'accepted' } } },
    };
    if (q) query.name = { $regex: q, $options: 'i' };
    if (fundType === 'quota' || fundType === 'free') query.type = fundType;

    let sortObj;
    if (sort === 'deadline_desc') sortObj = { deadline: -1 };
    else if (sort === 'name') sortObj = { name: 1 };
    else sortObj = { deadline: 1 };
    const funds = await Fund.find(query)
      .populate('organizer', 'name email')
      .sort(sortObj)
      .lean();

    const withAmounts = await Promise.all(
      funds
        .filter(f => f.organizer !== null)
        .map(async f => ({
          ...f,
          collectedAmount: await getCollectedAmount(f._id),
          participantCount: f.participants.filter(p => p.status === 'accepted').length + 1,
        }))
    );

    res.json(withAmounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/funds
router.get('/', auth, async (req, res) => {
  try {
    const { q, status, sort } = req.query;
    const userId = req.user._id;

    const query = {
      $or: [
        { organizer: userId },
        { 'participants.user': userId, 'participants.status': 'accepted' },
      ],
    };
    if (status) query.status = status;
    if (q) query.name = { $regex: q, $options: 'i' };

    let sortObj;
    if (sort === 'deadline_desc') sortObj = { deadline: -1 };
    else if (sort === 'name') sortObj = { name: 1 };
    else sortObj = { deadline: 1 };
    const funds = await Fund.find(query)
      .populate('organizer', 'name email')
      .sort(sortObj)
      .lean();

    const withAmounts = await Promise.all(funds.map(async f => ({
      ...f,
      collectedAmount: await getCollectedAmount(f._id),
      participantCount: f.participants.filter(p => p.status === 'accepted').length + 1,
    })));

    res.json(withAmounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funds
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, goal, type, targetAmount, quotaAmount,
            frequency, deadline, recipientAccount, visibility, coverImage,
            minAmount, expectedParticipants } = req.body;

    if (deadline && !isDeadlineValid(deadline)) {
      return res.status(400).json({ error: 'La fecha límite no puede estar en el pasado y debe ser máximo en 1 año.' });
    }
    if (type === 'quota' && frequency && deadline && !isFrequencyFeasible(frequency, deadline)) {
      return res.status(400).json({
        error: `Un fondo con frecuencia ${FREQ_LABELS[frequency]} requiere al menos ${FREQ_MIN_DAYS[frequency]} días hasta la fecha límite.`,
      });
    }
    if (type === 'quota' && expectedParticipants && Number(expectedParticipants) > 0) {
      const periods  = totalPeriods(frequency, new Date(), deadline);
      const minQuota = Math.ceil(Number(targetAmount) / (periods * Number(expectedParticipants)));
      if (Number(quotaAmount) < minQuota) {
        return res.status(400).json({
          error: `La cuota mínima es $${minQuota.toLocaleString('es-CL')} para alcanzar la meta en ${periods} cuota${periods !== 1 ? 's' : ''} con ${expectedParticipants} participante${Number(expectedParticipants) !== 1 ? 's' : ''}.`,
        });
      }
    }
    if (type === 'free' && minAmount && Number(minAmount) > Number(targetAmount)) {
      return res.status(400).json({ error: 'El monto mínimo no puede ser mayor al total del fondo.' });
    }

    const desc = typeof description === 'string' ? description.trim() : '';
    const goalStr = typeof goal === 'string' ? goal.trim() : '';
    if (!desc || !goalStr) {
      return res.status(400).json({ error: 'La descripción y el objetivo son obligatorios.' });
    }

    const fund = new Fund({
      name, description: desc, goal: goalStr, type, targetAmount, quotaAmount,
      frequency, deadline, recipientAccount, visibility, coverImage,
      minAmount, expectedParticipants,
      organizer: req.user._id,
    });
    await fund.save();
    res.status(201).json(fund);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/funds/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email')
      .populate('messages.user', 'name email');

    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer) return res.status(404).json({ error: 'Fund not found' });

    await autoExpireFund(fund);

    const userId = req.user._id;
    const hasPendingInvitation = fund.participants.some(
      p => (p.user?._id?.equals(userId) || p.user?.equals?.(userId)) && p.invitationToken
    );
    if (!isMember(fund, userId) && fund.visibility !== 'public' && !hasPendingInvitation) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const collectedAmount = await getCollectedAmount(fund._id);
    res.json({ ...fund.toObject(), collectedAmount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/funds/:id/participants/:userId/status
router.get('/:id/participants/:userId/status', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    
    if (req.user._id.toString() !== req.params.userId && !fund.organizer.equals(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { pendingQuotas, remainingQuotas, totalPeriods } = require('../services/quotaService');
    const userContribs = await Contribution.find({ fund: fund._id, user: req.params.userId, status: 'succeeded' }).lean();
    
    let statusObj = {};
    if (fund.type === 'quota') {
      const paid = userContribs.reduce((s, c) => s + (c.quotasPaid || Math.floor(c.amount / fund.quotaAmount)), 0);
      statusObj.pending = pendingQuotas(fund, userContribs);
      statusObj.remaining = remainingQuotas(fund, userContribs);
      statusObj.paid = paid;
      statusObj.total = fund.totalQuotas || totalPeriods(fund.frequency, fund.createdAt, fund.deadline);
    }
    
    res.json(statusObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/funds/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email');
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer._id.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'Fund is not active' });

    const hasContribs = await Contribution.countDocuments({ fund: fund._id, status: 'succeeded' }) > 0;
    const body = req.body;

    if (hasContribs) {
      const locked = LOCKED_FIELDS.find(f => body[f] !== undefined);
      if (locked) {
        return res.status(422).json({ error: `Field '${locked}' is locked after contributions`, field: locked });
      }
    }

    if (body.deadline && !isDeadlineValid(body.deadline)) {
      return res.status(400).json({ error: 'La fecha límite no puede estar en el pasado y debe ser máximo en 1 año.' });
    }
    if (body.deadline !== undefined || body.frequency !== undefined) {
      const effectiveType      = body.type      ?? fund.type;
      const effectiveFrequency = body.frequency ?? fund.frequency;
      const effectiveDeadline  = body.deadline  ?? fund.deadline;
      if (effectiveType === 'quota' && effectiveFrequency && effectiveDeadline && !isFrequencyFeasible(effectiveFrequency, effectiveDeadline)) {
        return res.status(400).json({
          error: `Un fondo con frecuencia ${FREQ_LABELS[effectiveFrequency]} requiere al menos ${FREQ_MIN_DAYS[effectiveFrequency]} días hasta la fecha límite.`,
        });
      }
    }

    const hasInvited = fund.participants.length > 0;
    let wasEdited = false;

    if (hasInvited && body.description && body.description !== fund.description) {
      fund.updateLogs.push({ message: 'El organizador actualizó la descripción' });
    }
    if (hasInvited && body.goal && body.goal !== fund.goal) {
      fund.updateLogs.push({ message: 'El organizador actualizó el objetivo' });
    }

    const allowed = ['name', 'description', 'goal', 'coverImage', 'visibility', 'expectedParticipants', ...(!hasContribs ? LOCKED_FIELDS : [])];
    for (const f of allowed) {
      if (body[f] === undefined) continue;
      if (f === 'description' || f === 'goal') {
        const t = String(body[f]).trim();
        if (!t) {
          return res.status(400).json({
            error: f === 'description' ? 'La descripción no puede estar vacía.' : 'El objetivo no puede estar vacío.',
          });
        }
        if (JSON.stringify(fund[f]) !== JSON.stringify(t)) wasEdited = true;
        fund[f] = t;
        continue;
      }
      if (JSON.stringify(fund[f]) !== JSON.stringify(body[f])) wasEdited = true;
      fund[f] = body[f];
    }

    await fund.save();

    if (wasEdited && hasInvited) {
      sendFundEditedEmail({ fund, organizer: fund.organizer, participants: fund.participants })
        .catch(err => console.error('Edit email failed:', err.message));
    }

    res.json(fund);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/funds/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id)
      .populate('participants.user', 'name email');
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });

    const hasContribs = await Contribution.countDocuments({ fund: fund._id }) > 0;
    if (hasContribs) return res.status(422).json({ error: 'Cannot delete fund with contributions' });

    sendFundDeletedEmail({ fund, participants: fund.participants })
      .catch(err => console.error('Delete email failed:', err.message));

    await fund.deleteOne();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funds/:id/payment — el organizador ejecuta el pago y completa el fondo
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email');
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer._id.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'Fund is not active' });

    const collectedAmount = await getCollectedAmount(fund._id);
    if (collectedAmount <= 0) {
      return res.status(422).json({ error: 'El fondo no tiene saldo disponible para pagar' });
    }

    const transaction = await processPayment({ amount: collectedAmount, recipientAccount: fund.recipientAccount });

    fund.status = 'completed';
    fund.paymentTransaction = {
      transactionId: transaction.transactionId,
      amount:        collectedAmount,
      provider:      transaction.provider,
      paidAt:        new Date(),
    };
    fund.updateLogs.push({ message: `Pago de ${collectedAmount} al destinatario registrado` });
    await fund.save();

    sendStatusChangeEmail({ fund, organizer: fund.organizer, participants: fund.participants })
      .catch(err => console.error('Status change email failed:', err.message));

    res.json({ fund, transaction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funds/:id/reminders — alerta manual de mora a participantes en mora
router.post('/:id/reminders', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id).populate('participants.user', 'name email');
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'Fund is not active' });

    const contributions = await Contribution.find({ fund: fund._id, status: 'succeeded' }).lean();
    const accepted = fund.participants.filter(p => p.status === 'accepted' && p.user?.email);

    let sent = 0;
    for (const p of accepted) {
      const userContribs = contributions.filter(c => c.user.equals(p.user._id));
      const inMora = fund.type === 'quota'
        ? pendingQuotas(fund, userContribs) > 0
        : userContribs.length === 0;

      if (!inMora) continue;

      const pendingCount = fund.type === 'quota' ? pendingQuotas(fund, userContribs) : 0;
      await sendMoraReminderEmail({ fund, user: p.user, pendingCount }).catch(() => {});
      p.lastReminder = new Date();
      sent++;
    }

    await fund.save();
    res.json({ sent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funds/:id/close
router.post('/:id/close', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email');
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer._id.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'Fund is not active' });

    const hasContribs = await Contribution.countDocuments({ fund: fund._id, status: 'succeeded' }) > 0;
    if (hasContribs) return res.status(422).json({ error: 'Cannot close a fund with contributions — pay the recipient instead' });

    fund.status = 'closed';
    await fund.save();

    sendStatusChangeEmail({ fund, organizer: fund.organizer, participants: fund.participants })
      .catch(err => console.error('Status change email failed:', err.message));

    res.json(fund);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// POST /api/funds/:id/messages
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'El mensaje no puede estar vacío' });

    const fund = await Fund.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email');
    if (!fund) return res.status(404).json({ error: 'Fondo no encontrado' });

    if (!isMember(fund, req.user._id)) return res.status(403).json({ error: 'Solo los participantes pueden enviar mensajes' });

    fund.messages.push({
      user: req.user._id,
      text: text.trim(),
    });
    
    await fund.save();
    await fund.populate('messages.user', 'name email');
    res.status(201).json(fund.messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funds/:id/pause
router.post('/:id/pause', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'Fund can only be paused from active state' });

    fund.status = 'paused';
    await fund.save();
    res.json(fund);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funds/:id/resume
router.post('/:id/resume', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });
    if (fund.status !== 'paused') return res.status(422).json({ error: 'Fund is not paused' });

    fund.status = 'active';
    await fund.save();
    res.json(fund);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.getCollectedAmount = getCollectedAmount;
module.exports.isMember = isMember;
