const db = require('./db');

async function seedNeptuneCanteen() {
  try {
    // 1. Ensure Neptune Canteen exists in Canteens table
    const [canteenRows] = await db.query('SELECT canteen_id FROM Canteens WHERE name LIKE ? OR name LIKE ?', ['%Neptune%', '%Nuptune%']);
    let canteenId;
    if (canteenRows.length === 0) {
      const [res] = await db.query(
        'INSERT INTO Canteens (name, description) VALUES (?, ?)',
        ['Neptune Canteen', 'Neptune campus canteen offering breakfast, snacks, and authentic Bangla lunch items.']
      );
      canteenId = res.insertId;
      console.log(`✅ Created canteen "Neptune Canteen" (ID: ${canteenId}).`);
    } else {
      canteenId = canteenRows[0].canteen_id;
      await db.query('UPDATE Canteens SET name = ?, description = ? WHERE canteen_id = ?', [
        'Neptune Canteen',
        'Neptune campus canteen offering breakfast, snacks, and authentic Bangla lunch items.',
        canteenId
      ]);
      console.log(`ℹ️ Neptune Canteen verified/updated (ID: ${canteenId}).`);
    }

    // 2. Ensure Categories exist
    const categoriesNeeded = ['Breakfast Items', 'Snacks Items', 'Bangla Lunch Items'];
    const categoryIdMap = {};

    for (const catName of categoriesNeeded) {
      const [catRows] = await db.query('SELECT category_id FROM Categories WHERE name = ?', [catName]);
      if (catRows.length === 0) {
        const [res] = await db.query('INSERT INTO Categories (name) VALUES (?)', [catName]);
        categoryIdMap[catName] = res.insertId;
        console.log(`✅ Created category "${catName}" (ID: ${res.insertId}).`);
      } else {
        categoryIdMap[catName] = catRows[0].category_id;
      }
    }

    const [allCats] = await db.query('SELECT category_id, name FROM Categories');
    allCats.forEach(c => { categoryIdMap[c.name] = c.category_id; });

    // 3. Neptune Menu Items Specs (19 Items from requested list)
    const neptuneItems = [
      // Table 1: Breakfast Items
      {
        category: 'Breakfast Items',
        name: 'Parata',
        description: 'Freshly baked flaky layered paratha bread (1 pc).',
        price: 10.00,
        photo_url: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 5
      },
      {
        category: 'Breakfast Items',
        name: 'Daal',
        description: 'Savory lentil curry cooked with aromatic spices.',
        price: 20.00,
        photo_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 5
      },
      {
        category: 'Breakfast Items',
        name: 'Mixed Vegetable',
        description: 'Healthy mixed seasonal vegetable curry.',
        price: 20.00,
        photo_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 5
      },
      {
        category: 'Breakfast Items',
        name: 'Egg Omelete/ Mummelett',
        description: 'Fluffy fried egg omelette with onions & green chillies (1 pc).',
        price: 20.00,
        photo_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 5
      },

      // Table 2: Snacks Items
      {
        category: 'Snacks Items',
        name: 'Singara',
        description: 'Crispy deep-fried Bangladeshi snack stuffed with spiced potato filling (1 pc).',
        price: 10.00,
        photo_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 5
      },
      {
        category: 'Snacks Items',
        name: 'Jilapi',
        description: 'Traditional sweet & crispy jalebi pretzel dipped in sugar syrup (1 pc).',
        price: 10.00,
        photo_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 5
      },
      {
        category: 'Snacks Items',
        name: 'Puri',
        description: 'Golden fried puffy bread snack (1 pc).',
        price: 10.00,
        photo_url: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 5
      },
      {
        category: 'Snacks Items',
        name: 'Pastry',
        description: 'Delicately sliced layered cake pastry (1 pc).',
        price: 40.00,
        photo_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 5
      },
      {
        category: 'Snacks Items',
        name: 'Chola',
        description: 'Spiced chickpea snack cooked with herbs and green chillies (120 gms).',
        price: 20.00,
        photo_url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 5
      },

      // Table 3: Bangla Lunch Items
      {
        category: 'Bangla Lunch Items',
        name: 'Chicken Khichuri',
        description: 'Traditional yellow rice and lentil bhuna khichuri served with spiced chicken (270-300 gms).',
        price: 65.00,
        photo_url: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 10
      },
      {
        category: 'Bangla Lunch Items',
        name: 'Egg Khichuri',
        description: 'Flavorful khichuri served with spiced egg (270-300 gms).',
        price: 55.00,
        photo_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 10
      },
      {
        category: 'Bangla Lunch Items',
        name: 'Plain Rice with Chicken Package',
        description: 'Steamed white rice served with chicken curry package (270-300 gms).',
        price: 60.00,
        photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 10
      },
      {
        category: 'Bangla Lunch Items',
        name: 'Plain Rice',
        description: 'Steamed fragrant white rice portion (270-300 gms).',
        price: 25.00,
        photo_url: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 5
      },
      {
        category: 'Bangla Lunch Items',
        name: 'Egg Curry',
        description: 'Hard-boiled egg simmered in rich spiced curry gravy (1 pc).',
        price: 20.00,
        photo_url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 5
      },
      {
        category: 'Bangla Lunch Items',
        name: 'Boiled Egg',
        description: 'Freshly boiled chicken egg (1 pc).',
        price: 15.00,
        photo_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 5
      },
      {
        category: 'Bangla Lunch Items',
        name: 'Plain Rice with Egg Curry',
        description: 'Steamed white rice served with hot egg curry (270-300 gms).',
        price: 45.00,
        photo_url: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 10
      },
      {
        category: 'Bangla Lunch Items',
        name: 'Chicken (boiler) Curry',
        description: 'Traditional Bangladeshi boiler chicken curry piece (1 pc).',
        price: 35.00,
        photo_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 10
      },
      {
        category: 'Bangla Lunch Items',
        name: 'Mashed Potatoes',
        description: 'Spicy Bangladeshi mashed potatoes / Aloo Bhorta (1 pc).',
        price: 10.00,
        photo_url: 'https://images.unsplash.com/photo-1634487359989-3e90c735339c?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 5
      },
      {
        category: 'Bangla Lunch Items',
        name: 'Thin Dal',
        description: 'Light comforting lentil soup (Patla Daal).',
        price: 10.00,
        photo_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=75',
        wait_time_minutes: 5
      }
    ];

    // 4. Insert or Update each item for Neptune Canteen
    for (const item of neptuneItems) {
      const catId = categoryIdMap[item.category] || null;
      const [existing] = await db.query(
        'SELECT item_id FROM MenuItems WHERE canteen_id = ? AND name = ?',
        [canteenId, item.name]
      );

      if (existing.length === 0) {
        await db.query(
          `INSERT INTO MenuItems 
           (category_id, canteen_id, name, description, price, photo_url, wait_time_minutes, is_reward_eligible, points_required, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, NULL, TRUE)`,
          [catId, canteenId, item.name, item.description, item.price, item.photo_url, item.wait_time_minutes]
        );
      } else {
        await db.query(
          `UPDATE MenuItems SET
           category_id = ?, description = ?, price = ?, photo_url = ?, wait_time_minutes = ?, is_active = TRUE
           WHERE item_id = ?`,
          [catId, item.description, item.price, item.photo_url, item.wait_time_minutes, existing[0].item_id]
        );
      }
    }

    console.log(`🎉 Successfully seeded/updated all ${neptuneItems.length} menu items for Neptune Canteen.`);
  } catch (error) {
    console.error('❌ Error seeding Neptune Canteen:', error);
  }
}

module.exports = seedNeptuneCanteen;
