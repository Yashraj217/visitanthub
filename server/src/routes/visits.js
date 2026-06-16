const router = require('express').Router();
const ctrl = require('../controllers/visitController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/',                    ctrl.list);
router.get('/my-charts',           requireRole('company_user'), ctrl.myCharts);
router.get('/employees',           requireRole('company_admin', 'company_user'), ctrl.listEligibleEmployees);
router.get('/:id',                 ctrl.getOne);
router.put('/:id/status',          requireRole('company_admin', 'company_user'), ctrl.updateStatus);
router.put('/:id/employee',        requireRole('company_admin', 'company_user'), ctrl.updateEmployee);
router.put('/:id/field-values',    requireRole('company_user', 'company_admin'), ctrl.updateFieldValues);

module.exports = router;
