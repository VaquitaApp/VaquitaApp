require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/funds',       require('./routes/funds'));
app.use('/api/funds/:id',   require('./routes/participants'));
app.use('/api/funds/:id/contributions', require('./routes/contributions'));
app.use('/api/invitations',   require('./routes/invitations'));
app.use('/api/join-requests', require('./routes/joinRequests'));
app.use('/api/fund-access', require('./routes/fundAccess'));
app.use('/api/users',       require('./routes/users'));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

module.exports = app;