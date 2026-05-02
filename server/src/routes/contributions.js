const express = require('express');
const Fund = require('../models/Fund');
const Contribution = require('../models/Contribution');
const auth = require('../middleware/auth');
const { pendingQuotas } = require('../services/quotaService');

const router = express.Router({ mergeParams: true });

// POST /api/funds/:id/contributions
router.post('/', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });

    if (fund.status !== 'active') return res.status(403).json({ error: 'Fund is not active' });

    const userId = req.user._id;
    const isOrganizer = fund.organizer.equals(userId);
    const isAccepted = fund.participants.some(p => p.user.equals(userId) && p.status === 'accepted');
    if (!isOrganizer && !isAccepted) return res.status(403).json({ error: 'Access denied' });

    const { amount, method, date } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });

    if (fund.type === 'quota') {
      const userContribs = await Contribution.find({ fund: fund._id, user: userId, status: 'succeeded' }).lean();
      const pending = pendingQuotas(fund, userContribs);
      if (pending === 0) {
        return res.status(400).json({ error: 'Estás al día, no tienes cuotas pendientes.' });
      }
      const required = pending * fund.quotaAmount;
      if (Number(amount) !== required) {
        return res.status(400).json({
          error: `Debes pagar ${pending} cuota${pending !== 1 ? 's' : ''} pendiente${pending !== 1 ? 's' : ''} — monto requerido: $${required.toLocaleString('es-CL')} CLP`,
          requiredAmount: required,
          pendingQuotas: pending,
        });
      }
    }

    if (fund.type === 'free' && fund.minAmount && Number(amount) < fund.minAmount) {
      return res.status(400).json({
        error: `El monto mínimo de aporte es ${fund.minAmount.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`,
        minAmount: fund.minAmount,
      });
    }

    const contribution = await Contribution.create({
      fund: fund._id,
      user: userId,
      amount: Number(amount),
      method: method || 'transfer',
      date: date ? new Date(date) : new Date(),
      status: 'succeeded',
    });

    res.status(201).json(contribution);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/funds/:id/contributions
router.get('/', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });

    const userId = req.user._id;
    const isOrganizer = fund.organizer.equals(userId);
    const isParticipant = fund.participants.some(p => p.user.equals(userId) && p.status === 'accepted');
    if (!isOrganizer && !isParticipant && fund.visibility !== 'public') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const contributions = await Contribution.find({ fund: fund._id, status: 'succeeded' })
      .populate('user', 'name email')
      .sort({ date: -1 })
      .lean();

    res.json(contributions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
