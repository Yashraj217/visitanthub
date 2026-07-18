/**
 * WhatsApp notification service.
 * Supports Twilio and Meta Cloud API using the company's stored credentials.
 *
 * Meta provider: uses pre-approved message templates (business-initiated messages
 * require templates — plain text only works within a 24-hour customer service window).
 *
 * Required Meta templates (create in Meta Business Manager → WhatsApp Manager → Message Templates):
 *
 * Template: visit_arrival_notification  (Category: Utility)
 *   Body: Hello {{1}}, {{2}} ({{3}}) would like to meet you.\nVisit Time: {{4}}\nPurpose: {{5}}\n\nPlease be ready at your workstation.
 *   Variables: 1=associate name, 2=visitor name, 3=visitor mobile, 4=visit time, 5=purpose
 *
 * Template: visit_approved_notification  (Category: Utility)
 *   Body: Hello {{1}},\nYour turn has arrived. Please meet {{2}}.\nOrder No: {{3}}\nLocation: {{4}}\nKindly proceed to the designated area. Thank you!
 *   Variables: 1=visitor name, 2=associate name+designation, 3=token/ref, 4=location
 *
 * Template: booking_confirmation  (Category: Utility)
 *   Body: Hello {{1}}, your appointment has been booked!\n\nRef: {{2}}\nDate: {{3}}\nTime: {{4}}\nAssociate: {{5}}\nService: {{6}}\n\nYour booking is pending approval. You will be notified once confirmed.
 *   Variables: 1=visitor name, 2=booking_ref, 3=date, 4=time, 5=associate, 6=service
 *
 * Template: visitor_checkin_confirmation  (Category: Utility)
 *   Body: Hello {{1}}, you have successfully checked in at {{2}}!\n\nRef: {{3}}\nAssociate: {{4}}\nService: {{5}}\nVisitors ahead: {{6}}\n\nYou will be notified once your visit is approved.
 *   Variables: 1=visitor name, 2=company name, 3=ref_number, 4=associate name, 5=service, 6=queue ahead
 */

const { pool } = require('../config/database');

function deductToken(companyId, { recipient, messageType, description } = {}) {
  if (!companyId) return;
  pool.query('UPDATE companies SET whatsapp_tokens = GREATEST(0, whatsapp_tokens - 1) WHERE id = ?', [companyId])
    .then(() => pool.query('SELECT whatsapp_tokens FROM companies WHERE id = ?', [companyId]))
    .then(([[co]]) => pool.query(
      `INSERT INTO token_ledger (company_id, type, amount, balance_after, description, recipient, message_type)
       VALUES (?, 'debit', 1, ?, ?, ?, ?)`,
      [companyId, co.whatsapp_tokens, description || 'WhatsApp message sent', recipient || null, messageType || null]
    ))
    .catch(() => {});
}

function tokenGuard(company) {
  if (company.whatsapp_tokens !== undefined && company.whatsapp_tokens <= 0)
    return { sent: false, reason: 'no_tokens' };
  return null;
}

// ── Twilio send (plain text — Twilio sandbox supports free-form) ────────────

async function sendViaTwilio({ company, phone, message, description, messageType }) {
  try {
    const [sid, token] = company.whatsapp_api_key.split('|');
    const twilio = require('twilio')(sid, token);
    await twilio.messages.create({
      from: company.whatsapp_from || process.env.TWILIO_WHATSAPP_FROM,
      to:   `whatsapp:+91${phone}`,
      body: message,
    });
    deductToken(company.id, { recipient: phone, messageType, description });
    return { sent: true };
  } catch (err) {
    console.error('[WhatsApp Twilio error]', err.message);
    return { sent: false, reason: err.message };
  }
}

// ── Meta send (template messages required for business-initiated) ───────────

async function sendViaMetaTemplate({ company, phone, templateName, parameters, description, language }) {
  try {
    const axios = require('axios');
    const rawKey = company.whatsapp_provider === 'visitanthub'
      ? process.env.VH_WHATSAPP_API_KEY
      : company.whatsapp_api_key;
    const [token, phoneNumberId] = rawKey.split('|');
    await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: `91${phone}`,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language || 'en_US' },
          components: [
            {
              type: 'body',
              parameters: parameters.map(text => ({ type: 'text', text: String(text) })),
            },
          ],
        },
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    deductToken(company.id, { recipient: phone, messageType: templateName, description: description || `WhatsApp: ${templateName}` });
    return { sent: true };
  } catch (err) {
    console.error('[WhatsApp Meta error]', err.response?.data || err.message);
    return { sent: false, reason: err.response?.data?.error?.message || err.message };
  }
}

// ── Notification: new visit → notify associate ──────────────────────────────

async function sendVisitNotification({ company, employee, visitor, visit }) {
  if (!company.notif_associate_arrival && company.notif_associate_arrival !== undefined)
    return { sent: false, reason: 'disabled' };
  const tg = tokenGuard(company); if (tg) return tg;
  const isManaged = company.whatsapp_provider === 'visitanthub';
  if (company.whatsapp_provider === 'none' || (!isManaged && !company.whatsapp_api_key)) {
    console.log('[WhatsApp SKIPPED] No provider configured.');
    return { sent: false, reason: 'no_provider' };
  }

  const visitTime = new Date(visit.visit_time).toLocaleString('en-IN');
  const purpose   = visit.purpose || visit.service_name || '—';

  if (company.whatsapp_provider === 'twilio') {
    const message =
      `Hello ${employee.name},\n\n` +
      `*${visitor.name}* (${visitor.mobile}) would like to meet you.\n` +
      `Visit Time: ${visitTime}\n` +
      `Purpose: ${purpose}\n\n` +
      `Please be ready at your workstation.\n\n` +
      `— ${company.name} Visitor Management`;
    return sendViaTwilio({ company, phone: employee.phone, message, description: 'Visit arrival → associate', messageType: 'visit_arrival_notification' });
  }

  if (company.whatsapp_provider === 'meta' || isManaged) {
    return sendViaMetaTemplate({
      company,
      phone:        employee.phone,
      templateName: 'visit_arrival_notification',
      parameters:   [
        employee.name,
        visitor.name,
        visitor.mobile,
        visitTime,
        purpose,
      ],
    });
  }

  return { sent: false, reason: 'unsupported_provider' };
}

// ── Notification: visit approved → notify visitor ───────────────────────────

async function sendApprovalNotification({ company, employee, visitor, visit }) {
  if (!company.notif_visit_approved && company.notif_visit_approved !== undefined)
    return { sent: false, reason: 'disabled' };
  const tg = tokenGuard(company); if (tg) return tg;
  const isManaged = company.whatsapp_provider === 'visitanthub';
  if (company.whatsapp_provider === 'none' || (!isManaged && !company.whatsapp_api_key)) {
    console.log('[WhatsApp SKIPPED] No provider configured.');
    return { sent: false, reason: 'no_provider' };
  }

  const location    = employee.location || 'Reception';
  const token       = visit.ref_number || String(visit.id);
  const assocLabel  = employee.designation
    ? `${employee.name} (${employee.designation})`
    : employee.name;

  if (company.whatsapp_provider === 'twilio') {
    const message =
      `Hello ${visitor.name},\n\n` +
      `✅ Your visit has been approved! You can now meet *${assocLabel}*.\n\n` +
      `🎫 Order No: *${token}*\n` +
      `📍 Location: ${location}\n\n` +
      `Please proceed to the designated area. Thank you for visiting us.`;
    return sendViaTwilio({ company, phone: visitor.mobile, message, description: 'Visit approved → visitor', messageType: 'visit_approved_notification' });
  }

  if (company.whatsapp_provider === 'meta' || isManaged) {
    return sendViaMetaTemplate({
      company,
      phone:        visitor.mobile,
      templateName: 'visit_approved_notification',
      parameters:   [
        visitor.name,
        assocLabel,
        token,
        location,
      ],
    });
  }

  return { sent: false, reason: 'unsupported_provider' };
}

// ── Notification: appointment booked → confirm to visitor ───────────────────

async function sendBookingConfirmation({ company, booking }) {
  if (!company.notif_booking_confirmed && company.notif_booking_confirmed !== undefined)
    return { sent: false, reason: 'disabled' };
  const tg = tokenGuard(company); if (tg) return tg;
  if (company.whatsapp_provider === 'none' || !company.whatsapp_api_key) {
    return { sent: false, reason: 'no_provider' };
  }

  const dateStr    = new Date(booking.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr    = booking.scheduled_time?.slice(0, 5) || '—';
  const associate  = booking.employee_name || 'To be assigned';
  const service    = booking.service_name  || '—';

  if (company.whatsapp_provider === 'twilio') {
    const message =
      `Hello ${booking.visitor_name},\n\n` +
      `✅ Your appointment has been booked!\n\n` +
      `📋 Ref: *${booking.booking_ref}*\n` +
      `📅 Date: ${dateStr}\n` +
      `⏰ Time: ${timeStr}\n` +
      `👨‍⚕️ Associate: ${associate}\n` +
      `🏥 Service: ${service}\n\n` +
      `Your booking is *pending approval*. You will be notified once confirmed.\n\n` +
      `— ${company.name}`;
    return sendViaTwilio({ company, phone: booking.visitor_mobile, message, description: 'Booking confirmation → visitor', messageType: 'booking_confirmation' });
  }

  if (company.whatsapp_provider === 'meta' || isManaged) {
    return sendViaMetaTemplate({
      company,
      phone:        booking.visitor_mobile,
      templateName: 'booking_confirmation',
      parameters:   [
        booking.visitor_name,
        booking.booking_ref,
        dateStr,
        timeStr,
        associate,
        service,
      ],
    });
  }

  return { sent: false, reason: 'unsupported_provider' };
}

// ── Notification: visitor checked in → confirm to visitor ───────────────────

async function sendCheckInConfirmation({ company, visitor, visit, employee, queueAhead }) {
  if (!company.notif_visitor_checkin && company.notif_visitor_checkin !== undefined)
    return { sent: false, reason: 'disabled' };
  const tg = tokenGuard(company); if (tg) return tg;
  if (company.whatsapp_provider === 'none' || !company.whatsapp_api_key) {
    return { sent: false, reason: 'no_provider' };
  }

  const ref       = visit.ref_number || String(visit.id);
  const assoc     = employee?.name ? `${employee.name}${employee.designation ? ` (${employee.designation})` : ''}` : 'To be assigned';
  const service   = visit.service_name || visit.purpose || '—';
  const ahead     = Number(queueAhead) || 0;

  if (company.whatsapp_provider === 'twilio') {
    const message =
      `Hello ${visitor.name},\n\n` +
      `✅ You have successfully checked in at *${company.name}*!\n\n` +
      `📋 Ref: *${ref}*\n` +
      `👨‍⚕️ Associate: ${assoc}\n` +
      `🏥 Service: ${service}\n` +
      `👥 Visitors ahead: ${ahead}\n\n` +
      `You will be notified once your visit is approved.\n\n` +
      `— ${company.name}`;
    return sendViaTwilio({ company, phone: visitor.mobile, message, description: 'Check-in confirmation → visitor', messageType: 'visitor_checkin_confirmation' });
  }

  if (company.whatsapp_provider === 'meta' || isManaged) {
    return sendViaMetaTemplate({
      company,
      phone:        visitor.mobile,
      templateName: 'visitor_checkin_confirmation',
      parameters:   [
        visitor.name,
        company.name,
        ref,
        assoc,
        service,
        String(ahead),
      ],
    });
  }

  return { sent: false, reason: 'unsupported_provider' };
}

// ── Notification: revisit reminder → visitor ─────────────────────────────────

async function sendRevisitReminder({ company, visitor, dateStr, associateName }) {
  const tg = tokenGuard(company); if (tg) return tg;
  const isManaged = company.whatsapp_provider === 'visitanthub';
  if (company.whatsapp_provider === 'none' || (!isManaged && !company.whatsapp_api_key)) {
    return { sent: false, reason: 'no_provider' };
  }

  const contactInfo = company.phone ? `${company.name}, ${company.phone}` : company.name;
  const senderName  = associateName || company.name;

  if (company.whatsapp_provider === 'twilio') {
    const message =
      `Hello ${visitor.name},\n\n` +
      `This is a friendly reminder from *${senderName}* that your next visit is scheduled for *${dateStr}*.\n\n` +
      `${contactInfo}. We look forward to seeing you!`;
    return sendViaTwilio({ company, phone: visitor.mobile, message, description: 'Revisit reminder → visitor', messageType: 'revisit_reminder' });
  }

  if (company.whatsapp_provider === 'meta' || isManaged) {
    return sendViaMetaTemplate({
      company,
      phone:        visitor.mobile,
      templateName: 'revisit_reminder',
      parameters:   [visitor.name, senderName, dateStr, contactInfo],
      description:  'Revisit reminder → visitor',
    });
  }

  return { sent: false, reason: 'unsupported_provider' };
}

module.exports = { sendVisitNotification, sendApprovalNotification, sendBookingConfirmation, sendCheckInConfirmation, sendRevisitReminder };
