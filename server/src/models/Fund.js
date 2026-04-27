const { Schema, model } = require('mongoose');

const participantSchema = new Schema({
  user:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status:          { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  invitationToken: { type: String },
  invitedAt:       { type: Date, default: Date.now },
  respondedAt:     { type: Date },
  lastReminder:    { type: Date },
}, { _id: false });

const fundSchema = new Schema({
  name:             { type: String, required: true, trim: true },
  description:      { type: String, default: '' },
  goal:             { type: String, default: '' },
  type:             { type: String, enum: ['quota', 'free'], required: true },
  targetAmount:     { type: Number, required: true, min: 1 },
  quotaAmount:      { type: Number },
  frequency:        { type: String, enum: ['once', 'weekly', 'monthly'] },
  deadline:         { type: Date, required: true },
  recipientAccount: { type: String, required: true },
  visibility:       { type: String, enum: ['public', 'private'], default: 'private' },
  status:           { type: String, enum: ['active', 'completed', 'closed'], default: 'active' },
  organizer:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  participants:     [participantSchema],
}, { timestamps: true });

fundSchema.pre('validate', function (next) {
  if (this.type === 'quota') {
    if (!this.quotaAmount) this.invalidate('quotaAmount', 'required for quota fund');
    if (!this.frequency)   this.invalidate('frequency',   'required for quota fund');
  }
  next();
});

module.exports = model('Fund', fundSchema);
