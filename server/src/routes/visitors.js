const router = require('express').Router();
const ctrl = require('../controllers/visitorController');
const { authenticate, requireRole } = require('../middleware/auth');

// Public visitor-facing routes (no auth)
router.get('/office/:slug',              ctrl.getCompanyBySlug);
router.post('/office/:slug/check-mobile', ctrl.checkMobile);
router.post('/office/:slug/visit',        ctrl.registerVisit);

// Company admin: view visitors
router.get('/', authenticate, requireRole('company_admin'), ctrl.listVisitors);

// Admin + associate: visitor profile + full visit history
router.get('/:visitor_id/visits', authenticate, requireRole('company_admin', 'company_user'), ctrl.getVisitorHistory);

module.exports = router;
