const { Schema, model } = require('mongoose');

const participantSchema = new Schema({
  user:             { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status:           { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  invitationToken:  { type: String },
  joinRequestToken: { type: String },
  invitedAt:        { type: Date, default: Date.now },
  respondedAt:      { type: Date },
  lastReminder:        { type: Date },
  moraReminderActive:  { type: Boolean, default: false },
}, { _id: false });

const accessRequestSchema = new Schema({
  user:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token:       { type: String },
  status:      { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date },
}, { _id: true });

const fundSchema = new Schema({
  name:             { type: String, required: true, trim: true },
  description:      { type: String, required: true, trim: true },
  goal:             { type: String, required: true, trim: true },
  type:             { type: String, enum: ['quota', 'free'], required: true },
  targetAmount:     { type: Number, required: true, min: 1 },
  minAmount:        { type: Number },
  quotaAmount:         { type: Number },
  totalQuotas:      { type: Number, min: 1 },
  expectedParticipants: { type: Number, min: 1 },
  frequency:           { type: String, enum: ['once', 'weekly', 'biweekly', 'monthly'] },
  deadline:         { type: Date, required: true },
  recipientAccount: {
    bank:          { type: String, required: true },
    accountType:   { type: String, required: true, enum: ['corriente', 'vista', 'ahorro', 'chequera_electronica'] },
    accountNumber: { type: String, required: true, trim: true, validate: { validator: v => /^\d+$/.test(v), message: 'accountNumber must contain only digits' } },
  },
  visibility:       { type: String, enum: ['public', 'private'], default: 'private' },
  status:           { type: String, enum: ['active', 'completed', 'closed', 'paused'], default: 'active' },
  organizer:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  participants:     [participantSchema],
  accessRequests:   { type: [accessRequestSchema], default: [] },
  messages:         [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  }],
  milestones:       [{
    amount: { type: Number, required: true, min: 1 },
    description: { type: String, required: true, trim: true }
  }],
  updateLogs:       [{ message: { type: String, required: true }, date: { type: Date, default: Date.now } }],
  paymentTransaction: {
    transactionId: { type: String },
    amount:        { type: Number },
    provider:      { type: String },
    paidAt:        { type: Date },
  },
}, { timestamps: true });

fundSchema.pre('validate', function (next) {
  // Fondos ya persistidos con estos campos ausentes o vacíos (datos viejos o incompletos).
  if (!this.isNew) {
    const d = this.description;
    if (d == null || (typeof d === 'string' && d.trim() === '')) {
      this.description = 'Sin descripción';
    }
    const g = this.goal;
    if (g == null || (typeof g === 'string' && g.trim() === '')) {
      this.goal = 'Sin objetivo';
    }
  }
  if (this.type === 'quota') {
    if (!this.quotaAmount) this.invalidate('quotaAmount', 'required for quota fund');
    if (!this.frequency)   this.invalidate('frequency',   'required for quota fund');
    if (!this.totalQuotas) this.invalidate('totalQuotas', 'required for quota fund');
  }

  if (this.milestones && this.milestones.length > 0) {
    const seenAmounts = new Set();
    for (const milestone of this.milestones) {
      if (milestone.amount > this.targetAmount) {
        this.invalidate('milestones', 'El monto del hito no puede ser mayor a la meta total.');
      }
      if (seenAmounts.has(milestone.amount)) {
        this.invalidate('milestones', 'No puede haber dos hitos con el mismo monto.');
      }
      seenAmounts.add(milestone.amount);
    }
  }
  next();
});

module.exports = model('Fund', fundSchema);
