const Razorpay = require('razorpay');
const crypto   = require('crypto');
const { pool } = require('../config/database');

const rp = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Token top-up packages
const TOKEN_PACKS = {
  500:  { price: 499,  label: 'Value Pack'    },
  1000: { price: 999,  label: 'Standard Pack' },
  2500: { price: 2499, label: 'Premium Pack'  },
};

// Monthly subscription plans
const SUBSCRIPTION_PLANS = {
  pro:  { price: 999,  label: 'Pro',  tokens: 300  },
  gold: { price: 2499, label: 'Gold', tokens: 1000 },
};

// Ensure DB columns exist on startup
pool.query(`
  CREATE TABLE IF NOT EXISTS token_ledger (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    company_id   INT NOT NULL,
    type         ENUM('credit','debit') NOT NULL,
    amount       INT NOT NULL,
    balance_after INT NOT NULL,
    description  VARCHAR(255) NOT NULL,
    reference_id VARCHAR(100),
    recipient    VARCHAR(100),
    message_type VARCHAR(80),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_company (company_id),
    INDEX idx_created (created_at)
  )
`).catch(console.error);

pool.query(`ALTER TABLE companies ADD COLUMN plan ENUM('starter','pro','gold') NOT NULL DEFAULT 'starter'`).catch(() => {});
pool.query(`ALTER TABLE companies ADD COLUMN plan_expires_at DATETIME NULL`).catch(() => {});

// ── Token top-up ──────────────────────────────────────────────────────────────

async function createOrder(req, res) {
  const tokens = Number(req.body.tokens);
  const pack   = TOKEN_PACKS[tokens];
  if (!pack) return res.status(400).json({ message: 'Invalid token pack' });

  try {
    const order = await rp.orders.create({
      amount:   pack.price * 100,
      currency: 'INR',
      receipt:  `topup_${req.user.company_id}_${Date.now()}`,
      notes:    { company_id: String(req.user.company_id), tokens: String(tokens) },
    });
    res.json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('Razorpay order error:', err);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
}

async function verifyPayment(req, res) {
  const { order_id, payment_id, signature, tokens } = req.body;

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');

  if (expected !== signature) {
    return res.status(400).json({ message: 'Payment verification failed — signature mismatch' });
  }

  const pack = TOKEN_PACKS[Number(tokens)];
  if (!pack) return res.status(400).json({ message: 'Invalid token pack' });

  try {
    await pool.query(
      'UPDATE companies SET whatsapp_tokens = whatsapp_tokens + ? WHERE id = ?',
      [Number(tokens), req.user.company_id]
    );
    const [[co]] = await pool.query('SELECT whatsapp_tokens FROM companies WHERE id = ?', [req.user.company_id]);

    await pool.query(
      `INSERT INTO token_ledger (company_id, type, amount, balance_after, description, reference_id)
       VALUES (?, 'credit', ?, ?, ?, ?)`,
      [req.user.company_id, Number(tokens), co.whatsapp_tokens, `Token top-up — ${pack.label}`, payment_id]
    );

    res.json({ success: true, whatsapp_tokens: co.whatsapp_tokens });
  } catch (err) {
    console.error('Token credit error:', err);
    res.status(500).json({ message: 'Payment verified but failed to credit tokens. Contact support@visitanthub.com.' });
  }
}

// ── Subscription plan ─────────────────────────────────────────────────────────

async function getPlan(req, res) {
  try {
    const [[co]] = await pool.query(
      'SELECT plan, plan_expires_at, whatsapp_tokens FROM companies WHERE id = ?',
      [req.user.company_id]
    );
    let plan = co?.plan || 'starter';
    if (plan !== 'starter' && co.plan_expires_at && new Date(co.plan_expires_at) < new Date()) {
      await pool.query("UPDATE companies SET plan = 'starter' WHERE id = ?", [req.user.company_id]);
      plan = 'starter';
    }
    res.json({
      plan,
      plan_expires_at:  plan === 'starter' ? null : co.plan_expires_at,
      whatsapp_tokens:  co?.whatsapp_tokens ?? 0,
    });
  } catch (err) {
    console.error('getPlan error:', err);
    res.status(500).json({ message: 'Failed to fetch plan info' });
  }
}

async function createPlanOrder(req, res) {
  const { plan } = req.body;
  const planInfo = SUBSCRIPTION_PLANS[plan];
  if (!planInfo) return res.status(400).json({ message: 'Invalid plan' });

  try {
    const order = await rp.orders.create({
      amount:   planInfo.price * 100,
      currency: 'INR',
      receipt:  `plan_${plan}_${req.user.company_id}_${Date.now()}`,
      notes:    { company_id: String(req.user.company_id), plan_type: plan },
    });
    res.json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('Razorpay plan order error:', err);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
}

async function verifyPlanPayment(req, res) {
  const { order_id, payment_id, signature, plan } = req.body;

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');

  if (expected !== signature) {
    return res.status(400).json({ message: 'Payment verification failed' });
  }

  const planInfo = SUBSCRIPTION_PLANS[plan];
  if (!planInfo) return res.status(400).json({ message: 'Invalid plan' });

  try {
    const [[co]] = await pool.query(
      'SELECT plan, plan_expires_at, whatsapp_tokens FROM companies WHERE id = ?',
      [req.user.company_id]
    );

    // Extend from current expiry if renewing the same plan and not yet expired
    const now          = new Date();
    const currentExpiry = co.plan_expires_at ? new Date(co.plan_expires_at) : now;
    const base         = (co.plan === plan && currentExpiry > now) ? currentExpiry : now;
    const expiresAt    = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      'UPDATE companies SET plan = ?, plan_expires_at = ? WHERE id = ?',
      [plan, expiresAt, req.user.company_id]
    );

    // Credit WhatsApp tokens for Gold plan
    if (planInfo.tokens > 0) {
      await pool.query(
        'UPDATE companies SET whatsapp_tokens = whatsapp_tokens + ? WHERE id = ?',
        [planInfo.tokens, req.user.company_id]
      );
      const [[updated]] = await pool.query('SELECT whatsapp_tokens FROM companies WHERE id = ?', [req.user.company_id]);
      await pool.query(
        `INSERT INTO token_ledger (company_id, type, amount, balance_after, description, reference_id)
         VALUES (?, 'credit', ?, ?, ?, ?)`,
        [req.user.company_id, planInfo.tokens, updated.whatsapp_tokens, `${planInfo.label} Plan — monthly tokens included`, payment_id]
      );
    }

    const [[final]] = await pool.query(
      'SELECT plan, plan_expires_at, whatsapp_tokens FROM companies WHERE id = ?',
      [req.user.company_id]
    );
    res.json({ success: true, plan: final.plan, plan_expires_at: final.plan_expires_at, whatsapp_tokens: final.whatsapp_tokens });
  } catch (err) {
    console.error('Plan activation error:', err);
    res.status(500).json({ message: 'Payment verified but plan activation failed. Contact support@visitanthub.com.' });
  }
}

// ── Ledger ────────────────────────────────────────────────────────────────────

async function getLedger(req, res) {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  try {
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM token_ledger WHERE company_id = ?',
      [req.user.company_id]
    );
    const [rows] = await pool.query(
      `SELECT id, type, amount, balance_after, description, reference_id, recipient, message_type, created_at
       FROM token_ledger WHERE company_id = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [req.user.company_id, limit, offset]
    );
    res.json({ entries: rows, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Ledger fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch ledger' });
  }
}

module.exports = { createOrder, verifyPayment, getPlan, createPlanOrder, verifyPlanPayment, getLedger };
