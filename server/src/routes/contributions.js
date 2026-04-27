const express = require('express');
const Fund = require('../models/Fund');
const Contribution = require('../models/Contribution');
const auth = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// POST /api/funds/:id/contributions
router.post('/', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });

    const userId = req.user._id;
    const isOrganizer = fund.organizer.equals(userId);
    const isAccepted = fund.participants.some(p => p.user.equals(userId) && p.status === 'accepted');
    if (!isOrganizer && !isAccepted) return res.status(403).json({ error: 'Access denied' });

    const { amount, method, date } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });

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
