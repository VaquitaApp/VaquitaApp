const express = require('express');
const Fund = require('../models/Fund');
const Contribution = require('../models/Contribution');
const auth = require('../middleware/auth');

const router = express.Router();

// Locked fields once contributions exist
const LOCKED_FIELDS = ['targetAmount', 'deadline', 'recipientAccount', 'frequency', 'quotaAmount'];

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
            frequency, deadline, recipientAccount, visibility } = req.body;

    const fund = new Fund({
      name, description, goal, type, targetAmount, quotaAmount,
      frequency, deadline, recipientAccount, visibility,
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
      .populate('participants.user', 'name email');

    if (!fund) return res.status(404).json({ error: 'Fund not found' });

    const userId = req.user._id;
    const isOrganizer = fund.organizer._id.equals(userId);
    const isParticipant = fund.participants.some(
      p => p.user._id.equals(userId) && p.status === 'accepted'
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
    const fund = await Fund.findById(req.params.id);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'Fund is not active' });

    const hasContribs = await Contribution.countDocuments({ fund: fund._id, status: 'succeeded' }) > 0;
    const body = req.body;

    if (hasContribs) {
      const locked = LOCKED_FIELDS.find(f => body[f] !== undefined);
      if (locked) {
        return res.status(422).json({ error: `Field '${locked}' is locked after contributions`, field: locked });
      }
    }

    const allowed = ['name', 'description', 'goal', 'visibility', ...(!hasContribs ? LOCKED_FIELDS : [])];
    allowed.forEach(f => { if (body[f] !== undefined) fund[f] = body[f]; });

    await fund.save();
    res.json(fund);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/funds/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });

    const hasContribs = await Contribution.countDocuments({ fund: fund._id }) > 0;
    if (hasContribs) return res.status(422).json({ error: 'Cannot delete fund with contributions' });

    await fund.deleteOne();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funds/:id/close
router.post('/:id/close', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'Fund is not active' });

    fund.status = 'closed';
    await fund.save();
    res.json(fund);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.getCollectedAmount = getCollectedAmount;
module.exports.isMember = isMember;
