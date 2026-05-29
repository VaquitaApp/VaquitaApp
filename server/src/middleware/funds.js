const mongoose = require('mongoose');
const Fund = require('../models/Fund');
const { ERR_FUND_NOT_FOUND, ERR_NOT_ORGANIZER } = require('../errors');

const POP_ORG = { path: 'organizer', select: 'name email' };
const POP_PARTS = { path: 'participants.user', select: 'name email' };
const POP_MSGS = { path: 'messages.user', select: 'name email' };

function requireFund({ populate = [] } = {}) {
  return async (req, res, next) => {
    // Validar formato del id antes de tocar Mongoose. Un id malformado es input
    // inválido del cliente (400), no un fallo del server (500).
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID de fondo malformado' });
    }
    try {
      let q = Fund.findById(req.params.id);
      for (const p of populate) q = q.populate(p);
      const fund = await q;
      if (!fund) return res.status(404).json({ error: ERR_FUND_NOT_FOUND });
      req.fund = fund;
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

function isOrganizer(fund, userId) {
  const orgId = fund.organizer?._id ?? fund.organizer;
  return Boolean(orgId?.equals(userId));
}

function requireOrganizer(req, res, next) {
  if (!isOrganizer(req.fund, req.user._id)) {
    return res.status(403).json({ error: ERR_NOT_ORGANIZER });
  }
  next();
}

module.exports = { requireFund, requireOrganizer, isOrganizer, POP_ORG, POP_PARTS, POP_MSGS };
