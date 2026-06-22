const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');

const USER_TTL = 180; // 3 minutes — short enough that deactivation takes effect quickly

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const cacheKey = `user:${decoded.id}`;

    let user = await cacheGet(cacheKey);
    if (!user) {
      const [rows] = await pool.query(
        'SELECT id, company_id, employee_id, name, email, role, status FROM users WHERE id = ?',
        [decoded.id]
      );
      if (!rows.length) return res.status(401).json({ message: 'User not found or inactive' });
      user = rows[0];
      if (user.status === 'active') {
        await cacheSet(cacheKey, user, USER_TTL);
      }
    }

    if (user.status !== 'active') {
      await cacheDel(`user:${decoded.id}`);
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, cacheDel };
