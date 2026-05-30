const express = require('express');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Fund = require('../models/Fund');
const auth = require('../middleware/auth');
const { sendDeleteConfirmationEmail } = require('../services/emailService');

const router = express.Router();

// GET /api/users/search?q=<string>
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name:  { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    }).select('_id name email').limit(10).lean();

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/profile
router.patch('/profile', auth, async (req, res) => {
  try {
    const { name, preferredAccount } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Validación para el CA7: Número de cuenta solo acepta dígitos
    if (preferredAccount && preferredAccount.accountNumber) {
      if (!/^\d+$/.test(preferredAccount.accountNumber)) {
        return res.status(400).json({ error: 'El número de cuenta solo debe contener dígitos' });
      }
    }

    if (name)             user.name             = name.trim();
    if (preferredAccount) user.preferredAccount = preferredAccount;
    await user.save();
    res.json({
      user: {
        _id: user._id, name: user.name, email: user.email,
        userType: user.userType, preferredAccount: user.preferredAccount,
      },
    });
  } catch (err) {
    // ValidationError de Mongoose = input inválido del cliente → 400, no 500.
    // No exponemos err.message porque contiene detalles del schema interno.
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Datos de perfil inválidos' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/request-delete
router.post('/request-delete', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const organizesFund = await Fund.exists({ organizer: userId });
    if (organizesFund) {
      return res.status(422).json({ error: 'No puedes eliminar tu cuenta mientras seas organizador de un fondo.' });
    }

    const isParticipant = await Fund.exists({
      participants: { $elemMatch: { user: userId, status: 'accepted' } },
    });
    if (isParticipant) {
      return res.status(422).json({ error: 'No puedes eliminar tu cuenta mientras seas participante aceptado de un fondo.' });
    }

    const user = await User.findById(userId);
    user.deleteAccountToken = uuidv4();
    await user.save();

    sendDeleteConfirmationEmail({ to: user.email, name: user.name, token: user.deleteAccountToken })
      .catch(err => console.error('Delete confirmation email failed:', err.message));

    res.json({ message: 'Te enviamos un correo para confirmar la eliminación de tu cuenta.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/confirm-delete/:token
router.get('/confirm-delete/:token', async (req, res) => {
  try {
    const user = await User.findOne({ deleteAccountToken: req.params.token });
    if (!user) return res.status(404).json({ error: 'Token inválido o ya utilizado.' });

    await User.deleteOne({ _id: user._id });
    res.json({ message: 'Tu cuenta ha sido eliminada correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
