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

// ── Welcome email — sent when a new company registers ──────────────────────
async function sendWelcomeEmail({ companyName, adminName, adminEmail }) {
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
            <p style="margin:0;font-size:32px;">👋</p>
            <h1 style="margin:12px 0 4px;color:#fff;font-size:22px;font-weight:700;">Welcome to ${APP_NAME}!</h1>
            <p style="margin:0;color:rgba(255,255,255,.8);font-size:14px;">Your account has been submitted for review</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${adminName}</strong>,</p>
            <p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.6;">
              Thank you for registering <strong>${companyName}</strong> on ${APP_NAME}. Your account is currently under review by our team.
            </p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
              You will receive another email once your account is approved and ready to use.
            </p>
            <div style="background:#f0f0ff;border-left:4px solid #6366f1;border-radius:6px;padding:16px 20px;margin-bottom:28px;">
              <p style="margin:0;color:#4338ca;font-size:13px;font-weight:600;">What happens next?</p>
              <ul style="margin:8px 0 0;padding-left:18px;color:#6b7280;font-size:13px;line-height:1.8;">
                <li>Our team will review your registration</li>
                <li>You'll be notified by email once approved</li>
                <li>Log in at <a href="${CLIENT_URL}/login" style="color:#6366f1;">${CLIENT_URL}/login</a></li>
              </ul>
            </div>
            <p style="margin:0;color:#9ca3af;font-size:12px;">If you did not register, please ignore this email.</p>
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
  return sendMail({ to: adminEmail, subject: `Welcome to ${APP_NAME} — Account Pending Approval`, html });
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

module.exports = { sendWelcomeEmail, sendUserInvitation, sendPasswordResetOTP };
