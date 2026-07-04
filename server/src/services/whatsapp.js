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
 *   Body: Hello {{1}}, Your visit has been approved!\n\nYou may now proceed to meet {{2}} ({{3}}).\nLocation: {{4}}\nService: {{5}}\nRef: {{6}}
 *   Variables: 1=visitor name, 2=associate name, 3=designation, 4=location, 5=service, 6=ref
 *
 * Template: booking_confirmation  (Category: Utility)
 *   Body: Hello {{1}}, your appointment has been booked!\n\nRef: {{2}}\nDate: {{3}}\nTime: {{4}}\nAssociate: {{5}}\nService: {{6}}\n\nYour booking is pending approval. You will be notified once confirmed.
 *   Variables: 1=visitor name, 2=booking_ref, 3=date, 4=time, 5=associate, 6=service
 *
 * Template: visitor_checkin_confirmation  (Category: Utility)
 *   Body: Hello {{1}}, you have successfully checked in at {{2}}!\n\nRef: {{3}}\nAssociate: {{4}}\nService: {{5}}\nVisitors ahead: {{6}}\n\nYou will be notified once your visit is approved.
 *   Variables: 1=visitor name, 2=company name, 3=ref_number, 4=associate name, 5=service, 6=queue ahead
 */

// ── Twilio send (plain text — Twilio sandbox supports free-form) ────────────

async function sendViaTwilio({ company, phone, message }) {
  try {
    const [sid, token] = company.whatsapp_api_key.split('|');
    const twilio = require('twilio')(sid, token);
    await twilio.messages.create({
      from: company.whatsapp_from || process.env.TWILIO_WHATSAPP_FROM,
      to:   `whatsapp:+91${phone}`,
      body: message,
    });
    return { sent: true };
  } catch (err) {
    console.error('[WhatsApp Twilio error]', err.message);
    return { sent: false, reason: err.message };
  }
}

// ── Meta send (template messages required for business-initiated) ───────────

async function sendViaMetaTemplate({ company, phone, templateName, parameters }) {
  try {
    const axios = require('axios');
    const [token, phoneNumberId] = company.whatsapp_api_key.split('|');
    await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: `91${phone}`,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
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
    return { sent: true };
  } catch (err) {
    console.error('[WhatsApp Meta error]', err.response?.data || err.message);
    return { sent: false, reason: err.response?.data?.error?.message || err.message };
  }
}

// ── Notification: new visit → notify associate ──────────────────────────────

async function sendVisitNotification({ company, employee, visitor, visit }) {
  if (company.whatsapp_provider === 'none' || !company.whatsapp_api_key) {
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
    return sendViaTwilio({ company, phone: employee.phone, message });
  }

  if (company.whatsapp_provider === 'meta') {
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
  if (company.whatsapp_provider === 'none' || !company.whatsapp_api_key) {
    console.log('[WhatsApp SKIPPED] No provider configured.');
    return { sent: false, reason: 'no_provider' };
  }

  const location    = employee.location || 'Reception';
  const serviceName = visit.service_name || visit.purpose || '—';
  const ref         = visit.ref_number || String(visit.id);
  const designation = employee.designation || 'Associate';

  if (company.whatsapp_provider === 'twilio') {
    const message =
      `Hello ${visitor.name},\n\n` +
      `✅ Your visit has been *approved*!\n\n` +
      `You may now proceed to meet *${employee.name}* (${designation}).\n` +
      `📍 Location: ${location}\n` +
      `Service: ${serviceName}\n` +
      `Ref: ${ref}\n\n` +
      `— ${company.name}`;
    return sendViaTwilio({ company, phone: visitor.mobile, message });
  }

  if (company.whatsapp_provider === 'meta') {
    return sendViaMetaTemplate({
      company,
      phone:        visitor.mobile,
      templateName: 'visit_approved_notification',
      parameters:   [
        visitor.name,
        employee.name,
        designation,
        location,
        serviceName,
        ref,
      ],
    });
  }

  return { sent: false, reason: 'unsupported_provider' };
}

// ── Notification: appointment booked → confirm to visitor ───────────────────

async function sendBookingConfirmation({ company, booking }) {
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
    return sendViaTwilio({ company, phone: booking.visitor_mobile, message });
  }

  if (company.whatsapp_provider === 'meta') {
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
    return sendViaTwilio({ company, phone: visitor.mobile, message });
  }

  if (company.whatsapp_provider === 'meta') {
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

module.exports = { sendVisitNotification, sendApprovalNotification, sendBookingConfirmation, sendCheckInConfirmation };
