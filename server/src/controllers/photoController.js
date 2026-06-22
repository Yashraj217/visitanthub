const path = require('path');
const fs   = require('fs');
const multer = require('multer');
const { pool } = require('../config/database');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/visits', String(req.user.company_id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
}).array('photos', 10);

async function uploadPhotos(req, res) {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.files?.length) return res.status(400).json({ message: 'No files uploaded' });

    const visitId   = parseInt(req.params.id);
    const companyId = req.user.company_id;

    // Verify visit belongs to this company
    const [[visit]] = await pool.query(
      'SELECT id FROM visits WHERE id = ? AND company_id = ?', [visitId, companyId]
    );
    if (!visit) {
      req.files.forEach(f => fs.unlink(f.path, () => {}));
      return res.status(404).json({ message: 'Visit not found' });
    }

    const inserted = [];
    for (const file of req.files) {
      const relPath = `/uploads/visits/${companyId}/${file.filename}`;
      const [r] = await pool.query(
        `INSERT INTO visit_photos (visit_id, company_id, filename, original_name, uploaded_by)
         VALUES (?, ?, ?, ?, ?)`,
        [visitId, companyId, relPath, file.originalname, req.user.id]
      );
      inserted.push({ id: r.insertId, filename: relPath, original_name: file.originalname });
    }
    res.status(201).json(inserted);
  });
}

async function listPhotos(req, res) {
  const visitId   = parseInt(req.params.id);
  const companyId = req.user.company_id;
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.filename, p.original_name, p.caption, p.created_at,
              u.name AS uploaded_by_name
       FROM visit_photos p
       LEFT JOIN users u ON u.id = p.uploaded_by
       WHERE p.visit_id = ? AND p.company_id = ?
       ORDER BY p.created_at ASC`,
      [visitId, companyId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function deletePhoto(req, res) {
  const companyId = req.user.company_id;
  const photoId   = parseInt(req.params.pid);
  try {
    const [[photo]] = await pool.query(
      'SELECT * FROM visit_photos WHERE id = ? AND company_id = ?', [photoId, companyId]
    );
    if (!photo) return res.status(404).json({ message: 'Photo not found' });

    // Delete file from disk
    const fullPath = path.join(__dirname, '../../', photo.filename);
    fs.unlink(fullPath, () => {});

    await pool.query('DELETE FROM visit_photos WHERE id = ?', [photoId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { uploadPhotos, listPhotos, deletePhoto };
