const router = require('express').Router();
const {
  createOrder, verifyPayment,
  getPlan, createPlanOrder, verifyPlanPayment,
  getLedger,
} = require('../controllers/billingController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate, requireRole('company_admin'));

// Token top-ups
router.post('/create-order', createOrder);
router.post('/verify',       verifyPayment);

// Subscription plans
router.get('/plan',                getPlan);
router.post('/plan/create-order',  createPlanOrder);
router.post('/plan/verify',        verifyPlanPayment);

// Ledger
router.get('/ledger', getLedger);

module.exports = router;
