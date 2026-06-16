const router = require('express').Router();
const ctrl = require('../controllers/designationController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate, requireRole('company_admin', 'super_admin'));
router.get('/',      ctrl.list);
router.post('/',     ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;
