const { pool } = require('../config/database');
const { cacheDel } = require('../config/redis');

async function invalidateCompanyCache(companyId) {
  try {
    const [[co]] = await pool.query('SELECT slug FROM companies WHERE id = ?', [companyId]);
    if (co?.slug) await cacheDel(`office:${co.slug}`, `booking:${co.slug}`);
  } catch {}
}

// ── Services CRUD ──────────────────────────────────────────────────────────

async function listServices(req, res) {
  const company_id = req.user.role === 'super_admin'
    ? (req.query.company_id || null)
    : req.user.company_id;
  try {
    const [services] = await pool.query(
      `SELECT s.*, COUNT(sf.id) AS field_count
       FROM services s
       LEFT JOIN service_fields sf ON sf.service_id = s.id
       WHERE s.company_id = ?
       GROUP BY s.id
       ORDER BY s.sort_order, s.name`,
      [company_id]
    );
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function createService(req, res) {
  const { name, description, color, icon } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
  try {
    const [r] = await pool.query(
      `INSERT INTO services (company_id, name, description, color, icon)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.company_id, name.trim(), description || null,
       color || '#6366f1', icon || '🏢']
    );
    await invalidateCompanyCache(req.user.company_id);
    res.status(201).json({ id: r.insertId, message: 'Service created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateService(req, res) {
  const { name, description, color, icon, sort_order } = req.body;
  const is_active = req.body.is_active !== undefined ? req.body.is_active : null;
  try {
    const [r] = await pool.query(
      `UPDATE services SET name=?, description=?, color=?, icon=?,
        is_active=COALESCE(?, is_active), sort_order=COALESCE(?, sort_order)
       WHERE id = ? AND company_id = ?`,
      [name, description, color, icon, is_active, sort_order ?? null,
       req.params.id, req.user.company_id]
    );
    if (!r.affectedRows) return res.status(404).json({ message: 'Service not found' });
    await invalidateCompanyCache(req.user.company_id);
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function deleteService(req, res) {
  try {
    const [r] = await pool.query(
      'DELETE FROM services WHERE id = ? AND company_id = ?',
      [req.params.id, req.user.company_id]
    );
    if (!r.affectedRows) return res.status(404).json({ message: 'Service not found' });
    await invalidateCompanyCache(req.user.company_id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// ── Service Fields CRUD ────────────────────────────────────────────────────

async function listFields(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM service_fields
       WHERE service_id = ? AND company_id = ?
       ORDER BY sort_order, id`,
      [req.params.serviceId, req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function saveFields(req, res) {
  // Accepts the full ordered field list and replaces existing fields
  const { fields } = req.body; // array of field objects
  const { serviceId } = req.params;

  if (!Array.isArray(fields)) {
    return res.status(400).json({ message: 'fields must be an array' });
  }

  // Verify service belongs to company
  const [svc] = await pool.query(
    'SELECT id FROM services WHERE id = ? AND company_id = ?',
    [serviceId, req.user.company_id]
  );
  if (!svc.length) return res.status(404).json({ message: 'Service not found' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'DELETE FROM service_fields WHERE service_id = ? AND company_id = ?',
      [serviceId, req.user.company_id]
    );
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f.field_label?.trim()) continue;
      const slug = (f.field_name || f.field_label)
        .toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      await conn.query(
        `INSERT INTO service_fields
           (service_id, company_id, field_label, field_name, field_type,
            field_options, placeholder, is_required, is_hidden, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [serviceId, req.user.company_id, f.field_label.trim(), slug,
         f.field_type || 'text',
         f.field_options ? JSON.stringify(f.field_options) : null,
         f.placeholder || null, f.is_required ? 1 : 0, f.is_hidden ? 1 : 0, i]
      );
    }
    await conn.commit();
    await invalidateCompanyCache(req.user.company_id);
    res.json({ message: 'Fields saved' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
}

async function listHiddenFields(req, res) {
  try {
    const [fields] = await pool.query(
      `SELECT sf.id, sf.field_label, sf.field_type, sf.field_options,
              s.id AS service_id, s.name AS service_name
       FROM service_fields sf
       JOIN services s ON s.id = sf.service_id
       WHERE sf.company_id = ? AND sf.is_hidden = 1
       ORDER BY s.name, sf.sort_order`,
      [req.user.company_id]
    );
    res.json(fields.map(f => ({
      ...f,
      field_options: f.field_options ? JSON.parse(f.field_options) : [],
    })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Returns services assigned to the currently logged-in associate (company_user)
async function listMyServices(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.icon, s.color
       FROM services s
       JOIN employee_services es ON es.service_id = s.id
       WHERE es.employee_id = ? AND s.company_id = ?
       ORDER BY s.name`,
      [req.user.employee_id, req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  listServices, createService, updateService, deleteService,
  listFields, saveFields, listHiddenFields, listMyServices,
};
