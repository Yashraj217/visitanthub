require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection } = require('./config/database');
const { autoCheckInAll } = require('./services/autoCheckIn');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/companies',   require('./routes/companies'));
app.use('/api/employees',   require('./routes/employees'));
app.use('/api/visitors',    require('./routes/visitors'));
app.use('/api/visits',      require('./routes/visits'));
app.use('/api/services',    require('./routes/services'));
app.use('/api/departments',   require('./routes/departments'));
app.use('/api/designations', require('./routes/designations'));
app.use('/api/display',     require('./routes/display'));
app.use('/api/scheduling',  require('./routes/scheduling'));
app.use('/api/stages',      require('./routes/stages'));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Serve React build in production; 404 JSON in development
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  // Hashed assets: cache aggressively; index.html: never cache
  app.use(express.static(clientDist, { index: false }));
  app.get('*', (_, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.use((_, res) => res.status(404).json({ message: 'Route not found' }));
}

// Error handler
app.use((err, _, res, __) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Run auto check-in once at startup, then every 5 minutes
  autoCheckInAll().catch(console.error);
  setInterval(() => autoCheckInAll().catch(console.error), 5 * 60 * 1000);
});
