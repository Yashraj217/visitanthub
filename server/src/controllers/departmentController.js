const { pool } = require('../config/database');

async function list(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, COUNT(e.id) AS employee_count
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'active'
       WHERE d.company_id = ?
       GROUP BY d.id
       ORDER BY d.name`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function create(req, res) {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO departments (company_id, name) VALUES (?, ?)',
      [req.user.company_id, name.trim()]
    );
    res.status(201).json({ id: result.insertId, name: name.trim() });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function update(req, res) {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
  try {
    const [result] = await pool.query(
      'UPDATE departments SET name = ? WHERE id = ? AND company_id = ?',
      [name.trim(), req.params.id, req.user.company_id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function remove(req, res) {
  try {
    const [result] = await pool.query(
      'DELETE FROM departments WHERE id = ? AND company_id = ?',
      [req.params.id, req.user.company_id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { list, create, update, remove };
