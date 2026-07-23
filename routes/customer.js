const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken, requireRole('customer'));

// 1. Get customer's full order history with items
router.get('/orders', async (req, res) => {
  const userId = req.user.user_id;

  try {
    const [orders] = await db.query(
      `SELECT * FROM Orders WHERE user_id = ? ORDER BY order_id DESC`,
      [userId]
    );

    if (orders.length === 0) {
      return res.json({ status: 'success', orders: [] });
    }

    const orderIds = orders.map(o => o.order_id);
    const [items] = await db.query(
      `SELECT oi.*, m.name AS item_name, m.photo_url, m.is_reward_eligible
       FROM OrderItems oi
       JOIN MenuItems m ON oi.item_id = m.item_id
       WHERE oi.order_id IN (?)`,
      [orderIds]
    );

    // Group items by order_id
    const ordersWithItems = orders.map(order => {
      return {
        ...order,
        items: items.filter(i => i.order_id === order.order_id)
      };
    });

    res.json({ status: 'success', orders: ordersWithItems });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch order history.', error: error.message });
  }
});

// 2. Get specific digital receipt for an order
router.get('/orders/:id/receipt', async (req, res) => {
  const userId = req.user.user_id;
  const orderId = req.params.id;

  try {
    const [orders] = await db.query(
      `SELECT o.*, u.name AS customer_name, u.email AS customer_email
       FROM Orders o
       JOIN Users u ON o.user_id = u.user_id
       WHERE o.order_id = ? AND o.user_id = ?`,
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Order not found.' });
    }

    const [items] = await db.query(
      `SELECT oi.*, m.name AS item_name
       FROM OrderItems oi
       JOIN MenuItems m ON oi.item_id = m.item_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    res.json({
      status: 'success',
      receipt: {
        ...orders[0],
        items
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch receipt.', error: error.message });
  }
});

module.exports = router;
