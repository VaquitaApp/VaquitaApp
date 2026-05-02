const { Schema, model } = require('mongoose');

const participantSchema = new Schema({
  user:             { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status:           { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  invitationToken:  { type: String },
  joinRequestToken: { type: String },
  invitedAt:        { type: Date, default: Date.now },
  respondedAt:      { type: Date },
  lastReminder:     { type: Date },
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
  coverImage:       { type: String, default: '' },
  type:             { type: String, enum: ['quota', 'free'], required: true },
  targetAmount:     { type: Number, required: true, min: 1 },
  minAmount:        { type: Number },
  quotaAmount:         { type: Number },
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
  updateLogs:       [{ message: { type: String, required: true }, date: { type: Date, default: Date.now } }],
}, { timestamps: true });

fundSchema.pre('validate', function (next) {
  if (this.type === 'quota') {
    if (!this.quotaAmount) this.invalidate('quotaAmount', 'required for quota fund');
    if (!this.frequency)   this.invalidate('frequency',   'required for quota fund');
  }
  next();
});

module.exports = model('Fund', fundSchema);
