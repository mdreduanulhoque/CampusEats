const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// Apply admin protection to all routes in this router
router.use(verifyToken, requireRole('admin'));

// --- CATEGORIES ---

// 1. Get all categories
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM Categories ORDER BY name ASC');
    res.json({ status: 'success', categories });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch categories.', error: error.message });
  }
});

// 2. Create new category
router.post('/categories', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ status: 'error', message: 'Category name is required.' });
  }

  try {
    const [result] = await db.query('INSERT INTO Categories (name) VALUES (?)', [name.trim()]);
    res.status(201).json({
      status: 'success',
      message: 'Category created successfully.',
      category: { category_id: result.insertId, name: name.trim() }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ status: 'error', message: 'Category already exists.' });
    }
    res.status(500).json({ status: 'error', message: 'Failed to create category.', error: error.message });
  }
});

// 3. Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM Categories WHERE category_id = ?', [req.params.id]);
    res.json({ status: 'success', message: 'Category deleted successfully.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to delete category.', error: error.message });
  }
});


// --- MENU ITEMS ---

// 1. Get all menu items (including inactive ones for admin view)
router.get('/menu', async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT m.*, c.name AS category_name
      FROM MenuItems m
      LEFT JOIN Categories c ON m.category_id = c.category_id
      ORDER BY m.item_id DESC
    `);
    res.json({ status: 'success', items });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch menu items.', error: error.message });
  }
});

// 2. Create new menu item
router.post('/menu', async (req, res) => {
  const {
    category_id,
    name,
    description,
    price,
    photo_url,
    wait_time_minutes,
    is_reward_eligible,
    points_required,
    is_active
  } = req.body;

  if (!name || !price) {
    return res.status(400).json({ status: 'error', message: 'Name and price are required.' });
  }

  try {
    const parsedCategoryId = category_id ? parseInt(category_id) : null;
    const parsedPrice = parseFloat(price);
    const parsedWaitTime = wait_time_minutes ? parseInt(wait_time_minutes) : 15;
    const parsedRewardEligible = is_reward_eligible ? 1 : 0;
    const parsedPointsRequired = (parsedRewardEligible && points_required) ? parseInt(points_required) : null;
    const parsedIsActive = is_active !== undefined ? (is_active ? 1 : 0) : 1;

    const [result] = await db.query(
      `INSERT INTO MenuItems 
       (category_id, name, description, price, photo_url, wait_time_minutes, is_reward_eligible, points_required, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parsedCategoryId,
        name.trim(),
        description ? description.trim() : '',
        parsedPrice,
        photo_url ? photo_url.trim() : null,
        parsedWaitTime,
        parsedRewardEligible,
        parsedPointsRequired,
        parsedIsActive
      ]
    );

    res.status(201).json({
      status: 'success',
      message: 'Menu item created successfully.',
      item_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to create menu item.', error: error.message });
  }
});

// 3. Update existing menu item
router.put('/menu/:id', async (req, res) => {
  const itemId = req.params.id;
  const {
    category_id,
    name,
    description,
    price,
    photo_url,
    wait_time_minutes,
    is_reward_eligible,
    points_required,
    is_active
  } = req.body;

  if (!name || !price) {
    return res.status(400).json({ status: 'error', message: 'Name and price are required.' });
  }

  try {
    const parsedCategoryId = category_id ? parseInt(category_id) : null;
    const parsedPrice = parseFloat(price);
    const parsedWaitTime = wait_time_minutes ? parseInt(wait_time_minutes) : 15;
    const parsedRewardEligible = is_reward_eligible ? 1 : 0;
    const parsedPointsRequired = (parsedRewardEligible && points_required) ? parseInt(points_required) : null;
    const parsedIsActive = is_active !== undefined ? (is_active ? 1 : 0) : 1;

    await db.query(
      `UPDATE MenuItems SET
       category_id = ?, name = ?, description = ?, price = ?, photo_url = ?,
       wait_time_minutes = ?, is_reward_eligible = ?, points_required = ?, is_active = ?
       WHERE item_id = ?`,
      [
        parsedCategoryId,
        name.trim(),
        description ? description.trim() : '',
        parsedPrice,
        photo_url ? photo_url.trim() : null,
        parsedWaitTime,
        parsedRewardEligible,
        parsedPointsRequired,
        parsedIsActive,
        itemId
      ]
    );

    res.json({ status: 'success', message: 'Menu item updated successfully.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to update menu item.', error: error.message });
  }
});

// 4. Toggle active status of menu item
router.patch('/menu/:id/toggle', async (req, res) => {
  const itemId = req.params.id;
  try {
    await db.query('UPDATE MenuItems SET is_active = NOT is_active WHERE item_id = ?', [itemId]);
    res.json({ status: 'success', message: 'Menu item status toggled.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to toggle status.', error: error.message });
  }
});

// 5. Delete menu item
router.delete('/menu/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM MenuItems WHERE item_id = ?', [req.params.id]);
    res.json({ status: 'success', message: 'Menu item deleted successfully.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to delete menu item.', error: error.message });
  }
});


// --- USER MANAGEMENT ---

// 1. Get all system users
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT user_id, name, email, role, loyalty_points, daily_limit, created_at FROM Users ORDER BY user_id DESC'
    );
    res.json({ status: 'success', users });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch users.', error: error.message });
  }
});

// 2. Create staff / admin / customer user
router.post('/users', async (req, res) => {
  const { name, email, password, role, daily_limit } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ status: 'error', message: 'Name, email, password, and role are required.' });
  }

  if (!['customer', 'kitchen', 'admin'].includes(role)) {
    return res.status(400).json({ status: 'error', message: 'Invalid user role specified.' });
  }

  try {
    const [existing] = await db.query('SELECT user_id FROM Users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      return res.status(400).json({ status: 'error', message: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const parsedDailyLimit = parseFloat(daily_limit) || 0.00;

    const [result] = await db.query(
      'INSERT INTO Users (name, email, password_hash, role, loyalty_points, daily_limit) VALUES (?, ?, ?, ?, 0, ?)',
      [name.trim(), email.trim().toLowerCase(), password_hash, role, parsedDailyLimit]
    );

    res.status(201).json({
      status: 'success',
      message: `User "${name.trim()}" (${role}) created successfully!`,
      user_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to create user.', error: error.message });
  }
});

// 3. Update user details (daily limit, role, name)
router.put('/users/:id', async (req, res) => {
  const userId = req.params.id;
  const { name, role, daily_limit } = req.body;

  if (!name || !role) {
    return res.status(400).json({ status: 'error', message: 'Name and role are required.' });
  }

  try {
    const parsedDailyLimit = parseFloat(daily_limit) || 0.00;

    await db.query(
      'UPDATE Users SET name = ?, role = ?, daily_limit = ? WHERE user_id = ?',
      [name.trim(), role, parsedDailyLimit, userId]
    );

    res.json({ status: 'success', message: 'User details updated successfully.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to update user.', error: error.message });
  }
});


// --- SALES ANALYTICS & REPORTS ---

router.get('/analytics', async (req, res) => {
  const { start_date, end_date } = req.query;

  try {
    let dateFilter = '';
    const dateParams = [];

    if (start_date && end_date) {
      dateFilter = ' AND DATE(o.order_time) BETWEEN ? AND ?';
      dateParams.push(start_date, end_date);
    } else if (start_date) {
      dateFilter = ' AND DATE(o.order_time) >= ?';
      dateParams.push(start_date);
    } else if (end_date) {
      dateFilter = ' AND DATE(o.order_time) <= ?';
      dateParams.push(end_date);
    }

    // 1. Total Revenue from Picked Up Paid Orders
    const [salesRows] = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0.00) AS total_sales
       FROM Orders o
       WHERE o.status = 'picked_up' AND o.payment_status = 'paid'` + dateFilter,
      dateParams
    );

    // 2. Picked Up Orders Count
    const [pickedUpRows] = await db.query(
      `SELECT COUNT(*) AS picked_up_count
       FROM Orders o
       WHERE o.status = 'picked_up'` + dateFilter,
      dateParams
    );

    // 3. Total Orders Count
    const [totalOrdersRows] = await db.query(
      `SELECT COUNT(*) AS total_orders
       FROM Orders o
       WHERE 1=1` + dateFilter,
      dateParams
    );

    // 4. Best Selling Menu Items
    const [bestSellers] = await db.query(
      `SELECT m.name AS item_name, c.name AS category_name,
              SUM(oi.quantity) AS total_quantity,
              SUM(oi.subtotal) AS total_revenue
       FROM OrderItems oi
       JOIN Orders o ON oi.order_id = o.order_id
       JOIN MenuItems m ON oi.item_id = m.item_id
       LEFT JOIN Categories c ON m.category_id = c.category_id
       WHERE o.status = 'picked_up'` + dateFilter + `
       GROUP BY m.item_id
       ORDER BY total_quantity DESC
       LIMIT 5`,
      dateParams
    );

    // 5. Peak Order Hours Analysis
    const [peakHours] = await db.query(
      `SELECT HOUR(o.order_time) AS hour_of_day,
              COUNT(*) AS order_count,
              SUM(o.total_amount) AS total_sales
       FROM Orders o
       WHERE o.status != 'rejected'` + dateFilter + `
       GROUP BY hour_of_day
       ORDER BY order_count DESC
       LIMIT 5`,
      dateParams
    );

    // 6. Recent Orders Activity Log
    const [recentOrders] = await db.query(
      `SELECT o.*, u.name AS customer_name
       FROM Orders o
       JOIN Users u ON o.user_id = u.user_id
       WHERE 1=1` + dateFilter + `
       ORDER BY o.order_id DESC
       LIMIT 10`,
      dateParams
    );

    res.json({
      status: 'success',
      analytics: {
        total_sales: parseFloat(salesRows[0].total_sales) || 0.00,
        picked_up_count: parseInt(pickedUpRows[0].picked_up_count) || 0,
        total_orders: parseInt(totalOrdersRows[0].total_orders) || 0,
        best_sellers: bestSellers,
        peak_hours: peakHours.map(ph => ({
          ...ph,
          formatted_hour: `${ph.hour_of_day % 12 || 12}:00 ${ph.hour_of_day >= 12 ? 'PM' : 'AM'}`
        })),
        recent_orders: recentOrders
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch sales analytics.', error: error.message });
  }
});

module.exports = router;
