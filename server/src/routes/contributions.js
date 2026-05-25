const express = require('express');
const Contribution = require('../models/Contribution');
const auth = require('../middleware/auth');
const { requireFund, isOrganizer } = require('../middleware/funds');
const { pendingQuotas } = require('../services/quotaService');

const router = express.Router({ mergeParams: true });

// POST /api/funds/:id/contributions
router.post('/', auth, requireFund(), async (req, res) => {
  try {
    const fund = req.fund;
    if (fund.status !== 'active') return res.status(403).json({ error: 'Fund is not active' });

    const userId = req.user._id;
    const isOrg = isOrganizer(fund, userId);
    const isAccepted = fund.participants.some(p => p.user.equals(userId) && p.status === 'accepted');
    if (!isOrg && !isAccepted) return res.status(403).json({ error: 'Access denied' });

    const { amount, method, date, quotasPaid } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });

    let finalQuotasPaid = quotasPaid ? Number(quotasPaid) : (fund.type === 'quota' ? Math.floor(Number(amount) / fund.quotaAmount) : 1);
    if (finalQuotasPaid < 1) finalQuotasPaid = 1;

    if (fund.type === 'quota') {
      const userContribs = await Contribution.find({ fund: fund._id, user: userId, status: 'succeeded' }).lean();
      
      const { remainingQuotas } = require('../services/quotaService');
      const remaining = remainingQuotas(fund, userContribs);

      if (remaining === 0) {
        return res.status(400).json({ error: 'Estás al día, no tienes cuotas pendientes.' });
      }

      if (finalQuotasPaid > remaining) {
        return res.status(400).json({ error: `Solo te quedan ${remaining} cuotas por pagar.` });
      }

      const required = finalQuotasPaid * fund.quotaAmount;
      if (Number(amount) !== required) {
        return res.status(400).json({
          error: `Debes pagar $${required.toLocaleString('es-CL')} CLP por ${finalQuotasPaid} cuota(s).`,
          requiredAmount: required,
          pendingQuotas: remaining,
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
      quotasPaid: finalQuotasPaid,
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
router.get('/', auth, requireFund(), async (req, res) => {
  try {
    const fund = req.fund;
    const userId = req.user._id;
    const isOrg = isOrganizer(fund, userId);
    const isParticipant = fund.participants.some(p => p.user.equals(userId) && p.status === 'accepted');
    if (!isOrg && !isParticipant && fund.visibility !== 'public') {
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
