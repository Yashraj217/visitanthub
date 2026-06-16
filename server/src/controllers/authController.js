const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const slugify = require('slugify');
const { pool } = require('../config/database');
const { sendWelcomeEmail, sendPasswordResetOTP } = require('../services/email');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, company_id: user.company_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT u.*, c.name AS company_name, c.slug AS company_slug, c.status AS company_status,
              c.logo_url AS company_logo_url, c.sidebar_color AS company_sidebar_color,
              c.timezone AS company_timezone
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.email = ?`,
      [email.toLowerCase().trim()]
    );
    if (!rows.length) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const user = rows[0];
    if (user.status !== 'active') {
      return res.status(401).json({ message: 'Your account is inactive' });
    }
    if ((user.role === 'company_admin' || user.role === 'company_user') && user.company_status !== 'active') {
      return res.status(401).json({ message: 'Your company account is pending approval or inactive' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = signToken(user);
    res.json({
      token,
      user: {
        id:           user.id,
        name:         user.name,
        email:        user.email,
        role:         user.role,
        company_id:   user.company_id,
        company_name: user.company_name,
        company_slug: user.company_slug,
        company_logo:          user.company_logo_url    || null,
        company_sidebar_color: user.company_sidebar_color || '#111827',
        company_timezone:      user.company_timezone || 'UTC',
        employee_id:           user.employee_id || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function register(req, res) {
  const { company_name, company_email, company_phone, company_address,
          admin_name, admin_email, admin_password } = req.body;

  if (!company_name || !company_email || !admin_name || !admin_email || !admin_password) {
    return res.status(400).json({ message: 'All required fields must be filled' });
  }
  if (admin_password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const slug = slugify(company_name, { lower: true, strict: true }) +
      '-' + Date.now().toString(36);

    const [existing] = await conn.query(
      'SELECT id FROM companies WHERE email = ?',
      [company_email.toLowerCase()]
    );
    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ message: 'A company with this email already exists' });
    }

    const [existingUser] = await conn.query(
      'SELECT id FROM users WHERE email = ?',
      [admin_email.toLowerCase()]
    );
    if (existingUser.length) {
      await conn.rollback();
      return res.status(409).json({ message: 'An account with this admin email already exists' });
    }

    const [companyResult] = await conn.query(
      `INSERT INTO companies (name, slug, email, phone, address, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [company_name.trim(), slug, company_email.toLowerCase(), company_phone, company_address]
    );

    const hashed = await bcrypt.hash(admin_password, 10);
    await conn.query(
      `INSERT INTO users (company_id, name, email, password, role, status)
       VALUES (?, ?, ?, ?, 'company_admin', 'active')`,
      [companyResult.insertId, admin_name.trim(), admin_email.toLowerCase(), hashed]
    );

    await conn.commit();

    // Send welcome email (non-blocking)
    sendWelcomeEmail({
      companyName: company_name.trim(),
      adminName:   admin_name.trim(),
      adminEmail:  admin_email.toLowerCase(),
    }).catch(err => console.error('[EMAIL] Welcome email failed:', err.message));

    res.status(201).json({
      message: 'Registration successful. Your account is pending approval by the administrator.',
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  } finally {
    conn.release();
  }
}

async function getMe(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.company_id, u.employee_id,
              c.name AS company_name, c.slug AS company_slug, c.logo_url AS company_logo,
              c.sidebar_color AS company_sidebar_color, c.timezone AS company_timezone
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }
  try {
    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    const match = await bcrypt.compare(current_password, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Step 1: send 5-digit OTP to email
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  // Always return 200 to prevent email enumeration
  const SAFE_RESPONSE = { message: 'If that email is registered, a reset code has been sent.' };

  try {
    const [rows] = await pool.query(
      "SELECT id, name, status FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );
    if (!rows.length || rows[0].status !== 'active') {
      return res.json(SAFE_RESPONSE);
    }
    const user = rows[0];

    // Generate 5-digit OTP
    const otp = String(Math.floor(10000 + Math.random() * 90000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id]);
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, otp, expiresAt]
    );

    // Send OTP email (non-blocking)
    sendPasswordResetOTP({
      userName:  user.name,
      userEmail: email.toLowerCase().trim(),
      otp,
    }).catch(err => console.error('[EMAIL] OTP email failed:', err.message));

    res.json(SAFE_RESPONSE);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Step 2: verify OTP + set new password
async function resetPassword(req, res) {
  const { email, otp, new_password } = req.body;
  if (!email || !otp || !new_password) {
    return res.status(400).json({ message: 'Email, code, and new password are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT t.id, t.user_id, t.expires_at, t.used
       FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE u.email = ? AND t.token = ?`,
      [email.toLowerCase().trim(), otp.trim()]
    );
    if (!rows.length) {
      return res.status(400).json({ message: 'Invalid code. Please check the code and try again.' });
    }
    const rec = rows[0];
    if (rec.used) {
      return res.status(400).json({ message: 'This code has already been used.' });
    }
    if (new Date(rec.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Code has expired. Please request a new one.' });
    }
    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, rec.user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [rec.id]);
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function impersonate(req, res) {
  const { type, company_id, employee_id } = req.body;
  try {
    let targetUser;
    if (type === 'company') {
      const [rows] = await pool.query(
        `SELECT u.*, c.name AS company_name, c.slug AS company_slug,
                c.sidebar_color AS company_sidebar_color, c.timezone AS company_timezone
         FROM users u
         JOIN companies c ON c.id = u.company_id
         WHERE u.company_id = ? AND u.role = 'company_admin' AND u.status = 'active'
         LIMIT 1`,
        [company_id]
      );
      if (!rows.length) return res.status(404).json({ message: 'No active admin found for this company' });
      targetUser = rows[0];
    } else if (type === 'employee') {
      const [rows] = await pool.query(
        `SELECT u.*, c.name AS company_name, c.slug AS company_slug,
                c.sidebar_color AS company_sidebar_color, c.timezone AS company_timezone
         FROM users u
         JOIN companies c ON c.id = u.company_id
         WHERE u.employee_id = ? AND u.role = 'company_user' AND u.status = 'active'
         LIMIT 1`,
        [employee_id]
      );
      if (!rows.length) return res.status(404).json({ message: 'No active login found for this associate' });
      targetUser = rows[0];
    } else {
      return res.status(400).json({ message: 'type must be "company" or "employee"' });
    }

    const token = signToken(targetUser);
    res.json({
      token,
      user: {
        id:                    targetUser.id,
        name:                  targetUser.name,
        email:                 targetUser.email,
        role:                  targetUser.role,
        company_id:            targetUser.company_id,
        company_name:          targetUser.company_name,
        company_slug:          targetUser.company_slug,
        company_sidebar_color: targetUser.company_sidebar_color || '#111827',
        company_timezone:      targetUser.company_timezone || 'UTC',
        employee_id:           targetUser.employee_id || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { login, register, getMe, changePassword, forgotPassword, resetPassword, impersonate };
