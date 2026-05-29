const express = require('express');
const mongoose = require('mongoose');
const Fund = require('../models/Fund');
const User = require('../models/User');
const { isFundExpired } = require('../utils/funds');
const { sendAccessRequestDecisionToUser } = require('../services/emailService');

const router = express.Router();

function sendDecisionEmailOnce(requester, fundName, accepted) {
  sendAccessRequestDecisionToUser({
    to: requester.email,
    name: requester.name,
    fundName,
    accepted,
  }).catch(() => {});
}

/** Respuesta idempotente si otro request ya persistió la misma acción (p. ej. doble POST concurrente). */
async function respondIdempotentAfterVersionError(fundId, accessRequestSubId, accepted) {
  const fresh = await Fund.findById(fundId);
  if (!fresh) return null;
  const arFresh = accessRequestSubId ? fresh.accessRequests.id(accessRequestSubId) : null;
  if (accepted && arFresh?.status === 'accepted') {
    return {
      message: 'Solicitud aceptada',
      fund: { name: fresh.name },
    };
  }
  if (!accepted && arFresh?.status === 'rejected') {
    return {
      message: 'Solicitud rechazada',
      fund: { name: fresh.name },
    };
  }
  return null;
}

async function respond(req, res, accepted) {
  try {
    const { token } = req.params;
    const fund = await Fund.findOne({ 'accessRequests.token': token });
    if (!fund) {
      return res.status(404).json({ error: 'La solicitud es inválida o ya no está disponible.' });
    }
    if (fund.status !== 'active') {
      return res.status(422).json({ error: 'No puedes responder: el fondo está cerrado o completado.' });
    }
    if (isFundExpired(fund)) {
      return res.status(422).json({ error: 'No puedes responder: la fecha límite del fondo ya fue superada.' });
    }

    const reqDoc = fund.accessRequests.find(r => r.token === token);
    if (!reqDoc || reqDoc.status !== 'pending') {
      return res.status(404).json({ error: 'La solicitud es inválida o ya no está disponible.' });
    }

    const accessRequestSubId = reqDoc._id;
    const requester = await User.findById(reqDoc.user).select('name email').lean();
    if (!requester) {
      return res.status(404).json({ error: 'La solicitud es inválida o ya no está disponible.' });
    }

    if (accepted) {
      reqDoc.status = 'accepted';
      reqDoc.respondedAt = new Date();
      reqDoc.token = undefined;

      const existing = fund.participants.find(p => p.user.equals(reqDoc.user));
      if (existing) {
        if (existing.status !== 'accepted') {
          existing.status = 'accepted';
          existing.invitationToken = undefined;
          if (!existing.invitedAt) existing.invitedAt = new Date();
          existing.respondedAt = new Date();
        }
      } else {
        fund.participants.push({
          user: reqDoc.user,
          status: 'accepted',
          invitedAt: new Date(),
          respondedAt: new Date(),
        });
      }
    } else {
      reqDoc.status = 'rejected';
      reqDoc.respondedAt = new Date();
      reqDoc.token = undefined;
    }

    try {
      await fund.save();
    } catch (saveErr) {
      if (saveErr instanceof mongoose.Error.VersionError) {
        const recovered = await respondIdempotentAfterVersionError(
          fund._id,
          accessRequestSubId,
          accepted,
        );
        if (recovered) {
          return res.json(recovered);
        }
      }
      throw saveErr;
    }

    sendDecisionEmailOnce(requester, fund.name, accepted);

    res.json({
      message: accepted ? 'Solicitud aceptada' : 'Solicitud rechazada',
      fund: { name: fund.name },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.post('/:token/accept', (req, res) => respond(req, res, true));
router.post('/:token/reject', (req, res) => respond(req, res, false));

module.exports = router;
