const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken, requireRole('customer'));

// Submit rating and comment for a menu item
router.post('/', async (req, res) => {
  const { item_id, rating, comment } = req.body;
  const userId = req.user.user_id;

  if (!item_id || !rating) {
    return res.status(400).json({ status: 'error', message: 'Item ID and rating (1-5) are required.' });
  }

  const parsedRating = parseInt(rating);
  if (parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ status: 'error', message: 'Rating must be between 1 and 5 stars.' });
  }

  try {
    // Check if user has purchased the item in a picked_up order
    const [purchasedRows] = await db.query(
      `SELECT oi.order_item_id
       FROM OrderItems oi
       JOIN Orders o ON oi.order_id = o.order_id
       WHERE o.user_id = ? AND oi.item_id = ? AND o.status = 'picked_up'`,
      [userId, item_id]
    );

    if (purchasedRows.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only rate and review items you have purchased and picked up.'
      });
    }

    // Insert new review entry so every rating contributes to the total count & average calculation
    await db.query(
      'INSERT INTO Reviews (user_id, item_id, rating, comment) VALUES (?, ?, ?, ?)',
      [userId, item_id, parsedRating, comment ? comment.trim() : '']
    );

    res.status(201).json({ status: 'success', message: 'Thank you! Your review has been submitted.' });

  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to submit review.', error: error.message });
  }
});

module.exports = router;
