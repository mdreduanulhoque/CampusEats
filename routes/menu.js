const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 1. Get categories for menu browsing
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM Categories ORDER BY name ASC');
    res.json({ status: 'success', categories });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch categories.', error: error.message });
  }
});

// 2. Get active menu items with optional category filtering and average rating
router.get('/', async (req, res) => {
  const { category_id } = req.query;

  try {
    let query = `
      SELECT 
        m.*, 
        c.name AS category_name,
        COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
        COUNT(r.review_id) AS total_reviews
      FROM MenuItems m
      LEFT JOIN Categories c ON m.category_id = c.category_id
      LEFT JOIN Reviews r ON m.item_id = r.item_id
      WHERE m.is_active = TRUE
    `;

    const queryParams = [];

    if (category_id && category_id !== 'all') {
      query += ` AND m.category_id = ?`;
      queryParams.push(category_id);
    }

    query += ` GROUP BY m.item_id ORDER BY c.name ASC, m.name ASC`;

    const [items] = await db.query(query, queryParams);
    res.json({ status: 'success', items });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch menu items.', error: error.message });
  }
});

// 3. Get single menu item with reviews
router.get('/:id', async (req, res) => {
  const itemId = req.params.id;
  try {
    const [items] = await db.query(
      `SELECT m.*, c.name AS category_name,
              COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
              COUNT(r.review_id) AS total_reviews
       FROM MenuItems m
       LEFT JOIN Categories c ON m.category_id = c.category_id
       LEFT JOIN Reviews r ON m.item_id = r.item_id
       WHERE m.item_id = ?
       GROUP BY m.item_id`,
      [itemId]
    );

    if (items.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Menu item not found.' });
    }

    // Fetch customer reviews for this item
    const [reviews] = await db.query(
      `SELECT r.*, u.name AS user_name
       FROM Reviews r
       JOIN Users u ON r.user_id = u.user_id
       WHERE r.item_id = ?
       ORDER BY r.created_at DESC`,
      [itemId]
    );

    res.json({
      status: 'success',
      item: items[0],
      reviews
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch item details.', error: error.message });
  }
});

module.exports = router;
