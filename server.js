const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');
const seedDefaultUsers = require('./config/seed');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const kitchenRoutes = require('./routes/kitchen');
const customerRoutes = require('./routes/customer');
const reviewRoutes = require('./routes/reviews');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/reviews', reviewRoutes);

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Health Check API endpoint
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json({
      status: 'ok',
      message: 'CampusEats Backend API is active',
      database: 'connected',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Serve frontend SPA pages
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/kitchen', (req, res) => res.sendFile(path.join(__dirname, 'public', 'kitchen.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// Fallback route serving public/index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      res.status(404).send('CampusEats Web App Running.');
    }
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 CampusEats Server running on http://localhost:${PORT}`);
  // Synchronize seed user passwords on startup
  await seedDefaultUsers();
});
