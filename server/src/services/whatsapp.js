/**
 * WhatsApp notification service.
 * Currently a placeholder — wire up Twilio or Meta Cloud API using
 * the company's stored credentials (provider + api_key + from number).
 */
async function sendVisitNotification({ company, employee, visitor, visit }) {
  const message =
    `Hello ${employee.name},\n\n` +
    `*${visitor.name}* (${visitor.mobile}) would like to meet you.\n` +
    `Visit Time: ${new Date(visit.visit_time).toLocaleString('en-IN')}\n` +
    (visit.purpose ? `Purpose: ${visit.purpose}\n` : '') +
    `\nPlease respond to confirm your availability.\n\n` +
    `— ${company.name} Visitor Management`;

  if (company.whatsapp_provider === 'none' || !company.whatsapp_api_key) {
    console.log('[WhatsApp SKIPPED] No provider configured.');
    console.log('[WhatsApp MSG]', message);
    return { sent: false, reason: 'no_provider' };
  }

  if (company.whatsapp_provider === 'twilio') {
    return sendViaTwilio({ company, employee, message });
  }

  if (company.whatsapp_provider === 'meta') {
    return sendViaMeta({ company, employee, message });
  }

  return { sent: false, reason: 'unsupported_provider' };
}

async function sendViaTwilio({ company, employee, message }) {
  try {
    const [sid, token] = company.whatsapp_api_key.split('|');
    const twilio = require('twilio')(sid, token);
    await twilio.messages.create({
      from: company.whatsapp_from || process.env.TWILIO_WHATSAPP_FROM,
      to:   `whatsapp:+91${employee.phone}`,
      body: message,
    });
    return { sent: true };
  } catch (err) {
    console.error('[WhatsApp Twilio error]', err.message);
    return { sent: false, reason: err.message };
  }
}

async function sendViaMeta({ company, employee, message }) {
  try {
    const axios = require('axios');
    const [token, phoneNumberId] = company.whatsapp_api_key.split('|');
    await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: `91${employee.phone}`,
        type: 'text',
        text: { body: message },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { sent: true };
  } catch (err) {
    console.error('[WhatsApp Meta error]', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendVisitNotification };
