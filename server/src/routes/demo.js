const router = require('express').Router();
const ctrl = require('../controllers/demoController');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/',  ctrl.requestDemo);
router.get('/',   authenticate, requireRole('super_admin'), ctrl.listDemoRequests);

module.exports = router;
