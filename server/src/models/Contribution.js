const { Schema, model } = require('mongoose');

const contributionSchema = new Schema({
  fund:          { type: Schema.Types.ObjectId, ref: 'Fund', required: true },
  user:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount:        { type: Number, required: true, min: 0.01 },
  paidQuotas:    { type: Number, default: 1 },
  method:        { type: String, enum: ['transfer', 'cash', 'simulation'], required: true },
  transactionId: { type: String },
  provider:      { type: String, default: 'manual' },
  status:        { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'succeeded' },
  date:          { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = model('Contribution', contributionSchema);
