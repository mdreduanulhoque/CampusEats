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

// 2. Get active canteens for menu filtering
router.get('/canteens', async (req, res) => {
  try {
    const [canteens] = await db.query('SELECT canteen_id, name, description FROM Canteens WHERE is_active = TRUE ORDER BY name ASC');
    res.json({ status: 'success', canteens });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch canteens.', error: error.message });
  }
});

// 3. Get active menu items with optional category/canteen filtering and average rating
router.get('/', async (req, res) => {
  const { category_id, canteen_id } = req.query;

  try {
    let query = `
      SELECT 
        m.*, 
        c.name AS category_name,
        k.name AS canteen_name,
        COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
        COUNT(r.review_id) AS total_reviews
      FROM MenuItems m
      LEFT JOIN Categories c ON m.category_id = c.category_id
      LEFT JOIN Canteens k ON m.canteen_id = k.canteen_id
      LEFT JOIN Reviews r ON m.item_id = r.item_id
      WHERE m.is_active = TRUE
    `;

    const queryParams = [];

    if (category_id && category_id !== 'all') {
      query += ` AND m.category_id = ?`;
      queryParams.push(category_id);
    }

    if (canteen_id && canteen_id !== 'all') {
      query += ` AND m.canteen_id = ?`;
      queryParams.push(parseInt(canteen_id));
    }

    query += ` GROUP BY m.item_id ORDER BY k.name ASC, c.name ASC, m.name ASC`;

    const [items] = await db.query(query, queryParams);
    res.json({ status: 'success', items });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch menu items.', error: error.message });
  }
});

// 3.5 Compare multiple items side by side
router.get('/compare', async (req, res) => {
  const { ids } = req.query;
  if (!ids) {
    return res.status(400).json({ status: 'error', message: 'Item IDs parameter "ids" is required (e.g., ids=1,2,3).' });
  }

  const idList = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
  if (idList.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid item IDs provided.' });
  }

  try {
    const [items] = await db.query(
      `SELECT 
        m.*, 
        c.name AS category_name,
        k.name AS canteen_name,
        k.description AS canteen_description,
        COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
        COUNT(r.review_id) AS total_reviews
      FROM MenuItems m
      LEFT JOIN Categories c ON m.category_id = c.category_id
      LEFT JOIN Canteens k ON m.canteen_id = k.canteen_id
      LEFT JOIN Reviews r ON m.item_id = r.item_id
      WHERE m.item_id IN (?) AND m.is_active = TRUE
      GROUP BY m.item_id
      ORDER BY m.name ASC`,
      [idList]
    );

    res.json({ status: 'success', items });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch items for comparison.', error: error.message });
  }
});

// 3.6 Find similar items in other canteens for an item
router.get('/similar/:id', async (req, res) => {
  const itemId = req.params.id;

  try {
    // 1. Fetch reference item
    const [refItems] = await db.query('SELECT * FROM MenuItems WHERE item_id = ?', [itemId]);
    if (refItems.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Reference menu item not found.' });
    }

    const ref = refItems[0];
    const firstWord = ref.name.split(' ')[0].replace(/[^a-zA-Z]/g, '');

    // 2. Find items in OTHER canteens with same category OR matching name
    const [similarItems] = await db.query(
      `SELECT 
        m.*, 
        c.name AS category_name,
        k.name AS canteen_name,
        k.description AS canteen_description,
        COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
        COUNT(r.review_id) AS total_reviews
      FROM MenuItems m
      LEFT JOIN Categories c ON m.category_id = c.category_id
      LEFT JOIN Canteens k ON m.canteen_id = k.canteen_id
      LEFT JOIN Reviews r ON m.item_id = r.item_id
      WHERE m.is_active = TRUE 
        AND m.item_id != ? 
        AND (m.category_id = ? OR m.name LIKE ?)
      GROUP BY m.item_id
      ORDER BY k.name ASC, m.price ASC`,
      [itemId, ref.category_id, `%${firstWord}%`]
    );

    res.json({ status: 'success', reference_item: ref, similar_items: similarItems });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch similar items.', error: error.message });
  }
});

// 4. Get single menu item with reviews
router.get('/:id', async (req, res) => {
  const itemId = req.params.id;
  try {
    const [items] = await db.query(
      `SELECT m.*, c.name AS category_name, k.name AS canteen_name,
              COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
              COUNT(r.review_id) AS total_reviews
       FROM MenuItems m
       LEFT JOIN Categories c ON m.category_id = c.category_id
       LEFT JOIN Canteens k ON m.canteen_id = k.canteen_id
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
