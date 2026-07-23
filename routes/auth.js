const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

// 1. Customer Registration
router.post('/register', async (req, res) => {
  const { name, email, password, daily_limit } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ status: 'error', message: 'Name, email, and password are required.' });
  }

  try {
    // Check if email already exists
    const [existingUsers] = await db.query('SELECT user_id FROM Users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ status: 'error', message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const parsedDailyLimit = parseFloat(daily_limit) || 0.00;

    // Insert new customer
    const [result] = await db.query(
      'INSERT INTO Users (name, email, password_hash, role, loyalty_points, daily_limit) VALUES (?, ?, ?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), password_hash, 'customer', 0, parsedDailyLimit]
    );

    const userId = result.insertId;
    const userPayload = { user_id: userId, name: name.trim(), email: email.trim().toLowerCase(), role: 'customer' };

    // Generate token
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      status: 'success',
      message: 'Registration successful!',
      token,
      user: {
        user_id: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'customer',
        loyalty_points: 0,
        daily_limit: parsedDailyLimit
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to register user.', error: error.message });
  }
});

// 2. User Login (Customer, Kitchen, Admin)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Email and password are required.' });
  }

  try {
    const [users] = await db.query('SELECT * FROM Users WHERE email = ?', [email.trim().toLowerCase()]);
    if (users.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
    }

    const userPayload = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      status: 'success',
      message: 'Login successful!',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        loyalty_points: user.loyalty_points,
        daily_limit: user.daily_limit
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ status: 'error', message: 'Login server error.', error: error.message });
  }
});

// 3. Get Current User Profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT user_id, name, email, role, loyalty_points, daily_limit, created_at FROM Users WHERE user_id = ?',
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    res.json({
      status: 'success',
      user: users[0]
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch user info.', error: error.message });
  }
});

module.exports = router;
