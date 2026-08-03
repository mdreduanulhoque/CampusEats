const db = require('./db');

async function runMigration(exitOnComplete = false) {
  console.log('🔄 Starting CampusEats Database Migration...');

  try {
    // 0. Ensure Core Base Tables Exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS Users (
          user_id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role ENUM('customer', 'kitchen', 'admin') DEFAULT 'customer',
          loyalty_points INT DEFAULT 0,
          daily_limit DECIMAL(10, 2) DEFAULT 0.00,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS Categories (
          category_id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS MenuItems (
          item_id INT AUTO_INCREMENT PRIMARY KEY,
          category_id INT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          photo_url VARCHAR(500),
          wait_time_minutes INT DEFAULT 15,
          is_reward_eligible BOOLEAN DEFAULT FALSE,
          points_required INT NULL DEFAULT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS Orders (
          order_id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          total_amount DECIMAL(10, 2) NOT NULL,
          status ENUM('pending', 'accepted', 'preparing', 'ready', 'picked_up', 'rejected') DEFAULT 'pending',
          payment_method ENUM('cash_on_pickup') DEFAULT 'cash_on_pickup',
          payment_status ENUM('unpaid', 'paid') DEFAULT 'unpaid',
          pickup_time DATETIME NOT NULL,
          earned_points INT DEFAULT 0,
          order_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME NULL,
          FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS OrderItems (
          order_item_id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          item_id INT NOT NULL,
          quantity INT NOT NULL DEFAULT 1,
          unit_price DECIMAL(10, 2) NOT NULL,
          subtotal DECIMAL(10, 2) NOT NULL,
          is_free_reward BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES MenuItems(item_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS Reviews (
          review_id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          item_id INT NOT NULL,
          rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES MenuItems(item_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('✅ Core base tables verified/created.');

    // 1. Create Canteens Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS Canteens (
          canteen_id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          owner_user_id INT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_user_id) REFERENCES Users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Table "Canteens" verified/created.');

    // 2. Seed Default Canteens (Only if table is empty, preserving user modifications across app restarts)
    const [canteenCount] = await db.query('SELECT COUNT(*) AS total FROM Canteens');
    if (canteenCount[0].total === 0) {
      await db.query(`
        INSERT INTO Canteens (canteen_id, name, description) VALUES 
        (1, 'Central Campus Canteen', 'Main campus dining hall serving fresh daily meals.'),
        (2, 'North Wing Bistro', 'Specialty grill, beverages, and quick bites.')
      `);
      console.log('✅ Default canteens seeded.');
    } else {
      console.log('ℹ️ Canteens table already populated; skipping seed to preserve custom names.');
    }

    // Helper to check if column exists
    const columnExists = async (table, column) => {
      const [rows] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
      );
      return rows.length > 0;
    };

    // 3. Add canteen_id to Users
    if (!(await columnExists('Users', 'canteen_id'))) {
      await db.query(`ALTER TABLE Users ADD COLUMN canteen_id INT NULL`);
      await db.query(`ALTER TABLE Users ADD CONSTRAINT fk_users_canteen FOREIGN KEY (canteen_id) REFERENCES Canteens(canteen_id) ON DELETE SET NULL`);
      console.log('✅ Added canteen_id to "Users" table.');
    } else {
      console.log('ℹ️ "Users.canteen_id" column already exists.');
    }

    // 4. Add canteen_id to MenuItems
    if (!(await columnExists('MenuItems', 'canteen_id'))) {
      await db.query(`ALTER TABLE MenuItems ADD COLUMN canteen_id INT NULL DEFAULT 1`);
      await db.query(`ALTER TABLE MenuItems ADD CONSTRAINT fk_menu_canteen FOREIGN KEY (canteen_id) REFERENCES Canteens(canteen_id) ON DELETE SET NULL`);
      console.log('✅ Added canteen_id to "MenuItems" table.');
    } else {
      console.log('ℹ️ "MenuItems.canteen_id" column already exists.');
    }

    // 5. Add canteen_id to Orders
    if (!(await columnExists('Orders', 'canteen_id'))) {
      await db.query(`ALTER TABLE Orders ADD COLUMN canteen_id INT NULL DEFAULT 1`);
      await db.query(`ALTER TABLE Orders ADD CONSTRAINT fk_orders_canteen FOREIGN KEY (canteen_id) REFERENCES Canteens(canteen_id) ON DELETE SET NULL`);
      console.log('✅ Added canteen_id to "Orders" table.');
    } else {
      console.log('ℹ️ "Orders.canteen_id" column already exists.');
    }

    // 6. Modify photo_url length in MenuItems
    await db.query(`ALTER TABLE MenuItems MODIFY photo_url VARCHAR(500)`);
    console.log('✅ Modified "MenuItems.photo_url" length to VARCHAR(500).');

    // 7. Backfill existing data
    await db.query(`UPDATE Users SET canteen_id = 1 WHERE role = 'kitchen' AND canteen_id IS NULL`);
    await db.query(`UPDATE MenuItems SET canteen_id = 1 WHERE canteen_id IS NULL`);
    await db.query(`UPDATE Orders SET canteen_id = 1 WHERE canteen_id IS NULL`);
    console.log('✅ Existing kitchen users, menu items, and orders backfilled to Canteen #1.');

    // 8. Seed default users, categories, menu items, and reviews
    const seedDefaultUsers = require('./seed');
    await seedDefaultUsers();
    console.log('⭐ Default seed data & menu catalog populated successfully.');

    console.log('🎉 Migration completed successfully!');
    if (exitOnComplete) {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (exitOnComplete) {
      process.exit(1);
    }
  }
}

if (require.main === module) {
  runMigration(true);
}

module.exports = runMigration;
