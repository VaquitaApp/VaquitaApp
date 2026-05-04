const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');
const { validateName } = require('../utils/validators');

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, validate: { validator: validateName, message: 'El nombre solo puede contener letras y espacios' } },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  rut: { type: String, trim: true },
  passwordHash: { type: String, required: true },
  userType: { type: String, enum: ['persona_natural', 'organizacion'], default: 'persona_natural' },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  deleteAccountToken: { type: String },
  preferredAccount: {
    bank: { type: String, default: '' },
    accountType: { type: String, enum: ['corriente', 'vista', 'ahorro', 'chequera_electronica', ''], default: '' },
    accountNumber: { type: String, default: '' },
  },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = model('User', userSchema);
