const express = require('express');
const Fund = require('../models/Fund');
const { sendJoinRequestAcceptedEmail } = require('../services/emailService');
const { ERR_DEADLINE_EXPIRED } = require('../errors');

const router = express.Router();

async function respond(req, res, action) {
  try {
    const { token } = req.params;
    const fund = await Fund.findOne({ 'participants.joinRequestToken': token })
      .populate('organizer', 'name email')
      .populate('participants.user', 'name email');

    if (!fund) return res.status(404).json({ error: 'Solicitud inválida o expirada' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'El fondo ya no está activo' });
    if (new Date(fund.deadline).toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)) {
      return res.status(422).json({ error: ERR_DEADLINE_EXPIRED });
    }

    const idx = fund.participants.findIndex(p => p.joinRequestToken === token);
    const participant = fund.participants[idx];

    if (action === 'accepted') {
      participant.status           = 'accepted';
      participant.respondedAt      = new Date();
      participant.joinRequestToken = undefined;
      await fund.save();

      if (participant.user?.email) {
        sendJoinRequestAcceptedEmail({
          to:       participant.user.email,
          name:     participant.user.name,
          fundName: fund.name,
          fundId:   fund._id.toString(),
        }).catch(() => {});
      }
    } else {
      fund.participants.splice(idx, 1);
      await fund.save();
    }

    res.json({
      message: action === 'accepted' ? 'Solicitud aceptada' : 'Solicitud cancelada',
      fund: { name: fund.name, deadline: fund.deadline },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.post('/:token/accept', (req, res) => respond(req, res, 'accepted'));
router.post('/:token/reject', (req, res) => respond(req, res, 'rejected'));

module.exports = router;
