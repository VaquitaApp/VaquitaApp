const express = require('express');
const Fund = require('../models/Fund');

const router = express.Router();

async function respond(req, res, action) {
  try {
    const { token } = req.params;
    const fund = await Fund.findOne({ 'participants.invitationToken': token });
    if (!fund) return res.status(404).json({ error: 'Invalid or expired invitation' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'Fund is no longer active' });
    if (new Date(fund.deadline) <= new Date()) return res.status(422).json({ error: 'Fund deadline has passed' });

    const participant = fund.participants.find(p => p.invitationToken === token);
    participant.status = action;
    participant.respondedAt = new Date();
    await fund.save();

    res.json({ message: action === 'accepted' ? 'Invitación aceptada' : 'Invitación rechazada', fund: { name: fund.name, deadline: fund.deadline } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.post('/:token/accept', (req, res) => respond(req, res, 'accepted'));
router.post('/:token/reject', (req, res) => respond(req, res, 'rejected'));

module.exports = router;
