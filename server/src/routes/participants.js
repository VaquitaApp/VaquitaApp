const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Fund = require('../models/Fund');
const Contribution = require('../models/Contribution');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');

const router = express.Router({ mergeParams: true });

// POST /api/funds/:id/invitations
router.post('/invitations', auth, async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (!fund.organizer.equals(req.user._id)) return res.status(403).json({ error: 'Not the organizer' });
    if (fund.status !== 'active') return res.status(422).json({ error: 'Fund is not active' });
    if (new Date(fund.deadline) <= new Date()) return res.status(422).json({ error: 'Fund deadline has passed' });

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const target = await User.findById(userId).select('_id name email').lean();
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (fund.organizer.equals(userId)) return res.status(422).json({ error: 'Cannot invite the organizer' });

    const existing = fund.participants.find(p => p.user.equals(userId));
    if (existing) return res.status(409).json({ error: 'User already invited', status: existing.status });

    const token = uuidv4();
    fund.participants.push({ user: userId, status: 'pending', invitationToken: token, invitedAt: new Date() });
    await fund.save();

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const acceptUrl = `${baseUrl}/invitaciones/${token}?action=accept`;
    const rejectUrl = `${baseUrl}/invitaciones/${token}?action=reject`;

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
    res.status(201).json(fund.participants);
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

    const hasContribs = await Contribution.countDocuments({ fund: fund._id, user: req.params.userId }) > 0;
    if (hasContribs) return res.status(422).json({ error: 'Cannot remove participant with contributions' });

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
    if (!isOrganizer && !isParticipant) return res.status(403).json({ error: 'Access denied' });

    const contributions = await Contribution.find({ fund: fund._id, status: 'succeeded' }).lean();

    const participants = fund.participants.map(p => {
      let contributionStatus = null;
      if (p.status === 'accepted') {
        const userContribs = contributions.filter(c => c.user.equals(p.user._id));
        if (userContribs.length > 0) {
          const latest = userContribs.sort((a, b) => b.date - a.date)[0];
          const daysSince = (Date.now() - latest.date) / 86400000;
          const windowMap = { monthly: 30, biweekly: 14, weekly: 7 };
          const window = windowMap[fund.frequency];
          contributionStatus = (fund.type === 'free' || daysSince <= window) ? 'onTime' : 'overdue';
        } else {
          const daysUntilDeadline = (new Date(fund.deadline) - Date.now()) / 86400000;
          contributionStatus = daysUntilDeadline < 0 ? 'overdue' : 'pending';
        }
      }

      return {
        _id: p._id,
        user: p.user,
        status: p.status,
        contributionStatus,
        invitedAt: p.invitedAt,
        respondedAt: p.respondedAt,
      };
    });

    res.json(participants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
