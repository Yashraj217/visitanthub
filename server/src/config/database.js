const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'visitor_management',
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0,
  timezone: '+00:00',
});

// Force every new MySQL connection to use UTC so CURRENT_TIMESTAMP and
// all TIMESTAMP reads/writes are in UTC, matching what mysql2 expects.
pool.pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('MySQL connected successfully');
    conn.release();
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
