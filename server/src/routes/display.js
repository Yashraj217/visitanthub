const router = require('express').Router();
const { pool } = require('../config/database');
const { localDateToUtcRange } = require('../utils/tz');
const { autoCheckInCompany } = require('../services/autoCheckIn');
const { subscribe } = require('../services/displayBroadcaster');

// SSE endpoint — TV display board subscribes here for live push updates
router.get('/:slug/events', async (req, res) => {
  const { slug } = req.params;
  try {
    const [[company]] = await pool.query(
      `SELECT id FROM companies WHERE slug = ? AND status = 'active'`,
      [slug]
    );
    if (!company) return res.status(404).end();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write(':connected\n\n');

    const unsubscribe = subscribe(company.id, res);

    // Heartbeat every 25s keeps the connection alive through proxies/IIS
    const hb = setInterval(() => {
      try { res.write(':ping\n\n'); } catch (_) { clearInterval(hb); unsubscribe(); }
    }, 25000);

    req.on('close', () => { clearInterval(hb); unsubscribe(); });
  } catch (err) {
    console.error('[SSE error]', err.message);
    res.status(500).end();
  }
});

// Public — no auth required
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const [[company]] = await pool.query(
      `SELECT id, name, slug, logo_url, sidebar_color, timezone, stages_enabled, waiting_status_enabled, display_board_enabled
       FROM companies WHERE slug = ? AND status = 'active'`,
      [slug]
    );
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const tz       = company.timezone || 'UTC';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const { start: todayStart, end: todayEnd } = localDateToUtcRange(todayStr, tz);

    // Auto check-in any scheduled visits whose time has arrived
    await autoCheckInCompany(company.id, tz);

    // Live walk-in queue (pending + approved today)
    const [visits] = await pool.query(
      `SELECT v.id, v.ref_number, v.visit_time, v.status, v.service_name, v.purpose,
              v.employee_id, v.approved_at,
              v.current_stage_id, v.current_stage_name, v.current_stage_color,
              v.is_ready, v.stage_status, v.stage_waiting_since,
              vis.name  AS visitor_name,
              emp.name  AS employee_name,
              emp.designation,
              emp.location AS employee_location
       FROM visits v
       JOIN visitors vis ON vis.id = v.visitor_id
       JOIN employees emp ON emp.id  = v.employee_id
       WHERE v.company_id = ?
         AND v.status IN ('pending', 'approved')
         AND v.visit_time >= ? AND v.visit_time <= ?
       ORDER BY (v.status = 'approved') DESC, v.visit_time ASC
       LIMIT 50`,
      [company.id, todayStart, todayEnd]
    );

    // ── Stage ordering — only when stage tracking is enabled ───────────────
    const [stageList] = company.stages_enabled ? await pool.query(
      `SELECT id, name, color, stage_order, employee_id FROM visit_stages
       WHERE company_id = ? ORDER BY stage_order ASC`,
      [company.id]
    ) : [[]];
    // Map stageId → { order, employee_id }
    const stageInfoMap = new Map(stageList.map(s => [s.id, s]));

    // ── Per-stage average duration from visit_stage_logs ───────────────────
    // For non-final stages: time between this stage entry and the NEXT stage entry on same visit
    const [stageTransitions] = await pool.query(
      `SELECT l1.stage_id,
              ROUND(AVG(TIMESTAMPDIFF(MINUTE, l1.entered_at, l2.entered_at))) AS avg_min,
              COUNT(*) AS n
       FROM visit_stage_logs l1
       JOIN visit_stage_logs l2
         ON l2.visit_id = l1.visit_id
        AND l2.id = (
              SELECT MIN(id) FROM visit_stage_logs
              WHERE visit_id = l1.visit_id AND id > l1.id
            )
       JOIN visit_stages vs ON vs.id = l1.stage_id
       WHERE vs.company_id = ?
       GROUP BY l1.stage_id`,
      [company.id]
    );

    // For final stages: time from entry to visit completion (status='completed')
    const [finalStageDurations] = await pool.query(
      `SELECT l.stage_id,
              ROUND(AVG(TIMESTAMPDIFF(MINUTE, l.entered_at, v.updated_at))) AS avg_min,
              COUNT(*) AS n
       FROM visit_stage_logs l
       JOIN visits v ON v.id = l.visit_id AND v.status = 'completed'
       JOIN visit_stages vs ON vs.id = l.stage_id
       WHERE vs.company_id = ? AND vs.is_final = 1
         AND NOT EXISTS (
           SELECT 1 FROM visit_stage_logs x
           WHERE x.visit_id = l.visit_id AND x.id > l.id
         )
       GROUP BY l.stage_id`,
      [company.id]
    );

    // stageAvgMap: stageId → avg minutes (only populated if ≥2 data points)
    const stageAvgMap = new Map();
    [...stageTransitions, ...finalStageDurations].forEach(r => {
      if (r.n >= 2) stageAvgMap.set(r.stage_id, Math.max(1, r.avg_min));
    });

    // ── Per-employee fallback avg (for when stage data is thin) ─────────────
    // Use completed_at approach: time between approved_at and when status became completed.
    // We track this via: approved_at to updated_at on completed visits (imperfect but practical).
    const [empAvgs] = await pool.query(
      `SELECT employee_id,
              ROUND(AVG(TIMESTAMPDIFF(MINUTE, approved_at, updated_at))) AS avg_min,
              COUNT(*) AS n
       FROM visits
       WHERE company_id = ?
         AND status = 'completed'
         AND approved_at IS NOT NULL
         AND visit_time >= ? AND visit_time <= ?
       GROUP BY employee_id`,
      [company.id, todayStart, todayEnd]
    );
    const empAvgMap = new Map(empAvgs.filter(r => r.n >= 2).map(r => [r.employee_id, Math.max(1, r.avg_min)]));

    const [slots] = await pool.query(
      `SELECT employee_id, MAX(slot_duration) AS slot_duration
       FROM associate_availability WHERE company_id = ? GROUP BY employee_id`,
      [company.id]
    );
    const slotMap = new Map(slots.map(r => [r.employee_id, r.slot_duration || 15]));

    // Get avg for a specific stage (with fallbacks)
    function getStageAvg(stageId, empId) {
      if (stageId && stageAvgMap.has(stageId)) return stageAvgMap.get(stageId);
      // Fall back to employee total avg, then slot_duration, then 15 min
      return empAvgMap.get(empId) || slotMap.get(empId) || 15;
    }

    // Sum of avg durations for all stages AFTER currentStageId in the pipeline
    function getPipelineWait(currentStageId) {
      if (!currentStageId || !stageInfoMap.has(currentStageId)) return 0;
      const currentOrder = stageInfoMap.get(currentStageId).stage_order;
      return stageList
        .filter(s => s.stage_order > currentOrder)
        .reduce((sum, s) => sum + getStageAvg(s.id, s.employee_id), 0);
    }

    // ── Remaining time for currently-approved visitors per employee ─────────
    const remainingMap = new Map();
    const nowMs = Date.now();
    visits.filter(v => v.status === 'approved').forEach(v => {
      const avg = getStageAvg(v.current_stage_id, v.employee_id);
      if (v.approved_at) {
        const elapsedMin = (nowMs - new Date(v.approved_at).getTime()) / 60000;
        remainingMap.set(v.employee_id, Math.max(0, Math.round(avg - elapsedMin)));
      } else {
        remainingMap.set(v.employee_id, Math.round(avg / 2));
      }
    });

    // ── Estimated wait per pending visitor ──────────────────────────────────
    // Key: `${stageId ?? 'none'}-${empId}` to count queue depth per stage+employee
    const stagePendingIdx = new Map();
    visits.forEach(v => {
      if (v.status !== 'pending') { v.est_wait_minutes = null; return; }

      const stageId  = v.current_stage_id || null;
      const empId    = v.employee_id;
      const key      = `${stageId}-${empId}`;
      const idx      = stagePendingIdx.get(key) || 0;
      stagePendingIdx.set(key, idx + 1);

      const stageAvg   = getStageAvg(stageId, empId);
      const remaining  = remainingMap.get(empId) ?? 0;
      const queueWait  = remaining + idx * stageAvg;
      const pipeline   = getPipelineWait(stageId);

      v.est_wait_minutes = Math.max(1, Math.round(queueWait + pipeline));
    });

    // Upcoming confirmed scheduled visits (not yet checked in, future time today)
    const [upcoming] = await pool.query(
      `SELECT sv.id, sv.visitor_name, sv.scheduled_time, sv.service_name,
              sv.employee_id,
              e.name AS employee_name
       FROM scheduled_visits sv
       LEFT JOIN employees e ON e.id = sv.employee_id
       WHERE sv.company_id = ?
         AND sv.status = 'confirmed'
         AND sv.scheduled_date = ?
         AND sv.visit_id IS NULL
       ORDER BY sv.scheduled_time ASC`,
      [company.id, todayStr]
    );

    // All active services for this company
    const [services] = await pool.query(
      `SELECT name FROM services WHERE company_id = ? AND is_active = 1 ORDER BY name ASC`,
      [company.id]
    );

    res.json({ company, visits, upcoming, services: services.map(s => s.name), stages: stageList });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
