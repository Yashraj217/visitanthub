const { pool } = require('../config/database');

async function run() {
  const conn = await pool.getConnection();
  try {
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'visits'
         AND COLUMN_NAME IN ('is_ready','ready_at')`
    );
    const existing = new Set(cols.map(c => c.COLUMN_NAME));

    if (!existing.has('is_ready')) {
      await conn.query(`ALTER TABLE visits ADD COLUMN is_ready TINYINT(1) NOT NULL DEFAULT 0`);
      console.log('Added is_ready');
    }
    if (!existing.has('ready_at')) {
      await conn.query(`ALTER TABLE visits ADD COLUMN ready_at TIMESTAMP DEFAULT NULL`);
      console.log('Added ready_at');
    }

    await conn.query(`CREATE INDEX IF NOT EXISTS idx_visits_employee_ready ON visits (employee_id, is_ready)`);
    console.log('Migration complete');
  } finally {
    conn.release();
    process.exit(0);
  }
}
run().catch(e => { console.error(e); process.exit(1); });
