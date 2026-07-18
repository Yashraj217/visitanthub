const router = require('express').Router();
const ctrl = require('../controllers/employeeController');
const { authenticate, requireRole } = require('../middleware/auth');
const { checkAssociateLimit } = require('../middleware/planLimits');

router.use(authenticate, requireRole('company_admin', 'super_admin'));

router.get('/',                    ctrl.list);
router.get('/:id',                 ctrl.getOne);
router.post('/',                   checkAssociateLimit, ctrl.create);
router.put('/:id',                 ctrl.update);
router.delete('/:id',              ctrl.remove);
router.put('/:id/credentials',     ctrl.setCredentials);
router.delete('/:id/credentials',  ctrl.removeCredentials);

module.exports = router;
