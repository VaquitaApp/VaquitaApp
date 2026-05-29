const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  ERR_NO_TOKEN,
  ERR_INVALID_TOKEN,
  ERR_USER_NOT_FOUND,
  ERR_EMAIL_NOT_VERIFIED,
} = require('../errors');

// Validación base del JWT y carga de req.user. NO chequea isEmailVerified.
// Reservado para rutas que el usuario debe poder consumir aunque su email
// aún no esté verificado (ej. GET /api/auth/me).
async function authBase(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: ERR_NO_TOKEN });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = await User.findById(payload.sub).select('-passwordHash');
    if (!req.user) return res.status(401).json({ error: ERR_USER_NOT_FOUND });
    next();
  } catch {
    res.status(401).json({ error: ERR_INVALID_TOKEN });
  }
}

// Middleware default: valida JWT + exige isEmailVerified.
async function auth(req, res, next) {
  await authBase(req, res, () => {
    if (!req.user.isEmailVerified) {
      return res.status(403).json({ error: ERR_EMAIL_NOT_VERIFIED });
    }
    next();
  });
}

module.exports = auth;
module.exports.authNoVerifyCheck = authBase;
