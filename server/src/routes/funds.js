const express = require('express');
const Fund = require('../models/Fund');
const Contribution = require('../models/Contribution');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { processPayment } = require('../services/paymentService');
<<<<<<< HEAD
const { sendEmail, sendStatusChangeEmail, sendDeadlineExtendedEmail } = require('../services/emailService');
=======
const { sendEmail, sendStatusChangeEmail, sendFundDeletedEmail } = require('../services/emailService');
>>>>>>> feature/SCRUM-10-modal-confirmacion-eliminar

const router = express.Router();

// Locked fields once contributions exist
<<<<<<< HEAD
const LOCKED_FIELDS = ['targetAmount', 'deadline', 'recipientAccount', 'frequency', 'quotaAmount', 'minAmount', 'type', 'visibility'];
=======
const LOCKED_FIELDS = ['targetAmount', 'deadline', 'recipientAccount', 'frequency', 'quotaAmount', 'type'];
>>>>>>> feature/hu09-editar-fondo

function isDeadlineValid(deadline) {
  const today = new Date();
  const dl = new Date(deadline);
  
  const todayStr = today.toISOString().slice(0, 10);
  const dlStr = dl.toISOString().slice(0, 10);
  
  if (dlStr < todayStr) return false;
  
  const oneYearFromNow = new Date(today);
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  const maxStr = oneYearFromNow.toISOString().slice(0, 10);
  
  return dlStr <= maxStr;
}

// Helper: compute collectedAmount for a fund
async function getCollectedAmount(fundId) {
  const result = await Contribution.aggregate([
    { $match: { fund: fundId, status: 'succeeded' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total ?? 0;
}

// Helper: check if caller is organizer or accepted participant
function isMember(fund, userId) {
  if (fund.organizer._id?.equals(userId) || fund.organizer.equals?.(userId)) return true;
  return fund.participants.some(
    p => p.user.equals(userId) && p.status === 'accepted'
  );
}

// GET /api/funds/public — must be before /:id
router.get('/public', auth, async (req, res) => {
  try {
    const { q, sort } = req.query;
    const query = { visibility: 'public', status: 'active' };
    if (q) query.name = { $regex: q, $options: 'i' };

    const sortObj = sort === 'deadline_desc' ? { deadline: -1 } : { deadline: 1 };
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
          participantCount: f.participants.filter(p => p.status === 'accepted').length,
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

    const sortObj = sort === 'deadline_desc' ? { deadline: -1 } : { deadline: 1 };
    const funds = await Fund.find(query)
      .populate('organizer', 'name email')
      .sort(sortObj)
      .lean();

    const withAmounts = await Promise.all(funds.map(async f => ({
      ...f,
      collectedAmount: await getCollectedAmount(f._id),
      participantCount: f.participants.filter(p => p.status === 'accepted').length,
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
            frequency, deadline, recipientAccount, visibility, coverImage, minAmount } = req.body;

    if (deadline && !isDeadlineValid(deadline)) {
      return res.status(400).json({ error: 'La fecha límite no puede estar en el pasado y debe ser máximo en 1 año.' });
    }
    if (type === 'quota' && Number(quotaAmount) > Number(targetAmount)) {
      return res.status(400).json({ error: 'El valor de la cuota no puede ser mayor al total del fondo.' });
    }
    if (type === 'free' && minAmount && Number(minAmount) > Number(targetAmount)) {
      return res.status(400).json({ error: 'El monto mínimo no puede ser mayor al total del fondo.' });
    }

    const fund = new Fund({
      name, description, goal, type, targetAmount, quotaAmount,
      frequency, deadline, recipientAccount, visibility, coverImage, minAmount,
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

    const userId = req.user._id;
    const isOrganizer = fund.organizer._id.equals(userId);
    const isParticipant = fund.participants.some(
      p => p.user?._id.equals(userId) && p.status === 'accepted'
    );
    if (!isOrganizer && !isParticipant && fund.visibility !== 'public') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const collectedAmount = await getCollectedAmount(fund._id);
    res.json({ ...fund.toObject(), collectedAmount });
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

    const hasInvited = fund.participants.length > 0;
    const oldDeadline = fund.deadline ? new Date(fund.deadline) : null;
    let deadlineExtended = false;

    if (hasInvited && body.description && body.description !== fund.description) {
      fund.updateLogs.push({ message: 'El organizador actualizó la descripción' });
    }
    if (hasInvited && body.goal && body.goal !== fund.goal) {
      fund.updateLogs.push({ message: 'El organizador actualizó el objetivo' });
    }

    if (body.deadline && oldDeadline) {
      const newDeadline = new Date(body.deadline);
      if (newDeadline.getTime() > oldDeadline.getTime()) {
        deadlineExtended = true;
      }
    }

    const allowed = ['name', 'description', 'goal', 'coverImage', 'visibility', ...(!hasContribs ? LOCKED_FIELDS : [])];
    allowed.forEach(f => { if (body[f] !== undefined) fund[f] = body[f]; });

    await fund.save();

    if (deadlineExtended) {
      sendDeadlineExtendedEmail({ fund, organizer: fund.organizer, participants: fund.participants, newDate: fund.deadline })
        .catch(err => console.error('Deadline email failed:', err.message));
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

// POST /api/funds/:id/payment — organizer triggers payout, marks fund completed
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email');
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer._id.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'Fund is not active' });

    const collectedAmount = await getCollectedAmount(fund._id);
    const transaction = await processPayment({ amount: collectedAmount, recipientAccount: fund.recipientAccount });

    await Contribution.create({
      fund: fund._id,
      user: req.user._id,
      amount: collectedAmount,
      method: 'simulation',
      transactionId: transaction.transactionId,
      provider: transaction.provider,
      status: 'succeeded',
    });

    fund.status = 'completed';
    await fund.save();

    sendStatusChangeEmail({ fund, organizer: fund.organizer, participants: fund.participants })
      .catch(err => console.error('Status change email failed:', err.message));

    res.json({ fund, transaction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funds/:id/reminders — manual reminder to all accepted participants
router.post('/:id/reminders', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id).populate('participants.user', 'name email');
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'Fund is not active' });

    const accepted = fund.participants.filter(p => p.status === 'accepted' && p.user?.email);
    let sent = 0;

    for (const p of accepted) {
      await sendEmail({
        to: p.user.email,
        subject: `Recordatorio: fondo "${fund.name}"`,
        html: `<p>Hola ${p.user.name}, recuerda registrar tu aporte al fondo <b>${fund.name}</b>. Fecha límite: ${new Date(fund.deadline).toLocaleDateString('es-CL')}.</p>`,
      }).catch(() => {});
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

    const isMember = fund.organizer._id.equals(req.user._id) || 
      fund.participants.some(p => p.user?._id?.equals(req.user._id) && p.status === 'accepted');

    if (!isMember) return res.status(403).json({ error: 'Solo los participantes pueden enviar mensajes' });

    fund.messages.push({
      user: req.user._id,
      text: text.trim(),
    });
    
    await fund.save();
    
    const updatedFund = await Fund.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email')
      .populate('messages.user', 'name email');
      
    res.status(201).json(updatedFund.messages);
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
