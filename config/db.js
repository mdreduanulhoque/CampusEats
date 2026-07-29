const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'campuseats_simple',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Enable SSL when requested or connecting to cloud database providers like Aiven
if (
  process.env.DB_SSL === 'true' || 
  process.env.DB_SSL === '1' || 
  (process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud.com'))
) {
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = mysql.createPool(dbConfig);

// Test connection on launch
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(' Successfully connected to MySQL database: ' + (process.env.DB_NAME || 'campuseats_simple'));
    connection.release();
  } catch (error) {
    console.error(' Database connection failed:', error.message);
  }
}

testConnection();

module.exports = pool;
