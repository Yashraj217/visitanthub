const { pool } = require('../config/database');
const { sendAppointmentReminderEmail } = require('./email');
const { sendExpoPush } = require('./pushNotification');

let lastRunDate = '';

async function sendReminders() {
  // Tomorrow's date in server local time
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA'); // YYYY-MM-DD

  console.log(`[Reminder] Running for ${tomorrowStr}`);

  try {
    // Get all confirmed bookings for tomorrow, grouped by employee
    const [rows] = await pool.query(
      `SELECT sv.scheduled_time, sv.visitor_name, sv.service_name, sv.purpose,
              sv.employee_id,
              e.name AS emp_name, e.email AS emp_email,
              c.name AS company_name,
              u.push_token
       FROM scheduled_visits sv
       JOIN employees e ON e.id = sv.employee_id
       JOIN companies c ON c.id = sv.company_id
       LEFT JOIN users u ON u.employee_id = sv.employee_id AND u.push_token IS NOT NULL
       WHERE sv.scheduled_date = ? AND sv.status = 'confirmed' AND sv.employee_id IS NOT NULL
       ORDER BY sv.employee_id, sv.scheduled_time`,
      [tomorrowStr]
    );

    if (!rows.length) {
      console.log('[Reminder] No confirmed appointments tomorrow — nothing to send');
      return;
    }

    // Group by employee_id
    const byEmp = new Map();
    for (const r of rows) {
      if (!byEmp.has(r.employee_id)) {
        byEmp.set(r.employee_id, {
          emp_name:    r.emp_name,
          emp_email:   r.emp_email,
          company_name: r.company_name,
          push_token:  r.push_token,
          appointments: [],
        });
      }
      byEmp.get(r.employee_id).appointments.push({
        time:         r.scheduled_time,
        visitor_name: r.visitor_name,
        service_name: r.service_name,
        purpose:      r.purpose,
      });
    }

    for (const [, emp] of byEmp) {
      const count = emp.appointments.length;

      // Email
      if (emp.emp_email) {
        sendAppointmentReminderEmail({
          employeeName:  emp.emp_name,
          employeeEmail: emp.emp_email,
          companyName:   emp.company_name,
          date:          tomorrowStr,
          appointments:  emp.appointments,
        }).then(r => console.log(`[Reminder] Email → ${emp.emp_email}: ${r.sent ? 'sent' : 'failed'}`))
          .catch(e => console.error('[Reminder] Email error:', e.message));
      }

      // Push notification
      if (emp.push_token) {
        sendExpoPush({
          token: emp.push_token,
          title: 'Appointments Tomorrow',
          body:  `You have ${count} appointment${count > 1 ? 's' : ''} tomorrow. Tap to view your schedule.`,
          data:  { screen: 'Schedule' },
        });
        console.log(`[Reminder] Push → ${emp.emp_name}`);
      }
    }
  } catch (err) {
    console.error('[Reminder] Error:', err.message);
  }
}

function startAppointmentReminder() {
  // Check every minute — fire at 20:00 (8 PM) server local time, once per day
  setInterval(() => {
    const now   = new Date();
    const hhmm  = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = now.toLocaleDateString('en-CA');

    if (hhmm === '20:00' && lastRunDate !== today) {
      lastRunDate = today;
      sendReminders().catch(console.error);
    }
  }, 60 * 1000);

  console.log('[Reminder] Appointment reminder scheduler started (fires daily at 20:00)');
}

module.exports = { startAppointmentReminder };
