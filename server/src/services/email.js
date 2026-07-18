const nodemailer = require('nodemailer');

const APP_NAME = process.env.APP_NAME || 'VisitorApp';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendMail({ to, subject, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[EMAIL] SMTP not configured — skipping "${subject}" to ${to}`);
    return { sent: false };
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] Sent "${subject}" to ${to}`);
    return { sent: true };
  } catch (err) {
    console.error(`[EMAIL] Failed to send to ${to}:`, err.message);
    return { sent: false, error: err.message };
  }
}

// ── Invitation email — sent when company_admin creates a new user ──────────
async function sendUserInvitation({ userName, userEmail, companyName, password }) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#10b981,#059669);padding:36px 40px;text-align:center;">
            <p style="margin:0;font-size:32px;">🎉</p>
            <h1 style="margin:12px 0 4px;color:#fff;font-size:22px;font-weight:700;">You've been invited!</h1>
            <p style="margin:0;color:rgba(255,255,255,.8);font-size:14px;">${companyName} has added you to ${APP_NAME}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${userName}</strong>,</p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
              You have been added as a staff user for <strong>${companyName}</strong>. Here are your login credentials:
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;width:100px;">Login URL</td>
                  <td style="padding:6px 0;"><a href="${CLIENT_URL}/login" style="color:#059669;font-size:13px;font-weight:600;">${CLIENT_URL}/login</a></td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">Email</td>
                  <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${userEmail}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">Password</td>
                  <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;font-family:monospace;">${password}</td>
                </tr>
              </table>
            </div>
            <a href="${CLIENT_URL}/login" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:24px;">Log In Now →</a>
            <p style="margin:0;color:#f59e0b;font-size:13px;font-weight:500;">⚠️ Please change your password after your first login.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendMail({ to: userEmail, subject: `You've been invited to join ${companyName} on ${APP_NAME}`, html });
}

// ── OTP email — sent for password reset ───────────────────────────────────
async function sendPasswordResetOTP({ userName, userEmail, otp }) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:36px 40px;text-align:center;">
            <p style="margin:0;font-size:32px;">🔐</p>
            <h1 style="margin:12px 0 4px;color:#fff;font-size:22px;font-weight:700;">Password Reset Code</h1>
            <p style="margin:0;color:rgba(255,255,255,.8);font-size:14px;">Valid for 15 minutes</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;text-align:center;">
            <p style="margin:0 0 8px;color:#374151;font-size:15px;">Hi <strong>${userName}</strong>,</p>
            <p style="margin:0 0 32px;color:#6b7280;font-size:14px;">Use the code below to reset your password:</p>
            <div style="display:inline-block;background:#fffbeb;border:2px dashed #f59e0b;border-radius:12px;padding:20px 40px;margin-bottom:32px;">
              <p style="margin:0;color:#92400e;font-size:42px;font-weight:800;letter-spacing:12px;font-family:monospace;">${otp}</p>
            </div>
            <p style="margin:0 0 8px;color:#ef4444;font-size:13px;font-weight:500;">⏰ This code expires in <strong>15 minutes</strong>.</p>
            <p style="margin:0;color:#9ca3af;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendMail({ to: userEmail, subject: `${otp} is your ${APP_NAME} password reset code`, html });
}

// ── Verification email — sent when a new company registers ────────────────
async function sendVerificationEmail({ companyName, adminName, adminEmail, verifyUrl }) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:36px 40px;text-align:center;">
            <p style="margin:0;font-size:32px;">✉️</p>
            <h1 style="margin:12px 0 4px;color:#fff;font-size:22px;font-weight:700;">Verify your email</h1>
            <p style="margin:0;color:rgba(255,255,255,.8);font-size:14px;">One click to activate your ${APP_NAME} account</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${adminName}</strong>,</p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
              Thank you for registering <strong>${companyName}</strong> on ${APP_NAME}.
              Click the button below to verify your email and activate your account instantly.
            </p>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${verifyUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;">Verify Email &amp; Activate Account</a>
            </div>
            <div style="background:#f0f0ff;border-left:4px solid #6366f1;border-radius:6px;padding:14px 18px;margin-bottom:24px;">
              <p style="margin:0;color:#4338ca;font-size:13px;">Or paste this link into your browser:</p>
              <p style="margin:6px 0 0;word-break:break-all;color:#6366f1;font-size:12px;">${verifyUrl}</p>
            </div>
            <p style="margin:0;color:#ef4444;font-size:13px;font-weight:500;">⏰ This link expires in <strong>24 hours</strong>.</p>
            <p style="margin:12px 0 0;color:#9ca3af;font-size:12px;">If you did not register, please ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendMail({ to: adminEmail, subject: `Verify your email — ${APP_NAME}`, html });
}

// ── Appointment booking confirmation — sent to visitor on booking ─────────
async function sendBookingConfirmationEmail({ visitorName, visitorEmail, companyName, bookingRef, scheduledDate, scheduledTime, employeeName, serviceName }) {
  if (!visitorEmail) return { sent: false };

  function fmt12(t) {
    if (!t) return '';
    const [h, m] = String(t).slice(0, 5).split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }
  function fmtDate(d) {
    if (!d) return '';
    const [y, mo, day] = d.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${day} ${months[parseInt(mo) - 1]} ${y}`;
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:36px 40px;text-align:center;">
            <p style="margin:0;font-size:32px;">📅</p>
            <h1 style="margin:12px 0 4px;color:#fff;font-size:22px;font-weight:700;">Appointment Confirmed</h1>
            <p style="margin:0;color:rgba(255,255,255,.8);font-size:14px;">${companyName}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;color:#374151;font-size:15px;">Hi <strong>${visitorName}</strong>,</p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
              Your appointment has been booked successfully. Here are your details:
            </p>
            <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;width:130px;vertical-align:top;">Booking Ref</td>
                  <td style="padding:8px 0;color:#4f46e5;font-size:15px;font-weight:800;font-family:monospace;">${bookingRef}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #ede9fe;vertical-align:top;">Date</td>
                  <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;border-top:1px solid #ede9fe;">${fmtDate(scheduledDate)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #ede9fe;vertical-align:top;">Time</td>
                  <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;border-top:1px solid #ede9fe;">${fmt12(scheduledTime)}</td>
                </tr>
                ${serviceName ? `
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #ede9fe;vertical-align:top;">Service</td>
                  <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;border-top:1px solid #ede9fe;">${serviceName}</td>
                </tr>` : ''}
                ${employeeName ? `
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #ede9fe;vertical-align:top;">Doctor / Associate</td>
                  <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;border-top:1px solid #ede9fe;">${employeeName}</td>
                </tr>` : ''}
              </table>
            </div>
            <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:6px;padding:14px 18px;margin-bottom:24px;">
              <p style="margin:0;color:#15803d;font-size:13px;font-weight:600;">📌 Save your booking reference: <span style="font-family:monospace;">${bookingRef}</span></p>
              <p style="margin:6px 0 0;color:#16a34a;font-size:13px;">You can use this to check your appointment status.</p>
            </div>
            <p style="margin:0;color:#9ca3af;font-size:12px;">If you did not make this booking, please ignore this email or contact ${companyName}.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} ${companyName}. Powered by ${APP_NAME}.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendMail({ to: visitorEmail, subject: `Appointment Confirmed — ${bookingRef} · ${companyName}`, html });
}

// ── Visit rejection email — sent to walk-in visitor when rejected ─────────
async function sendVisitRejectionEmail({ visitorName, visitorEmail, companyName, refNumber, employeeName, serviceName, reason }) {
  if (!visitorEmail) return { sent: false };
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:36px 40px;text-align:center;">
            <p style="margin:0;font-size:32px;">❌</p>
            <h1 style="margin:12px 0 4px;color:#fff;font-size:22px;font-weight:700;">Visit Could Not Be Processed</h1>
            <p style="margin:0;color:rgba(255,255,255,.8);font-size:14px;">${companyName}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;color:#374151;font-size:15px;">Hi <strong>${visitorName}</strong>,</p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
              We're sorry, but your visit${refNumber ? ` (Ref: <strong>${refNumber}</strong>)` : ''} at <strong>${companyName}</strong> could not be processed at this time.
            </p>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                ${refNumber ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:130px;">Ref #</td><td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;font-family:monospace;">${refNumber}</td></tr>` : ''}
                ${serviceName ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;border-top:1px solid #fee2e2;">Service</td><td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;border-top:1px solid #fee2e2;">${serviceName}</td></tr>` : ''}
                ${employeeName ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;border-top:1px solid #fee2e2;">Associate</td><td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;border-top:1px solid #fee2e2;">${employeeName}</td></tr>` : ''}
                ${reason ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;border-top:1px solid #fee2e2;vertical-align:top;">Reason</td><td style="padding:6px 0;color:#111827;font-size:13px;border-top:1px solid #fee2e2;">${reason}</td></tr>` : ''}
              </table>
            </div>
            <p style="margin:0 0 8px;color:#6b7280;font-size:14px;line-height:1.6;">
              Please contact <strong>${companyName}</strong> directly or visit again to reschedule.
            </p>
            <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">If you believe this is an error, please contact the front desk.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} ${companyName}. Powered by ${APP_NAME}.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendMail({ to: visitorEmail, subject: `Visit Update — ${companyName}`, html });
}

// ── Appointment cancellation email — sent when admin cancels a booking ─────
async function sendBookingCancellationEmail({ visitorName, visitorEmail, companyName, bookingRef, scheduledDate, scheduledTime, employeeName, serviceName, adminNotes }) {
  if (!visitorEmail) return { sent: false };

  function fmt12(t) {
    if (!t) return '';
    const [h, m] = String(t).slice(0, 5).split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }
  function fmtDate(d) {
    if (!d) return '';
    const [y, mo, day] = d.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${day} ${months[parseInt(mo) - 1]} ${y}`;
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:36px 40px;text-align:center;">
            <p style="margin:0;font-size:32px;">⚠️</p>
            <h1 style="margin:12px 0 4px;color:#fff;font-size:22px;font-weight:700;">Appointment Cancelled</h1>
            <p style="margin:0;color:rgba(255,255,255,.8);font-size:14px;">${companyName}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;color:#374151;font-size:15px;">Hi <strong>${visitorName}</strong>,</p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
              Your appointment at <strong>${companyName}</strong> has been cancelled. Details below:
            </p>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:130px;">Booking Ref</td><td style="padding:8px 0;color:#92400e;font-size:14px;font-weight:700;font-family:monospace;">${bookingRef}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #fde68a;">Date</td><td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;border-top:1px solid #fde68a;">${fmtDate(scheduledDate)}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #fde68a;">Time</td><td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;border-top:1px solid #fde68a;">${fmt12(scheduledTime)}</td></tr>
                ${serviceName ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #fde68a;">Service</td><td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;border-top:1px solid #fde68a;">${serviceName}</td></tr>` : ''}
                ${employeeName ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #fde68a;">Doctor / Associate</td><td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;border-top:1px solid #fde68a;">${employeeName}</td></tr>` : ''}
                ${adminNotes ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #fde68a;vertical-align:top;">Note</td><td style="padding:8px 0;color:#111827;font-size:13px;border-top:1px solid #fde68a;">${adminNotes}</td></tr>` : ''}
              </table>
            </div>
            <p style="margin:0 0 8px;color:#6b7280;font-size:14px;line-height:1.6;">
              Please book a new appointment or contact <strong>${companyName}</strong> directly for assistance.
            </p>
            <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">If you believe this is an error, please contact the front desk.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} ${companyName}. Powered by ${APP_NAME}.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendMail({ to: visitorEmail, subject: `Appointment Cancelled — ${bookingRef} · ${companyName}`, html });
}

// ── Appointment reminder — sent to associate the evening before ───────────────
async function sendAppointmentReminderEmail({ employeeName, employeeEmail, companyName, date, appointments }) {
  if (!employeeEmail) return { sent: false };

  function fmt12(t) {
    if (!t) return '';
    const [h, m] = String(t).slice(0, 5).split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }
  function fmtDate(d) {
    if (!d) return '';
    const [y, mo, day] = d.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${day} ${months[parseInt(mo) - 1]} ${y}`;
  }

  const rows = appointments.map(a => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#4f46e5;font-weight:700;font-size:14px;white-space:nowrap;">${fmt12(a.time)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;">${a.visitor_name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${a.service_name || a.purpose || '—'}</td>
    </tr>`).join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:28px;">📅</p>
            <h1 style="margin:10px 0 4px;color:#fff;font-size:20px;font-weight:700;">Tomorrow's Appointments</h1>
            <p style="margin:0;color:rgba(255,255,255,.8);font-size:14px;">${companyName} · ${fmtDate(date)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px;">
            <p style="margin:0 0 20px;color:#374151;font-size:15px;">Hi <strong>${employeeName}</strong>,</p>
            <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6;">
              You have <strong>${appointments.length} appointment${appointments.length > 1 ? 's' : ''}</strong> scheduled for tomorrow. Here's your schedule:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Time</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Visitor</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Service / Purpose</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="margin:0;color:#9ca3af;font-size:12px;">Please ensure you are available at the scheduled times. Log in to the app for full details.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} ${companyName}. Powered by ${APP_NAME}.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendMail({
    to: employeeEmail,
    subject: `${appointments.length} Appointment${appointments.length > 1 ? 's' : ''} Tomorrow — ${fmtDate(date)} · ${companyName}`,
    html,
  });
}

module.exports = { sendMail, sendVerificationEmail, sendUserInvitation, sendPasswordResetOTP, sendBookingConfirmationEmail, sendVisitRejectionEmail, sendBookingCancellationEmail, sendAppointmentReminderEmail };
