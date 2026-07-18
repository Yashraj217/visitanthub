const { pool } = require('../config/database');
const { sendMail } = require('../services/email');

async function requestDemo(req, res) {
  const { name, company_name, email, phone, message } = req.body;
  if (!name || !company_name || !email || !phone) {
    return res.status(400).json({ message: 'Name, company, email, and phone are required' });
  }

  try {
    await pool.query(
      `INSERT INTO demo_requests (name, company_name, email, phone, message)
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), company_name.trim(), email.trim().toLowerCase(), phone.trim(), message?.trim() || null]
    );

    const adminEmail = process.env.ADMIN_EMAIL || 'info@visitanthub.com';
    sendMail({
      to: adminEmail,
      subject: `New Demo Request — ${company_name.trim()}`,
      html: `
        <h2>New Demo Request</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:6px 12px;font-weight:bold;color:#555">Name</td><td style="padding:6px 12px">${name.trim()}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;color:#555">Company</td><td style="padding:6px 12px">${company_name.trim()}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;color:#555">Email</td><td style="padding:6px 12px"><a href="mailto:${email.trim()}">${email.trim()}</a></td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;color:#555">Phone</td><td style="padding:6px 12px"><a href="tel:${phone.trim()}">${phone.trim()}</a></td></tr>
          ${message ? `<tr><td style="padding:6px 12px;font-weight:bold;color:#555">Message</td><td style="padding:6px 12px">${message.trim()}</td></tr>` : ''}
        </table>
      `,
    }).catch(() => {});

    res.status(201).json({ success: true, message: 'Demo request received. We will contact you shortly.' });
  } catch (err) {
    console.error('[requestDemo]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
}

async function listDemoRequests(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM demo_requests ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { requestDemo, listDemoRequests };
