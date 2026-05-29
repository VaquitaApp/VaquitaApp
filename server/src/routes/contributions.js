const express = require('express');
const Contribution = require('../models/Contribution');
const auth = require('../middleware/auth');
const { requireFund, isOrganizer } = require('../middleware/funds');
const { ERR_FUND_NOT_ACTIVE, ERR_ACCESS_DENIED } = require('../errors');

// Suma de aportes exitosos del fondo (para el tope de meta).
async function getCollected(fundId) {
  const r = await Contribution.aggregate([
    { $match: { fund: fundId, status: 'succeeded' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return r[0]?.total ?? 0;
}

const router = express.Router({ mergeParams: true });

// POST /api/funds/:id/contributions
router.post('/', auth, requireFund(), async (req, res) => {
  try {
    const fund = req.fund;
    if (fund.status !== 'active') return res.status(403).json({ error: ERR_FUND_NOT_ACTIVE });

    const userId = req.user._id;
    const isOrg = isOrganizer(fund, userId);
    const isAccepted = fund.participants.some(p => p.user.equals(userId) && p.status === 'accepted');
    if (!isOrg && !isAccepted) return res.status(403).json({ error: ERR_ACCESS_DENIED });

    const { amount, method, date, paidQuotas } = req.body;
    const amt = Number(amount);
    if (!amount || amt <= 0) return res.status(400).json({ error: 'amount must be > 0' });

    // Tope global de meta: ningún aporte puede hacer que lo recaudado supere targetAmount.
    const collected = await getCollected(fund._id);
    const remainingToTarget = Math.max(0, fund.targetAmount - collected);
    if (remainingToTarget <= 0) {
      return res.status(400).json({ error: 'El fondo ya alcanzó su meta. No se aceptan más aportes.' });
    }
    if (amt > remainingToTarget) {
      return res.status(400).json({
        error: `El monto excede el restante para alcanzar la meta ($${remainingToTarget.toLocaleString('es-CL')} CLP).`,
        remaining: remainingToTarget,
      });
    }

    let finalPaidQuotas = 1;
    if (fund.type === 'quota') {
      finalPaidQuotas = paidQuotas ? Number(paidQuotas) : Math.floor(amt / fund.quotaAmount);
      if (finalPaidQuotas < 1) finalPaidQuotas = 1;

      // El único tope es la meta del fondo: un participante puede aportar cuotas extra
      // (más allá de su parte esperada) mientras al fondo le falte para completarse.
      const maxN = Math.floor(remainingToTarget / fund.quotaAmount);
      if (maxN === 0) {
        return res.status(400).json({
          error: `Queda menos del valor de una cuota ($${fund.quotaAmount.toLocaleString('es-CL')} CLP) para completar el fondo.`,
        });
      }
      if (finalPaidQuotas > maxN) {
        return res.status(400).json({
          error: `Solo puedes pagar hasta ${maxN} cuota${maxN !== 1 ? 's' : ''} más (lo que falta para completar el fondo).`,
          maxQuotas: maxN,
        });
      }

      const required = finalPaidQuotas * fund.quotaAmount;
      if (amt !== required) {
        return res.status(400).json({
          error: `Debes pagar $${required.toLocaleString('es-CL')} CLP por ${finalPaidQuotas} cuota(s).`,
          requiredAmount: required,
        });
      }
    }

    if (fund.type === 'free' && fund.minAmount && amt < fund.minAmount) {
      return res.status(400).json({
        error: `El monto mínimo de aporte es ${fund.minAmount.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`,
        minAmount: fund.minAmount,
      });
    }

    const contribution = await Contribution.create({
      fund: fund._id,
      user: userId,
      amount: amt,
      paidQuotas: fund.type === 'quota' ? finalPaidQuotas : 1,
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
      return res.status(403).json({ error: ERR_ACCESS_DENIED });
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
