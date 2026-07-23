const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// All order creation routes require Customer role
router.use(verifyToken);

// 1. Get user's today spending summary & daily limit info
router.get('/daily-limit-status', async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get user daily limit
    const [users] = await db.query('SELECT daily_limit, loyalty_points FROM Users WHERE user_id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }
    const user = users[0];
    const dailyLimit = parseFloat(user.daily_limit) || 0.00;

    // Calculate total spent today on pending/accepted/preparing/ready/picked_up orders
    const [spentRows] = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0.00) AS today_spent
       FROM Orders
       WHERE user_id = ? 
         AND DATE(order_time) = CURDATE()
         AND status != 'rejected'`,
      [userId]
    );

    const todaySpent = parseFloat(spentRows[0].today_spent) || 0.00;
    const remainingLimit = dailyLimit > 0 ? Math.max(0, dailyLimit - todaySpent) : null;

    res.json({
      status: 'success',
      daily_limit: dailyLimit,
      today_spent: todaySpent,
      remaining_limit: remainingLimit,
      loyalty_points: user.loyalty_points
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch limit status.', error: error.message });
  }
});

// 2. Place a new order (POST /api/orders)
router.post('/', requireRole('customer'), async (req, res) => {
  const { pickup_time, items } = req.body;
  const userId = req.user.user_id;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Cart is empty. Please add items to place an order.' });
  }

  if (!pickup_time) {
    return res.status(400).json({ status: 'error', message: 'Pickup time is required.' });
  }

  const pickupDate = new Date(pickup_time);
  if (isNaN(pickupDate.getTime()) || pickupDate < new Date()) {
    return res.status(400).json({ status: 'error', message: 'Pickup time must be a valid future time.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Fetch user details (daily_limit, loyalty_points)
    const [userRows] = await connection.query('SELECT daily_limit, loyalty_points FROM Users WHERE user_id = ? FOR UPDATE', [userId]);
    const user = userRows[0];
    const dailyLimit = parseFloat(user.daily_limit) || 0.00;

    // 2. Verify pricing & availability for each item in backend
    let calculatedTotal = 0.00;
    const verifiedOrderItems = [];

    for (const cartItem of items) {
      const [itemRows] = await connection.query(
        'SELECT item_id, name, price, is_active FROM MenuItems WHERE item_id = ?',
        [cartItem.item_id]
      );

      if (itemRows.length === 0 || !itemRows[0].is_active) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ status: 'error', message: `Item "${cartItem.name || 'Selected item'}" is no longer active or available.` });
      }

      const menuItem = itemRows[0];
      const quantity = parseInt(cartItem.quantity) || 1;
      const isFreeReward = !!cartItem.is_free_reward;
      const unitPrice = isFreeReward ? 0.00 : parseFloat(menuItem.price);
      const subtotal = unitPrice * quantity;

      calculatedTotal += subtotal;

      verifiedOrderItems.push({
        item_id: menuItem.item_id,
        name: menuItem.name,
        quantity,
        unit_price: unitPrice,
        subtotal,
        is_free_reward: isFreeReward
      });
    }

    // 3. Server-side Daily Limit Check
    if (dailyLimit > 0 && calculatedTotal > 0) {
      const [todaySpentRows] = await connection.query(
        `SELECT COALESCE(SUM(total_amount), 0.00) AS today_spent
         FROM Orders
         WHERE user_id = ? 
           AND DATE(order_time) = CURDATE()
           AND status != 'rejected'`,
        [userId]
      );

      const todaySpent = parseFloat(todaySpentRows[0].today_spent) || 0.00;
      const newTotalSpent = todaySpent + calculatedTotal;

      if (newTotalSpent > dailyLimit) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          status: 'error',
          message: `Daily spending limit exceeded! Your limit is $${dailyLimit.toFixed(2)}. You have spent $${todaySpent.toFixed(2)} today. Adding this order ($${calculatedTotal.toFixed(2)}) brings total to $${newTotalSpent.toFixed(2)}.`
        });
      }
    }

    // 4. Insert Order
    const formattedPickupTime = pickupDate.toISOString().slice(0, 19).replace('T', ' ');
    const [orderResult] = await connection.query(
      `INSERT INTO Orders (user_id, total_amount, status, payment_method, payment_status, pickup_time)
       VALUES (?, ?, 'pending', 'cash_on_pickup', 'unpaid', ?)`,
      [userId, calculatedTotal, formattedPickupTime]
    );

    const orderId = orderResult.insertId;

    // 5. Insert Order Items
    for (const verifiedItem of verifiedOrderItems) {
      await connection.query(
        `INSERT INTO OrderItems (order_id, item_id, quantity, unit_price, subtotal, is_free_reward)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, verifiedItem.item_id, verifiedItem.quantity, verifiedItem.unit_price, verifiedItem.subtotal, verifiedItem.is_free_reward]
      );
    }

    await connection.commit();
    connection.release();

    res.status(201).json({
      status: 'success',
      message: 'Order placed successfully! Please bring cash on pickup.',
      order: {
        order_id: orderId,
        total_amount: calculatedTotal,
        pickup_time: formattedPickupTime,
        status: 'pending',
        payment_method: 'cash_on_pickup',
        items: verifiedOrderItems
      }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('Order creation error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to place order.', error: error.message });
  }
});

module.exports = router;
