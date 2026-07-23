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
      { name: 'John Customer', email: 'customer@campuseats.com', role: 'customer', loyalty_points: 5, daily_limit: 25.00 },
      { name: 'Sarah Connor', email: 'sarah@campuseats.com', role: 'customer', loyalty_points: 3, daily_limit: 20.00 },
      { name: 'Michael Scott', email: 'michael@campuseats.com', role: 'customer', loyalty_points: 8, daily_limit: 50.00 },
      { name: 'Pam Beesly', email: 'pam@campuseats.com', role: 'customer', loyalty_points: 2, daily_limit: 30.00 }
    ];

    for (const u of defaultUsers) {
      const [existing] = await db.query('SELECT user_id FROM Users WHERE email = ?', [u.email]);
      if (existing.length === 0) {
        await db.query(
          'INSERT INTO Users (name, email, password_hash, role, loyalty_points, daily_limit) VALUES (?, ?, ?, ?, ?, ?)',
          [u.name, u.email, hash, u.role, u.loyalty_points, u.daily_limit]
        );
      } else {
        await db.query(
          'UPDATE Users SET password_hash = ? WHERE email = ?',
          [hash, u.email]
        );
      }
    }

    // Seed sample customer reviews for menu items if Reviews table has < 3 reviews
    const [reviewCount] = await db.query('SELECT COUNT(*) AS total FROM Reviews');
    if (reviewCount[0].total < 3) {
      const [customers] = await db.query("SELECT user_id, name FROM Users WHERE role = 'customer'");
      const [items] = await db.query('SELECT item_id FROM MenuItems ORDER BY item_id ASC');

      if (customers.length >= 3 && items.length >= 3) {
        const sampleReviews = [
          { user_id: customers[0].user_id, item_id: items[0].item_id, rating: 5, comment: 'Absolutely tender and delicious grilled chicken! Highly recommend.' },
          { user_id: customers[1].user_id, item_id: items[0].item_id, rating: 4, comment: 'Great portion size and fast preparation time.' },
          { user_id: customers[2].user_id, item_id: items[0].item_id, rating: 5, comment: 'Best lunch item on campus hands down!' },
          { user_id: customers[0].user_id, item_id: items[1].item_id, rating: 4, comment: 'Burger patty was juicy and fries were nice and crispy.' },
          { user_id: customers[1].user_id, item_id: items[1].item_id, rating: 5, comment: 'Awesome value for money.' },
          { user_id: customers[2].user_id, item_id: items[2].item_id, rating: 5, comment: 'Super golden and crispy fries!' },
          { user_id: customers[3].user_id, item_id: items[3].item_id, rating: 5, comment: 'Very refreshing iced lemon tea.' }
        ];

        for (const sr of sampleReviews) {
          // Check if picked_up order exists so review is valid
          const [existingOrders] = await db.query('SELECT order_id FROM Orders WHERE user_id = ? AND status = "picked_up"', [sr.user_id]);
          let orderId;
          if (existingOrders.length === 0) {
            const [newOrder] = await db.query(
              'INSERT INTO Orders (user_id, total_amount, status, payment_status, pickup_time) VALUES (?, 10.00, "picked_up", "paid", NOW())',
              [sr.user_id]
            );
            orderId = newOrder.insertId;
            await db.query(
              'INSERT INTO OrderItems (order_id, item_id, quantity, unit_price, subtotal) VALUES (?, ?, 1, 10.00, 10.00)',
              [orderId, sr.item_id]
            );
          }

          await db.query(
            'INSERT INTO Reviews (user_id, item_id, rating, comment) VALUES (?, ?, ?, ?)',
            [sr.user_id, sr.item_id, sr.rating, sr.comment]
          );
        }
        console.log('⭐ Seeded multi-user sample reviews with calculated average ratings.');
      }
    }

  } catch (error) {
    console.error('Seed error:', error.message);
  }
}

module.exports = seedDefaultUsers;
