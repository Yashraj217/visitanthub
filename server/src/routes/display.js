const router = require('express').Router();
const { pool } = require('../config/database');
const { localDateToUtcRange } = require('../utils/tz');
const { autoCheckInCompany } = require('../services/autoCheckIn');

// Public — no auth required
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const [[company]] = await pool.query(
      `SELECT id, name, slug, logo_url, sidebar_color, timezone
       FROM companies WHERE slug = ? AND status = 'active'`,
      [slug]
    );
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const tz       = company.timezone || 'UTC';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const nowTimeStr = new Date().toLocaleTimeString('en-CA', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const { start: todayStart, end: todayEnd } = localDateToUtcRange(todayStr, tz);

    // Auto check-in any scheduled visits whose time has arrived
    await autoCheckInCompany(company.id, tz);

    // Live walk-in queue (pending + approved today) — include approved_at for wait estimation
    const [visits] = await pool.query(
      `SELECT v.id, v.ref_number, v.visit_time, v.status, v.service_name, v.purpose,
              v.employee_id, v.approved_at,
              v.current_stage_name, v.current_stage_color,
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

    // Actual average service time per associate today (from completed visits with known approved_at)
    const [todayAvg] = await pool.query(
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
    const avgMap = new Map(todayAvg.map(r => [r.employee_id, Math.max(1, r.avg_min)]));

    // Fallback: configured slot duration per employee
    const [slots] = await pool.query(
      `SELECT employee_id, MAX(slot_duration) AS slot_duration
       FROM associate_availability WHERE company_id = ? GROUP BY employee_id`,
      [company.id]
    );
    const slotMap = new Map(slots.map(r => [r.employee_id, r.slot_duration || 15]));

    // avgTime: actual today's data if ≥2 samples, otherwise slot_duration, otherwise 15 min
    function getAvgMin(empId) {
      const actual = avgMap.get(empId);
      if (actual && todayAvg.find(r => r.employee_id === empId)?.n >= 2) return actual;
      return slotMap.get(empId) || 15;
    }

    // Per-employee: remaining time for the currently-being-served visitor
    const remainingMap = new Map();
    const nowMs = Date.now();
    visits.filter(v => v.status === 'approved').forEach(v => {
      const avg = getAvgMin(v.employee_id);
      if (v.approved_at) {
        const elapsedMin = (nowMs - new Date(v.approved_at).getTime()) / 60000;
        remainingMap.set(v.employee_id, Math.max(0, Math.round(avg - elapsedMin)));
      } else {
        remainingMap.set(v.employee_id, Math.round(avg / 2)); // unknown start: assume halfway
      }
    });

    // Compute estimated wait for each pending visitor
    const pendingIdx = new Map();
    visits.forEach(v => {
      if (v.status !== 'pending') { v.est_wait_minutes = null; return; }
      const avg      = getAvgMin(v.employee_id);
      const idx      = pendingIdx.get(v.employee_id) || 0;
      const remaining = remainingMap.has(v.employee_id) ? remainingMap.get(v.employee_id) : 0;
      v.est_wait_minutes = remaining + idx * avg;
      pendingIdx.set(v.employee_id, idx + 1);
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

    // All active services for this company — so empty-queue services still appear on board
    const [services] = await pool.query(
      `SELECT name FROM services WHERE company_id = ? AND is_active = 1 ORDER BY name ASC`,
      [company.id]
    );

    res.json({ company, visits, upcoming, services: services.map(s => s.name) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
