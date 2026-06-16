const { pool } = require('../config/database');
const { sendVisitNotification } = require('../services/whatsapp');
const { localDateToUtcRange } = require('../utils/tz');

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
    const [companies] = await pool.query(
      `SELECT id, name, slug, logo_url, address, city, state
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

    res.json({ company, employees, services });
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
    service_id, field_values, // field_values = { field_id: value, ... }
  } = req.body;

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

    // Send WhatsApp outside transaction
    const [[visit]] = await pool.query('SELECT * FROM visits WHERE id = ?', [visitId]);
    const result = await sendVisitNotification({ company, employee, visitor, visit });
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

    res.status(201).json({
      message: 'Visit registered successfully',
      visit_id:    visitId,
      ref_number:  refNumber,
      visit_time:  visit.visit_time,
      employee_name: employee.name,
      service_name:  resolvedServiceName,
      whatsapp_sent: result.sent,
      queue_ahead:   Number(queue_ahead),
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
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

module.exports = { getCompanyBySlug, checkMobile, registerVisit, listVisitors };
