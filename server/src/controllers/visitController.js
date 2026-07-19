const { pool } = require('../config/database');
const { localDateToUtcRange } = require('../utils/tz');
const { sendApprovalNotification } = require('../services/whatsapp');
const { sendVisitRejectionEmail } = require('../services/email');
const { broadcast } = require('../services/displayBroadcaster');

/**
 * After any status change, re-evaluate which pending visitor for an employee
 * should be flagged is_ready=1 (the next-in-line when no one is being served).
 */
async function promoteNextReady(employeeId, companyId, tz) {
  try {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz || 'UTC' });
    const { start, end } = localDateToUtcRange(todayStr, tz || 'UTC');

    // Clear all existing ready flags for this employee today
    await pool.query(
      `UPDATE visits SET is_ready = 0, ready_at = NULL
       WHERE employee_id = ? AND company_id = ? AND status = 'pending'
         AND visit_time >= ? AND visit_time <= ?`,
      [employeeId, companyId, start, end]
    );

    // Only promote if nobody is currently being served (approved)
    const [[inProgress]] = await pool.query(
      `SELECT id FROM visits
       WHERE employee_id = ? AND company_id = ? AND status = 'approved' LIMIT 1`,
      [employeeId, companyId]
    );
    if (inProgress) return; // someone is already in-service — don't flag next

    // Flag the earliest pending visitor today
    const [[next]] = await pool.query(
      `SELECT id FROM visits
       WHERE employee_id = ? AND company_id = ? AND status = 'pending'
         AND visit_time >= ? AND visit_time <= ?
       ORDER BY visit_time ASC LIMIT 1`,
      [employeeId, companyId, start, end]
    );
    if (next) {
      await pool.query(
        `UPDATE visits SET is_ready = 1, ready_at = NOW() WHERE id = ?`,
        [next.id]
      );
    }
  } catch (err) {
    console.error('[promoteNextReady]', err.message);
  }
}

async function list(req, res) {
  const { status, date, date_from, date_to, employee_id, service_id, search, order } = req.query;
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
                    v.employee_id, v.visitor_id,
                    v.current_stage_id, v.current_stage_name, v.current_stage_color,
                    v.is_ready, v.ready_at, v.approved_at,
                    v.stage_status, v.stage_waiting_since, v.next_visit_date,
                    vis.name AS visitor_name, vis.mobile, vis.email AS visitor_email,
                    emp.name AS employee_name, emp.designation,
                    (SELECT COUNT(*) FROM visit_photos p WHERE p.visit_id = v.id) AS photo_count
                    ${hiddenFieldsSub}
             FROM visits v
             JOIN visitors vis ON vis.id = v.visitor_id
             JOIN employees emp ON emp.id = v.employee_id
             WHERE 1=1`;
  const params = [];
  if (cid)        { sql += ' AND v.company_id = ?';       params.push(cid); }
  if (status) {
    const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      sql += ' AND v.status = ?';
      params.push(statuses[0]);
    } else if (statuses.length > 1) {
      sql += ` AND v.status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }
  }
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

  // company_user: show visits assigned to them OR currently at a stage they own
  // (so Registration associate can process walk-throughs without stealing the visit from the intended associate)
  if (req.user.role === 'company_user') {
    if (!req.user.employee_id) {
      const pg = req.query.page ? 1 : null;
      return res.json(pg !== null ? { visits: [], hasMore: false, page: 1 } : []);
    }
    sql += ` AND (v.employee_id = ? OR (
               EXISTS(SELECT 1 FROM companies WHERE id = ? AND stages_enabled = 1)
               AND v.current_stage_id IN (SELECT id FROM visit_stages WHERE employee_id = ? AND company_id = ?)
             ))`;
    params.push(req.user.employee_id, req.user.company_id, req.user.employee_id, req.user.company_id);
  } else if (employee_id) {
    sql += ' AND v.employee_id = ?';
    params.push(employee_id);
  }

  if (search?.trim()) {
    const like = `%${search.trim()}%`;
    sql += ' AND (vis.name LIKE ? OR vis.mobile LIKE ? OR v.ref_number LIKE ? OR v.service_name LIKE ?)';
    params.push(like, like, like, like);
  }

  // Pagination: ?page=N&limit=M  →  paginated response { visits, hasMore, page }
  // No page param  →  legacy flat-array response (keeps web admin working)
  const pg   = req.query.page ? Math.max(1, parseInt(req.query.page) || 1) : null;
  const pgSz = Math.min(50, parseInt(req.query.limit) || 20);

  // User-supplied order overrides default; pending defaults to ASC (queue), everything else DESC
  const defaultOrder = status === 'pending' ? 'ASC' : 'DESC';
  const sortDir = order === 'asc' ? 'ASC' : order === 'desc' ? 'DESC' : defaultOrder;
  if (pg !== null) {
    sql += ` ORDER BY v.visit_time ${sortDir} LIMIT ${pgSz + 1} OFFSET ${(pg - 1) * pgSz}`;
  } else {
    sql += ` ORDER BY v.visit_time ${sortDir} LIMIT 200`;
  }

  try {
    const [rows] = await pool.query(sql, params);
    const mapRow = r => ({
      ...r,
      hidden_fields: r.hidden_fields
        ? (typeof r.hidden_fields === 'string' ? JSON.parse(r.hidden_fields) : r.hidden_fields)
        : undefined,
    });
    if (pg !== null) {
      const hasMore = rows.length > pgSz;
      return res.json({ visits: rows.slice(0, pgSz).map(mapRow), hasMore, page: pg });
    }
    res.json(rows.map(mapRow));
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
      // Also allow if this user is the stage associate currently handling the visit
      const [[stageAccess]] = await pool.query(
        `SELECT 1 FROM visit_stages vs
         WHERE vs.id = ? AND vs.employee_id = ? AND vs.company_id = ?`,
        [visit.current_stage_id, req.user.employee_id, req.user.company_id]
      );
      if (!stageAccess) return res.status(403).json({ message: 'Access denied' });
      visit.is_stage_visitor = true; // flag so frontend knows this is a stage-only view
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

    // Attach stage history with timing and attribution
    const [stageLogs] = await pool.query(
      `SELECT stage_name, color, entered_at, exited_at, entered_by_name,
              stage_employee_id, stage_employee_name
       FROM visit_stage_logs WHERE visit_id = ? ORDER BY entered_at ASC`,
      [visit.id]
    );
    visit.stage_logs = stageLogs;

    res.json(visit);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateStatus(req, res) {
  const { status, notes, force } = req.body;
  if (!['approved', 'rejected', 'completed', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  try {
    // Fetch visit to get employee/company and queue position
    const [[visit]] = await pool.query(
      `SELECT v.id, v.employee_id, v.company_id, v.visit_time, v.status AS current_status,
              c.timezone
       FROM visits v JOIN companies c ON c.id = v.company_id
       WHERE v.id = ? AND v.company_id = ?`,
      [req.params.id, req.user.company_id]
    );
    if (!visit) return res.status(404).json({ message: 'Visit not found' });
    if (req.user.role === 'company_user' && visit.employee_id !== req.user.employee_id) {
      return res.status(403).json({ message: 'Only the primary associate can approve or reject this visit' });
    }

    // ── Queue-jump guard (approval only) ─────────────────────────────────
    if (status === 'approved' && !force) {
      const tz = visit.timezone || 'UTC';
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
      const { start, end } = localDateToUtcRange(todayStr, tz);

      const [[ahead]] = await pool.query(
        `SELECT v.id, vis.name AS visitor_name
         FROM visits v JOIN visitors vis ON vis.id = v.visitor_id
         WHERE v.employee_id = ? AND v.company_id = ? AND v.status = 'pending'
           AND v.id != ? AND v.visit_time < ?
           AND v.visit_time >= ? AND v.visit_time <= ?
         ORDER BY v.visit_time ASC LIMIT 1`,
        [visit.employee_id, visit.company_id, visit.id, visit.visit_time, start, end]
      );
      if (ahead) {
        return res.json({
          queue_warning: true,
          ahead_visitor: ahead.visitor_name,
          message: `${ahead.visitor_name} is ahead in queue. Serve them out of order?`,
        });
      }
    }

    // ── Apply status update ───────────────────────────────────────────────
    let updateSql = status === 'approved'
      ? 'UPDATE visits SET status = ?, notes = ?, is_ready = 0, approved_at = NOW() WHERE id = ? AND company_id = ?'
      : (status === 'completed' || status === 'rejected')
        ? 'UPDATE visits SET status = ?, notes = ?, stage_status = NULL, stage_waiting_since = NULL WHERE id = ? AND company_id = ?'
        : 'UPDATE visits SET status = ?, notes = ? WHERE id = ? AND company_id = ?';
    const [result] = await pool.query(updateSql,
      [status, notes || null, req.params.id, req.user.company_id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Visit not found' });

    const tz = visit.timezone || 'UTC';

    // ── Promote next-ready after service ends ─────────────────────────────
    if (status === 'completed' || status === 'rejected') {
      promoteNextReady(visit.employee_id, visit.company_id, tz);
    }
    // ── Promote on approval too (clears ready flag, re-evaluates in case of re-queue) ─
    if (status === 'approved') {
      promoteNextReady(visit.employee_id, visit.company_id, tz);
    }

    // ── Fire approval WhatsApp (non-blocking) ────────────────────────────
    if (status === 'approved') {
      pool.query(
        `SELECT v.id, v.ref_number, v.visit_time, v.service_name, v.purpose,
                vis.name AS visitor_name, vis.mobile AS visitor_mobile,
                emp.name AS emp_name, emp.designation, emp.location,
                c.id AS company_id, c.name AS company_name, c.whatsapp_provider, c.whatsapp_api_key, c.whatsapp_from,
                c.notif_visit_approved, c.whatsapp_tokens
         FROM visits v
         JOIN visitors  vis ON vis.id = v.visitor_id
         JOIN employees emp ON emp.id = v.employee_id
         JOIN companies c   ON c.id   = v.company_id
         WHERE v.id = ?`,
        [req.params.id]
      ).then(([rows]) => {
        if (!rows.length) return;
        const r = rows[0];
        sendApprovalNotification({
          company:  { id: r.company_id, name: r.company_name, whatsapp_provider: r.whatsapp_provider,
                      whatsapp_api_key: r.whatsapp_api_key, whatsapp_from: r.whatsapp_from,
                      notif_visit_approved: r.notif_visit_approved, whatsapp_tokens: r.whatsapp_tokens },
          employee: { name: r.emp_name, designation: r.designation, location: r.location },
          visitor:  { name: r.visitor_name, mobile: r.visitor_mobile },
          visit:    { id: r.id, ref_number: r.ref_number, visit_time: r.visit_time,
                      service_name: r.service_name, purpose: r.purpose },
        }).catch(err => console.error('[Approval notification error]', err.message));
      }).catch(err => console.error('[Approval fetch error]', err.message));
    }

    // ── Fire rejection email (non-blocking) ─────────────────────────────
    if (status === 'rejected') {
      pool.query(
        `SELECT v.ref_number, v.service_name, v.purpose,
                vis.name AS visitor_name, vis.email AS visitor_email,
                emp.name AS emp_name,
                c.name AS company_name
         FROM visits v
         JOIN visitors  vis ON vis.id = v.visitor_id
         JOIN employees emp ON emp.id = v.employee_id
         JOIN companies c   ON c.id   = v.company_id
         WHERE v.id = ?`,
        [req.params.id]
      ).then(([rows]) => {
        if (!rows.length || !rows[0].visitor_email) return;
        const r = rows[0];
        sendVisitRejectionEmail({
          visitorName:  r.visitor_name,
          visitorEmail: r.visitor_email,
          companyName:  r.company_name,
          refNumber:    r.ref_number,
          employeeName: r.emp_name,
          serviceName:  r.service_name || r.purpose || null,
          reason:       notes || null,
        }).catch(e => console.error('[Rejection email error]', e.message));
      }).catch(e => console.error('[Rejection email fetch error]', e.message));
    }

    res.json({ message: 'Status updated' });
    broadcast(visit.company_id);
  } catch (err) {
    console.error(err);
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
    let sql = `SELECT e.id, e.name, e.designation, e.location
               FROM employees e
               WHERE e.company_id = ? AND e.status = 'active'`;
    const params = [req.user.company_id];

    if (service_id) {
      sql += ` AND e.id IN (SELECT employee_id FROM employee_services WHERE service_id = ?)`;
      params.push(service_id);
    }

    sql += ' ORDER BY e.location, e.name';
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
      // Allow if assigned to them OR (stages enabled AND) currently at a stage they own
      visitSql += ` AND (employee_id = ? OR (
        EXISTS(SELECT 1 FROM companies WHERE id = ? AND stages_enabled = 1)
        AND current_stage_id IN (SELECT id FROM visit_stages WHERE employee_id = ? AND company_id = ?)
      ))`;
      visitParams.push(req.user.employee_id, req.user.company_id, req.user.employee_id, req.user.company_id);
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

async function getNotes(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, author_name, note, created_at FROM visit_notes
       WHERE visit_id = ? AND company_id = ? ORDER BY created_at ASC`,
      [req.params.id, req.user.company_id]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
}

async function addNote(req, res) {
  try {
    const { note } = req.body;
    if (!note?.trim()) return res.status(400).json({ message: 'Note cannot be empty' });
    const [result] = await pool.query(
      `INSERT INTO visit_notes (visit_id, company_id, user_id, author_name, note) VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, req.user.company_id, req.user.id, req.user.name, note.trim()]
    );
    res.json({ id: result.insertId, author_name: req.user.name, note: note.trim(), created_at: new Date() });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
}

async function updateNextVisit(req, res) {
  const { next_visit_date } = req.body;
  try {
    const date = next_visit_date ? new Date(next_visit_date) : null;
    if (date && isNaN(date.getTime())) return res.status(400).json({ message: 'Invalid date' });
    const [result] = await pool.query(
      'UPDATE visits SET next_visit_date = ? WHERE id = ? AND company_id = ?',
      [date ? date.toISOString().slice(0, 10) : null, req.params.id, req.user.company_id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Visit not found' });
    res.json({ success: true, next_visit_date: date ? date.toISOString().slice(0, 10) : null });
  } catch (err) {
    console.error('[updateNextVisit]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
}

// GET /visits/revisits/count — lightweight badge count for dashboard
async function getRevisitsCount(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT MAX(next_visit_date) AS next_visit_date
       FROM visits WHERE company_id = ? AND next_visit_date IS NOT NULL
       GROUP BY visitor_id`,
      [req.user.company_id]
    );
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const total   = rows.length;
    const overdue = rows.filter(r => new Date(String(r.next_visit_date).slice(0, 10) + 'T12:00:00') < today).length;
    res.json({ total, overdue });
  } catch (err) {
    console.error('[getRevisitsCount]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
}

// GET /visits/revisits — visitors with a scheduled next_visit_date
async function getRevisits(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
         nv.visitor_id,
         vis.name        AS visitor_name,
         vis.mobile,
         nv.next_visit_date,
         v.service_name,
         emp.name        AS employee_name,
         emp.designation,
         v.visit_time    AS last_visit_time,
         v.last_reminded_at
       FROM (
         SELECT visitor_id, MAX(next_visit_date) AS next_visit_date
         FROM visits
         WHERE company_id = ? AND next_visit_date IS NOT NULL
         GROUP BY visitor_id
       ) nv
       JOIN visits v ON v.visitor_id = nv.visitor_id
         AND v.next_visit_date = nv.next_visit_date
         AND v.company_id = ?
       JOIN visitors vis ON vis.id = nv.visitor_id AND vis.company_id = ?
       LEFT JOIN employees emp ON emp.id = v.employee_id
       GROUP BY nv.visitor_id, vis.name, vis.mobile, nv.next_visit_date,
                v.service_name, emp.name, emp.designation, v.visit_time, v.last_reminded_at
       ORDER BY nv.next_visit_date ASC`,
      [req.user.company_id, req.user.company_id, req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[getRevisits]', err.message);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { list, getOne, updateStatus, updateFieldValues, listEligibleEmployees, updateEmployee, myCharts, promoteNextReady, getNotes, addNote, updateNextVisit, getRevisits, getRevisitsCount };
