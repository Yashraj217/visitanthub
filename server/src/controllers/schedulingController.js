const { pool } = require('../config/database');
const { sendApprovalNotification, sendBookingConfirmation } = require('../services/whatsapp');
const { cacheGet, cacheSet } = require('../config/redis');

// Generate a unique booking reference
function genRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'BK-';
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

// Generate time slots for a day given availability windows and already-booked slots
function generateSlots(windows, bookedTimes, slotDuration, date) {
  const slots = [];
  const now = new Date();
  const isToday = new Date(date).toDateString() === now.toDateString();

  for (const w of windows) {
    const [sh, sm] = w.start_time.split(':').map(Number);
    const [eh, em] = w.end_time.split(':').map(Number);
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;

    while (cur + slotDuration <= end) {
      const hh = String(Math.floor(cur / 60)).padStart(2, '0');
      const mm = String(cur % 60).padStart(2, '0');
      const timeStr = `${hh}:${mm}`;

      // Skip past slots if today
      if (isToday) {
        const slotDate = new Date(date + 'T' + timeStr);
        if (slotDate <= now) { cur += slotDuration; continue; }
      }

      slots.push({
        time:   timeStr,
        booked: bookedTimes.includes(timeStr),
      });
      cur += slotDuration;
    }
  }
  return slots;
}

// ── PUBLIC: get company info + services + associates for booking page ────────
async function getBookingInfo(req, res) {
  const { slug } = req.params;
  try {
    const cacheKey = `booking:${slug}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const [[company]] = await pool.query(
      `SELECT id, name, slug, logo_url, sidebar_color, timezone
       FROM companies WHERE slug = ? AND status = 'active'`,
      [slug]
    );
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const [services] = await pool.query(
      `SELECT id, name, icon FROM services WHERE company_id = ? ORDER BY name`,
      [company.id]
    );
    // Attach visitor-facing custom fields to each service
    for (const svc of services) {
      const [fields] = await pool.query(
        `SELECT id, field_label, field_name, field_type, field_options, placeholder, is_required
         FROM service_fields WHERE service_id = ? AND is_hidden = 0 ORDER BY sort_order`,
        [svc.id]
      );
      svc.fields = fields.map(f => ({
        ...f,
        field_options: f.field_options ? JSON.parse(f.field_options) : [],
      }));
    }
    const [employees] = await pool.query(
      `SELECT e.id, e.name, e.designation, e.location,
              GROUP_CONCAT(DISTINCT es.service_id) AS service_ids
       FROM employees e
       LEFT JOIN employee_services es ON es.employee_id = e.id
       WHERE e.company_id = ? AND e.status = 'active'
       GROUP BY e.id ORDER BY e.name`,
      [company.id]
    );

    const result = {
      company: { id: company.id, name: company.name, slug: company.slug,
                 logo_url: company.logo_url, sidebar_color: company.sidebar_color },
      services,
      employees: employees.map(e => ({
        ...e,
        service_ids: e.service_ids ? e.service_ids.split(',').map(Number) : [],
      })),
    };
    await cacheSet(cacheKey, result, 300); // 5-minute cache
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// ── PUBLIC: get available time slots for a given date + associate ────────────
async function getAvailableSlots(req, res) {
  const { slug } = req.params;
  const { date, employee_id } = req.query;
  if (!date) return res.status(400).json({ message: 'date required' });

  try {
    const [[company]] = await pool.query(
      'SELECT id FROM companies WHERE slug = ? AND status = ?', [slug, 'active']
    );
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const dayOfWeek = new Date(date + 'T12:00:00Z').getDay(); // 0=Sun

    // Get availability windows
    let availSql = `SELECT start_time, end_time, slot_duration
                    FROM associate_availability
                    WHERE company_id = ? AND day_of_week = ? AND is_active = 1`;
    const availParams = [company.id, dayOfWeek];
    if (employee_id) { availSql += ' AND employee_id = ?'; availParams.push(employee_id); }

    const [windows] = await pool.query(availSql, availParams);
    if (!windows.length) return res.json({ slots: [] });

    const slotDuration = windows[0].slot_duration || 30;

    // Get already-booked slots for that day
    let bookedSql = `SELECT TIME_FORMAT(scheduled_time, '%H:%i') AS t
                     FROM scheduled_visits
                     WHERE company_id = ? AND scheduled_date = ?
                       AND status IN ('pending','confirmed')`;
    const bookedParams = [company.id, date];
    if (employee_id) { bookedSql += ' AND employee_id = ?'; bookedParams.push(employee_id); }

    const [booked] = await pool.query(bookedSql, bookedParams);
    const bookedTimes = booked.map(r => r.t);

    const slots = generateSlots(windows, bookedTimes, slotDuration, date);
    res.json({ slots, slot_duration: slotDuration });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// ── PUBLIC: create a booking ─────────────────────────────────────────────────
async function createBooking(req, res) {
  const { slug } = req.params;
  const { visitor_name, visitor_mobile, visitor_email,
          employee_id, service_id, service_name,
          scheduled_date, scheduled_time, purpose, field_values, _hp } = req.body;

  if (_hp) return res.status(201).json({
    id: 0, booking_ref: 'BK-000000',
    message: 'Booking request submitted. You will be notified once confirmed.',
  });

  if (!visitor_name?.trim() || !visitor_mobile?.trim() || !scheduled_date || !scheduled_time) {
    return res.status(400).json({ message: 'Name, mobile, date, and time are required' });
  }

  try {
    const [[company]] = await pool.query(
      'SELECT id, name FROM companies WHERE slug = ? AND status = ?', [slug, 'active']
    );
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // Check for duplicate booking by same mobile on the same date
    const [[duplicate]] = await pool.query(
      `SELECT booking_ref FROM scheduled_visits
       WHERE company_id = ? AND visitor_mobile = ? AND scheduled_date = ?
         AND status IN ('pending','confirmed')`,
      [company.id, visitor_mobile.trim(), scheduled_date]
    );
    if (duplicate) return res.status(409).json({
      message: `You already have a booking for this date (Ref: ${duplicate.booking_ref}). Please check your existing appointment or choose a different date.`,
      booking_ref: duplicate.booking_ref,
      duplicate: true,
    });

    // Verify slot is still available
    const [[conflict]] = await pool.query(
      `SELECT id FROM scheduled_visits
       WHERE company_id = ? AND employee_id = ? AND scheduled_date = ?
         AND scheduled_time = ? AND status IN ('pending','confirmed')`,
      [company.id, employee_id || null, scheduled_date, scheduled_time]
    );
    if (conflict) return res.status(409).json({ message: 'This slot was just taken. Please choose another.' });

    // Generate unique booking ref
    let booking_ref, attempts = 0;
    do {
      booking_ref = genRef();
      const [[ex]] = await pool.query('SELECT id FROM scheduled_visits WHERE booking_ref = ?', [booking_ref]);
      if (!ex) break;
    } while (++attempts < 10);

    const customFieldsJson = (Array.isArray(field_values) && field_values.length)
      ? JSON.stringify(field_values) : null;

    const [result] = await pool.query(
      `INSERT INTO scheduled_visits
         (company_id, employee_id, service_id, service_name,
          visitor_name, visitor_mobile, visitor_email,
          scheduled_date, scheduled_time, purpose, booking_ref, custom_fields)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [company.id, employee_id || null, service_id || null, service_name || null,
       visitor_name.trim(), visitor_mobile.trim(), visitor_email || null,
       scheduled_date, scheduled_time, purpose || null, booking_ref, customFieldsJson]
    );

    res.status(201).json({
      id: result.insertId,
      booking_ref,
      message: 'Booking request submitted. You will be notified once confirmed.',
    });

    // Send WhatsApp confirmation to visitor (fire-and-forget, after response)
    try {
      const [[co]] = await pool.query(
        'SELECT name, whatsapp_provider, whatsapp_api_key, whatsapp_from FROM companies WHERE id = ?',
        [company.id]
      );
      let employeeName = null;
      if (employee_id) {
        const [[emp]] = await pool.query('SELECT name FROM employees WHERE id = ?', [employee_id]);
        if (emp) employeeName = emp.name;
      }
      await sendBookingConfirmation({
        company: co,
        booking: {
          visitor_name:   visitor_name.trim(),
          visitor_mobile: visitor_mobile.trim(),
          booking_ref,
          scheduled_date,
          scheduled_time,
          employee_name:  employeeName,
          service_name:   service_name || null,
        },
      });
    } catch (waErr) {
      console.error('[WhatsApp booking confirmation error]', waErr.message);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// ── PUBLIC: check booking status ─────────────────────────────────────────────
async function getBookingStatus(req, res) {
  const { ref } = req.params;
  try {
    const [[row]] = await pool.query(
      `SELECT sv.booking_ref, sv.status, sv.scheduled_date, sv.scheduled_time,
              sv.visitor_name, sv.service_name, sv.purpose, sv.admin_notes,
              emp.name AS employee_name, emp.designation, emp.location,
              c.name AS company_name
       FROM scheduled_visits sv
       LEFT JOIN employees emp ON emp.id = sv.employee_id
       JOIN companies c ON c.id = sv.company_id
       WHERE sv.booking_ref = ?`,
      [ref.toUpperCase()]
    );
    if (!row) return res.status(404).json({ message: 'Booking not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// ── ADMIN: list bookings ──────────────────────────────────────────────────────
async function listBookings(req, res) {
  const { status, date_from, date_to, employee_id } = req.query;
  const cid = req.user.company_id;

  let sql = `SELECT sv.id, sv.booking_ref, sv.status,
                    sv.visitor_name, sv.visitor_mobile, sv.visitor_email,
                    sv.scheduled_date, sv.scheduled_time,
                    sv.service_name, sv.purpose, sv.admin_notes, sv.created_at,
                    sv.custom_fields,
                    emp.name AS employee_name, emp.designation
             FROM scheduled_visits sv
             LEFT JOIN employees emp ON emp.id = sv.employee_id
             WHERE sv.company_id = ?`;
  const params = [cid];

  if (status)      { sql += ' AND sv.status = ?';             params.push(status); }
  if (employee_id) { sql += ' AND sv.employee_id = ?';        params.push(employee_id); }
  if (date_from)   { sql += ' AND sv.scheduled_date >= ?';    params.push(date_from); }
  if (date_to)     { sql += ' AND sv.scheduled_date <= ?';    params.push(date_to); }

  sql += ' ORDER BY sv.scheduled_date ASC, sv.scheduled_time ASC';

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(r => {
      let cf = r.custom_fields;
      if (typeof cf === 'string') { try { cf = JSON.parse(cf); } catch { cf = null; } }
      return { ...r, custom_fields: cf || null };
    }));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// ── ADMIN: update booking status (confirm / cancel / no_show) ────────────────
async function updateBookingStatus(req, res) {
  const { status, admin_notes } = req.body;
  if (!['confirmed', 'cancelled', 'no_show'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  try {
    const [[booking]] = await pool.query(
      `SELECT sv.*, emp.name AS emp_name, emp.designation, emp.location, emp.phone AS emp_phone,
              c.name AS company_name, c.whatsapp_provider, c.whatsapp_api_key, c.whatsapp_from
       FROM scheduled_visits sv
       LEFT JOIN employees emp ON emp.id = sv.employee_id
       JOIN companies c ON c.id = sv.company_id
       WHERE sv.id = ? AND sv.company_id = ?`,
      [req.params.id, req.user.company_id]
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    await pool.query(
      'UPDATE scheduled_visits SET status = ?, admin_notes = ? WHERE id = ?',
      [status, admin_notes || null, req.params.id]
    );

    // Notify visitor via WhatsApp if confirmed
    if (status === 'confirmed' && booking.visitor_mobile) {
      const company  = { name: booking.company_name, whatsapp_provider: booking.whatsapp_provider,
                         whatsapp_api_key: booking.whatsapp_api_key, whatsapp_from: booking.whatsapp_from };
      const employee = { name: booking.emp_name || 'the associate', designation: booking.designation,
                         location: booking.location };
      const visit    = { service_name: booking.service_name, purpose: booking.purpose,
                         ref_number: booking.booking_ref, id: booking.id,
                         visit_time: booking.scheduled_date + 'T' + booking.scheduled_time };
      const visitor  = { name: booking.visitor_name, mobile: booking.visitor_mobile };

      sendApprovalNotification({ company, employee, visitor, visit })
        .catch(e => console.error('[Scheduling WhatsApp error]', e.message));
    }

    res.json({ message: 'Booking updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// ── ADMIN: get availability settings ─────────────────────────────────────────
async function getAvailability(req, res) {
  const cid = req.user.company_id;
  try {
    const [rows] = await pool.query(
      `SELECT aa.*, e.name AS employee_name
       FROM associate_availability aa
       JOIN employees e ON e.id = aa.employee_id
       WHERE aa.company_id = ? ORDER BY e.name, aa.day_of_week`,
      [cid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// ── ADMIN: save availability (full replace for an employee) ──────────────────
async function saveAvailability(req, res) {
  // body: { employee_id, slot_duration, windows: [{ day_of_week, start_time, end_time }] }
  const { employee_id, slot_duration = 30, windows = [] } = req.body;
  if (!employee_id) return res.status(400).json({ message: 'employee_id required' });
  const cid = req.user.company_id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Verify employee belongs to this company
    const [[emp]] = await conn.query(
      'SELECT id FROM employees WHERE id = ? AND company_id = ?', [employee_id, cid]
    );
    if (!emp) { await conn.rollback(); return res.status(404).json({ message: 'Associate not found' }); }

    // Replace all availability for this employee
    await conn.query(
      'DELETE FROM associate_availability WHERE company_id = ? AND employee_id = ?',
      [cid, employee_id]
    );

    if (windows.length) {
      const vals = windows.map(w => [cid, employee_id, w.day_of_week, w.start_time, w.end_time, slot_duration]);
      await conn.query(
        `INSERT INTO associate_availability (company_id, employee_id, day_of_week, start_time, end_time, slot_duration)
         VALUES ?`,
        [vals]
      );
    }

    await conn.commit();
    res.json({ message: 'Availability saved' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
}

module.exports = {
  getBookingInfo, getAvailableSlots, createBooking, getBookingStatus,
  listBookings, updateBookingStatus, getAvailability, saveAvailability,
};
