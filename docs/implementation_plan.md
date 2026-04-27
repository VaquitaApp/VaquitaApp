# Implementation Plan — VaquitaApp E1

> AI-followable guide. Execute phases in order. Each phase ends with a DONE check before proceeding.
> Code is in English. Comments and commit messages are in English. UI text is in Spanish.

---

## 0. Naming Reference — Spanish ↔ English

All database fields, API params, and variable names use English. This table is the single source of truth.

| Dominio español | English (code) |
|---|---|
| fondo | fund |
| nombre | name |
| descripción | description |
| objetivo (texto) | goal |
| tipo (cuota/libre) | type → `'quota' \| 'free'` |
| monto esperado total | targetAmount |
| monto aporte por participante | quotaAmount |
| frecuencia | frequency → `'once' \| 'weekly' \| 'monthly'` |
| fecha límite | deadline |
| cuenta destinatario | recipientAccount |
| visibilidad | visibility → `'public' \| 'private'` |
| estado del fondo | status → `'active' \| 'completed' \| 'closed'` |
| activo | active |
| completado | completed |
| cerrado | closed |
| monto recaudado | collectedAmount (computed: sum of contributions) |
| organizador | organizer |
| participante | participant |
| aporte / pago | contribution |
| monto | amount |
| fecha | date |
| método | method → `'transfer' \| 'cash' \| 'simulation'` |
| estado del aporte | contributionStatus → `'pending' \| 'onTime' \| 'overdue'` |
| último recordatorio | lastReminder |
| invitación | invitation |
| token invitación | invitationToken |
| tipo de usuario | userType → `'persona_natural' \| 'organizacion'` |
| recordatorio | reminder |
| al día | onTime |
| en mora | overdue |

---

## 1. Project Structure

```
/
├── client/                        # React + Vite + Tailwind
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   ├── axios.js           # axios instance with baseURL + auth header injection
│   │   │   ├── auth.js            # register(), login(), getMe()
│   │   │   ├── funds.js           # getFunds(), getFund(), createFund(), updateFund(), deleteFund(), closeFund()
│   │   │   ├── participants.js    # invite(), removeParticipant(), getParticipants()
│   │   │   ├── contributions.js   # addContribution(), getContributions()
│   │   │   ├── payment.js         # executePayment()
│   │   │   ├── reminders.js       # sendReminder()
│   │   │   └── users.js           # searchUsers()
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Badge.jsx      # status chip: active/completed/closed
│   │   │   │   ├── ProgressBar.jsx
│   │   │   │   └── Spinner.jsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.jsx
│   │   │   │   └── RegisterForm.jsx
│   │   │   ├── funds/
│   │   │   │   ├── FundCard.jsx
│   │   │   │   ├── FundForm.jsx   # shared create/edit form
│   │   │   │   ├── FundFilters.jsx
│   │   │   │   ├── FundDashboard.jsx  # progress, dates, organizer
│   │   │   │   └── FundChart.jsx  # recharts BarChart — contributions over time
│   │   │   ├── participants/
│   │   │   │   ├── ParticipantList.jsx
│   │   │   │   └── InviteModal.jsx    # user search + select
│   │   │   ├── contributions/
│   │   │   │   ├── ContributionList.jsx
│   │   │   │   ├── ContributionForm.jsx
│   │   │   │   └── MockPaymentForm.jsx  # simulated card form
│   │   │   └── layout/
│   │   │       ├── Navbar.jsx
│   │   │       └── ProtectedRoute.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx    # token, user, login(), logout()
│   │   ├── hooks/
│   │   │   └── useAuth.js
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── FundsPage.jsx          # HU07 — my funds list
│   │   │   ├── FundDetailPage.jsx     # HU08/HU14 — detail panel
│   │   │   ├── CreateFundPage.jsx     # HU06
│   │   │   ├── EditFundPage.jsx       # HU09
│   │   │   ├── PublicDirectoryPage.jsx # HU13
│   │   │   └── InvitationResponsePage.jsx  # token-based accept/reject
│   │   ├── App.jsx                # react-router routes
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # mongoose.connect()
│   │   ├── middleware/
│   │   │   └── auth.js            # verifyToken middleware
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Fund.js
│   │   │   └── Contribution.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── funds.js
│   │   │   ├── participants.js
│   │   │   ├── contributions.js
│   │   │   └── invitations.js
│   │   ├── services/
│   │   │   ├── emailService.js    # nodemailer transporter (Mailpit local / SES prod)
│   │   │   ├── paymentService.js  # processPayment() — simulation in E1
│   │   │   └── notificationService.js  # buildReminderEmail(), sendReminders()
│   │   ├── jobs/
│   │   │   └── reminderJob.js     # node-cron daily job
│   │   └── app.js                 # express app (no listen)
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── models/
│   │   │   │   ├── Fund.test.js
│   │   │   │   └── Contribution.test.js
│   │   │   └── services/
│   │   │       ├── paymentService.test.js
│   │   │       └── notificationService.test.js
│   │   ├── integration/
│   │   │   └── routes/
│   │   │       ├── auth.test.js
│   │   │       ├── funds.test.js
│   │   │       ├── participants.test.js
│   │   │       └── contributions.test.js
│   │   └── helpers/
│   │       ├── db.js              # connect/disconnect/clearCollections for tests
│   │       └── factories.js       # createUser(), createFund(), createContribution()
│   ├── server.js                  # app.listen() — only entry point, not imported by tests
│   └── package.json
│
├── docs/                          # empty in E1, required by deliverables
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

---

## 2. Environment Variables

### `server/.env`
```
NODE_ENV=development
PORT=3001
MONGO_URI=mongodb://localhost:27017/vaquitaapp
JWT_SECRET=<replace-with-random-32-char-string>
JWT_EXPIRES_IN=7d

SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@vaquitaapp.local

APP_BASE_URL=http://localhost:5173
```

### `server/.env.test`
```
NODE_ENV=test
PORT=3002
MONGO_URI=mongodb://localhost:27017/vaquitaapp_test
JWT_SECRET=test_secret_key
JWT_EXPIRES_IN=1h
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@vaquitaapp.local
APP_BASE_URL=http://localhost:5173
```

### `client/.env`
```
VITE_API_URL=http://localhost:3001/api
```

### `server/.env.example` (committed to repo, no secrets)
```
NODE_ENV=development
PORT=3001
MONGO_URI=mongodb://localhost:27017/vaquitaapp
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@vaquitaapp.local
APP_BASE_URL=http://localhost:5173
```

---

## 3. Mongoose Schemas

### `User.js`
```js
const userSchema = new Schema({
  name:                   { type: String, required: true, trim: true },
  email:                  { type: String, required: true, unique: true, lowercase: true },
  passwordHash:           { type: String, required: true },
  userType:               { type: String, enum: ['persona_natural', 'organizacion'], default: 'persona_natural' },
  rut:                    { type: String, trim: true },          // optional — factories omit it
  isEmailVerified:        { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  deleteAccountToken:     { type: String },
  preferredAccount: {
    bank:          { type: String },
    accountType:   { type: String, enum: ['corriente', 'vista', 'ahorro', 'chequera_electronica'] },
    accountNumber: { type: String },
  },
}, { timestamps: true });
```

### `Fund.js`
```js
const participantSchema = new Schema({
  user:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status:          { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  invitationToken: { type: String },
  invitedAt:       { type: Date, default: Date.now },
  respondedAt:     { type: Date },
  lastReminder:    { type: Date },
}, { _id: false });

const fundSchema = new Schema({
  name:            { type: String, required: true, trim: true },
  description:     { type: String, default: '' },
  goal:            { type: String, default: '' },
  type:            { type: String, enum: ['quota', 'free'], required: true },
  targetAmount:    { type: Number, required: true, min: 1 },
  quotaAmount:     { type: Number },      // required when type === 'quota'
  frequency:       { type: String, enum: ['once', 'weekly', 'monthly'] }, // required when type === 'quota'
  deadline:        { type: Date, required: true },
  recipientAccount: {
    bank:          { type: String, required: true },
    accountType:   { type: String, required: true, enum: ['corriente', 'vista', 'ahorro', 'chequera_electronica'] },
    accountNumber: { type: String, required: true, validate: { validator: v => /^\d+$/.test(v), message: 'solo dígitos' } },
  },
  visibility:      { type: String, enum: ['public', 'private'], default: 'private' },
  status:          { type: String, enum: ['active', 'completed', 'closed'], default: 'active' },
  organizer:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  participants:    [participantSchema],
}, { timestamps: true });

// Validation: quota fields required when type === 'quota'
fundSchema.pre('validate', function(next) {
  if (this.type === 'quota') {
    if (!this.quotaAmount) this.invalidate('quotaAmount', 'required for quota fund');
    if (!this.frequency)   this.invalidate('frequency', 'required for quota fund');
  }
  next();
});
```

### `Contribution.js`
```js
const contributionSchema = new Schema({
  fund:          { type: Schema.Types.ObjectId, ref: 'Fund', required: true },
  user:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount:        { type: Number, required: true, min: 0.01 },
  method:        { type: String, enum: ['transfer', 'cash', 'simulation'], required: true },
  transactionId: { type: String },
  provider:      { type: String, default: 'manual' },
  status:        { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'succeeded' },
  date:          { type: Date, default: Date.now },
}, { timestamps: true });
```

**Note on organizer contributions:** The organizer is identified by `fund.organizer`. The contribution endpoint allows contributions from any user who is either `fund.organizer` or a participant with `status === 'accepted'`. The organizer does not need an entry in `fund.participants`.

---

## 4. Complete API Contract

Base URL: `http://localhost:3001/api`

Auth header for protected routes: `Authorization: Bearer <token>`

### 4.1 Auth

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/register` | No | `{ name, rut, email, password, userType? }` | `201 { message }` — sends verification email; no token yet |
| GET | `/auth/verify-email/:token` | No | — | `200 { message }` — activates account (`isEmailVerified = true`) |
| POST | `/auth/login` | No | `{ email, password }` | `200 { token, user: { _id, name, email, userType } }` — 403 if not verified |
| GET | `/auth/me` | Yes | — | `200 { user }` — queries DB (includes rut, preferredAccount) |

**Error responses:** `400` validation / RUT inválido, `401` credenciales incorrectas, `403` email no verificado, `409` email o RUT ya registrado.

### 4.2 Users

| Method | Path | Auth | Body / Params | Response |
|---|---|---|---|---|
| GET | `/users/search` | Yes | `?q=<string>` | `200 [{ _id, name, email }]` — excludes caller |
| PATCH | `/users/profile` | Yes | `{ preferredAccount: { bank, accountType, accountNumber } }` | `200 { user }` — solo actualiza cuenta preferida |
| POST | `/users/request-delete` | Yes | — | `200 { message }` — falla 422 si usuario es organizador/participante activo en algún fondo; genera token y envía email |
| GET | `/users/confirm-delete/:token` | No | — | `200 { message }` — elimina cuenta |

### 4.3 Funds

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/funds` | Yes | Returns funds where user is organizer OR accepted participant. Params: `?q=<text>&status=<active\|completed\|closed>&sort=deadline_asc\|deadline_desc` |
| POST | `/funds` | Yes | Creates fund; organizer = req.user |
| GET | `/funds/:id` | Yes | Allowed if: organizer, accepted participant, or fund is public |
| PATCH | `/funds/:id` | Yes (organizer) | Rejects if status ≠ active. Rejects changes to locked fields if contributions exist. |
| DELETE | `/funds/:id` | Yes (organizer) | Rejects if any contribution exists for this fund. |
| POST | `/funds/:id/close` | Yes (organizer) | Sets status → closed. |
| POST | `/funds/:id/payment` | Yes (organizer) | Executes payment simulation → sets status → completed. |
| POST | `/funds/:id/reminders` | Yes (organizer) | Sends manual reminder email to all accepted participants with pending contributions. |

**Locked fields (PATCH /funds/:id):** `targetAmount`, `deadline`, `recipientAccount`, `frequency`, `quotaAmount`, `type`, `visibility` — locked once `Contribution.countDocuments({ fund: id, status: 'succeeded' }) > 0`. Deadline also validated: must be > today (isDeadlineValid). POST /funds also validates `quotaAmount <= targetAmount`.

**GET /funds response shape:**
```json
{
  "_id": "...",
  "name": "Fondo Paseo 2026",
  "type": "quota",
  "status": "active",
  "targetAmount": 200000,
  "deadline": "2026-06-30T00:00:00.000Z",
  "collectedAmount": 50000,
  "visibility": "private",
  "organizer": { "_id": "...", "name": "Ana López" },
  "participantCount": 5
}
```

**GET /funds/:id response shape:**
```json
{
  "_id": "...",
  "name": "Fondo Paseo 2026",
  "description": "...",
  "goal": "Viaje a Pichilemu",
  "type": "quota",
  "targetAmount": 200000,
  "quotaAmount": 40000,
  "frequency": "monthly",
  "deadline": "2026-06-30T00:00:00.000Z",
  "recipientAccount": "12345678",
  "visibility": "private",
  "status": "active",
  "organizer": { "_id": "...", "name": "Ana López", "email": "ana@example.com" },
  "participants": [
    { "user": { "_id": "...", "name": "Pedro", "email": "pedro@example.com" }, "status": "accepted", "lastReminder": null }
  ],
  "collectedAmount": 50000,
  "createdAt": "2026-04-01T00:00:00.000Z"
}
```

### 4.4 Public Directory

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/funds/public` | Yes | Returns all funds with `visibility === 'public'` and `status === 'active'`. Same params as GET /funds. |

**Important:** Define `/funds/public` route BEFORE `/:id` in Express so Express doesn't treat `public` as an id.

### 4.5 Participants

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/funds/:id/invitations` | Yes (organizer) | `{ userId }` | Validates fund active + deadline not passed. Generates `invitationToken` (uuid). Sends email via emailService. |
| DELETE | `/funds/:id/participants/:userId` | Yes (organizer) | — | Rejects if user has contributions. |
| GET | `/funds/:id/participants` | Yes (member) | — | Returns participants with contributionStatus per participant. |

### 4.6 Invitation Response (tokenless page)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/invitations/:token/accept` | No | Validates fund still active + deadline. Sets participant.status → accepted. |
| POST | `/invitations/:token/reject` | No | Sets participant.status → rejected. |

Both return `{ message, fund: { name, deadline } }`.

### 4.7 Contributions

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/funds/:id/contributions` | Yes | `{ amount, method, date? }` | Allowed if organizer OR accepted participant. Returns created contribution. |
| GET | `/funds/:id/contributions` | Yes (member) | — | Returns all contributions for fund, sorted by date desc. |

### 4.8 HTTP Error Codes Used

| Code | When |
|---|---|
| 400 | Validation error (missing fields, bad format) |
| 401 | Missing or invalid JWT |
| 403 | Authenticated but not authorized (not organizer, not member) |
| 404 | Resource not found |
| 409 | Conflict (email already in use, user already invited) |
| 422 | Business rule violation (locked field edit, fund not active, contributions exist) |

---

## 5. Frontend Routes

```
/                               → redirect to /fondos if auth, else /login
/login                          → LoginPage
/register                       → RegisterPage
/verificar-email/:token         → VerifyEmailPage (no auth — activates account)
/fondos                         → FundsPage (my funds list, HU07)
/fondos/nuevo                   → CreateFundPage (HU06)
/fondos/:id                     → FundDetailPage (HU08/HU14)
/fondos/:id/editar              → EditFundPage (HU09)
/directorio                     → PublicDirectoryPage (HU13)
/invitaciones/:token            → InvitationResponsePage (token-based accept/reject)
/perfil                         → ProfilePage (protected — view name/RUT/email, edit bank account, delete account)
/confirmar-eliminacion/:token   → ConfirmDeletePage (no auth — confirms account deletion)
```

Routes requiring auth (ProtectedRoute): all except `/login`, `/register`, `/verificar-email/:token`, `/invitaciones/:token`, `/confirmar-eliminacion/:token`.

---

## 6. Payment Simulation UX Specification

Steps:

1. Organizer clicks "Pagar al destinatario" (only visible when `collectedAmount > 0`).
2. Modal opens with header "Pago al destinatario".
3. `MockPaymentForm` shows:
   - Cuenta destinataria (read-only): banco, tipo de cuenta, número — from `fund.recipientAccount`
   - Monto a transferir (read-only): `collectedAmount` formatted as CLP
   - "Confirmar transferencia" button
   - No card fields — the data is already known.
4. On confirm: spinner + "Procesando…" for ~1400ms.
5. Success state: green checkmark + "Pago realizado. El fondo ha sido completado."
6. Modal closes. Fund status updates to `completed` in local state.
7. FundDetailPage re-renders: status badge "Completado", action buttons hidden.

API call: `POST /api/funds/:id/payment` → `{ fund, transaction: { transactionId: 'sim_<timestamp>', amount, status: 'succeeded', provider: 'simulation' } }`.

Note: After payment, `sendStatusChangeEmail` is fired (fire-and-forget) to organizer and all accepted participants.

---

## 7. Contribution Status Logic (Computed)

ContributionStatus is computed per participant at read time, never stored.

```js
function getContributionStatus(participant, fund, contributions) {
  const userContribs = contributions.filter(c => c.user.toString() === participant.user.toString());
  const now = new Date();

  if (fund.type === 'free') {
    if (userContribs.length === 0) return now > fund.deadline ? 'overdue' : 'pending';
    return 'onTime';
  }

  // quota: check if current period quota is paid
  // For simplicity in E1: sum all contributions; if >= quotaAmount × expectedPeriods → onTime
  const totalPaid = userContribs.reduce((sum, c) => sum + c.amount, 0);
  const expectedPeriods = computeExpectedPeriods(fund); // based on frequency + startDate + now
  const expectedTotal = fund.quotaAmount * expectedPeriods;

  if (totalPaid >= expectedTotal) return 'onTime';
  if (now > fund.deadline) return 'overdue';
  return 'pending';
}
```

Display in UI:
- `onTime` → badge verde "Al día"
- `pending` → badge gris "Pendiente"
- `overdue` → badge rojo "En mora"

---

## 8. Phase-by-Phase Implementation

---

### Phase 0 — Infrastructure Setup

**Goal:** Both servers start, DB connects, Jest runs a smoke test, env files are in place.

**Steps:**

1. Create `server/` directory. Run `npm init -y`. Install dependencies:
   ```bash
   npm install express mongoose dotenv jsonwebtoken bcryptjs nodemailer uuid node-cron cors
   npm install --save-dev jest supertest mongodb-memory-server nodemon
   ```

2. Create `server/package.json` scripts:
   ```json
   {
     "scripts": {
       "dev": "nodemon src/server.js",
       "start": "node src/server.js",
       "test": "jest --runInBand",
       "test:coverage": "jest --runInBand --coverage"
     },
     "jest": {
       "testEnvironment": "node",
       "testMatch": ["**/tests/**/*.test.js"],
       "setupFilesAfterFramework": []
     }
   }
   ```

3. Create `server/src/config/db.js`:
   ```js
   const mongoose = require('mongoose');
   async function connectDB() {
     await mongoose.connect(process.env.MONGO_URI);
   }
   module.exports = connectDB;
   ```

4. Create `server/src/app.js` (minimal, no routes yet):
   ```js
   require('dotenv').config();
   const express = require('express');
   const cors = require('cors');
   const app = express();
   app.use(cors());
   app.use(express.json());
   app.get('/api/health', (req, res) => res.json({ ok: true }));
   module.exports = app;
   ```

5. Create `server/src/server.js`:
   ```js
   require('dotenv').config();
   const app = require('./app');
   const connectDB = require('./config/db');
   connectDB().then(() => app.listen(process.env.PORT || 3001));
   ```

6. Create `server/tests/helpers/db.js`:
   ```js
   const mongoose = require('mongoose');
   const { MongoMemoryServer } = require('mongodb-memory-server');
   let mongoServer;
   module.exports = {
     connect: async () => {
       mongoServer = await MongoMemoryServer.create();
       await mongoose.connect(mongoServer.getUri());
     },
     disconnect: async () => {
       await mongoose.disconnect();
       await mongoServer.stop();
     },
     clear: async () => {
       const collections = mongoose.connection.collections;
       for (const key in collections) await collections[key].deleteMany({});
     },
   };
   ```

7. Create `server/tests/unit/smoke.test.js`:
   ```js
   const db = require('../helpers/db');
   beforeAll(() => db.connect());
   afterAll(() => db.disconnect());
   test('DB connects and disconnects', () => {
     expect(require('mongoose').connection.readyState).toBe(1);
   });
   ```

8. Create `client/` with Vite:
   ```bash
   npm create vite@latest client -- --template react
   cd client && npm install
   npm install axios react-router-dom recharts
   npm install -D tailwindcss @tailwindcss/vite
   ```
   **Note:** Tailwind v4 is installed (no `tailwind.config.js` needed). Add the Vite plugin to `vite.config.js`:
   ```js
   import tailwindcss from '@tailwindcss/vite'
   // plugins: [tailwindcss(), react()]
   ```
   In `src/index.css` use: `@import "tailwindcss";`

9. Create `.env`, `.env.test`, `.env.example` in `server/`. Create `.env` in `client/`.

10. Create `.gitignore` at repo root:
    ```
    node_modules/
    .env
    .env.test
    dist/
    coverage/
    ```

**DONE check:**
```bash
cd server && npm test              # smoke test passes
cd server && npm run dev           # server starts on :3001
curl http://localhost:3001/api/health  # { "ok": true }
cd client && npm run dev           # Vite starts on :5173
```

---

### Phase 1 — Authentication

**Goal:** Register and login work end-to-end. JWT issued immediately. Protected routes reject unauthenticated requests.

**Backend steps:**

1. Create `server/src/models/User.js` (schema from section 3).
   Add `passwordHash` pre-save hook using bcrypt (rounds=10). Add instance method `comparePassword(plain)`.

2. Create `server/src/middleware/auth.js`:
   ```js
   const jwt = require('jsonwebtoken');
   const User = require('../models/User');
   module.exports = async (req, res, next) => {
     const header = req.headers.authorization;
     if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
     try {
       const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
       req.user = await User.findById(payload.sub).select('-passwordHash');
       if (!req.user) return res.status(401).json({ error: 'User not found' });
       next();
     } catch { res.status(401).json({ error: 'Invalid token' }); }
   };
   ```

3. Create `server/src/routes/auth.js`:
   - `POST /register`: validate fields → hash password → save user → issue JWT → return `{ token, user }`.
   - `POST /login`: find by email → comparePassword → issue JWT → return `{ token, user }`.
   - `GET /me`: protected → return req.user.
   JWT payload: `{ sub: user._id, email: user.email }`.

4. Mount in `app.js`: `app.use('/api/auth', require('./routes/auth'))`.

**Frontend steps:**

5. Create `client/src/contexts/AuthContext.jsx`:
   - State: `{ token, user }` (persisted to localStorage).
   - Functions: `login(email, pwd)`, `register(...)`, `logout()`.

6. Create `client/src/api/axios.js`:
   ```js
   import axios from 'axios';
   const instance = axios.create({ baseURL: import.meta.env.VITE_API_URL });
   instance.interceptors.request.use(cfg => {
     const token = localStorage.getItem('token');
     if (token) cfg.headers.Authorization = `Bearer ${token}`;
     return cfg;
   });
   export default instance;
   ```

7. Create `LoginPage.jsx` and `RegisterPage.jsx` — simple forms with Tailwind, calls `AuthContext`.

8. Create `ProtectedRoute.jsx`: redirects to `/login` if no token.

9. Create `App.jsx` with react-router routes (see section 5).

**Tests for Phase 1:**

File: `server/tests/integration/routes/auth.test.js`
```
✓ POST /auth/register — 201 with token and user
✓ POST /auth/register — 409 if email already used
✓ POST /auth/register — 400 if missing required field
✓ POST /auth/login — 200 with token
✓ POST /auth/login — 401 with wrong password
✓ GET /auth/me — 200 with valid token
✓ GET /auth/me — 401 with no token
```

File: `server/tests/unit/models/User.test.js`
```
✓ email is lowercased on save
✓ passwordHash is set (not storing plain text)
✓ comparePassword returns true for correct password
✓ comparePassword returns false for wrong password
```

**DONE check:**
```bash
cd server && npm test                      # all tests pass
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"pass1234"}'
# → 201 { token: "...", user: { ... } }
```

---

### Phase 2 — Fund CRUD

**Goal:** Full CRUD on funds (create, list, detail, edit, delete, close). Filters and sort working.

**Backend steps:**

1. Create `server/src/models/Fund.js` (schema from section 3).

2. Create `server/src/routes/funds.js`. All routes protected (require auth middleware).

   **GET /funds**
   - Build query: `{ $or: [{ organizer: userId }, { 'participants.user': userId, 'participants.status': 'accepted' }] }`
   - Filter by `status` if provided.
   - Filter by `q` (text) if provided: `{ name: { $regex: q, $options: 'i' } }`.
   - Sort by `deadline` (asc/desc, default: asc).
   - For each fund, compute `collectedAmount` (aggregate from Contribution).
   - Return fund list with `collectedAmount` and `participantCount`.

   **POST /funds**
   - Validate required fields. Validate quota-specific fields if `type === 'quota'`.
   - Create fund with `organizer: req.user._id`.
   - Return created fund.

   **GET /funds/public** (define BEFORE `/:id`)
   - Query: `{ visibility: 'public', status: 'active' }` + optional `q`, `sort`.
   - Same response shape as GET /funds.

   **GET /funds/:id**
   - Find fund. Populate organizer and participants.user.
   - Access check: organizer OR accepted participant OR `fund.visibility === 'public'`.
   - Add `collectedAmount` from aggregation.
   - Return full detail shape.

   **PATCH /funds/:id**
   - Require organizer.
   - If `fund.status !== 'active'` → 422 `{ error: 'Fund is not active' }`.
   - Count contributions: `const hasContribs = await Contribution.countDocuments({ fund: id }) > 0`.
   - If hasContribs: reject changes to locked fields (`targetAmount`, `deadline`, `recipientAccount`, `frequency`, `quotaAmount`) with 422 `{ error: 'Field locked after contributions', field: 'fieldName' }`.
   - Apply allowed changes. Return updated fund.

   **DELETE /funds/:id**
   - Require organizer.
   - If any contribution exists → 422 `{ error: 'Cannot delete fund with contributions' }`.
   - Delete fund.

   **POST /funds/:id/close**
   - Require organizer.
   - If `fund.status !== 'active'` → 422.
   - Set `status = 'closed'`. Save. Return fund.

3. Mount in `app.js`: `app.use('/api/funds', require('./routes/funds'))`.

**Frontend steps:**

4. Create `client/src/api/funds.js` with all API calls.

5. Create `FundCard.jsx`: shows name, status badge, progress bar (`collectedAmount / targetAmount`), deadline, participant count.

6. Create `FundsPage.jsx`:
   - Fetch `GET /api/funds` with filter/sort params.
   - `FundFilters.jsx`: text input + status dropdown + sort select.
   - Grid of `FundCard`.
   - "Crear fondo" button → `/fondos/nuevo`.

7. Create `FundForm.jsx` (shared for create and edit):
   - Fields: name, description, goal, type (radio: quota/free), targetAmount, quotaAmount (conditional), frequency (conditional), deadline, recipientAccount, visibility.
   - On edit: disable locked fields if fund has contributions (pass `lockedFields` prop).

8. Create `CreateFundPage.jsx`: renders `FundForm` with `onSubmit → POST /api/funds`.

9. Create `EditFundPage.jsx`:
   - Fetches fund. Passes `lockedFields` based on whether fund has contributions.
   - On submit → `PATCH /api/funds/:id`.
   - Disable form entirely if fund is not active.

10. Create `FundDetailPage.jsx`:
    - Shows `FundDashboard` (progress, dates, status badge, organizer info).
    - Shows participant list with contribution status per participant.
    - Shows "Editar" and "Cerrar fondo" buttons if user is organizer and fund is active.
    - Shows "Eliminar" if organizer and no contributions.

11. Create `FundDashboard.jsx`:
    - Progress bar: `collectedAmount / targetAmount`.
    - Key-value rows: Fecha creación, Fecha límite, Organizador, Estado, Tipo.
    - Status badge component with color per status.

**Tests for Phase 2:**

File: `server/tests/integration/routes/funds.test.js`
```
✓ POST /funds — 201 creates fund
✓ POST /funds — 400 missing required field
✓ POST /funds — 400 quota fund without quotaAmount
✓ GET /funds — 200 returns only own funds
✓ GET /funds — filters by status
✓ GET /funds — filters by q (text search)
✓ GET /funds — sorted by deadline
✓ GET /funds/public — returns only public+active funds
✓ GET /funds/:id — 200 for organizer
✓ GET /funds/:id — 200 for accepted participant
✓ GET /funds/:id — 403 for unrelated user (private fund)
✓ GET /funds/:id — 200 for unrelated user (public fund)
✓ PATCH /funds/:id — 200 updates name
✓ PATCH /funds/:id — 403 if not organizer
✓ PATCH /funds/:id — 422 if fund is closed
✓ PATCH /funds/:id — 422 if changing locked field after contributions
✓ DELETE /funds/:id — 200 deletes fund
✓ DELETE /funds/:id — 422 if contributions exist
✓ POST /funds/:id/close — sets status to closed
```

File: `server/tests/unit/models/Fund.test.js`
```
✓ quota fund requires quotaAmount and frequency
✓ free fund does not require quotaAmount
✓ default status is active
✓ default visibility is private
```

**DONE check:**
```bash
npm test -- tests/integration/routes/funds.test.js  # all pass
# Open http://localhost:5173/fondos — list renders
# Create a fund — redirects to detail
# Edit fund name — saves
# Delete fund (no contributions) — removes from list
```

---

### Phase 3 — Participants & Invitations

**Goal:** Organizer can invite registered users. Invited user receives email with Accept/Reject links (Mailpit). Accept/Reject endpoints update status.

**Backend steps:**

1. Create `server/src/services/emailService.js`:
   ```js
   const nodemailer = require('nodemailer');
   const transporter = nodemailer.createTransport({
     host: process.env.SMTP_HOST,
     port: parseInt(process.env.SMTP_PORT),
     secure: false,
   });
   async function sendEmail({ to, subject, html }) {
     await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
   }
   module.exports = { sendEmail };
   ```

2. Create `server/src/routes/users.js`:
   - `GET /users/search?q=<string>` (protected): find users where name or email contains `q` (case-insensitive). Exclude calling user. Return `[{ _id, name, email }]`.

3. Create `server/src/routes/participants.js`:

   **POST /funds/:id/invitations**
   - Require organizer.
   - Validate: fund status === 'active', deadline > now.
   - Check user not already invited/accepted: `fund.participants.find(p => p.user.equals(userId))`.
   - Generate token: `require('uuid').v4()`.
   - Push to `fund.participants`: `{ user: userId, status: 'pending', invitationToken: token, invitedAt: new Date() }`.
   - Send email via emailService with links:
     ```
     Accept: {APP_BASE_URL}/invitaciones/{token}?action=accept
     Reject: {APP_BASE_URL}/invitaciones/{token}?action=reject
     ```
   - Return updated participants list.

   **DELETE /funds/:id/participants/:userId**
   - Require organizer.
   - Check no contributions from this user: `Contribution.countDocuments({ fund: id, user: userId })`.
   - Remove participant entry. Return 204.

   **GET /funds/:id/participants**
   - Require membership (organizer or accepted participant).
   - Return participants with populated user data and contribution status.

4. Create `server/src/routes/invitations.js`:
   - `POST /invitations/:token/accept`: find fund with matching `participants.invitationToken === token`. Validate fund active + deadline. Set `status = 'accepted'`, `respondedAt = new Date()`. Return `{ message: 'Invitación aceptada', fund: { name, deadline } }`.
   - `POST /invitations/:token/reject`: same but status = 'rejected'.
   Both return 404 if token not found, 422 if fund not active or deadline passed.

5. Mount routes in `app.js`.

**Frontend steps:**

6. Create `InviteModal.jsx`:
   - Text input for search (debounce 300ms → `GET /api/users/search?q=...`).
   - Dropdown list of matching users with "Invitar" button per user.
   - Shows "Ya invitado" if user is already in participants list.

7. Create `ParticipantList.jsx`:
   - Table with columns: Nombre, Estado (badge), Estado aportes (badge), Acciones.
   - Organizer sees "Eliminar" button (disabled if user has contributions).

8. Create `InvitationResponsePage.jsx`:
   - Reads `:token` and `?action` from URL.
   - On mount: calls `POST /api/invitations/:token/accept` or reject.
   - Shows result: "Invitación aceptada. Fondo: [nombre]" or error message.

9. Add "Invitar participante" button to `FundDetailPage.jsx` (visible to organizer only, fund active).

**Tests for Phase 3:**

File: `server/tests/integration/routes/participants.test.js`
```
✓ POST /funds/:id/invitations — adds participant with pending status
✓ POST /funds/:id/invitations — 409 if user already invited
✓ POST /funds/:id/invitations — 422 if fund not active
✓ POST /funds/:id/invitations — 422 if deadline passed
✓ POST /invitations/:token/accept — sets status to accepted
✓ POST /invitations/:token/reject — sets status to rejected
✓ POST /invitations/:token/accept — 422 if fund closed
✓ DELETE /funds/:id/participants/:userId — 204 removes participant
✓ DELETE /funds/:id/participants/:userId — 422 if participant has contributions
✓ GET /funds/:id/participants — 200 returns list with contribution status
✓ GET /users/search — returns matching users, excludes self
```

**DONE check:**
```bash
npm test -- tests/integration/routes/participants.test.js
# Start Mailpit: mailpit (or docker run -p 1025:1025 -p 8025:8025 axllent/mailpit)
# Invite a user via UI → check Mailpit at http://localhost:8025
# Click Accept link → InvitationResponsePage shows success
```

---

### Phase 4 — Contributions & Payment Simulation

**Goal:** Organizer and accepted participants can register contributions. Payment simulation flow sets fund to completed.

**Backend steps:**

1. Create `server/src/models/Contribution.js` (schema from section 3).

2. Create `server/src/services/paymentService.js`:
   ```js
   async function processPayment({ amount, recipientAccount }) {
     // Simulated: in E2, replace body with Stripe API call
     await new Promise(resolve => setTimeout(resolve, 100)); // simulate latency
     return {
       transactionId: `sim_${Date.now()}`,
       amount,
       status: 'succeeded',
       provider: 'simulation',
     };
   }
   module.exports = { processPayment };
   ```

3. Create `server/src/routes/contributions.js`:

   **POST /funds/:id/contributions**
   - Require auth.
   - Check caller is organizer OR accepted participant.
   - Validate amount > 0.
   - Create contribution: `{ fund: id, user: req.user._id, amount, method, date }`.
   - Return 201 with created contribution.

   **GET /funds/:id/contributions**
   - Require membership.
   - Return all contributions for fund, populated with user name, sorted by date desc.

4. Add to `server/src/routes/funds.js`:

   **POST /funds/:id/payment**
   - Require organizer.
   - Validate fund is active.
   - Compute `collectedAmount = sum of contributions`.
   - Call `paymentService.processPayment({ amount: collectedAmount, recipientAccount: fund.recipientAccount })`.
   - Save transaction as a Contribution: `{ method: 'simulation', transactionId, provider: 'simulation', status: 'succeeded' }`.
   - Set `fund.status = 'completed'`. Save.
   - Return `{ fund, transaction }`.

**Frontend steps:**

5. Create `ContributionForm.jsx`:
   - Fields: amount (number input), method (select: transfer/cash), date (date picker).
   - Submit calls `POST /api/funds/:id/contributions`.

6. Create `MockPaymentForm.jsx` (see section 6 — Payment Simulation UX Specification):
   - Modal with card fields (visual only, not validated).
   - On submit: 1500ms spinner → success → close.

7. Create `ContributionList.jsx`:
   - Table: Participante, Monto, Fecha, Método.
   - Shows in FundDetailPage's "Historial de aportes" section.

8. Add `FundChart.jsx` to FundDetailPage:
   - `recharts` BarChart with contributions grouped by week/month.
   - X-axis: dates, Y-axis: monto.

9. Add "Registrar aporte" button to FundDetailPage (visible to organizer + accepted participants).

10. Add "Pagar al destinatario" button to FundDetailPage (visible to organizer only, fund active).

**Tests for Phase 4:**

File: `server/tests/integration/routes/contributions.test.js`
```
✓ POST /funds/:id/contributions — 201 creates contribution (organizer)
✓ POST /funds/:id/contributions — 201 creates contribution (accepted participant)
✓ POST /funds/:id/contributions — 403 for non-member
✓ POST /funds/:id/contributions — 403 for pending participant
✓ POST /funds/:id/contributions — 400 if amount <= 0
✓ GET /funds/:id/contributions — 200 returns sorted list
✓ POST /funds/:id/payment — 200 sets fund to completed
✓ POST /funds/:id/payment — 422 if fund already closed
```

File: `server/tests/unit/services/paymentService.test.js`
```
✓ processPayment returns transactionId starting with 'sim_'
✓ processPayment returns status 'succeeded'
✓ processPayment returns provider 'simulation'
```

**DONE check:**
```bash
npm test -- tests/integration/routes/contributions.test.js
npm test -- tests/unit/services/paymentService.test.js
# UI: register a contribution → appears in list and progress bar updates
# UI: execute payment → spinner → success → fund shows "Completado"
```

---

### Phase 5 — Fund State Visualization

**Goal:** FundDetailPage shows complete dashboard with progress, chart, participant status grid, and state indicators.

**Steps:**

1. `FundDashboard.jsx` final implementation:
   - Large progress bar: `(collectedAmount / targetAmount) * 100`% with percentage label.
   - Monto recaudado / Monto esperado (formatted as CLP: `new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })`).
   - Fechas: creación y límite.
   - Organizador: name + email.
   - Estado badge (color-coded).

2. Participant status summary (`RF-18`): "X de Y participantes al día". Computed from contribution status per participant.

3. `FundChart.jsx`: contributions over time.
   - Use `recharts` BarChart. Group by week if deadline > 30 days, else by day.
   - Data from `GET /api/funds/:id/contributions`.

4. State-based UI guards:
   - Fund `completed`: show "Este fondo ha sido completado." banner. Hide all action buttons.
   - Fund `closed`: show "Este fondo fue cerrado por el organizador." banner. Hide action buttons.
   - Fund `active` + organizer: show edit, close, invite, pay buttons.
   - Fund `active` + participant: show contribute button only.

**Tests for Phase 5:**

No new integration tests needed. Add to `funds.test.js`:
```
✓ GET /funds/:id returns collectedAmount correctly
✓ GET /funds/:id/participants returns contributionStatus per participant
```

**DONE check:**
```bash
npm test
# UI: FundDetailPage shows progress bar filling correctly
# UI: participant list shows "Al día" / "Pendiente" / "En mora" badges
# UI: completed fund hides all action buttons
```

---

### Phase 6 — Notifications

**Goal:** Automatic daily cron sends reminders. Organizer can send manual reminder.

**Backend steps:**

1. Create `server/src/services/notificationService.js`:
   ```js
   const { sendEmail } = require('./emailService');
   const Contribution = require('../models/Contribution');
   const Fund = require('../models/Fund');

   function daysUntil(date) {
     return Math.floor((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
   }

   async function shouldSendReminder(participant, fund) {
     const today = new Date().toDateString();
     if (participant.lastReminder?.toDateString() === today) return false;
     const days = daysUntil(fund.deadline);

     if (fund.type === 'free') {
       const hasContrib = await Contribution.exists({ fund: fund._id, user: participant.user });
       return !hasContrib && days <= 5 && days >= 0;
     }
     // quota: remind at 5, 3, 1 days
     return [5, 3, 1].includes(days);
   }

   async function sendFundReminders(fund) {
     const accepted = fund.participants.filter(p => p.status === 'accepted');
     for (const p of accepted) {
       if (await shouldSendReminder(p, fund)) {
         await sendEmail({
           to: p.user.email,
           subject: `Recordatorio: fondo "${fund.name}"`,
           html: `<p>Hola ${p.user.name}, recuerda tu aporte al fondo <b>${fund.name}</b>. Fecha límite: ${fund.deadline.toLocaleDateString('es-CL')}.</p>`,
         });
         p.lastReminder = new Date();
       }
     }
     await fund.save();
   }

   async function runDailyReminders() {
     const funds = await Fund.find({ status: 'active' }).populate('participants.user');
     for (const fund of funds) await sendFundReminders(fund);
   }

   module.exports = { sendFundReminders, runDailyReminders };
   ```

2. Create `server/src/jobs/reminderJob.js`:
   ```js
   const cron = require('node-cron');
   const { runDailyReminders } = require('../services/notificationService');
   cron.schedule('0 9 * * *', async () => {
     await runDailyReminders();
   });
   ```
   Import in `server.js` (not in `app.js` — tests don't start cron).

3. Add to `server/src/routes/funds.js`:

   **POST /funds/:id/reminders** (manual)
   - Require organizer.
   - Get all accepted participants with pending/overdue contributions.
   - Call `sendEmail` for each. Update `lastReminder`.
   - Return `{ sent: N }`.

**Frontend steps:**

4. Add "Enviar recordatorio" button to `FundDetailPage.jsx` (organizer only, fund active).
   - On click: POST to `/api/funds/:id/reminders` → show toast "Recordatorio enviado a N participantes."

**Tests for Phase 6:**

File: `server/tests/unit/services/notificationService.test.js`
```
✓ shouldSendReminder returns false if already sent today (lastReminder = today)
✓ shouldSendReminder returns true for free fund with 5 days and no contribution
✓ shouldSendReminder returns false for free fund if contribution exists
✓ shouldSendReminder returns true for quota fund at 5, 3, 1 days
✓ shouldSendReminder returns false for quota fund at 4, 2 days
✓ shouldSendReminder returns false if days > 5 (free fund)
```

**DONE check:**
```bash
npm test -- tests/unit/services/notificationService.test.js
# Start Mailpit. Hit POST /api/funds/:id/reminders for a fund with pending participants
# Check Mailpit at localhost:8025 — emails received
```

---

### Phase 7 — Public Directory (HU13/HU14)

**Goal:** Authenticated users can browse public active funds and view their detail.

**Backend steps:**

(Already covered in Phase 2: `GET /funds/public` and `GET /funds/:id` with public visibility access.)

No additional backend work needed.

**Frontend steps:**

1. Create `PublicDirectoryPage.jsx`:
   - Fetches `GET /api/funds/public` with optional `q` and `sort`.
   - Same filter UI as `FundsPage`.
   - Renders `FundCard` for each result.
   - FundCard links to `/fondos/:id`.

2. `FundDetailPage.jsx` already handles public funds (access check on backend). If user is not a member:
   - Hide action buttons (invite, contribute, edit, delete, pay, reminder).
   - Show "Eres visitante de este fondo" notice.
   - Still show dashboard, participant count (not names), progress.

3. Add "Directorio" link to Navbar.

**Tests for Phase 7:**

Already in Phase 2:
```
✓ GET /funds/public — returns only public + active funds
✓ GET /funds/:id — 200 for unrelated user on public fund
✓ GET /funds/:id — 403 for unrelated user on private fund
```

**DONE check:**
```bash
npm test -- --testPathPattern=funds   # all pass
# Create a public fund. Log in as different user. Browse /directorio → fund appears.
# Click fund → detail shows without action buttons.
```

---

### Phase 8 — Documentation & Release

**Goal:** README complete, docs/ directory present, LICENSE present, tag created.

**Steps:**

1. Write `README.md` (Spanish) — see separate file.

2. Create `docs/` directory (empty, required by deliverables).

3. Add `LICENSE` (MIT).

4. Update GitHub Wiki: Home page + project description + Entrega 1 page.

5. Final test run:
   ```bash
   cd server && npm test -- --coverage   # coverage report
   ```

6. Create PR from `develop` to `main`. Get approval. Merge.

7. Tag:
   ```bash
   git tag v1.0-entrega1
   git push origin v1.0-entrega1
   ```

8. Create GitHub Release from tag `v1.0-entrega1`.

**DONE check:**
```bash
git tag -l           # v1.0-entrega1 present
# GitHub: Release published at v1.0-entrega1
# README renders correctly on GitHub
# npm test — all pass
```

---

## 9. Test Summary Table

| File | Type | Covers |
|---|---|---|
| `tests/unit/models/User.test.js` | Unit | User schema, password hashing, comparePassword |
| `tests/unit/models/Fund.test.js` | Unit | Fund schema, quota validation, defaults |
| `tests/unit/services/paymentService.test.js` | Unit | Simulation output shape |
| `tests/unit/services/notificationService.test.js` | Unit | Reminder logic, dedup, fund type rules |
| `tests/integration/routes/auth.test.js` | Integration | Register, login, JWT, /me |
| `tests/integration/routes/funds.test.js` | Integration | Full CRUD, filters, access control, locked fields, state transitions |
| `tests/integration/routes/participants.test.js` | Integration | Invite, accept/reject, remove, access control |
| `tests/integration/routes/contributions.test.js` | Integration | Create, list, payment execution |

All integration tests use `MongoMemoryServer` (in-memory DB, no external MongoDB required for tests).

---

## 10. JIRA Story → Phase Mapping

| Story | Phase |
|---|---|
| SCRUM-15 (HU04 Dev Setup) | Phase 0 |
| SCRUM-57 (HUCI-1 GitFlow) | Phase 0 |
| SCRUM-10 (HU05-1 Login) | Phase 1 |
| SCRUM-36 (HU05-2 Register) | Phase 1 |
| SCRUM-11 (HU06 Create Fund) | Phase 2 |
| SCRUM-19 (HU07 List Funds) | Phase 2 |
| SCRUM-20 (HU08 Fund Detail) | Phase 2 |
| SCRUM-56 (HU09 Edit Fund) | Phase 2 |
| SCRUM-22 (HU10 Delete Fund) | Phase 2 |
| SCRUM-52 (HU13 Public Directory) | Phase 2 + 7 |
| SCRUM-53 (HU14 Public Detail) | Phase 2 + 7 |
| SCRUM-23 (HU11 Invite/Remove Participant) | Phase 3 |
| SCRUM-24 (HU12 Register Contribution) | Phase 4 |
| SCRUM-54 (HU15 Payment Simulation) | Phase 4 |
| SCRUM-55 (HU16 Notifications) | Phase 6 |

---

## 11. Key Business Rules Cheat Sheet

| Rule | Location | Check |
|---|---|---|
| Only organizer can edit | `PATCH /funds/:id` | `fund.organizer.equals(req.user._id)` |
| Edit only if active | `PATCH /funds/:id` | `fund.status === 'active'` |
| Locked fields after contributions | `PATCH /funds/:id` | `Contribution.countDocuments({ fund: id, status: 'succeeded' }) > 0` |
| Locked fields include type + visibility | `PATCH /funds/:id` | `['targetAmount','deadline','recipientAccount','frequency','quotaAmount','type','visibility']` |
| Deadline must be > today | `POST + PATCH /funds` | `isDeadlineValid(deadline)` — compare ISO date strings |
| quotaAmount cannot exceed targetAmount | `POST /funds` | `Number(quotaAmount) > Number(targetAmount)` → 400 |
| Cannot delete with contributions | `DELETE /funds/:id` | `Contribution.countDocuments({ fund: id }) > 0` |
| Cannot close fund with contributions | `POST /funds/:id/close` | `Contribution.countDocuments({ fund: id, status: 'succeeded' }) > 0` → 422 |
| Invitation only while active + deadline > now | `POST /invitations` + `/invitations/:token/accept` | `fund.status === 'active' && fund.deadline > new Date()` |
| Cannot remove participant with contributions | `DELETE /funds/:id/participants/:uid` | `Contribution.countDocuments({ fund: id, user: uid }) > 0` |
| Only organizer or accepted participant can contribute | `POST /funds/:id/contributions` | role check |
| Quota funds: block overpayment | `POST /funds/:id/contributions` | `pendingQuotas === 0` → 400 "Estás al día" |
| Payment sets fund to completed | `POST /funds/:id/payment` | `fund.status = 'completed'`; fires `sendStatusChangeEmail` |
| Close sets fund to closed | `POST /funds/:id/close` | `fund.status = 'closed'`; fires `sendStatusChangeEmail` |
| Status change emails | `emailService.sendStatusChangeEmail` | Sent to organizer + accepted participants on `completed` / `closed` |
| Organizer can also contribute | `POST /funds/:id/contributions` | `fund.organizer.equals(req.user._id) \|\| accepted` |
| Reminder dedup | `notificationService` | `participant.lastReminder?.toDateString() === today` |
| Delete account blocked if in funds | `POST /users/request-delete` | `Fund.exists({ organizer: userId })` or accepted participant |
| Login blocked if not verified | `POST /auth/login` | `user.isEmailVerified === false` → 403 |
