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

    // Seed default categories if empty
    const [catCount] = await db.query('SELECT COUNT(*) AS total FROM Categories');
    if (catCount[0].total === 0) {
      await db.query(`
        INSERT INTO Categories (category_id, name) VALUES
        (1, 'Main Dishes'),
        (2, 'Snacks & Sides'),
        (3, 'Beverages'),
        (4, 'Desserts');
      `);
      console.log('✅ Default categories seeded.');
    }

    // Seed default menu items if empty
    const [itemCount] = await db.query('SELECT COUNT(*) AS total FROM MenuItems');
    if (itemCount[0].total === 0) {
      await db.query(`
        INSERT INTO MenuItems (item_id, category_id, canteen_id, name, description, price, photo_url, wait_time_minutes, is_reward_eligible, points_required, is_active) VALUES
        (1, 1, 1, 'Grilled Chicken Rice', 'Tender grilled chicken served with seasoned rice and fresh veggies.', 8.50, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80', 15, FALSE, NULL, TRUE),
        (2, 1, 1, 'Beef Burger & Fries', 'Juicy beef patty topped with cheese, lettuce, and secret sauce.', 7.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80', 12, FALSE, NULL, TRUE),
        (3, 2, 1, 'Crispy French Fries', 'Golden fried potato fries salted to perfection.', 3.00, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80', 8, TRUE, 3, TRUE),
        (4, 3, 1, 'Iced Lemon Tea', 'Refreshing brewed tea with fresh lemon slices.', 2.50, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80', 5, TRUE, 2, TRUE),
        (5, 4, 1, 'Chocolate Muffin', 'Rich chocolate chip muffin baked fresh daily.', 3.50, 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=500&q=80', 5, TRUE, 3, TRUE);
      `);
      console.log('🍔 Default menu items seeded.');
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
