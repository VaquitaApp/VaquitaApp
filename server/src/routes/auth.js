const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendVerificationEmail } = require('../services/emailService');

const router = express.Router();

function validateRut(rut) {
  const clean = rut.replace(/\./g, '').replace(/-/, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mul;
    mul = mul < 7 ? mul + 1 : 2;
  }
  const rem = 11 - (sum % 11);
  const computed = rem === 11 ? '0' : rem === 10 ? 'K' : String(rem);
  return dv === computed;
}

function signToken(user) {
  return jwt.sign(
    { sub: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, rut, userType } = req.body;
    if (!name || !email || !password || !rut) {
      return res.status(400).json({ error: 'Name, email, password and RUT are required' });
    }
    if (!validateRut(rut)) {
      return res.status(400).json({ error: 'RUT inválido' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const rutNorm = rut.replace(/\./g, '').toUpperCase();
    const rutExists = await User.findOne({ rut: rutNorm });
    if (rutExists) return res.status(409).json({ error: 'RUT ya registrado' });

    const verificationToken = uuidv4();
    const user = new User({ name, email, passwordHash: password, rut: rutNorm, userType, emailVerificationToken: verificationToken });
    await user.save();

    sendVerificationEmail({ to: user.email, name: user.name, token: verificationToken })
      .catch(err => console.error('Verification email failed:', err.message));

    res.status(201).json({ message: 'Registro exitoso. Verifica tu correo para activar tu cuenta.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/verify-email/:token', async (req, res) => {
  try {
    const user = await User.findOne({ emailVerificationToken: req.params.token });
    if (!user) return res.status(404).json({ error: 'Token inválido o ya utilizado' });

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({ message: 'Email verificado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Email no verificado. Revisa tu correo para activar tu cuenta.' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, userType: user.userType },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash -emailVerificationToken').lean();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
