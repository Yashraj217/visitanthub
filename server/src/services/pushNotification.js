const https = require('https');

function sendExpoPush({ token, title, body, data }) {
  const payload = JSON.stringify({ to: token, title, body, data: data || {}, sound: 'default' });
  const req = https.request({
    hostname: 'exp.host',
    path: '/--/api/v2/push/send',
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  }, res => {
    let raw = '';
    res.on('data', chunk => { raw += chunk; });
    res.on('end', () => {
      if (res.statusCode !== 200) console.error('[ExpoPush] HTTP', res.statusCode, raw);
    });
  });
  req.on('error', err => console.error('[ExpoPush] Error:', err.message));
  req.write(payload);
  req.end();
}

module.exports = { sendExpoPush };
