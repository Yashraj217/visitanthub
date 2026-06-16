const { pool } = require('../config/database');

function cid(req) {
  return req.user.role === 'super_admin'
    ? (req.query.company_id || req.body.company_id || null)
    : req.user.company_id;
}

async function list(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM designations WHERE company_id = ? ORDER BY name',
      [cid(req)]
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
      'INSERT INTO designations (company_id, name) VALUES (?, ?)',
      [cid(req), name.trim()]
    );
    res.status(201).json({ id: result.insertId, name: name.trim() });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Designation already exists' });
    res.status(500).json({ message: 'Server error' });
  }
}

async function remove(req, res) {
  try {
    const [result] = await pool.query(
      'DELETE FROM designations WHERE id = ? AND company_id = ?',
      [req.params.id, cid(req)]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Designation not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { list, create, remove };
