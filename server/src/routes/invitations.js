const express = require('express');
const Fund = require('../models/Fund');

const router = express.Router();

async function respond(req, res, action) {
  try {
    const { token } = req.params;
    const fund = await Fund.findOne({ 'participants.invitationToken': token });
    if (!fund) return res.status(404).json({ error: 'Invalid or expired invitation' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'Fund is no longer active' });
    if (new Date(fund.deadline).toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)) {
      return res.status(422).json({ error: 'La fecha límite del fondo ha vencido' });
    }

    const idx = fund.participants.findIndex(p => p.invitationToken === token);
    const participant = fund.participants[idx];

    if (action === 'accepted') {
      participant.status          = 'accepted';
      participant.respondedAt     = new Date();
      participant.invitationToken = undefined;
    } else {
      fund.participants.splice(idx, 1);
    }

    await fund.save();

    res.json({
      message: action === 'accepted' ? 'Invitación aceptada' : 'Invitación cancelada',
      fund: { name: fund.name, deadline: fund.deadline },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.post('/:token/accept', (req, res) => respond(req, res, 'accepted'));
router.post('/:token/reject', (req, res) => respond(req, res, 'rejected'));

module.exports = router;
