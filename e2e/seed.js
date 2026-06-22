/**
 * seed.js — Crea el usuario E2E en MongoDB y lo marca como verificado.
 * Uso: node seed.js   (desde e2e/)
 *
 * Define su propio schema inline para evitar el problema de instancias
 * duplicadas de mongoose entre e2e/node_modules y server/node_modules.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI    || 'mongodb://localhost:27017/vaquitaapp';
const E2E_EMAIL = process.env.E2E_EMAIL    || 'e2e@vaquitaapp.test';
const E2E_PASS  = process.env.E2E_PASSWORD || 'E2ePassword1!';
const E2E_NAME  = process.env.E2E_NAME     || 'Usuario E2E';
const E2E_RUT   = process.env.E2E_RUT      || '11111111-1';

const userSchema = new mongoose.Schema({
  name:                  String,
  email:                 String,
  passwordHash:          String,
  rut:                   String,
  userType:              String,
  isEmailVerified:       Boolean,
  emailVerificationToken: String,
}, { collection: 'users', strict: false });

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('[seed] Conectado a MongoDB:', MONGO_URI);

  const User = mongoose.model('User', userSchema);

  await User.deleteMany({ email: E2E_EMAIL });

  const hash = await bcrypt.hash(E2E_PASS, 10);
  await User.create({
    name:            E2E_NAME,
    email:           E2E_EMAIL,
    passwordHash:    hash,
    rut:             E2E_RUT.replace(/\./g, '').toUpperCase(),
    isEmailVerified: true,
    userType:        'persona_natural',
  });

  console.log(`[seed] Usuario E2E creado: ${E2E_EMAIL}`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('[seed] ERROR:', err.message);
  process.exit(1);
});
