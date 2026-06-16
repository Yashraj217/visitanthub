const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { sendUserInvitation } = require('../services/email');

// List all company_users for this company
async function list(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.status, u.created_at,
              GROUP_CONCAT(s.id ORDER BY s.name) AS service_ids,
              GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ') AS service_names
       FROM users u
       LEFT JOIN user_services us ON us.user_id = u.id
       LEFT JOIN services s ON s.id = us.service_id
       WHERE u.company_id = ? AND u.role = 'company_user'
       GROUP BY u.id
       ORDER BY u.name`,
      [req.user.company_id]
    );
    res.json(rows.map(r => ({
      ...r,
      service_ids: r.service_ids ? r.service_ids.split(',').map(Number) : [],
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Create a new company_user
async function create(req, res) {
  const { name, email, password, service_ids = [] } = req.body;
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ message: 'Email already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await conn.query(
      `INSERT INTO users (company_id, name, email, password, role, status)
       VALUES (?, ?, ?, ?, 'company_user', 'active')`,
      [req.user.company_id, name.trim(), email.toLowerCase(), hashed]
    );
    const userId = result.insertId;

    if (service_ids.length) {
      const vals = service_ids.map(sid => [userId, sid, req.user.company_id]);
      await conn.query(
        'INSERT IGNORE INTO user_services (user_id, service_id, company_id) VALUES ?',
        [vals]
      );
    }

    await conn.commit();

    // Fetch company name for the invitation email
    const [[company]] = await pool.query('SELECT name FROM companies WHERE id = ?', [req.user.company_id]);
    sendUserInvitation({
      userName:    name.trim(),
      userEmail:   email.toLowerCase(),
      companyName: company?.name || 'your company',
      password,
    }).catch(err => console.error('[EMAIL] Invitation email failed:', err.message));

    res.status(201).json({ id: userId, message: 'User created' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
}

// Update user details + services
async function update(req, res) {
  const { name, email, password, status, service_ids = [] } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verify user belongs to this company
    const [rows] = await conn.query(
      "SELECT id FROM users WHERE id = ? AND company_id = ? AND role = 'company_user'",
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      await conn.query(
        'UPDATE users SET name=?, email=?, password=?, status=? WHERE id=?',
        [name, email?.toLowerCase(), hashed, status, req.params.id]
      );
    } else {
      await conn.query(
        'UPDATE users SET name=?, email=?, status=? WHERE id=?',
        [name, email?.toLowerCase(), status, req.params.id]
      );
    }

    // Replace service assignments
    await conn.query('DELETE FROM user_services WHERE user_id = ?', [req.params.id]);
    if (service_ids.length) {
      const vals = service_ids.map(sid => [req.params.id, sid, req.user.company_id]);
      await conn.query(
        'INSERT IGNORE INTO user_services (user_id, service_id, company_id) VALUES ?',
        [vals]
      );
    }

    await conn.commit();
    res.json({ message: 'User updated' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
}

// Delete (deactivate) a company_user
async function remove(req, res) {
  try {
    const [result] = await pool.query(
      "UPDATE users SET status='inactive' WHERE id=? AND company_id=? AND role='company_user'",
      [req.params.id, req.user.company_id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Get the current company_user's assigned services with their hidden fields
async function myServices(req, res) {
  try {
    const [services] = await pool.query(
      `SELECT s.id, s.name, s.icon, s.color, s.logo_url
       FROM user_services us
       JOIN services s ON s.id = us.service_id
       WHERE us.user_id = ?
       ORDER BY s.name`,
      [req.user.id]
    );
    for (const svc of services) {
      const [fields] = await pool.query(
        `SELECT id, field_label, field_type, field_options, placeholder
         FROM service_fields
         WHERE service_id = ? AND is_hidden = 1
         ORDER BY sort_order`,
        [svc.id]
      );
      svc.hidden_fields = fields.map(f => ({
        ...f,
        field_options: f.field_options ? JSON.parse(f.field_options) : [],
      }));
    }
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { list, create, update, remove, myServices };
