const { pool } = require('../config/database');

/* GET /api/stages — fetch ordered stages for the caller's company */
async function getStages(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT vs.id, vs.name, vs.color, vs.stage_order, vs.is_final, vs.is_default,
              vs.employee_id, e.name AS employee_name
       FROM visit_stages vs
       LEFT JOIN employees e ON e.id = vs.employee_id
       WHERE vs.company_id = ? ORDER BY vs.stage_order ASC`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

/* PUT /api/stages — replace all stages for the company (admin only) */
async function saveStages(req, res) {
  const { stages } = req.body; // array of { name, color, stage_order, is_final, is_default, employee_id }
  if (!Array.isArray(stages)) return res.status(400).json({ message: 'stages must be an array' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query('DELETE FROM visit_stages WHERE company_id = ?', [req.user.company_id]);

    if (stages.length > 0) {
      const rows = stages.map((s, i) => [
        req.user.company_id,
        (s.name || '').slice(0, 100),
        s.color || '#6366f1',
        i,
        s.is_final ? 1 : 0,
        s.employee_id || null,
        s.is_default ? 1 : 0,
      ]);
      await conn.query(
        `INSERT INTO visit_stages (company_id, name, color, stage_order, is_final, employee_id, is_default) VALUES ?`,
        [rows]
      );
    }

    await conn.commit();
    const [saved] = await conn.query(
      `SELECT vs.id, vs.name, vs.color, vs.stage_order, vs.is_final, vs.is_default,
              vs.employee_id, e.name AS employee_name
       FROM visit_stages vs
       LEFT JOIN employees e ON e.id = vs.employee_id
       WHERE vs.company_id = ? ORDER BY vs.stage_order ASC`,
      [req.user.company_id]
    );
    res.json(saved);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
}

/* PUT /api/visits/:id/stage — advance or set a visit's current stage */
async function advanceStage(req, res) {
  const { stageId } = req.body;
  const visitId = parseInt(req.params.id);

  if (!stageId && stageId !== null) {
    return res.status(400).json({ message: 'stageId is required (or null to clear)' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Fetch visit with current employee and status
    const [[visit]] = await conn.query(
      'SELECT id, company_id, employee_id, status FROM visits WHERE id = ?', [visitId]
    );
    if (!visit) { await conn.rollback(); return res.status(404).json({ message: 'Visit not found' }); }
    if (visit.company_id !== req.user.company_id) {
      await conn.rollback(); return res.status(403).json({ message: 'Forbidden' });
    }

    if (stageId === null) {
      // Clear stage
      await conn.query(
        'UPDATE visits SET current_stage_id = NULL, current_stage_name = NULL, current_stage_color = NULL WHERE id = ?',
        [visitId]
      );
      await conn.commit();
      return res.json({ message: 'Stage cleared' });
    }

    // Fetch the target stage
    const [[stage]] = await conn.query(
      'SELECT id, name, color, is_final, employee_id FROM visit_stages WHERE id = ? AND company_id = ?',
      [stageId, req.user.company_id]
    );
    if (!stage) { await conn.rollback(); return res.status(404).json({ message: 'Stage not found' }); }

    const employeeChanging = stage.employee_id && stage.employee_id !== visit.employee_id;

    // Update visit's current stage; re-route to stage's employee if one is assigned; reset waiting state
    // If employee changes, reset status to pending so visit re-enters new associate's queue properly
    const updateFields = [
      'current_stage_id = ?', 'current_stage_name = ?', 'current_stage_color = ?',
      'stage_status = NULL', 'stage_waiting_since = NULL',
    ];
    const updateValues = [stage.id, stage.name, stage.color];
    if (stage.employee_id) {
      updateFields.push('employee_id = ?');
      updateValues.push(stage.employee_id);
    }
    if (employeeChanging) {
      updateFields.push('status = ?', 'approved_at = NULL');
      updateValues.push('pending');
    }
    updateValues.push(visitId);
    await conn.query(
      `UPDATE visits SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Log this stage entry
    const [userRow] = await conn.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    const enteredByName = userRow[0]?.name || null;

    await conn.query(
      `INSERT INTO visit_stage_logs (visit_id, stage_id, stage_name, color, entered_by_user_id, entered_by_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [visitId, stage.id, stage.name, stage.color, req.user.id, enteredByName]
    );

    await conn.commit();

    // Recalculate ready queue for affected employees (after commit, fire-and-forget)
    if (employeeChanging) {
      const { promoteNextReady } = require('./visitController');
      const [[company]] = await pool.query('SELECT timezone FROM companies WHERE id = ?', [visit.company_id]);
      const tz = company?.timezone || 'UTC';
      // Old employee: their queue shrank — promote their next visitor
      promoteNextReady(visit.employee_id, visit.company_id, tz);
      // New employee: they gained a pending visitor — recalculate their queue
      promoteNextReady(stage.employee_id, visit.company_id, tz);
    }

    // Return updated stage info + full log
    const [logs] = await pool.query(
      `SELECT stage_name, color, entered_at, entered_by_name
       FROM visit_stage_logs WHERE visit_id = ? ORDER BY entered_at ASC`,
      [visitId]
    );

    res.json({
      current_stage_id:    stage.id,
      current_stage_name:  stage.name,
      current_stage_color: stage.color,
      is_final:            !!stage.is_final,
      status_reset:        employeeChanging ? 'pending' : undefined,
      logs,
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
}

/* GET /api/visits/:id/stages — fetch stage log for a visit */
async function getStageLogs(req, res) {
  try {
    const visitId = parseInt(req.params.id);
    const [[visit]] = await pool.query(
      'SELECT company_id FROM visits WHERE id = ?', [visitId]
    );
    if (!visit || visit.company_id !== req.user.company_id) {
      return res.status(404).json({ message: 'Not found' });
    }

    const [logs] = await pool.query(
      `SELECT stage_name, color, entered_at, entered_by_name
       FROM visit_stage_logs WHERE visit_id = ? ORDER BY entered_at ASC`,
      [visitId]
    );
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

/* PUT /api/visits/:id/stage-waiting — set stage waiting/in-progress status */
async function setStageWaiting(req, res) {
  const { stage_status } = req.body; // 'waiting' | 'in_progress' | null
  const visitId = parseInt(req.params.id);

  const [[visit]] = await pool.query('SELECT id, company_id FROM visits WHERE id = ?', [visitId]);
  if (!visit) return res.status(404).json({ message: 'Visit not found' });
  if (visit.company_id !== req.user.company_id) return res.status(403).json({ message: 'Forbidden' });

  const isWaiting = stage_status === 'waiting';
  await pool.query(
    `UPDATE visits SET stage_status = ?, stage_waiting_since = ? WHERE id = ?`,
    [stage_status || null, isWaiting ? new Date() : null, visitId]
  );
  res.json({ stage_status: stage_status || null, stage_waiting_since: isWaiting ? new Date() : null });
}

module.exports = { getStages, saveStages, advanceStage, getStageLogs, setStageWaiting };
