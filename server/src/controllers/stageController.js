const { pool } = require('../config/database');
const { broadcast } = require('../services/displayBroadcaster');
const { sendExpoPush: sendPush } = require('../services/pushNotification');

/* GET /api/stages — fetch ordered stages for the caller's company */
async function getStages(req, res) {
  try {
    const [[company]] = await pool.query(
      'SELECT stages_enabled FROM companies WHERE id = ?', [req.user.company_id]
    );
    if (!company?.stages_enabled) return res.json([]);

    const [rows] = await pool.query(
      `SELECT vs.id, vs.name, vs.color, vs.stage_order, vs.is_final, vs.is_default,
              vs.is_optional, vs.employee_id, e.name AS employee_name
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

/* GET /api/stages/enabled — current stages_enabled flag */
async function getStagesEnabled(req, res) {
  try {
    const [[company]] = await pool.query(
      'SELECT stages_enabled FROM companies WHERE id = ?', [req.user.company_id]
    );
    res.json({ enabled: !!company?.stages_enabled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

/* PUT /api/stages/enabled — toggle stage tracking on/off */
async function setStagesEnabled(req, res) {
  const { enabled } = req.body;
  try {
    await pool.query('UPDATE companies SET stages_enabled = ? WHERE id = ?',
      [enabled ? 1 : 0, req.user.company_id]);
    res.json({ enabled: !!enabled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

/* GET /api/stages/waiting-status — current waiting_status_enabled flag */
async function getWaitingStatusEnabled(req, res) {
  try {
    const [[company]] = await pool.query(
      'SELECT waiting_status_enabled FROM companies WHERE id = ?', [req.user.company_id]
    );
    res.json({ enabled: !!company?.waiting_status_enabled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

/* PUT /api/stages/waiting-status — toggle waiting status feature on/off */
async function setWaitingStatusEnabled(req, res) {
  const { enabled } = req.body;
  try {
    await pool.query('UPDATE companies SET waiting_status_enabled = ? WHERE id = ?',
      [enabled ? 1 : 0, req.user.company_id]);
    res.json({ enabled: !!enabled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

/* GET /api/stages/all — all stages regardless of stages_enabled (admin config use) */
async function getAllStages(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT vs.id, vs.name, vs.color, vs.stage_order, vs.is_final, vs.is_default,
              vs.is_optional, vs.employee_id, e.name AS employee_name
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
  const { stages } = req.body; // array of { name, color, stage_order, is_final, is_default, is_optional, employee_id }
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
        s.is_optional ? 1 : 0,
      ]);
      await conn.query(
        `INSERT INTO visit_stages (company_id, name, color, stage_order, is_final, employee_id, is_default, is_optional) VALUES ?`,
        [rows]
      );
    }

    await conn.commit();
    const [saved] = await conn.query(
      `SELECT vs.id, vs.name, vs.color, vs.stage_order, vs.is_final, vs.is_default,
              vs.is_optional, vs.employee_id, e.name AS employee_name
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
    // If stage is final, auto-complete the visit
    const updateFields = [
      'current_stage_id = ?', 'current_stage_name = ?', 'current_stage_color = ?',
      'stage_status = NULL', 'stage_waiting_since = NULL',
    ];
    const updateValues = [stage.id, stage.name, stage.color];
    if (stage.employee_id) {
      updateFields.push('employee_id = ?');
      updateValues.push(stage.employee_id);
    }
    if (stage.is_final) {
      updateFields.push('status = ?');
      updateValues.push('completed');
    } else if (employeeChanging) {
      // Reset status to pending so visitor re-enters the new associate's queue
      // Update visit_time to NOW() so visitor lands at the END of the new queue (not the front)
      updateFields.push('status = ?', 'approved_at = NULL', 'visit_time = NOW()');
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
      promoteNextReady(visit.employee_id, visit.company_id, tz);
      promoteNextReady(stage.employee_id, visit.company_id, tz);

      // Notify the new associate via push
      pool.query(
        `SELECT u.push_token FROM users u
         WHERE u.employee_id = ? AND u.push_token IS NOT NULL LIMIT 1`,
        [stage.employee_id]
      ).then(([[row]]) => {
        if (row?.push_token) {
          sendPush({
            token: row.push_token,
            title: 'Visitor Arrived at Your Stage',
            body: `A visitor has been moved to: ${stage.name}`,
            data: { visitId },
          });
        }
      }).catch(() => {});
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
      status_reset:        stage.is_final ? 'completed' : (employeeChanging ? 'pending' : undefined),
      logs,
    });
    broadcast(visit.company_id);
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

/* GET /api/stages/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD */
async function getStageAnalytics(req, res) {
  try {
    const { from, to } = req.query;
    const companyId = req.user.company_id;

    // Default to last 30 days if not specified
    const fromDate = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const toDate   = to   || new Date().toISOString().slice(0, 10);

    const [rows] = await pool.query(
      `SELECT
         stage_name, color,
         COUNT(*)                                        AS visit_count,
         ROUND(AVG(duration_minutes), 1)                AS avg_minutes,
         ROUND(MAX(duration_minutes), 1)                AS max_minutes
       FROM (
         SELECT
           l.stage_name, l.color,
           TIMESTAMPDIFF(SECOND, l.entered_at,
             COALESCE(
               (SELECT MIN(l2.entered_at) FROM visit_stage_logs l2
                WHERE l2.visit_id = l.visit_id AND l2.entered_at > l.entered_at),
               (SELECT updated_at FROM visits vv WHERE vv.id = l.visit_id AND vv.status = 'completed')
             )
           ) / 60.0 AS duration_minutes
         FROM visit_stage_logs l
         JOIN visits v ON v.id = l.visit_id
         WHERE v.company_id = ?
           AND DATE(l.entered_at) >= ? AND DATE(l.entered_at) <= ?
       ) sub
       WHERE duration_minutes IS NOT NULL AND duration_minutes >= 0 AND duration_minutes < 480
       GROUP BY stage_name, color
       ORDER BY avg_minutes DESC`,
      [companyId, fromDate, toDate]
    );

    res.json({ from: fromDate, to: toDate, stages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getDisplayBoardEnabled(req, res) {
  try {
    const [[company]] = await pool.query('SELECT display_board_enabled FROM companies WHERE id = ?', [req.user.company_id]);
    res.json({ enabled: company?.display_board_enabled !== 0 });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
}

async function setDisplayBoardEnabled(req, res) {
  const { enabled } = req.body;
  try {
    await pool.query('UPDATE companies SET display_board_enabled = ? WHERE id = ?', [enabled ? 1 : 0, req.user.company_id]);
    res.json({ enabled: !!enabled });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
}

module.exports = { getStages, getAllStages, saveStages, advanceStage, getStageLogs, setStageWaiting, getStageAnalytics, getStagesEnabled, setStagesEnabled, getWaitingStatusEnabled, setWaitingStatusEnabled, getDisplayBoardEnabled, setDisplayBoardEnabled };
