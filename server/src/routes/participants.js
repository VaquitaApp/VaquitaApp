const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Fund = require('../models/Fund');
const Contribution = require('../models/Contribution');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { pendingQuotas } = require('../services/quotaService');
const {
  sendEmail,
  sendJoinRequestEmail,
  sendAccessRequestToOrganizer,
} = require('../services/emailService');

const router = express.Router({ mergeParams: true });

// POST /api/funds/:id/invitations
router.post('/invitations', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'Fund is not active' });
    if (new Date(fund.deadline).toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)) {
      return res.status(422).json({ error: 'La fecha límite del fondo ha vencido' });
    }

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const target = await User.findById(userId).select('_id name email').lean();
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (fund.organizer.equals(userId)) return res.status(422).json({ error: 'Cannot invite the organizer' });

    const existing = fund.participants.find(p => p.user.equals(userId));
    let statusCode = 201;

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(409).json({ error: 'User already a participant' });
      }
      existing.invitationToken = uuidv4();
      existing.joinRequestToken = undefined;
      existing.status = 'pending';
      existing.invitedAt = new Date();
      existing.respondedAt = undefined;
      statusCode = 200;
    } else {
      fund.participants.push({ user: userId, status: 'pending', invitationToken: uuidv4(), invitedAt: new Date() });
    }

    await fund.save();

    const participant = fund.participants.find(p => p.user.equals(userId));
    const invToken = participant.invitationToken;
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const acceptUrl = `${baseUrl}/invitaciones/${invToken}?action=accept`;
    const rejectUrl = `${baseUrl}/invitaciones/${invToken}?action=reject`;

    sendEmail({
      to: target.email,
      subject: `Invitación al fondo "${fund.name}"`,
      html: `
        <p>Hola ${target.name},</p>
        <p>Has sido invitado al fondo <strong>${fund.name}</strong>.</p>
        <p>
          <a href="${acceptUrl}" style="background:#4f46e5;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;">Aceptar</a>
          &nbsp;
          <a href="${rejectUrl}" style="background:#6b7280;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;">Rechazar</a>
        </p>
      `,
    }).catch(() => {});

    await fund.populate('participants.user', 'name email');
    res.status(statusCode).json(fund.participants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funds/:id/join-request
router.post('/join-request', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id).populate('organizer', 'name email');
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (fund.visibility !== 'public') return res.status(403).json({ error: 'El fondo no es público' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'El fondo no está activo' });
    if (new Date(fund.deadline).toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)) {
      return res.status(422).json({ error: 'La fecha límite del fondo ha vencido' });
    }
    if (fund.organizer._id.equals(req.user._id)) {
      return res.status(422).json({ error: 'El organizador no puede solicitar unirse a su propio fondo' });
    }

    const requester = await User.findById(req.user._id).select('name email').lean();
    const existing = fund.participants.find(p => p.user.equals(req.user._id));

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(409).json({ error: 'Ya eres participante de este fondo' });
      }
      if (existing.invitationToken && existing.status === 'pending') {
        return res.status(409).json({ error: 'Ya tienes una invitación pendiente del organizador, revisa tu correo' });
      }
      existing.joinRequestToken = uuidv4();
      existing.status = 'pending';
      existing.invitedAt = new Date();
      existing.respondedAt = undefined;
    } else {
      fund.participants.push({ user: req.user._id, status: 'pending', joinRequestToken: uuidv4(), invitedAt: new Date() });
    }

    await fund.save();

    const participant = fund.participants.find(p => p.user.equals(req.user._id));
    sendJoinRequestEmail({
      to: fund.organizer.email,
      organizerName: fund.organizer.name,
      requesterName: requester.name,
      fundName: fund.name,
      token: participant.joinRequestToken,
    }).catch(() => {});

    res.status(201).json({ message: 'Solicitud enviada al organizador' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/funds/:id/invitations/:userId
router.delete('/invitations/:userId', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id).populate('participants.user', 'name email');
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });

    const participant = fund.participants.find(p => p.user?._id?.equals(req.params.userId));
    if (!participant) return res.status(404).json({ error: 'Invitation not found' });
    if (participant.status !== 'pending') {
      return res.status(422).json({ error: 'Only pending invitations can be canceled' });
    }

    fund.participants = fund.participants.filter(p => !p.user?._id?.equals(req.params.userId));
    await fund.save();
    await fund.populate('participants.user', 'name email');

    res.json(fund.participants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/funds/:id/participants/:userId
router.delete('/participants/:userId', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });

    const hasContribs = await Contribution.countDocuments({
      fund: fund._id,
      user: req.params.userId,
      status: 'succeeded',
    }) > 0;
    if (hasContribs) return res.status(422).json({ error: 'Este participante no se puede eliminar' });

    fund.participants = fund.participants.filter(p => !p.user.equals(req.params.userId));
    await fund.save();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/funds/:id/participants
router.get('/participants', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id).populate('participants.user', 'name email');
    if (!fund) return res.status(404).json({ error: 'Fund not found' });

    const userId = req.user._id;
    const isOrganizer = fund.organizer.equals(userId);
    const isParticipant = fund.participants.some(p => p.user._id.equals(userId) && p.status === 'accepted');
    const isPendingInvitee = fund.participants.some(p => p.user._id.equals(userId) && p.invitationToken);
    if (!isOrganizer && !isParticipant && !isPendingInvitee) return res.status(403).json({ error: 'Access denied' });

    const contributions = await Contribution.find({ fund: fund._id, status: 'succeeded' }).lean();

    const participants = fund.participants.map(p => {
      let contributionStatus = null;
      let contributionCount = 0;
      if (p.status === 'accepted') {
        const userContribs = contributions.filter(c => c.user.equals(p.user._id));
        contributionCount = userContribs.length;
        if (fund.type === 'quota') {
          const pending = pendingQuotas(fund, userContribs);
          contributionStatus = pending > 0 ? 'overdue' : 'onTime';
        } else {
          contributionStatus = userContribs.length > 0 ? 'onTime' : 'overdue';
        }
      }

      return {
        _id: p._id,
        user: p.user,
        status: p.status,
        contributionCount,
        contributionStatus,
        hasInvitation: !!p.invitationToken,
        invitedAt: p.invitedAt,
        respondedAt: p.respondedAt,
      };
    });

    res.json(participants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funds/:id/accept-my-invitation — el participante invitado acepta la invitación sin usar el token
router.post('/accept-my-invitation', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'Fund is not active' });
    if (new Date(fund.deadline).toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)) {
      return res.status(422).json({ error: 'La fecha límite del fondo ha vencido' });
    }

    const idx = fund.participants.findIndex(p => p.user.equals(req.user._id) && p.invitationToken);
    if (idx === -1) return res.status(404).json({ error: 'No pending invitation found' });

    fund.participants[idx].status = 'accepted';
    fund.participants[idx].respondedAt = new Date();
    fund.participants[idx].invitationToken = undefined;

    await fund.save();
    res.json({ message: 'Invitación aceptada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funds/:id/access-requests — solicitud de acceso a fondo público (subdocumento accessRequests)
router.post('/access-requests', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id).populate('organizer', 'name email');
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (fund.visibility !== 'public') {
      return res.status(403).json({ error: 'Este fondo no es público' });
    }
    if (fund.status !== 'active') {
      return res.status(422).json({ error: 'Fund is not active' });
    }
    if (new Date(fund.deadline).toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)) {
      return res.status(422).json({ error: 'Fund deadline has passed' });
    }

    const userId = req.user._id;
    const orgId = fund.organizer._id ?? fund.organizer;
    if (orgId.equals(userId)) {
      return res.status(422).json({ error: 'El organizador no puede solicitar acceso' });
    }

    const accepted = fund.participants.some(p => p.user.equals(userId) && p.status === 'accepted');
    if (accepted) {
      return res.status(409).json({ error: 'Ya eres participante de este fondo' });
    }

    const pendingInvite = fund.participants.some(p => p.user.equals(userId) && p.status === 'pending');
    if (pendingInvite) {
      return res.status(409).json({ error: 'Ya tienes una invitacion pendiente para este fondo' });
    }

    const requester = await User.findById(userId).select('name email').lean();
    if (!requester) return res.status(404).json({ error: 'User not found' });

    const token = uuidv4();
    const reqs = fund.accessRequests || [];
    fund.accessRequests = reqs.filter(
      ar => !(ar.user.equals(userId) && ar.status === 'pending'),
    );
    fund.accessRequests.push({
      user: userId,
      token,
      status: 'pending',
      requestedAt: new Date(),
    });

    await fund.save();

    const organizer = fund.organizer;
    sendAccessRequestToOrganizer({
      to: organizer.email,
      organizerName: organizer.name,
      requesterName: requester.name,
      fundName: fund.name,
      token,
    }).catch(() => {});

    res.status(201).json({ message: 'Solicitud enviada al organizador' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
