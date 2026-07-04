const https = require('https');
const { pool } = require('../config/database');
const { sendVisitNotification, sendCheckInConfirmation } = require('../services/whatsapp');
const { localDateToUtcRange } = require('../utils/tz');
const { cacheGet, cacheSet } = require('../config/redis');

const { promoteNextReady } = require('./visitController');

function sendExpoPush({ token, title, body, data }) {
  const payload = JSON.stringify({ to: token, title, body, data: data || {}, sound: 'default' });
  const req = https.request({
    hostname: 'exp.host',
    path: '/--/api/v2/push/send',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  }, res => {
    let raw = '';
    res.on('data', chunk => { raw += chunk; });
    res.on('end', () => {
      if (res.statusCode !== 200) console.error('[ExpoPush] HTTP', res.statusCode, raw);
    });
  });
  req.on('error', err => console.error('[ExpoPush] Error:', err.message));
  req.write(payload);
  req.end();
}

/**
 * Generate and atomically increment the reference number counter.
 * Resets to 1 automatically when the calendar date changes (daily reset).
 * Must be called inside an open transaction (conn).
 *
 * Serial mode  → VIS-0001, VIS-0002 …  (company-level counter)
 * Service mode → INT-0001, DEL-0003 …  (per-service counter; falls back to company prefix)
 */
async function generateRefNumber(conn, company, service) {
  const padding  = company.ref_padding || 4;
  const today    = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  if (company.ref_type === 'service' && service) {
    // Auto-reset service counter if date has changed
    const lastReset = service.ref_last_reset
      ? new Date(service.ref_last_reset).toISOString().slice(0, 10)
      : null;
    if (lastReset !== today) {
      await conn.query(
        'UPDATE services SET ref_counter = 0, ref_last_reset = ? WHERE id = ?',
        [today, service.id]
      );
    }
    await conn.query(
      'UPDATE services SET ref_counter = ref_counter + 1 WHERE id = ?',
      [service.id]
    );
    const [[row]] = await conn.query(
      'SELECT ref_prefix, ref_counter FROM services WHERE id = ?',
      [service.id]
    );
    const prefix = (row.ref_prefix || company.ref_prefix || 'REF').toUpperCase();
    return `${prefix}-${String(row.ref_counter).padStart(padding, '0')}`;
  }

  // Serial (company-level) — auto-reset daily
  const lastReset = company.ref_last_reset
    ? new Date(company.ref_last_reset).toISOString().slice(0, 10)
    : null;
  if (lastReset !== today) {
    await conn.query(
      'UPDATE companies SET ref_counter = 0, ref_last_reset = ? WHERE id = ?',
      [today, company.id]
    );
  }
  await conn.query(
    'UPDATE companies SET ref_counter = ref_counter + 1 WHERE id = ?',
    [company.id]
  );
  const [[row]] = await conn.query(
    'SELECT ref_prefix, ref_counter, ref_padding FROM companies WHERE id = ?',
    [company.id]
  );
  const prefix = (row.ref_prefix || 'VIS').toUpperCase();
  return `${prefix}-${String(row.ref_counter).padStart(row.ref_padding || padding, '0')}`;
}

// Public: get company info + employees + services (with fields) by slug
async function getCompanyBySlug(req, res) {
  try {
    const cacheKey = `office:${req.params.slug}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const [companies] = await pool.query(
      `SELECT id, name, slug, logo_url, address, city, state, timezone
       FROM companies WHERE slug = ? AND status = 'active'`,
      [req.params.slug]
    );
    if (!companies.length) {
      return res.status(404).json({ message: 'Office not found or inactive' });
    }
    const company = companies[0];

    // Services with their fields and assigned employees
    const [services] = await pool.query(
      `SELECT id, name, description, color, icon, logo_url
       FROM services WHERE company_id = ? AND is_active = 1
       ORDER BY sort_order, name`,
      [company.id]
    );
    for (const svc of services) {
      const [fields] = await pool.query(
        `SELECT id, field_label, field_name, field_type, field_options,
                placeholder, is_required, is_hidden, sort_order
         FROM service_fields
         WHERE service_id = ? ORDER BY sort_order`,
        [svc.id]
      );
      svc.fields = fields.map(f => ({
        ...f,
        field_options: f.field_options ? JSON.parse(f.field_options) : [],
      }));
      const [emps] = await pool.query(
        `SELECT e.id, e.name, e.designation
         FROM employees e
         JOIN employee_services es ON es.employee_id = e.id
         WHERE es.service_id = ? AND e.company_id = ? AND e.status = 'active'
         ORDER BY e.name`,
        [svc.id, company.id]
      );
      svc.employees = emps;
    }

    // Fallback employees list (used when company has no services configured)
    const [employees] = await pool.query(
      `SELECT e.id, e.name, e.designation
       FROM employees e
       WHERE e.company_id = ? AND e.status = 'active'
       ORDER BY e.name`,
      [company.id]
    );

    // Today's associate availability
    const tz = company.timezone || 'Asia/Kolkata';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const dayOfWeek = new Date(todayStr + 'T12:00:00').getDay(); // 0=Sun…6=Sat
    const [availRows] = await pool.query(
      `SELECT aa.employee_id, aa.start_time, aa.end_time,
              e.name AS employee_name, e.designation
       FROM associate_availability aa
       JOIN employees e ON e.id = aa.employee_id
       WHERE aa.company_id = ? AND aa.day_of_week = ? AND e.status = 'active'
       ORDER BY e.name, aa.start_time`,
      [company.id, dayOfWeek]
    );
    // Group slots by employee
    const availMap = new Map();
    availRows.forEach(r => {
      if (!availMap.has(r.employee_id)) {
        availMap.set(r.employee_id, { employee_name: r.employee_name, designation: r.designation, slots: [] });
      }
      availMap.get(r.employee_id).slots.push({ start_time: r.start_time, end_time: r.end_time });
    });
    const availability = [...availMap.values()];

    const payload = { company, employees, services, availability };
    await cacheSet(cacheKey, payload, 300); // 5-minute cache
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Public: check if mobile already registered for this company
async function checkMobile(req, res) {
  const { slug } = req.params;
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ message: 'Mobile is required' });

  try {
    const [companies] = await pool.query(
      "SELECT id FROM companies WHERE slug = ? AND status = 'active'", [slug]
    );
    if (!companies.length) return res.status(404).json({ message: 'Office not found' });

    const [visitors] = await pool.query(
      'SELECT id, name, email, address FROM visitors WHERE company_id = ? AND mobile = ?',
      [companies[0].id, mobile.trim()]
    );
    res.json(visitors.length
      ? { exists: true, visitor: visitors[0] }
      : { exists: false }
    );
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Public: register visit (upsert visitor + create visit + store field values + WhatsApp)
async function registerVisit(req, res) {
  const { slug } = req.params;
  const {
    name, mobile, email, address,
    employee_id, purpose,
    service_id, field_values, _hp,
  } = req.body;

  if (_hp) return res.status(201).json({
    message: 'Visit registered successfully',
    visit_id: 0, ref_number: 'OK',
    visit_time: new Date().toISOString(), visit_time_local: '',
    employee_name: '', service_name: '', whatsapp_sent: false, queue_ahead: 0,
  });

  if (!name || !mobile || !employee_id) {
    return res.status(400).json({ message: 'Name, mobile, and employee are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [companies] = await conn.query(
      "SELECT * FROM companies WHERE slug = ? AND status = 'active'", [slug]
    );
    if (!companies.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Office not found' });
    }
    const company = companies[0];

    // Upsert visitor
    await conn.query(
      `INSERT INTO visitors (company_id, name, mobile, email, address)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), address=VALUES(address)`,
      [company.id, name.trim(), mobile.trim(), email || null, address || null]
    );
    const [[visitor]] = await conn.query(
      'SELECT * FROM visitors WHERE company_id = ? AND mobile = ?',
      [company.id, mobile.trim()]
    );

    // Validate employee
    const [employees] = await conn.query(
      "SELECT * FROM employees WHERE id = ? AND company_id = ? AND status = 'active'",
      [employee_id, company.id]
    );
    if (!employees.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Associate not found' });
    }
    const employee = employees[0];

    // Validate employee is assigned to the selected service
    if (service_id) {
      const [assignment] = await conn.query(
        'SELECT id FROM employee_services WHERE employee_id = ? AND service_id = ?',
        [employee_id, service_id]
      );
      if (!assignment.length) {
        await conn.rollback();
        return res.status(400).json({ message: 'Associate is not assigned to the selected service' });
      }
    }

    // Resolve service (with ref_prefix + counter)
    let resolvedServiceId = null;
    let resolvedServiceName = purpose || null;
    let resolvedService = null;
    if (service_id) {
      const [svcs] = await conn.query(
        'SELECT id, name, ref_prefix, ref_counter, ref_last_reset FROM services WHERE id = ? AND company_id = ? AND is_active = 1',
        [service_id, company.id]
      );
      if (svcs.length) {
        resolvedService    = svcs[0];
        resolvedServiceId  = svcs[0].id;
        resolvedServiceName = svcs[0].name;
      }
    }

    // Generate reference number (inside transaction for atomicity)
    const refNumber = await generateRefNumber(conn, company, resolvedService);

    // Create visit
    const [visitResult] = await conn.query(
      `INSERT INTO visits
         (ref_number, company_id, visitor_id, employee_id, service_id, service_name, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [refNumber, company.id, visitor.id, employee.id,
       resolvedServiceId, resolvedServiceName, purpose || resolvedServiceName]
    );
    const visitId = visitResult.insertId;

    // Auto-assign default stage if configured
    const [[defaultStage]] = await conn.query(
      'SELECT id, name, color, employee_id FROM visit_stages WHERE company_id = ? AND is_default = 1 LIMIT 1',
      [company.id]
    );
    if (defaultStage) {
      const stgFields = ['current_stage_id = ?', 'current_stage_name = ?', 'current_stage_color = ?'];
      const stgValues = [defaultStage.id, defaultStage.name, defaultStage.color];
      if (defaultStage.employee_id) { stgFields.push('employee_id = ?'); stgValues.push(defaultStage.employee_id); }
      stgValues.push(visitId);
      await conn.query(`UPDATE visits SET ${stgFields.join(', ')} WHERE id = ?`, stgValues);
      await conn.query(
        `INSERT INTO visit_stage_logs (visit_id, stage_id, stage_name, color, entered_by_user_id, entered_by_name)
         VALUES (?, ?, ?, ?, NULL, 'Auto')`,
        [visitId, defaultStage.id, defaultStage.name, defaultStage.color]
      );
    }

    // Store custom field values (visitor-submitted) and pre-create rows for hidden fields
    if (resolvedServiceId) {
      const [allFields] = await conn.query(
        'SELECT id, field_label, is_hidden FROM service_fields WHERE service_id = ? AND company_id = ? ORDER BY sort_order',
        [resolvedServiceId, company.id]
      );
      for (const field of allFields) {
        let value = null;
        if (!field.is_hidden && field_values && field_values[field.id] != null) {
          value = String(field_values[field.id]);
        }
        // Skip visitor-submitted empty non-hidden fields (keep them out of DB unless filled)
        if (!field.is_hidden && !value && value !== '0') continue;
        // Always create a row for hidden fields (empty, to be filled by staff later)
        await conn.query(
          `INSERT INTO visit_field_values (visit_id, field_id, field_label, value)
           VALUES (?, ?, ?, ?)`,
          [visitId, field.id, field.field_label, value]
        );
      }
    } else if (field_values && typeof field_values === 'object') {
      // No service — just store whatever was submitted
      for (const [fieldIdStr, value] of Object.entries(field_values)) {
        if (!value && value !== 0) continue;
        const fieldId = parseInt(fieldIdStr);
        const [fieldRows] = await conn.query(
          'SELECT field_label FROM service_fields WHERE id = ? AND company_id = ?',
          [fieldId, company.id]
        );
        if (!fieldRows.length) continue;
        await conn.query(
          `INSERT INTO visit_field_values (visit_id, field_id, field_label, value)
           VALUES (?, ?, ?, ?)`,
          [visitId, fieldId, fieldRows[0].field_label, String(value)]
        );
      }
    }

    await conn.commit();

    // Promote next-ready for this employee (non-blocking)
    promoteNextReady(employee.id, company.id, company.timezone || 'UTC');

    // Send WhatsApp + push notification outside transaction
    const [[visit]] = await pool.query('SELECT * FROM visits WHERE id = ?', [visitId]);
    const result = await sendVisitNotification({ company, employee, visitor, visit });

    // Send Expo push notification to assigned employee + company admins (non-blocking)
    const pushTitle = `New Visitor — ${resolvedServiceName || 'Walk-in'}`;
    const pushBody  = `${visitor.name} has checked in${resolvedServiceName ? ' for ' + resolvedServiceName : ''}.`;
    const pushData  = { visitId };

    pool.query(
      `SELECT u.push_token FROM users u
       JOIN employees e ON e.id = ?
       WHERE u.employee_id = e.id AND u.push_token IS NOT NULL LIMIT 1`,
      [employee.id]
    ).then(([[empUser]]) => {
      if (empUser?.push_token) sendExpoPush({ token: empUser.push_token, title: pushTitle, body: pushBody, data: pushData });
    }).catch(() => {});

    pool.query(
      `SELECT push_token FROM users WHERE role = 'company_admin' AND company_id = ? AND push_token IS NOT NULL`,
      [company.id]
    ).then(([admins]) => {
      admins.forEach(a => sendExpoPush({ token: a.push_token, title: pushTitle, body: pushBody, data: pushData }));
    }).catch(() => {});
    await pool.query(
      'UPDATE visits SET whatsapp_sent = ?, whatsapp_error = ? WHERE id = ?',
      [result.sent ? 1 : 0, result.reason || null, visitId]
    );

    // Count visitors ahead in queue for the same employee today (pending/approved, excluding this visit)
    const tz = company.timezone || 'UTC';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const { start: todayStart, end: todayEnd } = localDateToUtcRange(todayStr, tz);
    const [[{ queue_ahead }]] = await pool.query(
      `SELECT COUNT(*) AS queue_ahead FROM visits
       WHERE employee_id = ? AND company_id = ?
         AND status IN ('pending', 'approved')
         AND id != ?
         AND visit_time >= ? AND visit_time <= ?`,
      [employee.id, company.id, visitId, todayStart, todayEnd]
    );

    const visitTz = company.timezone || 'Asia/Kolkata';
    const visit_time_local = new Date(visit.visit_time).toLocaleString('en-IN', {
      timeZone: visitTz,
      hour12: true, day: '2-digit', month: 'short',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    res.status(201).json({
      message: 'Visit registered successfully',
      visit_id:         visitId,
      ref_number:       refNumber,
      visit_time:       visit.visit_time,
      visit_time_local: visit_time_local,
      employee_name:    employee.name,
      service_name:     resolvedServiceName,
      whatsapp_sent:    result.sent,
      queue_ahead:      Number(queue_ahead),
    });

    // Send check-in confirmation to visitor (fire-and-forget)
    sendCheckInConfirmation({
      company,
      visitor,
      visit: { ...visit, ref_number: refNumber, service_name: resolvedServiceName },
      employee,
      queueAhead: Number(queue_ahead),
    }).catch(err => console.error('[WhatsApp check-in confirmation error]', err.message));
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
}

// Authenticated (admin + associate): get a single visitor's profile + full visit history
async function getVisitorHistory(req, res) {
  const { visitor_id } = req.params;
  const company_id = req.user.company_id;
  try {
    const [[visitor]] = await pool.query(
      `SELECT v.id, v.name, v.mobile, v.email, v.address, v.created_at,
              COUNT(vis.id) AS total_visits,
              MAX(vis.visit_time) AS last_visit
       FROM visitors v
       LEFT JOIN visits vis ON vis.visitor_id = v.id AND vis.company_id = v.company_id
       WHERE v.id = ? AND v.company_id = ?
       GROUP BY v.id`,
      [visitor_id, company_id]
    );
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });

    const [visits] = await pool.query(
      `SELECT v.id, v.ref_number, v.visit_time, v.status, v.service_name, v.purpose,
              emp.name AS employee_name, emp.designation,
              COUNT(p.id) AS photo_count
       FROM visits v
       JOIN employees emp ON emp.id = v.employee_id
       LEFT JOIN visit_photos p ON p.visit_id = v.id
       WHERE v.visitor_id = ? AND v.company_id = ?
       GROUP BY v.id
       ORDER BY v.visit_time DESC`,
      [visitor_id, company_id]
    );

    res.json({ visitor, visits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Company admin: list visitors
async function listVisitors(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT v.*, COUNT(vis.id) AS total_visits
       FROM visitors v
       LEFT JOIN visits vis ON vis.visitor_id = v.id
       WHERE v.company_id = ?
       GROUP BY v.id
       ORDER BY v.created_at DESC`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { getCompanyBySlug, checkMobile, registerVisit, listVisitors, getVisitorHistory };
