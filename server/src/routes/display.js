const router = require('express').Router();
const { pool } = require('../config/database');
const { localDateToUtcRange } = require('../utils/tz');

// Public — no auth required
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const [companies] = await pool.query(
      `SELECT id, name, slug, logo_url, sidebar_color, timezone
       FROM companies WHERE slug = ? AND status = 'active'`,
      [slug]
    );
    if (!companies.length) return res.status(404).json({ message: 'Company not found' });
    const company = companies[0];

    const tz = company.timezone || 'UTC';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const { start: todayStart, end: todayEnd } = localDateToUtcRange(todayStr, tz);

    const [visits] = await pool.query(
      `SELECT v.id, v.ref_number, v.visit_time, v.status, v.service_name, v.purpose,
              vis.name AS visitor_name,
              emp.name AS employee_name, emp.designation
       FROM visits v
       JOIN visitors vis ON vis.id = v.visitor_id
       JOIN employees emp  ON emp.id  = v.employee_id
       WHERE v.company_id = ?
         AND v.status IN ('pending', 'approved')
         AND v.visit_time >= ? AND v.visit_time <= ?
       ORDER BY (v.status = 'approved') DESC, v.visit_time ASC
       LIMIT 50`,
      [company.id, todayStart, todayEnd]
    );

    res.json({ company, visits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
