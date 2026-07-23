-- CampusEats Simple Database Schema & Initial Seed Data

CREATE DATABASE IF NOT EXISTS campuseats_simple;
USE campuseats_simple;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS Reviews;
DROP TABLE IF EXISTS OrderItems;
DROP TABLE IF EXISTS Orders;
DROP TABLE IF EXISTS MenuItems;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Users;

-- 1. Users Table
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('customer', 'kitchen', 'admin') DEFAULT 'customer',
    loyalty_points INT DEFAULT 0,
    daily_limit DECIMAL(10, 2) DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories Table
CREATE TABLE Categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Menu Items Table
CREATE TABLE MenuItems (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    photo_url VARCHAR(255),
    wait_time_minutes INT DEFAULT 15,
    is_reward_eligible BOOLEAN DEFAULT FALSE,
    points_required INT NULL DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE SET NULL
);

-- 4. Orders Table
CREATE TABLE Orders (
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
);

-- 5. Order Items Table
CREATE TABLE OrderItems (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    is_free_reward BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES MenuItems(item_id) ON DELETE CASCADE
);

-- 6. Reviews Table
CREATE TABLE Reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES MenuItems(item_id) ON DELETE CASCADE
);

-- Sample Data Insertion
-- Default password for sample users is: password123

INSERT INTO Users (name, email, password_hash, role, loyalty_points, daily_limit) VALUES
('Admin User', 'admin@campuseats.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vj.3pW2KDG', 'admin', 0, 0.00),
('Kitchen Staff', 'kitchen@campuseats.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vj.3pW2KDG', 'kitchen', 0, 0.00),
('John Customer', 'customer@campuseats.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vj.3pW2KDG', 'customer', 5, 25.00);

INSERT INTO Categories (name) VALUES
('Main Dishes'),
('Snacks & Sides'),
('Beverages'),
('Desserts');

INSERT INTO MenuItems (category_id, name, description, price, photo_url, wait_time_minutes, is_reward_eligible, points_required, is_active) VALUES
(1, 'Grilled Chicken Rice', 'Tender grilled chicken served with seasoned rice and fresh veggies.', 8.50, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80', 15, FALSE, NULL, TRUE),
(1, 'Beef Burger & Fries', 'Juicy beef patty topped with cheese, lettuce, and secret sauce.', 7.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80', 12, FALSE, NULL, TRUE),
(2, 'Crispy French Fries', 'Golden fried potato fries salted to perfection.', 3.00, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80', 8, TRUE, 3, TRUE),
(3, 'Iced Lemon Tea', 'Refreshing brewed tea with fresh lemon slices.', 2.50, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80', 5, TRUE, 2, TRUE),
(4, 'Chocolate Muffin', 'Rich chocolate chip muffin baked fresh daily.', 3.50, 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=500&q=80', 5, TRUE, 3, TRUE);