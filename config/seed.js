const bcrypt = require('bcryptjs');
const db = require('./db');

async function seedDefaultUsers() {
  try {
    const defaultPassword = 'password123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(defaultPassword, salt);

    const defaultUsers = [
      { name: 'Admin User', email: 'admin@campuseats.com', role: 'admin', loyalty_points: 0, daily_limit: 0.00 },
      { name: 'Kitchen Staff', email: 'kitchen@campuseats.com', role: 'kitchen', loyalty_points: 0, daily_limit: 0.00 },
      { name: 'John Customer', email: 'customer@campuseats.com', role: 'customer', loyalty_points: 5, daily_limit: 25.00 }
    ];

    for (const u of defaultUsers) {
      const [existing] = await db.query('SELECT user_id FROM Users WHERE email = ?', [u.email]);
      if (existing.length === 0) {
        await db.query(
          'INSERT INTO Users (name, email, password_hash, role, loyalty_points, daily_limit) VALUES (?, ?, ?, ?, ?, ?)',
          [u.name, u.email, hash, u.role, u.loyalty_points, u.daily_limit]
        );
        console.log(`🌱 Created seed user: ${u.email} (${u.role})`);
      } else {
        // Ensure password_hash is updated to valid hash for 'password123'
        await db.query(
          'UPDATE Users SET password_hash = ? WHERE email = ?',
          [hash, u.email]
        );
        console.log(`🔑 Synchronized password for seed user: ${u.email}`);
      }
    }
  } catch (error) {
    console.error('Seed users error:', error.message);
  }
}

module.exports = seedDefaultUsers;
