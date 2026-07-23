const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// All kitchen routes require kitchen or admin role
router.use(verifyToken, requireRole('kitchen', 'admin'));

// 1. Get incoming kitchen orders sorted by newest first (order_id DESC), filterable by status and date
router.get('/orders', async (req, res) => {
  const { status, date } = req.query;

  try {
    let query = `
      SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.loyalty_points AS customer_points
      FROM Orders o
      JOIN Users u ON o.user_id = u.user_id
      WHERE 1=1
    `;
    const queryParams = [];

    if (status && status !== 'all') {
      query += ` AND o.status = ?`;
      queryParams.push(status);
    }

    if (date) {
      query += ` AND DATE(o.pickup_time) = ?`;
      queryParams.push(date);
    }

    query += ` ORDER BY o.order_id DESC, o.order_time DESC`;

    const [orders] = await db.query(query, queryParams);

    if (orders.length === 0) {
      return res.json({ status: 'success', orders: [] });
    }

    const orderIds = orders.map(o => o.order_id);
    const [items] = await db.query(
      `SELECT oi.*, m.name AS item_name
       FROM OrderItems oi
       JOIN MenuItems m ON oi.item_id = m.item_id
       WHERE oi.order_id IN (?)`,
      [orderIds]
    );

    // Group items by order_id
    const ordersWithItems = orders.map(order => {
      const orderItems = items.filter(i => i.order_id === order.order_id);
      return {
        ...order,
        items: orderItems
      };
    });

    res.json({ status: 'success', orders: ordersWithItems });
  } catch (error) {
    console.error('Kitchen orders error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch kitchen orders.', error: error.message });
  }
});

// 2. Update Order Status with strict valid transition enforcement & loyalty points awarding
router.patch('/orders/:id/status', async (req, res) => {
  const orderId = req.params.id;
  const { new_status } = req.body;

  const validStatuses = ['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'rejected'];
  if (!new_status || !validStatuses.includes(new_status)) {
    return res.status(400).json({ status: 'error', message: 'Invalid target status.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [orders] = await connection.query('SELECT * FROM Orders WHERE order_id = ? FOR UPDATE', [orderId]);
    if (orders.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ status: 'error', message: 'Order not found.' });
    }

    const order = orders[0];
    const currentStatus = order.status;

    // Validate Transition Matrix
    const allowedTransitions = {
      pending: ['accepted', 'rejected'],
      accepted: ['preparing', 'rejected'],
      preparing: ['ready', 'rejected'],
      ready: ['picked_up'],
      picked_up: [],
      rejected: []
    };

    if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus].includes(new_status)) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        status: 'error',
        message: `Invalid status transition from "${currentStatus}" to "${new_status}".`
      });
    }

    // Prepare update parameters
    let paymentStatus = order.payment_status;
    let completedAt = order.completed_at;

    if (new_status === 'picked_up') {
      paymentStatus = 'paid';
      completedAt = new Date();

      // Award +1 Loyalty Point to customer if not awarded yet
      await connection.query(
        'UPDATE Users SET loyalty_points = loyalty_points + 1 WHERE user_id = ?',
        [order.user_id]
      );
    }

    const formattedCompletedAt = completedAt ? new Date(completedAt).toISOString().slice(0, 19).replace('T', ' ') : null;

    await connection.query(
      `UPDATE Orders SET status = ?, payment_status = ?, completed_at = ? WHERE order_id = ?`,
      [new_status, paymentStatus, formattedCompletedAt, orderId]
    );

    await connection.commit();
    connection.release();

    res.json({
      status: 'success',
      message: `Order #${orderId} status updated to ${new_status.toUpperCase()}`,
      order_id: orderId,
      status: new_status,
      payment_status: paymentStatus
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('Update order status error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update order status.', error: error.message });
  }
});

// 3. Mark Cash Payment Received
router.patch('/orders/:id/payment', async (req, res) => {
  const orderId = req.params.id;
  const { payment_status } = req.body; // 'paid' or 'unpaid'

  if (!payment_status || !['paid', 'unpaid'].includes(payment_status)) {
    return res.status(400).json({ status: 'error', message: 'Payment status must be paid or unpaid.' });
  }

  try {
    await db.query('UPDATE Orders SET payment_status = ? WHERE order_id = ?', [payment_status, orderId]);
    res.json({ status: 'success', message: `Payment status for Order #${orderId} updated to ${payment_status.toUpperCase()}` });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to update payment status.', error: error.message });
  }
});

// 4. Update Menu Item Preparation Time
router.patch('/menu/:id/prep-time', async (req, res) => {
  const itemId = req.params.id;
  const { wait_time_minutes } = req.body;

  if (!wait_time_minutes || parseInt(wait_time_minutes) <= 0) {
    return res.status(400).json({ status: 'error', message: 'Valid wait time in minutes is required.' });
  }

  try {
    await db.query('UPDATE MenuItems SET wait_time_minutes = ? WHERE item_id = ?', [parseInt(wait_time_minutes), itemId]);
    res.json({ status: 'success', message: 'Preparation wait time updated successfully.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to update prep time.', error: error.message });
  }
});

module.exports = router;
