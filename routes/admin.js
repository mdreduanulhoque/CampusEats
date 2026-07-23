const express = require('express');
const router = express.Router();
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

module.exports = router;
