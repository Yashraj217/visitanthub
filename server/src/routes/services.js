const router = require('express').Router();
const ctrl = require('../controllers/serviceController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// Associates need hidden-fields to render inline-edit columns in their visit portal
router.get('/hidden-fields', requireRole('company_admin', 'company_user'), ctrl.listHiddenFields);

// Associate: get services assigned to me (by employee_services table, not derived from visits)
router.get('/my-services',   requireRole('company_user'),                  ctrl.listMyServices);

// Super admin can list services for any company (passes ?company_id=X)
router.get('/', requireRole('company_admin', 'super_admin'), ctrl.listServices);

router.use(requireRole('company_admin'));
router.post('/',                             ctrl.createService);
router.put('/:id',                           ctrl.updateService);
router.delete('/:id',                        ctrl.deleteService);
router.get('/:serviceId/fields',             ctrl.listFields);
router.post('/:serviceId/fields',            ctrl.saveFields);

module.exports = router;
