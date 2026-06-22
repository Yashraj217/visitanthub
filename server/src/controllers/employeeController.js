const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { cacheDel } = require('../config/redis');
const { sendUserInvitation } = require('../services/email');

async function invalidateCompanyCache(companyId) {
  try {
    const [[co]] = await pool.query('SELECT slug FROM companies WHERE id = ?', [companyId]);
    if (co?.slug) await cacheDel(`office:${co.slug}`, `booking:${co.slug}`);
  } catch {}
}

// Super admin passes company_id as query/body param; company_admin uses their own
function cid(req) {
  return req.user.role === 'super_admin'
    ? (req.query.company_id || req.body.company_id || null)
    : req.user.company_id;
}

async function list(req, res) {
  const { department_id, status } = req.query;
  let sql = `SELECT e.*, d.name AS department_name,
               GROUP_CONCAT(DISTINCT es.service_id ORDER BY es.service_id) AS service_ids,
               GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS service_names,
               ANY_VALUE(u.id) AS user_id, ANY_VALUE(u.email) AS login_email, ANY_VALUE(u.status) AS login_status
             FROM employees e
             LEFT JOIN departments d ON d.id = e.department_id
             LEFT JOIN employee_services es ON es.employee_id = e.id
             LEFT JOIN services s ON s.id = es.service_id
             LEFT JOIN users u ON u.employee_id = e.id AND u.role = 'company_user'
             WHERE e.company_id = ?`;
  const params = [cid(req)];
  if (department_id) { sql += ' AND e.department_id = ?'; params.push(department_id); }
  if (status)         { sql += ' AND e.status = ?';        params.push(status); }
  sql += ' GROUP BY e.id ORDER BY e.name';
  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(r => ({
      ...r,
      service_ids: r.service_ids ? r.service_ids.split(',').map(Number) : [],
    })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function getOne(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, d.name AS department_name
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.id = ? AND e.company_id = ?`,
      [req.params.id, cid(req)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Associate not found' });
    const emp = rows[0];
    const [svcRows] = await pool.query(
      'SELECT service_id FROM employee_services WHERE employee_id = ?',
      [emp.id]
    );
    emp.service_ids = svcRows.map(r => r.service_id);
    res.json(emp);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function create(req, res) {
  const { name, phone, email, designation, location, department_id, service_ids = [] } = req.body;
  if (!name?.trim() || !phone?.trim()) {
    return res.status(400).json({ message: 'Name and phone are required' });
  }
  const companyId = cid(req);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO employees (company_id, department_id, name, phone, email, designation, location)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [companyId, department_id || null, name.trim(), phone.trim(), email || null, designation || null, location || null]
    );
    const empId = result.insertId;
    if (service_ids.length) {
      const vals = service_ids.map(sid => [empId, sid, companyId]);
      await conn.query(
        'INSERT IGNORE INTO employee_services (employee_id, service_id, company_id) VALUES ?',
        [vals]
      );
    }
    await conn.commit();
    await invalidateCompanyCache(companyId);
    res.status(201).json({ id: empId, message: 'Employee created' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
}

async function update(req, res) {
  const { name, phone, email, designation, location, department_id, status, service_ids = [] } = req.body;
  const companyId = cid(req);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `UPDATE employees
       SET name=?, phone=?, email=?, designation=?, location=?, department_id=?, status=?
       WHERE id = ? AND company_id = ?`,
      [name, phone, email || null, designation || null, location || null, department_id || null, status,
       req.params.id, companyId]
    );
    if (!result.affectedRows) {
      await conn.rollback();
      return res.status(404).json({ message: 'Associate not found' });
    }
    await conn.query('DELETE FROM employee_services WHERE employee_id = ?', [req.params.id]);
    if (service_ids.length) {
      const vals = service_ids.map(sid => [req.params.id, sid, companyId]);
      await conn.query(
        'INSERT IGNORE INTO employee_services (employee_id, service_id, company_id) VALUES ?',
        [vals]
      );
    }
    await conn.commit();
    await invalidateCompanyCache(companyId);
    res.json({ message: 'Updated' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
}

async function remove(req, res) {
  try {
    const [result] = await pool.query(
      'UPDATE employees SET status = ? WHERE id = ? AND company_id = ?',
      ['inactive', req.params.id, cid(req)]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Associate not found' });
    await invalidateCompanyCache(cid(req));
    res.json({ message: 'Employee deactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function setCredentials(req, res) {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  const companyId = cid(req);
  const emailLower = email.toLowerCase().trim();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[emp]] = await conn.query(
      'SELECT id, name FROM employees WHERE id = ? AND company_id = ?',
      [req.params.id, companyId]
    );
    if (!emp) {
      await conn.rollback();
      return res.status(404).json({ message: 'Associate not found' });
    }

    const [[existing]] = await conn.query(
      "SELECT id FROM users WHERE employee_id = ?", [emp.id]
    );

    const hashed = await bcrypt.hash(password, 10);

    if (existing) {
      await conn.query(
        'UPDATE users SET email=?, password=?, status=? WHERE id=?',
        [emailLower, hashed, 'active', existing.id]
      );
    } else {
      const [emailCheck] = await conn.query(
        'SELECT id FROM users WHERE email = ?', [emailLower]
      );
      if (emailCheck.length) {
        await conn.rollback();
        return res.status(409).json({ message: 'Email already in use by another account' });
      }
      await conn.query(
        `INSERT INTO users (company_id, employee_id, name, email, password, role, status)
         VALUES (?, ?, ?, ?, ?, 'company_user', 'active')`,
        [companyId, emp.id, emp.name, emailLower, hashed]
      );
    }

    await conn.commit();

    // Send invitation email only when creating new credentials (non-blocking)
    if (!existing) {
      const [[company]] = await pool.query('SELECT name FROM companies WHERE id = ?', [companyId]);
      sendUserInvitation({
        userName:    emp.name,
        userEmail:   emailLower,
        companyName: company?.name || 'your company',
        password,
      }).catch(err => console.error('[EMAIL] Invitation email failed:', err.message));
    }

    res.json({ message: existing ? 'Credentials updated' : 'Login access granted' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
}

async function removeCredentials(req, res) {
  try {
    const [result] = await pool.query(
      "UPDATE users SET status='inactive' WHERE employee_id = ? AND company_id = ? AND role = 'company_user'",
      [req.params.id, cid(req)]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'No login found for this associate' });
    res.json({ message: 'Login access removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { list, getOne, create, update, remove, setCredentials, removeCredentials };
