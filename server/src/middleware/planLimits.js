const { pool } = require('../config/database');

const LIMITS = {
  starter: { associates: 1,  services: 1  },
  pro:     { associates: 15, services: 15 },
  gold:    { associates: null, services: null },
};

async function getEffectivePlan(companyId) {
  const [[co]] = await pool.query(
    'SELECT plan, plan_expires_at FROM companies WHERE id = ?',
    [companyId]
  );
  if (!co || !co.plan || co.plan === 'starter') return 'starter';
  if (co.plan_expires_at && new Date(co.plan_expires_at) < new Date()) {
    pool.query("UPDATE companies SET plan = 'starter' WHERE id = ?", [companyId]).catch(() => {});
    return 'starter';
  }
  return co.plan;
}

async function checkAssociateLimit(req, res, next) {
  if (req.method !== 'POST') return next();
  try {
    const plan  = await getEffectivePlan(req.user.company_id);
    const limit = LIMITS[plan]?.associates;
    if (limit == null) return next();
    const [[{ count }]] = await pool.query(
      "SELECT COUNT(*) AS count FROM employees WHERE company_id = ? AND status != 'inactive'",
      [req.user.company_id]
    );
    if (count >= limit) {
      return res.status(403).json({
        message: `Your ${plan} plan allows up to ${limit} associate${limit === 1 ? '' : 's'}. Upgrade your plan to add more.`,
        upgrade_required: true,
        current_plan: plan,
      });
    }
    next();
  } catch {
    next();
  }
}

async function checkServiceLimit(req, res, next) {
  if (req.method !== 'POST') return next();
  try {
    const plan  = await getEffectivePlan(req.user.company_id);
    const limit = LIMITS[plan]?.services;
    if (limit == null) return next();
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) AS count FROM services WHERE company_id = ? AND is_active = 1',
      [req.user.company_id]
    );
    if (count >= limit) {
      return res.status(403).json({
        message: `Your ${plan} plan allows up to ${limit} service${limit === 1 ? '' : 's'}. Upgrade your plan to add more.`,
        upgrade_required: true,
        current_plan: plan,
      });
    }
    next();
  } catch {
    next();
  }
}

module.exports = { checkAssociateLimit, checkServiceLimit, LIMITS };
