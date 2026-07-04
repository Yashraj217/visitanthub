const router = require('express').Router();
const { getStages, saveStages } = require('../controllers/stageController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/',  getStages);
router.put('/',  requireRole('company_admin'), saveStages);

module.exports = router;
