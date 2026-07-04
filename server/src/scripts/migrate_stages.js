const { pool } = require('../config/database');

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS visit_stages (
        id          INT PRIMARY KEY AUTO_INCREMENT,
        company_id  INT NOT NULL,
        name        VARCHAR(100) NOT NULL,
        color       VARCHAR(20)  NOT NULL DEFAULT '#6366f1',
        stage_order INT          NOT NULL DEFAULT 0,
        is_final    TINYINT(1)   NOT NULL DEFAULT 0,
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        UNIQUE KEY uk_company_order (company_id, stage_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('visit_stages table created');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS visit_stage_logs (
        id                 INT PRIMARY KEY AUTO_INCREMENT,
        visit_id           INT          NOT NULL,
        stage_id           INT          DEFAULT NULL,
        stage_name         VARCHAR(100) NOT NULL,
        color              VARCHAR(20)  DEFAULT NULL,
        entered_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        entered_by_user_id INT          DEFAULT NULL,
        entered_by_name    VARCHAR(100) DEFAULT NULL,
        FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('visit_stage_logs table created');

    // Add stage columns to visits if they don't exist
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'visits'
         AND COLUMN_NAME IN ('current_stage_id','current_stage_name','current_stage_color')`
    );
    const existing = new Set(cols.map(c => c.COLUMN_NAME));

    if (!existing.has('current_stage_id')) {
      await conn.query(`ALTER TABLE visits ADD COLUMN current_stage_id INT DEFAULT NULL`);
      console.log('Added current_stage_id to visits');
    }
    if (!existing.has('current_stage_name')) {
      await conn.query(`ALTER TABLE visits ADD COLUMN current_stage_name VARCHAR(100) DEFAULT NULL`);
      console.log('Added current_stage_name to visits');
    }
    if (!existing.has('current_stage_color')) {
      await conn.query(`ALTER TABLE visits ADD COLUMN current_stage_color VARCHAR(20) DEFAULT NULL`);
      console.log('Added current_stage_color to visits');
    }

    console.log('Migration complete');
  } finally {
    conn.release();
    process.exit(0);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
