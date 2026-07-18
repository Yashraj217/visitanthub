const { pool } = require('../config/database');

async function autoCheckInCompany(companyId, timezone) {
  const tz = timezone || 'UTC';
  const todayStr   = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const nowTimeStr = new Date().toLocaleTimeString('en-CA', {
    timeZone: tz, hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  // Quick non-locking pre-check — bail early if nothing is due
  const [candidates] = await pool.query(
    `SELECT id FROM scheduled_visits
     WHERE company_id = ? AND status = 'confirmed'
       AND scheduled_date = ? AND scheduled_time <= ?
       AND visit_id IS NULL`,
    [companyId, todayStr, nowTimeStr]
  );
  if (!candidates.length) return;

  for (const { id } of candidates) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Re-fetch with row lock — prevents concurrent auto-checkins from creating duplicates
      const [[sv]] = await conn.query(
        `SELECT * FROM scheduled_visits
         WHERE id = ? AND status = 'confirmed' AND visit_id IS NULL
         FOR UPDATE`,
        [id]
      );
      if (!sv) {
        // Another concurrent call already processed this row
        await conn.commit();
        conn.release();
        continue;
      }

      let empId = sv.employee_id;
      if (!empId && sv.service_id) {
        const [[first]] = await conn.query(
          `SELECT es.employee_id FROM employee_services es
           JOIN employees e ON e.id = es.employee_id
           WHERE es.service_id = ? AND e.company_id = ? AND e.status = 'active'
           LIMIT 1`,
          [sv.service_id, companyId]
        );
        if (first) empId = first.employee_id;
      }
      if (!empId) {
        await conn.rollback();
        conn.release();
        continue;
      }

      await conn.query(
        `INSERT INTO visitors (company_id, name, mobile, email)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [companyId, sv.visitor_name, sv.visitor_mobile, sv.visitor_email || null]
      );
      const [[vis]] = await conn.query(
        'SELECT id FROM visitors WHERE company_id = ? AND mobile = ?',
        [companyId, sv.visitor_mobile]
      );

      const [ins] = await conn.query(
        `INSERT INTO visits
           (company_id, visitor_id, employee_id, service_id, service_name, ref_number, purpose, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [companyId, vis.id, empId,
         sv.service_id || null, sv.service_name || null,
         sv.booking_ref, sv.purpose || sv.service_name || null]
      );

      await conn.query(
        'UPDATE scheduled_visits SET visit_id = ?, status = ? WHERE id = ?',
        [ins.insertId, 'checked_in', sv.id]
      );

      // Auto-assign default stage if configured
      const [[defStage]] = await conn.query(
        'SELECT id, name, color, employee_id FROM visit_stages WHERE company_id = ? AND is_default = 1 LIMIT 1',
        [companyId]
      );
      if (defStage) {
        // Only set stage label — do NOT override employee_id so visit stays with intended associate
        await conn.query(
          'UPDATE visits SET current_stage_id = ?, current_stage_name = ?, current_stage_color = ? WHERE id = ?',
          [defStage.id, defStage.name, defStage.color, ins.insertId]
        );
        await conn.query(
          `INSERT INTO visit_stage_logs (visit_id, stage_id, stage_name, color, entered_by_user_id, entered_by_name)
           VALUES (?, ?, ?, ?, NULL, 'Auto')`,
          [ins.insertId, defStage.id, defStage.name, defStage.color]
        );
      }

      await conn.commit();
      console.log(`[AutoCheckIn] Created visit ${sv.booking_ref} for company ${companyId}`);
    } catch (err) {
      await conn.rollback();
      console.error('[AutoCheckIn error]', err.message);
    } finally {
      conn.release();
    }
  }
}

async function autoCheckInAll() {
  try {
    const [companies] = await pool.query(
      `SELECT id, timezone FROM companies WHERE status = 'active'`
    );
    for (const co of companies) {
      await autoCheckInCompany(co.id, co.timezone).catch(err =>
        console.error(`[AutoCheckIn] company ${co.id}:`, err.message)
      );
    }
  } catch (err) {
    console.error('[AutoCheckIn] Failed to fetch companies:', err.message);
  }
}

module.exports = { autoCheckInCompany, autoCheckInAll };
