const router = require('express').Router();
const ctrl = require('../controllers/departmentController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate, requireRole('company_admin'));

router.get('/',     ctrl.list);
router.post('/',    ctrl.create);
router.put('/:id',  ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
