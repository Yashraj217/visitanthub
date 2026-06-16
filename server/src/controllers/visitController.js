const { pool } = require('../config/database');
const { localDateToUtcRange } = require('../utils/tz');

async function list(req, res) {
  const { status, date, date_from, date_to, employee_id, service_id } = req.query;
  const cid = req.user.role === 'super_admin' ? req.query.company_id : req.user.company_id;

  // Resolve company timezone for date filtering
  let companyTz = 'UTC';
  if (cid) {
    const [[co]] = await pool.query('SELECT timezone FROM companies WHERE id = ?', [cid]);
    companyTz = co?.timezone || 'UTC';
  }

  const hiddenFieldsSub = ['company_user', 'company_admin'].includes(req.user.role)
    ? `, (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', vfv.id, 'field_id', sf.id, 'label', vfv.field_label, 'value', COALESCE(vfv.value, '')))
          FROM visit_field_values vfv
          JOIN service_fields sf ON sf.id = vfv.field_id
          WHERE vfv.visit_id = v.id AND sf.is_hidden = 1
        ) AS hidden_fields`
    : '';

  let sql = `SELECT v.id, v.ref_number, v.visit_time, v.status, v.whatsapp_sent,
                    v.service_id, v.service_name, v.purpose, v.notes,
                    v.employee_id,
                    vis.name AS visitor_name, vis.mobile, vis.email AS visitor_email,
                    emp.name AS employee_name, emp.designation
                    ${hiddenFieldsSub}
             FROM visits v
             JOIN visitors vis ON vis.id = v.visitor_id
             JOIN employees emp ON emp.id = v.employee_id
             WHERE 1=1`;
  const params = [];
  if (cid)        { sql += ' AND v.company_id = ?';       params.push(cid); }
  if (status)     { sql += ' AND v.status = ?';           params.push(status); }
  if (service_id) { sql += ' AND v.service_id = ?';       params.push(service_id); }
  // Convert local dates → UTC ranges using company timezone (DST-safe, no MySQL tz tables needed)
  if (date_from || date_to || date) {
    const from = date_from || date;
    const to   = date_to   || date;
    const { start } = localDateToUtcRange(from, companyTz);
    const { end }   = localDateToUtcRange(to,   companyTz);
    sql += ' AND v.visit_time >= ? AND v.visit_time <= ?';
    params.push(start, end);
  }

  // company_user: always restrict to own visits — ignores any employee_id query param
  if (req.user.role === 'company_user') {
    if (!req.user.employee_id) return res.json([]);
    sql += ' AND v.employee_id = ?';
    params.push(req.user.employee_id);
  } else if (employee_id) {
    sql += ' AND v.employee_id = ?';
    params.push(employee_id);
  }

  sql += ' ORDER BY v.visit_time ASC LIMIT 200';

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(r => ({
      ...r,
      hidden_fields: r.hidden_fields
        ? (typeof r.hidden_fields === 'string' ? JSON.parse(r.hidden_fields) : r.hidden_fields)
        : undefined,
    })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function getOne(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT v.*, vis.name AS visitor_name, vis.mobile, vis.email AS visitor_email,
              vis.address, emp.name AS employee_name, emp.designation, emp.phone AS employee_phone
       FROM visits v
       JOIN visitors vis ON vis.id = v.visitor_id
       JOIN employees emp ON emp.id = v.employee_id
       WHERE v.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Visit not found' });
    const visit = rows[0];
    if (['company_admin', 'company_user'].includes(req.user.role) && visit.company_id !== req.user.company_id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.role === 'company_user' && visit.employee_id !== req.user.employee_id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    // Attach custom field values with hidden flag from service_fields
    const [fieldValues] = await pool.query(
      `SELECT vfv.id, vfv.field_id, vfv.field_label, vfv.value,
              COALESCE(sf.is_hidden, 0) AS is_hidden,
              sf.field_type, sf.field_options
       FROM visit_field_values vfv
       LEFT JOIN service_fields sf ON sf.id = vfv.field_id
       WHERE vfv.visit_id = ?
       ORDER BY vfv.id`,
      [visit.id]
    );
    visit.custom_fields = fieldValues.map(f => ({
      ...f,
      field_options: f.field_options ? JSON.parse(f.field_options) : [],
    }));
    res.json(visit);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateStatus(req, res) {
  const { status, notes } = req.body;
  if (!['approved', 'rejected', 'completed', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  try {
    let updateSql = 'UPDATE visits SET status = ?, notes = ? WHERE id = ? AND company_id = ?';
    const updateParams = [status, notes || null, req.params.id, req.user.company_id];
    if (req.user.role === 'company_user') {
      updateSql += ' AND employee_id = ?';
      updateParams.push(req.user.employee_id);
    }
    const [result] = await pool.query(updateSql, updateParams);
    if (!result.affectedRows) return res.status(404).json({ message: 'Visit not found' });
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// Update hidden field values — accepts { [service_field_id]: value }, UPSERT so it works
// for any visit status and even if the row didn't exist yet (old visits).
async function updateFieldValues(req, res) {
  const { field_values } = req.body; // { [service_field_id]: value }
  if (!field_values || typeof field_values !== 'object') {
    return res.status(400).json({ message: 'field_values required' });
  }
  try {
    let checkSql = 'SELECT id FROM visits WHERE id = ? AND company_id = ?';
    const checkParams = [req.params.id, req.user.company_id];
    if (req.user.role === 'company_user') {
      checkSql += ' AND employee_id = ?';
      checkParams.push(req.user.employee_id);
    }
    const [rows] = await pool.query(checkSql, checkParams);
    if (!rows.length) return res.status(404).json({ message: 'Visit not found' });

    const fieldIds = Object.keys(field_values).map(Number).filter(Boolean);
    if (!fieldIds.length) return res.json({ message: 'Nothing to update' });

    for (const fieldId of fieldIds) {
      // Only allow updating fields that are hidden and belong to this company
      const [sf] = await pool.query(
        'SELECT id, field_label FROM service_fields WHERE id = ? AND company_id = ? AND is_hidden = 1',
        [fieldId, req.user.company_id]
      );
      if (!sf.length) continue;

      // UPSERT — works whether the row already exists or not
      await pool.query(
        `INSERT INTO visit_field_values (visit_id, field_id, field_label, value)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value)`,
        [req.params.id, fieldId, sf[0].field_label, field_values[fieldId] ?? '']
      );
    }
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Return active employees eligible for reassignment on a visit.
// Filtered to service assignment if service_id is provided.
async function listEligibleEmployees(req, res) {
  const { service_id } = req.query;
  try {
    let sql = `SELECT e.id, e.name, e.designation
               FROM employees e
               WHERE e.company_id = ? AND e.status = 'active'`;
    const params = [req.user.company_id];

    if (service_id) {
      sql += ` AND e.id IN (SELECT employee_id FROM employee_services WHERE service_id = ?)`;
      params.push(service_id);
    }

    sql += ' ORDER BY e.name';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateEmployee(req, res) {
  const { employee_id } = req.body;
  if (!employee_id) return res.status(400).json({ message: 'employee_id required' });

  try {
    let visitSql = 'SELECT id, service_id FROM visits WHERE id = ? AND company_id = ?';
    const visitParams = [req.params.id, req.user.company_id];
    if (req.user.role === 'company_user') {
      visitSql += ' AND employee_id = ?';
      visitParams.push(req.user.employee_id);
    }
    const [visits] = await pool.query(visitSql, visitParams);
    if (!visits.length) return res.status(404).json({ message: 'Visit not found' });
    const visit = visits[0];

    const [employees] = await pool.query(
      "SELECT id, name, designation FROM employees WHERE id = ? AND company_id = ? AND status = 'active'",
      [employee_id, req.user.company_id]
    );
    if (!employees.length) return res.status(400).json({ message: 'Associate not found' });
    const employee = employees[0];

    await pool.query('UPDATE visits SET employee_id = ? WHERE id = ?', [employee_id, visit.id]);
    res.json({ message: 'Associate updated', employee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Associate: chart data for own visits (status pie + time-series bar)
async function myCharts(req, res) {
  const empId = req.user.employee_id;
  const cid   = req.user.company_id;
  if (!empId) return res.json({ status: [], series: [] });

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
        `SELECT visit_time, status FROM visits
         WHERE employee_id = ? AND company_id = ? AND visit_time >= ? AND visit_time <= ?
         ORDER BY visit_time`,
        [empId, cid, start, end]
      );

      // Build ordered daily slots for every day in the range
      const slots = {};
      const cur = new Date(from + 'T12:00:00Z');
      const endDay = new Date(to + 'T12:00:00Z');
      while (cur <= endDay) {
        const fullKey = cur.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
        slots[fullKey] = { pending: 0, approved: 0, completed: 0, rejected: 0 };
        cur.setUTCDate(cur.getUTCDate() + 1);
      }

      for (const r of rows) {
        const key = toLocalDate(r.visit_time); // YYYY-MM-DD
        const st  = r.status || 'pending';
        if (slots[key]) slots[key][st]++;
      }

      const customArr = Object.entries(slots).map(([date, counts]) => ({
        label: date.slice(5).replace('-', '/'), // MM/DD
        ...counts,
      }));

      return res.json({ custom: customArr });
    }

    // All visits for this employee (no time cap — they may have few records)
    const [rows] = await pool.query(
      `SELECT visit_time, status FROM visits WHERE employee_id = ? AND company_id = ? ORDER BY visit_time`,
      [empId, cid]
    );

    // ── Status breakdown (pie) ────────────────────────────────────────────
    const statusMap = { pending: 0, approved: 0, completed: 0, rejected: 0 };
    for (const r of rows) statusMap[r.status] = (statusMap[r.status] || 0) + 1;
    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    // ── Build series for all periods ─────────────────────────────────────
    const now      = new Date();
    const nowLocal = toLocalDate(now);
    const [cy, cm, cd] = nowLocal.split('-').map(Number);

    function makeSlots(n, keyFn) {
      // Creates an ordered map of n slots initialised to 0 per status
      const slots = {};
      for (let i = n - 1; i >= 0; i--) {
        slots[keyFn(i)] = { pending: 0, approved: 0, completed: 0, rejected: 0 };
      }
      return slots;
    }

    // Daily: last 30 days
    const daily = makeSlots(30, (i) => {
      const d = new Date(Date.UTC(cy, cm - 1, cd - i));
      return d.toLocaleDateString('en-CA', { timeZone: tz }).slice(5); // MM-DD
    });

    // Weekly: last 12 weeks (label = week start date)
    const weekly = makeSlots(12, (i) => {
      const d = new Date(Date.UTC(cy, cm - 1, cd));
      d.setDate(d.getDate() - i * 7);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return `W${monday.toLocaleDateString('en-CA', { timeZone: tz }).slice(5)}`;
    });

    // Monthly: last 12 months
    const monthly = makeSlots(12, (i) => {
      const d = new Date(Date.UTC(cy, cm - 1 - i, 1));
      return d.toLocaleDateString('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit' }).slice(0, 7);
    });

    // Quarterly: last 8 quarters
    const quarterly = makeSlots(8, (i) => {
      const totalMonths = (cy * 12 + (cm - 1)) - i * 3;
      const qy = Math.floor(totalMonths / 12);
      const qm = totalMonths % 12;
      const q  = Math.floor(qm / 3) + 1;
      return `${qy}-Q${q}`;
    });

    // Half-yearly: last 6 halves
    const halfYearly = makeSlots(6, (i) => {
      const totalMonths = (cy * 12 + (cm - 1)) - i * 6;
      const hy = Math.floor(totalMonths / 12);
      const hm = totalMonths % 12;
      const h  = hm < 6 ? 'H1' : 'H2';
      return `${hy}-${h}`;
    });

    // Yearly: last 5 years
    const yearly = makeSlots(5, (i) => String(cy - i));

    // ── Aggregate visits into slots ───────────────────────────────────────
    for (const r of rows) {
      const local = toLocalDate(r.visit_time);
      const [vy, vm, vd] = local.split('-').map(Number);
      const st = r.status || 'pending';

      // daily key = MM-DD
      const dKey = local.slice(5);
      if (daily[dKey]) daily[dKey][st] = (daily[dKey][st] || 0) + 1;

      // weekly key = W<monday MM-DD>
      const visitDate = new Date(Date.UTC(vy, vm - 1, vd));
      const monday = new Date(visitDate);
      monday.setDate(visitDate.getDate() - ((visitDate.getDay() + 6) % 7));
      const wKey = `W${monday.toLocaleDateString('en-CA', { timeZone: tz }).slice(5)}`;
      if (weekly[wKey]) weekly[wKey][st] = (weekly[wKey][st] || 0) + 1;

      // monthly key = YYYY-MM
      const mKey = local.slice(0, 7);
      if (monthly[mKey]) monthly[mKey][st] = (monthly[mKey][st] || 0) + 1;

      // quarterly key = YYYY-Q#
      const qNum = Math.floor((vm - 1) / 3) + 1;
      const qKey = `${vy}-Q${qNum}`;
      if (quarterly[qKey]) quarterly[qKey][st] = (quarterly[qKey][st] || 0) + 1;

      // half-yearly key = YYYY-H#
      const hNum = vm <= 6 ? 'H1' : 'H2';
      const hKey = `${vy}-${hNum}`;
      if (halfYearly[hKey]) halfYearly[hKey][st] = (halfYearly[hKey][st] || 0) + 1;

      // yearly key = YYYY
      const yKey = String(vy);
      if (yearly[yKey]) yearly[yKey][st] = (yearly[yKey][st] || 0) + 1;
    }

    const toArr = (map) => Object.entries(map).map(([label, counts]) => ({ label, ...counts }));

    res.json({
      status:    statusData,
      daily:     toArr(daily),
      weekly:    toArr(weekly),
      monthly:   toArr(monthly),
      quarterly: toArr(quarterly),
      halfYearly:toArr(halfYearly),
      yearly:    toArr(yearly),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { list, getOne, updateStatus, updateFieldValues, listEligibleEmployees, updateEmployee, myCharts };
