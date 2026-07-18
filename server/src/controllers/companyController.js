const { pool } = require('../config/database');
const { cacheDel } = require('../config/redis');
const fs = require('fs');
const path = require('path');

async function invalidateCompanyCache(companyId) {
  try {
    const [[co]] = await pool.query('SELECT slug FROM companies WHERE id = ?', [companyId]);
    if (co?.slug) await cacheDel(`office:${co.slug}`, `booking:${co.slug}`);
  } catch {}
}
const { localDateToUtcRange } = require('../utils/tz');

// Super admin: list all companies
async function listCompanies(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, COUNT(DISTINCT e.id) AS employee_count, COUNT(DISTINCT v.id) AS visit_count
       FROM companies c
       LEFT JOIN employees e ON e.company_id = c.id AND e.status = 'active'
       LEFT JOIN visits v ON v.company_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Super admin: get single company
async function getCompany(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM companies WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Company not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Super admin: update company status
async function updateStatus(req, res) {
  const { status } = req.body;
  if (!['active', 'inactive', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  try {
    await pool.query('UPDATE companies SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Super admin: delete company
async function deleteCompany(req, res) {
  try {
    await pool.query('DELETE FROM companies WHERE id = ?', [req.params.id]);
    res.json({ message: 'Company deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Company admin: get own profile
async function getProfile(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM companies WHERE id = ?',
      [req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Company not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Company admin: update own profile
async function updateProfile(req, res) {
  const { name, phone, address, city, state, country, sidebar_color, timezone } = req.body;
  try {
    await pool.query(
      `UPDATE companies SET name=?, phone=?, address=?, city=?, state=?, country=?, sidebar_color=?, timezone=?
       WHERE id = ?`,
      [name, phone, address, city, state, country,
       /^#[0-9a-fA-F]{3,8}$/.test(sidebar_color) ? sidebar_color : '#111827',
       timezone || 'UTC',
       req.user.company_id]
    );
    await invalidateCompanyCache(req.user.company_id);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Company admin: update WhatsApp settings
async function updateSettings(req, res) {
  const {
    whatsapp_provider, whatsapp_api_key, whatsapp_from,
    notif_associate_arrival, notif_visitor_checkin,
    notif_visit_approved, notif_booking_confirmed,
  } = req.body;
  const bool = v => (v === false || v === 0 || v === '0') ? 0 : 1;
  try {
    // For own-account meta: update key/from only when explicitly provided
    const isOwnMeta = whatsapp_provider === 'meta';
    let sql = `UPDATE companies SET
         whatsapp_provider=?,
         notif_associate_arrival=?, notif_visitor_checkin=?,
         notif_visit_approved=?, notif_booking_confirmed=?`;
    const params = [whatsapp_provider,
      bool(notif_associate_arrival), bool(notif_visitor_checkin),
      bool(notif_visit_approved), bool(notif_booking_confirmed)];

    if (isOwnMeta && whatsapp_api_key !== undefined) {
      sql += ', whatsapp_api_key=?';
      params.push(whatsapp_api_key || null);
    }
    if (isOwnMeta && whatsapp_from !== undefined) {
      sql += ', whatsapp_from=?';
      params.push(whatsapp_from || null);
    }

    sql += ' WHERE id = ?';
    params.push(req.user.company_id);
    await pool.query(sql, params);
    res.json({ message: 'Settings updated' });
  } catch (err) {
    console.error('[updateSettings]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
}

// Company admin: update reference number settings
async function updateRefSettings(req, res) {
  const { ref_type, ref_prefix, ref_padding } = req.body;
  if (!['serial', 'service'].includes(ref_type)) {
    return res.status(400).json({ message: 'Invalid ref_type' });
  }
  const padding = Math.min(Math.max(parseInt(ref_padding) || 4, 1), 8);
  try {
    await pool.query(
      'UPDATE companies SET ref_type=?, ref_prefix=?, ref_padding=? WHERE id=?',
      [ref_type, (ref_prefix || 'VIS').toUpperCase().replace(/[^A-Z0-9]/g,''), padding, req.user.company_id]
    );
    res.json({ message: 'Reference settings updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Company admin: reset serial counter (company or per-service)
async function resetRefCounter(req, res) {
  const { target, service_id } = req.body; // target: 'company' | 'service'
  try {
    if (target === 'service' && service_id) {
      await pool.query(
        'UPDATE services SET ref_counter = 0 WHERE id = ? AND company_id = ?',
        [service_id, req.user.company_id]
      );
    } else {
      await pool.query(
        'UPDATE companies SET ref_counter = 0 WHERE id = ?',
        [req.user.company_id]
      );
    }
    res.json({ message: 'Counter reset to 0' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Company admin: upload company logo
async function uploadCompanyLogo(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const logoUrl = `/uploads/logos/${req.file.filename}`;
  try {
    // Delete old logo file if it exists
    const [[old]] = await pool.query('SELECT logo_url FROM companies WHERE id = ?', [req.user.company_id]);
    if (old?.logo_url) {
      const oldPath = path.join(__dirname, '../../', old.logo_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await pool.query('UPDATE companies SET logo_url = ? WHERE id = ?', [logoUrl, req.user.company_id]);
    await invalidateCompanyCache(req.user.company_id);
    res.json({ logo_url: logoUrl, message: 'Logo uploaded' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Company admin: upload service logo
async function uploadServiceLogo(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const logoUrl = `/uploads/logos/${req.file.filename}`;
  try {
    const [[old]] = await pool.query(
      'SELECT logo_url FROM services WHERE id = ? AND company_id = ?',
      [req.params.serviceId, req.user.company_id]
    );
    if (old?.logo_url) {
      const oldPath = path.join(__dirname, '../../', old.logo_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await pool.query(
      'UPDATE services SET logo_url = ? WHERE id = ? AND company_id = ?',
      [logoUrl, req.params.serviceId, req.user.company_id]
    );
    res.json({ logo_url: logoUrl, message: 'Logo uploaded' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Company admin: update service ref prefix (used in service-wise mode)
async function updateServiceRefPrefix(req, res) {
  const { ref_prefix } = req.body;
  try {
    await pool.query(
      'UPDATE services SET ref_prefix = ? WHERE id = ? AND company_id = ?',
      [(ref_prefix || '').toUpperCase().replace(/[^A-Z0-9]/g,'') || null,
       req.params.serviceId, req.user.company_id]
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Company admin: dashboard stats
async function getStats(req, res) {
  const cid = req.user.company_id;
  try {
    const [[co]] = await pool.query('SELECT timezone FROM companies WHERE id = ?', [cid]);
    const tz = co?.timezone || 'UTC';

    // Today in company timezone
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const { start: todayStart, end: todayEnd } = localDateToUtcRange(todayStr, tz);

    const [[{ total_visits }]] = await pool.query(
      'SELECT COUNT(*) AS total_visits FROM visits WHERE company_id = ?', [cid]
    );
    const [[{ today_visits }]] = await pool.query(
      `SELECT COUNT(*) AS today_visits FROM visits
       WHERE company_id = ? AND visit_time >= ? AND visit_time <= ?`,
      [cid, todayStart, todayEnd]
    );
    const [[{ total_employees }]] = await pool.query(
      `SELECT COUNT(*) AS total_employees FROM employees
       WHERE company_id = ? AND status = 'active'`, [cid]
    );
    const [[{ today_pending }]] = await pool.query(
      `SELECT COUNT(*) AS today_pending FROM visits
       WHERE company_id = ? AND status = 'pending' AND visit_time >= ? AND visit_time <= ?`,
      [cid, todayStart, todayEnd]
    );
    const [[{ today_in_progress }]] = await pool.query(
      `SELECT COUNT(*) AS today_in_progress FROM visits
       WHERE company_id = ? AND status = 'approved' AND visit_time >= ? AND visit_time <= ?`,
      [cid, todayStart, todayEnd]
    );
    const [[{ today_done }]] = await pool.query(
      `SELECT COUNT(*) AS today_done FROM visits
       WHERE company_id = ? AND status = 'completed' AND visit_time >= ? AND visit_time <= ?`,
      [cid, todayStart, todayEnd]
    );
    const [[{ pending_visits }]] = await pool.query(
      `SELECT COUNT(*) AS pending_visits FROM visits
       WHERE company_id = ? AND status = 'pending'`, [cid]
    );
    const [recent] = await pool.query(
      `SELECT v.id, v.visit_time, v.status, vis.name AS visitor_name,
              vis.mobile, emp.name AS employee_name
       FROM visits v
       JOIN visitors vis ON vis.id = v.visitor_id
       JOIN employees emp ON emp.id = v.employee_id
       WHERE v.company_id = ?
       ORDER BY v.created_at DESC LIMIT 5`, [cid]
    );
    res.json({
      total_visits, total_employees, pending_visits, recent_visits: recent,
      today_total: today_visits, today_pending, today_in_progress, today_done,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Company admin: chart data — all periods + service breakdown per period
async function getCharts(req, res) {
  const cid = req.user.company_id;
  try {
    const [[co]] = await pool.query('SELECT timezone FROM companies WHERE id = ?', [cid]);
    const tz = co?.timezone || 'UTC';
    const toLocalDate = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: tz });

    // ── Custom date range mode ────────────────────────────────────────────
    const { from, to } = req.query;
    if (from && to) {
      const { start } = localDateToUtcRange(from, tz);
      const { end }   = localDateToUtcRange(to,   tz);
      const [rows] = await pool.query(
        `SELECT v.visit_time, COALESCE(s.name, v.service_name, 'Unknown') AS service_label
         FROM visits v LEFT JOIN services s ON s.id = v.service_id
         WHERE v.company_id = ? AND v.visit_time >= ? AND v.visit_time <= ?
         ORDER BY v.visit_time`,
        [cid, start, end]
      );
      // Daily slots for the range
      const slots = {};
      const cur = new Date(from + 'T12:00:00Z');
      const endDay = new Date(to + 'T12:00:00Z');
      while (cur <= endDay) {
        slots[cur.toLocaleDateString('en-CA', { timeZone: tz })] = 0;
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      const svcMap = {};
      for (const row of rows) {
        const key = toLocalDate(row.visit_time);
        if (key in slots) slots[key]++;
        const svc = row.service_label || 'Unknown';
        svcMap[svc] = (svcMap[svc] || 0) + 1;
      }
      const svcTotal = Object.values(svcMap).reduce((a, b) => a + b, 0) || 1;
      return res.json({
        custom: Object.entries(slots).map(([date, count]) => ({ label: date.slice(5).replace('-', '/'), count })),
        services: Object.entries(svcMap).sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count, pct: Math.round(count / svcTotal * 100) })),
      });
    }

    // ── Preset periods — fetch last 5 years ───────────────────────────────
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 5);
    const [rows] = await pool.query(
      `SELECT v.visit_time, COALESCE(s.name, v.service_name, 'Unknown') AS service_label
       FROM visits v LEFT JOIN services s ON s.id = v.service_id
       WHERE v.company_id = ? AND v.visit_time >= ?
       ORDER BY v.visit_time`,
      [cid, cutoff]
    );

    const now = new Date();
    const nowLocal = toLocalDate(now);
    const [cy, cm, cd] = nowLocal.split('-').map(Number);

    function makeSlots(n, keyFn) {
      const s = {};
      for (let i = n - 1; i >= 0; i--) s[keyFn(i)] = 0;
      return s;
    }

    const daily = makeSlots(30, (i) => {
      const d = new Date(Date.UTC(cy, cm - 1, cd - i));
      return d.toLocaleDateString('en-CA', { timeZone: tz });
    });
    const weekly = makeSlots(12, (i) => {
      const d = new Date(Date.UTC(cy, cm - 1, cd));
      d.setDate(d.getDate() - i * 7);
      const mon = new Date(d);
      mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return `W${mon.toLocaleDateString('en-CA', { timeZone: tz })}`;
    });
    const monthly = makeSlots(12, (i) => {
      const d = new Date(Date.UTC(cy, cm - 1 - i, 1));
      return d.toLocaleDateString('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit' }).slice(0, 7);
    });
    const quarterly = makeSlots(8, (i) => {
      const tm = (cy * 12 + (cm - 1)) - i * 3;
      return `${Math.floor(tm / 12)}-Q${Math.floor((tm % 12) / 3) + 1}`;
    });
    const halfYearly = makeSlots(6, (i) => {
      const tm = (cy * 12 + (cm - 1)) - i * 6;
      return `${Math.floor(tm / 12)}-${(tm % 12) < 6 ? 'H1' : 'H2'}`;
    });
    const yearly = makeSlots(5, (i) => String(cy - i));

    // Per-period service maps (only counts visits that fall in that period's slots)
    const svc = { daily: {}, weekly: {}, monthly: {}, quarterly: {}, halfYearly: {}, yearly: {} };

    for (const row of rows) {
      const local = toLocalDate(row.visit_time);
      const [vy, vm, vd] = local.split('-').map(Number);
      const sv = row.service_label || 'Unknown';

      if (local in daily)   { daily[local]++;   svc.daily[sv]   = (svc.daily[sv]   || 0) + 1; }

      const vDate = new Date(Date.UTC(vy, vm - 1, vd));
      const mon = new Date(vDate); mon.setDate(vDate.getDate() - ((vDate.getDay() + 6) % 7));
      const wKey = `W${mon.toLocaleDateString('en-CA', { timeZone: tz })}`;
      if (wKey in weekly)   { weekly[wKey]++;   svc.weekly[sv]   = (svc.weekly[sv]   || 0) + 1; }

      const mKey = local.slice(0, 7);
      if (mKey in monthly)  { monthly[mKey]++;  svc.monthly[sv]  = (svc.monthly[sv]  || 0) + 1; }

      const qKey = `${vy}-Q${Math.floor((vm - 1) / 3) + 1}`;
      if (qKey in quarterly){ quarterly[qKey]++; svc.quarterly[sv] = (svc.quarterly[sv] || 0) + 1; }

      const hKey = `${vy}-${vm <= 6 ? 'H1' : 'H2'}`;
      if (hKey in halfYearly){ halfYearly[hKey]++; svc.halfYearly[sv] = (svc.halfYearly[sv] || 0) + 1; }

      const yKey = String(vy);
      if (yKey in yearly)   { yearly[yKey]++;   svc.yearly[sv]   = (svc.yearly[sv]   || 0) + 1; }
    }

    const toArr = (map, labelFn) =>
      Object.entries(map).map(([k, count]) => ({ label: labelFn ? labelFn(k) : k, count }));

    const toSvcArr = (m) => {
      const tot = Object.values(m).reduce((a, b) => a + b, 0) || 1;
      return Object.entries(m).sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count, pct: Math.round(count / tot * 100) }));
    };

    res.json({
      daily:      toArr(daily,      k => k.slice(5).replace('-', '/')),
      weekly:     toArr(weekly,     k => 'W' + k.slice(6).replace('-', '/')),
      monthly:    toArr(monthly,    k => k.slice(5)),
      quarterly:  toArr(quarterly),
      halfYearly: toArr(halfYearly),
      yearly:     toArr(yearly),
      services: {
        daily:      toSvcArr(svc.daily),
        weekly:     toSvcArr(svc.weekly),
        monthly:    toSvcArr(svc.monthly),
        quarterly:  toSvcArr(svc.quarterly),
        halfYearly: toSvcArr(svc.halfYearly),
        yearly:     toSvcArr(svc.yearly),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getReferral(req, res) {
  try {
    const [[co]] = await pool.query(
      'SELECT referral_code, whatsapp_tokens, whatsapp_provider FROM companies WHERE id = ?',
      [req.user.company_id]
    );
    if (!co) return res.status(404).json({ message: 'Company not found' });
    const CLIENT_URL = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
    res.json({
      referral_code:    co.referral_code,
      referral_url:     `${CLIENT_URL}/register?ref=${co.referral_code}`,
      whatsapp_tokens:  co.whatsapp_tokens,
      whatsapp_enabled: co.whatsapp_provider && co.whatsapp_provider !== 'none',
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  listCompanies, getCompany, updateStatus, deleteCompany,
  getProfile, updateProfile, updateSettings, getStats, getCharts,
  updateRefSettings, resetRefCounter, updateServiceRefPrefix,
  uploadCompanyLogo, uploadServiceLogo, getReferral,
};
